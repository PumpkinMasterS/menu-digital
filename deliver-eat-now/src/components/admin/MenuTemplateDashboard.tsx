import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Save, 
  Trash2, 
  Eye, 
  Upload,
  Download,
  Edit3,
  Copy,
  Move,
  Image,
  DollarSign,
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Lock,
  Star,
  Utensils,
  Heart
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

interface MenuTemplate {
  id?: string
  name: string
  description: string
  category: string
  thumbnail_url?: string
  is_public: boolean
  usage_count?: number
  rating?: number
}

interface MenuTemplateItem {
  id?: string
  template_id?: string
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

interface MenuTemplateDashboardProps {
  existingTemplateId?: string
  onTemplateCreated?: (templateId: string) => void
  onTemplateUpdated?: (templateId: string) => void
}

const MenuTemplateDashboard = ({ 
  existingTemplateId,
  onTemplateCreated,
  onTemplateUpdated 
}: MenuTemplateDashboardProps) => {
  const { profile } = useAuth()
  
  const [template, setTemplate] = useState<MenuTemplate>({
    name: '',
    description: '',
    category: 'custom',
    is_public: false
  })
  
  const [items, setItems] = useState<MenuTemplateItem[]>([])
  const [editingItem, setEditingItem] = useState<MenuTemplateItem | null>(null)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const categories = [
    { value: 'portuguese', label: 'Português', icon: Heart },
    { value: 'italian', label: 'Italiano', icon: Utensils },
    { value: 'fast_food', label: 'Fast Food', icon: ChefHat },
    { value: 'vegetarian', label: 'Vegetariano', icon: Heart },
    { value: 'tapas', label: 'Petiscos/Tapas', icon: Utensils },
    { value: 'custom', label: 'Personalizado', icon: Star }
  ]

  const itemCategories = [
    'starters', 'mains', 'desserts', 'drinks', 'snacks', 'sides'
  ]

  const allergensList = [
    'Glúten', 'Crustáceos', 'Ovos', 'Peixe', 'Amendoins', 
    'Soja', 'Leite', 'Frutos secos', 'Aipo', 'Mostarda', 
    'Sementes de sésamo', 'Dióxido de enxofre', 'Tremoços', 'Moluscos'
  ]

  useEffect(() => {
    if (existingTemplateId) {
      loadExistingTemplate(existingTemplateId)
    }
  }, [existingTemplateId])

  const loadExistingTemplate = async (templateId: string) => {
    try {
      setLoading(true)
      
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('menu_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) throw templateError

      setTemplate(templateData)

      // Load template items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true })

      if (itemsError) throw itemsError

      setItems(itemsData || [])
    } catch (error) {
      console.error('Error loading template:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o template",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!template.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do template é obrigatório",
        variant: "destructive"
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao template",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      let templateId = template.id

      if (templateId) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('menu_templates')
          .update({
            name: template.name,
            description: template.description,
            category: template.category,
            is_public: template.is_public,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId)

        if (templateError) throw templateError

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('menu_template_items')
          .delete()
          .eq('template_id', templateId)

        if (deleteError) throw deleteError

      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('menu_templates')
          .insert({
            name: template.name,
            description: template.description,
            category: template.category,
            is_public: template.is_public,
            created_by: profile?.id,
            usage_count: 0,
            rating: 0
          })
          .select()
          .single()

        if (templateError) throw templateError

        templateId = newTemplate.id
        setTemplate(prev => ({ ...prev, id: templateId }))
      }

      // Insert template items
      const itemsToInsert = items.map((item, index) => ({
        template_id: templateId,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image_url: item.image_url,
        is_available: item.is_available,
        allergens: item.allergens,
        nutritional_info: item.nutritional_info,
        preparation_time: item.preparation_time,
        sort_order: index
      }))

      const { error: itemsError } = await supabase
        .from('menu_template_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast({
        title: "✅ Template Salvo",
        description: `Template "${template.name}" salvo com sucesso!`,
        duration: 3000
      })

      if (template.id && onTemplateUpdated) {
        onTemplateUpdated(template.id)
      } else if (onTemplateCreated) {
        onTemplateCreated(templateId!)
      }

    } catch (error: any) {
      console.error('Error saving template:', error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o template",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = () => {
    setEditingItem({
      name: '',
      description: '',
      price: 0,
      category: 'mains',
      is_available: true,
      allergens: [],
      preparation_time: 15,
      sort_order: items.length
    })
    setShowItemDialog(true)
  }

  const handleEditItem = (item: MenuTemplateItem, index: number) => {
    setEditingItem({ ...item, sort_order: index })
    setShowItemDialog(true)
  }

  const handleSaveItem = () => {
    if (!editingItem) return

    if (!editingItem.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do item é obrigatório",
        variant: "destructive"
      })
      return
    }

    if (editingItem.price <= 0) {
      toast({
        title: "Erro",
        description: "Preço deve ser maior que zero",
        variant: "destructive"
      })
      return
    }

    const existingIndex = items.findIndex((item, idx) => 
      item.id === editingItem.id || idx === editingItem.sort_order
    )

    if (existingIndex >= 0) {
      // Update existing item
      const newItems = [...items]
      newItems[existingIndex] = editingItem
      setItems(newItems)
    } else {
      // Add new item
      setItems(prev => [...prev, editingItem])
    }

    setEditingItem(null)
    setShowItemDialog(false)
  }

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items]
    const [removed] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, removed)
    
    // Update sort orders
    newItems.forEach((item, index) => {
      item.sort_order = index
    })
    
    setItems(newItems)
  }

  const handleCloneFromMenu = async () => {
    // TODO: Implement menu selection dialog
    toast({
      title: "Em Desenvolvimento",
      description: "Funcionalidade de clonar menu existente em breve",
    })
  }

  const handleExportTemplate = async () => {
    const exportData = {
      template,
      items,
      exportedAt: new Date().toISOString(),
      exportedBy: profile?.email
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Template Exportado",
      description: "Template exportado como arquivo JSON",
    })
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-emerald-600" />
            {template.id ? 'Editar Template' : 'Criar Template de Menu'}
          </h1>
          <p className="text-gray-600 mt-1">
            {template.id ? 'Modificar template existente' : 'Criar novo template reutilizável'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Editar' : 'Preview'}
          </Button>
          
          {template.id && (
            <Button variant="outline" onClick={handleExportTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          
          <Button 
            onClick={handleSaveTemplate}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Template
              </>
            )}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {categories.find(c => c.value === template.category)?.icon && (
                    <div className="h-6 w-6">
                      {React.createElement(categories.find(c => c.value === template.category)!.icon)}
                    </div>
                  )}
                  {template.name}
                  {template.is_public ? <Globe className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-gray-400" />}
                </CardTitle>
                <CardDescription className="text-lg mt-1">
                  {template.description}
                </CardDescription>
              </div>
              <Badge className={getCategoryColor(template.category)}>
                {categories.find(c => c.value === template.category)?.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-600 mt-1">{item.description}</p>
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
                        <div className="text-xl font-bold text-emerald-600">
                          €{item.price.toFixed(2)}
                        </div>
                        {!item.is_available && (
                          <Badge variant="secondary" className="mt-1">
                            Indisponível
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Edit Mode
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes do Template</TabsTrigger>
            <TabsTrigger value="items">Itens do Menu ({items.length})</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure os detalhes principais do template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nome do Template *</Label>
                    <Input
                      id="template-name"
                      placeholder="Ex: Menu Português Tradicional"
                      value={template.name}
                      onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                      value={template.category} 
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value }))}
                    >
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Descrição</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Descreva o tipo de menu e a ocasião apropriada..."
                    value={template.description}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-public"
                    checked={template.is_public}
                    onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="template-public" className="flex items-center gap-2">
                    {template.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    Template público (visível para todos os usuários)
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>
                  Ferramentas para acelerar a criação do template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleCloneFromMenu}>
                    <Copy className="h-4 w-4 mr-2" />
                    Clonar de Menu Existente
                  </Button>
                  
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Itens do Menu</CardTitle>
                    <CardDescription>
                      Adicione e organize os pratos do template
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum item adicionado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Comece adicionando pratos ao seu template de menu.
                    </p>
                    <Button onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => index > 0 && handleMoveItem(index, index - 1)}
                                    disabled={index === 0}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => index < items.length - 1 && handleMoveItem(index, index + 1)}
                                    disabled={index === items.length - 1}
                                  >
                                    ↓
                                  </Button>
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  {item.description && (
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
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
                                    {!item.is_available && (
                                      <Badge variant="secondary" className="text-xs">
                                        Indisponível
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-lg font-bold text-emerald-600">
                                  €{item.price.toFixed(2)}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditItem(item, index)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteItem(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>
                  Configure opções avançadas do template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="template-public-settings"
                      checked={template.is_public}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, is_public: checked }))}
                    />
                    <Label htmlFor="template-public-settings" className="flex items-center gap-2">
                      {template.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      Template público
                    </Label>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Estatísticas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-bold text-lg">{items.length}</div>
                        <div className="text-gray-600">Itens</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-bold text-lg">
                          €{items.length > 0 ? (items.reduce((sum, item) => sum + item.price, 0) / items.length).toFixed(2) : '0.00'}
                        </div>
                        <div className="text-gray-600">Preço Médio</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-bold text-lg">
                          {items.reduce((sum, item) => sum + (item.preparation_time || 0), 0)}min
                        </div>
                        <div className="text-gray-600">Tempo Total</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-bold text-lg">{template.usage_count || 0}</div>
                        <div className="text-gray-600">Usos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Item' : 'Adicionar Item'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do item do menu
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Nome do Item *</Label>
                  <Input
                    id="item-name"
                    placeholder="Ex: Francesinha"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem(prev => 
                      prev ? { ...prev, name: e.target.value } : null
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-price">Preço (€) *</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="12.50"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem(prev => 
                      prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Descrição</Label>
                <Textarea
                  id="item-description"
                  placeholder="Descreva o prato..."
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={editingItem.category || 'mains'} 
                    onValueChange={(value) => setEditingItem(prev => 
                      prev ? { ...prev, category: value } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {itemCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prep-time">Tempo de Preparação (min)</Label>
                  <Input
                    id="prep-time"
                    type="number"
                    min="0"
                    placeholder="15"
                    value={editingItem.preparation_time || ''}
                    onChange={(e) => setEditingItem(prev => 
                      prev ? { ...prev, preparation_time: parseInt(e.target.value) || 0 } : null
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alérgenos</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {allergensList.map(allergen => (
                    <label key={allergen} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingItem.allergens?.includes(allergen) || false}
                        onChange={(e) => {
                          const allergens = editingItem.allergens || []
                          if (e.target.checked) {
                            setEditingItem(prev => prev ? {
                              ...prev,
                              allergens: [...allergens, allergen]
                            } : null)
                          } else {
                            setEditingItem(prev => prev ? {
                              ...prev,
                              allergens: allergens.filter(a => a !== allergen)
                            } : null)
                          }
                        }}
                      />
                      <span>{allergen}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="item-available"
                  checked={editingItem.is_available}
                  onCheckedChange={(checked) => setEditingItem(prev => 
                    prev ? { ...prev, is_available: checked } : null
                  )}
                />
                <Label htmlFor="item-available">Item disponível</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingItem(null)
                    setShowItemDialog(false)
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveItem} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MenuTemplateDashboard 