import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Eye, EyeOff, Settings, Tag, Package, Utensils, GripVertical } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import ImageUpload from '@/components/upload/ImageUpload'

// Interfaces
interface MenuCategory {
  id: string
  name: string
  description?: string
  parent_id?: string
  sort_order: number
  image_url?: string
  is_active: boolean
  created_at: string
}

interface MenuItem {
  id: string
  category_id?: string
  name: string
  description?: string
  base_price: number
  image_url?: string
  sort_order: number
  is_available: boolean
  is_featured: boolean
  has_modifiers: boolean
  is_combo: boolean
  tags?: string[]
  allergens?: string[]
}

interface MenuModifier {
  id: string
  name: string
  description?: string
  is_required: boolean
  min_select: number
  max_select: number
  display_type: string
  sort_order: number
  is_active: boolean
}

interface MenuBuilderProps {
  restaurantId: string
}

const MenuBuilder: React.FC<MenuBuilderProps> = ({ restaurantId }) => {
  // Estados
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [modifiers, setModifiers] = useState<MenuModifier[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'sidebar' | 'tabs'>('sidebar')
  const [activeTab, setActiveTab] = useState('categories')
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showModifierDialog, setShowModifierDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  // Forms
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  })

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    base_price: 0,
    category_id: '',
    image_url: '',
    is_available: true,
    is_featured: false,
    has_modifiers: false,
    is_combo: false,
    tags: '',
    allergens: ''
  })
  
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])

  const [modifierForm, setModifierForm] = useState({
    name: '',
    description: '',
    is_required: false,
    min_select: 0,
    max_select: 1,
    display_type: 'radio',
    is_active: true
  })

  // Helper function for file upload
  const uploadItemImage = async (file: File) => {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${file.name.split('.').pop()}`;
      const filePath = `${restaurantId}/menu-items/${fileName}`;

      const { data, error } = await supabase.storage
        .from('restaurants')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('restaurants')
        .getPublicUrl(data.path);

      setItemForm(prev => ({ ...prev, image_url: publicUrl.publicUrl }));
      
      toast.success('Imagem carregada com sucesso!');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro no upload');
    }
  }

  // Fetch data
  const fetchMenuData = async () => {
    try {
      const [categoriesResponse, itemsResponse, modifiersResponse] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('menu_modifiers')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true })
      ])

      if (categoriesResponse.error) throw categoriesResponse.error
      if (itemsResponse.error) throw itemsResponse.error
      if (modifiersResponse.error) throw modifiersResponse.error

      setCategories(categoriesResponse.data || [])
      setItems(itemsResponse.data || [])
      setModifiers(modifiersResponse.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados do menu:', error)
      toast.error('Erro ao carregar dados do menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMenuData()
  }, [restaurantId])

  // Handlers
  const handleCreateCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert([{
          ...categoryForm,
          restaurant_id: restaurantId,
          sort_order: categories.length + 1
        }])
        .select()
        .single()

      if (error) throw error

      setCategories(prev => [...prev, data])
      setCategoryForm({ name: '', description: '', parent_id: '', is_active: true })
      setShowCategoryDialog(false)
      toast.success('Categoria criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      toast.error('Erro ao criar categoria')
    }
  }

  const handleCreateItem = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          name: itemForm.name,
          description: itemForm.description,
          base_price: itemForm.base_price,
          category_id: itemForm.category_id,
          image_url: itemForm.image_url,
          is_available: itemForm.is_available,
          is_featured: itemForm.is_featured,
          has_modifiers: selectedModifiers.length > 0,
          is_combo: itemForm.is_combo,
          tags: itemForm.tags ? itemForm.tags.split(',').map(t => t.trim()) : [],
          allergens: itemForm.allergens ? itemForm.allergens.split(',').map(a => a.trim()) : [],
          sort_order: items.length + 1
        })
        .select()
        .single()

      if (error) throw error

      // Associate modifiers if any selected
      if (selectedModifiers.length > 0 && data) {
        const modifierAssociations = selectedModifiers.map(modifierId => ({
          item_id: data.id,
          modifier_id: modifierId,
          is_required: false, // You can make this configurable
          sort_order: 1
        }))

        await supabase
          .from('menu_item_modifiers')
          .insert(modifierAssociations)
      }

      toast.success('Produto criado com sucesso!')

      setShowItemDialog(false)
      setItemForm({
        name: '',
        description: '',
        base_price: 0,
        category_id: '',
        image_url: '',
        is_available: true,
        is_featured: false,
        has_modifiers: false,
        is_combo: false,
        tags: '',
        allergens: ''
      })
      setSelectedModifiers([])
      
      fetchMenuData()
    } catch (error) {
      console.error('Error creating item:', error)
      toast.error('Não foi possível criar o produto')
    }
  }

  const handleCreateModifier = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_modifiers')
        .insert([{
          ...modifierForm,
          restaurant_id: restaurantId,
          sort_order: modifiers.length + 1
        }])
        .select()
        .single()

      if (error) throw error

      setModifiers(prev => [...prev, data])
      setModifierForm({
        name: '',
        description: '',
        is_required: false,
        min_select: 0,
        max_select: 1,
        display_type: 'radio',
        is_active: true
      })
      setShowModifierDialog(false)
      toast.success('Modificador criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar modificador:', error)
      toast.error('Erro ao criar modificador')
    }
  }

  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_categories')
        .update({ is_active: !currentStatus })
        .eq('id', categoryId)

      if (error) throw error

      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, is_active: !currentStatus } 
            : cat
        )
      )
      toast.success(`Categoria ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`)
    } catch (error) {
      console.error('Erro ao alterar status da categoria:', error)
      toast.error('Erro ao alterar status da categoria')
    }
  }

  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, is_available: !currentStatus } 
            : item
        )
      )
      toast.success(`Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
    } catch (error) {
      console.error('Erro ao alterar status do produto:', error)
      toast.error('Erro ao alterar status do produto')
    }
  }

  const toggleModifierStatus = async (modifierId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_modifiers')
        .update({ is_active: !currentStatus })
        .eq('id', modifierId)

      if (error) throw error

      setModifiers(prev => 
        prev.map(mod => 
          mod.id === modifierId 
            ? { ...mod, is_active: !currentStatus } 
            : mod
        )
      )
      toast.success(`Modificador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
    } catch (error) {
      console.error('Erro ao alterar status do modificador:', error)
      toast.error('Erro ao alterar status do modificador')
    }
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      description: item.description || '',
      base_price: item.base_price,
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_featured: item.is_featured,
      has_modifiers: item.has_modifiers,
      is_combo: item.is_combo,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      allergens: Array.isArray(item.allergens) ? item.allergens.join(', ') : ''
    })
    // TODO: Load associated modifiers
    setShowItemDialog(true)
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: itemForm.name,
          description: itemForm.description,
          base_price: itemForm.base_price,
          category_id: itemForm.category_id,
          image_url: itemForm.image_url,
          is_available: itemForm.is_available,
          is_featured: itemForm.is_featured,
          has_modifiers: selectedModifiers.length > 0,
          is_combo: itemForm.is_combo,
          tags: itemForm.tags ? itemForm.tags.split(',').map(t => t.trim()) : [],
          allergens: itemForm.allergens ? itemForm.allergens.split(',').map(a => a.trim()) : []
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Update modifier associations
      // First, remove existing associations
      await supabase
        .from('menu_item_modifiers')
        .delete()
        .eq('item_id', editingItem.id)

      // Then add new ones
      if (selectedModifiers.length > 0) {
        const modifierAssociations = selectedModifiers.map(modifierId => ({
          item_id: editingItem.id,
          modifier_id: modifierId,
          is_required: false,
          sort_order: 1
        }))

        await supabase
          .from('menu_item_modifiers')
          .insert(modifierAssociations)
      }

              toast.success('Produto atualizado com sucesso!')

      setShowItemDialog(false)
      setEditingItem(null)
      setItemForm({
        name: '',
        description: '',
        base_price: 0,
        category_id: '',
        image_url: '',
        is_available: true,
        is_featured: false,
        has_modifiers: false,
        is_combo: false,
        tags: '',
        allergens: ''
      })
      setSelectedModifiers([])
      
      fetchMenuData()
    } catch (error) {
      console.error('Error updating item:', error)
              toast.error('Não foi possível atualizar o produto')
    }
  }

  // Utilities
  const getCategoryItems = (categoryId: string) => {
    return items.filter(item => item.category_id === categoryId)
  }

  const getParentCategories = () => {
    return categories.filter(cat => !cat.parent_id)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>
  }

  return (
    <div className="h-full">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Gestão de Menu</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'sidebar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('sidebar')}
            >
              Layout Glovo
            </Button>
            <Button
              variant={viewMode === 'tabs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tabs')}
            >
              Layout Tabs
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'sidebar' ? (
        /* Sidebar Layout (Glovo Style) */
        <div className="flex gap-6 h-full">
          {/* Left Sidebar - Categories */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border rounded-lg p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Categorias</h3>
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Nova
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Categoria</DialogTitle>
                      <DialogDescription>Adicione uma nova categoria ao seu menu.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category-name">Nome da Categoria</Label>
                        <Input
                          id="category-name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Burgers, Bebidas, Sobremesas"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category-description">Descrição (opcional)</Label>
                        <Textarea
                          id="category-description"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição da categoria..."
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="category-active"
                          checked={categoryForm.is_active}
                          onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label htmlFor="category-active">Categoria ativa</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateCategory} className="bg-emerald-600 hover:bg-emerald-700">
                          Criar Categoria
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                {/* All Categories Button */}
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="w-full justify-between text-left"
                  onClick={() => setSelectedCategory(null)}
                >
                  <span>📋 Todas as Categorias</span>
                  <Badge variant="outline">{categories.length}</Badge>
                </Button>

                {/* Category Buttons */}
                {getParentCategories().map((category) => {
                  const itemCount = getCategoryItems(category.id).length
                  return (
                    <div key={category.id} className="relative">
                      <Button
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        className="w-full justify-between text-left"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <span className="flex items-center space-x-2">
                          <Tag className="h-4 w-4" />
                          <span>{category.name}</span>
                        </span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline">{itemCount}</Badge>
                          {!category.is_active && (
                            <Badge variant="secondary" className="text-xs">Inativa</Badge>
                          )}
                        </div>
                      </Button>
                      
                      {/* Quick Actions */}
                      {selectedCategory === category.id && (
                        <div className="absolute right-2 top-2 flex space-x-1 z-10">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryStatus(category.id, category.is_active)
                            }}
                          >
                            {category.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Content - Items */}
          <div className="flex-1">
            <div className="bg-white border rounded-lg p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCategory 
                      ? categories.find(c => c.id === selectedCategory)?.name 
                      : "Todos os Produtos"
                    }
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedCategory 
                      ? getCategoryItems(selectedCategory).length 
                      : items.length
                    } produto{(selectedCategory ? getCategoryItems(selectedCategory).length : items.length) !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Add Item Button */}
                  <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Produto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Criar Novo Produto</DialogTitle>
                        <DialogDescription>Crie um novo produto para seu menu com preço e opções.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="item-name">Nome do Produto</Label>
                            <Input
                              id="item-name"
                              value={itemForm.name}
                              onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Big Mac Menu"
                            />
                          </div>
                          <div>
                            <Label htmlFor="item-price">Preço Base (€)</Label>
                            <Input
                              id="item-price"
                              type="number"
                              step="0.01"
                              value={itemForm.base_price}
                              onChange={(e) => setItemForm(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="item-description">Descrição</Label>
                          <Textarea
                            id="item-description"
                            value={itemForm.description}
                            onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descrição detalhada do produto..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="item-category">Categoria</Label>
                          <Select 
                            value={itemForm.category_id} 
                            onValueChange={(value) => setItemForm(prev => ({ ...prev, category_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Product Image Upload - Uber Eats/Glovo Standard */}
                        <div className="space-y-3">
                          <Label>Imagem do Produto</Label>
                          {itemForm.image_url ? (
                            /* Imagem já existe - mostrar imagem e botão para alterar */
                            <div className="bg-gray-50 p-4 rounded-lg border">
                              <div className="text-center space-y-3">
                                <div className="text-sm text-gray-600">
                                  <strong>Padrão Uber Eats/Glovo:</strong> 1920x1080px | JPG/PNG | Máx. 3MB
                                </div>
                                <img 
                                  src={itemForm.image_url} 
                                  alt="Preview do produto" 
                                  className="w-40 h-28 object-cover rounded-lg mx-auto border shadow-md"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">✓ Imagem Carregada</p>
                                  <p className="text-xs text-green-600">Pronta para usar</p>
                                </div>
                                <div className="flex gap-2 justify-center">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setItemForm(prev => ({ ...prev, image_url: '' }))}
                                  >
                                    Remover
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => document.getElementById('item-image-upload')?.click()}
                                  >
                                    Alterar Imagem
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Hidden file input for change */}
                              <input
                                id="item-image-upload"
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadItemImage(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </div>
                          ) : (
                            /* Não existe imagem - mostrar interface de upload */
                            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200">
                              <div className="text-center space-y-2 mb-3">
                                <div className="text-sm text-gray-600">
                                  <strong>Padrão Uber Eats/Glovo:</strong> 1920x1080px | JPG/PNG | Máx. 3MB
                                </div>
                              </div>
                              <ImageUpload
                                bucket="restaurants"
                                path={`${restaurantId}/menu-items`}
                                onUploadComplete={(url) => setItemForm(prev => ({ ...prev, image_url: url }))}
                                maxSize={3}
                                acceptedTypes={['image/jpeg', 'image/png']}
                                className="w-full"
                              />
                              <div className="text-xs text-gray-500 space-y-1 mt-2">
                                <p>• Mostre apenas o produto, sem pessoas ou mãos</p>
                                <p>• O produto deve ocupar 3/4 da imagem</p>
                                <p>• Evite texto sobreposto na imagem</p>
                                <p>• Boa iluminação e qualidade profissional</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Modifiers Management */}
                        <div className="space-y-3">
                          <Label>Modificadores (Extras)</Label>
                          <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                Selecione modificadores disponíveis (ex: tamanhos, extras, opções)
                              </p>
                              {modifiers.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-500">Nenhum modificador criado</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowModifierDialog(true)}
                                    className="mt-2"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Criar Primeiro Modificador
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {modifiers.map(modifier => (
                                    <div key={modifier.id} className="flex items-center space-x-2">
                                      <Switch
                                        checked={selectedModifiers.includes(modifier.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedModifiers(prev => [...prev, modifier.id])
                                          } else {
                                            setSelectedModifiers(prev => prev.filter(id => id !== modifier.id))
                                          }
                                        }}
                                      />
                                      <span className="text-sm">{modifier.name}</span>
                                      {modifier.is_required && (
                                        <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tags and Allergens - Glovo Standard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="item-tags">Tags</Label>
                            <Input
                              id="item-tags"
                              value={itemForm.tags}
                              onChange={(e) => setItemForm(prev => ({ ...prev, tags: e.target.value }))}
                              placeholder="vegetariano, picante, sem glúten"
                            />
                            <p className="text-xs text-gray-500 mt-1">Separadas por vírgula</p>
                          </div>
                          <div>
                            <Label htmlFor="item-allergens">Alergénios</Label>
                            <Input
                              id="item-allergens"
                              value={itemForm.allergens}
                              onChange={(e) => setItemForm(prev => ({ ...prev, allergens: e.target.value }))}
                              placeholder="leite, ovos, glúten"
                            />
                            <p className="text-xs text-gray-500 mt-1">Separados por vírgula</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="item-available"
                              checked={itemForm.is_available}
                              onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, is_available: checked }))}
                            />
                            <Label htmlFor="item-available">Disponível</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="item-featured"
                              checked={itemForm.is_featured}
                              onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, is_featured: checked }))}
                            />
                            <Label htmlFor="item-featured">Produto em destaque</Label>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => {
                            setShowItemDialog(false)
                            setEditingItem(null)
                            setItemForm({
                              name: '',
                              description: '',
                              base_price: 0,
                              category_id: '',
                              image_url: '',
                              is_available: true,
                              is_featured: false,
                              has_modifiers: false,
                              is_combo: false,
                              tags: '',
                              allergens: ''
                            })
                            setSelectedModifiers([])
                          }}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={editingItem ? handleUpdateItem : handleCreateItem} 
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {editingItem ? 'Atualizar Produto' : 'Criar Produto'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Add Modifier Button */}
                  <Dialog open={showModifierDialog} onOpenChange={setShowModifierDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Modificadores
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Criar Novo Modificador</DialogTitle>
                        <DialogDescription>Crie modificadores para personalizar produtos.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="modifier-name">Nome do Modificador</Label>
                          <Input
                            id="modifier-name"
                            value={modifierForm.name}
                            onChange={(e) => setModifierForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Escolha a bebida, Extras"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="modifier-required"
                            checked={modifierForm.is_required}
                            onCheckedChange={(checked) => setModifierForm(prev => ({ ...prev, is_required: checked }))}
                          />
                          <Label htmlFor="modifier-required">Obrigatório</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowModifierDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateModifier} className="bg-emerald-600 hover:bg-emerald-700">
                            Criar Modificador
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Items Grid */}
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {(selectedCategory ? getCategoryItems(selectedCategory) : items).length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedCategory ? "Nenhum produto nesta categoria" : "Nenhum produto"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {selectedCategory 
                        ? "Adicione produtos a esta categoria para começar" 
                        : "Crie categorias e adicione produtos ao seu menu"
                      }
                    </p>
                    <Button onClick={() => setShowItemDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Produto
                    </Button>
                  </div>
                ) : (
                  (selectedCategory ? getCategoryItems(selectedCategory) : items).map(item => (
                    <Card key={item.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="font-medium text-emerald-600">€{item.base_price.toFixed(2)}</span>
                                {item.is_featured && <Badge className="bg-yellow-100 text-yellow-800">Destaque</Badge>}
                                {item.has_modifiers && <Badge className="bg-purple-100 text-purple-800">Modificadores</Badge>}
                                <Badge variant={item.is_available ? "default" : "secondary"}>
                                  {item.is_available ? "Disponível" : "Indisponível"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleItemStatus(item.id, item.is_available)}
                            >
                              {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Original Tabs Layout */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="items">Produtos</TabsTrigger>
              <TabsTrigger value="modifiers">Modificadores</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="categories" className="space-y-4">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Layout de Tabs</h3>
              <p className="text-gray-600">Use o "Layout Glovo" para a melhor experiência</p>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Layout de Tabs</h3>
              <p className="text-gray-600">Use o "Layout Glovo" para a melhor experiência</p>
            </div>
          </TabsContent>

          <TabsContent value="modifiers" className="space-y-4">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Layout de Tabs</h3>
              <p className="text-gray-600">Use o "Layout Glovo" para a melhor experiência</p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default MenuBuilder 