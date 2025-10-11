import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CreditCard, MapPin, Clock, ShoppingCart, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import StripeCheckout from '@/components/payment/StripeCheckout'
import { validateDeliveryAddress } from '@/utils/deliveryValidation'

interface PaymentIntentResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface DeliveryValidation {
  isValid: boolean
  reason?: string
  deliveryFee?: number
  minimumOrder?: number
  estimatedTime?: string
  zoneName?: string
}

const Checkout = () => {
  const { user, profile } = useAuth()
  const { items: cartItems, getTotalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [addressValidation, setAddressValidation] = useState<DeliveryValidation | null>(null)
  const [isValidatingAddress, setIsValidatingAddress] = useState(false)

  const [deliveryData, setDeliveryData] = useState({
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    notes: ''
  })

  // Redirect if not authenticated or cart is empty
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (cartItems.length === 0) {
    return <Navigate to="/" replace />
  }

  const restaurant = cartItems[0]
  const subtotal = getTotalPrice()
  const dynamicDeliveryFee = addressValidation?.deliveryFee || 2.50 // Use validated fee or default
  const total = subtotal + dynamicDeliveryFee

  // Validate address when delivery data changes
  useEffect(() => {
    const validateAddress = async () => {
      if (!deliveryData.address || !deliveryData.city || !deliveryData.postalCode) {
        setAddressValidation(null)
        return
      }

      const fullAddress = `${deliveryData.address}, ${deliveryData.city}, ${deliveryData.postalCode}`
      
      setIsValidatingAddress(true)
      try {
        const validation = await validateDeliveryAddress(restaurant.restaurant_id, fullAddress)
        setAddressValidation(validation)
      } catch (error) {
        console.error('Error validating address:', error)
        setAddressValidation({
          isValid: false,
          reason: 'Erro ao validar endereço. Tente novamente.'
        })
      } finally {
        setIsValidatingAddress(false)
      }
    }

    // Debounce validation
    const timeoutId = setTimeout(validateAddress, 1000)
    return () => clearTimeout(timeoutId)
  }, [deliveryData.address, deliveryData.city, deliveryData.postalCode, restaurant.restaurant_id])

  const handleInputChange = (field: string, value: string) => {
    setDeliveryData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePaymentSuccess = async (paymentIntent: PaymentIntentResult) => {
    // Validate delivery data
    if (!deliveryData.address || !deliveryData.city || !deliveryData.postalCode || !deliveryData.phone) {
      toast({
        title: "Dados incompletos",
        description: "Por favor preenche todos os campos obrigatórios",
        variant: "destructive"
      })
      return
    }

    // Check if address is validated and deliverable
    if (!addressValidation?.isValid) {
      toast({
        title: "Endereço fora da área de entrega",
        description: addressValidation?.reason || "Este endereço não está na nossa área de entrega.",
        variant: "destructive"
      })
      return
    }

    // Check minimum order requirement
    if (addressValidation.minimumOrder && subtotal < addressValidation.minimumOrder) {
      toast({
        title: "Valor mínimo não atingido",
        description: `O valor mínimo para esta área é €${addressValidation.minimumOrder.toFixed(2)}`,
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Use the process-order Edge Function for better reliability
      const { data: result, error } = await supabase.functions.invoke('process-order', {
        body: {
          data: {
            user_id: user.id,
            restaurant_id: restaurant.restaurant_id,
            items: cartItems.map(item => ({
              meal_id: item.id,
              quantity: item.quantity,
              unit_price: item.price,
            })),
            subtotal: subtotal,
            delivery_fee: dynamicDeliveryFee,
            total_amount: total,
            delivery_address: `${deliveryData.address}, ${deliveryData.city}, ${deliveryData.postalCode}`,
            payment_intent_id: paymentIntent.id,
          }
        }
      })

      if (error) throw error

      // Clear cart and redirect to order tracking
      clearCart()
      
      toast({
        title: "Pedido criado com sucesso!",
        description: `O teu pedido foi enviado para o restaurante e o pagamento foi processado.`
      })

      navigate(`/order/${result.order.id}`)

    } catch (error) {
      console.error('Error creating order:', error)
      toast({
        title: "Erro ao criar pedido",
        description: "Ocorreu um erro. Tenta novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive"
    })
  }

  const isFormValid = deliveryData.address && deliveryData.city && deliveryData.postalCode && deliveryData.phone
  const isDeliverable = addressValidation?.isValid
  const hasMinimumOrder = !addressValidation?.minimumOrder || subtotal >= addressValidation.minimumOrder

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={`/restaurant/${restaurant.restaurant_id}`} className="flex items-center space-x-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Voltar ao Menu</span>
            </Link>
            <h1 className="text-lg font-semibold">Finalizar Pedido</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Order Summary */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Resumo do Pedido</span>
                </CardTitle>
                <CardDescription>
                  {restaurant.restaurant_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                    </div>
                    <span className="font-medium">€{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                
                <Separator />
                
                {/* Updated Order Summary with dynamic delivery fee */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxa de Entrega</span>
                    <span className="flex items-center space-x-1">
                      <span>€{dynamicDeliveryFee.toFixed(2)}</span>
                      {addressValidation?.isValid && (
                        <Badge variant="secondary" className="text-xs">
                          {addressValidation.zoneName}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information with Address Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Dados de Entrega</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="address">Morada *</Label>
                    <Input
                      id="address"
                      value={deliveryData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Rua, número, andar"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={deliveryData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Lisboa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Código Postal *</Label>
                    <Input
                      id="postalCode"
                      value={deliveryData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="1000-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={deliveryData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+351 910 000 000"
                    />
                  </div>
                </div>

                {/* Address Validation Feedback */}
                {isValidatingAddress && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      A validar endereço de entrega...
                    </AlertDescription>
                  </Alert>
                )}

                {addressValidation && !isValidatingAddress && (
                  <Alert className={addressValidation.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    {addressValidation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={addressValidation.isValid ? "text-green-800" : "text-red-800"}>
                      {addressValidation.isValid ? (
                        <div className="space-y-2">
                          <div>✅ Endereço na área de entrega: {addressValidation.zoneName}</div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span>Taxa: €{addressValidation.deliveryFee?.toFixed(2)}</span>
                            <span>Mínimo: €{addressValidation.minimumOrder?.toFixed(2)}</span>
                            <span>Tempo: {addressValidation.estimatedTime}</span>
                          </div>
                          {!hasMinimumOrder && (
                            <div className="text-orange-600 font-medium">
                              ⚠️ Valor mínimo: €{addressValidation.minimumOrder?.toFixed(2)} (faltam €{(addressValidation.minimumOrder! - subtotal).toFixed(2)})
                            </div>
                          )}
                        </div>
                      ) : (
                        addressValidation.reason
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="notes">Notas para o entregador</Label>
                  <Textarea
                    id="notes"
                    value={deliveryData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Instruções especiais para a entrega..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            {/* Updated Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Tempo Estimado</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">
                  {addressValidation?.estimatedTime || '30-45 min'}
                </p>
                <p className="text-sm text-gray-600">Tempo de entrega estimado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Pagamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!isFormValid || !isDeliverable || !hasMinimumOrder) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      {!isFormValid && "Por favor, preencha todos os campos obrigatórios."}
                      {isFormValid && !isDeliverable && "Endereço fora da área de entrega."}
                      {isFormValid && isDeliverable && !hasMinimumOrder && `Valor mínimo: €${addressValidation?.minimumOrder?.toFixed(2)}`}
                    </p>
                  </div>
                )}
                
                {isFormValid && isDeliverable && hasMinimumOrder && (
                  <div className="space-y-4">
                    <StripeCheckout
                      amount={total}
                      currency="eur"
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                    
                    <p className="text-xs text-gray-500 text-center">
                      Ao finalizar, aceitas os nossos termos e condições
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout 