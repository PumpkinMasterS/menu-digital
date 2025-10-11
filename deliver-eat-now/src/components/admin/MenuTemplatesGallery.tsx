import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChefHat, 
  Copy, 
  Eye, 
  Star, 
  Users, 
  Clock, 
  DollarSign,
  Search,
  Filter,
  TrendingUp,
  Globe,
  Lock,
  Plus,
  Utensils,
  Heart
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useViewScope } from '@/hooks/useViewScope'
import { useScoping } from '@/hooks/useScoping'
import { toast } from '@/hooks/use-toast'

interface MenuTemplate {
  id: string
  name: string
  description: string
  category: string
  thumbnail_url?: string
  created_by?: string
  is_public: boolean
  usage_count: number
  rating: number
  created_at: string
  updated_at: string
  items_count?: number
  avg_price?: number
  creator_name?: string
}

interface MenuTemplateItem {
  id: string
  template_id: string
  name: string
  description?: string
  price: number
  category?: string
  image_url?: string
  is_available: boolean
  allergens?: string[]
  nutritional_info?: any
  preparation_time?: number
  sort_order: number
}

interface MenuTemplatesGalleryProps {
  onTemplateClone?: (templateId: string, templateName: string) => void
  showCloneButtons?: boolean
  targetRestaurantId?: string
}

const MenuTemplatesGallery = ({ 
  onTemplateClone, 
  showCloneButtons = true,
  targetRestaurantId 
}: MenuTemplatesGalleryProps) => {
  const { profile } = useAuth()
  const { activeViewScope } = useViewScope()
  const { getEffectiveScope } = useScoping()
  
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<MenuTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MenuTemplate | null>(null)
  const [templateItems, setTemplateItems] = useState<MenuTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('popular')
  
  const categories = [
    { value: 'all', label: 'Todas as Categorias', icon: Globe },
    { value: 'portuguese', label: 'Português', icon: Heart },
    { value: 'italian', label: 'Italiano', icon: Utensils },
    { value: 'fast_food', label: 'Fast Food', icon: ChefHat },
    { value: 'vegetarian', label: 'Vegetariano', icon: Heart },
    { value: 'tapas', label: 'Petiscos/Tapas', icon: Utensils },
    { value: 'custom', label: 'Personalizados', icon: Star }
  ]

  const sortOptions = [
    { value: 'popular', label: 'Mais Populares' },
    { value: 'rating', label: 'Melhor Avaliados' },
    { value: 'recent', label: 'Mais Recentes' },
    { value: 'alphabetical', label: 'Alfabética' }
  ]

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterAndSortTemplates()
  }, [templates, searchTerm, selectedCategory, sortBy])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      
      // Base query for templates with item counts and creator info
      let query = supabase
        .from('menu_templates')
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)

      // Apply visibility filters based on user role
      if (profile?.role !== 'platform_owner') {
        query = query.eq('is_public', true)
      }

      const { data: templatesData, error } = await query
        .order('usage_count', { ascending: false })

      if (error) throw error

      // Get item counts and average prices for each template
      const templatesWithStats = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: items, error: itemsError } = await supabase
            .from('menu_template_items')
            .select('price')
            .eq('template_id', template.id)

          if (itemsError) {
            console.error('Error fetching template items:', itemsError)
            return {
              ...template,
              items_count: 0,
              avg_price: 0,
              creator_name: template.profiles?.full_name || 'Sistema'
            }
          }

          const prices = items.map(item => parseFloat(item.price.toString()))
          const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

          return {
            ...template,
            items_count: items.length,
            avg_price: avgPrice,
            creator_name: template.profiles?.full_name || 'Sistema'
          }
        })
      )

      setTemplates(templatesWithStats)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates de menu",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTemplates = () => {
    let filtered = templates

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered = filtered.sort((a, b) => b.usage_count - a.usage_count)
        break
      case 'rating':
        filtered = filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'recent':
        filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'alphabetical':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    setFilteredTemplates(filtered)
  }

  const fetchTemplateItems = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('menu_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTemplateItems(data || [])
    } catch (error) {
      console.error('Error fetching template items:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens do template",
        variant: "destructive"
      })
    }
  }

  const handleTemplatePreview = async (template: MenuTemplate) => {
    setSelectedTemplate(template)
    await fetchTemplateItems(template.id)
  }

  const handleCloneTemplate = async (template: MenuTemplate) => {
    if (!targetRestaurantId && !activeViewScope?.restaurantId) {
      toast({
        title: "Erro",
        description: "Nenhum restaurante selecionado para clonar o template",
        variant: "destructive"
      })
      return
    }

    const restaurantId = targetRestaurantId || activeViewScope?.restaurantId
    
    try {
      // Call the database function to clone the template
      const { data, error } = await supabase.rpc('clone_menu_template', {
        template_id: template.id,
        target_restaurant_id: restaurantId,
        menu_name: `${template.name} (Clonado)`
      })

      if (error) throw error

      toast({
        title: "✅ Template Clonado",
        description: `O template "${template.name}" foi clonado com sucesso!`,
        duration: 5000
      })

      // Update usage count locally
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, usage_count: t.usage_count + 1 }
          : t
      ))

      if (onTemplateClone) {
        onTemplateClone(template.id, template.name)
      }
    } catch (error: any) {
      console.error('Error cloning template:', error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível clonar o template",
        variant: "destructive"
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category)
    return categoryData?.icon || Globe
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      portuguese: 'bg-red-100 text-red-800',
      italian: 'bg-green-100 text-green-800',
      fast_food: 'bg-yellow-100 text-yellow-800',
      vegetarian: 'bg-green-100 text-green-800',
      tapas: 'bg-orange-100 text-orange-800',
      custom: 'bg-purple-100 text-purple-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-emerald-600" />
            Galeria de Templates de Menu
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredTemplates.length} templates disponíveis
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Pesquisar Templates</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4" />
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category)
          
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5" />
                      {template.name}
                      {!template.is_public && (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getCategoryColor(template.category)}>
                    {categories.find(c => c.value === template.category)?.label}
                  </Badge>
                  
                  {template.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-gray-500" />
                    <span>{template.items_count || 0} pratos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span>€{template.avg_price?.toFixed(2) || '0.00'} médio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{template.usage_count} usos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-xs">{template.creator_name}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleTemplatePreview(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <CategoryIcon className="h-5 w-5" />
                          {selectedTemplate?.name}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedTemplate?.description}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4">
                          {templateItems.map((item, index) => (
                            <Card key={item.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    {item.description && (
                                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    )}
                                    
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                      {item.category && (
                                        <Badge variant="outline" className="text-xs">
                                          {item.category}
                                        </Badge>
                                      )}
                                      {item.preparation_time && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {item.preparation_time}min
                                        </div>
                                      )}
                                      {item.allergens && item.allergens.length > 0 && (
                                        <div className="text-orange-600 text-xs">
                                          Alérgenos: {item.allergens.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-600">
                                      €{parseFloat(item.price.toString()).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  {showCloneButtons && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleCloneTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Clonar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-gray-600">
              Tente alterar os filtros ou pesquisar por outros termos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MenuTemplatesGallery 