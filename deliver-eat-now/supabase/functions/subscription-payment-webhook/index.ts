import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WebhookPayload {
  provider: 'ifthenpay' | 'eupago' | 'easypay' | 'sibs_direct'
  transaction_id: string
  payment_reference?: string
  status: 'paid' | 'failed' | 'cancelled'
  amount_cents?: number
  timestamp?: string
  [key: string]: any // Allow additional provider-specific fields
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Received payment webhook')
    
    const rawBody = await req.text()
    console.log('Raw webhook body:', rawBody)
    
    // Determine provider from URL path or headers
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const provider = pathParts[pathParts.length - 1] // e.g., /webhook/ifthenpay
    
    console.log(`📡 Processing webhook for provider: ${provider}`)
    
    let webhookData: WebhookPayload
    
    // Parse webhook based on provider
    switch (provider) {
      case 'ifthenpay':
        webhookData = parseIfThenPayWebhook(rawBody, req)
        break
      case 'eupago':
        webhookData = parseEuPagoWebhook(rawBody, req)
        break
      case 'easypay':
        webhookData = parseEasyPayWebhook(rawBody, req)
        break
      case 'sibs_direct':
        webhookData = parseSIBSDirectWebhook(rawBody, req)
        break
      default:
        // Try to parse as generic JSON
        webhookData = JSON.parse(rawBody)
        break
    }

    console.log('Parsed webhook data:', webhookData)

    // Validate webhook data
    if (!webhookData.transaction_id && !webhookData.payment_reference) {
      throw new Error('Missing transaction_id or payment_reference in webhook')
    }

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('subscription_payments')
      .select(`
        *,
        restaurant_subscriptions!inner (
          id,
          restaurant_id,
          organization_id,
          subscription_plans_new:plan_id (
            delivery_limit,
            name
          ),
          restaurants:restaurant_id (
            name,
            owner_id,
            profiles:owner_id (
              email,
              full_name
            )
          )
        )
      `)
      .or(`provider_transaction_id.eq.${webhookData.transaction_id},payment_reference.eq.${webhookData.payment_reference}`)
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError)
      throw new Error(`Payment not found for transaction: ${webhookData.transaction_id || webhookData.payment_reference}`)
    }

    console.log(`💳 Found payment: ${payment.id}`)

    // Process based on webhook status
    if (webhookData.status === 'paid') {
      await handlePaymentSuccess(payment, webhookData)
    } else if (webhookData.status === 'failed' || webhookData.status === 'cancelled') {
      await handlePaymentFailure(payment, webhookData)
    } else {
      console.log(`⏳ Payment status update: ${webhookData.status}`)
      // Update status for processing, pending, etc.
      await supabase
        .from('subscription_payments')
        .update({
          status: webhookData.status,
          provider_response: { ...payment.provider_response, webhook: webhookData }
        })
        .eq('id', payment.id)
    }

    // Always acknowledge webhook to prevent retries
    return new Response(
      JSON.stringify({ success: true, processed: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    
    // Still return 200 to prevent webhook retries for invalid data
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})

// ============================================================================
// WEBHOOK PARSERS FOR DIFFERENT PROVIDERS
// ============================================================================

function parseIfThenPayWebhook(body: string, req: Request): WebhookPayload {
  // IfThenPay typically sends form data or query parameters
  const url = new URL(req.url)
  const params = url.searchParams
  
  return {
    provider: 'ifthenpay',
    transaction_id: params.get('id') || params.get('transaction_id') || '',
    payment_reference: params.get('reference') || params.get('payment_reference') || '',
    status: params.get('status') === 'ok' ? 'paid' : 'failed',
    amount_cents: params.get('amount') ? Math.round(parseFloat(params.get('amount')!) * 100) : undefined,
    timestamp: params.get('timestamp') || new Date().toISOString(),
    raw_webhook: Object.fromEntries(params.entries())
  }
}

function parseEuPagoWebhook(body: string, req: Request): WebhookPayload {
  // EuPago sends JSON webhook
  const data = JSON.parse(body)
  
  return {
    provider: 'eupago',
    transaction_id: data.referencia || data.transaction_id,
    payment_reference: data.id || data.payment_reference,
    status: data.estado === 'ok' || data.status === 'paid' ? 'paid' : 'failed',
    amount_cents: data.valor ? Math.round(parseFloat(data.valor) * 100) : undefined,
    timestamp: data.timestamp || new Date().toISOString(),
    raw_webhook: data
  }
}

function parseEasyPayWebhook(body: string, req: Request): WebhookPayload {
  // EasyPay sends JSON webhook
  const data = JSON.parse(body)
  
  let status: 'paid' | 'failed' | 'cancelled' = 'failed'
  if (data.status === 'success' || data.status === 'paid') {
    status = 'paid'
  } else if (data.status === 'cancelled') {
    status = 'cancelled'
  }
  
  return {
    provider: 'easypay',
    transaction_id: data.id || data.transaction_id,
    payment_reference: data.order?.key || data.payment_reference,
    status,
    amount_cents: data.value ? Math.round(parseFloat(data.value) * 100) : undefined,
    timestamp: data.created_at || new Date().toISOString(),
    raw_webhook: data
  }
}

function parseSIBSDirectWebhook(body: string, req: Request): WebhookPayload {
  // SIBS Direct webhook format (to be implemented based on actual API)
  const data = JSON.parse(body)
  
  return {
    provider: 'sibs_direct',
    transaction_id: data.transaction_id || data.id,
    payment_reference: data.reference || data.payment_reference,
    status: data.status === 'completed' ? 'paid' : 'failed',
    amount_cents: data.amount_cents || (data.amount ? Math.round(data.amount * 100) : undefined),
    timestamp: data.timestamp || new Date().toISOString(),
    raw_webhook: data
  }
}

// ============================================================================
// PAYMENT PROCESSING
// ============================================================================

async function handlePaymentSuccess(payment: any, webhookData: WebhookPayload) {
  console.log('✅ Processing successful payment')
  
  const subscription = payment.restaurant_subscriptions
  
  try {
    // Start transaction by confirming payment
    const { error: confirmError } = await supabase.rpc('confirm_subscription_payment', {
      p_payment_reference: payment.payment_reference,
      p_provider_transaction_id: webhookData.transaction_id,
      p_provider_response: webhookData
    })

    if (confirmError) {
      throw new Error(`Failed to confirm payment: ${confirmError.message}`)
    }

    console.log(`🎉 Subscription activated: ${subscription.id}`)

    // Send confirmation email to restaurant owner
    await sendPaymentConfirmationEmail(subscription, payment, webhookData)
    
    // Generate invoice PDF
    await generateInvoicePDF(subscription, payment)
    
    // Log success
    await supabase
      .from('payment_audit_log')
      .insert({
        payment_id: payment.id,
        action: 'webhook_payment_success',
        new_values: {
          webhook_provider: webhookData.provider,
          transaction_id: webhookData.transaction_id,
          processed_at: new Date().toISOString()
        }
      })

  } catch (error) {
    console.error('Error in payment success handler:', error)
    
    // Log the error
    await supabase
      .from('payment_audit_log')
      .insert({
        payment_id: payment.id,
        action: 'webhook_payment_error',
        new_values: {
          error: error.message,
          webhook_data: webhookData
        }
      })
    
    throw error
  }
}

async function handlePaymentFailure(payment: any, webhookData: WebhookPayload) {
  console.log('❌ Processing failed payment')
  
  try {
    // Update payment status
    await supabase
      .from('subscription_payments')
      .update({
        status: webhookData.status,
        failed_at: new Date().toISOString(),
        failure_reason: webhookData.raw_webhook?.error || 'Payment failed',
        provider_response: { ...payment.provider_response, webhook: webhookData }
      })
      .eq('id', payment.id)

    // Update subscription status
    await supabase
      .from('restaurant_subscriptions')
      .update({
        status: 'pending_payment'
      })
      .eq('id', payment.restaurant_subscriptions.id)

    // Send failure notification email
    await sendPaymentFailureEmail(payment.restaurant_subscriptions, payment, webhookData)
    
    // Log failure
    await supabase
      .from('payment_audit_log')
      .insert({
        payment_id: payment.id,
        action: 'webhook_payment_failed',
        new_values: {
          webhook_provider: webhookData.provider,
          failure_reason: webhookData.raw_webhook?.error || 'Payment failed'
        }
      })

  } catch (error) {
    console.error('Error in payment failure handler:', error)
    throw error
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

async function sendPaymentConfirmationEmail(subscription: any, payment: any, webhookData: WebhookPayload) {
  console.log('📧 Sending payment confirmation email')
  
  const emailData = {
    to: subscription.restaurants.profiles.email,
    subject: 'Pagamento Confirmado - Assinatura Ativada',
    html: `
      <h2>Pagamento Confirmado</h2>
      <p>Olá ${subscription.restaurants.profiles.full_name},</p>
      <p>O pagamento da sua assinatura foi confirmado com sucesso!</p>
      
      <h3>Detalhes:</h3>
      <ul>
        <li><strong>Plano:</strong> ${subscription.subscription_plans_new.name}</li>
        <li><strong>Valor:</strong> €${(payment.amount_cents / 100).toFixed(2)}</li>
        <li><strong>Método:</strong> MB WAY</li>
        <li><strong>Referência:</strong> ${payment.payment_reference}</li>
        <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-PT')}</li>
      </ul>
      
      <p>A sua assinatura está agora ativa e as entregas foram programadas.</p>
      
      <p>Obrigado por escolher a nossa plataforma!</p>
    `
  }

  // In production, integrate with email service like Resend, SendGrid, etc.
  console.log('Email data prepared:', emailData)
}

async function sendPaymentFailureEmail(subscription: any, payment: any, webhookData: WebhookPayload) {
  console.log('📧 Sending payment failure email')
  
  const emailData = {
    to: subscription.restaurants.profiles.email,
    subject: 'Falha no Pagamento - Ação Necessária',
    html: `
      <h2>Falha no Pagamento</h2>
      <p>Olá ${subscription.restaurants.profiles.full_name},</p>
      <p>Infelizmente, o pagamento da sua assinatura não foi processado com sucesso.</p>
      
      <h3>Detalhes:</h3>
      <ul>
        <li><strong>Valor:</strong> €${(payment.amount_cents / 100).toFixed(2)}</li>
        <li><strong>Referência:</strong> ${payment.payment_reference}</li>
        <li><strong>Motivo:</strong> ${webhookData.raw_webhook?.error || 'Erro no processamento'}</li>
      </ul>
      
      <p>Por favor, tente novamente ou contacte o suporte.</p>
    `
  }

  console.log('Failure email data prepared:', emailData)
}

async function generateInvoicePDF(subscription: any, payment: any) {
  console.log('📄 Generating invoice PDF')
  
  // This would integrate with PDF generation service
  // For now, just log the invoice data
  const invoiceData = {
    subscription_id: subscription.id,
    payment_id: payment.id,
    restaurant_name: subscription.restaurants.name,
    plan_name: subscription.subscription_plans_new.name,
    amount: payment.amount_cents / 100,
    platform_fee: payment.platform_fee_cents / 100,
    net_amount: payment.net_to_restaurant_cents / 100,
    billing_period: {
      start: payment.billing_period_start,
      end: payment.billing_period_end
    },
    generated_at: new Date().toISOString()
  }

  console.log('Invoice data prepared:', invoiceData)
  
  // In production, generate PDF and store in Supabase Storage
  // await supabase.functions.invoke('generate-invoice-pdf', { body: invoiceData })
} 