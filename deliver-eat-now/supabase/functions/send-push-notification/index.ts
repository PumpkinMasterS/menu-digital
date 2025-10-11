import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface NotificationRequest {
  driverId?: string
  driverIds?: string[]
  title: string
  body: string
  data?: Record<string, any>
  type: 'new_delivery' | 'delivery_update' | 'general' | 'account_approved' | 'account_rejected'
}

interface PushToken {
  push_token: string
  platform: string
}

Deno.serve(async (req: Request) => {
  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse do body da requisição
    const { driverId, driverIds, title, body, data, type }: NotificationRequest = await req.json()

    // Validar dados obrigatórios
    if (!title || !body || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body, type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar tokens de push
    let query = supabase
      .from('driver_push_tokens')
      .select('push_token, platform')
      .eq('is_active', true)

    if (driverId) {
      query = query.eq('driver_id', driverId)
    } else if (driverIds && driverIds.length > 0) {
      query = query.in('driver_id', driverIds)
    }

    const { data: tokens, error: tokensError } = await query

    if (tokensError) {
      console.error('Erro ao buscar tokens:', tokensError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active push tokens found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Preparar mensagens para Expo
    const messages = tokens.map((token: PushToken) => ({
      to: token.push_token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        type,
      },
      priority: 'high',
      channelId: 'default',
    }))

    // Enviar notificações via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const expoResult = await expoResponse.json()

    // Log dos resultados
    console.log('Notificações enviadas:', {
      totalTokens: tokens.length,
      messages: messages.length,
      expoResult,
    })

    // Verificar se houve erros no envio
    const errors = expoResult.data?.filter((result: any) => result.status === 'error') || []
    
    if (errors.length > 0) {
      console.error('Erros no envio:', errors)
      
      // Desativar tokens inválidos
      const invalidTokens = errors
        .filter((error: any) => error.details?.error === 'DeviceNotRegistered')
        .map((error: any) => error.details?.expoPushToken)
        .filter(Boolean)

      if (invalidTokens.length > 0) {
        await supabase
          .from('driver_push_tokens')
          .update({ is_active: false })
          .in('push_token', invalidTokens)
        
        console.log('Tokens inválidos desativados:', invalidTokens.length)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: messages.length,
        errors: errors.length,
        results: expoResult.data,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})