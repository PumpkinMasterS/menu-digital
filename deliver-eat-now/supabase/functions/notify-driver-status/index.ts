import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { driverId, status, reason } = await req.json()

    // Validate input
    if (!driverId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: driverId, status' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Status must be "approved" or "rejected"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log(`📧 Processing driver ${status} notification for driver: ${driverId}`)

    // Get driver information
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        organizations!inner(name)
      `)
      .eq('id', driverId)
      .eq('role', 'driver')
      .single()

    if (driverError || !driver) {
      console.error('❌ Driver not found:', driverError)
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const organizationName = driver.organizations?.name || 'SaborPortuguês'

    // Send email via Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      console.error('❌ BREVO_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let emailData
    
    if (status === 'approved') {
      emailData = {
        sender: {
          name: "SaborPortuguês",
          email: "noreply@comituga.eu"
        },
        to: [
          {
            email: driver.email,
            name: driver.full_name
          }
        ],
        subject: `🎉 Parabéns! Sua conta de motorista foi aprovada - ${organizationName}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Conta Aprovada - SaborPortuguês</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 SaborPortuguês</h1>
              <p style="color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px;">Conta Aprovada!</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">Parabéns ${driver.full_name}! 🚗</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Sua conta de motorista foi <strong>aprovada</strong> pela administração do <strong>${organizationName}</strong>!
              </p>
              
              <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #15803d; margin-top: 0;">✅ Próximos passos:</h3>
                <ol style="color: #15803d; margin: 10px 0;">
                  <li>Abra o app SaborPortuguês Driver no seu celular</li>
                  <li>Faça login com suas credenciais</li>
                  <li>Ative seu status "Online" para receber entregas</li>
                  <li>Comece a ganhar dinheiro fazendo entregas!</li>
                </ol>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">📱 Lembrete importante:</h4>
                <p style="color: #92400e; margin: 5px 0;">
                  Certifique-se de que tem o app <strong>SaborPortuguês Driver</strong> instalado no seu dispositivo móvel.
                </p>
              </div>
              
              <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #475569; margin-top: 0;">💰 Como funciona:</h4>
                <ul style="color: #475569; margin: 10px 0;">
                  <li>Receba notificações de novas entregas</li>
                  <li>Aceite as entregas que desejar</li>
                  <li>Use o GPS integrado para navegação</li>
                  <li>Ganhe por cada entrega realizada</li>
                </ul>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #64748b; text-align: center;">
                Bem-vindo à equipe ${organizationName}!<br>
                Estamos ansiosos para trabalhar contigo.
              </p>
              
              <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
                © 2024 SaborPortuguês - Plataforma de Entregas
              </p>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Parabéns ${driver.full_name}!
          
          Sua conta de motorista foi aprovada pela administração do ${organizationName}!
          
          Próximos passos:
          1. Abra o app SaborPortuguês Driver
          2. Faça login com suas credenciais
          3. Ative seu status "Online"
          4. Comece a receber entregas!
          
          Bem-vindo à equipe ${organizationName}!
          
          © 2024 SaborPortuguês
        `
      }
    } else {
      // Status = rejected
      emailData = {
        sender: {
          name: "SaborPortuguês",
          email: "noreply@comituga.eu"
        },
        to: [
          {
            email: driver.email,
            name: driver.full_name
          }
        ],
        subject: `❌ Atualização sobre sua candidatura - ${organizationName}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Candidatura Rejeitada - SaborPortuguês</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📧 SaborPortuguês</h1>
              <p style="color: #fef2f2; margin: 10px 0 0 0; font-size: 16px;">Atualização da Candidatura</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b; margin-top: 0;">Olá ${driver.full_name},</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Agradecemos o seu interesse em juntar-se à nossa equipe de motoristas no <strong>${organizationName}</strong>.
              </p>
              
              <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">❌ Candidatura não aprovada</h3>
                <p style="color: #dc2626; margin: 10px 0;">
                  Infelizmente, neste momento não podemos aprovar a sua candidatura.
                </p>
                ${reason ? `
                  <p style="color: #dc2626; margin: 10px 0;">
                    <strong>Motivo:</strong> ${reason}
                  </p>
                ` : ''}
              </div>
              
              <div style="background: #f0f9ff; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #0c4a6e; margin-top: 0;">💡 Próximos passos:</h4>
                <ul style="color: #0c4a6e; margin: 10px 0;">
                  <li>Pode candidatar-se novamente no futuro</li>
                  <li>Certifique-se de que cumpre todos os requisitos</li>
                  <li>Entre em contato connosco se tiver dúvidas</li>
                </ul>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #64748b; text-align: center;">
                Obrigado pelo seu interesse no SaborPortuguês.<br>
                Desejamos-lhe muito sucesso nos seus projetos futuros.
              </p>
              
              <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
                © 2024 SaborPortuguês - Plataforma de Entregas
              </p>
            </div>
          </body>
          </html>
        `,
        textContent: `
          Olá ${driver.full_name},
          
          Agradecemos o seu interesse em juntar-se à nossa equipa de motoristas no ${organizationName}.
          
          Infelizmente, neste momento não podemos aprovar a sua candidatura.
          ${reason ? `\nMotivo: ${reason}` : ''}
          
          Próximos passos:
          - Pode candidatar-se novamente no futuro
          - Certifique-se de que cumpre todos os requisitos
          - Entre em contato connosco se tiver dúvidas
          
          Obrigado pelo seu interesse no SaborPortuguês.
          
          © 2024 SaborPortuguês
        `
      }
    }

    console.log(`📧 Sending ${status} notification email via Brevo...`)
    
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(emailData)
    })

    const brevoResult = await brevoResponse.json()
    
    if (!brevoResponse.ok) {
      console.error('❌ Brevo API error:', brevoResult)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send notification email',
          details: brevoResult
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`✅ ${status} notification email sent successfully:`, brevoResult)

    // Send push notification if driver has tokens
    try {
      const { data: pushTokens } = await supabaseAdmin
        .from('driver_push_tokens')
        .select('push_token')
        .eq('driver_id', driverId)
        .eq('is_active', true)

      if (pushTokens && pushTokens.length > 0) {
        const pushTitle = status === 'approved' 
          ? '🎉 Conta Aprovada!' 
          : '📧 Atualização da Candidatura'
        
        const pushBody = status === 'approved'
          ? 'Sua conta foi aprovada! Pode começar a receber entregas.'
          : 'Sua candidatura foi revista. Verifique seu email para detalhes.'

        // Send push notification via separate function
        await supabaseAdmin.functions.invoke('send-push-notification', {
          body: {
            driverId: driverId,
            title: pushTitle,
            body: pushBody,
            type: status === 'approved' ? 'account_approved' : 'account_rejected'
          }
        })

        console.log('✅ Push notification sent')
      }
    } catch (pushError) {
      console.error('⚠️ Warning: Could not send push notification:', pushError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Driver ${status} notification sent successfully`,
        messageId: brevoResult.messageId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in notify-driver-status:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})