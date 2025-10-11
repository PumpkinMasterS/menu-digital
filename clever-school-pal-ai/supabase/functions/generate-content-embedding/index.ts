import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Adiciona suporte a PDF para extração de texto
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.js'
// @ts-ignore - configurar worker (desabilitamos worker no getDocument, mas mantemos por compatibilidade)
;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Heurística simples para detectar URL de PDF
function isProbablyPdf(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    return pathname.endsWith('.pdf');
  } catch {
    return url.toLowerCase().includes('.pdf');
  }
}

// Extração robusta de texto de PDF (limite de segurança: 30 páginas/15k chars)
async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    const resp = await fetch(pdfUrl);
    if (!resp.ok) {
      console.warn('PDF fetch failed:', resp.status, pdfUrl);
      return '';
    }
    const ab = await resp.arrayBuffer();
    const data = new Uint8Array(ab);
    const docTask = (pdfjsLib as any).getDocument({
      data,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableFontFace: true,
      disableRange: true,
      disableStream: true,
      disableAutoFetch: true,
      disableCreateObjectURL: true,
      // evitar worker em edge runtime
      disableWorker: true,
    });
    const pdfDoc = await docTask.promise;
    const maxPages = Math.min(pdfDoc.numPages || 0, 30);
    let text = '';
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items || []).map((it: any) => it.str).join(' ');
      text += strings + '\n';
      if (text.length > 15000) break;
    }
    return text.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.error('PDF extraction error:', err);
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    const openRouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
    const embeddingModel = Deno.env.get('EMBEDDING_MODEL') || 'mistral/mistral-embed' // Modelo atualizado para OpenRouter

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!openRouterApiKey) {
      console.error('Missing OpenRouter API key')
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing AI credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      let requestBody
      try {
        requestBody = await req.json()
      } catch (parseError) {
        console.error('Invalid JSON in request:', parseError)
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { contentId, title, description, contentData } = requestBody

      if (!contentId) {
        return new Response(
          JSON.stringify({ error: 'Content ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar dados do conteúdo para enriquecer o contexto (inclui tipo e objetivos)
      const { data: contentRow } = await supabase
        .from('contents')
        .select('title, description, content_data, content_type, learning_objectives, subtitle')
        .eq('id', contentId)
        .single()

      const combinedTitle: string = (title ?? contentRow?.title ?? '')
      const combinedDesc: string = (description ?? contentRow?.description ?? '')
      const contentDataUrl: string = (contentData ?? contentRow?.content_data ?? '')

      let pdfExtract = ''
      try {
        if (isProbablyPdf(contentDataUrl) || (contentRow?.content_type === 'pdf')) {
          pdfExtract = await extractTextFromPdf(contentDataUrl)
        }
      } catch (err) {
        console.warn('PDF extraction attempt failed:', err)
      }

      // Combina campos para gerar embedding, priorizando texto de PDF quando houver
      const parts = [
        combinedTitle,
        combinedDesc,
        (typeof contentRow?.learning_objectives === 'string' ? contentRow?.learning_objectives : ''),
        (typeof contentRow?.subtitle === 'string' ? contentRow?.subtitle : ''),
        pdfExtract || (typeof contentDataUrl === 'string' ? contentDataUrl : ''),
      ].filter(Boolean)

      const textToEmbed = parts.join(' ').trim()

      if (!textToEmbed) {
        console.log('No text content to embed for content:', contentId)
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'No text content to embed',
            contentId: contentId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Limit text size to prevent API errors
      const maxTextLength = 8000
      const finalTextToEmbed = textToEmbed.length > maxTextLength 
        ? textToEmbed.substring(0, maxTextLength) + '...'
        : textToEmbed

      console.log(`Generating embedding for content: ${contentId} (${finalTextToEmbed.length} chars) using ${embeddingModel}`)

      try {
        // Call OpenRouter API for embedding generation
        const embeddingResponse = await fetch(`${openRouterBaseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': 'https://clever-school-pal.com', 
            'X-Title': 'Clever School Pal'
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: finalTextToEmbed,
          }),
        })

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text()
          console.error(`OpenRouter embedding API error (${embeddingResponse.status}):`, errorText)
          
          // Provide fallback response instead of failing
          const { error: updateError } = await supabase
            .from('contents')
            .update({ 
              updated_at: new Date().toISOString()
            })
            .eq('id', contentId)

          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'AI embedding service temporarily unavailable',
              contentId: contentId,
              fallback: true,
              details: `API returned ${embeddingResponse.status}`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const embeddingData = await embeddingResponse.json()
        
        if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
          console.error('Invalid embedding response format:', embeddingData)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Invalid response from AI embedding service',
              contentId: contentId
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const embedding = embeddingData.data[0].embedding

        if (!Array.isArray(embedding) || embedding.length === 0) {
          console.error('Invalid embedding format:', embedding)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Invalid embedding format from AI service',
              contentId: contentId
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update content with embedding
        const { error: updateError } = await supabase
          .from('contents')
          .update({ 
            embedding: embedding,
            updated_at: new Date().toISOString()
          })
          .eq('id', contentId)

        if (updateError) {
          console.error('Database update error:', updateError)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to save embedding to database',
              contentId: contentId,
              details: updateError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ Successfully generated and saved embedding for content: ${contentId}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            contentId,
            embeddingLength: embedding.length,
            model: embeddingModel,
            provider: 'OpenRouter',
            textLength: finalTextToEmbed.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (embeddingServiceError) {
        console.error('OpenRouter connection error:', embeddingServiceError)
        
        // Update content timestamp even if embedding fails
        try {
          await supabase
            .from('contents')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', contentId)
        } catch (dbError) {
          console.error('Failed to update timestamp:', dbError)
        }
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'AI embedding service connection failed',
            contentId: contentId,
            details: embeddingServiceError.message,
            fallback: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as any)?.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})