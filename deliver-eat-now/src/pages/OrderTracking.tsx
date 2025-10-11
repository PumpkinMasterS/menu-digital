import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Clock, MapPin, Phone, Truck, CheckCircle, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

interface Order {
  id: string
  status: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  delivery_address: string
  estimated_delivery_time: string
  created_at: string
  restaurants: {
    name: string
    phone: string
    image_url?: string
  }
  drivers?: {
    id: string
    profiles: {
      full_name: string
      phone: string
    }
  }
  order_items: {
    quantity: number
    unit_price: number
    meals: {
      name: string
      image_url?: string
    }
  }[]
}

const OrderTracking = () => {
  const { orderId } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  useEffect(() => {
    if (orderId) {
      fetchOrder()
      setupRealtimeSubscription()
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants(name, phone, image_url),
          drivers(id, profiles(full_name, phone)),
          order_items(
            quantity,
            unit_price,
            meals(name, image_url)
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id) // Ensure user can only see their own orders
        .single()

      if (error) throw error

      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o pedido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Order update received:', payload)
          setOrder(prevOrder => {
            if (prevOrder) {
              return { ...prevOrder, ...payload.new }
            }
            return prevOrder
          })
          
          // Show notification for status changes
          const newStatus = payload.new.status
          if (newStatus !== order?.status) {
            const statusMessages = {
              pending: 'Pedido recebido',
              accepted: 'Pedido aceite pelo restaurante',
              preparing: 'Pedido a ser preparado',
              out_for_delivery: 'Pedido saiu para entrega',
              delivered: 'Pedido entregue!',
              cancelled: 'Pedido cancelado'
            }
            
            toast({
              title: "Status do pedido atualizado",
              description: statusMessages[newStatus as keyof typeof statusMessages] || `Status: ${newStatus}`,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const getStatusProgress = (status: string) => {
    const statusOrder = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered']
    const currentIndex = statusOrder.indexOf(status)
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'accepted': return 'bg-blue-500'
      case 'preparing': return 'bg-orange-500'
      case 'out_for_delivery': return 'bg-purple-500'
      case 'delivered': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando confirmação'
      case 'accepted': return 'Aceite pelo restaurante'
      case 'preparing': return 'A ser preparado'
      case 'out_for_delivery': return 'Saiu para entrega'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getEstimatedTime = () => {
    if (!order?.estimated_delivery_time) return null
    const estimatedTime = new Date(order.estimated_delivery_time)
    const now = new Date()
    const diffMinutes = Math.ceil((estimatedTime.getTime() - now.getTime()) / (1000 * 60))
    
    if (diffMinutes <= 0) return 'A qualquer momento'
    if (diffMinutes < 60) return `${diffMinutes} minutos`
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}min`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h2>
          <p className="text-gray-600 mb-4">O pedido que procuras não existe ou não tens permissão para o ver.</p>
          <Link to="/customer">
            <Button>Voltar aos meus pedidos</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/customer" className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Meus Pedidos</span>
            </Link>
            <h1 className="text-lg font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Status do Pedido</CardTitle>
                <Badge className={`${getStatusColor(order.status)} text-white`}>
                  {getStatusText(order.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={getStatusProgress(order.status)} className="w-full" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Tempo estimado: {getEstimatedTime() || 'Calculando...'}</span>
                </div>
                {order.drivers && (
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span>Entregador: {order.drivers.profiles.full_name}</span>
                  </div>
                )}
              </div>

              {order.status === 'delivered' && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Pedido entregue com sucesso!</span>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Pedido cancelado</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restaurant Info */}
          <Card>
            <CardHeader>
              <CardTitle>{order.restaurants.name}</CardTitle>
              <CardDescription className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{order.delivery_address}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>{order.restaurants.phone}</span>
                </div>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.order_items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.meals.image_url ? (
                        <img 
                          src={item.meals.image_url} 
                          alt={item.meals.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <span className="text-xs">IMG</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.meals.name}</h4>
                      <p className="text-sm text-gray-600">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-medium">€{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>€{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de Entrega</span>
                  <span>€{order.delivery_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>€{order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Contact (if assigned and out for delivery) */}
          {order.drivers && order.status === 'out_for_delivery' && (
            <Card>
              <CardHeader>
                <CardTitle>Contacto do Entregador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{order.drivers.profiles.full_name}</p>
                    <p className="text-sm text-gray-600">{order.drivers.profiles.phone}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderTracking 