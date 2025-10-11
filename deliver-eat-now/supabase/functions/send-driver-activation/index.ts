import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      email, 
      driverName, 
      organizationName, 
      tempPassword,
      userId 
    } = await req.json()

    console.log('🚗 Received driver activation request:', { email, driverName, organizationName, userId })

    if (!email || !driverName || !organizationName || !tempPassword || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, driverName, organizationName, tempPassword, userId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Generate activation link
    console.log('🔗 Generating driver activation link...')
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email.trim(),
      options: {
        redirectTo: 'saborportugues://driver-activation'
      }
    })

    if (linkError) {
      console.error('❌ Error generating activation link:', linkError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate activation link',
          details: linkError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const confirmationUrl = linkData.properties?.action_link || ''
    const token = confirmationUrl.split('token_hash=')[1]?.split('&')[0] || 
                  confirmationUrl.split('token=')[1]?.split('&')[0] || ''

    // Create driver activation link
    const driverActivationLink = `saborportugues://driver-activation?token=${token}&email=${encodeURIComponent(email)}`

    console.log('✅ Driver activation link generated')

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

    const emailData = {
      sender: {
        name: "SaborPortuguês",
        email: "noreply@comituga.eu"
      },
      to: [
        {
          email: email.trim(),
          name: driverName
        }
      ],
      subject: `🚗 Bem-vindo à equipe ${organizationName} - Ative sua conta de motorista`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ativação de Conta - Motorista SaborPortuguês</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚗 SaborPortuguês</h1>
            <p style="color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px;">Plataforma de Entregas</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá ${driverName}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Você foi registrado como <strong>motorista</strong> na plataforma SaborPortuguês para a organização <strong>${organizationName}</strong>.
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">📱 Como ativar sua conta:</h3>
              <ol style="color: #92400e; margin: 10px 0;">
                <li>Baixe o app <strong>SaborPortuguês Driver</strong> no seu celular</li>
                <li>Clique no botão abaixo para ativar sua conta</li>
                <li>Defina sua nova senha no app</li>
                <li>Comece a receber entregas!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${driverActivationLink}" 
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                🚗 Ativar Conta de Motorista
              </a>
            </div>
            
            <div style="background: #e0f2fe; border: 1px solid #0284c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #0c4a6e; margin-top: 0;">📋 Seus dados de acesso:</h4>
              <p style="color: #0c4a6e; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="color: #0c4a6e; margin: 5px 0;"><strong>Senha temporária:</strong> ${tempPassword}</p>
              <p style="color: #0c4a6e; margin: 5px 0; font-size: 14px;"><em>⚠️ Altere sua senha após o primeiro login</em></p>
            </div>
            
            <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #475569; margin-top: 0;">🔒 Segurança:</h4>
              <ul style="color: #475569; margin: 10px 0;">
                <li>Você só terá acesso às entregas da sua região (${organizationName})</li>
                <li>Seus dados estão protegidos e criptografados</li>
                <li>Em caso de problemas, entre em contato com o administrador</li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #64748b; text-align: center;">
              Se você não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
              <span style="word-break: break-all; color: #0284c7;">${driverActivationLink}</span>
            </p>
            
            <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
              Este email foi enviado automaticamente. Não responda a este email.<br>
              © 2024 SaborPortuguês - Plataforma de Entregas
            </p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Olá ${driverName}!
        
        Você foi registrado como motorista na plataforma SaborPortuguês para a organização ${organizationName}.
        
        Para ativar sua conta:
        1. Baixe o app SaborPortuguês Driver
        2. Use este link: ${driverActivationLink}
        3. Defina sua nova senha
        
        Seus dados de acesso:
        Email: ${email}
        Senha temporária: ${tempPassword}
        
        ⚠️ Altere sua senha após o primeiro login
        
        Você só terá acesso às entregas da sua região (${organizationName}).
        
        © 2024 SaborPortuguês
      `
    }

    console.log('📧 Sending driver activation email via Brevo...')
    
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
          error: 'Failed to send activation email',
          details: brevoResult
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Driver activation email sent successfully:', brevoResult)

    // Update driver profile to mark activation email as sent
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        activation_email_sent: true,
        activation_email_sent_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('⚠️ Warning: Could not update activation email status:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Driver activation email sent successfully',
        messageId: brevoResult.messageId,
        activationLink: driverActivationLink
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in send-driver-activation:', error)
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