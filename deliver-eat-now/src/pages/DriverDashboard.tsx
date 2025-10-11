
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Truck, MapPin, Clock, Euro, Navigation, Phone } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type DeliveryStatus = Database['public']['Enums']['delivery_status']
type OrderStatus = Database['public']['Enums']['order_status']

const DriverDashboard = () => {
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [isAvailable, setIsAvailable] = useState(true)
  const [driverProfile, setDriverProfile] = useState<any>(null)
  const [stats, setStats] = useState({ todayDeliveries: 0, todayEarnings: 0 })

  // Redirect if not authenticated or not driver
  if (!loading && (!user || profile?.role !== 'driver')) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (user && profile?.role === 'driver') {
      fetchDriverProfile()
      fetchAvailableOrders()
      fetchMyOrders()
      fetchStats()
    }
  }, [user, profile])

  const fetchDriverProfile = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', user?.id)
      .single()
    
    if (data) {
      setDriverProfile(data)
      setIsAvailable(data.is_available)
    }
  }

  const fetchAvailableOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey(full_name, phone),
        restaurants(name, address, phone),
        order_items(*, meals(name))
      `)
      .eq('status', 'out_for_delivery')
      .is('driver_id', null)
      .order('created_at', { ascending: true })

    setOrders(data || [])
  }

  const fetchMyOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_user_id_fkey(full_name, phone),
        restaurants(name, address, phone),
        order_items(*, meals(name))
      `)
      .eq('driver_id', user?.id)
      .in('status', ['out_for_delivery'])
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(prev => [...data, ...prev.filter(o => !o.driver_id)])
    }
  }

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('driver_id', user?.id)
      .eq('status', 'delivered')
      .gte('created_at', today)

    if (data) {
      setStats({
        todayDeliveries: data.length,
        todayEarnings: data.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0)
      })
    }
  }

  const toggleAvailability = async () => {
    const newStatus = !isAvailable
    const { error } = await supabase
      .from('drivers')
      .update({ is_available: newStatus })
      .eq('id', user?.id)

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar disponibilidade",
        variant: "destructive"
      })
    } else {
      setIsAvailable(newStatus)
      toast({
        title: newStatus ? "Disponível" : "Indisponível",
        description: `Estado alterado para ${newStatus ? 'disponível' : 'indisponível'}`
      })
    }
  }

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ driver_id: user?.id })
      .eq('id', orderId)

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar pedido",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Pedido aceite",
        description: "Pode dirigir-se ao restaurante"
      })
      fetchAvailableOrders()
      fetchMyOrders()
    }
  }

  const completeDelivery = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' as OrderStatus })
      .eq('id', orderId)

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível completar entrega",
        variant: "destructive"
      })
    } else {
      toast({
        title: "Entrega concluída",
        description: "Parabéns! Entrega realizada com sucesso"
      })
      fetchMyOrders()
      fetchStats()
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Truck className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard Motorista</h1>
                <p className="text-sm text-gray-500">Bem-vindo, {profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Disponível</span>
                <Switch checked={isAvailable} onCheckedChange={toggleAvailability} />
              </div>
              <Badge variant={isAvailable ? "default" : "secondary"}>
                {isAvailable ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Entregas Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayDeliveries}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ganhos Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.todayEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{driverProfile?.rating || "5.0"} ⭐</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Pedidos Disponíveis</TabsTrigger>
            <TabsTrigger value="myorders">Minhas Entregas</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Pedidos Disponíveis</h2>
              <Badge variant="secondary">
                {orders.filter(o => !o.driver_id).length} disponíveis
              </Badge>
            </div>

            <div className="grid gap-4">
              {orders.filter(o => !o.driver_id).map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {order.restaurants?.name}
                        </CardTitle>
                        <CardDescription>
                          Cliente: {order.profiles?.full_name}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">€{order.total_amount}</div>
                        <div className="text-sm text-gray-500">Taxa: €2.50</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.restaurants?.address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Navigation className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.delivery_address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Pedido há {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} min
                        </span>
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={() => acceptOrder(order.id)}
                        disabled={!isAvailable}
                      >
                        Aceitar Entrega
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="myorders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Minhas Entregas</h2>
            </div>

            <div className="grid gap-4">
              {orders.filter(o => o.driver_id === user?.id).map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {order.restaurants?.name}
                        </CardTitle>
                        <CardDescription>
                          Cliente: {order.profiles?.full_name}
                        </CardDescription>
                      </div>
                      <Badge variant="default">Em Entrega</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.profiles?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.delivery_address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Euro className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">€{order.total_amount}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Itens:</p>
                        {order.order_items?.map((item: any, index: number) => (
                          <div key={index} className="text-sm text-gray-600">
                            {item.quantity}x {item.meals?.name}
                          </div>
                        ))}
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => completeDelivery(order.id)}
                      >
                        Marcar como Entregue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default DriverDashboard
