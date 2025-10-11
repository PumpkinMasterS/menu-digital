import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsStrict = (Deno.env.get('WHATSAPP_CORS_STRICT') || 'false') === 'true'
  const allowedOrigins = (Deno.env.get('WHATSAPP_ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  const allowOrigin = corsStrict ? (allowedOrigins.includes(origin) ? origin : 'null') : '*'
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
    ...(corsStrict ? { 'Vary': 'Origin' } : {})
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle WhatsApp webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      if (mode === 'subscribe' && token === whatsappToken) {
        console.log('WhatsApp webhook verified successfully')
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        })
      } else {
        return new Response('Verification failed', { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        })
      }
    }

    // Handle incoming WhatsApp messages (POST request)
    if (req.method === 'POST') {
      // Validações permissivas porém seguras: content-type e tamanho do corpo
      const validateContentType = (Deno.env.get('WHATSAPP_VALIDATE_CONTENT_TYPE') || 'true') === 'true'
      const maxBodyBytes = Number.parseInt(Deno.env.get('WHATSAPP_MAX_BODY_BYTES') || '262144') // 256KB por padrão
      if (validateContentType) {
        const ct = req.headers.get('content-type') || ''
        const isJson = /^application\/json(?:;|$)/i.test(ct)
        if (!isJson) {
          return new Response('Unsupported Media Type', { status: 415, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
        }
      }

      const contentLengthHeader = req.headers.get('content-length')
      if (contentLengthHeader) {
        const contentLength = Number.parseInt(contentLengthHeader)
        if (!Number.isNaN(contentLength) && contentLength > maxBodyBytes) {
          return new Response('Payload Too Large', { status: 413, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
        }
      }

      let payload: any
      const requireSig = (Deno.env.get('WHATSAPP_REQUIRE_SIGNATURE') || 'false') === 'true'

      // Unificar leitura do corpo bruto para permitir validação de tamanho exata
      let raw: string
      try {
        raw = await req.text()
      } catch (e) {
        console.warn('Error reading request body:', (e as any)?.message || e)
        return new Response('Bad Request', { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
      }

      // Verificação de tamanho após leitura (caso content-length não esteja presente/preciso)
      try {
        const byteLen = new TextEncoder().encode(raw).length
        if (byteLen > maxBodyBytes) {
          return new Response('Payload Too Large', { status: 413, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
        }
      } catch {
        // fallback silencioso: se não conseguir medir, prosseguir
      }

      if (requireSig) {
        const appSecret = Deno.env.get('WHATSAPP_APP_SECRET') || ''
        try {
          const signature = req.headers.get('x-hub-signature-256') || ''
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(appSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(raw))
          const expected = 'sha256=' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
          if (!signature || signature !== expected) {
            return new Response('Invalid signature', { status: 403, headers: corsHeaders })
          }
          payload = JSON.parse(raw)
        } catch (e) {
          console.warn('Signature validation error:', (e as any)?.message || e)
          return new Response('Invalid signature', { status: 403, headers: corsHeaders })
        }
      } else {
        try {
          payload = JSON.parse(raw)
        } catch (e) {
          return new Response('Invalid JSON', { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
        }
      }
      
      console.log('Received WhatsApp webhook:', JSON.stringify(payload, null, 2))

      // Process WhatsApp Cloud API format
      if (payload.object === 'whatsapp_business_account') {
        for (const entry of payload.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value
              
              // Extract messages - Enhanced to handle multiple message types
              for (const message of value.messages || []) {
                const phoneNumber = message.from
                const messageId = message.id

                // Handle different message types
                let messageContent = ''
                let messageType = message.type
                let imageUrl = ''
                
                if (message.type === 'text') {
                  messageContent = message.text.body
                  console.log(`📱 Text message from ${phoneNumber}: ${messageContent}`)
                  
                } else if (message.type === 'image') {
                  // Handle received images
                  const imageId = message.image.id
                  imageUrl = await downloadWhatsAppMedia(imageId, supabase, phoneNumber, messageId)
                  messageContent = message.image.caption || 'Imagem recebida'
                  console.log(`🖼️ Image message from ${phoneNumber}: ${messageContent}`)
                  
                } else {
                  console.log(`❓ Unsupported message type: ${message.type}`)
                  continue
                }

+               // 🔀 Fluxo de seleção de modelo para imagens (WhatsApp)
+               try {
+                 const nowIso = new Date().toISOString()
+                 if (messageType === 'text') {
+                   const { data: flows } = await supabase
+                     .from('whatsapp_pending_flows')
+                     .select('id, state_data, expires_at, status')
+                     .eq('phone_number', phoneNumber)
+                     .eq('flow_type', 'image_model_selection')
+                     .eq('status', 'pending')
+                     .gt('expires_at', nowIso)
+                     .order('created_at', { ascending: false })
+                     .limit(1)
+                 const pending = (flows && flows.length > 0) ? flows[0] : null
+                 if (pending) {
+                   const choice = (messageContent || '').trim()
+                   let chosen: 'instruct' | 'thinking' | 'none' | null = null
+                   if (/^(1|instruct)\b/i.test(choice)) chosen = 'instruct'
+                   else if (/^(2|think|thinking)\b/i.test(choice)) chosen = 'thinking'
+                   else if (/^(3|nao|não|não|no)\b/i.test(choice)) chosen = 'none'
+                   if (!chosen) {
+                     await sendWhatsAppMessage(phoneNumber, 'Por favor, responda com 1, 2 ou 3 para escolher o modelo.', value.metadata?.phone_number_id)
+                     continue
+                   }
+                   if (chosen === 'none') {
+                     await supabase.from('whatsapp_pending_flows').update({ status: 'cancelled' }).eq('id', pending.id)
+                     await sendWhatsAppMessage(phoneNumber, 'Beleza! Não vou analisar esta imagem. Se quiser, envie outra quando preferir.', value.metadata?.phone_number_id)
+                     continue
+                   }
+                   const imgUrl = pending.state_data?.imageUrl || pending.state_data?.image_url
+                   if (!imgUrl) {
+                     await supabase.from('whatsapp_pending_flows').update({ status: 'expired' }).eq('id', pending.id)
+                     await sendWhatsAppMessage(phoneNumber, 'A imagem expirou. Por favor, envie novamente.', value.metadata?.phone_number_id)
+                     continue
+                   }
+                   const caption = pending.state_data?.caption || 'Imagem recebida'
+                   const visionModel = chosen === 'instruct' ? 'qwen/qwen3-vl-235b-a22b-instruct' : 'qwen/qwen3-vl-235b-a22b-thinking'
+
+                   // Resolver studentId (opcional)
+                   let studentId: string | undefined
+                   try {
+                     const { data: st } = await supabase.from('students').select('id').eq('whatsapp_number', phoneNumber).single()
+                     if (st?.id) studentId = st.id
+                   } catch {}
+
+                   const aiResponse = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
+                     method: 'POST',
+                     headers: {
+                       'Content-Type': 'application/json',
+                       'x-api-key': Deno.env.get('HUMANIZED_INTERNAL_API_KEY') || '',
+                     },
+                     body: JSON.stringify({
+                       phoneNumber,
+                       studentId,
+                       question: caption,
+                       customPersonality: null,
+                       platform: 'whatsapp',
+                       messageType: 'image',
+                       imageUrl: imgUrl,
+                       visionModel
+                     }),
+                   })
+                   if (aiResponse.ok) {
+                     const aiData = await aiResponse.json()
+
+                     if (aiData.canRespond && aiData.answer) {
+                       if (aiData.generatedImage) {
+                         await sendWhatsAppImage(
+                           phoneNumber,
+                           aiData.generatedImage.imageUrl,
+                           aiData.answer,
+                           value.metadata?.phone_number_id
+                         )
+                       } else {
+                         await sendWhatsAppMessage(phoneNumber, aiData.answer, value.metadata?.phone_number_id)
+                       }
+                     } else {
+                       await sendWhatsAppMessage(phoneNumber, 'Não consegui analisar a imagem. Tente novamente em instantes.', value.metadata?.phone_number_id)
+                     }
+                     await supabase.from('whatsapp_pending_flows').update({ status: 'completed' }).eq('id', pending.id)
+                   } else {
+                     await sendWhatsAppMessage(phoneNumber, 'Falha ao processar a imagem. Tente novamente mais tarde.', value.metadata?.phone_number_id)
+                   }
+                   continue
+                 }
+               }
+               if (messageType === 'image') {
+                 try {
+                   // Expira estados anteriores para evitar conflito de índice único
+                   await supabase
+                     .from('whatsapp_pending_flows')
+                     .update({ status: 'expired' })
+                     .eq('phone_number', phoneNumber)
+                     .eq('flow_type', 'image_model_selection')
+                     .eq('status', 'pending')
+
+                   // Resolver studentId (opcional)
+                   let studentId: string | undefined
+                   try {
+                     const { data: st } = await supabase.from('students').select('id').eq('whatsapp_number', phoneNumber).single()
+                     if (st?.id) studentId = st.id
+                   } catch {}
+
+                   const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
+                   await supabase.from('whatsapp_pending_flows').insert({
+                     phone_number: phoneNumber,
+                     flow_type: 'image_model_selection',
+                     status: 'pending',
+                     state_data: { imageUrl, caption: messageContent, messageId },
+                     student_id: studentId || null,
+                     expires_at: expiresAt
+                   })
+
+                   await sendWhatsAppMessage(
+                     phoneNumber,
-                    'Recebi sua imagem! Como você quer que eu analise?\n1) Qwen VL Instruct — resposta rápida e objetiva\n2) Qwen VL Thinking — raciocínio detalhado (pode demorar mais)\n3) Não analisar',
+                    'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar',
+                     value.metadata?.phone_number_id
+                   )
+                   continue
+                 } catch (flowErr) {
+                   console.error('⚠️ Erro ao preparar fluxo de análise de imagem:', (flowErr as any)?.message || flowErr)
+                 }
+               }
+               // Fim do fluxo de seleção
+               
                try {
                  // 🎯 BUSCAR PERSONALIDADE ATIVA DO SISTEMA
                  let customPersonality = null;
                  try {
                    const { data: globalPref } = await supabase
                      .from('global_preferences')
                      .select('preference_value')
                      .eq('preference_key', 'active_personality')
                      .single();

                    if (globalPref?.preference_value) {
                      let personalityId = globalPref.preference_value;
                      
                      // Lidar com diferentes formatos JSONB
                      if (typeof personalityId === 'object' && personalityId.value) {
                        personalityId = personalityId.value;
                      } else if (typeof personalityId === 'string') {
                        try {
                          const parsed = JSON.parse(personalityId);
                          personalityId = typeof parsed === 'object' && parsed.value ? parsed.value : parsed;
                        } catch {
                          // personalityId já é string
                        }
                      }

                      // Se não for personalidade padrão, buscar prompt customizado
                      if (personalityId !== 'default-assistant' && personalityId !== 'default') {
                        const { data: personality } = await supabase
                          .from('custom_personalities')
                          .select('prompt')
                          .eq('id', personalityId)
                          .eq('is_active', true)
                          .single();
                        
                        if (personality?.prompt) {
                          customPersonality = personality.prompt;
                          console.log(`🎭 WhatsApp: Personalidade ativa aplicada`);
                        }
                      }
                    }
                  } catch (error) {
                    console.log('⚠️ WhatsApp: Erro ao buscar personalidade, usando padrão:', error.message);
                  }

                  // Resolver modelo de visão (global_preferences → env → default)
                  const defaultVisionModel = Deno.env.get('WHATSAPP_VISION_MODEL') || 'qwen/qwen3-vl-235b-a22b-instruct'
                  let visionModel = defaultVisionModel
                  try {
                    const { data: visionPref } = await supabase
                      .from('global_preferences')
                      .select('preference_value')
                      .eq('preference_key', 'vision_ai_model')
                      .single()
                    if (visionPref?.preference_value) {
                      let v = visionPref.preference_value
                      if (typeof v === 'object' && v.value) {
                        v = v.value
                      } else if (typeof v === 'string') {
                        try {
                          const parsed = JSON.parse(v)
                          v = (typeof parsed === 'object' && parsed?.value) ? parsed.value : parsed
                        } catch {}
                      }
                      if (typeof v === 'string' && v.trim()) {
                        visionModel = v.trim()
                        console.log(`🧠 WhatsApp: Vision model preferido = ${visionModel}`)
                      }
                    }
                  } catch (err) {
                    console.log('⚠️ WhatsApp: Falha ao resolver vision model, usando padrão:', (err as any)?.message || err)
                  }

                  // Resolver studentId via whatsapp_number (opcional)
                  let studentId: string | undefined
                  try {
                    const { data: st } = await supabase
                      .from('students')
                      .select('id')
                      .eq('whatsapp_number', phoneNumber)
                      .single()
                    if (st?.id) {
                      studentId = st.id
                    }
                  } catch (e) {
                    // Ignorar caso não exista
                  }

                  // Call humanized-ai-tutor (não ai-query) com personalidade e visão
                  const aiResponse = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': Deno.env.get('HUMANIZED_INTERNAL_API_KEY') || '',
                    },
                    body: JSON.stringify({
                      phoneNumber: phoneNumber,
                      studentId,
                      question: messageContent,
                      customPersonality: customPersonality, // 🎯 ENVIAR PERSONALIDADE
                      platform: 'whatsapp',
                      messageType: messageType,
                      imageUrl: imageUrl,
                      visionModel
                    }),
                  })

                  if (aiResponse.ok) {
                    const aiData = await aiResponse.json()
                    
                    if (aiData.canRespond && aiData.answer) {
                      // Check if AI generated an image
                      if (aiData.generatedImage) {
                        // Send image + text response
                        await sendWhatsAppImage(
                          phoneNumber, 
                          aiData.generatedImage.imageUrl, 
                          aiData.answer,
                          value.metadata?.phone_number_id
                        )
                        console.log(`🎨 Sent AI image response to ${phoneNumber}`)
                      } else {
                        // Send text response
                        await sendWhatsAppMessage(phoneNumber, aiData.answer, value.metadata?.phone_number_id)
                        console.log(`💬 Sent AI text response to ${phoneNumber}`)
                      }
                    } else {
                      console.log(`❌ Cannot respond to ${phoneNumber}: ${aiData.error || 'Unknown reason'}`)
                    }
                  } else {
                    console.error('AI query failed:', await aiResponse.text())
                  }

                } catch (error) {
                  console.error('Error processing message:', error)
                }
              }
            }
          }
        }
      }

      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      })
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    })
  }
})

// Helper function to send WhatsApp messages
async function sendWhatsAppMessage(to: string, message: string, phoneNumberId?: string) {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const fromPhoneNumberId = phoneNumberId || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    
    if (!accessToken || !fromPhoneNumberId) {
      console.error('Missing WhatsApp credentials')
      return false
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${fromPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('Message sent successfully:', result)
      return true
    } else {
      const error = await response.text()
      console.error('Failed to send message:', error)
      return false
    }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return false
  }
}

// Helper function to download WhatsApp media
-async function downloadWhatsAppMedia(imageId: string): Promise<string> {
+async function downloadWhatsAppMedia(
+  imageId: string,
+  supabase: ReturnType<typeof createClient>,
+  phoneNumber?: string,
+  messageId?: string
+): Promise<string> {
   try {
     const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
     
     if (!accessToken) {
       console.error('Missing WhatsApp access token')
       return ''
     }
 
     // First, get media URL from WhatsApp
     const mediaInfoResponse = await fetch(`https://graph.facebook.com/v17.0/${imageId}`, {
       headers: {
         'Authorization': `Bearer ${accessToken}`,
       },
     })
 
     if (!mediaInfoResponse.ok) {
       console.error('Failed to get media info')
       return ''
     }
 
     const mediaInfo = await mediaInfoResponse.json()
     const mediaUrl = mediaInfo.url
 
     // Download the actual media file
     const mediaResponse = await fetch(mediaUrl, {
       headers: {
         'Authorization': `Bearer ${accessToken}`,
       },
     })
 
     if (!mediaResponse.ok) {
       console.error('Failed to download media')
       return ''
     }
 
-    // Here you would typically upload to your storage (Supabase Storage)
-    // For now, return the URL directly
-    console.log('📥 Media downloaded successfully')
-    return mediaUrl
+    // Inferir content-type e extensão
+    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
+    const ab = await mediaResponse.arrayBuffer()
+
+    const extMap: Record<string, string> = {
+      'image/jpeg': 'jpg',
+      'image/jpg': 'jpg',
+      'image/png': 'png',
+      'image/webp': 'webp',
+      'image/heic': 'heic',
+      'image/heif': 'heif'
+    }
+    const now = new Date()
+    const y = now.getUTCFullYear()
+    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
+    const d = String(now.getUTCDate()).padStart(2, '0')
+    const ext = extMap[contentType] || (mediaInfo?.mime_type && extMap[mediaInfo.mime_type]) || 'bin'
+    const safePhone = (phoneNumber || 'unknown').replace(/[^0-9+]/g, '')
+    const idPart = (messageId || imageId || `${Date.now()}`)
+    const filePath = `whatsapp/${safePhone}/${y}/${m}/${d}/${idPart}.${ext}`
+
+    // Upload para Supabase Storage (tmp-ocr)
+    const blob = new Blob([ab], { type: contentType })
+    const uploadRes = await supabase.storage
+      .from('tmp-ocr')
+      .upload(filePath, blob, { contentType, upsert: false })
+
+    if (uploadRes.error) {
+      console.error('Erro no upload para tmp-ocr:', uploadRes.error.message)
+      return ''
+    }
+
+    // Gerar URL assinada por 5 minutos
+    const signed = await supabase.storage
+      .from('tmp-ocr')
+      .createSignedUrl(filePath, 60 * 5)
+
+    if (signed.error || !signed.data?.signedUrl) {
+      console.error('Erro ao criar URL assinada:', signed.error?.message)
+      return ''
+    }
+
+    console.log('📥 Media uploaded and signed URL generated successfully')
+    return signed.data.signedUrl
 
   } catch (error) {
     console.error('Error downloading WhatsApp media:', error)
     return ''
   }
 }

// Helper function to send WhatsApp image
async function sendWhatsAppImage(to: string, imageUrl: string, caption: string, phoneNumberId?: string) {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const fromPhoneNumberId = phoneNumberId || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    
    if (!accessToken || !fromPhoneNumberId) {
      console.error('Missing WhatsApp credentials')
      return false
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${fromPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('🖼️ Image sent successfully:', result)
      return true
    } else {
      const error = await response.text()
      console.error('Failed to send image:', error)
      return false
    }

  } catch (error) {
    console.error('Error sending WhatsApp image:', error)
    return false
  }
}