
import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  ChefHat, 
  Clock, 
  Star, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Bell,
  BarChart3,
  Eye,
  Settings,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle,
  Utensils,
  Timer,
  Home,
  FileText,
  LogOut,
  ArrowLeft,
  ChevronRight,
  User,
  Store,
  Save,
  ShoppingBag
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import MenuBuilder from '@/components/admin/MenuBuilder'
import { Input } from '@/components/ui/input'

const RestaurantDashboard = () => {
  const { user, profile, loading } = useAuth()
  const params = useParams<{ restaurantId?: string; slug?: string }>()
  const restaurantParam = params.restaurantId || params.slug
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<any[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [ordersToday, setOrdersToday] = useState(0)

  const activeSection = searchParams.get('tab') || 'dashboard'

  // Debug logging
  console.log('RestaurantDashboard - Component loaded with:', {
    restaurantParam,
    activeSection,
    userRole: profile?.role,
    currentURL: window.location.href
  })

  // Sidebar menu items (MVP essentials only)
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
    { id: 'menu', label: 'Menu', icon: Utensils, badge: null },
    { id: 'orders', label: 'Order History', icon: FileText, badge: pendingOrders.length > 0 ? pendingOrders.length : null },
    { id: 'performance', label: 'Performance', icon: BarChart3, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ]

  // Redirect if not authenticated or not allowed role
  useEffect(() => {
    console.log('RestaurantDashboard - Auth check:', {
      loading,
      user: !!user,
      profile,
      restaurantParam,
      allowedRoles: ['restaurant_admin', 'super_admin', 'platform_owner'],
      hasAccess: user && profile && ['restaurant_admin', 'super_admin', 'platform_owner'].includes(profile.role || '')
    })
  }, [loading, user, profile, restaurantParam])

  if (!loading && (!user || !['restaurant_admin', 'super_admin', 'platform_owner'].includes(profile?.role || ''))) {
    console.log('RestaurantDashboard - Redirecting to auth, reason:', {
      user: !!user,
      profile: profile?.role,
      loading
    })
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user) {
      fetchRestaurant()
      fetchOrders()
      fetchPendingOrders()
      fetchAnalytics()
      
      // Set up real-time subscription for new orders
      const subscription = supabase
        .channel('restaurant-orders')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'orders' }, 
          (payload) => {
            console.log('Nova order:', payload)
            fetchPendingOrders()
            toast({
              title: "🔔 Novo Pedido Recebido!",
              description: `Pedido #${payload.new.id.slice(-8)} - €${payload.new.total_amount}`,
            })
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, profile])

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders()
      fetchPendingOrders()
      fetchAnalytics()
    }
  }, [restaurant?.id])

  const fetchRestaurant = async () => {
    let query = supabase.from('restaurants').select('*')
    
    if (restaurantParam) {
      // Check if it's a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantParam)
      
      if (isUUID) {
        query = query.eq('id', restaurantParam)
      } else {
        query = query.eq('slug', restaurantParam)
      }
    } else {
      query = query.eq('owner_id', user?.id)
    }
    
    const { data } = await query.single() as any

    if (data) {
      setRestaurant(data)
      setIsOpen(data.is_active)
    }
  }

  const fetchOrders = async () => {
    if (!restaurant?.id) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      setOrders(data || [])
    } catch (error) {
      console.error('Error in fetchOrders:', error)
    }
  }

  const fetchPendingOrders = async () => {
    if (!restaurant?.id) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['pending', 'accepted', 'preparing'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching pending orders:', error)
        return
      }

      setPendingOrders(data || [])
    } catch (error) {
      console.error('Error in fetchPendingOrders:', error)
    }
  }

  const fetchAnalytics = async () => {
    if (!restaurant?.id) return

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'delivered')

    const revenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
    setTotalRevenue(revenue)

    // Get total orders count
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)

    setTotalOrders(ordersCount || 0)

    // Get today's orders
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', today + 'T00:00:00')

    setOrdersToday(todayCount || 0)

    // Mock average rating
    setAverageRating(restaurant?.rating || 4.5)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus as any })
      .eq('id', orderId)

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido.",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Status Atualizado",
        description: `Pedido #${orderId.slice(-8)} está agora ${getStatusText(newStatus)}`,
      })
      fetchPendingOrders()
      fetchOrders()
    }
  }

  const toggleRestaurantStatus = async () => {
    const newStatus = !isOpen
    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: newStatus })
      .eq('id', restaurant?.id)

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do restaurante.",
        variant: "destructive"
      })
    } else {
      setIsOpen(newStatus)
      toast({
        title: newStatus ? "Restaurante Aberto" : "Restaurante Fechado",
        description: newStatus ? "Agora está a receber pedidos" : "Parou de receber pedidos",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'preparing': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'accepted': return 'Aceite'
      case 'preparing': return 'A Preparar'
      case 'out_for_delivery': return 'Em Entrega'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'preparing': return <ChefHat className="h-4 w-4" />
      case 'out_for_delivery': return <Package className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'accepted'
      case 'accepted': return 'preparing'
      case 'preparing': return 'out_for_delivery'
      default: return currentStatus
    }
  }

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'Aceitar Pedido'
      case 'accepted': return 'Iniciar Preparação'
      case 'preparing': return 'Enviar para Entrega'
      default: return 'Processar'
    }
  }

  const navigateToSection = (sectionId: string) => {
    setSearchParams({ tab: sectionId })
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/auth'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const renderDashboardContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex items-center space-x-2">
                {isOpen ? (
                  <PlayCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <PauseCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isOpen ? 'Aberto' : 'Fechado'}
                </span>
                <Switch
                  checked={isOpen}
                  onCheckedChange={toggleRestaurantStatus}
                />
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Receita Total</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">€{totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-slate-500">
                    Total desde o início
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Pedidos Hoje</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <Utensils className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{ordersToday}</div>
                  <p className="text-xs text-slate-500">
                    {pendingOrders.length} pendentes
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Total Pedidos</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{totalOrders}</div>
                  <p className="text-xs text-slate-500">
                    Desde o início
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Avaliação</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{averageRating.toFixed(1)}</div>
                  <p className="text-xs text-slate-500">
                    ⭐ Muito bom
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Orders Alert */}
            {pendingOrders.length > 0 && (
              <Alert className="border-orange-200/50 bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-xl shadow-lg">
                <Bell className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>{pendingOrders.length} pedidos</strong> aguardam a sua atenção.
                  <Button 
                    variant="link" 
                    className="p-0 ml-2 h-auto text-orange-700 hover:text-orange-900"
                    onClick={() => navigateToSection('orders')}
                  >
                    Ver pedidos →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span>Resumo do Dia</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Pedidos hoje:</span>
                      <span className="font-semibold text-slate-900">{ordersToday}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Pendentes:</span>
                      <Badge variant={pendingOrders.length > 0 ? "destructive" : "default"} className={pendingOrders.length > 0 ? "bg-red-500 text-white" : "bg-emerald-100 text-emerald-800"}>
                        {pendingOrders.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Status:</span>
                      <Badge variant={isOpen ? "default" : "secondary"} className={isOpen ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                        {isOpen ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Menu Management */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <Utensils className="h-5 w-5 text-white" />
                    </div>
                    <span>Gestão de Menu</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Itens no menu:</span>
                      <Badge className="bg-purple-100 text-purple-800">12 itens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Disponíveis:</span>
                      <Badge className="bg-emerald-100 text-emerald-800">10 itens</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Esgotados:</span>
                      <Badge className="bg-red-100 text-red-800">2 itens</Badge>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={() => navigateToSection('menu')}
                    >
                      <Utensils className="h-4 w-4 mr-2" />
                      Gerir Menu
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Order Management */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                      <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <span>Gestão de Pedidos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Pedidos hoje:</span>
                      <Badge className="bg-blue-100 text-blue-800">{ordersToday}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Pendentes:</span>
                      <Badge className={pendingOrders.length > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                        {pendingOrders.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Concluídos:</span>
                      <Badge className="bg-emerald-100 text-emerald-800">{ordersToday - pendingOrders.length}</Badge>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={() => navigateToSection('orders')}
                    >
                      <Timer className="h-4 w-4 mr-2" />
                      Ver Pedidos ({pendingOrders.length} pendentes)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Section */}
            <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-900">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span>Ações Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <Button 
                    className="justify-start bg-white/50 hover:bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300 transition-all duration-200" 
                    variant="outline"
                    onClick={() => navigateToSection('orders')}
                  >
                    <Timer className="h-4 w-4 mr-2" />
                    Ver Pedidos ({pendingOrders.length} pendentes)
                  </Button>
                  <Button 
                    className="justify-start bg-white/50 hover:bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300 transition-all duration-200" 
                    variant="outline"
                    onClick={() => navigateToSection('menu')}
                  >
                    <Utensils className="h-4 w-4 mr-2" />
                    Gerir Menu
                  </Button>
                  <Button 
                    className="justify-start bg-white/50 hover:bg-white/80 text-slate-700 border-slate-200 hover:border-slate-300 transition-all duration-200" 
                    variant="outline"
                    onClick={toggleRestaurantStatus}
                  >
                    {isOpen ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                    {isOpen ? 'Fechar Restaurante' : 'Abrir Restaurante'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'menu':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Menu Digital</h1>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={() => window.open(`/restaurant/${restaurant?.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                  <span>Ver Menu</span>
                </Button>
                <Badge className="bg-emerald-100 text-emerald-800">
                  Sistema Completo
                </Badge>
                <Badge variant="outline">
                  Inspirado no Uber Eats
                </Badge>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">Preview do Menu</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Clique em "Ver Menu" para visualizar como o seu menu aparece aos clientes, com banner, imagens e layout profissional.
                  </p>
                </div>
              </div>
            </div>
            
            {/* MenuBuilder Component */}
            {restaurant?.id && (
              <MenuBuilder restaurantId={restaurant.id} />
            )}
          </div>
        )

      case 'orders':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
              <Badge variant="secondary">
                {pendingOrders.length} pendentes
              </Badge>
            </div>

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-orange-600">Pedidos Pendentes</h3>
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-orange-500 bg-orange-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <span>Pedido #{order.id.slice(-8)}</span>
                              {getStatusIcon(order.status)}
                            </CardTitle>
                            <CardDescription>
                              {order.profiles?.full_name} • {new Date(order.created_at).toLocaleTimeString('pt-PT')}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">€{order.total_amount}</div>
                            <Badge className={getStatusColor(order.status)} variant="outline">
                              {getStatusText(order.status)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Itens:</h4>
                            {order.order_items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                <span className="text-sm">
                                  {item.quantity}x {item.meals?.name}
                                </span>
                                <span className="text-sm font-medium">
                                  €{(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <div className="flex space-x-2">
                            <Button
                              onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                              className="flex-1"
                              disabled={order.status === 'out_for_delivery'}
                            >
                              {getNextStatusText(order.status)}
                            </Button>
                            
                            {order.status === 'pending' && (
                              <Button
                                variant="destructive"
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>

                          {order.customer_profile?.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>📞 {order.customer_profile.phone}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Order History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Histórico de Pedidos</h3>
              
              {orders.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum pedido encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              Pedido #{order.id.slice(-8)}
                            </CardTitle>
                            <CardDescription>
                              {new Date(order.created_at).toLocaleDateString('pt-PT')} às{' '}
                              {new Date(order.created_at).toLocaleTimeString('pt-PT')}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">€{order.total_amount}</div>
                            <Badge className={getStatusColor(order.status)} variant="outline">
                              {getStatusText(order.status)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          {order.order_items?.length} itens • {order.order_items?.map((item: any) => item.meals?.name).join(', ')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'performance':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
              <Badge variant="secondary">Analytics</Badge>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Desempenho Semanal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pedidos esta semana:</span>
                      <span className="font-medium">{Math.floor(totalOrders * 0.3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receita semanal:</span>
                      <span className="font-medium">€{(totalRevenue * 0.3).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ticket médio:</span>
                      <span className="font-medium">€{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Horário mais movimentado:</span>
                      <span className="font-medium">12:00 - 14:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dia mais movimentado:</span>
                      <span className="font-medium">Sábado</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avaliação média:</span>
                      <span className="font-medium">{averageRating.toFixed(1)} ⭐</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            </div>
            
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status do Restaurante</CardTitle>
                  <CardDescription>
                    Controla se o restaurante está a aceitar novos pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-base font-medium">
                        {isOpen ? 'Restaurante Aberto' : 'Restaurante Fechado'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {isOpen ? 'A aceitar pedidos' : 'Não está a aceitar pedidos'}
                      </div>
                    </div>
                    <Switch
                      checked={isOpen}
                      onCheckedChange={toggleRestaurantStatus}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informações do Restaurante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Nome:</label>
                      <div className="text-sm text-gray-600">{restaurant?.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Descrição:</label>
                      <div className="text-sm text-gray-600">{restaurant?.description || 'Sem descrição'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tempo de entrega:</label>
                      <div className="text-sm text-gray-600">
                        {restaurant?.delivery_time_min || 30}-{restaurant?.delivery_time_max || 45} minutos
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Taxa de entrega:</label>
                      <div className="text-sm text-gray-600">€{restaurant?.delivery_fee || '2.50'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours Configuration - Available for restaurant_admin */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Horários de Funcionamento</span>
                  </CardTitle>
                  <CardDescription>
                    Configure quando o restaurante está aberto para receber pedidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RestaurantHoursSettings restaurant={restaurant} onUpdate={setRestaurant} />
                </CardContent>
              </Card>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Página não encontrada</h2>
            <p className="text-gray-500">A secção que procura não existe.</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Modern Header with Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb & Back Button */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="text-slate-600 hover:text-slate-900 border-slate-300 hover:bg-slate-50 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center text-sm text-slate-500">
                <span>Admin Dashboard</span>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-slate-900 font-medium">{restaurant?.name || 'Carregando...'}</span>
              </div>
            </div>

            {/* Restaurant Status & Actions */}
            <div className="flex items-center space-x-4">
              {restaurant && (
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={isOpen ? "default" : "secondary"} 
                    className={isOpen ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}
                  >
                    {isOpen ? "Aberto" : "Fechado"}
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleRestaurantStatus}
                    className={isOpen 
                      ? "text-orange-600 border-orange-300 hover:bg-orange-50 transition-all duration-200" 
                      : "text-emerald-600 border-emerald-300 hover:bg-emerald-50 transition-all duration-200"
                    }
                  >
                    {isOpen ? <PauseCircle className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                    {isOpen ? "Fechar" : "Abrir"}
                  </Button>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>Platform Owner</span>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Modern Sidebar with Gradient */}
        <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
          {/* Restaurant Info Section */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Store className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-lg font-bold mb-1 text-white">Manager Portal</h2>
              <p className="text-slate-300 text-sm">{restaurant?.name || 'Carregando...'}</p>
              {restaurant && (
                <div className="mt-3 flex items-center justify-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></div>
                  <span className="text-xs text-slate-300">
                    {isOpen ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToSection(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:transform hover:scale-105'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="destructive" className="bg-red-500 text-white text-xs animate-pulse">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar with Glassmorphism */}
          <div className="bg-white/70 backdrop-blur-xl shadow-sm border-b border-slate-200/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-slate-900 capitalize">
                  {activeSection === 'dashboard' ? 'Visão Geral' : 
                   activeSection === 'menu' ? 'Menu' :
                   activeSection === 'orders' ? 'Pedidos' :
                   activeSection === 'performance' ? 'Performance' :
                   activeSection === 'settings' ? 'Configurações' :
                   activeSection}
                </h2>
                {pendingOrders.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse bg-red-500 text-white">
                    <Bell className="h-3 w-3 mr-1" />
                    {pendingOrders.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {renderDashboardContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RestaurantDashboard

const RestaurantHoursSettings = ({ restaurant, onUpdate }: { restaurant: any, onUpdate: (restaurant: any) => void }) => {
  const [businessHours, setBusinessHours] = useState(() => {
    const defaultHours = {
      monday: { open: "11:00", close: "23:00", closed: false },
      tuesday: { open: "11:00", close: "23:00", closed: false },
      wednesday: { open: "11:00", close: "23:00", closed: false },
      thursday: { open: "11:00", close: "23:00", closed: false },
      friday: { open: "11:00", close: "23:00", closed: false },
      saturday: { open: "11:00", close: "23:00", closed: false },
      sunday: { open: "11:00", close: "23:00", closed: false }
    }
    
    return restaurant?.business_hours || defaultHours
  })
  
  const [saving, setSaving] = useState(false)

  const handleHoursUpdate = async () => {
    setSaving(true)
    try {
             const { error } = await supabase
         .from('restaurants')
         .update({ business_hours: businessHours } as any)
         .eq('id', restaurant?.id)

      if (error) throw error

      onUpdate({ ...restaurant, business_hours: businessHours })
      toast({
        title: "Sucesso",
        description: "Horários atualizados com sucesso"
      })
    } catch (error) {
      console.error('Error updating hours:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os horários",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDayUpdate = (day: string, field: string, value: string | boolean) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value
      }
    })
  }

  const daysOfWeek = [
    { key: 'monday', label: 'Seg' },
    { key: 'tuesday', label: 'Ter' },
    { key: 'wednesday', label: 'Qua' },
    { key: 'thursday', label: 'Qui' },
    { key: 'friday', label: 'Sex' },
    { key: 'saturday', label: 'Sáb' },
    { key: 'sunday', label: 'Dom' }
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {daysOfWeek.map((day) => (
          <div key={day.key} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 text-sm font-medium">{day.label}</div>
              
                             <Switch
                 checked={!businessHours[day.key]?.closed}
                 onCheckedChange={(checked) => handleDayUpdate(day.key, 'closed', !checked)}
               />
              
              {!businessHours[day.key]?.closed ? (
                <div className="flex items-center space-x-2 flex-1">
                  <Input
                    type="time"
                    value={businessHours[day.key]?.open || '11:00'}
                    onChange={(e) => handleDayUpdate(day.key, 'open', e.target.value)}
                    className="text-xs h-8 w-20"
                  />
                  <span className="text-xs text-gray-500">às</span>
                  <Input
                    type="time"
                    value={businessHours[day.key]?.close || '23:00'}
                    onChange={(e) => handleDayUpdate(day.key, 'close', e.target.value)}
                    className="text-xs h-8 w-20"
                  />
                </div>
              ) : (
                <span className="text-xs text-gray-400 flex-1">Fechado</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleHoursUpdate}
          disabled={saving}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-2" />
              Guardar Horários
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
