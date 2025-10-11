import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet,
  Download,
  Share2,
  Copy,
  Star,
  Clock,
  DollarSign,
  ChefHat,
  Utensils,
  Heart,
  Globe,
  Palette,
  Layout,
  Grid,
  List,
  Image,
  Settings,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Filter,
  SortAsc,
  SortDesc,
  X
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface MenuTemplate {
  id: string
  name: string
  description: string
  category: string
  is_public: boolean
  usage_count: number
  rating: number
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

interface MenuTemplatePreviewProps {
  template: MenuTemplate
  onClose?: () => void
  onClone?: (templateId: string) => void
}

type ViewMode = 'desktop' | 'tablet' | 'mobile'
type DisplayStyle = 'grid' | 'list' | 'card' | 'menu'
type SortOption = 'order' | 'name' | 'price-asc' | 'price-desc' | 'category'

const MenuTemplatePreview = ({ 
  template, 
  onClose,
  onClone 
}: MenuTemplatePreviewProps) => {
  const [items, setItems] = useState<MenuTemplateItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Preview options
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>('card')
  const [sortBy, setSortBy] = useState<SortOption>('order')
  const [showPrices, setShowPrices] = useState(true)
  const [showDescriptions, setShowDescriptions] = useState(true)
  const [showImages, setShowImages] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [priceMultiplier, setPriceMultiplier] = useState(1.0)
  const [theme, setTheme] = useState('default')

  const themes = {
    default: {
      name: 'Padrão',
      primaryColor: 'emerald',
      bgColor: 'white',
      textColor: 'gray-900',
      accentColor: 'emerald-600'
    },
    elegant: {
      name: 'Elegante',
      primaryColor: 'slate',
      bgColor: 'slate-50',
      textColor: 'slate-900',
      accentColor: 'slate-600'
    },
    warm: {
      name: 'Caloroso',
      primaryColor: 'orange',
      bgColor: 'orange-50',
      textColor: 'orange-900',
      accentColor: 'orange-600'
    },
    modern: {
      name: 'Moderno',
      primaryColor: 'blue',
      bgColor: 'blue-50',
      textColor: 'blue-900',
      accentColor: 'blue-600'
    }
  }

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'starters', label: 'Entradas' },
    { value: 'mains', label: 'Pratos Principais' },
    { value: 'desserts', label: 'Sobremesas' },
    { value: 'drinks', label: 'Bebidas' },
    { value: 'snacks', label: 'Petiscos' },
    { value: 'sides', label: 'Acompanhamentos' }
  ]

  useEffect(() => {
    loadTemplateItems()
  }, [template.id])

  useEffect(() => {
    filterAndSortItems()
  }, [items, sortBy, filterCategory])

  const loadTemplateItems = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('menu_template_items')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading template items:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens do template",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortItems = () => {
    let filtered = items

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    // Sort items
    switch (sortBy) {
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price-asc':
        filtered = filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        filtered = filtered.sort((a, b) => b.price - a.price)
        break
      case 'category':
        filtered = filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
        break
      default: // 'order'
        filtered = filtered.sort((a, b) => a.sort_order - b.sort_order)
    }

    setFilteredItems(filtered)
  }

  const handleExportPreview = () => {
    // Create a simplified version for export
    const exportData = {
      template: {
        name: template.name,
        description: template.description,
        category: template.category
      },
      items: filteredItems.map(item => ({
        name: item.name,
        description: item.description,
        price: (item.price * priceMultiplier).toFixed(2),
        category: item.category,
        allergens: item.allergens,
        preparation_time: item.preparation_time
      })),
      previewSettings: {
        viewMode,
        displayStyle,
        theme,
        showPrices,
        showDescriptions,
        priceMultiplier
      },
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `preview-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Preview Exportado",
      description: "Preview salvo como arquivo JSON",
    })
  }

  const getViewModeClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm mx-auto'
      case 'tablet':
        return 'max-w-2xl mx-auto'
      default:
        return 'max-w-6xl mx-auto'
    }
  }

  const getGridClass = () => {
    if (displayStyle === 'list') {
      return 'space-y-4'
    }
    
    switch (viewMode) {
      case 'mobile':
        return 'grid grid-cols-1 gap-4'
      case 'tablet':
        return 'grid grid-cols-2 gap-4'
      default:
        return displayStyle === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'grid grid-cols-1 md:grid-cols-2 gap-6'
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      starters: '🥗',
      mains: '🍽️',
      desserts: '🍰',
      drinks: '🥤',
      snacks: '🍿',
      sides: '🥖'
    }
    return icons[category as keyof typeof icons] || '🍽️'
  }

  const currentTheme = themes[theme as keyof typeof themes] || themes.default

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-8 w-8 text-emerald-600" />
            Preview: {template.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Visualize como o template aparecerá para os clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPreview}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Partilhar
          </Button>
          
          {onClone && (
            <Button 
              onClick={() => onClone(template.id)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Clonar Template
            </Button>
          )}
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Controles de Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* View Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dispositivo</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('desktop')}
                  className="flex-1"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('tablet')}
                  className="flex-1"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  className="flex-1"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Display Style */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Estilo de Exibição</Label>
              <Select value={displayStyle} onValueChange={(value: DisplayStyle) => setDisplayStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Cartões</SelectItem>
                  <SelectItem value="grid">Grelha</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="menu">Menu Clássico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tema</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(themes).map(([key, themeData]) => (
                    <SelectItem key={key} value={key}>
                      {themeData.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ordenação</Label>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Ordem Original</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="price-asc">Preço Crescente</SelectItem>
                  <SelectItem value="price-desc">Preço Decrescente</SelectItem>
                  <SelectItem value="category">Categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Category */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filtrar Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Multiplier */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Multiplicador de Preços</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={priceMultiplier}
                onChange={(e) => setPriceMultiplier(parseFloat(e.target.value) || 1.0)}
              />
              <p className="text-xs text-gray-600">
                {priceMultiplier === 1.0 ? 'Preços originais' : 
                 priceMultiplier > 1.0 ? `+${((priceMultiplier - 1) * 100).toFixed(0)}%` :
                 `-${((1 - priceMultiplier) * 100).toFixed(0)}%`}
              </p>
            </div>

            <Separator />

            {/* Display Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Opções de Exibição</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch checked={showPrices} onCheckedChange={setShowPrices} />
                  <Label className="text-sm">Mostrar preços</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch checked={showDescriptions} onCheckedChange={setShowDescriptions} />
                  <Label className="text-sm">Mostrar descrições</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch checked={showImages} onCheckedChange={setShowImages} />
                  <Label className="text-sm">Mostrar imagens</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch checked={showAllergens} onCheckedChange={setShowAllergens} />
                  <Label className="text-sm">Mostrar alergénios</Label>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <Button 
              variant="outline" 
              onClick={() => {
                setViewMode('desktop')
                setDisplayStyle('card')
                setTheme('default')
                setSortBy('order')
                setFilterCategory('all')
                setPriceMultiplier(1.0)
                setShowPrices(true)
                setShowDescriptions(true)
                setShowImages(true)
                setShowAllergens(true)
              }}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrões
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="lg:col-span-3">
          <Card className={`${getViewModeClass()} transition-all duration-300`}>
            <CardHeader className={`bg-${currentTheme.bgColor} border-b`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-${currentTheme.textColor} text-2xl flex items-center gap-2`}>
                    <ChefHat className={`h-6 w-6 text-${currentTheme.accentColor}`} />
                    {template.name}
                  </CardTitle>
                  {showDescriptions && template.description && (
                    <CardDescription className={`text-${currentTheme.textColor} opacity-70 mt-1`}>
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`bg-${currentTheme.primaryColor}-100 text-${currentTheme.primaryColor}-800`}>
                    {filteredItems.length} itens
                  </Badge>
                  {template.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className={`p-6 bg-${currentTheme.bgColor}`}>
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum item encontrado
                  </h3>
                  <p className="text-gray-600">
                    Altere os filtros para ver mais itens.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[70vh]">
                  <div className={getGridClass()}>
                    {filteredItems.map((item, index) => (
                      <Card 
                        key={item.id} 
                        className={`${displayStyle === 'list' ? 'flex items-center' : ''} 
                                   hover:shadow-lg transition-shadow border-${currentTheme.primaryColor}-200`}
                      >
                        {displayStyle === 'menu' ? (
                          // Menu Style (like traditional restaurant menu)
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {item.category && (
                                    <span className="text-lg">{getCategoryIcon(item.category)}</span>
                                  )}
                                  <h4 className={`font-semibold text-${currentTheme.textColor}`}>
                                    {item.name}
                                  </h4>
                                </div>
                                
                                {showDescriptions && item.description && (
                                  <p className={`text-sm text-${currentTheme.textColor} opacity-70 mt-1 italic`}>
                                    {item.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  {item.preparation_time && (
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <Clock className="h-3 w-3" />
                                      {item.preparation_time}min
                                    </div>
                                  )}
                                  
                                  {showAllergens && item.allergens && item.allergens.length > 0 && (
                                    <div className="text-orange-600 text-xs">
                                      Alérgenos: {item.allergens.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {showPrices && (
                                <div className={`text-lg font-bold text-${currentTheme.accentColor} ml-4`}>
                                  €{(item.price * priceMultiplier).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        ) : displayStyle === 'list' ? (
                          // List Style
                          <CardContent className="p-4 flex items-center w-full">
                            {showImages && item.image_url && (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4 flex items-center justify-center">
                                <Utensils className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className={`font-medium text-${currentTheme.textColor} truncate`}>
                                    {item.name}
                                  </h4>
                                  
                                  {showDescriptions && item.description && (
                                    <p className={`text-sm text-${currentTheme.textColor} opacity-70 truncate`}>
                                      {item.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 mt-1">
                                    {item.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.category}
                                      </Badge>
                                    )}
                                    
                                    {item.preparation_time && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="h-3 w-3" />
                                        {item.preparation_time}min
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {showPrices && (
                                  <div className={`text-lg font-bold text-${currentTheme.accentColor} ml-4`}>
                                    €{(item.price * priceMultiplier).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        ) : (
                          // Card/Grid Style
                          <>
                            {showImages && (
                              <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="w-full h-full object-cover rounded-t-lg"
                                  />
                                ) : (
                                  <div className="text-center">
                                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                    <span className="text-gray-500 text-sm">{item.name}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className={`font-semibold text-${currentTheme.textColor}`}>
                                    {item.name}
                                  </h4>
                                  
                                  {item.category && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {getCategoryIcon(item.category)} {item.category}
                                    </Badge>
                                  )}
                                </div>
                                
                                {showPrices && (
                                  <div className={`text-xl font-bold text-${currentTheme.accentColor}`}>
                                    €{(item.price * priceMultiplier).toFixed(2)}
                                  </div>
                                )}
                              </div>
                              
                              {showDescriptions && item.description && (
                                <p className={`text-sm text-${currentTheme.textColor} opacity-70 mb-3`}>
                                  {item.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  {item.preparation_time && (
                                    <div className="flex items-center gap-1 text-gray-500">
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
                              
                              {showAllergens && item.allergens && item.allergens.length > 0 && (
                                <div className="text-orange-600 text-xs mt-2 p-2 bg-orange-50 rounded">
                                  <strong>Alérgenos:</strong> {item.allergens.join(', ')}
                                </div>
                              )}
                            </CardContent>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MenuTemplatePreview 