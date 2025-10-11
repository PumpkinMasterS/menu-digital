import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShoppingBag, Clock, MapPin, Star, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import LayoutWithBreadcrumb from '@/components/layout/LayoutWithBreadcrumb'

const CustomerDashboard = () => {
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<any[]>([])

  // Debug logs
  console.log('🔍 CustomerDashboard Auth State:', {
    hasUser: !!user,
    userEmail: user?.email,
    hasProfile: !!profile,
    profileRole: profile?.role,
    loading
  })

  // Only redirect if user is not authenticated or explicitly not a customer
  // But avoid infinite loops for platform owners
  if (!loading && !user) {
    return <Navigate to="/auth" replace />
  }

  // If platform_owner/super_admin accidentally lands here, redirect to their dashboard
  if (!loading && user && profile) {
    if (profile.role === 'platform_owner' || profile.role === 'super_admin') {
      return <Navigate to="/platform-owner" replace />
    }
    if (profile.role === 'restaurant_admin') {
      return <Navigate to="/restaurant-admin" replace />
    }
    if (profile.role === 'driver') {
      return <Navigate to="/driver" replace />
    }
  }

  useEffect(() => {
    if (user && profile?.role === 'customer') {
      fetchOrders()
      fetchSubscriptions()
      fetchFavoriteRestaurants()
    }
  }, [user, profile])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants(name, image_url),
        order_items(*, meals(name))
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setOrders(data || [])
  }

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans(*, restaurants(name, image_url))
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    setSubscriptions(data || [])
  }

  const fetchFavoriteRestaurants = async () => {
    // Get restaurants from user's order history
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(6)

    setFavoriteRestaurants(data || [])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'accepted': return 'Aceite'
      case 'preparing': return 'A preparar'
      case 'out_for_delivery': return 'A caminho'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <LayoutWithBreadcrumb>
      <div className="bg-white shadow-sm border-b mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <ShoppingBag className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Minha Conta</h1>
                <p className="text-sm text-gray-500">Bem-vindo, {profile?.full_name}</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Fazer Pedido
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Meus Pedidos</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscrições</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Meus Pedidos</h2>
              <Badge variant="secondary">
                {orders.length} pedidos
              </Badge>
            </div>

            <div className="grid gap-4">
              {orders.map((order) => (
                <Link key={order.id} to={`/order/${order.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {order.restaurants?.name}
                          </CardTitle>
                          <CardDescription>
                            Pedido #{order.id.slice(-8)}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                        <span className="font-medium">€{order.total_amount}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {order.order_items?.slice(0, 3).map((item: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600">
                            {item.quantity}x {item.meals?.name}
                          </div>
                        ))}
                        {order.order_items?.length > 3 && (
                          <div className="text-sm text-gray-500">
                            +{order.order_items.length - 3} mais itens
                          </div>
                        )}
                      </div>

                      {order.status === 'delivered' && (
                        <Button variant="outline" size="sm" className="w-full">
                          Pedir Novamente
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Minhas Subscrições</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Subscrição
              </Button>
            </div>

            <div className="grid gap-4">
              {subscriptions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma subscrição ativa
                    </h3>
                    <p className="text-gray-500 text-center mb-4">
                      Subscreva um plano semanal ou mensal para receber comida regularmente
                    </p>
                    <Button>Explorar Planos</Button>
                  </CardContent>
                </Card>
              ) : (
                subscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {subscription.subscription_plans?.restaurants?.name}
                          </CardTitle>
                          <CardDescription>
                            {subscription.subscription_plans?.name}
                          </CardDescription>
                        </div>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Refeições por dia:</span>
                          <span className="text-sm font-medium">
                            {subscription.subscription_plans?.meals_per_day}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Próxima cobrança:</span>
                          <span className="text-sm font-medium">
                            {subscription.next_billing_date ? 
                              new Date(subscription.next_billing_date).toLocaleDateString('pt-PT') : 
                              'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Restaurantes Favoritos</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {favoriteRestaurants.map((restaurant) => (
                <Card key={restaurant.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="aspect-video bg-gray-200 rounded-lg mb-3">
                      {restaurant.image_url ? (
                        <img 
                          src={restaurant.image_url} 
                          alt={restaurant.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                    <CardDescription>{restaurant.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{restaurant.rating || "4.5"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithBreadcrumb>
  )
}

export default CustomerDashboard
