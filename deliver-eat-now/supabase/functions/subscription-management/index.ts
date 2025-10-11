import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
}

interface SubscriptionAction {
  action: 'pause' | 'reactivate' | 'cancel' | 'change_plan' | 'create'
  subscription_id?: string
  restaurant_id?: string
  plan_id?: string
  reason?: string
  cancel_at_period_end?: boolean
  payment_phone?: string
  provider?: 'ifthenpay' | 'eupago' | 'easypay' | 'sibs_direct'
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Processing subscription management request')

    const requestData: SubscriptionAction = await req.json()
    const { action } = requestData

    let result: any

    switch (action) {
      case 'create':
        result = await createSubscription(requestData)
        break
      case 'pause':
        result = await pauseSubscription(requestData)
        break
      case 'reactivate':
        result = await reactivateSubscription(requestData)
        break
      case 'cancel':
        result = await cancelSubscription(requestData)
        break
      case 'change_plan':
        result = await changePlan(requestData)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        result: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error(`❌ Error in subscription management (${requestData?.action}):`, error)
    
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

// ============================================================================
// SUBSCRIPTION MANAGEMENT FUNCTIONS
// ============================================================================

async function createSubscription(data: SubscriptionAction) {
  console.log('✨ Creating new subscription')

  if (!data.restaurant_id || !data.plan_id || !data.payment_phone) {
    throw new Error('Missing required fields: restaurant_id, plan_id, payment_phone')
  }

  // Check if restaurant already has an active subscription
  const { data: existingSubscription } = await supabase
    .from('restaurant_subscriptions')
    .select('id, status')
    .eq('restaurant_id', data.restaurant_id)
    .in('status', ['active', 'pending_payment'])
    .single()

  if (existingSubscription) {
    throw new Error('Restaurant already has an active subscription')
  }

  // Get plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans_new')
    .select('*')
    .eq('id', data.plan_id)
    .eq('is_active', true)
    .single()

  if (planError || !plan) {
    throw new Error(`Plan not found or inactive: ${planError?.message}`)
  }

  // Get restaurant and organization details
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, organization_id, name')
    .eq('id', data.restaurant_id)
    .single()

  if (restaurantError || !restaurant) {
    throw new Error(`Restaurant not found: ${restaurantError?.message}`)
  }

  // Calculate billing period
  const currentPeriodStart = new Date()
  const currentPeriodEnd = new Date()
  currentPeriodEnd.setDate(currentPeriodStart.getDate() + plan.billing_cycle_days)

  // Create subscription
  const { data: subscription, error: subscriptionError } = await supabase
    .from('restaurant_subscriptions')
    .insert({
      organization_id: restaurant.organization_id,
      restaurant_id: data.restaurant_id,
      plan_id: data.plan_id,
      status: 'pending_payment',
      current_period_start: currentPeriodStart.toISOString().split('T')[0],
      current_period_end: currentPeriodEnd.toISOString().split('T')[0],
      next_billing_date: currentPeriodEnd.toISOString().split('T')[0],
      payment_method: `mbway_${data.provider || 'sibs'}`,
      payment_phone: data.payment_phone,
      deliveries_remaining: plan.delivery_limit
    })
    .select()
    .single()

  if (subscriptionError) {
    throw new Error(`Failed to create subscription: ${subscriptionError.message}`)
  }

  console.log(`✅ Subscription created: ${subscription.id}`)

  // Initiate payment
  const paymentResult = await supabase.functions.invoke('subscription-mbway-payment', {
    body: {
      subscription_id: subscription.id,
      payment_phone: data.payment_phone,
      provider: data.provider || 'sibs_direct'
    }
  })

  return {
    subscription_id: subscription.id,
    payment_initiated: paymentResult.data?.success || false,
    payment_details: paymentResult.data
  }
}

async function pauseSubscription(data: SubscriptionAction) {
  console.log('⏸️ Pausing subscription')

  if (!data.subscription_id) {
    throw new Error('Missing subscription_id')
  }

  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from('restaurant_subscriptions')
    .select('*')
    .eq('id', data.subscription_id)
    .single()

  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subError?.message}`)
  }

  if (subscription.status !== 'active') {
    throw new Error(`Cannot pause subscription with status: ${subscription.status}`)
  }

  // Update subscription status
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('restaurant_subscriptions')
    .update({
      status: 'paused',
      metadata: {
        ...subscription.metadata,
        paused_at: new Date().toISOString(),
        pause_reason: data.reason || 'User requested'
      }
    })
    .eq('id', data.subscription_id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to pause subscription: ${updateError.message}`)
  }

  // Cancel future scheduled deliveries
  await supabase
    .from('scheduled_deliveries')
    .update({ status: 'cancelled' })
    .eq('subscription_id', data.subscription_id)
    .eq('status', 'scheduled')
    .gt('scheduled_date', new Date().toISOString().split('T')[0])

  console.log('✅ Subscription paused successfully')

  return {
    subscription_id: data.subscription_id,
    new_status: 'paused',
    paused_at: new Date().toISOString()
  }
}

async function reactivateSubscription(data: SubscriptionAction) {
  console.log('▶️ Reactivating subscription')

  if (!data.subscription_id) {
    throw new Error('Missing subscription_id')
  }

  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from('restaurant_subscriptions')
    .select(`
      *,
      subscription_plans_new:plan_id (
        delivery_limit,
        billing_cycle_days
      )
    `)
    .eq('id', data.subscription_id)
    .single()

  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subError?.message}`)
  }

  if (subscription.status !== 'paused') {
    throw new Error(`Cannot reactivate subscription with status: ${subscription.status}`)
  }

  // Calculate new billing period
  const currentDate = new Date()
  const newPeriodEnd = new Date()
  newPeriodEnd.setDate(currentDate.getDate() + subscription.subscription_plans_new.billing_cycle_days)

  // Update subscription status
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('restaurant_subscriptions')
    .update({
      status: 'active',
      current_period_start: currentDate.toISOString().split('T')[0],
      current_period_end: newPeriodEnd.toISOString().split('T')[0],
      next_billing_date: newPeriodEnd.toISOString().split('T')[0],
      deliveries_remaining: subscription.subscription_plans_new.delivery_limit,
      metadata: {
        ...subscription.metadata,
        reactivated_at: new Date().toISOString()
      }
    })
    .eq('id', data.subscription_id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to reactivate subscription: ${updateError.message}`)
  }

  // Generate new scheduled deliveries
  const deliveriesCreated = await supabase.rpc('generate_scheduled_deliveries', {
    p_subscription_id: data.subscription_id
  })

  console.log('✅ Subscription reactivated successfully')

  return {
    subscription_id: data.subscription_id,
    new_status: 'active',
    reactivated_at: new Date().toISOString(),
    deliveries_created: deliveriesCreated.data || 0,
    new_period_end: newPeriodEnd.toISOString().split('T')[0]
  }
}

async function cancelSubscription(data: SubscriptionAction) {
  console.log('❌ Canceling subscription')

  if (!data.subscription_id) {
    throw new Error('Missing subscription_id')
  }

  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from('restaurant_subscriptions')
    .select('*')
    .eq('id', data.subscription_id)
    .single()

  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subError?.message}`)
  }

  if (subscription.status === 'cancelled') {
    throw new Error('Subscription is already cancelled')
  }

  const cancelDate = new Date()
  let actualCancelDate = cancelDate

  // If cancel_at_period_end is true, schedule cancellation for end of current period
  if (data.cancel_at_period_end && subscription.status === 'active') {
    actualCancelDate = new Date(subscription.current_period_end)
    
    // Update subscription to indicate it will be cancelled at period end
    const { error: updateError } = await supabase
      .from('restaurant_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancellation_reason: data.reason || 'User requested',
        metadata: {
          ...subscription.metadata,
          cancel_requested_at: cancelDate.toISOString(),
          will_cancel_at: actualCancelDate.toISOString()
        }
      })
      .eq('id', data.subscription_id)

    if (updateError) {
      throw new Error(`Failed to schedule cancellation: ${updateError.message}`)
    }

    console.log('📅 Subscription scheduled for cancellation at period end')

    return {
      subscription_id: data.subscription_id,
      status: 'scheduled_for_cancellation',
      will_cancel_at: actualCancelDate.toISOString(),
      cancel_requested_at: cancelDate.toISOString()
    }
  } else {
    // Immediate cancellation
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('restaurant_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: cancelDate.toISOString(),
        cancellation_reason: data.reason || 'User requested',
        metadata: {
          ...subscription.metadata,
          cancelled_immediately: true
        }
      })
      .eq('id', data.subscription_id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to cancel subscription: ${updateError.message}`)
    }

    // Cancel all future scheduled deliveries
    await supabase
      .from('scheduled_deliveries')
      .update({ status: 'cancelled' })
      .eq('subscription_id', data.subscription_id)
      .eq('status', 'scheduled')
      .gt('scheduled_date', cancelDate.toISOString().split('T')[0])

    console.log('✅ Subscription cancelled immediately')

    return {
      subscription_id: data.subscription_id,
      new_status: 'cancelled',
      cancelled_at: cancelDate.toISOString()
    }
  }
}

async function changePlan(data: SubscriptionAction) {
  console.log('🔄 Changing subscription plan')

  if (!data.subscription_id || !data.plan_id) {
    throw new Error('Missing subscription_id or plan_id')
  }

  // Get current subscription and new plan
  const [subscriptionResult, planResult] = await Promise.all([
    supabase
      .from('restaurant_subscriptions')
      .select(`
        *,
        subscription_plans_new:plan_id (
          name,
          price_cents
        )
      `)
      .eq('id', data.subscription_id)
      .single(),
    supabase
      .from('subscription_plans_new')
      .select('*')
      .eq('id', data.plan_id)
      .eq('is_active', true)
      .single()
  ])

  const { data: subscription, error: subError } = subscriptionResult
  const { data: newPlan, error: planError } = planResult

  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subError?.message}`)
  }

  if (planError || !newPlan) {
    throw new Error(`Plan not found or inactive: ${planError?.message}`)
  }

  if (subscription.plan_id === data.plan_id) {
    throw new Error('Subscription is already on this plan')
  }

  if (subscription.status !== 'active') {
    throw new Error(`Cannot change plan for subscription with status: ${subscription.status}`)
  }

  // Calculate proration if needed
  const currentPlan = subscription.subscription_plans_new
  const priceDifference = newPlan.price_cents - currentPlan.price_cents

  // Update subscription plan
  const { data: updatedSubscription, error: updateError } = await supabase
    .from('restaurant_subscriptions')
    .update({
      plan_id: data.plan_id,
      deliveries_remaining: newPlan.delivery_limit,
      metadata: {
        ...subscription.metadata,
        plan_changed_at: new Date().toISOString(),
        previous_plan_id: subscription.plan_id,
        price_difference_cents: priceDifference
      }
    })
    .eq('id', data.subscription_id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to change plan: ${updateError.message}`)
  }

  // If upgrade and prorated amount is positive, create a payment for the difference
  let prorationPayment = null
  if (priceDifference > 0) {
    const paymentReference = `UPGRADE_${subscription.id.slice(-8)}_${Date.now()}`
    
    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .insert({
        organization_id: subscription.organization_id,
        subscription_id: subscription.id,
        payment_reference: paymentReference,
        amount_cents: priceDifference,
        platform_fee_percentage: newPlan.platform_fee_percentage,
        payment_method: subscription.payment_method,
        billing_period_start: subscription.current_period_start,
        billing_period_end: subscription.current_period_end,
        status: 'pending'
      })
      .select()
      .single()

    if (!paymentError) {
      prorationPayment = payment
    }
  }

  console.log('✅ Subscription plan changed successfully')

  return {
    subscription_id: data.subscription_id,
    old_plan: currentPlan.name,
    new_plan: newPlan.name,
    price_difference_cents: priceDifference,
    proration_payment: prorationPayment,
    changed_at: new Date().toISOString()
  }
} 