
import { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Minus, ShoppingCart, Star, Clock, MapPin, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'

const RestaurantMenu = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { items: cartItems, addItem, removeItem, getTotalItems, getTotalPrice } = useCart()

  useEffect(() => {
    if (id) {
      fetchRestaurant()
      fetchMenuItems()
      fetchCategories()
    }
  }, [id])

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching restaurant:', error)
      toast({
        title: "Erro",
        description: "Restaurante não encontrado",
        variant: "destructive"
      })
      return
    }

    if (!data) {
      toast({
        title: "Erro",
        description: "Restaurante não encontrado",
        variant: "destructive"
      })
      return
    }

    setRestaurant(data)
  }

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name)')
      .eq('restaurant_id', id)
      .eq('is_available', true)
      .order('sort_order')

    setMenuItems(data || [])
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_active', true)
      .order('sort_order')

    setCategories(data || [])
  }

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.base_price.toString()),
      image_url: item.image_url,
      restaurant_id: id!,
      restaurant_name: restaurant?.name
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!restaurant) {
    return <Navigate to="/" replace />
  }

  // Filter items based on selected category and search term
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Get category item counts
  const getCategoryItemCount = (categoryId: string) => {
    return menuItems.filter(item => item.category_id === categoryId).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
            
            {cartItems.length > 0 && (
              <Button className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Carrinho
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {getTotalItems()}
                </Badge>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant Banner & Info */}
      <div className="relative">
        {/* Banner Image */}
        {restaurant.banner_url ? (
          <div className="h-64 md:h-80 relative overflow-hidden">
            <img 
              src={restaurant.banner_url} 
              alt={`Banner ${restaurant.name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          </div>
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-r from-emerald-500 to-emerald-700 relative">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          </div>
        )}

        {/* Restaurant Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end space-x-4 md:space-x-6">
              {/* Restaurant Logo */}
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-lg shadow-lg flex-shrink-0 overflow-hidden border-2 border-white">
                {restaurant.image_url ? (
                  <img 
                    src={restaurant.image_url} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                )}
              </div>
              
              {/* Restaurant Details */}
              <div className="flex-1 text-white">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">
                  {restaurant.display_name || restaurant.name}
                </h1>
                <p className="text-white/90 text-sm md:text-base mb-3 max-w-2xl">
                  {restaurant.marketing_description || restaurant.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{restaurant.rating || "4.5"}</span>
                    <span className="text-white/70">(200+)</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                    <Clock className="h-4 w-4" />
                    <span>{restaurant.delivery_time_min || 25}-{restaurant.delivery_time_max || 35} min</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                    <MapPin className="h-4 w-4" />
                    <span>€{restaurant.delivery_fee || 2.50} entrega</span>
                  </div>
                  {restaurant.minimum_order && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                      <span>Mín. €{restaurant.minimum_order}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Categories */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Procurar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 rounded-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {/* Categories */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Categorias</h3>
                </div>
                <div className="p-2 space-y-1">
                  {/* All Categories Button */}
                  <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    className={`w-full justify-between h-12 rounded-lg transition-all ${
                      selectedCategory === null 
                        ? "bg-emerald-600 text-white shadow-md" 
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                    onClick={() => setSelectedCategory(null)}
                  >
                    <span className="font-medium">Todos os Produtos</span>
                    <Badge variant={selectedCategory === null ? "secondary" : "outline"} 
                           className={selectedCategory === null ? "bg-white/20 text-white border-white/30" : ""}>
                      {menuItems.length}
                    </Badge>
                  </Button>

                  {/* Category Buttons */}
                  {categories.map((category) => {
                    const itemCount = getCategoryItemCount(category.id)
                    const isSelected = selectedCategory === category.id
                    return (
                      <Button
                        key={category.id}
                        variant={isSelected ? "default" : "ghost"}
                        className={`w-full justify-between h-12 rounded-lg transition-all ${
                          isSelected 
                            ? "bg-emerald-600 text-white shadow-md" 
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <span className="font-medium">{category.name}</span>
                        <Badge variant={isSelected ? "secondary" : "outline"}
                               className={isSelected ? "bg-white/20 text-white border-white/30" : ""}>
                          {itemCount}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Restaurant Quick Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
                <h4 className="font-semibold text-emerald-900 mb-2">Informações de Entrega</h4>
                <div className="space-y-2 text-sm text-emerald-700">
                  <div className="flex items-center justify-between">
                    <span>Tempo de entrega:</span>
                    <span className="font-medium">{restaurant.delivery_time_min || 25}-{restaurant.delivery_time_max || 35} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taxa de entrega:</span>
                    <span className="font-medium">€{restaurant.delivery_fee || 2.50}</span>
                  </div>
                  {restaurant.minimum_order && (
                    <div className="flex items-center justify-between">
                      <span>Pedido mínimo:</span>
                      <span className="font-medium">€{restaurant.minimum_order}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Products */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory 
                  ? categories.find(c => c.id === selectedCategory)?.name 
                  : "Todos os Produtos"
                }
              </h2>
              <p className="text-gray-600 mt-1">
                {filteredItems.length} produto{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Products Grid */}
            <div className="grid gap-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-gray-600">
                    Tente alterar os filtros ou procurar por outro termo
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const cartItem = cartItems.find(cartItem => cartItem.id === item.id)
                  const cartQuantity = cartItem ? cartItem.quantity : 0
                  
                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Product Image */}
                          <div className="w-32 h-32 md:w-40 md:h-32 bg-gray-100 flex-shrink-0 relative overflow-hidden">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
                                <ShoppingCart className="h-8 w-8" />
                              </div>
                            )}
                            {item.is_featured && (
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-orange-500 text-white text-xs">
                                  ⭐ Destaque
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                            <div>
                              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                                {item.name}
                              </h3>
                              <p className="text-gray-600 text-sm md:text-base mb-3 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                              
                              {/* Tags & Allergens */}
                              <div className="space-y-2 mb-4">
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.slice(0, 3).map((tag: string, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {item.tags.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{item.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {item.allergens && item.allergens.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.allergens.slice(0, 2).map((allergen: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-200">
                                        ⚠️ {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Price & Add to Cart */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl md:text-2xl font-bold text-emerald-600">
                                  €{item.base_price.toFixed(2)}
                                </span>
                                {item.has_modifiers && (
                                  <p className="text-xs text-gray-500 mt-1">Personalizável</p>
                                )}
                              </div>
                              
                              {cartQuantity > 0 ? (
                                <div className="flex items-center space-x-3 bg-emerald-50 rounded-full p-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 rounded-full hover:bg-emerald-100"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-semibold text-emerald-700">
                                    {cartQuantity}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 rounded-full hover:bg-emerald-100"
                                    onClick={() => handleAddToCart(item)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all"
                                  onClick={() => handleAddToCart(item)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="font-semibold">
                {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
              </div>
              <div className="text-sm text-gray-600">
                Total: €{getTotalPrice().toFixed(2)}
              </div>
            </div>
            <Button 
              size="lg" 
              className="px-8"
              onClick={() => navigate('/checkout')}
            >
              Finalizar Pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantMenu
