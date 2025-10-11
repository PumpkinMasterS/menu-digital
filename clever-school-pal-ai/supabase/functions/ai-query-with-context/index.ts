import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { toOnlineIfNeeded } from '../_shared/onlineModel.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// Function to create a hash for caching
function createQuestionHash(question: string, classId: string): string {
  return createHash('sha256').update(`${question.toLowerCase().trim()}-${classId}`).digest('hex')
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
    const aiModel = Deno.env.get('AI_MODEL') || 'open-mistral-7b' // Default model updated
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const { phoneNumber, question, schoolId, streaming = false } = await req.json()

      if (!phoneNumber || !question) {
        return new Response(
          JSON.stringify({ error: 'Phone number and question are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // 🎯 STEP 1: Get COMPLETE student context using the database function
      console.log(`🔍 Getting complete context for student: ${phoneNumber}`)
      
      const { data: fullContext, error: contextError } = await supabase
        .rpc('get_student_full_context', {
          student_phone: phoneNumber
        })

      if (contextError || !fullContext || fullContext.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Student not found or bot not active for this number',
            canRespond: false 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studentContext = fullContext[0]
      
      // Verify school if provided
      if (schoolId && studentContext.school_id !== schoolId) {
        return new Response(
          JSON.stringify({ 
            error: 'Student not from this school',
            canRespond: false 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ Complete context retrieved for ${studentContext.student_name}`)
      console.log(`🏫 School: ${studentContext.school_name}`)
      console.log(`🎓 Class: ${studentContext.class_name} (${studentContext.class_grade})`)
      console.log(`📝 Class context: ${studentContext.class_general_context ? 'Present' : 'Not set'}`)
      console.log(`👤 Student context: ${studentContext.student_special_context ? 'Present' : 'Not set'}`)

      // Check cache first for instant responses
      const questionHash = createQuestionHash(question, studentContext.class_id)
      const { data: cachedResponse } = await supabase
        .from('response_cache')
        .select('*')
        .eq('question_hash', questionHash)
        .eq('school_id', studentContext.school_id)
        .eq('class_id', studentContext.class_id)
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
            student_id: studentContext.student_id,
            question: question,
            answer: cachedResponse.answer,
            relevant_content_count: 0,
            school_id: studentContext.school_id,
            response_type: 'cache_hit_with_context'
          })

        return new Response(
          JSON.stringify({
            canRespond: true,
            answer: cachedResponse.answer,
            student: {
              id: studentContext.student_id,
              name: studentContext.student_name,
            },
            relevantContentCount: 0,
            searchType: 'cache_hit_with_context',
            cached: true,
            processingTime: 0,
            contextUsed: {
              classContext: !!studentContext.class_general_context,
              studentContext: !!studentContext.student_special_context
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const startTime = Date.now()

      // 🎯 STEP 2: Find relevant content for the class
      console.log(`🔍 Searching content for class: ${studentContext.class_name}`)
      
      let relevantContent: any[] = []

      // Get content assigned to this class
      const { data: classContent, error: classError } = await supabase
        .from('content_classes')
        .select(`
          contents(
            id, title, description, content_data, status, subjects(name)
          )
        `)
        .eq('class_id', studentContext.class_id)

      if (!classError && classContent) {
        // Get only published content
        const published = classContent
          .map(cc => cc.contents)
          .filter(c => c && c.status === 'publicado')

        console.log(`📚 Published content found: ${published.length}`)

        if (published.length > 0) {
          // Simple text search
          const terms = question.toLowerCase().split(' ').filter(t => t.length > 2)
          console.log(`🔍 Search terms: [${terms.join(', ')}]`)

          // Find matches
          relevantContent = published.filter(content => {
            const text = `${content.title} ${content.description || ''}`.toLowerCase()
            const match = terms.some(term => text.includes(term))
            if (match) {
              console.log(`✅ MATCH: "${content.title}"`)
            }
            return match
          })

          // If no matches, return first 2 items as fallback
          if (relevantContent.length === 0) {
            console.log('📚 No matches, using fallback content')
            relevantContent = published.slice(0, 2)
          }
        }
      }

      console.log(`🎯 Content found: ${relevantContent.length} items`)

      // 🎯 STEP 3: Build comprehensive AI prompt with CONTEXT HIERARCHY
      console.log('🤖 Building AI prompt with context hierarchy...')
      
      // Build the AI prompt with proper context hierarchy
      let aiPrompt = `Você é um tutor educacional especializado da ${studentContext.school_name}.

📚 CONTEXTO DA TURMA (LEIA PRIMEIRO):
Turma: ${studentContext.class_name} (${studentContext.class_grade})
`

      // Add class general context if available
      if (studentContext.class_general_context) {
        aiPrompt += `Informações da Turma: ${studentContext.class_general_context}
`
      }

      // Add student specific context if available
      if (studentContext.student_special_context) {
        aiPrompt += `
👤 CONTEXTO ESPECÍFICO DO ALUNO (LEIA SEGUNDO):
Aluno: ${studentContext.student_name}
Necessidades Especiais: ${studentContext.student_special_context}
`
      }

      // Add content context if found
      if (relevantContent.length > 0) {
        const contentContext = relevantContent.map(item => 
          `• **${item.title}**\n  📝 ${item.description || ''}\n  Conteúdo: ${(item.content_data || '').substring(0, 1000)}...`
        ).join('\n\n')
        
        aiPrompt += `
📖 CONTEÚDOS DISPONÍVEIS:
${contentContext}
`
      }

      aiPrompt += `
🎯 INSTRUÇÕES IMPORTANTES:
1. SEMPRE considere primeiro o contexto da turma (metodologia, projetos, cronogramas)
2. DEPOIS adapte para as necessidades específicas do aluno
3. Use linguagem apropriada para ${studentContext.class_grade}
4. Resposta máxima: 3 frases curtas
5. Termine com uma pergunta interativa ou oferecendo 2 opções simples
6. Se houver necessidades especiais, adapte o método de explicação

PERGUNTA DO ALUNO: "${question}"

Responda de forma personalizada considerando AMBOS os contextos (turma E aluno).`

      console.log('🤖 Sending prompt to OpenRouter AI...')
      
      let answer = 'Desculpe, não consegui processar sua pergunta. Tente novamente ou consulte seu professor.'
      
      // 🌐 LÓGICA AUTOMÁTICA PARA MODELOS :ONLINE
      let finalModel = aiModel;
      
      // Para esta função, vamos verificar se há necessidade de web search baseado na pergunta
      const needsWebSearch = /\b(hoje|agora|atual|recente|último|nova|notícia|preço|cotação|tempo|clima)\b/i.test(question);
      
      // Usar helper centralizado para converter modelo, se necessário
      const converted = toOnlineIfNeeded(finalModel, needsWebSearch)
      if (converted !== finalModel) {
        console.log(`🌐 Modelo automaticamente convertido para versão :online: ${finalModel} → ${converted}`)
        finalModel = converted
      }
      

      try {
        const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://clever-school-pal.com',
            'X-Title': 'Clever School Pal'
          },
          body: JSON.stringify({
            model: finalModel,
            messages: [
              {
                role: 'system',
                content: aiPrompt
              },
              {
                role: 'user',
                content: question
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        })

        if (response.ok) {
          const aiData = await response.json()
          answer = aiData.choices[0].message.content || "Hmm, não consegui processar a tua pergunta agora. Podes tentar reformular? 😊"
          console.log('✅ AI response generated with context')
          
          // Cache the response for future use (only if it's a good answer)
          if (answer.length > 20 && !answer.includes('não sei') && !answer.includes('professor')) {
            await supabase
              .from('response_cache')
              .insert({
                question_hash: questionHash,
                question_text: question,
                answer: answer,
                school_id: studentContext.school_id,
                class_id: studentContext.class_id
              })
              .catch(err => console.log('Cache insert failed (normal for duplicates):', err.message))
          }
        } else {
          console.warn('OpenRouter AI generation failed:', response.status)
          
          // Create a basic contextual response
          if (studentContext.student_special_context) {
            answer = `Olá ${studentContext.student_name}! Como sei que você aprende melhor de forma visual e com explicações diretas, vou adaptar minha resposta para isso. Sobre que tópico específico você gostaria de saber mais?`
          } else {
            answer = `Olá! Sou o assistente da turma ${studentContext.class_name}. Sobre que matéria posso te ajudar hoje?`
          }
        }
      } catch (error) {
        console.warn('AI request failed:', error)
        
        // Create context-aware fallback
        if (studentContext.student_special_context) {
          answer = `Olá ${studentContext.student_name}! Como sei que você aprende melhor de forma visual, que tal escolher um tópico? 1) Matemática, 2) Ciências, 3) Português. Qual prefere?`
        } else {
          answer = `Olá da turma ${studentContext.class_name}! Como posso ajudar? 1) Matemática, 2) Ciências, 3) Português.`
        }
      }

      const processingTime = Date.now() - startTime

      // Log the interaction with context information
      await supabase
        .from('chat_logs')
        .insert({
          student_id: studentContext.student_id,
          question: question,
          answer: answer,
          relevant_content_count: relevantContent.length,
          school_id: studentContext.school_id,
          response_type: 'context_aware_ai',
          context_used: studentContext.student_special_context ? 'student_and_class' : 'class_only',
          processing_time_ms: processingTime
        })

      console.log(`✅ Response generated in ${processingTime}ms with full context`)

      return new Response(
        JSON.stringify({
          canRespond: true,
          answer: answer,
          student: {
            id: studentContext.student_id,
            name: studentContext.student_name,
            firstName: studentContext.student_name.split(' ')[0],
            grade: studentContext.class_grade,
            class: studentContext.class_name,
            school: studentContext.school_name
          },
          relevantContentCount: relevantContent.length,
          searchType: 'context_aware_search',
          cached: false,
          processingTime: processingTime,
          contextUsed: {
            classContext: !!studentContext.class_general_context,
            studentContext: !!studentContext.student_special_context,
            contextHierarchy: 'class_first_then_student'
          },
          aiPersonality: 'context_aware_adaptive_tutor'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        canRespond: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})