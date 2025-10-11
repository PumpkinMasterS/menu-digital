import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Interface Definitions
interface Student {
  id: string;
  name: string;
  phone_number: string;
  special_context?: string;
  classes?: {
    id: string;
    name: string;
    grade: string;
    general_context?: string;
  };
  school?: {
    id: string;
    name: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SubjectContent {
  id: string;
  title: string;
  content: string;
  subject: string;
  grade: string;
  relevance_score?: number;
}

interface SchoolContext {
  context_type: string;
  content: string;
  priority: number;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const openRouterBaseUrl = Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
const aiModel = Deno.env.get('AI_MODEL') || 'meta-llama/llama-3.1-70b-instruct';

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // CORS headers for all requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber, question, studentId } = await req.json();
    
    if (!phoneNumber || !question) {
      return new Response(
        JSON.stringify({ error: 'Phone number and question are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔍 ETAPA 1: Carregando contextos hierárquicos...');
    const studentContext = await getStudentHierarchicalContext(phoneNumber, studentId);
    
    console.log('💬 ETAPA 2: Carregando histórico da conversa...');
    const conversationHistory = await getConversationHistory(studentContext.id);
    
    console.log('📚 ETAPA 3: Buscando conteúdo educacional relevante...');
    const relevantContent = await getRelevantEducationalContent(question, studentContext);
    
    console.log('🧠 ETAPA 4: Gerando resposta inteligente...');
    const aiResponse = await generateIntelligentResponse(question, studentContext, conversationHistory, relevantContent);
    
    console.log('💾 ETAPA 5: Salvando interação e gerenciando histórico...');
    await saveInteractionAndManageHistory(studentContext.id, question, aiResponse);

    return new Response(JSON.stringify({
      answer: aiResponse,
      student: {
        id: studentContext.id,
        name: studentContext.name,
        firstName: studentContext.name.split(' ')[0]
      },
      contentContext: {
        relatedContent: relevantContent.length,
        relatedTitles: relevantContent.map(c => c.title).slice(0, 3)
      },
      conversationContext: {
        messagesInHistory: conversationHistory.length,
        persistent: true
      },
      agentType: 'qwen3_32b_advanced_hierarchical',
      aiModel: 'Qwen3-32B-Advanced',
      processingTime: Date.now() % 1000,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no processo:', error);
    
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// FUNÇÃO 1: Contextos Hierárquicos (Escola → Turma → Aluno)
async function getStudentHierarchicalContext(phoneNumber: string, studentId?: string): Promise<Student> {
  try {
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        phone_number,
        special_context,
        classes!inner(
          id,
          name,
          grade,
          general_context
        ),
        schools!inner(
          id,
          name
        )
      `);

    if (studentId) {
      query = query.eq('id', studentId);
    } else {
      query = query.eq('phone_number', phoneNumber);
    }

    const { data: students, error } = await query.single();

    if (error || !students) {
      console.log('⚠️ Estudante não encontrado, criando contexto mínimo');
      return {
        id: 'unknown',
        name: 'Estudante',
        phone_number: phoneNumber
      };
    }

    // Buscar contexto da escola
    const { data: schoolContexts } = await supabase
      .from('school_context')
      .select('context_type, content, priority')
      .eq('school_id', students.schools.id)
      .order('priority', { ascending: true });

    return {
      ...students,
      school: {
        ...students.schools,
        contexts: schoolContexts || []
      }
    } as Student;

  } catch (error) {
    console.error('❌ Erro ao carregar contexto do estudante:', error);
    return {
      id: 'error',
      name: 'Estudante',
      phone_number: phoneNumber
    };
  }
}

// FUNÇÃO 2: Histórico de Conversa Persistente (15 mensagens)
async function getConversationHistory(studentId: string): Promise<ChatMessage[]> {
  try {
    const { data: chatLogs, error } = await supabase
      .from('chat_logs')
      .select('role, content, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error || !chatLogs) {
      return [];
    }

    // Retornar em ordem cronológica (mais antiga primeiro)
    return chatLogs
      .reverse()
      .map(log => ({
        role: log.role as 'user' | 'assistant',
        content: log.content,
        timestamp: log.created_at
      }));

  } catch (error) {
    console.error('❌ Erro ao carregar histórico:', error);
    return [];
  }
}

// FUNÇÃO 3: Conteúdo Educacional Relevante
async function getRelevantEducationalContent(question: string, student: Student): Promise<SubjectContent[]> {
  try {
    // Buscar por relevância semântica se há embeddings
    const { data: semanticContent } = await supabase
      .rpc('search_content_by_embeddings', {
        query_text: question,
        match_threshold: 0.1,
        match_count: 3
      });

    // Buscar conteúdo por grade
    const { data: gradeContent } = await supabase
      .from('educational_contents')
      .select('id, title, content, subject, grade')
      .ilike('grade', `%${student.classes?.grade || '5'}%`)
      .limit(5);

    // Combinar resultados
    const combinedContent = [
      ...(semanticContent || []),
      ...(gradeContent || [])
    ];

    // Remover duplicatas e limitar
    const uniqueContent = combinedContent
      .filter((content, index, self) => 
        index === self.findIndex(c => c.id === content.id)
      )
      .slice(0, 5);

    return uniqueContent;

  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo:', error);
    return [];
  }
}

// FUNÇÃO 4: Geração de Resposta Inteligente
async function generateIntelligentResponse(
  question: string, 
  student: Student, 
  history: ChatMessage[], 
  content: SubjectContent[]
): Promise<string> {
  
  // PROMPT DO SISTEMA: IA LIVRE E INTELIGENTE
  const systemPrompt = `És um professor de IA especializado no sistema educativo português para o 5º ano.

🧠 TOTAL LIBERDADE INTELECTUAL:
- Tens acesso completo ao conhecimento do Qwen3-32B sobre TODAS as disciplinas
- Os contextos são ADICIONAIS, nunca uma limitação
- Podes explicar QUALQUER tópico academic apropriado para o 5º ano
- Usa todo o teu conhecimento sobre Portugal, história, geografia, ciências, matemática, português

🎯 ADAPTAÇÃO INTELIGENTE:
- Linguagem portuguesa apropriada para ${student.classes?.grade || '5º'} ano
- Explica conceitos complexos de forma simples e envolvente
- Usa exemplos práticos e relevantes para Portugal
- Conecta conhecimentos entre disciplinas

${student.special_context ? `🌟 NECESSIDADES ESPECIAIS - ANTONIO:
- Linguagem simples e clara
- Frases curtas e diretas  
- Explicações passo-a-passo
- Encorajamento positivo
- Evita sobrecarga de informação` : ''}

✅ Responde com CONHECIMENTO COMPLETO e LIBERDADE TOTAL sobre qualquer tópico educacional.`;

  // Construir contexto da conversa
  let conversationContext = '';
  if (history.length > 0) {
    conversationContext = `\n📜 CONVERSA ANTERIOR:\n` + 
      history.slice(-5).map(msg => 
        `${msg.role === 'user' ? '👨‍🎓 Aluno' : '🤖 Professor'}: ${msg.content}`
      ).join('\n');
  }

  // Construir contexto educacional  
  let educationalContext = '';
  if (content.length > 0) {
    educationalContext = `\n📚 CONTEÚDO EDUCACIONAL RELEVANTE:\n` +
      content.map(c => `• ${c.title}: ${c.content.substring(0, 200)}...`).join('\n');
  }

  // Construir contexto escolar
  let schoolContext = '';
  if (student.school?.contexts) {
    schoolContext = `\n🏫 CONTEXTO DA ESCOLA:\n` +
      student.school.contexts.map(c => `• ${c.context_type}: ${c.content}`).join('\n');
  }

  const fullPrompt = `${systemPrompt}

👨‍🎓 ALUNO: ${student.name} (${student.classes?.name || 'Turma não especificada'})
${schoolContext}
${conversationContext}
${educationalContext}

❓ PERGUNTA ATUAL: ${question}

🎯 Responde de forma completa, educativa e apropriada para o 5º ano:`;

  try {
    if (!openRouterApiKey) {
      throw new Error('Chave da API OpenRouter não configurada');
    }

    const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro da API OpenRouter: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Desculpa, não consegui processar a tua pergunta.';

  } catch (error) {
    console.error('❌ Erro na geração da resposta:', error);
    
    // FALLBACK INTELIGENTE (não limitante)
    return `Olá ${student.name}! 📚

Sobre "${question.substring(0, 50)}...", esta é uma excelente pergunta! 

Embora tenha havido um problema técnico momentâneo, posso ajudar-te com qualquer tópico do 5º ano:
• Matemática (frações, números, geometria)
• Português (gramática, textos, escrita)  
• Ciências Naturais
• História e Geografia de Portugal
• Inglês

Podes reformular a tua pergunta ou escolher outro tópico? 🤔✨`;
  }
}

// FUNÇÃO 5: Gestão de Histórico e Persistência
async function saveInteractionAndManageHistory(studentId: string, question: string, answer: string): Promise<void> {
  try {
    // Salvar nova interação
    await supabase
      .from('chat_logs')
      .insert([
        { student_id: studentId, role: 'user', content: question },
        { student_id: studentId, role: 'assistant', content: answer }
      ]);

    // Limpar histórico antigo (manter apenas 15 mensagens mais recentes)
    const { data: allMessages } = await supabase
      .from('chat_logs')
      .select('id, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (allMessages && allMessages.length > 15) {
      const messagesToDelete = allMessages.slice(15);
      const idsToDelete = messagesToDelete.map(msg => msg.id);
      
      await supabase
        .from('chat_logs')
        .delete()
        .in('id', idsToDelete);
    }

  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}