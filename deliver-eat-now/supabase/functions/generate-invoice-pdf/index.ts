import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InvoiceData {
  payment_id: string
  subscription_id?: string
  custom_data?: {
    restaurant_name?: string
    plan_name?: string
    amount?: number
    platform_fee?: number
    net_amount?: number
    billing_period?: { start: string; end: string }
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📄 Starting invoice PDF generation')

    const requestData: InvoiceData = await req.json()
    
    if (!requestData.payment_id && !requestData.subscription_id) {
      throw new Error('Either payment_id or subscription_id is required')
    }

    // Get payment and subscription data
    let paymentData: any
    
    if (requestData.payment_id) {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select(`
          *,
          restaurant_subscriptions!inner (
            id,
            restaurant_id,
            current_period_start,
            current_period_end,
            subscription_plans_new:plan_id (
              name,
              name_pt,
              delivery_limit
            ),
            restaurants:restaurant_id (
              name,
              address,
              phone,
              email,
              owner_id,
              profiles:owner_id (
                full_name,
                email
              )
            ),
            organizations:organization_id (
              name,
              address,
              tax_id,
              logo_url
            )
          )
        `)
        .eq('id', requestData.payment_id)
        .single()

      if (error || !data) {
        throw new Error(`Payment not found: ${error?.message}`)
      }
      
      paymentData = data
    } else {
      // Handle subscription_id case if needed
      throw new Error('Direct subscription invoice generation not implemented yet')
    }

    console.log('💾 Retrieved payment data for invoice generation')

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(paymentData)
    
    // Prepare invoice data
    const invoiceData = {
      // Invoice metadata
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: paymentData.billing_period_end,
      
      // Company/Platform information
      platform: {
        name: paymentData.restaurant_subscriptions.organizations.name,
        address: paymentData.restaurant_subscriptions.organizations.address || 'Portugal',
        tax_id: paymentData.restaurant_subscriptions.organizations.tax_id || 'PT123456789',
        logo_url: paymentData.restaurant_subscriptions.organizations.logo_url
      },
      
      // Customer (Restaurant) information
      customer: {
        name: paymentData.restaurant_subscriptions.restaurants.name,
        contact_name: paymentData.restaurant_subscriptions.restaurants.profiles.full_name,
        address: paymentData.restaurant_subscriptions.restaurants.address,
        phone: paymentData.restaurant_subscriptions.restaurants.phone,
        email: paymentData.restaurant_subscriptions.restaurants.email
      },
      
      // Subscription/Service details
      service: {
        plan_name: paymentData.restaurant_subscriptions.subscription_plans_new.name_pt,
        billing_period: {
          start: paymentData.billing_period_start,
          end: paymentData.billing_period_end
        },
        delivery_limit: paymentData.restaurant_subscriptions.subscription_plans_new.delivery_limit
      },
      
      // Financial details
      financial: {
        subtotal_cents: paymentData.amount_cents,
        platform_fee_cents: paymentData.platform_fee_cents,
        platform_fee_percentage: paymentData.platform_fee_percentage,
        net_to_restaurant_cents: paymentData.net_to_restaurant_cents,
        currency: paymentData.currency || 'EUR',
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        paid_at: paymentData.paid_at
      }
    }

    // Generate HTML content
    const htmlContent = generateInvoiceHTML(invoiceData)
    
    // For now, we'll store the HTML content and return it
    // In production, you'd convert this to PDF using Puppeteer or similar
    
    // Store invoice in database
    const { data: storedInvoice, error: storeError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        payment_id: paymentData.id,
        subscription_id: paymentData.subscription_id,
        organization_id: paymentData.organization_id,
        restaurant_id: paymentData.restaurant_subscriptions.restaurant_id,
        amount_cents: paymentData.amount_cents,
        currency: paymentData.currency,
        status: 'generated',
        html_content: htmlContent,
        pdf_url: null, // Will be populated when PDF is generated
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (storeError) {
      console.error('Failed to store invoice:', storeError)
      throw new Error(`Failed to store invoice: ${storeError.message}`)
    }

    console.log(`✅ Invoice generated: ${invoiceNumber}`)

    // TODO: In production, generate actual PDF
    // const pdfBuffer = await generatePDF(htmlContent)
    // const pdfPath = `invoices/${invoiceNumber}.pdf`
    // await supabase.storage.from('documents').upload(pdfPath, pdfBuffer)

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: storedInvoice.id,
        invoice_number: invoiceNumber,
        html_content: htmlContent,
        // pdf_url: `${supabaseUrl}/storage/v1/object/public/documents/${pdfPath}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error generating invoice PDF:', error)
    
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
// INVOICE GENERATION FUNCTIONS
// ============================================================================

function generateInvoiceNumber(paymentData: any): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const sequence = paymentData.id.slice(-6).toUpperCase()
  
  return `INV-${year}${month}-${sequence}`
}

function generateInvoiceHTML(data: any): string {
  const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-PT')
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura ${data.invoice_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .invoice-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .invoice-header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .invoice-number {
            font-size: 1.2em;
            margin-top: 10px;
            opacity: 0.9;
        }
        .invoice-body {
            padding: 30px;
        }
        .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .col {
            flex: 1;
            padding: 0 15px;
        }
        .col:first-child {
            padding-left: 0;
        }
        .col:last-child {
            padding-right: 0;
        }
        .section-title {
            font-size: 1.1em;
            font-weight: bold;
            margin-bottom: 10px;
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
        }
        .info-block {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .service-details {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 20px 0;
        }
        .financial-summary {
            background: #f1f8e9;
            border: 1px solid #aed581;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .total-row {
            font-size: 1.3em;
            font-weight: bold;
            border-top: 2px solid #667eea;
            padding-top: 10px;
            margin-top: 15px;
        }
        .payment-info {
            background: #fff3e0;
            border: 1px solid #ffb74d;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .footer {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <h1>FATURA</h1>
            <div class="invoice-number">${data.invoice_number}</div>
            <div style="margin-top: 10px; font-size: 1em;">
                Data de Emissão: ${formatDate(data.issue_date)}
            </div>
        </div>
        
        <div class="invoice-body">
            <div class="row">
                <div class="col">
                    <div class="section-title">De</div>
                    <div class="info-block">
                        <strong>${data.platform.name}</strong><br>
                        ${data.platform.address}<br>
                        NIF: ${data.platform.tax_id}
                    </div>
                </div>
                
                <div class="col">
                    <div class="section-title">Para</div>
                    <div class="info-block">
                        <strong>${data.customer.name}</strong><br>
                        ${data.customer.contact_name}<br>
                        ${data.customer.address || 'Morada não especificada'}<br>
                        ${data.customer.phone || ''}<br>
                        ${data.customer.email}
                    </div>
                </div>
            </div>
            
            <div class="service-details">
                <div class="section-title">Detalhes do Serviço</div>
                <strong>Plano:</strong> ${data.service.plan_name}<br>
                <strong>Período de Faturação:</strong> ${formatDate(data.service.billing_period.start)} - ${formatDate(data.service.billing_period.end)}<br>
                <strong>Entregas Incluídas:</strong> ${data.service.delivery_limit} entregas
            </div>
            
            <div class="financial-summary">
                <div class="section-title">Resumo Financeiro</div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Valor da Assinatura:</span>
                    <span>${formatCurrency(data.financial.subtotal_cents)}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #666;">
                    <span>Taxa da Plataforma (${data.financial.platform_fee_percentage}%):</span>
                    <span>-${formatCurrency(data.financial.platform_fee_cents)}</span>
                </div>
                
                <div class="total-row" style="display: flex; justify-content: space-between;">
                    <span>Valor Líquido para Restaurante:</span>
                    <span>${formatCurrency(data.financial.net_to_restaurant_cents)}</span>
                </div>
            </div>
            
            <div class="payment-info">
                <div class="section-title">Informações de Pagamento</div>
                <strong>Método:</strong> ${data.financial.payment_method.toUpperCase()}<br>
                <strong>Referência:</strong> ${data.financial.payment_reference}<br>
                <strong>Data do Pagamento:</strong> ${data.financial.paid_at ? formatDate(data.financial.paid_at) : 'Pendente'}
            </div>
        </div>
        
        <div class="footer">
            <p>Esta fatura foi gerada automaticamente em ${formatDate(new Date().toISOString())}.</p>
            <p>Para questões relacionadas com esta fatura, contacte o nosso suporte.</p>
        </div>
    </div>
</body>
</html>`
}

// TODO: Implement PDF generation using Puppeteer
/*
async function generatePDF(htmlContent: string): Promise<Uint8Array> {
  // This would use Puppeteer to convert HTML to PDF
  // For now, this is a placeholder
  
  const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts')
  
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  
  await page.setContent(htmlContent)
  
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  })
  
  await browser.close()
  
  return pdfBuffer
}
*/ 