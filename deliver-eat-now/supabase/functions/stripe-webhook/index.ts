import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const stripeEndpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing Stripe signature')
    }

    const body = await req.text()
    
    // In a real implementation, you would verify the webhook signature here
    // using the Stripe library
    console.log('🎯 Stripe webhook received')

    const event = JSON.parse(body)
    
    console.log(`📦 Processing event: ${event.type}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handleSubscriptionPaymentFailed(event.data.object)
        break
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object)
        break
        
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Stripe webhook error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function handlePaymentSucceeded(paymentIntent: any) {
  console.log('💰 Payment succeeded:', paymentIntent.id)
  
  // Find order by payment_intent_id (you'd store this when creating the payment)
  const { data: order, error } = await supabase
    .from('orders')
    .update({ 
      status: 'accepted',
      // payment_intent_id: paymentIntent.id  // You'd add this field to track payments
    })
    .eq('total_amount', paymentIntent.amount / 100) // Convert from cents
    .select()
    .single()
    
  if (error) {
    console.error('Error updating order after payment:', error)
    return
  }
  
  console.log('✅ Order payment confirmed:', order?.id)
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log('❌ Payment failed:', paymentIntent.id)
  
  // You could update order status to failed and send notification
  console.log('📧 Send payment failure notification to customer')
}

async function handleSubscriptionPayment(invoice: any) {
  console.log('💰 Subscription payment succeeded:', invoice.id)
  
  // Update subscription billing date
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        next_billing_date: new Date(invoice.period_end * 1000).toISOString().split('T')[0]
      })
      .eq('stripe_subscription_id', invoice.subscription)
      
    if (error) {
      console.error('Error updating subscription billing date:', error)
    } else {
      console.log('✅ Subscription billing date updated')
    }
  }
}

async function handleSubscriptionPaymentFailed(invoice: any) {
  console.log('❌ Subscription payment failed:', invoice.id)
  
  // Pause subscription after failed payment
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused'
      })
      .eq('stripe_subscription_id', invoice.subscription)
      
    if (error) {
      console.error('Error pausing subscription:', error)
    } else {
      console.log('⏸️ Subscription paused due to payment failure')
      // Send notification to customer about payment failure
    }
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  console.log('📝 Subscription updated:', subscription.id)
  
  // Update subscription status in our database
  const status = subscription.status === 'active' ? 'active' : 
                subscription.status === 'canceled' ? 'cancelled' : 
                subscription.status === 'past_due' ? 'paused' : 'active'
                
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      next_billing_date: subscription.current_period_end ? 
        new Date(subscription.current_period_end * 1000).toISOString().split('T')[0] : null
    })
    .eq('stripe_subscription_id', subscription.id)
    
  if (error) {
    console.error('Error updating subscription:', error)
  } else {
    console.log(`✅ Subscription status updated to: ${status}`)
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  console.log('🗑️ Subscription cancelled:', subscription.id)
  
  // Update subscription status to cancelled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      end_date: new Date().toISOString().split('T')[0]
    })
    .eq('stripe_subscription_id', subscription.id)
    
  if (error) {
    console.error('Error cancelling subscription:', error)
  } else {
    console.log('✅ Subscription cancelled in database')
    // Send confirmation email to customer
  }
} 