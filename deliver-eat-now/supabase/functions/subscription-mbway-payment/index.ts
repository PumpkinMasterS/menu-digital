import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MBWayPaymentRequest {
  subscription_id: string
  payment_phone: string
  provider: 'ifthenpay' | 'eupago' | 'easypay' | 'sibs_direct'
  amount_cents?: number // Optional override
  metadata?: Record<string, any>
}

interface ProviderConfig {
  ifthenpay: {
    api_key: string
    entity: string
    sub_entity: string
  }
  eupago: {
    api_key: string
    channel_key: string
  }
  easypay: {
    account_id: string
    api_key: string
  }
  sibs_direct: {
    api_key: string
    terminal_id: string
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Provider configurations from environment
const getProviderConfig = (): ProviderConfig => ({
  ifthenpay: {
    api_key: Deno.env.get('IFTHENPAY_API_KEY') || '',
    entity: Deno.env.get('IFTHENPAY_ENTITY') || '',
    sub_entity: Deno.env.get('IFTHENPAY_SUB_ENTITY') || ''
  },
  eupago: {
    api_key: Deno.env.get('EUPAGO_API_KEY') || '',
    channel_key: Deno.env.get('EUPAGO_CHANNEL_KEY') || ''
  },
  easypay: {
    account_id: Deno.env.get('EASYPAY_ACCOUNT_ID') || '',
    api_key: Deno.env.get('EASYPAY_API_KEY') || ''
  },
  sibs_direct: {
    api_key: Deno.env.get('SIBS_API_KEY') || '',
    terminal_id: Deno.env.get('SIBS_TERMINAL_ID') || ''
  }
})

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Processing MB WAY subscription payment request')

    const requestData: MBWayPaymentRequest = await req.json()
    
    // Validate required fields
    if (!requestData.subscription_id || !requestData.payment_phone || !requestData.provider) {
      throw new Error('Missing required fields: subscription_id, payment_phone, or provider')
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('restaurant_subscriptions')
      .select(`
        *,
        subscription_plans_new:plan_id (
          price_cents,
          platform_fee_percentage,
          name,
          billing_cycle_days
        ),
        restaurants:restaurant_id (
          name,
          owner_id
        )
      `)
      .eq('id', requestData.subscription_id)
      .single()

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subError?.message}`)
    }

    const plan = subscription.subscription_plans_new
    const amount_cents = requestData.amount_cents || plan.price_cents

    // Generate unique payment reference
    const timestamp = Date.now().toString()
    const paymentReference = `SUB_${subscription.id.slice(-8)}_${timestamp}`

    // Calculate billing period
    const currentPeriodStart = new Date()
    const currentPeriodEnd = new Date()
    currentPeriodEnd.setDate(currentPeriodStart.getDate() + plan.billing_cycle_days)

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .insert({
        organization_id: subscription.organization_id,
        subscription_id: subscription.id,
        payment_reference: paymentReference,
        amount_cents,
        platform_fee_percentage: plan.platform_fee_percentage,
        payment_method: `mbway_${requestData.provider}`,
        provider_name: requestData.provider,
        billing_period_start: currentPeriodStart.toISOString().split('T')[0],
        billing_period_end: currentPeriodEnd.toISOString().split('T')[0],
        status: 'pending'
      })
      .select()
      .single()

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`)
    }

    console.log(`💰 Payment record created: ${payment.id}`)

    // Process payment with selected provider
    let providerResponse: any
    
    switch (requestData.provider) {
      case 'ifthenpay':
        providerResponse = await processIfThenPayMBWay(
          requestData.payment_phone,
          amount_cents,
          paymentReference,
          subscription.restaurants.name
        )
        break
        
      case 'eupago':
        providerResponse = await processEuPagoMBWay(
          requestData.payment_phone,
          amount_cents,
          paymentReference,
          subscription.restaurants.name
        )
        break
        
      case 'easypay':
        providerResponse = await processEasyPayMBWay(
          requestData.payment_phone,
          amount_cents,
          paymentReference,
          subscription.restaurants.name
        )
        break
        
      case 'sibs_direct':
        providerResponse = await processSIBSDirectMBWay(
          requestData.payment_phone,
          amount_cents,
          paymentReference,
          subscription.restaurants.name
        )
        break
        
      default:
        throw new Error(`Unsupported provider: ${requestData.provider}`)
    }

    // Update payment with provider response
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        provider_transaction_id: providerResponse.transaction_id,
        provider_response: providerResponse,
        status: providerResponse.status || 'processing'
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Failed to update payment with provider response:', updateError)
    }

    // Update subscription with payment phone
    await supabase
      .from('restaurant_subscriptions')
      .update({
        payment_phone: requestData.payment_phone,
        current_period_start: currentPeriodStart.toISOString().split('T')[0],
        current_period_end: currentPeriodEnd.toISOString().split('T')[0],
        next_billing_date: currentPeriodEnd.toISOString().split('T')[0]
      })
      .eq('id', subscription.id)

    console.log('✅ MB WAY payment initiated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        payment_reference: paymentReference,
        amount_cents,
        amount_euros: (amount_cents / 100).toFixed(2),
        provider: requestData.provider,
        provider_response: providerResponse,
        instructions: generatePaymentInstructions(requestData.provider, providerResponse)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error processing MB WAY payment:', error)
    
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
// PROVIDER INTEGRATIONS
// ============================================================================

async function processIfThenPayMBWay(
  phone: string,
  amount_cents: number,
  reference: string,
  description: string
): Promise<any> {
  const config = getProviderConfig().ifthenpay
  
  const payload = {
    mbWayKey: config.api_key,
    phone: phone.replace(/\s+/g, ''), // Remove spaces
    amount: (amount_cents / 100).toFixed(2),
    description: description.substring(0, 50), // Limit description
    id: reference
  }

  console.log('📱 Initiating IfThenPay MB WAY payment:', { phone, amount_cents, reference })

  const response = await fetch('https://ifthenpay.com/api/mbway/set/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`IfThenPay API error: ${result.message || 'Unknown error'}`)
  }

  return {
    provider: 'ifthenpay',
    transaction_id: result.RequestId || reference,
    status: result.Status === 'Success' ? 'processing' : 'failed',
    raw_response: result
  }
}

async function processEuPagoMBWay(
  phone: string,
  amount_cents: number,
  reference: string,
  description: string
): Promise<any> {
  const config = getProviderConfig().eupago
  
  const payload = {
    chave: config.api_key,
    meio_pagamento: 'mbway',
    valor: (amount_cents / 100).toFixed(2),
    id: reference,
    telemoval: phone.replace(/\s+/g, ''),
    descricao: description.substring(0, 100)
  }

  console.log('📱 Initiating EuPago MB WAY payment:', { phone, amount_cents, reference })

  const response = await fetch('https://clientes.eupago.pt/api/v1.02/pagamento/referencia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()
  
  if (!response.ok || result.estado !== 'ok') {
    throw new Error(`EuPago API error: ${result.msg || 'Unknown error'}`)
  }

  return {
    provider: 'eupago',
    transaction_id: result.referencia,
    status: 'processing',
    raw_response: result
  }
}

async function processEasyPayMBWay(
  phone: string,
  amount_cents: number,
  reference: string,
  description: string
): Promise<any> {
  const config = getProviderConfig().easypay
  
  const payload = {
    type: 'mb_way',
    payment: {
      methods: ['mb_way'],
      type: 'sale',
      capture: {
        descriptive: description.substring(0, 50)
      },
      currency: 'EUR',
      customer: {
        phone: phone.replace(/\s+/g, '')
      }
    },
    order: {
      key: reference,
      items: [{
        key: 'subscription',
        description: description,
        value: amount_cents / 100
      }]
    }
  }

  console.log('📱 Initiating EasyPay MB WAY payment:', { phone, amount_cents, reference })

  const response = await fetch(`https://api.prod.easypay.pt/2.0/${config.account_id}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AccountId': config.account_id,
      'ApiKey': config.api_key
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(`EasyPay API error: ${result.message || 'Unknown error'}`)
  }

  return {
    provider: 'easypay',
    transaction_id: result.id,
    status: 'processing',
    raw_response: result
  }
}

async function processSIBSDirectMBWay(
  phone: string,
  amount_cents: number,
  reference: string,
  description: string
): Promise<any> {
  const config = getProviderConfig().sibs_direct
  
  // This would be the direct SIBS API integration
  // Implementation would depend on SIBS API documentation
  
  console.log('📱 Initiating SIBS Direct MB WAY payment:', { phone, amount_cents, reference })
  
  // For now, return a mock response
  // In production, replace with actual SIBS API call
  return {
    provider: 'sibs_direct',
    transaction_id: `SIBS_${reference}`,
    status: 'processing',
    raw_response: {
      message: 'SIBS Direct integration pending implementation',
      reference: reference
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePaymentInstructions(provider: string, providerResponse: any): string {
  switch (provider) {
    case 'ifthenpay':
      return 'Verifique o seu telemóvel para confirmar o pagamento MB WAY'
    case 'eupago':
      return 'Irá receber uma notificação MB WAY no seu telemóvel'
    case 'easypay':
      return 'Confirme o pagamento MB WAY na aplicação do seu banco'
    case 'sibs_direct':
      return 'Pagamento MB WAY em processamento'
    default:
      return 'Confirme o pagamento MB WAY no seu dispositivo'
  }
} 