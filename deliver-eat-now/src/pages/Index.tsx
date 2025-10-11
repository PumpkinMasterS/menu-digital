import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Star, Clock, MapPin, Tag, Search, Filter, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/layout/Header'
import Hero from '@/components/home/Hero'
import Categories from '@/components/home/Categories'
import PopularRestaurants from '@/components/home/PopularRestaurants'
import DetoxPlans from '@/components/home/DetoxPlans'
import Footer from '@/components/home/Footer'

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '🍽️' },
  { id: 'tradicional', name: 'Tradicional', icon: '🇵🇹' },
  { id: 'peixe', name: 'Peixe & Mariscos', icon: '🐟' },
  { id: 'carne', name: 'Carnes', icon: '🥩' },
  { id: 'vegetariano', name: 'Vegetariano', icon: '🥗' },
  { id: 'doces', name: 'Doces', icon: '🍰' }
]

const FILTERS = {
  DELIVERY_TIME: [
    { value: 'all', label: 'Qualquer tempo' },
    { value: '30', label: 'Até 30 min' },
    { value: '45', label: 'Até 45 min' },
    { value: '60', label: 'Até 60 min' }
  ],
  PRICE_RANGE: [
    { value: 'all', label: 'Qualquer preço' },
    { value: 'low', label: '€ - Económico' },
    { value: 'medium', label: '€€ - Médio' },
    { value: 'high', label: '€€€ - Premium' }
  ],
  RATING: [
    { value: 'all', label: 'Qualquer rating' },
    { value: '4.5', label: '4.5+ estrelas' },
    { value: '4.0', label: '4.0+ estrelas' },
    { value: '3.5', label: '3.5+ estrelas' }
  ]
}

const Index = () => {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState('all')
  const [priceRangeFilter, setPriceRangeFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')

  // Utility functions
  const getCuisineType = (name: string) => {
    if (name.includes('Tradicional') || name.includes('Quinta')) return 'tradicional'
    if (name.includes('Mariscos') || name.includes('Peixe')) return 'peixe'
    if (name.includes('Grill') || name.includes('Carne')) return 'carne'
    return 'tradicional'
  }

  const getPriceRange = (avgPrice: number) => {
    if (avgPrice <= 15) return 'low'
    if (avgPrice <= 25) return 'medium'
    return 'high'
  }

  const formatDeliveryTime = (minutes: number) => {
    return `${minutes}-${minutes + 10} min`
  }

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`
  }

  // Function to check if restaurant is currently open
  const isRestaurantOpen = (businessHours: any) => {
    if (!businessHours || Object.keys(businessHours).length === 0) {
      return { isOpen: true, status: 'Horário não definido' }
    }

    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = dayNames[now.getDay()]
    const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes

    const todayHours = businessHours[currentDay]
    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, status: 'Fechado hoje' }
    }

    const openTime = todayHours.open ? parseInt(todayHours.open.replace(':', '')) : 0
    const closeTime = todayHours.close ? parseInt(todayHours.close.replace(':', '')) : 2359

    const openTimeMinutes = Math.floor(openTime / 100) * 60 + (openTime % 100)
    const closeTimeMinutes = Math.floor(closeTime / 100) * 60 + (closeTime % 100)

    if (currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes) {
      const minutesToClose = closeTimeMinutes - currentTime
      if (minutesToClose <= 30) {
        return { isOpen: true, status: 'Fecha em breve' }
      }
      return { isOpen: true, status: 'Aberto' }
    }

    return { isOpen: false, status: `Abre às ${todayHours.open || '09:00'}` }
  }

  // Function to navigate to restaurant menu
  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurant/${restaurantId}`)
  }

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching restaurants:', error)
    }

    if (data) {
      setRestaurants(data)
    }
    setLoading(false)
  }

  // Memoized enhanced restaurants data to avoid recalculation on every render
  const enhancedRestaurants = useMemo(() => {
    return restaurants.map((restaurant, index) => ({
      ...restaurant,
      is_promoted: index < 2,
      is_new: index === 1 || index === 3,
      is_popular: restaurant.rating > 4.3,
      cuisine_type: getCuisineType(restaurant.name)
    }))
  }, [restaurants])

  // Memoized filtered restaurants to avoid filtering on every render
  const filteredRestaurants = useMemo(() => {
    let filtered = enhancedRestaurants

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(restaurant =>
        restaurant.cuisine_type === selectedCategory
      )
    }

    // Delivery time filter
    if (deliveryTimeFilter !== 'all') {
      filtered = filtered.filter(restaurant =>
        restaurant.delivery_time <= parseInt(deliveryTimeFilter)
      )
    }

    // Price range filter
    if (priceRangeFilter !== 'all') {
      filtered = filtered.filter(restaurant =>
        getPriceRange(restaurant.average_price) === priceRangeFilter
      )
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(restaurant =>
        restaurant.rating >= parseFloat(ratingFilter)
      )
    }

    return filtered
  }, [enhancedRestaurants, searchTerm, selectedCategory, deliveryTimeFilter, priceRangeFilter, ratingFilter])

  // Memoized restaurant badges to avoid recalculation
  const getRestaurantBadges = useMemo(() => {
    return (restaurant: any) => {
      const badges = []
      if (restaurant.is_promoted) badges.push({ text: 'Promovido', variant: 'default' as const, icon: '⭐' })
      if (restaurant.is_new) badges.push({ text: 'Novo', variant: 'secondary' as const, icon: '🆕' })
      if (restaurant.is_popular) badges.push({ text: 'Popular', variant: 'destructive' as const, icon: '🔥' })
      return badges
    }
  }, [])

  // Early return for loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Hero />
      
      {/* Search and Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar restaurantes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={deliveryTimeFilter} onValueChange={setDeliveryTimeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.DELIVERY_TIME.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.PRICE_RANGE.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.RATING.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center space-x-2"
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredRestaurants.length === 0 
              ? 'Nenhum restaurante encontrado' 
              : `${filteredRestaurants.length} restaurante${filteredRestaurants.length > 1 ? 's' : ''} encontrado${filteredRestaurants.length > 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRestaurants.map((restaurant) => {
            const operatingStatus = isRestaurantOpen(restaurant.business_hours || restaurant.opening_hours)
            
            return (
              <Card 
                key={restaurant.id} 
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer bg-white border-0 shadow-sm hover:shadow-2xl hover:-translate-y-1"
                onClick={() => handleRestaurantClick(restaurant.id)}
              >
                {/* Hero Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={restaurant.banner_url || restaurant.image_url || '/placeholder.svg'} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {getRestaurantBadges(restaurant).map((badge, index) => (
                      <Badge key={index} variant={badge.variant} className="text-xs font-medium shadow-lg">
                        {badge.icon} {badge.text}
                      </Badge>
                    ))}
                  </div>

                  {/* Operating status badge */}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={operatingStatus.isOpen ? "default" : "secondary"}
                      className={`text-xs font-medium shadow-lg ${
                        operatingStatus.isOpen 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-500 text-white'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        operatingStatus.isOpen ? 'bg-green-300' : 'bg-gray-300'
                      }`} />
                      {operatingStatus.status}
                    </Badge>
                  </div>

                  {/* Delivery time overlay */}
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-900">
                        {formatDeliveryTime(restaurant.delivery_time_min || 25)}
                      </span>
                    </div>
                  </div>

                  {/* Rating overlay */}
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-gray-900">
                        {restaurant.rating?.toFixed(1) || '4.5'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <CardContent className="p-4">
                  {/* Restaurant name */}
                  <div className="mb-2">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-600 transition-colors duration-200 line-clamp-1">
                      {restaurant.display_name || restaurant.name}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                    {restaurant.marketing_description || restaurant.description || 'Deliciosa comida portuguesa tradicional'}
                  </p>
                  
                  {/* Info row */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>€{restaurant.delivery_fee?.toFixed(2) || '2.50'}</span>
                    </div>
                    <div className="text-gray-900 font-medium">
                      Mín. €{restaurant.minimum_order || 12}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDeliveryTime(restaurant.delivery_time_min || 25)}</span>
                      </div>
                      <span>•</span>
                      <span>{operatingStatus.status}</span>
                    </div>
                    
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </CardContent>

                {/* Hover overlay for interactivity */}
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum restaurante encontrado</h3>
            <p className="text-gray-600 mb-4">Tente ajustar os filtros ou termo de pesquisa</p>
            <Button 
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setDeliveryTimeFilter('all')
                setPriceRangeFilter('all')
                setRatingFilter('all')
              }}
              variant="outline"
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <Categories />
      <PopularRestaurants />
      <DetoxPlans />
      <Footer />
    </div>
  )
}

export default Index
