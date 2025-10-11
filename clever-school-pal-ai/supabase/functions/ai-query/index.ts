import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { createWebSearchTools } from '../shared/tools/index.ts'
import { createContextRegistry } from '../../shared/context-registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// Function to create a hash for caching
function createQuestionHash(question: string, classId: string): string {
  return createHash('sha256').update(`${question.toLowerCase().trim()}-${classId}`).digest('hex')
}

// Personalidade global e contextos passam a ser obtidos via Context Registry

// 🌐 FUNÇÃO PARA DETECTAR SE PRECISA DE WEB SEARCH
async function needsWebSearch(question: string): Promise<boolean> {
  const q = question.toLowerCase();
  // Sinais gerais de temporalidade/atualidade
  const keywordHits = [
    'hoje', 'agora', 'atual', 'recente', 'último', 'nova', 'novo', 'notícia',
    'aconteceu', 'acontece', 'está acontecendo', 'neste momento',
    '2024', '2025', 'este ano', 'ano passado', 'mês passado', 'semana passada',
    'ontem', 'amanhã', 'próximo', 'futuro',
    'presidente', 'primeiro-ministro', 'eleição', 'governo', 'política', 'ministro',
    'mandato', 'posse', 'eleito', 'candidato', 'partido político', 'congresso',
    'senado', 'câmara', 'deputado', 'senador',
    'preço', 'cotação', 'valor', 'câmbio', 'clima', 'tempo', 'temperatura',
    'população', 'dados', 'estatística', 'número', 'quantidade',
    'descoberta', 'invenção', 'pesquisa', 'estudo', 'resultado', 'conclusão',
    'experimento', 'teste', 'análise', 'relatório',
    'inteligência artificial', 'ia', 'tecnologia', 'inovação', 'avanço',
    'desenvolvimento', 'progresso', 'mudança', 'evolução',
    // Frases críticas que mudam com o tempo
    'quem é o presidente', 'presidente dos eua', 'presidente dos estados unidos',
    'presidente do brasil', 'presidente de portugal'
  ].some(k => q.includes(k));

  // Consultas sobre cargos/líderes que mudam ao longo do tempo (sem precisar de "atual")
  const temporalEntity = (
    /\b(quem\s+é|qual\s+é)?\s*(o\s+)?(presidente|primeiro-ministro|ministro|líder|governador|prefeito)\b.*\b(eua|estados\s+unidos|brasil|portugal|reino\s+unido|frança|espanha|alemanha)\b/i.test(q)
  ) || (/\bpresidente\b.*\b(eua|estados\s+unidos)\b/i.test(q));

  return keywordHits || temporalEntity;
}

// ✅ NOVA FUNÇÃO: Detectar perguntas de atualidades (forçar busca fresca)
function isCurrentEventsQuery(question: string): boolean {
  const q = question.toLowerCase();
  const qn = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const patterns = [
    /\b(hoje|agora|atual|recentemente|neste momento)\b/i,
    /\b(notícias?|manchetes?|últimas?)\b/i,
    /\b(aconteceu|está acontecendo|acontece)\b/i,
    /\b(2024|2025|ontem|esta semana|este mês|semana passada|mês passado)\b/i,
    /\b(eleição|posse|mandato|governo|presidente)\b/i
  ];
  const temporalEntity = (
    /\b(quem\s+é|qual\s+é)?\s*(o\s+)?(presidente|primeiro-ministro|ministro|líder|governador|prefeito)\b.*\b(eua|estados\s+unidos|brasil|portugal|reino\s+unido|frança|espanha|alemanha)\b/i.test(q)
  ) || (/\bpresidente\b.*\b(eua|estados\s+unidos)\b/i.test(q));
  // Novo: tolerância a erros ortográficos (ex.: "presiudente") usando detecção por radical
  const typoEntity = /\bpresid[a-z]*\b/i.test(qn) && /\b(eua|estados\s+unidos|usa|united\s+states)\b/i.test(qn);
  return patterns.some(p => p.test(q)) || temporalEntity || typoEntity;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')!
    const openRouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
    const aiModel = Deno.env.get('AI_MODEL') || 'open-mistral-7b'
    const embeddingModel = Deno.env.get('EMBEDDING_MODEL') || 'mistral/mistral-embed'
    const internalApiKey = Deno.env.get('HUMANIZED_INTERNAL_API_KEY') || ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const { phoneNumber, question, schoolId, streaming = false, messageType, imageUrl, includeImageGeneration = false } = await req.json()

      if (!phoneNumber || !question) {
        return new Response(
          JSON.stringify({ error: 'Phone number and question are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📱 Processing ${messageType || 'text'} message from ${phoneNumber}: ${question}`)
      if (imageUrl) {
        console.log(`🖼️ Received image: ${imageUrl}`)
      }

      // 🎯 REGISTRY: Construir contexto hierárquico e obter personalidade global
      const { buildHierarchicalContext } = createContextRegistry(supabase)
      const hierarchicalContext = await buildHierarchicalContext({ whatsappNumber: phoneNumber, schoolId })
      const globalPersonality = hierarchicalContext?.global?.personality || null
      console.log('🎭 Personalidade global (registry):', globalPersonality ? 'presente' : 'padrão')

      // Find student by phone number (using whatsapp_number)
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          whatsapp_number,
          class_id,
          school_id,
          active,
          bot_active,
          classes!inner(
            id,
            name,
            grade,
            school_id
          )
        `)
        .eq('whatsapp_number', phoneNumber)
        .eq('active', true)
        .eq('bot_active', true)
        .single()

      if (studentError || !student) {
        return new Response(
          JSON.stringify({ 
            error: 'Student not found or bot not active for this number',
            canRespond: false 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify school if provided
      if (schoolId && student.school_id !== schoolId) {
        return new Response(
          JSON.stringify({ 
            error: 'Student not from this school',
            canRespond: false 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`🔍 DEBUG: Student class_id: ${student.class_id}`)
      console.log(`🔍 DEBUG: Student grade: ${student.classes?.grade}`)

      // 🌐 MODERN WEB SEARCH: Usar tools nativas seguindo padrões 2025
      let webSearchContext = ''
      const isCurrent = isCurrentEventsQuery(question)
      const shouldUseWebSearch = (await needsWebSearch(question)) || isCurrent
      
      if (shouldUseWebSearch) {
        console.log('🔍 Pergunta requer busca web, usando tools modernas...')
        try {
          const tools = createWebSearchTools()
          const searchResults = []
          
          // Determinar qual tool usar baseado no contexto da pergunta
          const questionLower = question.toLowerCase()
          
          // Para eventos atuais, priorizar NewsSearchTool
          if (isCurrent || questionLower.includes('notícia') || questionLower.includes('atual')) {
            const newsTool = tools.find(t => t.name === 'news_search')
            if (newsTool) {
              const result = await newsTool._call({
                query: question,
                maxResults: 5,
                language: 'pt'
              })
              const parsedResult = JSON.parse(result)
              if (parsedResult.articles?.length > 0) {
                searchResults.push({
                  source: 'news',
                  data: parsedResult
                })
              }
            }
          }
          
          // Reordenação e fallback: news→wikipedia→duckduckgo (ou wikipedia→duckduckgo)
           if (searchResults.length === 0) {
             const prioritized = isCurrent ? ['news_search','wikipedia_search','duckduckgo_search'] : ['wikipedia_search','duckduckgo_search']
             for (const name of prioritized) {
               const tool = tools.find(t => t.name === name)
               if (!tool) continue
               try {
                 if (name === 'news_search') {
                   const result = await tool._call({ query: question, maxResults: 5, language: 'pt' })
                   const parsed = JSON.parse(result)
                   if (parsed.articles?.length > 0) {
                     searchResults.push({ source: 'news', data: parsed })
                   }
                 } else if (name === 'wikipedia_search') {
                   const result = await tool._call({ query: question, maxResults: 2, language: 'pt' })
                   const parsed = JSON.parse(result)
                   if (parsed.results?.length > 0) {
                     searchResults.push({ source: 'wikipedia', data: parsed })
                   }
                 } else if (name === 'duckduckgo_search') {
                   const result = await tool._call({ query: question, maxResults: 5 })
                   const parsed = JSON.parse(result)
                   if (parsed.abstract || (Array.isArray(parsed.relatedTopics) && parsed.relatedTopics.length > 0)) {
                     searchResults.push({ source: 'duckduckgo', data: parsed })
                   }
                 }
               } catch (e) {
                 console.warn(`Tool ${name} falhou:`, (e as any)?.message || e)
               }
               if (searchResults.length > 0) break
             }
           }
          
          // Formatar resultados para o contexto
          if (searchResults.length > 0) {
            webSearchContext = '\n\n📚 INFORMAÇÕES ATUAIS DA WEB:\n'
            
            searchResults.forEach((result, index) => {
              if (result.source === 'news') {
                const data = result.data
                if (data.articles?.length > 0) {
                  webSearchContext += `\n📰 MANCHETES:\n`
                  data.articles.forEach((article: any, i: number) => {
                    webSearchContext += `${i + 1}. **${article.title}**\n   ${article.description || ''}\n   ${article.url ? `Link: ${article.url}` : ''}\n\n`
                  })
                }
              } else if (result.source === 'wikipedia') {
                const data = result.data
                webSearchContext += `\n📖 WIKIPEDIA:\n`
                data.results.forEach((article: any, i: number) => {
                  webSearchContext += `${i + 1}. **${article.title}**\n   ${article.snippet}\n   Link: ${article.url}\n\n`
                })
              } else if (result.source === 'duckduckgo') {
                const data = result.data
                if (data.abstract) {
                  webSearchContext += `\n🔍 INFORMAÇÃO GERAL:\n**${data.abstractSource}**\n${data.abstract}\n`
                  if (data.abstractURL) webSearchContext += `Link: ${data.abstractURL}\n`
                }
                if (data.relatedTopics?.length > 0) {
                  webSearchContext += `\n📋 TÓPICOS RELACIONADOS:\n`
                  data.relatedTopics.forEach((topic: any, i: number) => {
                    webSearchContext += `${i + 1}. ${topic.text}\n   Link: ${topic.firstURL}\n\n`
                  })
                }
              }
            })
            
            console.log(`✅ Modern web search: ${searchResults.length} tools utilizadas`)
          }
        } catch (error) {
          console.warn('⚠️ Erro na busca web moderna:', (error as any).message || error)
        }
      }

      // Check cache first for instant responses
      const questionHash = createQuestionHash(question + webSearchContext, student.class_id)
      const { data: cachedResponse } = await supabase
        .from('response_cache')
        .select('*')
        .eq('question_hash', questionHash)
        .eq('school_id', student.school_id)
        .eq('class_id', student.class_id)
        .single()

      if (cachedResponse) {
        console.log('🚀 Cache hit! Returning instant response')
        
        // Update cache hit count and last used
        await supabase
          .from('response_cache')
          .update({ 
            hit_count: cachedResponse.hit_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', cachedResponse.id)

        // Log the interaction
        await supabase
          .from('chat_logs')
          .insert({
            student_id: student.id,
            question: question,
            answer: cachedResponse.answer,
            relevant_content_count: 0,
            school_id: student.school_id,
            response_type: 'cache_hit'
          })

        return new Response(
          JSON.stringify({
            canRespond: true,
            answer: cachedResponse.answer,
            student: {
              id: student.id,
              name: student.name,
            },
            relevantContentCount: 0,
            searchType: 'cache_hit',
            cached: true,
            processingTime: 0,
            personalityActive: !!globalPersonality
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const startTime = Date.now()

      // Generate embedding for the question using OpenRouter
      let questionEmbedding: number[] = []
      
      try {
        const embeddingResponse = await fetch(`${openRouterBaseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterApiKey}`,
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: question,
          }),
        })

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          questionEmbedding = embeddingData.data[0].embedding || []
          console.log('Successfully generated question embedding via OpenRouter, length:', questionEmbedding.length)
        } else {
          console.warn('OpenRouter embedding API returned status:', embeddingResponse.status)
          const errorText = await embeddingResponse.text()
          console.warn('Error details:', errorText)
        }
      } catch (err) {
        console.warn('Could not generate question embedding via OpenRouter:', err)
        console.log('Falling back to text search.')
      }

      // Find relevant content using SIMPLE and ROBUST search
      let relevantContent: any[] = []

      console.log(`🔍 SIMPLE SEARCH: Starting for class_id: ${student.class_id}`)

      // Get ALL content for this class - SIMPLE approach
      const { data: classContent, error: classError } = await supabase
        .from('content_classes')
        .select(`
          contents(
            id, title, description, content_data, status, subjects(name)
          )
        `)
        .eq('class_id', student.class_id)

      if (!classError && classContent) {
        // Get only published content
        const published = classContent
          .map(cc => cc.contents)
          .filter(c => c && c.status === 'publicado')

        console.log(`📚 Published content found: ${published.length}`)

        if (published.length > 0) {
          // Simple text search
          const searchTerms = question.toLowerCase().split(' ').filter(term => term.length > 2)
          
          relevantContent = published.filter(content => {
            const contentText = `${content.title} ${content.description || ''} ${content.content_data}`.toLowerCase()
            return searchTerms.some(term => contentText.includes(term))
          }).slice(0, 3)

          console.log(`🎯 Relevant content after text search: ${relevantContent.length}`)
        }
      }

      // If no relevant content found, get some general content
      if (relevantContent.length === 0 && classContent && classContent.length > 0) {
        relevantContent = classContent
          .map(cc => cc.contents)
          .filter(c => c && c.status === 'publicado')
          .slice(0, 2)
        
        console.log(`📖 Using general content: ${relevantContent.length}`)
      }

      const processingTime = Date.now() - startTime

      // 🎯 CHAMAR HUMANIZED-AI-TUTOR COM PERSONALIDADE GLOBAL
      console.log('🤖 Calling advanced AI tutor with global personality...')
      
      const aiResponse = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Security hardening: use internal x-api-key instead of Service Role in Authorization
          ...(internalApiKey ? { 'x-api-key': internalApiKey } : {})
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          question: question,
          studentId: student.id,
          customPersonality: globalPersonality, // 🎯 PASSAR PERSONALIDADE GLOBAL
          messageType: messageType,
          imageUrl: imageUrl,
          webSearchContext: webSearchContext, // 🌐 PASSAR CONTEXTO WEB
          relevantContent: relevantContent, // 📚 PASSAR CONTEÚDO RELEVANTE
          hierarchicalContext: hierarchicalContext // 🧭 NOVO: Passar contexto hierárquico completo
        }),
      })

      if (!aiResponse.ok) {
        throw new Error(`AI tutor failed: ${aiResponse.status}`)
      }

      const aiData = await aiResponse.json()

      // Cache the response for future use
      if (aiData.canRespond && aiData.answer) {
        try {
          await supabase
            .from('response_cache')
            .insert({
              question_hash: questionHash,
              question: question,
              answer: aiData.answer,
              school_id: student.school_id,
              class_id: student.class_id,
              hit_count: 0,
              created_at: new Date().toISOString(),
              last_used_at: new Date().toISOString()
            })
        } catch (cacheError) {
          console.warn('Could not cache response:', cacheError)
        }
      }

      return new Response(
        JSON.stringify({
          ...aiData,
          relevantContentCount: relevantContent.length,
          searchType: 'hierarchical_with_personality',
          cached: false,
          processingTime: processingTime,
          personalityActive: !!globalPersonality,
          personalitySource: 'registry'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response('Method not supported', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Error in ai-query:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        canRespond: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})