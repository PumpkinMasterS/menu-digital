import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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
    const aiModel = Deno.env.get('AI_MODEL') || 'deepseek/deepseek-chat'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const { phoneNumber, question, schoolId } = await req.json()

      if (!phoneNumber || !question) {
        return new Response(
          JSON.stringify({ error: 'Phone number and question are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const startTime = Date.now()

      // FIND STUDENT with complete hierarchical context
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          phone_number,
          class_id,
          school_id,
          active,
          bot_active,
          classes!inner(
            id,
            name,
            grade,
            school_id,
            schools!inner(
              id,
              name
            )
          )
        `)
        .eq('phone_number', phoneNumber)
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

      console.log(`🎓 STUDENT: ${student.name} | ${student.classes?.grade || 'N/A'} | ${student.classes?.name || 'Sem turma'} | ${student.classes?.schools?.name || 'Sem escola'}`)

      // Get conversation history
      const { data: recentChats } = await supabase
        .from('chat_logs')
        .select('question, answer, created_at')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(2)

      // GET TOPICS from this specific class
      const { data: classTopics } = await supabase
        .from('content_classes')
        .select(`
          contents!inner(
            id,
            title,
            description,
            status,
            subjects!inner(
              name
            )
          )
        `)
        .eq('class_id', student.class_id)
        .eq('contents.status', 'ativo')

      console.log(`📚 TOPICS FOUND: ${classTopics?.length || 0} for ${student.classes?.name || 'Sem turma'}`)
      
      // Build specific context
      const studentInfo = {
        name: student.name.split(' ')[0],
        grade: student.classes?.grade || 'N/A',
        class: student.classes?.name || 'Sem turma',
        school: student.classes?.schools?.name || 'Sem escola'
      }

      // Organize topics by subject
      const availableTopics = classTopics?.map(ct => ({
        title: ct.contents.title,
        description: ct.contents.description,
        subject: ct.contents.subjects.name
      })) || []

      // GROUP BY SUBJECT
      const subjectTopics: { [key: string]: any[] } = {}
      availableTopics.forEach(topic => {
        if (!subjectTopics[topic.subject]) {
          subjectTopics[topic.subject] = []
        }
        subjectTopics[topic.subject].push(topic)
      })

      console.log(`🎯 SUBJECTS: ${Object.keys(subjectTopics).join(', ')}`)

      // CHECK IF QUESTION IS RELATED TO AVAILABLE TOPICS
      const questionLower = question.toLowerCase()
      const relatedTopics = availableTopics.filter(topic => {
        const titleWords = topic.title.toLowerCase().split(' ')
        const descWords = (topic.description || '').toLowerCase().split(' ')
        const questionWords = questionLower.split(' ').filter(w => w.length > 2)
        
        return questionWords.some(qw => 
          titleWords.some(tw => tw.includes(qw) || qw.includes(tw)) ||
          descWords.some(dw => dw.includes(qw) || qw.includes(dw))
        )
      })

      console.log(`🔍 RELATED TOPICS: ${relatedTopics.length}`)

      // RESTRICTIVE: Only respond if question relates to available topics
      if (relatedTopics.length === 0 && availableTopics.length > 0) {
        const availableSubjects = Object.keys(subjectTopics).join(', ')
        const availableTopicsList = availableTopics.slice(0, 3).map(t => t.title).join(', ')
        
        const restrictiveAnswer = `Olá ${studentInfo.name}! 😊 Sou o tutor da ${studentInfo.school} para a turma ${studentInfo.class}. Apenas posso ajudar com os tópicos do programa do ${studentInfo.grade}. 

Temas disponíveis: ${availableTopicsList}${availableTopics.length > 3 ? '...' : ''}

Sobre que tópico específico queres saber?`

        await supabase
          .from('chat_logs')
          .insert({
            student_id: student.id,
            question: question,
            answer: restrictiveAnswer,
            relevant_content_count: 0,
            school_id: student.school_id,
            response_type: 'restrictive_out_of_scope',
            context_used: 'first_interaction',
            processing_time_ms: Date.now() - startTime
          })

        return new Response(
          JSON.stringify({
            canRespond: true,
            answer: restrictiveAnswer,
            student: {
              id: student.id,
              name: student.name,
              firstName: studentInfo.name,
              grade: studentInfo.grade,
              class: studentInfo.class,
              school: studentInfo.school
            },
            restriction: 'out_of_scope',
            availableTopics: availableTopics.map(t => t.title),
            processingTime: Date.now() - startTime,
            educationalStructure: 'restrictive_scope'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // BUILD SPECIFIC PROMPT FOR RELATED TOPICS
      const conversationMemory = recentChats ? 
        recentChats.slice().reverse().map((chat, i) => 
          `${studentInfo.name}: ${chat.question}\nTutor: ${chat.answer}`
        ).join('\n') : ''

      const specificPrompt = `És o tutor da ${studentInfo.school} para ${studentInfo.name} da turma ${studentInfo.class} (${studentInfo.grade}).

CONTEXTO ESPECÍFICO:
👤 Aluno: ${studentInfo.name}
🎓 Turma: ${studentInfo.class}
📚 Ano: ${studentInfo.grade}
🏫 Escola: ${studentInfo.school}

CONVERSA ANTERIOR:
${conversationMemory || 'Primeira conversa.'}

PERGUNTA: "${question}"

TÓPICOS RELACIONADOS:
${relatedTopics.map(topic => `• ${topic.title}: ${topic.description || 'Tópico do programa'}`).join('\n')}

INSTRUÇÕES RESTRITIVAS:
- Responde APENAS sobre os tópicos relacionados listados
- Máximo 100 palavras
- Tom direto e didático
- Usa o nome ${studentInfo.name}
- Menciona que é da turma ${studentInfo.class}
- Explica de forma clara para o ${studentInfo.grade}
- Termina com pergunta específica do tópico
- NÃO dês informação fora dos tópicos disponíveis

RESPOSTA ESPECÍFICA:`

      let answer = `Olá ${studentInfo.name}! 😊`

      try {
        const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { 
                role: 'system', 
                content: `És um tutor especializado da ${studentInfo.school} para turmas do ${studentInfo.grade}. Dás respostas concisas, específicas e didáticas APENAS sobre os tópicos do programa da turma. Nunca respondes fora do âmbito dos tópicos disponíveis.`
              },
              { role: 'user', content: specificPrompt }
            ],
            temperature: 0.7, // Lower for more focused responses
            max_tokens: 150,   // Shorter responses
            top_p: 0.8,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
          })
        })

        if (response.ok) {
          const aiData = await response.json()
          answer = aiData.choices[0].message.content || answer
          console.log('✅ SPECIFIC AI RESPONSE GENERATED')
        } else {
          console.error('❌ OpenRouter AI API error:', await response.text())
          throw new Error('AI API failed')
        }
      } catch (error) {
        console.warn('⚠️ AI via OpenRouter failed, using specific fallback:', error)
        
        // Specific fallback based on related topics
        const topicTitle = relatedTopics[0]?.title || 'este tópico'
        answer = `Olá ${studentInfo.name}! Sobre ${topicTitle} na turma ${studentInfo.class}, é um tema importante do ${studentInfo.grade}. Que aspeto específico queres explorar?`
      }

      const processingTime = Date.now() - startTime

      // Log the interaction
      await supabase
        .from('chat_logs')
        .insert({
          student_id: student.id,
          question: question,
          answer: answer,
          relevant_content_count: relatedTopics.length,
          school_id: student.school_id,
          response_type: 'specific_restrictive_ai',
          context_used: conversationMemory ? 'with_memory' : 'first_interaction',
          processing_time_ms: processingTime,
          available_topics: relatedTopics.map(t => t.title).join(', '),
          class_subjects: Object.keys(subjectTopics).join(', ')
        })

      console.log(`✅ SPECIFIC RESPONSE: ${relatedTopics.length} related topics, ${processingTime}ms`)

      return new Response(
        JSON.stringify({
          canRespond: true,
          answer: answer,
          student: {
            id: student.id,
            name: student.name,
            firstName: studentInfo.name,
            grade: studentInfo.grade,
            class: studentInfo.class,
            school: studentInfo.school
          },
          specificContext: {
            relatedTopics: relatedTopics.length,
            totalTopics: availableTopics.length,
            subjects: Object.keys(subjectTopics).length,
            relatedTopicTitles: relatedTopics.map(t => t.title)
          },
          conversationMemory: !!conversationMemory,
          processingTime: processingTime,
          aiPersonality: 'specific_restrictive_tutor',
          educationalStructure: 'escola_turma_disciplinas_topicos_especificos'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})