import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

console.log("Ideogram Image Generator Function started!")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, aspect_ratio = "ASPECT_1_1", model = "V_2", apiKey } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use provided API key or fallback to environment
    const ideogramApiKey = apiKey || Deno.env.get('IDEOGRAM_API_KEY')
    
    if (!ideogramApiKey) {
      return new Response(
        JSON.stringify({ error: 'Ideogram API key not configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🎨 Generating image with Ideogram API...')
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...')
    console.log('🔑 API Key length:', ideogramApiKey.length)

    // Call Ideogram API
    const ideogramResponse = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': ideogramApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt: prompt,
          aspect_ratio: aspect_ratio,
          model: model,
          magic_prompt_option: 'AUTO'
        }
      })
    })

    console.log('📡 Ideogram response status:', ideogramResponse.status)

    if (!ideogramResponse.ok) {
      const errorText = await ideogramResponse.text()
      console.error('❌ Ideogram API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Ideogram API failed',
          status: ideogramResponse.status,
          details: errorText 
        }),
        { 
          status: ideogramResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await ideogramResponse.json()
    console.log('✅ Ideogram success:', result.data?.length || 0, 'images generated')

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
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