import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChefHat, 
  Clock, 
  Bell,
  CheckCircle,
  Timer,
  Package,
  Truck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const KitchenDashboard = () => {
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Redirect if not authenticated or not kitchen/restaurant_admin
  if (!loading && (!user || !['kitchen', 'restaurant_admin'].includes(profile?.role))) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user && ['kitchen', 'restaurant_admin'].includes(profile?.role)) {
      fetchRestaurant()
      
      // Set up real-time subscription for new orders
      const subscription = supabase
        .channel('kitchen-orders')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders' }, 
          (payload) => {
            console.log('Order update:', payload)
            fetchOrders()
            if (payload.eventType === 'INSERT') {
              toast({
                title: "🔔 Novo Pedido Recebido!",
                description: `Pedido #${payload.new.id.slice(-8)} - €${payload.new.total_amount}`,
              })
            }
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
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchOrders, 30000)
      return () => clearInterval(interval)
    }
  }, [restaurant])

  const fetchRestaurant = async () => {
    try {
      // For kitchen staff, we need to get the restaurant they work for
      // This assumes kitchen staff are associated with a restaurant via owner_id
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user?.id)
        .single()

      if (data) {
        setRestaurant(data)
      } else {
        // If user is kitchen staff, we might need a different approach
        // For now, show error
        toast({
          title: "Erro",
          description: "Não foi possível encontrar o restaurante associado.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    }
  }

  const fetchOrders = async () => {
    if (!restaurant?.id) return

    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, meals(name)),
          profiles(full_name, phone)
        `)
        .eq('restaurant_id', restaurant.id)
        .in('status', ['pending', 'accepted', 'preparing', 'out_for_delivery'])
        .order('created_at', { ascending: true })

      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos.",
        variant: "destructive"
      })
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      toast({
        title: "Status Atualizado",
        description: `Pedido #${orderId.slice(-8)} → ${getStatusText(newStatus)}`,
      })
      
      fetchOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido.",
        variant: "destructive"
      })
    }
  }

  const refreshOrders = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
    toast({
      title: "Atualizado",
      description: "Lista de pedidos atualizada"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800 border-red-200'
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'accepted': return 'Aceite'
      case 'preparing': return 'A Preparar'
      case 'out_for_delivery': return 'Saiu para Entrega'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'preparing': return <Timer className="h-4 w-4" />
      case 'out_for_delivery': return <Truck className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'accepted'
      case 'accepted': return 'preparing'
      case 'preparing': return 'out_for_delivery'
      default: return null
    }
  }

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'Aceitar Pedido'
      case 'accepted': return 'Iniciar Preparação'
      case 'preparing': return 'Pronto para Entrega'
      default: return null
    }
  }

  const getPriorityLevel = (status: string, createdAt: string) => {
    const orderTime = new Date(createdAt)
    const now = new Date()
    const minutesAgo = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))
    
    if (status === 'pending' && minutesAgo > 10) return 'high'
    if (status === 'accepted' && minutesAgo > 20) return 'high'
    if (status === 'preparing' && minutesAgo > 30) return 'high'
    if (minutesAgo > 5) return 'medium'
    return 'low'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500 bg-red-50'
      case 'medium': return 'border-l-4 border-l-yellow-500 bg-yellow-50'
      default: return 'border-l-4 border-l-green-500 bg-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const preparingCount = orders.filter(o => o.status === 'preparing').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <ChefHat className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cozinha - {restaurant?.name}</h1>
                <p className="text-sm text-gray-500">Gestão de Pedidos</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshOrders}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Preparar</CardTitle>
              <Timer className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{preparingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ativos</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídos para Entrega</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {orders.filter(o => o.status === 'out_for_delivery').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Pedidos Ativos</h2>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-500">Atualização automática a cada 30s</span>
            </div>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido ativo</h3>
                  <p className="text-gray-500">Quando chegarem novos pedidos, eles aparecerão aqui.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => {
                const priority = getPriorityLevel(order.status, order.created_at)
                const nextStatus = getNextStatus(order.status)
                const nextStatusText = getNextStatusText(order.status)
                
                return (
                  <Card key={order.id} className={`transition-all ${getPriorityColor(priority)}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>Pedido #{order.id.slice(-8)}</span>
                            {priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                URGENTE
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-4 mt-1">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(order.created_at).toLocaleTimeString('pt-PT', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                            </span>
                            <span>Cliente: {order.profiles?.full_name}</span>
                            <span>Total: €{order.total_amount}</span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(order.status)} variant="secondary">
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status)}</span>
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Order Items */}
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Itens do Pedido:</h4>
                          <div className="space-y-2">
                            {order.order_items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <span className="font-medium">{item.quantity}x {item.meals?.name}</span>
                                <span className="text-gray-600">€{item.total_price}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Delivery Address */}
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Endereço de Entrega:</h4>
                          <p className="text-sm text-gray-600">{order.delivery_address}</p>
                        </div>

                        {/* Action Button */}
                        {nextStatus && (
                          <div className="pt-2">
                            <Button 
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                              className="w-full"
                              variant={order.status === 'pending' ? 'default' : 'outline'}
                              size="sm"
                            >
                              {nextStatusText}
                            </Button>
                          </div>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <Alert>
                            <Truck className="h-4 w-4" />
                            <AlertDescription>
                              Pedido a caminho do cliente. Aguardando confirmação de entrega.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KitchenDashboard 