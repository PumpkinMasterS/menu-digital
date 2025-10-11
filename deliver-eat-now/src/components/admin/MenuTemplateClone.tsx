import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Copy, 
  Check, 
  X, 
  ChefHat,
  Store,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Settings,
  Filter,
  Search,
  Utensils,
  Globe,
  Building
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useViewScope } from '@/hooks/useViewScope'
import { useScoping } from '@/hooks/useScoping'
import { toast } from '@/hooks/use-toast'

interface Restaurant {
  id: string
  name: string
  address?: string
  organization_id?: string
  organization_name?: string
  menu_count?: number
  last_activity?: string
}

interface MenuTemplate {
  id: string
  name: string
  description: string
  category: string
  is_public: boolean
  usage_count: number
  rating: number
  items_count?: number
  avg_price?: number
  creator_name?: string
}

interface CloneOperation {
  restaurantId: string
  restaurantName: string
  templateId: string
  templateName: string
  customMenuName?: string
  priceMultiplier: number
  includedItems: string[]
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  message?: string
}

interface MenuTemplateCloneProps {
  selectedTemplate?: MenuTemplate
  onCloneCompleted?: (operations: CloneOperation[]) => void
}

const MenuTemplateClone = ({ 
  selectedTemplate,
  onCloneCompleted 
}: MenuTemplateCloneProps) => {
  const { profile } = useAuth()
  const { activeViewScope } = useViewScope()
  const { getEffectiveScope } = useScoping()
  
  const [template, setTemplate] = useState<MenuTemplate | null>(selectedTemplate || null)
  const [templateItems, setTemplateItems] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([])
  const [cloneOperations, setCloneOperations] = useState<CloneOperation[]>([])
  
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState<string>('all')
  
  // Clone configuration
  const [customMenuName, setCustomMenuName] = useState('')
  const [priceMultiplier, setPriceMultiplier] = useState(1.0)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [applyToAll, setApplyToAll] = useState(true)

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateItems(selectedTemplate.id)
    }
    loadRestaurants()
  }, [selectedTemplate])

  useEffect(() => {
    filterRestaurants()
  }, [restaurants, searchTerm, organizationFilter])

  useEffect(() => {
    if (template && templateItems.length > 0) {
      setSelectedItems(templateItems.map(item => item.id))
      setCustomMenuName(`${template.name} (Clonado)`)
    }
  }, [template, templateItems])

  const loadTemplateItems = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('menu_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTemplateItems(data || [])
    } catch (error) {
      console.error('Error loading template items:', error)
    }
  }

  const loadRestaurants = async () => {
    try {
      setLoading(true)
      
      const scope = getEffectiveScope()
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          organizations (
            name,
            id
          )
        `)

      // Apply scoping based on user role and view context
      if (scope.organizationId) {
        query = query.eq('organization_id', scope.organizationId)
      } else if (profile?.role === 'super_admin' && !activeViewScope?.organizationId) {
        // Super admin can see all restaurants in their organization
        query = query.eq('organization_id', profile.organization_id)
      }

      const { data, error } = await query
        .order('name', { ascending: true })

      if (error) throw error

      // Get menu counts for each restaurant
      const restaurantsWithStats = await Promise.all(
        (data || []).map(async (restaurant) => {
          const { data: menus, error: menuError } = await supabase
            .from('menus')
            .select('id, updated_at')
            .eq('restaurant_id', restaurant.id)

          if (menuError) {
            console.error('Error fetching menu count:', menuError)
            return {
              ...restaurant,
              organization_name: restaurant.organizations?.name,
              menu_count: 0,
              last_activity: null
            }
          }

          const lastActivity = menus.length > 0 
            ? menus.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at
            : null

          return {
            ...restaurant,
            organization_name: restaurant.organizations?.name,
            menu_count: menus.length,
            last_activity: lastActivity
          }
        })
      )

      setRestaurants(restaurantsWithStats)
    } catch (error) {
      console.error('Error loading restaurants:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de restaurantes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterRestaurants = () => {
    let filtered = restaurants

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (restaurant.address && restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (restaurant.organization_name && restaurant.organization_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by organization
    if (organizationFilter !== 'all') {
      filtered = filtered.filter(restaurant => restaurant.organization_id === organizationFilter)
    }

    setFilteredRestaurants(filtered)
  }

  const handleRestaurantSelection = (restaurantId: string, selected: boolean) => {
    if (selected) {
      setSelectedRestaurants(prev => [...prev, restaurantId])
    } else {
      setSelectedRestaurants(prev => prev.filter(id => id !== restaurantId))
    }
  }

  const handleSelectAllRestaurants = (selected: boolean) => {
    if (selected) {
      setSelectedRestaurants(filteredRestaurants.map(r => r.id))
    } else {
      setSelectedRestaurants([])
    }
  }

  const handleItemSelection = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, itemId])
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId))
    }
  }

  const handleSelectAllItems = (selected: boolean) => {
    if (selected) {
      setSelectedItems(templateItems.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleStartClone = async () => {
    if (!template) {
      toast({
        title: "Erro",
        description: "Nenhum template selecionado",
        variant: "destructive"
      })
      return
    }

    if (selectedRestaurants.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um restaurante",
        variant: "destructive"
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um item para clonar",
        variant: "destructive"
      })
      return
    }

    // Initialize clone operations
    const operations: CloneOperation[] = selectedRestaurants.map(restaurantId => {
      const restaurant = restaurants.find(r => r.id === restaurantId)!
      return {
        restaurantId,
        restaurantName: restaurant.name,
        templateId: template.id,
        templateName: template.name,
        customMenuName: applyToAll ? customMenuName : `${template.name} - ${restaurant.name}`,
        priceMultiplier,
        includedItems: selectedItems,
        status: 'pending',
        progress: 0
      }
    })

    setCloneOperations(operations)
    setProcessing(true)

    // Process clones sequentially to avoid overwhelming the database
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      
      setCloneOperations(prev => prev.map((op, idx) => 
        idx === i ? { ...op, status: 'processing', progress: 10 } : op
      ))

      try {
        // Call the database function to clone the template
        const { data, error } = await supabase.rpc('clone_menu_template_advanced', {
          template_id: operation.templateId,
          target_restaurant_id: operation.restaurantId,
          menu_name: operation.customMenuName,
          price_multiplier: operation.priceMultiplier,
          included_items: operation.includedItems
        })

        if (error) throw error

        // Update progress
        setCloneOperations(prev => prev.map((op, idx) => 
          idx === i ? { 
            ...op, 
            status: 'completed', 
            progress: 100, 
            message: 'Template clonado com sucesso' 
          } : op
        ))

      } catch (error: any) {
        console.error('Error cloning template:', error)
        
        setCloneOperations(prev => prev.map((op, idx) => 
          idx === i ? { 
            ...op, 
            status: 'error', 
            progress: 0, 
            message: error.message || 'Erro na clonagem' 
          } : op
        ))
      }

      // Small delay between operations
      if (i < operations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setProcessing(false)

    // Update template usage count
    if (template) {
      const successCount = operations.filter(op => 
        cloneOperations.find(co => co.restaurantId === op.restaurantId)?.status === 'completed'
      ).length

      await supabase
        .from('menu_templates')
        .update({ usage_count: (template.usage_count || 0) + successCount })
        .eq('id', template.id)
    }

    const completedOperations = cloneOperations.filter(op => op.status === 'completed')
    
    toast({
      title: "Clonagem Concluída",
      description: `${completedOperations.length} de ${operations.length} restaurantes processados com sucesso`,
      duration: 5000
    })

    if (onCloneCompleted) {
      onCloneCompleted(cloneOperations)
    }
  }

  const getStatusIcon = (status: CloneOperation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const organizations = Array.from(new Set(restaurants.map(r => r.organization_id)))
    .filter(Boolean)
    .map(orgId => {
      const restaurant = restaurants.find(r => r.organization_id === orgId)
      return {
        id: orgId,
        name: restaurant?.organization_name || 'Organização'
      }
    })

  if (!template) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum template selecionado
          </h3>
          <p className="text-gray-600">
            Selecione um template na galeria para começar a clonagem.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Copy className="h-8 w-8 text-emerald-600" />
            Clonar Template de Menu
          </h1>
          <p className="text-gray-600 mt-1">
            Clone o template "{template.name}" para múltiplos restaurantes
          </p>
        </div>

        <Button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          variant="outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          {showAdvancedOptions ? 'Opções Simples' : 'Opções Avançadas'}
        </Button>
      </div>

      {/* Template Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Template: {template.name}
          </CardTitle>
          <CardDescription>
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-lg">{template.items_count || 0}</div>
              <div className="text-gray-600">Itens</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-lg">€{template.avg_price?.toFixed(2) || '0.00'}</div>
              <div className="text-gray-600">Preço Médio</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-lg">{template.usage_count}</div>
              <div className="text-gray-600">Usos</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-lg">{template.rating.toFixed(1)}</div>
              <div className="text-gray-600">Avaliação</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Selecionar Restaurantes ({selectedRestaurants.length})
                </CardTitle>
                <CardDescription>
                  Escolha os restaurantes que receberão o template
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllRestaurants(true)}
                >
                  Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllRestaurants(false)}
                >
                  Nenhum
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar restaurantes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {organizations.length > 1 && (
                <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por organização" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as organizações</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Restaurant List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  </div>
                ) : filteredRestaurants.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    Nenhum restaurante encontrado
                  </div>
                ) : (
                  filteredRestaurants.map(restaurant => (
                    <div
                      key={restaurant.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedRestaurants.includes(restaurant.id)}
                        onCheckedChange={(checked) => 
                          handleRestaurantSelection(restaurant.id, checked as boolean)
                        }
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{restaurant.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {restaurant.organization_name}
                          </Badge>
                        </div>
                        
                        {restaurant.address && (
                          <p className="text-sm text-gray-600 truncate">{restaurant.address}</p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{restaurant.menu_count} menus</span>
                          {restaurant.last_activity && (
                            <span>
                              Ativo: {new Date(restaurant.last_activity).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Clonagem
            </CardTitle>
            <CardDescription>
              Configure como o template será aplicado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Options */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="menu-name">Nome do Menu</Label>
                <Input
                  id="menu-name"
                  value={customMenuName}
                  onChange={(e) => setCustomMenuName(e.target.value)}
                  placeholder="Nome do menu criado"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={applyToAll}
                    onCheckedChange={setApplyToAll}
                  />
                  <Label className="text-sm">
                    Usar o mesmo nome para todos os restaurantes
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-multiplier">Multiplicador de Preços</Label>
                <Input
                  id="price-multiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value) || 1.0)}
                />
                <p className="text-xs text-gray-600">
                  1.0 = preços originais, 1.2 = +20%, 0.8 = -20%
                </p>
              </div>
            </div>

            {/* Advanced Options */}
            {showAdvancedOptions && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Itens a Incluir ({selectedItems.length} de {templateItems.length})</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllItems(true)}
                      >
                        Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllItems(false)}
                      >
                        Nenhum
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-48 border rounded-lg p-3">
                    <div className="space-y-2">
                      {templateItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => 
                              handleItemSelection(item.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-emerald-600 font-bold">
                                €{(item.price * priceMultiplier).toFixed(2)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            <Separator />

            {/* Action Button */}
            <Button
              onClick={handleStartClone}
              disabled={processing || selectedRestaurants.length === 0 || selectedItems.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Clonar para {selectedRestaurants.length} Restaurante(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Clone Progress */}
      {cloneOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Progresso da Clonagem
            </CardTitle>
            <CardDescription>
              Acompanhe o status da clonagem para cada restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cloneOperations.map((operation, index) => (
                <div key={operation.restaurantId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(operation.status)}
                      <div>
                        <h4 className="font-medium">{operation.restaurantName}</h4>
                        <p className="text-sm text-gray-600">{operation.customMenuName}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {operation.status === 'completed' && '✅ Concluído'}
                        {operation.status === 'error' && '❌ Erro'}
                        {operation.status === 'processing' && '🔄 Processando'}
                        {operation.status === 'pending' && '⏳ Aguardando'}
                      </div>
                    </div>
                  </div>

                  {operation.status === 'processing' && (
                    <Progress value={operation.progress} className="mb-2" />
                  )}

                  {operation.message && (
                    <p className={`text-sm ${
                      operation.status === 'error' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {operation.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MenuTemplateClone 