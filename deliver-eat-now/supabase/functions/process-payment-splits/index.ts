import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentSplit {
  id: string
  order_id: string
  restaurant_id: string
  organization_id: string
  super_admin_id: string
  driver_id: string
  total_order_amount: number
  restaurant_amount: number
  super_admin_amount: number
  platform_owner_amount: number
  driver_amount: number
  payment_cycle: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const requestData = await req.json()
    const { action, payment_cycle, batch_name } = requestData

    console.log(`🔧 Processing payment splits - Action: ${action}`)

    switch (action) {
      case 'create_batch':
        return await createPaymentBatch(supabaseClient, payment_cycle, batch_name)
      
      case 'process_batch':
        return await processPaymentBatch(supabaseClient, requestData.batch_id)
      
      case 'get_pending_splits':
        return await getPendingSplits(supabaseClient, payment_cycle)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('❌ Error processing payment splits:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function createPaymentBatch(supabaseClient: any, paymentCycle: string, batchName?: string) {
  try {
    // Get pending payment splits for the cycle
    const { data: pendingSplits, error: splitsError } = await supabaseClient
      .from('payment_splits')
      .select('*')
      .eq('payment_cycle', paymentCycle)
      .eq('is_paid', false)

    if (splitsError) throw splitsError

    if (!pendingSplits || pendingSplits.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending splits found for this cycle',
          success: true,
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate totals
    const totalAmount = pendingSplits.reduce((sum: number, split: PaymentSplit) => 
      sum + split.total_order_amount, 0
    )

    // Create period dates
    const periodEnd = new Date()
    const periodStart = new Date()
    
    switch (paymentCycle) {
      case 'semanal':
        periodStart.setDate(periodEnd.getDate() - 7)
        break
      case 'quinzenal':
        periodStart.setDate(periodEnd.getDate() - 14)
        break
      case 'mensal':
        periodStart.setMonth(periodEnd.getMonth() - 1)
        break
    }

    // Create payment batch
    const { data: batch, error: batchError } = await supabaseClient
      .from('payment_batches')
      .insert({
        batch_name: batchName || `Batch ${paymentCycle} ${periodEnd.toISOString().split('T')[0]}`,
        payment_cycle: paymentCycle,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        total_amount: totalAmount,
        total_splits: pendingSplits.length,
        status: 'pending'
      })
      .select()
      .single()

    if (batchError) throw batchError

    // Update splits with batch ID
    const { error: updateError } = await supabaseClient
      .from('payment_splits')
      .update({ payment_batch_id: batch.id })
      .in('id', pendingSplits.map((split: PaymentSplit) => split.id))

    if (updateError) throw updateError

    console.log(`✅ Payment batch created: ${batch.id} with ${pendingSplits.length} splits`)

    return new Response(
      JSON.stringify({ 
        success: true,
        batch: batch,
        splits_count: pendingSplits.length,
        total_amount: totalAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error creating payment batch:', error)
    throw error
  }
}

async function processPaymentBatch(supabaseClient: any, batchId: string) {
  try {
    // Get batch details
    const { data: batch, error: batchError } = await supabaseClient
      .from('payment_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError) throw batchError

    // Get all splits in this batch
    const { data: splits, error: splitsError } = await supabaseClient
      .from('payment_splits')
      .select(`
        *,
        restaurants(name, owner_id),
        organizations(name)
      `)
      .eq('payment_batch_id', batchId)

    if (splitsError) throw splitsError

    // Group payments by recipient
    const paymentSummary = {
      restaurants: new Map(),
      super_admins: new Map(),
      drivers: new Map(),
      platform_total: 0
    }

    splits.forEach((split: any) => {
      // Restaurant payments
      if (split.restaurant_amount > 0) {
        const restaurantId = split.restaurant_id
        const current = paymentSummary.restaurants.get(restaurantId) || 0
        paymentSummary.restaurants.set(restaurantId, current + split.restaurant_amount)
      }

      // Super admin payments
      if (split.super_admin_amount > 0 && split.super_admin_id) {
        const adminId = split.super_admin_id
        const current = paymentSummary.super_admins.get(adminId) || 0
        paymentSummary.super_admins.set(adminId, current + split.super_admin_amount)
      }

      // Driver payments
      if (split.driver_amount > 0 && split.driver_id) {
        const driverId = split.driver_id
        const current = paymentSummary.drivers.get(driverId) || 0
        paymentSummary.drivers.set(driverId, current + split.driver_amount)
      }

      // Platform total
      paymentSummary.platform_total += split.platform_owner_amount
    })

    // Mark batch as processing
    await supabaseClient
      .from('payment_batches')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', batchId)

    // Mark all splits as paid
    await supabaseClient
      .from('payment_splits')
      .update({ 
        is_paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('payment_batch_id', batchId)

    // Mark batch as completed
    await supabaseClient
      .from('payment_batches')
      .update({ status: 'completed' })
      .eq('id', batchId)

    console.log(`✅ Payment batch processed: ${batchId}`)
    console.log(`💰 Platform total: €${paymentSummary.platform_total}`)
    console.log(`🏪 Restaurants: ${paymentSummary.restaurants.size}`)
    console.log(`🧭 Super Admins: ${paymentSummary.super_admins.size}`)
    console.log(`🚗 Drivers: ${paymentSummary.drivers.size}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        batch_id: batchId,
        summary: {
          platform_total: paymentSummary.platform_total,
          restaurants_count: paymentSummary.restaurants.size,
          super_admins_count: paymentSummary.super_admins.size,
          drivers_count: paymentSummary.drivers.size,
          restaurants: Object.fromEntries(paymentSummary.restaurants),
          super_admins: Object.fromEntries(paymentSummary.super_admins),
          drivers: Object.fromEntries(paymentSummary.drivers)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Mark batch as failed
    await supabaseClient
      .from('payment_batches')
      .update({ status: 'failed' })
      .eq('id', batchId)

    console.error('❌ Error processing payment batch:', error)
    throw error
  }
}

async function getPendingSplits(supabaseClient: any, paymentCycle?: string) {
  try {
    let query = supabaseClient
      .from('payment_splits')
      .select(`
        *,
        restaurants(name),
        organizations(name)
      `)
      .eq('is_paid', false)
      .order('created_at', { ascending: false })

    if (paymentCycle) {
      query = query.eq('payment_cycle', paymentCycle)
    }

    const { data: splits, error } = await query

    if (error) throw error

    // Calculate totals
    const totals = splits.reduce((acc: any, split: any) => {
      acc.total_amount += split.total_order_amount
      acc.restaurant_amount += split.restaurant_amount
      acc.super_admin_amount += split.super_admin_amount
      acc.platform_amount += split.platform_owner_amount
      acc.driver_amount += split.driver_amount
      return acc
    }, {
      total_amount: 0,
      restaurant_amount: 0,
      super_admin_amount: 0,
      platform_amount: 0,
      driver_amount: 0
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        splits: splits,
        count: splits.length,
        totals: totals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error getting pending splits:', error)
    throw error
  }
}

console.log("🚀 Payment splits processor function started") 