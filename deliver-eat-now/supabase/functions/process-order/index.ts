import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface OrderData {
  user_id: string
  restaurant_id: string
  items: Array<{
    meal_id: string
    quantity: number
    unit_price: number
  }>
  delivery_address: string
  delivery_fee: number
  notes?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderData }: { orderData: OrderData } = await req.json()

    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity)
    }, 0)
    
    const total = subtotal + orderData.delivery_fee

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        restaurant_id: orderData.restaurant_id,
        status: 'pending',
        subtotal: subtotal,
        delivery_fee: orderData.delivery_fee,
        total_amount: total,
        delivery_address: orderData.delivery_address,
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      meal_id: item.meal_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Get restaurant and user info for notifications
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, email')
      .eq('id', orderData.restaurant_id)
      .single()

    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', orderData.user_id)
      .single()

    // Send notification email to restaurant (in a real app, you'd use a service like Resend or SendGrid)
    console.log(`📧 New order notification sent to restaurant: ${restaurant?.name}`)
    console.log(`📦 Order #${order.id.slice(0, 8)} from ${user?.full_name}`)

    // You could also send push notifications here using OneSignal or similar service

    return new Response(
      JSON.stringify({
        success: true,
        order: order,
        message: 'Order created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error processing order:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
}) 