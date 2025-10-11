import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, device, autoConfirm = true, redirectUrl } = await req.json()

    console.log('🎯 Received signup request:', { email, device, autoConfirm, redirectUrl })

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
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

    // Get user info from request headers
    const userAgent = req.headers.get('user-agent') || ''
    const country = req.headers.get('cf-ipcountry') || 'PT'
    const ipAddress = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for') || 
                     'Hidden'

    // Determine device type
    let deviceType = device || 'Web'
    if (userAgent.includes('Android')) deviceType = 'Android'
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceType = 'iOS'

    // 🔥 ULTRA-SIMPLE: ALWAYS DIRECT APP SCHEME FOR ANDROID
    let useDirectRedirect = deviceType === 'Android'  // Direct only for Android
    let finalRedirectUrl = useDirectRedirect 
      ? 'saborportugues://login'  // ALWAYS use custom scheme for Android
      : 'https://comituga.eu/auth/confirm'  // Fallback for other devices
    
    console.log('🔥 ULTRA-SIMPLE MODE:', { deviceType, useDirectRedirect, finalRedirectUrl })

    // Step 1: Try to generate link for existing user first
    console.log('🔍 Attempting to generate link for existing user...')
    
    let userId: string
    let isReallyNewUser = false
    let confirmationUrl: string

    try {
      // First, try generating a magic link (works if user exists)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email.trim(),
        options: {
          redirectTo: finalRedirectUrl
        }
      })

      if (linkError) {
        console.log('⚠️ Magic link failed, user probably doesn\'t exist:', linkError.message)
        throw new Error('User not found')
      }

      console.log('✅ Found existing user, generated magic link')
      confirmationUrl = linkData.properties?.action_link || linkData.properties?.email_otp || ''
      isReallyNewUser = false

      // Get user ID for existing user
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === email.trim())
      userId = existingUser?.id || 'unknown'

    } catch (existingUserError) {
      console.log('🔥 User doesn\'t exist, creating new user...')
      
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'
      
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: tempPassword,
        email_confirm: autoConfirm,
        user_metadata: {
          email: email.trim(),
          device_type: deviceType,
          signup_method: 'email',
          temp_password: true
        }
      })

      if (signUpError) {
        console.error('❌ Error creating user:', signUpError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user',
            details: signUpError.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      userId = signUpData.user!.id
      isReallyNewUser = true
      console.log('✅ User created successfully:', userId)

      // Generate signup confirmation link for new user
      console.log('🔗 Generating signup confirmation link...')
      const { data: newUserLinkData, error: newUserLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email.trim(),
        options: {
          redirectTo: finalRedirectUrl
        }
      })

      if (newUserLinkError) {
        console.error('❌ Error generating link for new user:', newUserLinkError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate confirmation link',
            details: newUserLinkError.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      confirmationUrl = newUserLinkData.properties?.action_link || newUserLinkData.properties?.email_otp || ''
    }

    console.log('✅ Final confirmation URL generated:', !!confirmationUrl)

    // Debug: Log the actual confirmation URL
    console.log('🔍 DEBUG - Full confirmation URL:', confirmationUrl)

    // Platform-specific processing
    let platformLink: string;

    // 🔥 ULTRA-SIMPLE: Extract token and build appropriate link
    const token = confirmationUrl.split('token_hash=')[1]?.split('&')[0] || 
                  confirmationUrl.split('token=')[1]?.split('&')[0] || '';
    
    console.log('🔍 TOKEN EXTRACTION:', {
      hasTokenHash: confirmationUrl.includes('token_hash='),
      hasToken: confirmationUrl.includes('token='),
      extractedToken: token ? token.substring(0, 20) + '...' : 'EMPTY',
      tokenLength: token.length
    })

    if (useDirectRedirect && deviceType === 'Android') {
      // 🔥 ANDROID: Direct custom scheme link
      platformLink = `saborportugues://login?token=${token}&type=${isReallyNewUser ? 'signup' : 'magiclink'}`
      console.log('🔥 ANDROID DIRECT LINK:', platformLink.substring(0, 50) + '...')
    } else {
      // 🌐 OTHER DEVICES: Use web
      platformLink = confirmationUrl // Use original Supabase URL
      console.log('🌐 WEB FALLBACK LINK:', platformLink.substring(0, 50) + '...')
    }

    console.log('📱 Final platform link:', { deviceType, useDirectRedirect, platformLink: platformLink.substring(0, 80) + '...' });

    // Step 3: Send email via Brevo
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

    // Debug: Log the specific links that will be sent
    console.log('🔍 DEBUG - Email params being sent:', {
      CONFIRMATION_URL: platformLink,
      ANDROID_LINK: deviceType.toLowerCase() === 'android' ? platformLink : '',
      USE_DIRECT_REDIRECT: useDirectRedirect,
      REDIRECT_URL_RECEIVED: redirectUrl
    })

    // Android HTML template
    const androidHtmlTemplate = `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SaborPortuguês - Android</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-text {
            font-size: 24px;
            font-weight: 700;
            color: #FF6B35;
            margin-bottom: 20px;
            text-align: center;
        }
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: #555555;
        }
        .confirm-button {
            display: block;
            width: 100%;
            max-width: 300px;
            margin: 30px auto;
            padding: 18px 30px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: white;
            text-decoration: none;
            text-align: center;
            border-radius: 12px;
            font-weight: 700;
            font-size: 18px;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
            transition: transform 0.2s ease;
        }
        .confirm-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
        }
        .features {
            background-color: #fff9f6;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #FF6B35;
        }
        .features h3 {
            color: #FF6B35;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .feature-list li {
            padding: 8px 0;
            font-size: 15px;
            color: #666666;
        }
        .feature-list li:before {
            content: "✓";
            color: #FF6B35;
            margin-right: 10px;
            font-weight: bold;
        }
        .device-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-top: 40px;
            font-size: 13px;
            color: #888888;
        }
        .device-info p {
            margin: 5px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            font-size: 13px;
            color: #888888;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #FF6B35;
            text-decoration: none;
        }
        .android-icon {
            width: 60px;
            height: 60px;
            margin: 10px auto 20px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SaborPortuguês</div>
            <p class="subtitle">Sabores autênticos à distância de um clique</p>
        </div>
        <div class="content">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android Icon" class="android-icon">
            
            <div class="welcome-text">
                Confirma a tua conta Android 📱
            </div>

            <div class="message">
                <p>Olá {{USER_EMAIL}},</p>
                <p>Obrigado por escolheres o SaborPortuguês! Para completares o teu registo e começares a explorar os melhores restaurantes portugueses, por favor confirma a tua conta clicando no botão abaixo.</p>
            </div>

            <a href="{{CONFIRMATION_URL}}" class="confirm-button">
                Confirmar Agora
            </a>

            <div class="features">
                <h3>O que te espera no SaborPortuguês:</h3>
                <ul class="feature-list">
                    <li>Comida portuguesa autêntica dos melhores restaurantes</li>
                    <li>Entregas rápidas à tua porta</li>
                    <li>Menus exclusivos e promoções especiais</li>
                    <li>Interface simples e intuitiva para Android</li>
                </ul>
            </div>

            <div class="device-info">
                <p><strong>Informação do dispositivo:</strong></p>
                <p>Dispositivo: {{DEVICE_TYPE}}</p>
                <p>Localização: {{COUNTRY}}</p>
                <p>Data: {{TIMESTAMP}}</p>
                <p><small>Se não foste tu que tentaste criar esta conta, podes ignorar este email.</small></p>
            </div>
        </div>

        <div class="footer">
            <div class="social-links">
                <a href="https://facebook.com/">Facebook</a> | 
                <a href="https://instagram.com/">Instagram</a> | 
                <a href="https://comituga.eu">Website</a>
            </div>
            <p>&copy; 2025 SaborPortuguês - Todos os direitos reservados</p>
            <p><small>Email gerado automaticamente. Por favor não respondas.</small></p>
        </div>
    </div>
</body>
</html>`;

    // Replace placeholders in HTML
    const finalHtml = androidHtmlTemplate
      .replace(/{{USER_EMAIL}}/g, email.trim())
      .replace(/{{CONFIRMATION_URL}}/g, platformLink)
      .replace(/{{DEVICE_TYPE}}/g, deviceType)
      .replace(/{{COUNTRY}}/g, country)
      .replace(/{{TIMESTAMP}}/g, new Date().toLocaleString('pt-PT'));

    // Prepare email data for Brevo
    const emailData = {
      sender: {
        name: "SaborPortuguês",
        email: "noreply@comituga.eu"
      },
      to: [
        {
          email: email,
          name: email.split('@')[0]
        }
      ],
      htmlContent: finalHtml,
      subject: "Confirma a tua conta SaborPortuguês",
      // 🔥 FORCE DISABLE ALL TRACKING for deep links
      params: {
        "DISABLE_TRACKING": "1"
      },
      tags: ["no-tracking", "deep-link"],
      // Multiple ways to disable tracking
      disableUrlAccess: true,
      urlTags: false,
      headers: {
        "X-Mailin-custom": `user_id:${userId}|signup_type:${isReallyNewUser ? 'new' : 'existing'}|device:${deviceType}`,
        "X-No-Track": "true"
      }
    };

    console.log('📧 Sending email via Brevo:', {
      to: email,
      hasHtmlContent: !!finalHtml,
      hasConfirmationUrl: !!confirmationUrl
    })

    // Send email via Brevo
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
          error: 'Failed to send email',
          details: brevoResult
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Email sent successfully via Brevo:', brevoResult)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isReallyNewUser 
          ? 'User created and confirmation email sent' 
          : 'Login link sent successfully',
        userId: userId,
        messageId: brevoResult.messageId,
        isNewUser: isReallyNewUser,
        deviceType: deviceType,
        // 🔥 DEBUG INFO
        useDirectRedirect: useDirectRedirect,
        redirectUrl: redirectUrl,
        finalPlatformLink: platformLink.substring(0, 100) + '...',
        receivedRedirectUrl: !!redirectUrl
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error in send-signup-confirmation:', error)
    
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