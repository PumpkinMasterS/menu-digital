import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface OCRRequest {
  imageBase64: string;
  prompt?: string;
  model?: 'google/gemini-pro-vision' | 'google/gemini-pro'; // Modelos ajustados para OpenRouter
  extractType?: 'text' | 'structured' | 'table' | 'form' | 'document';
}

// Interface ajustada para o formato do OpenRouter (similar ao OpenAI)
interface OpenRouterVisionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: Array<{
      type: string;
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  temperature?: number;
  max_tokens?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, prompt, model = 'google/gemini-pro-vision', extractType = 'text' }: OCRRequest = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Manter prompts do sistema
    const systemPrompts = {
      text: "Extrai todo o texto legível desta imagem. Preserva formatação, quebras de linha e estrutura. Responde apenas com o texto extraído.",
      structured: "Analisa esta imagem e extrai informações estruturadas em formato JSON. Inclui texto, layout, e elementos visuais importantes.",
      table: "Extrai dados de tabelas desta imagem e converte para formato JSON ou markdown. Preserva estrutura de linhas e colunas.",
      form: "Extrai campos e valores de formulários desta imagem. Retorna em formato JSON com nome do campo e valor preenchido.",
      document: "Analisa este documento e extrai: título, seções, texto principal, e metadados importantes. Organiza em formato estruturado."
    };

    const finalPrompt = prompt || systemPrompts[extractType];

    // Preparar request para OpenRouter
    const openRouterRequest: OpenRouterVisionRequest = {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: finalPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4000 // Ajustado para o Gemini Pro
    };

    console.log(`📸 Processando OCR com modelo OpenRouter: ${model}`);
    console.log(`🎯 Tipo de extração: ${extractType}`);

    // Fazer request para OpenRouter
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada');
    }

    const openRouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';

    const startTime = Date.now();

    const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clever-school-pal.com', // Adicionado para OpenRouter
        'X-Title': 'Clever School Pal' // Adicionado para OpenRouter
      },
      body: JSON.stringify(openRouterRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API OpenRouter:', response.status, errorText);
      throw new Error(`API OpenRouter falhou: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Resposta inválida da API OpenRouter');
    }

    const extractedText = result.choices[0].message.content;

    // Calcular estatísticas
    const stats = {
      model: model,
      processingTime: processingTime,
      extractType: extractType,
      charactersExtracted: extractedText.length,
      tokensUsed: result.usage || null,
      confidence: extractType === 'text' ? 'high' : 'medium' // Estimativa baseada no tipo
    };

    console.log(`✅ OCR processado em ${processingTime}ms`);
    console.log(`📊 ${extractedText.length} caracteres extraídos`);

    // Processar resultado baseado no tipo
    let processedResult = extractedText;
    
    if (extractType === 'structured' || extractType === 'table' || extractType === 'form') {
      try {
        // Tentar parsear JSON se for tipo estruturado
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          processedResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('⚠️ Não foi possível parsear JSON, retornando texto bruto');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: processedResult,
        rawText: extractedText,
        stats: stats,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no OCR:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        canRespond: false,
        processingTime: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});