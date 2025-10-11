import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ChefHat, Loader2, Plus, Trash2, Edit, Save, X, Euro, Clock, Tag, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface ManageMenuDialogProps {
  restaurant: any
  onMenuUpdated: () => void
}

interface MealOption {
  type: 'extra' | 'drink' | 'side' | 'sauce' | 'size'
  label: string
  price: number
  is_required?: boolean
}

interface Meal {
  name: string
  description: string
  price: number
  image_url?: string
  preparation_time_minutes?: number
  allergens?: string[]
  tags?: string[]
  options?: MealOption[]
}

interface MenuSection {
  name: string
  description?: string
  meals: Meal[]
}

const ManageMenuDialog: React.FC<ManageMenuDialogProps> = ({ restaurant, onMenuUpdated }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentMenu, setCurrentMenu] = useState<MenuSection[]>([])
  
  const [newSection, setNewSection] = useState({ name: '', description: '' })
  const [newMeal, setNewMeal] = useState<Meal>({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    preparation_time_minutes: 15,
    allergens: [],
    tags: [],
    options: []
  })
  const [newOption, setNewOption] = useState<MealOption>({
    type: 'extra',
    label: '',
    price: 0,
    is_required: false
  })

  const [activeSection, setActiveSection] = useState<number | null>(null)
  const [activeMeal, setActiveMeal] = useState<number | null>(null)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editingMeal, setEditingMeal] = useState<{ sectionIndex: number, mealIndex: number } | null>(null)

  const allergenOptions = [
    'Glúten', 'Crustáceos', 'Ovos', 'Peixe', 'Amendoins', 
    'Soja', 'Leite', 'Frutos secos', 'Aipo', 'Mostarda', 
    'Sementes de sésamo', 'Dióxido de enxofre', 'Tremoços', 'Moluscos'
  ]

  const tagOptions = [
    'Vegetariano', 'Vegan', 'Sem glúten', 'Picante', 'Especialidade da casa',
    'Novo', 'Popular', 'Saudável', 'Orgânico', 'Local', 'Tradicional'
  ]

  const optionTypes = [
    { value: 'extra', label: 'Extra (adicional)' },
    { value: 'drink', label: 'Bebida' },
    { value: 'side', label: 'Acompanhamento' },
    { value: 'sauce', label: 'Molho' },
    { value: 'size', label: 'Tamanho' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadCurrentMenu()
    }
  }, [isOpen, restaurant.id])

  const loadCurrentMenu = async () => {
    setIsLoading(true)
    try {
      // Load menu using the restaurant menu view
      const { data: menuData, error } = await supabase
        .from('v_restaurant_menus')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('section_order')
        .order('meal_order')

      if (error) throw error

      // Transform data into the expected structure
      const sections: MenuSection[] = []
      const sectionMap = new Map()

      menuData?.forEach((item) => {
        if (!item.section_id) return

        if (!sectionMap.has(item.section_id)) {
          sectionMap.set(item.section_id, {
            name: item.section_name,
            description: '',
            meals: []
          })
          sections.push(sectionMap.get(item.section_id))
        }

        const section = sectionMap.get(item.section_id)
        
        if (item.meal_id) {
          // Check if meal already exists in section
          const existingMealIndex = section.meals.findIndex((m: any) => m.id === item.meal_id)
          
          if (existingMealIndex === -1) {
            // Add new meal
            const meal: Meal & { id: string } = {
              id: item.meal_id,
              name: item.meal_name,
              description: item.meal_description || '',
              price: parseFloat(item.meal_price),
              image_url: item.meal_image || '',
              preparation_time_minutes: 15,
              allergens: item.meal_allergens || [],
              tags: item.meal_tags || [],
              options: []
            }
            
            // Add options if any
            if (item.option_id) {
              meal.options!.push({
                type: item.option_type,
                label: item.option_label,
                price: parseFloat(item.option_price),
                is_required: item.option_is_required
              })
            }
            
            section.meals.push(meal)
          } else {
            // Add option to existing meal
            if (item.option_id) {
              section.meals[existingMealIndex].options!.push({
                type: item.option_type,
                label: item.option_label,
                price: parseFloat(item.option_price),
                is_required: item.option_is_required
              })
            }
          }
        }
      })

      setCurrentMenu(sections)
    } catch (error: any) {
      console.error('Error loading menu:', error)
      toast({
        title: "Erro ao carregar menu",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addSection = () => {
    if (!newSection.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor insira o nome da seção",
        variant: "destructive"
      })
      return
    }

    setCurrentMenu(prev => [...prev, {
      name: newSection.name,
      description: newSection.description,
      meals: []
    }])

    setNewSection({ name: '', description: '' })
    setActiveSection(currentMenu.length)
  }

  const addMealToSection = (sectionIndex: number) => {
    if (!newMeal.name.trim() || newMeal.price <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Nome e preço são obrigatórios",
        variant: "destructive"
      })
      return
    }

    const updatedMenu = [...currentMenu]
    updatedMenu[sectionIndex].meals.push({ ...newMeal })
    setCurrentMenu(updatedMenu)

    setNewMeal({
      name: '',
      description: '',
      price: 0,
      image_url: '',
      preparation_time_minutes: 15,
      allergens: [],
      tags: [],
      options: []
    })
  }

  const addOptionToMeal = (sectionIndex: number, mealIndex: number) => {
    if (!newOption.label.trim() || newOption.price < 0) {
      toast({
        title: "Dados incompletos",
        description: "Label e preço são obrigatórios",
        variant: "destructive"
      })
      return
    }

    const updatedMenu = [...currentMenu]
    if (!updatedMenu[sectionIndex].meals[mealIndex].options) {
      updatedMenu[sectionIndex].meals[mealIndex].options = []
    }
    updatedMenu[sectionIndex].meals[mealIndex].options!.push({ ...newOption })
    setCurrentMenu(updatedMenu)

    setNewOption({
      type: 'extra',
      label: '',
      price: 0,
      is_required: false
    })
  }

  const removeSection = (sectionIndex: number) => {
    const updatedMenu = currentMenu.filter((_, index) => index !== sectionIndex)
    setCurrentMenu(updatedMenu)
  }

  const removeMeal = (sectionIndex: number, mealIndex: number) => {
    const updatedMenu = [...currentMenu]
    updatedMenu[sectionIndex].meals = updatedMenu[sectionIndex].meals.filter((_, index) => index !== mealIndex)
    setCurrentMenu(updatedMenu)
  }

  const removeOption = (sectionIndex: number, mealIndex: number, optionIndex: number) => {
    const updatedMenu = [...currentMenu]
    updatedMenu[sectionIndex].meals[mealIndex].options = 
      updatedMenu[sectionIndex].meals[mealIndex].options!.filter((_, index) => index !== optionIndex)
    setCurrentMenu(updatedMenu)
  }

  const saveMenu = async () => {
    setIsSaving(true)
    try {
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Não autenticado')
      }

      // Call the admin create menu edge function
      const { data, error } = await supabase.functions.invoke('admin-create-menu', {
        body: {
          restaurant_id: restaurant.id,
          sections: currentMenu,
          replace_existing: true // Replace existing menu
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        throw error
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar menu')
      }

      toast({
        title: "✅ Menu salvo com sucesso!",
        description: `Menu do ${restaurant.name} foi atualizado`,
      })

      setIsOpen(false)
      onMenuUpdated()

    } catch (error: any) {
      console.error('Error saving menu:', error)
      toast({
        title: "Erro ao salvar menu",
        description: error.message || 'Erro interno do servidor',
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const generateSampleMenu = () => {
    const sampleMenu: MenuSection[] = [
      {
        name: "Entradas",
        description: "Para começar a refeição",
        meals: [
          {
            name: "Azeitonas Marinadas",
            description: "Azeitonas verdes e pretas temperadas com ervas",
            price: 4.50,
            tags: ["Vegetariano", "Vegan"],
            options: [
              { type: "extra", label: "Queijo feta", price: 2.00 }
            ]
          },
          {
            name: "Rissóis de Camarão",
            description: "2 unidades de rissóis caseiros",
            price: 6.00,
            allergens: ["Crustáceos", "Glúten"],
            options: [
              { type: "sauce", label: "Maionese", price: 0.50 },
              { type: "sauce", label: "Molho cocktail", price: 0.75 }
            ]
          }
        ]
      },
      {
        name: "Pratos Principais", 
        description: "Especialidades da casa",
        meals: [
          {
            name: "Francesinha",
            description: "Sandes com linguiça, fiambre, salsicha fresca e molho especial",
            price: 12.50,
            allergens: ["Glúten", "Leite"],
            tags: ["Especialidade da casa", "Popular"],
            preparation_time_minutes: 20,
            options: [
              { type: "extra", label: "Ovo", price: 1.50 },
              { type: "extra", label: "Extra queijo", price: 1.00 },
              { type: "drink", label: "Cerveja Super Bock", price: 2.50 },
              { type: "side", label: "Batata frita", price: 3.00 }
            ]
          }
        ]
      }
    ]
    
    setCurrentMenu(sampleMenu)
    toast({
      title: "Menu de exemplo criado",
      description: "Pode editar e personalizar conforme necessário"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ChefHat className="h-4 w-4 mr-2" />
          Gerir Menu
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Gerir Menu - {restaurant.name}
          </DialogTitle>
          <DialogDescription>
            Configure o menu completo com seções, pratos e opções
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando menu...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Quick actions */}
            <div className="flex gap-2">
              <Button onClick={generateSampleMenu} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Menu de Exemplo
              </Button>
              <Button onClick={() => setCurrentMenu([])} variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>

            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sections">Gerir Seções</TabsTrigger>
                <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
              </TabsList>

              <TabsContent value="sections" className="space-y-4">
                {/* Add new section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Adicionar Nova Seção</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="section_name">Nome da Seção</Label>
                        <Input
                          id="section_name"
                          value={newSection.name}
                          onChange={(e) => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="ex: Pratos Principais"
                        />
                      </div>
                      <div>
                        <Label htmlFor="section_desc">Descrição (opcional)</Label>
                        <Input
                          id="section_desc"
                          value={newSection.description}
                          onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="ex: Especialidades da casa"
                        />
                      </div>
                    </div>
                    <Button onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Seção
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing sections */}
                <Accordion type="single" collapsible className="w-full">
                  {currentMenu.map((section, sectionIndex) => (
                    <AccordionItem key={sectionIndex} value={`section-${sectionIndex}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex justify-between items-center w-full pr-4">
                          <div>
                            <h3 className="font-medium">{section.name}</h3>
                            <p className="text-sm text-gray-500">{section.meals.length} pratos</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSection(sectionIndex)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="space-y-4">
                        {/* Add meal to this section */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-md">Adicionar Prato</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Nome do Prato</Label>
                                <Input
                                  value={newMeal.name}
                                  onChange={(e) => setNewMeal(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="ex: Francesinha"
                                />
                              </div>
                              <div>
                                <Label>Preço (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newMeal.price}
                                  onChange={(e) => setNewMeal(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Descrição</Label>
                              <Textarea
                                value={newMeal.description}
                                onChange={(e) => setNewMeal(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descreva o prato..."
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>URL da Imagem</Label>
                                <Input
                                  value={newMeal.image_url}
                                  onChange={(e) => setNewMeal(prev => ({ ...prev, image_url: e.target.value }))}
                                  placeholder="https://..."
                                />
                              </div>
                              <div>
                                <Label>Tempo Preparação (min)</Label>
                                <Input
                                  type="number"
                                  min="5"
                                  max="120"
                                  value={newMeal.preparation_time_minutes}
                                  onChange={(e) => setNewMeal(prev => ({ ...prev, preparation_time_minutes: parseInt(e.target.value) || 15 }))}
                                />
                              </div>
                            </div>

                            <Button onClick={() => addMealToSection(sectionIndex)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Prato
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Existing meals */}
                        {section.meals.map((meal, mealIndex) => (
                          <Card key={mealIndex} className="border-l-4 border-l-emerald-500">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-md">{meal.name}</CardTitle>
                                  <CardDescription>{meal.description}</CardDescription>
                                  <div className="flex items-center gap-4 mt-2">
                                    <Badge variant="secondary">
                                      <Euro className="h-3 w-3 mr-1" />
                                      {meal.price.toFixed(2)}
                                    </Badge>
                                    {meal.preparation_time_minutes && (
                                      <Badge variant="outline">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {meal.preparation_time_minutes}min
                                      </Badge>
                                    )}
                                    {meal.tags?.map((tag, i) => (
                                      <Badge key={i} variant="outline">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeMeal(sectionIndex, mealIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            
                            <CardContent>
                              {/* Add option to meal */}
                              <div className="space-y-4">
                                <h4 className="font-medium">Opções do Prato</h4>
                                
                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <Label>Tipo</Label>
                                    <Select
                                      value={newOption.type}
                                      onValueChange={(value: any) => setNewOption(prev => ({ ...prev, type: value }))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {optionTypes.map((type) => (
                                          <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label>Nome</Label>
                                    <Input
                                      value={newOption.label}
                                      onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                                      placeholder="ex: Extra queijo"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label>Preço (€)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newOption.price}
                                      onChange={(e) => setNewOption(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                    />
                                  </div>
                                  
                                  <div className="flex items-end">
                                    <Button 
                                      onClick={() => addOptionToMeal(sectionIndex, mealIndex)}
                                      size="sm"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Adicionar
                                    </Button>
                                  </div>
                                </div>

                                {/* Existing options */}
                                {meal.options && meal.options.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-sm font-medium">Opções Existentes:</h5>
                                    {meal.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">{option.type}</Badge>
                                          <span>{option.label}</span>
                                          <span className="text-sm text-gray-500">€{option.price.toFixed(2)}</span>
                                          {option.is_required && (
                                            <Badge variant="secondary">
                                              <AlertTriangle className="h-3 w-3 mr-1" />
                                              Obrigatório
                                            </Badge>
                                          )}
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeOption(sectionIndex, mealIndex, optionIndex)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pré-visualização do Menu</CardTitle>
                    <CardDescription>Como o menu aparecerá para os clientes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentMenu.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma seção criada ainda</p>
                        <p className="text-sm">Adicione seções e pratos na aba "Gerir Seções"</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentMenu.map((section, sectionIndex) => (
                          <div key={sectionIndex}>
                            <h2 className="text-xl font-bold mb-2">{section.name}</h2>
                            {section.description && (
                              <p className="text-gray-600 mb-4">{section.description}</p>
                            )}
                            
                            <div className="space-y-4">
                              {section.meals.map((meal, mealIndex) => (
                                <div key={mealIndex} className="border rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-semibold">{meal.name}</h3>
                                      <p className="text-gray-600 text-sm">{meal.description}</p>
                                    </div>
                                    <span className="font-bold text-emerald-600">€{meal.price.toFixed(2)}</span>
                                  </div>
                                  
                                  {meal.tags && meal.tags.length > 0 && (
                                    <div className="flex gap-1 mb-2">
                                      {meal.tags.map((tag, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {meal.options && meal.options.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-sm font-medium mb-2">Opções disponíveis:</p>
                                      {meal.options.map((option, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                          <span>• {option.label}</span>
                                          <span>+€{option.price.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save button */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              
              <Button
                onClick={saveMenu}
                disabled={isSaving || currentMenu.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Menu
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ManageMenuDialog 