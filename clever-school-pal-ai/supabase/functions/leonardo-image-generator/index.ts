import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { prompt, educationalContext } = await req.json()
    
    // Get Leonardo API key from environment
    const leonardoApiKey = Deno.env.get('LEONARDO_API_KEY')
    
    if (!leonardoApiKey) {
      throw new Error('Leonardo API key not configured')
    }

    // Call Leonardo.AI API
    const leonardoResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${leonardoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Educational illustration: ${prompt}. ${educationalContext || 'Clean, colorful, didactic style with Portuguese labels for students aged 10-15. Professional quality, clear visual learning aid.'}`,
        modelId: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3", // Leonardo Diffusion XL
        width: 832,
        height: 832,
        guidance_scale: 7,
        num_images: 1,
        public: false,
        promptMagic: true,
        photoReal: false,
        alchemy: true
      }),
    })

    if (!leonardoResponse.ok) {
      throw new Error(`Leonardo API error: ${leonardoResponse.status}`)
    }

    const leonardoData = await leonardoResponse.json()
    
    if (leonardoData.sdGenerationJob?.generationId) {
      // Leonardo requires polling for results - for now return job ID
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: `https://leonardo.ai/generation/${leonardoData.sdGenerationJob.generationId}`,
          provider: 'leonardo-ai-educational',
          prompt: prompt,
          timestamp: new Date().toISOString(),
          generationId: leonardoData.sdGenerationJob.generationId,
          note: '🎨 Ilustração educativa criativa (150 créditos/dia grátis)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      throw new Error('No generation ID returned from Leonardo')
    }

  } catch (error) {
    console.error('Leonardo Edge Function Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        provider: 'leonardo-ai-educational'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 