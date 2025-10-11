import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface StudentContext {
  id: string;
  name: string;
  phone: string;
  school: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    grade: string;
  };
}

interface TopicContent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  content_data: string;
  learning_objectives: string;
  subject: {
    name: string;
    grade: string;
  };
  difficulty: string;
  similarity: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messages, phone } = await req.json()
    const userMessage = messages[messages.length - 1]?.content || ""

    console.log("📞 Recebida mensagem de:", phone)
    console.log("💬 Mensagem:", userMessage)

    // 1. BUSCAR CONTEXTO DO ESTUDANTE
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select(`
        id, name, phone_number,
        schools!students_school_id_fkey(id, name),
        classes!students_class_id_fkey(id, name, grade)
      `)
      .eq('phone_number', phone)
      .eq('bot_active', true)
      .single()

    if (studentError || !student) {
      console.log("❌ Estudante não encontrado ou bot inativo")
      return new Response(
        JSON.stringify({
          reply: "Olá! Não consegui identificar-te no sistema. Por favor contacta a escola para ativares o bot educativo. 📚"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const studentContext: StudentContext = {
      id: student.id,
      name: student.name,
      phone: student.phone_number,
      school: {
        id: student.schools.id,
        name: student.schools.name
      },
      class: {
        id: student.classes.id,
        name: student.classes.name,
        grade: student.classes.grade
      }
    }

    console.log("✅ Contexto do estudante:", JSON.stringify(studentContext, null, 2))

    // 2. GERAR EMBEDDING DA PERGUNTA (OpenRouter)
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    const openRouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
    const embeddingModel = Deno.env.get('EMBEDDING_MODEL') || 'mistral/mistral-embed'

    const embeddingResponse = await fetch(`${openRouterBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: userMessage,
        model: embeddingModel
      })
    })

    if (!embeddingResponse.ok) {
      throw new Error('Erro ao gerar embedding via OpenRouter')
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding

    // 3. BUSCAR TÓPICOS RELEVANTES (BUSCA SEMÂNTICA + FILTRO POR TURMA)
    const { data: topics, error: topicsError } = await supabaseClient.rpc(
      'search_topic_content_by_similarity',
      {
        query_embedding: queryEmbedding,
        class_id: studentContext.class.id,
        similarity_threshold: 0.6,
        match_count: 3
      }
    )

    if (topicsError) {
      console.error("❌ Erro na busca de tópicos:", topicsError)
    }

    console.log("🔍 Tópicos encontrados:", topics?.length || 0)

    // 4. CONSTRUIR CONTEXTO PARA O LLM
    let aiContext = ""
    let availableTopics: TopicContent[] = []

    if (topics && topics.length > 0) {
      availableTopics = topics
      aiContext = topics.map((topic: TopicContent, index: number) => 
        `TÓPICO ${index + 1}: ${topic.title}
Subtítulo: ${topic.subtitle}
Descrição: ${topic.description}
Orientações para ensino: ${topic.content_data}
Objetivos de aprendizagem: ${topic.learning_objectives}
Disciplina: ${topic.subject.name}
Dificuldade: ${topic.difficulty}
Relevância: ${(topic.similarity * 100).toFixed(1)}%
---`
      ).join('\n\n')
    }

    // 5. BUSCAR HISTÓRICO DE CONVERSAS RECENTES
    const { data: recentChats } = await supabaseClient
      .from('chat_logs')
      .select('question, answer')
      .eq('student_id', studentContext.id)
      .order('created_at', { ascending: false })
      .limit(2)

    const chatHistory = recentChats?.map(chat => 
      `Estudante: ${chat.question}\nTutor: ${chat.answer}`
    ).join('\n\n') || ""

    // 6. CONSTRUIR PROMPT PARA O LLM
    const systemPrompt = `És um tutor especializado da ${studentContext.school.name} para o estudante ${studentContext.name} da turma ${studentContext.class.name} (${studentContext.class.grade}).

DIRETRIZES RÍGIDAS:
- Responder APENAS sobre tópicos curriculares da turma ${studentContext.class.grade}
- Máximo 100 palavras por resposta
- Tom didático e apropriado para ${studentContext.class.grade}
- Terminar sempre com uma pergunta específica
- Se a pergunta não relaciona com os tópicos disponíveis, listar os tópicos que podes ensinar

TÓPICOS DISPONÍVEIS PARA ESTA TURMA:
${aiContext || "Nenhum tópico específico encontrado para esta pergunta."}

HISTÓRICO RECENTE:
${chatHistory}

Se a pergunta do estudante NÃO relaciona com nenhum tópico disponível, responde:
"Posso ajudar-te com estes tópicos da turma ${studentContext.class.name}:
[lista dos tópicos principais da turma]

Sobre qual gostarias de aprender?"

Se a pergunta RELACIONA com algum tópico, desenvolve uma explicação didática baseada nas orientações do tópico, adaptando a linguagem para ${studentContext.class.grade}.`

    // 7. CHAMAR O LLM (OpenRouter)
    const aiModel = Deno.env.get('AI_MODEL') || 'deepseek/deepseek-chat'
    const llmResponse = await fetch(`${openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    })

    if (!llmResponse.ok) {
      throw new Error('Erro ao chamar LLM via OpenRouter')
    }

    const llmData = await llmResponse.json()
    const aiReply = llmData.choices[0].message.content

    console.log("🤖 Resposta do AI:", aiReply)

    // 8. GUARDAR NO HISTÓRICO DE CONVERSAS
    const topicIds = availableTopics.map(topic => topic.id)
    
    await supabaseClient.from('chat_logs').insert({
      student_id: studentContext.id,
      question: userMessage,
      answer: aiReply,
      content_ids: topicIds
    })

    // 9. RESPONDER
    return new Response(
      JSON.stringify({
        reply: aiReply,
        context: {
          student: studentContext.name,
          school: studentContext.school.name,
          class: studentContext.class.name,
          topics_found: availableTopics.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({
        reply: "Desculpa, ocorreu um erro técnico. Tenta novamente em alguns instantes. 🔧"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  }
})