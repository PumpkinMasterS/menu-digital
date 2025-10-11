import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  CreditCard, 
  Pause, 
  Play, 
  X, 
  Euro, 
  Calendar, 
  Truck, 
  Phone,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface SubscriptionPlan {
  id: string
  name: string
  name_pt: string
  description_pt: string
  price_cents: number
  delivery_limit: number
  platform_fee_percentage: number
  features: string[]
  is_popular: boolean
}

interface RestaurantSubscription {
  id: string
  status: 'active' | 'paused' | 'cancelled' | 'pending_payment'
  current_period_start: string
  current_period_end: string
  next_billing_date: string
  payment_phone: string
  deliveries_used: number
  deliveries_remaining: number
  subscription_plans_new: SubscriptionPlan
  restaurants: {
    name: string
  }
}

const SubscriptionManagement = () => {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<RestaurantSubscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [paymentPhone, setPaymentPhone] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [provider, setProvider] = useState<'ifthenpay' | 'eupago' | 'easypay' | 'sibs_direct'>('sibs_direct')

  useEffect(() => {
    if (user && profile?.role === 'restaurant_admin') {
      fetchSubscription()
      fetchAvailablePlans()
    }
  }, [user, profile])

  const fetchSubscription = async () => {
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user?.id)
        .single()

      if (restaurant) {
        const { data } = await supabase
          .from('restaurant_subscriptions')
          .select(`
            *,
            subscription_plans_new:plan_id (*),
            restaurants:restaurant_id (name)
          `)
          .eq('restaurant_id', restaurant.id)
          .neq('status', 'cancelled')
          .single()

        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const fetchAvailablePlans = async () => {
    try {
      const { data } = await supabase
        .from('subscription_plans_new')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setAvailablePlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  const createSubscription = async () => {
    if (!selectedPlan || !paymentPhone) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um plano e insira o seu número de telemóvel",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user?.id)
        .single()

      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: 'create',
          restaurant_id: restaurant?.id,
          plan_id: selectedPlan,
          payment_phone: paymentPhone,
          provider: provider
        }
      })

      if (error) throw error

      toast({
        title: "Assinatura criada!",
        description: "Verifique o seu telemóvel para confirmar o pagamento MB WAY"
      })

      fetchSubscription()
    } catch (error) {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const manageSubscription = async (action: 'pause' | 'reactivate' | 'cancel', reason?: string) => {
    if (!subscription) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: action,
          subscription_id: subscription.id,
          reason: reason
        }
      })

      if (error) throw error

      let message = ''
      switch (action) {
        case 'pause':
          message = 'Assinatura pausada com sucesso'
          break
        case 'reactivate':
          message = 'Assinatura reativada com sucesso'
          break
        case 'cancel':
          message = 'Assinatura cancelada'
          break
      }

      toast({
        title: "Ação realizada",
        description: message
      })

      fetchSubscription()
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-PT')

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativa', color: 'bg-green-100 text-green-800' },
      pending_payment: { label: 'Pagamento Pendente', color: 'bg-yellow-100 text-yellow-800' },
      paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status] || statusConfig.cancelled
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (!user || profile?.role !== 'restaurant_admin') {
    return (
      <div className="text-center py-12">
        <p>Acesso restrito a administradores de restaurante</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gestão de Assinatura</h1>

        <Tabs defaultValue={subscription ? "current" : "plans"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Assinatura Atual</TabsTrigger>
            <TabsTrigger value="plans">Planos Disponíveis</TabsTrigger>
          </TabsList>

          {/* Current Subscription Tab */}
          <TabsContent value="current">
            {subscription ? (
              <div className="space-y-6">
                {/* Subscription Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{subscription.subscription_plans_new.name_pt}</span>
                          {getStatusBadge(subscription.status)}
                        </CardTitle>
                        <CardDescription>
                          Restaurante: {subscription.restaurants.name}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(subscription.subscription_plans_new.price_cents)}
                        </div>
                        <div className="text-sm text-gray-500">por mês</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Truck className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="font-semibold">{subscription.deliveries_remaining}</div>
                        <div className="text-sm text-gray-600">Entregas Restantes</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="font-semibold">{formatDate(subscription.next_billing_date)}</div>
                        <div className="text-sm text-gray-600">Próxima Faturação</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Euro className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="font-semibold">{subscription.subscription_plans_new.platform_fee_percentage}%</div>
                        <div className="text-sm text-gray-600">Taxa da Plataforma</div>
                      </div>
                    </div>

                    {/* Subscription Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      {subscription.status === 'active' && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => manageSubscription('pause')}
                            disabled={loading}
                            className="flex items-center space-x-2"
                          >
                            <Pause className="h-4 w-4" />
                            <span>Pausar</span>
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" className="flex items-center space-x-2">
                                <X className="h-4 w-4" />
                                <span>Cancelar</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Cancelar Assinatura</DialogTitle>
                                <DialogDescription>
                                  Tem a certeza que deseja cancelar a sua assinatura? Esta ação não pode ser desfeita.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="destructive"
                                  onClick={() => manageSubscription('cancel', 'User requested cancellation')}
                                  disabled={loading}
                                >
                                  Confirmar Cancelamento
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {subscription.status === 'paused' && (
                        <Button
                          onClick={() => manageSubscription('reactivate')}
                          disabled={loading}
                          className="flex items-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>Reativar</span>
                        </Button>
                      )}

                      {subscription.status === 'pending_payment' && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Pagamento pendente. Verifique o seu telemóvel para confirmar o pagamento MB WAY.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Billing History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Histórico de Pagamentos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      Histórico de pagamentos estará disponível em breve
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="space-y-4">
                    <div className="text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4" />
                      <p>Não tem uma assinatura ativa</p>
                    </div>
                    <Button onClick={() => {
                      const tabsElement = document.querySelector('[data-value="plans"]') as HTMLElement
                      tabsElement?.click()
                    }}>
                      Ver Planos Disponíveis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Available Plans Tab */}
          <TabsContent value="plans">
            <div className="space-y-6">
              {!subscription && (
                <Card>
                  <CardHeader>
                    <CardTitle>Criar Nova Assinatura</CardTitle>
                    <CardDescription>
                      Escolha um plano e configure o pagamento MB WAY
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Número de Telemóvel</Label>
                        <Input
                          id="phone"
                          placeholder="+351 912 345 678"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="provider">Provedor de Pagamento</Label>
                        <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sibs_direct">SIBS Direto</SelectItem>
                            <SelectItem value="ifthenpay">IfThenPay</SelectItem>
                            <SelectItem value="eupago">EuPago</SelectItem>
                            <SelectItem value="easypay">EasyPay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`relative ${plan.is_popular ? 'ring-2 ring-blue-500' : ''} ${selectedPlan === plan.id ? 'bg-blue-50' : ''}`}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-500 text-white">Mais Popular</Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <CardTitle>{plan.name_pt}</CardTitle>
                      <div className="text-3xl font-bold">
                        {formatCurrency(plan.price_cents)}
                        <span className="text-sm font-normal text-gray-500">/mês</span>
                      </div>
                      <CardDescription>{plan.description_pt}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{plan.delivery_limit} entregas incluídas</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Taxa da plataforma: {plan.platform_fee_percentage}%</span>
                        </div>
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {!subscription && (
                        <Button
                          className="w-full"
                          variant={selectedPlan === plan.id ? "default" : "outline"}
                          onClick={() => {
                            if (selectedPlan === plan.id) {
                              createSubscription()
                            } else {
                              setSelectedPlan(plan.id)
                            }
                          }}
                          disabled={loading}
                        >
                          {selectedPlan === plan.id ? (
                            loading ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              'Confirmar Assinatura'
                            )
                          ) : (
                            'Selecionar Plano'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default SubscriptionManagement 