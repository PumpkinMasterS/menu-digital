import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Starting daily delivery generation...')
    
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    console.log(`📅 Processing deliveries for ${todayString} (${dayOfWeek})`)

    // Get all active subscriptions that should deliver today
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans!inner(
          id,
          delivery_days,
          restaurants(id, name)
        )
      `)
      .eq('status', 'active')
      .lte('start_date', todayString)
      .or(`end_date.is.null,end_date.gte.${todayString}`)

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`)
    }

    // Filter subscriptions that should deliver today
    const todaySubscriptions = subscriptions?.filter(sub => {
      const deliveryDays = sub.subscription_plans?.delivery_days || []
      return deliveryDays.includes(dayOfWeek)
    }) || []

    console.log(`📦 Found ${todaySubscriptions.length} subscriptions for today`)

    // Check which subscriptions already have deliveries scheduled for today
    const subscriptionIds = todaySubscriptions.map(sub => sub.id)
    
    if (subscriptionIds.length === 0) {
      console.log('✅ No subscriptions to process today')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No subscriptions to process today',
          deliveries_created: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const { data: existingDeliveries, error: existingError } = await supabase
      .from('subscription_deliveries')
      .select('subscription_id')
      .in('subscription_id', subscriptionIds)
      .eq('scheduled_date', todayString)

    if (existingError) {
      throw new Error(`Failed to check existing deliveries: ${existingError.message}`)
    }

    const existingSubscriptionIds = new Set(
      existingDeliveries?.map(delivery => delivery.subscription_id) || []
    )

    // Create deliveries for subscriptions that don't have one for today
    const newDeliveries = todaySubscriptions
      .filter(sub => !existingSubscriptionIds.has(sub.id))
      .map(sub => ({
        subscription_id: sub.id,
        scheduled_date: todayString,
        delivery_status: 'pending' as const
      }))

    if (newDeliveries.length === 0) {
      console.log('✅ All deliveries for today are already scheduled')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All deliveries for today are already scheduled',
          deliveries_created: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Insert new deliveries
    const { data: createdDeliveries, error: insertError } = await supabase
      .from('subscription_deliveries')
      .insert(newDeliveries)
      .select()

    if (insertError) {
      throw new Error(`Failed to create deliveries: ${insertError.message}`)
    }

    console.log(`✅ Created ${createdDeliveries?.length || 0} new deliveries`)

    // Optional: Send notifications to restaurants about upcoming deliveries
    const restaurantDeliveries = new Map()
    
    for (const subscription of todaySubscriptions.filter(sub => !existingSubscriptionIds.has(sub.id))) {
      const restaurantId = subscription.subscription_plans?.restaurants?.id
      const restaurantName = subscription.subscription_plans?.restaurants?.name
      
      if (!restaurantDeliveries.has(restaurantId)) {
        restaurantDeliveries.set(restaurantId, {
          name: restaurantName,
          count: 0
        })
      }
      
      restaurantDeliveries.get(restaurantId).count++
    }

    // Log notifications (in production, you'd send actual emails/notifications)
    for (const [restaurantId, info] of restaurantDeliveries) {
      console.log(`📧 Notification: ${info.name} has ${info.count} subscription deliveries today`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created ${createdDeliveries?.length || 0} deliveries for ${todayString}`,
        deliveries_created: createdDeliveries?.length || 0,
        date: todayString,
        day_of_week: dayOfWeek
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error generating daily deliveries:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 