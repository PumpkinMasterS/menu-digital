import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { toOnlineIfNeeded } from '../_shared/onlineModel.ts';
import type { HierarchicalContext } from '../../shared/context-registry.ts';

// Tipos mínimos necessários usados neste arquivo
interface Student {
  id: string;
  name: string;
  whatsapp_number?: string;
  phone_number?: string;
  special_context?: string;
  class_id?: string;
  school_id?: string;
  classes?: {
    id: string;
    name: string;
    grade?: string;
    general_context?: string;
    subjects?: any[];
  };
  school?: {
    id: string;
    name: string;
    contexts?: Array<{
      context_type: string;
      title?: string;
      content: string;
      priority: number;
      active?: boolean;
    }>;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SubjectContent {
  id?: string;
  title?: string;
  content?: string;
  subject?: string;
  grade?: string;
  relevance_score?: number;
}

interface ContentAnalysisResult {
  needsContent: boolean;
  keywords: string[];
  reasoning?: string;
}

// Inicialização do cliente Supabase para uso nas funções
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
if (!supabaseUrl || !supabaseKey) {
  console.warn('Atenção: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY/ANON_KEY não configuradas no ambiente.');
}
export const supabase = createClient(supabaseUrl, supabaseKey);

// FUN��O 1: Contextos Hier�rquicos Completos (Escola ? Turma ? Disciplinas ? Aluno)
async function getStudentHierarchicalContext(phoneNumber: string, studentId?: string): Promise<Student> {
  try {
    // Primeiro buscar o estudante
    let studentQuery = supabase
      .from('students')
      .select('*');

    if (studentId) {
      studentQuery = studentQuery.eq('id', studentId);
    } else {
      studentQuery = studentQuery.eq('whatsapp_number', phoneNumber);
    }

    const { data: student, error: studentError } = await studentQuery.single();
    
    if (studentError || !student) {
      console.log('?? Estudante n�o encontrado:', studentError);
      console.log('?? phoneNumber recebido:', phoneNumber);
      console.log('?? studentId recebido:', studentId);
      
      // Se for o Antonio (+351999999999), usar dados completos
      if (phoneNumber === '+351999999999' || studentId === 'antonio') {
        console.log('? � o Antonio! Carregando dados hardcoded...');
        
        // Buscar ou criar contexto da escola
        const { data: schoolContext } = await supabase
          .from('school_context')
          .select('context_type, title, content, priority, active')
          .eq('school_id', '550e8400-e29b-41d4-a716-446655440000')
          .eq('active', true)
          .order('priority', { ascending: true });

        return {
          id: 'antonio',
          name: 'Antonio',
          whatsapp_number: phoneNumber,
          special_context: 'Aluno com necessidades especiais de aprendizagem. Requer explica��es mais detalhadas e exemplos pr�ticos.',
          classes: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: '7� Ano A',
            grade: '7� Ano',
            general_context: 'Turma focada em matem�tica e ci�ncias com apoio especializado.',
            subjects: []
          },
          school: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Escola Santa Maria',
            contexts: schoolContext || [
              {
                context_type: 'general',
                title: 'Miss�o da Escola',
                content: 'A Escola Santa Maria � conhecida pela sua abordagem inclusiva e apoio especializado a alunos com necessidades especiais. Ambiente acolhedor e colaborativo.',
                priority: 1,
                active: true
              }
            ]
          }
        };
      }
      
      // Para outros casos, usar contexto m�nimo  
      console.log('? N�O encontrado, usando fallback gen�rico...');
      return {
        id: 'unknown',
        name: 'Estudante',
        whatsapp_number: phoneNumber
      };
    }
    
    console.log('? Estudante encontrado:', student.name);
    
    // Buscar dados da turma
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', student.class_id)
      .single();
      
    if (classError) {
      console.log('? Erro ao buscar turma:', classError);
    }
    
    // Buscar dados da escola
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', classData?.school_id)
      .single();
      
    if (schoolError) {
      console.log('? Erro ao buscar escola:', schoolError);
    }
    
    const students = {
      ...student,
      classes: classData,
      school: schoolData
    };

    // Buscar contextos da escola
    const { data: schoolContexts } = await supabase
      .from('school_context')
      .select('context_type, title, content, priority, active')
      .eq('school_id', students.school?.id)
      .eq('active', true)
      .order('priority', { ascending: true });

    // Buscar disciplinas da turma
    const { data: subjects } = await supabase
      .from('class_subjects')
      .select(`
        subjects(
          id,
          name,
          description,
          teacher_name,
          grade
        )
      `)
      .eq('class_id', students.classes?.id);

    const subjectsInfo = subjects?.map(s => s.subjects).filter(Boolean) || [];

    return {
      ...students,
      classes: {
        ...students.classes,
        subjects: subjectsInfo
      },
      school: {
        ...students.school,
        contexts: schoolContexts || []
      }
    } as Student;

  } catch (error) {
    console.error('? Erro ao carregar contexto hier�rquico:', error);
    return {
      id: 'error',
      name: 'Estudante',
      whatsapp_number: phoneNumber
    };
  }
}

// FUN��O 2: Hist�rico de Conversa Persistente e Inteligente (15 mensagens)
async function getConversationHistory(studentId: string): Promise<ChatMessage[]> {
  try {
    const { data: chatLogs, error } = await supabase
      .from('chat_logs')
      .select('question, answer, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(7); // 7 intera��es = 14 mensagens (pergunta + resposta)

    if (error || !chatLogs) {
      return [];
    }

    // Converter para formato de chat alternado
    const messages: ChatMessage[] = [];
    
    chatLogs.reverse().forEach(log => {
      messages.push({
        role: 'user',
        content: log.question,
        timestamp: log.created_at
      });
      messages.push({
        role: 'assistant',
        content: log.answer,
        timestamp: log.created_at
      });
    });

    return messages.slice(-15); // Manter m�ximo 15 mensagens

  } catch (error) {
    console.error('? Erro ao carregar hist�rico inteligente:', error);
    return [];
  }
}

// 
// ================= OpenRouter configuration =================
// L� as credenciais do OpenRouter do ambiente (Supabase Edge Functions usam Deno.env)
const openrouterApiKey = (typeof Deno !== 'undefined' ? (Deno.env.get('OPENROUTER_API_KEY') || '') : (globalThis?.process?.env?.OPENROUTER_API_KEY || ''));
const openrouterBaseUrl = ((typeof Deno !== 'undefined' ? (Deno.env.get('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1') : (globalThis?.process?.env?.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1')) as string).replace(/\/+$/,'');
// ============================================================FUN��O 3: An�lise Inteligente da Necessidade de Conte�dos Educacionais
async function analyzeContentNeed(
  question: string, 
  student: Student, 
  history: ChatMessage[], 
  hierarchicalContext?: HierarchicalContext,
  customPersonality?: string,
  aiModel?: string, // ?? NOVO: Modelo de IA selecionado pelo frontend
  platform: string = 'web'
): Promise<ContentAnalysisResult> {
  try {
    console.log('?? Analisando se a IA precisa de conte�dos educacionais...');
    
    // ? OpenRouter API check - todos os modelos agora s�o do OpenRouter
    const selectedModel = aiModel || 'deepseek/deepseek-chat:online';
    if (!openrouterApiKey) {
      console.warn('OpenRouter n�o configurado (OPENROUTER_API_KEY ausente). Usando fallback.');
      return analyzeContentNeedFallback(question);
    }

    // Construir contexto mínimo para análise
    let personalityPrompt = '';
    const registryPersonality = hierarchicalContext?.global?.personality?.trim();
    const customTrim = (customPersonality && customPersonality.trim() !== '' && customPersonality !== 'original') ? customPersonality.trim() : '';
    const effectivePersonality = registryPersonality || customTrim;
    if (effectivePersonality) {
      personalityPrompt = `?? PERSONALIDADE DA IA:\n${effectivePersonality}\n\n`;
    } else {
      const modelName = selectedModel || 'deepseek/deepseek-chat:online';
      personalityPrompt = `?? PERSONALIDADE DA IA:\nVocê é um assistente educacional avançado (${modelName}), especializado em educação.\n\n`;
    }

    let contextInfo = '';
    if (student.classes) {
      contextInfo += `?? CONTEXTO: Aluno ${student.name} da turma ${student.classes.name} (${student.classes.grade})\n`;
    }
    if (student.special_context) {
      contextInfo += `?? ADAPTA��ES: ${student.special_context}\n`;
    }

    const analysisPrompt = `${personalityPrompt}${contextInfo}

?? AN�LISE DE NECESSIDADE DE CONTE�DOS:

Pergunta do aluno: "${question}"

Voc� precisa decidir se precisa de conte�dos educacionais espec�ficos da base de dados para responder adequadamente.

Responda EXATAMENTE no formato JSON:
{
  "needsContent": true/false,
  "keywords": ["palavra1", "palavra2"] (apenas se needsContent for true),
  "reasoning": "breve explica��o de 1 linha"
}

QUANDO PRECISA de conte�dos (needsContent: true):
- Perguntas sobre mat�rias espec�ficas (matem�tica, ci�ncias, portugu�s, etc.)
- Pedidos de explica��o de conceitos educacionais
- Exerc�cios ou problemas para resolver
- Prepara��o para testes/exames

QUANDO N�O PRECISA de conte�dos (needsContent: false):
- Cumprimentos simples (ol�, bom dia)
- Perguntas temporais (que horas s�o, que dia � hoje)
- Conversas casuais
- Agradecimentos
- Perguntas sobre o pr�prio aluno ou turma

Responda apenas o JSON, sem explica��es extras.`;

    const requestParams = {
      model: selectedModel, // ?? USAR MODELO SELECIONADO
      messages: [
        { role: 'system', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      top_p: 1.0,
      stream: false
    };

    const url = `${openrouterBaseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clever-school-pal-ai', 
      'X-Title': 'EduBot Content Analysis'
    } as Record<string, string>;

    // ?? TIMEOUT OTIMIZADO PARA WHATSAPP
    const timeoutMs = parseInt(Deno.env.get('WHATSAPP_AI_REQUEST_TIMEOUT') || '10000');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // ?? OTIMIZA��ES DE CONEX�O HTTP
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestParams),
      signal: controller.signal,
      // Otimiza��es de conex�o
      keepalive: true, // Keep-alive para reutilizar conex�es
    };
    
    // Adicionar compress�o se suportada
    if (platform === 'whatsapp') {
      headers['Accept-Encoding'] = 'gzip, deflate, br';
    }
    
    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('An�lise IA falhou no provedor selecionado, usando fallback');
      return analyzeContentNeedFallback(question);
    }

    const data = await response.json();
    const responseContent = data.choices[0]?.message?.content || '';
    
    console.log('?? Resposta an�lise IA:', responseContent);

    try {
      const result = JSON.parse(responseContent);
      console.log(`?? An�lise: needsContent=${result.needsContent}, reasoning="${result.reasoning}"`);
      return {
        needsContent: result.needsContent,
        keywords: result.keywords || [],
        reasoning: result.reasoning
      };
    } catch (parseError) {
      console.warn('Erro ao parse da an�lise, usando fallback');
      return analyzeContentNeedFallback(question);
    }

  } catch (error: any) {
    console.error('? Erro na an�lise de conte�do:', error);
    return analyzeContentNeedFallback(question);
  }
}

// Fun��o fallback para an�lise simples baseada em keywords
function analyzeContentNeedFallback(question: string): ContentAnalysisResult {
  const educationalKeywords = [
    'matem�tica', 'portugu�s', 'ci�ncias', 'hist�ria', 'geografia', 'ingl�s', 'f�sica', 'qu�mica',
    'exerc�cio', 'exerc�cios', 'problema', 'problemas', 'explicar', 'explica', 'como fazer',
    'o que �', 'define', 'definir', 'resolver', 'resolu��o', 'ajuda', 'ajudar',
    'mat�ria', 'mat�rias', 'aula', 'aulas', 'teste', 'exame', 'avalia��o',
    'estudar', 'estudo', 'aprender', 'ensinar', 'ensina'
  ];

  const casualKeywords = [
    'ol�', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'como est�',
    'obrigado', 'obrigada', 'tchau', 'at� logo', 'que horas', 'que dia',
    'quando', 'onde', 'quem �', 'qual o meu nome'
  ];

  const questionLower = question.toLowerCase();

  // Se cont�m palavras casuais, provavelmente n�o precisa
  if (casualKeywords.some(keyword => questionLower.includes(keyword))) {
    return {
      needsContent: false,
      reasoning: 'Pergunta casual/social'
    };
  }

  // Se cont�m palavras educacionais, provavelmente precisa
  const matchedKeywords = educationalKeywords.filter(keyword => 
    questionLower.includes(keyword)
  );

  if (matchedKeywords.length > 0) {
    return {
      needsContent: true,
      keywords: matchedKeywords,
      reasoning: 'Pergunta educacional detectada'
    };
  }

  // Caso neutro: decidir com base no comprimento e complexidade
  const needsContent = question.length > 20 && !questionLower.includes('?');
  
  return {
    needsContent,
    keywords: needsContent ? [question.split(' ')[0]] : [],
    reasoning: needsContent ? 'Pergunta complexa' : 'Pergunta simples'
  };
}

// FUN��O 4: Conte�do Educacional Contextualizado
async function getRelevantEducationalContent(question: string, student: Student): Promise<SubjectContent[]> {
  try {
    console.log('?? Buscando conte�do educacional relevante...');
    
    // Busca por similaridade sem�ntica usando embedding
    const { data: contentData, error: contentError } = await supabase
      .rpc('search_content_by_similarity', {
        query_text: question,
        match_threshold: 0.3,
        match_count: 5,
        target_school_id: student.school_id,
        target_class_id: student.class_id
      });

    if (contentError) {
      console.error('? Erro na busca de conte�do:', contentError);
      return [];
    }

    console.log(`? Encontrados ${contentData?.length || 0} conte�dos relevantes`);
    return contentData || [];
  } catch (error) {
    console.error('? Erro ao buscar conte�do educacional:', error);
    return [];
  }
}

// FUN��O 4: Gera��o de Resposta Inteligente com Contexto da Escola

// NOVAS FUN��ES: decis�o e detec��o de web search (inseridas automaticamente)
async function needsWebSearch(question: string): Promise<boolean> {
  const patterns: RegExp[] = [
    /\b(hoje|agora|atualmente|neste momento|recentemente)\b/i,
    /\b(not�cias?|manchetes?|�ltimas?|nova?s?)\s+(de\s+)?(hoje|recente|atual)\b/i,
    /\b(o que|que)\s+(aconteceu|est� acontecendo|acontece)\s+(hoje|agora|recentemente)\b/i,
    /\b(pre�o|cota��o|valor)\s+(do\s+)?(d�lar|euro|bitcoin|real|usd|eur|brl)\s+(hoje|atual|agora)\b/i,
    /\b(c�mbio|cambio)\s+(hoje|atual|agora)\b/i,
    /\b(2024|2025|janeiro|fevereiro|mar�o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
    /\b(ontem|esta semana|este m�s|semana passada|m�s passado)\b/i,
    /\b(presidente|elei��o|posse|mandato|governo)\s+(atual|novo|recente|2025)\b/i,
    /\b(quem � o\s+)?(presidente|ministro|l�der)\s+(atual|novo|de\s+2025)\b/i,
    /\b(clima|tempo|temperatura)\s+(hoje|agora|atual)\b/i,
    /\b(resultado|placar|quem ganhou|quem venceu)\s+(hoje|ontem|recente)\b/i,
    /\b(descoberta|pesquisa|estudo)\s+(recente|nova|novo|2025)\b/i
  ];
  const q = question.toLowerCase();
  const hasWebCue = patterns.some(p => p.test(q));
  const educationalPatterns: RegExp[] = [
    /\b(como\s+(resolver|calcular|fazer|estudar|aprender))\b/i,
    /\b(o que �|defini��o|conceito|explica��o)\b/i,
    /\b(exerc�cio|exerc�cios|problema|prova|teste|exame)\b/i,
  ];
  const looksEducational = educationalPatterns.some(p => p.test(q));
  return hasWebCue && !looksEducational;
}

function isCurrentEventsQuery(question: string): boolean {
  const patterns: RegExp[] = [
    /\b(notícias?|manchetes?|headlines?)\s*(de\s+)?(hoje|recente|atual|últimas?)\b/i,
    /\b(o que|que)\s+(aconteceu|está acontecendo|acontece)\s+(hoje|agora|recentemente|no mundo)\b/i,
    /\b(últimas?\s+)?(notícias?|novidades?|informações?)\s+(do\s+)?(brasil|mundo|país)\b/i,
    /\b(breaking|urgente|flash|ao vivo|live)\s+(news|notícia)\b/i,
    /\b(aconteceu\s+hoje|hoje\s+aconteceu)\b/i,
    /\b(eleição|posse|mandato)\s+(recente|nova|novo|2025)\b/i,
    /\b(presidente|governo)\s+(atual|novo|recente)\b/i,
    /\b(esta\s+semana|este\s+mês|ontem|hoje)\b.*\b(aconteceu|notícia|evento)\b/i
  ];
  const q = question.toLowerCase();
  const qn = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isCurr = patterns.some(p => p.test(q));
  const isPriceQuery = /\b(preço|cotação|valor|câmbio|cambio)\s+(do\s+)?(dólar|euro|bitcoin|real|usd|eur|brl)\b/i.test(q);
  // Tolerância a erros ortográficos: detectar "presi..." + país (EUA/Estados Unidos/USA/United States)
  // Ex.: "presiudente" (troca de d->u), "presidnte" (falta de e), etc.
  const typoEntity = /\bpresi[a-z]*\b/i.test(qn) && /\b(eua|estados\s+unidos|usa|united\s+states)\b/i.test(qn);
  return (isCurr && !isPriceQuery) || typoEntity;
}

async function decideWebUsage(question: string, aiModel?: string): Promise<{ need_web: boolean; tool_priority: string[]; cross_check: boolean }> {
  const current = isCurrentEventsQuery(question);
  let need = current || (await needsWebSearch(question));
  const q = question.toLowerCase();

  // Detecção explícita de perguntas sobre titulares de cargos (mesmo sem "atual")
  const holderQuery = /\b(quem\s+�\s+o\s+)?(presidente|ministro|l�der|primeiro\s+ministro|prefeito|governador)\b(?!\s+(da|do)\s+hist�ria)/i.test(q);
  if (!need && holderQuery) need = true;

  let priority: string[];
  const newsLike = q.includes('not�cia') || q.includes('noticias') || q.includes('news') || q.includes('manchete') || q.includes('atual');
  if (current || newsLike || holderQuery) {
    priority = ['news_search', 'wikipedia_search'];
  } else if (q.includes('hist�ria') || q.includes('defini��o') || q.includes('conceito') || q.includes('explica��o') || q.includes('quem �') || q.includes('o que �')) {
    priority = ['wikipedia_search'];
  } else if (q.includes('pre�o') || q.includes('cota��o') || q.includes('c�mbio') || q.includes('cambio')) {
    priority = ['wikipedia_search'];
  } else {
    priority = ['wikipedia_search'];
  }
  const model = (aiModel || '').toLowerCase();
  const crossCheck = need && (current || model.includes('gpt') || model.includes('llama') || model.includes('deepseek'));
  return { need_web: need, tool_priority: priority, cross_check: crossCheck };
}async function generateIntelligentResponseWithSchoolContext(
  question: string, 
  student: Student, 
  history: ChatMessage[], 
  content: SubjectContent[],
  hierarchicalContext?: HierarchicalContext,
  customPersonality?: string,
  aiModel?: string, // ?? NOVO: Modelo de IA selecionado pelo frontend
  platform: string = 'web',
  webSearchContext?: string, // ?? NOVO: Contexto de web search
  imageUrl?: string,
  visionModel?: string
): Promise<{ answer: string; webSearchContext?: string; toolsUsed?: string[]; modelUsed?: string; webSearchRequired?: 0 | 1 }> {
  
  console.log('?? DEBUG: customPersonality recebida:', customPersonality ? 'SIM' : 'N�O');
  console.log('?? DEBUG: valor da personalidade:', customPersonality);
  console.log('?? DEBUG: webSearchContext recebido:', webSearchContext ? 'SIM' : 'N�O');
  
  // ?? MODERN WEB SEARCH: Usar tools nativas seguindo padr�es 2025
  let enhancedWebSearchContext = webSearchContext || '';
  const hasImage = !!imageUrl;
  const isCurrent = !hasImage && isCurrentEventsQuery(question);
  const shouldUseWebSearch = !hasImage && isCurrent;
  const webSearchRequired: 0 | 1 = shouldUseWebSearch ? 1 : 0;
  const usedTools: string[] = [];
  
  if (shouldUseWebSearch && !enhancedWebSearchContext) {
    console.log('?? Pergunta requer busca web, usando tools modernas...');
    try {
      const tools = createWebSearchTools();
      const searchResults = [];
      
      // Determinar quais tools usar baseado apenas na natureza temporal da pergunta
      const prioritized = isCurrent
          ? ['news_search', 'wikipedia_search', 'duckduckgo_search']
          : ['wikipedia_search', 'duckduckgo_search'];

      for (const name of prioritized) {
        const tool = tools.find(t => t.name === name);
        if (!tool) continue;
        try {
          if (name === 'news_search') {
            const result = await tool._call({ query: question, maxResults: 5 });
            const parsed = JSON.parse(result);
            if (parsed.articles?.length > 0) {
              searchResults.push({ source: 'news', data: parsed });
              usedTools.push('news_search');
            }
          } else if (name === 'wikipedia_search') {
            const result = await tool._call({ query: question, maxResults: 2, language: 'pt' });
            const parsed = JSON.parse(result);
            if (parsed.results?.length > 0) {
              searchResults.push({ source: 'wikipedia', data: parsed });
              usedTools.push('wikipedia_search');
            }
          } else if (name === 'duckduckgo_search') {
            const result = await tool._call({ query: question, maxResults: 5 });
            const parsed = JSON.parse(result);
            const hasContent = (typeof parsed.abstract === 'string' && parsed.abstract.length > 0) ||
              (Array.isArray(parsed.relatedTopics) && parsed.relatedTopics.length > 0);
            if (hasContent) {
              searchResults.push({ source: 'duckduckgo', data: parsed });
              usedTools.push('duckduckgo_search');
            }
          }
        } catch (err) {
          console.warn(`Tool ${name} falhou:`, (err as any)?.message || err);
        }
        // Se j� temos algum resultado �til, podemos parar cedo para reduzir lat�ncia
        if (searchResults.length > 0) break;
      }
      
      // Formatar resultados para o contexto
      if (searchResults.length > 0) {
        enhancedWebSearchContext = '\n\n?? INFORMA��ES ATUAIS DA WEB:\n';
        
        searchResults.forEach((result, index) => {
          if (result.source === 'wikipedia') {
            const data = result.data;
            enhancedWebSearchContext += `\n?? WIKIPEDIA:\n`;
            data.results.forEach((article: any, i: number) => {
              enhancedWebSearchContext += `${i + 1}. **${article.title}**\n   ${article.snippet}\n   Link: ${article.url}\n\n`;
            });
          } else if (result.source === 'news') {
            const data = result.data;
            if (data.articles?.length > 0) {
              enhancedWebSearchContext += `\n?? MANCHETES:\n`;
              data.articles.forEach((article: any, i: number) => {
                enhancedWebSearchContext += `${i + 1}. **${article.title}**\n   ${article.description || ''}\n   ${article.url ? `Link: ${article.url}` : ''}\n\n`;
              });
            }
          } else if (result.source === 'duckduckgo') {
            const data = result.data;
            enhancedWebSearchContext += `\n?? DUCKDUCKGO:\n`;
            if (data.abstract) {
              enhancedWebSearchContext += `Resumo: ${data.abstract}${data.abstractURL ? `\n   Link: ${data.abstractURL}` : ''}\n\n`;
            }
            if (Array.isArray(data.relatedTopics) && data.relatedTopics.length > 0) {
              data.relatedTopics.forEach((topic: any, i: number) => {
                const text = topic.text || topic.Text || '';
                const url = topic.firstURL || topic.FirstURL || '';
                if (text) {
                  enhancedWebSearchContext += `${i + 1}. ${text}${url ? `\n   Link: ${url}` : ''}\n`;
                }
              });
              enhancedWebSearchContext += `\n`;
            }
          }
        });
        
        console.log(`? Modern web search: ${searchResults.length} tools utilizadas`);
      }
    } catch (error) {
      console.warn('?? Erro na busca web moderna:', (error as any).message || error);
    }
  }
  
  // ? OpenRouter API check - todos os modelos agora s�o do OpenRouter
const chosenModel = aiModel || 'deepseek/deepseek-chat:online';
  if (!openrouterApiKey) {
    throw new Error('OpenRouter API n�o configurada - defina OPENROUTER_API_KEY');
  }

  // ??? CONSTRUÇÃO HIERÁRQUICA DE CONTEXTOS
  console.log('??? Construindo contextos hier�rquicos...');
  
  // ?? 1. PERSONALIDADE (Prioridade M�xima)
  let personalityPrompt = '';
  const registryPersonality = hierarchicalContext?.global?.personality?.trim();
  const customTrimmed = customPersonality?.trim();
  if (registryPersonality) {
    personalityPrompt = `PERSONALIDADE GLOBAL: ${registryPersonality}`;
    console.log('✅ Usando personalidade do Context Registry (global).');
  } else if (customTrimmed) {
    personalityPrompt = `PERSONALIDADE PERSONALIZADA: ${customTrimmed}`;
    console.log('ℹ️ Usando personalidade personalizada fornecida no pedido.');
  } else {
    personalityPrompt = `Você é um tutor educacional especializado, amigável e motivador. Sua missão é ajudar estudantes a aprender de forma eficaz, sempre explicando conceitos de maneira clara e didática.`;
    console.log('ℹ️ Usando personalidade padrão.');
  }

  // ?? 2. CONTEXTO DA ESCOLA
  const schoolContext = `\n\n?? ESCOLA: ${student.school_name}\n?? TURMA: ${student.class_name}\n????? ESTUDANTE: ${student.name}`;

  // ?? 3. CONTE�DO EDUCACIONAL RELEVANTE
  let contentContext = '';
  if (content && content.length > 0) {
    contentContext = `\n\n?? CONTE�DO EDUCACIONAL RELEVANTE:\n${content.map((item, index) => 
      `${index + 1}. **${item.title}** (${item.subject})\n   ${item.content_data}\n   Fonte: ${item.source || 'Material da escola'}`
    ).join('\n\n')}`;
    console.log(`?? Adicionados ${content.length} conte�dos relevantes`);
  }

  // ?? 4. HIST�RICO DE CONVERSA (�ltimas 7-8 intera��es)
  let historyContext = '';
  if (history && history.length > 0) {
    const recentHistory = history.slice(-8); // �ltimas 8 mensagens
    historyContext = `\n\n?? HIST�RICO RECENTE:\n${recentHistory.map((msg, index) => 
      `${index + 1}. **${msg.question}**\n   Resposta: ${msg.answer.substring(0, 200)}${msg.answer.length > 200 ? '...' : ''}\n`
    ).join('\n')}`;
    console.log(`?? Adicionadas ${recentHistory.length} mensagens do hist�rico`);
  }

  // ?? 5. PROMPT FINAL HIER�RQUICO (com contexto web integrado)
  const systemPrompt = `${personalityPrompt}${schoolContext}${contentContext}${historyContext}${enhancedWebSearchContext}\n\n?? INSTRU��ES:\n- Responda sempre em portugu�s de Portugal (pt-PT)\n- Use o conte�do educacional quando relevante\n- Considere o hist�rico para manter continuidade\n- Seja did�tico e motivador\n- Adapte a linguagem ao n�vel da turma\n- Se houver a sec��o "?? INFORMA��ES ATUAIS DA WEB" no conte�do acima, trate-a como fonte mais recente e priorit�ria. Em caso de conflito com mem�ria/treino, siga as informa��es atualizadas.\n- Para perguntas factuais/atuais (ex.: presidente, resultados desportivos, campe�es, datas), valide e baseie a resposta nas fontes atuais e evite respostas est�ticas desatualizadas.\n- Se a pergunta n�o for temporal/atual, n�o use ferramentas de web search; responda apenas com conhecimento pr�prio e o conte�do fornecido.`;

  // ?? 6. CONSTRU��O DAS MENSAGENS
  const finalQuestion = (question || '').trim();
  const userContent: any = hasImage
    ? [
        { type: 'text', text: finalQuestion || 'Analisa a imagem e explica de forma didática o que observas.' },
        { type: 'image_url', image_url: { url: imageUrl! } }
      ]
    : finalQuestion;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

  console.log('?? Contextos construídos:');
  console.log(`?? Personalidade: ${hierarchicalContext?.global?.personality ? 'Global (Registry)' : (customPersonality ? 'Personalizada' : 'Padrão')}`);
  console.log(`?? Escola: ${student.school_name}`);
  console.log(`?? Turma: ${student.class_name}`);
  console.log(`????? Estudante: ${student.name}`);
  console.log(`?? Conte�dos: ${content.length}`);
  console.log(`?? Hist�rico: ${history.length} mensagens`);

  // ?? VERIFICA��O DE CACHE SEM�NTICO
  const contextHash = `${student.id}_${student.school_name}_${student.class_name}`;
  const cacheResult = await checkSemanticCache(question, contextHash);
  
  if (cacheResult.found && cacheResult.response) {
    console.log(`?? Resposta encontrada no cache sem�ntico (${(cacheResult.similarity! * 100).toFixed(1)}% similaridade)`);
    return { answer: cacheResult.response, webSearchContext: enhancedWebSearchContext || undefined, toolsUsed: usedTools.length ? usedTools : undefined, webSearchRequired: webSearchRequired };
  }

  try {
    // ?? SELE��O INTELIGENTE DE MODELO IA COM OTIMIZA��ES DE LAT�NCIA
    // ?? RESPEITAR MODELO ESCOLHIDO NO FRONTEND (sem alterar slug)
let selectedModel = aiModel || 'deepseek/deepseek-chat:online';
    if (hasImage) {
      selectedModel = (visionModel && visionModel.trim()) || 'qwen/qwen2.5-vl-7b-instruct';
      console.log(`🖼️ Modo visão: usando modelo ${selectedModel} para análise multimodal`);
      
      // Log detalhado para debug de processamento de imagem
      console.log(`📸 URL da imagem recebida: ${imageUrl}`);
      console.log(`🔍 Modelo de visão selecionado: ${selectedModel}`);
    }
    // Forçar modelo para versão :online (websearch embutido) apenas quando NÃO houver imagem
    if (!hasImage) {
      const originalModel = selectedModel;
      const convertedAlways = toOnlineIfNeeded(selectedModel, true);
      if (convertedAlways !== selectedModel) {
        selectedModel = convertedAlways;
        console.log(`🌐 Forçando modelo com web search embutido: ${originalModel} → ${selectedModel}`);
      } else if (!selectedModel.includes(':online')) {
        console.log(`ℹ️ Modelo ${selectedModel} não possui versão :online disponível, mantendo original`);
      } else {
        console.log('🌐 Modelo já é versão :online');
      }
    }
    
    // Definir finalQuestion de forma segura
    const finalQuestion = (question || '').trim();

    // 🔎 DECISÃO SIMPLIFICADA PARA MODELOS :ONLINE
    // Apenas usa web search se a pergunta for temporal (definido por isCurrentEventsQuery no início)
    const finalShouldUseWebSearch = hasImage ? false : shouldUseWebSearch;
    
    if (finalShouldUseWebSearch) {
      if (!selectedModel.includes(':online')) {
        const originalModel = selectedModel;
        const converted = toOnlineIfNeeded(selectedModel, true);
        if (converted !== selectedModel) {
          selectedModel = converted;
          console.log(`🌐 Modelo automaticamente convertido para versão :online: ${originalModel} → ${selectedModel} (forçado)`);
        } else {
          console.log(`ℹ️ Modelo ${selectedModel} não tem versão :online disponível, mantendo modelo original`);
        }
      } else {
        console.log('🌐 Modelo já está em versão :online (websearch embutido ativado)');
      }
    }
    
    console.log(`✅ Modelo final: ${selectedModel} | Plataforma: ${platform} | Web Search: ${finalShouldUseWebSearch}`);
    
    // 🔧 PARÂMETROS OTIMIZADOS POR PLATAFORMA E LATÊNCIA
  const useStreaming = platform === 'whatsapp'; // Streaming SSE para WhatsApp
  const requestParams: any = {
    model: selectedModel,
    messages: messages,
    temperature: 0.7,
    max_tokens: platform === 'whatsapp' ? 1200 : 2000, // WhatsApp: limite menor para velocidade
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    stream: useStreaming
  };
  // Compatibilidade com vision: quando houver array no user content, nenhuma mudança adicional é necessária para OpenRouter compatível com OpenAI; manter payload padrão.

  // ?? ADICIONAR TOOLS SE NECESS�RIO
  // Definir tools no escopo correto para uso posterior
  let webSearchTools = null;
  
  // ?? OTIMIZA��O: Se modelo j� tem :online, n�o precisamos de tools extras
  if (finalShouldUseWebSearch && !selectedModel.includes(':online')) {
    console.log('?? Adicionando web search tools ao requestParams (modelo sem :online)...');
    webSearchTools = createWebSearchTools();
    
    // Converter tools para formato OpenAI/OpenRouter
    requestParams.tools = webSearchTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
              default: 3
            }
          },
          required: ["query"]
        }
      }
    }));

    requestParams.tool_choice = "auto";
    console.log(`?? Adicionadas ${requestParams.tools.length} tools: ${webSearchTools.map(t => t.name).join(', ')}`);
  } else if (finalShouldUseWebSearch && selectedModel.includes(':online')) {
    console.log('?? Modelo :online detectado - web search automático habilitado, sem tools extras necessárias');
  }

    // ?? PROVIDER ROUTING OTIMIZADO PARA LAT�NCIA M�NIMA
    if (platform === 'whatsapp') {
      requestParams.provider = {
        sort: 'latency', // Priorizar menor lat�ncia
        allow_fallbacks: false, // Removido: sem fallbacks entre provedores
        require_parameters: false,
        data_collection: 'deny'
      };
      // Sem 'route' de fallback: usar apenas o provedor selecionado
    }

    console.log(`?? Enviando para ${selectedModel} com otimiza��es de lat�ncia...`);
    console.log(`?? Tokens m�ximos: ${requestParams.max_tokens}, Streaming: ${useStreaming}`);
    
    const url = `${openrouterBaseUrl}/chat/completions`;

    // ?? HEADERS OTIMIZADOS PARA COMPRESS�O E LAT�NCIA
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clever-school-pal-ai', 
      'X-Title': 'EduBot Tutor',
      'Connection': 'keep-alive', // Reutilizar conex�es TCP
      'Accept': useStreaming ? 'text/event-stream' : 'application/json'
    };

    // ??? COMPRESS�O AGRESSIVA PARA REDUZIR LAT�NCIA DE REDE
    if (platform === 'whatsapp') {
      headers['Accept-Encoding'] = 'gzip, deflate, br'; // Suporte a Brotli para m�xima compress�o
      // headers['Content-Encoding'] = 'gzip'; // Removido: n�o estamos comprimindo o body manualmente
      headers['X-Provider-Preference'] = 'latency'; // Prefer�ncia expl�cita por lat�ncia
    } else {
      headers['Accept-Encoding'] = 'gzip, deflate';
    }

    // ? TIMEOUT OTIMIZADO POR PLATAFORMA (mais agressivo para WhatsApp)
    const timeoutMs = platform === 'whatsapp' ? 20000 : 30000; // WhatsApp: 20s, Web: 30s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // ?? FETCH OTIMIZADO COM CONFIGURA��ES DE PERFORMANCE
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestParams),
      signal: controller.signal,
      // Otimiza��es adicionais de rede
      keepalive: true, // Manter conex�o viva para pr�ximas requisi��es
      cache: 'no-cache' // Evitar cache desnecess�rio
      // priority: 'high' as RequestPriority // Removido: propriedade n�o suportada em todos runtimes
    };

    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API OpenRouter falhou: ${response.status} - ${response.statusText}. Detalhes: ${errorText}`);
    }

    let responseContent = '';
    
    if (useStreaming) {
      // ?? PROCESSAMENTO DE STREAMING
      console.log('?? Processando resposta em streaming...');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    responseContent += content;
                  }
                } catch (e) {
                  // Ignorar chunks malformados
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } else {
      // ?? PROCESSAMENTO TRADICIONAL
      const data = await response.json();
      const message = data.choices[0]?.message;
      
      // ?? VERIFICAR SE H� TOOL CALLS
      if (!hasImage && message?.tool_calls && message.tool_calls.length > 0) {
        console.log('?? Tool calls detectados:', message.tool_calls.length);
        
        // Processar cada tool call
        const toolResults = [];
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`?? Executando tool: ${toolName}`, toolArgs);
          
          // Encontrar e executar a tool
          const tool = webSearchTools?.find(t => t.name === toolName);
          if (tool) {
            try {
              const args = (typeof toolArgs === 'string') ? { query: toolArgs } : toolArgs;
              const result = await tool._call(args);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolName,
                content: result
              });
              console.log(`? Tool ${toolName} executada com sucesso`);
            } catch (error) {
              console.error(`? Erro ao executar tool ${toolName}:`, error);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolName,
                content: `Erro ao executar busca: ${(error as Error).message}`
              });
            }
          }
        }
        
        // Se temos resultados de tools, fazer uma segunda chamada para o modelo
        if (toolResults.length > 0) {
          console.log('?? Fazendo segunda chamada com resultados das tools...');
          
          const followUpMessages = [
            ...messages,
            message, // A mensagem original com tool calls
            ...toolResults // Os resultados das tools
          ];
          
          const followUpParams = {
            ...requestParams,
            messages: followUpMessages,
            tools: undefined, // Remover tools na segunda chamada
            tool_choice: undefined
          };
          
          const followUpResponse = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(followUpParams),
            signal: controller.signal
          });
          
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            responseContent = followUpData.choices[0]?.message?.content || 'Erro na resposta de follow-up';
            console.log('? Segunda chamada conclu�da com sucesso');
          } else {
            responseContent = 'Erro ao processar resultados das ferramentas de busca';
          }
        } else {
          responseContent = message?.content || 'Erro na resposta';
        }
      } else {
        responseContent = message?.content || 'Erro na resposta';
      }
    }
    
    // ?? LIMPEZA E OTIMIZA��O DA RESPOSTA
    responseContent = responseContent
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // **texto** ? *texto*
      .replace(/###\s*(.*?)\n/g, '*$1*\n') // ### T�tulo ? *T�tulo*
      .replace(/##\s*(.*?)\n/g, '*$1*\n')  // ## T�tulo ? *T�tulo*
      .replace(/\n{3,}/g, '\n\n') // M�ltiplas quebras ? m�ximo 2
      .trim();

    // ?? APLICA��O DE PERSONALIDADE CUSTOMIZADA (se houver)
    if (customPersonality && customPersonality.includes('emoji')) {
      // Se personalidade menciona emoji, manter emojis
      console.log('?? Mantendo emojis por personalidade customizada');
    } else {
      // Removido: n�o adicionar emojis automaticamente por plataforma para garantir consist�ncia entre WhatsApp e Discord
    }

    console.log(`? Resposta gerada com sucesso (${responseContent.length} caracteres)`);
    
    // ?? SALVAR NO CACHE SEM�NTICO (evitar cache quando a resposta depende de fatos atuais)
    const hasWebSearchBlock = (content || []).some(c => typeof c.content_data === 'string' && c.content_data.includes('?? INFORMA��ES ATUAIS DA WEB')) ||
      (!!enhancedWebSearchContext && enhancedWebSearchContext.includes('?? INFORMA��ES ATUAIS DA WEB'));
    if (!hasWebSearchBlock) {
      await saveToSemanticCache(question, responseContent, contextHash);
    } else {
      console.log('?? Evitando cache sem�ntico: resposta baseada em informa��es atuais da web');
    }
    
    return { answer: responseContent, webSearchContext: enhancedWebSearchContext || undefined, toolsUsed: usedTools.length ? usedTools : undefined, modelUsed: selectedModel, webSearchRequired: webSearchRequired };

  } catch (error) {
    console.error('? Erro com provedor de IA:', error);
    
    // Simplificação: sem friendly-fallback. Reportar erro diretamente.
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha na API OpenRouter: ${msg}`);
  }
}

// FUN��O 5: Gest�o Definitiva de Hist�rico WhatsApp (Contexto EXATO de 15 mensagens)
async function saveInteractionAndManageHistory(
  studentId: string, 
  question: string, 
  answer: string,
  schoolId?: string,
  aiModel?: string // ?? NOVO: Par�metro do modelo IA
): Promise<void> {
  try {
    console.log('?? Salvando intera��o WhatsApp com gest�o definitiva...');
    
    // 1. Salvar nova intera��o no formato WhatsApp definitivo
    await supabase
      .from('chat_logs')
      .insert({
        student_id: studentId,
        question: question,
        answer: answer,
        school_id: schoolId,
        ai_model: aiModel || 'deepseek/deepseek-chat:online', // Dinâmico: usa modelo selecionado
        context_used: 'whatsapp_hierarchical_contexts',
        response_type: 'whatsapp_definitive',
        created_at: new Date().toISOString()
      });

    console.log('? Intera��o WhatsApp salva no Supabase');

    // 2. GEST�O DEFINITIVA: Manter EXATAMENTE 7-8 intera��es (14-16 mensagens = ~15 contexto)
    const { data: allInteractions, error: selectError } = await supabase
      .from('chat_logs')
      .select('id, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('? Erro ao buscar intera��es:', selectError);
      return;
    }

    if (allInteractions && allInteractions.length > 7) {
      const interactionsToDelete = allInteractions.slice(7); // Manter apenas 7 mais recentes
      const idsToDelete = interactionsToDelete.map(interaction => interaction.id);
      
      console.log(`?? WhatsApp: Limpando ${idsToDelete.length} intera��es antigas (contexto de 15 mensagens)`);
      
      const { error: deleteError } = await supabase
        .from('chat_logs')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('? Erro ao limpar hist�rico antigo:', deleteError);
      } else {
        console.log(`? Contexto WhatsApp mantido: ${Math.min(allInteractions.length, 7)} intera��es (=15 mensagens)`);
      }
    }

    // 3. Verifica��o de integridade
    const { data: finalCount } = await supabase
      .from('chat_logs')
      .select('id', { count: 'exact' })
      .eq('student_id', studentId);

    console.log(`?? WhatsApp: Aluno ${studentId} tem ${finalCount?.length || 0} intera��es ativas`);

  } catch (error) {
    console.error('? Erro ao salvar hist�rico WhatsApp definitivo:', error);
    throw error; // Para WhatsApp, falha deve ser vis�vel
  }
}

// Utilitários de Web Search (Tools modernas para OpenRouter Functions)
function createWebSearchTools() {
  const tools = [
    {
      name: "duckduckgo_search",
      description: "General web search via DuckDuckGo (fallback)",
      async _call(params: { query: string; maxResults?: number }) {
        const q = (params?.query || '').trim();
        const maxResults = Math.max(1, Math.min(10, params?.maxResults ?? 5));
        if (!q) return JSON.stringify({ abstract: '', abstractSource: '', abstractURL: '', relatedTopics: [] });
        const encoded = encodeURIComponent(q);
        const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CleverSchoolPalAI/1.0' } });
          const data = await res.json();
          const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
          const flatten = (arr: any[]): any[] => arr.flatMap((item: any) => Array.isArray(item.Topics) ? item.Topics : [item]);
          const topics = flatten(related).slice(0, maxResults).map((t: any) => ({
            text: t.Text || '',
            firstURL: t.FirstURL || ''
          }));
          const result = {
            abstract: data.Abstract || '',
            abstractSource: data.AbstractSource || '',
            abstractURL: data.AbstractURL || '',
            relatedTopics: topics
          };
          return JSON.stringify(result);
        } catch (e: any) {
          console.warn('duckduckgo_search error:', e?.message || e);
          return JSON.stringify({ abstract: '', abstractSource: '', abstractURL: '', relatedTopics: [] });
        }
      }
    },

    {
      name: "wikipedia_search",
      description: "Search articles on Portuguese Wikipedia",
      async _call(params: { query: string; maxResults?: number; language?: string }) {
        const q = (params?.query || '').trim();
        const maxResults = Math.max(1, Math.min(10, params?.maxResults ?? 5));
        const lang = (params?.language || 'pt').toLowerCase();
        if (!q) return JSON.stringify({ results: [] });
        const encoded = encodeURIComponent(q);
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&utf8=&format=json&srlimit=${maxResults}`;
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CleverSchoolPalAI/1.0' } });
          const data = await res.json();
          const results = (data?.query?.search || []).map((item: any) => {
            const title = item.title || '';
            const snippetHtml = item.snippet || '';
            const snippet = snippetHtml.replace(/<[^>]+>/g, '');
            const articleUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, '_'))}`;
            return { title, snippet, url: articleUrl };
          });
          return JSON.stringify({ results });
        } catch (e: any) {
          console.warn('wikipedia_search error:', e?.message || e);
          return JSON.stringify({ results: [] });
        }
      }
    },
    {
      name: "news_search",
      description: "Search recent news headlines (lightweight via DuckDuckGo)",
      async _call(params: { query: string; maxResults?: number; timeframe?: string; region?: string }) {
        const qRaw = (params?.query || '').trim();
        const maxResults = Math.max(1, Math.min(10, params?.maxResults ?? 5));
        if (!qRaw) return JSON.stringify({ articles: [] });
        // Força intenção de notícias na consulta para obter resultados mais recentes
        const encoded = encodeURIComponent(`latest news ${qRaw}`);
        const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'CleverSchoolPalAI/1.0' } });
          const data = await res.json();
          const topicsRaw = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
          const flatten = (arr: any[]): any[] => arr.flatMap((item: any) => Array.isArray(item.Topics) ? item.Topics : [item]);
          const toDomain = (link: string) => {
            try { return new URL(link).hostname.replace('www.', ''); } catch { return ''; }
          };
          const articles = flatten(topicsRaw)
            .map((t: any) => ({
              title: (t.Text || '').replace(/ - .*$/, ''),
              description: t.Text || '',
              url: t.FirstURL || '',
              source: toDomain(t.FirstURL || '')
            }))
            .filter((a: any) => !!a.title)
            .slice(0, maxResults);
          return JSON.stringify({ articles });
        } catch (e: any) {
          console.warn('news_search error:', e?.message || e);
          return JSON.stringify({ articles: [] });
        }
      }
    }
  ];
  return tools;
}

// Cache semântico (stubs seguros com integração opcional ao banco)
async function checkSemanticCache(question: string, contextHash: string): Promise<{ found: boolean; response?: string; similarity?: number }> {
  try {
    // Implementação mínima: neste momento retornamos como não encontrado para evitar falso-positivos
    // Futuro: usar embeddings e pgvector para similaridade por contexto
    return { found: false, similarity: 0 };
  } catch (e) {
    console.warn('checkSemanticCache error:', (e as any)?.message || e);
    return { found: false };
  }
}

async function saveToSemanticCache(question: string, response: string, contextHash: string): Promise<void> {
  try {
    // Salvar entrada básica sem embedding (campo é opcional)
    if (typeof supabase !== 'undefined') {
      await supabase
        .from('semantic_cache')
        .insert({ response, context_hash: contextHash })
        .select('*')
        .single();
    }
  } catch (e) {
    console.warn('saveToSemanticCache error:', (e as any)?.message || e);
  }
}

// Utilitário: sanitiza a entrada do utilizador para remover caracteres de controle, normalizar espaços e limitar tamanho
function sanitizeUserInput(input: string): string {
  if (!input) return '';
  let text = String(input);
  // Remover caracteres de controle ASCII e invisíveis comuns
  text = text.replace(/[\u0000-\u001F\u007F]/g, '');
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Normalizar espaços
  text = text.replace(/\s+/g, ' ').trim();
  // Colapsar pontuações repetidas excessivas
  text = text.replace(/([!?.,])\1{2,}/g, '$1$1');
  // Limitar comprimento
  const MAX = parseInt(Deno.env.get('HUMANIZED_MAX_QUESTION_CHARS') || '1000');
  if (text.length > MAX) text = text.slice(0, MAX);
  return text;
}

// Utilitário: valida URL assinada do Supabase para acesso temporário a imagens
function isSignedSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const base = Deno.env.get('SUPABASE_URL') || '';
    if (!base) return false;
    const host = new URL(base).host;
    if (u.host !== host) return false;
    const isSignedPath = u.pathname.includes('/storage/v1/object/sign/');
    const hasToken = u.searchParams.has('token');
    return isSignedPath && hasToken;
  } catch {
    return false;
  }
}

// Utilitário: verifica limites de consumo por aluno (limite diário e intervalo mínimo entre mensagens)
async function checkUsageLimits(studentId: string, platform: string = 'web'): Promise<{ allowed: boolean; reason?: string; retryAfterMs?: number; dailyCount?: number; dailyLimit?: number }> {
  try {
    const dailyLimit = parseInt(Deno.env.get('HUMANIZED_DAILY_LIMIT') || '50');
    const minIntervalMs = parseInt(Deno.env.get('HUMANIZED_MIN_INTERVAL_MS') || '2500');

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Contagem do dia
    const { data: countRows, count } = await supabase
      .from('chat_logs')
      .select('id', { count: 'exact' })
      .eq('student_id', studentId)
      .gte('created_at', startOfDay.toISOString());

    const todayCount = (typeof count === 'number' ? count : (countRows?.length || 0));

    if (todayCount >= dailyLimit) {
      return { allowed: false, reason: 'daily_limit', dailyCount: todayCount, dailyLimit, retryAfterMs: 60 * 60 * 1000 };
    }

    // Verificar último envio (rate limit)
    const { data: lastRows } = await supabase
      .from('chat_logs')
      .select('created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastRows && lastRows.length > 0) {
      const last = new Date(lastRows[0].created_at);
      const diff = now.getTime() - last.getTime();
      if (diff < minIntervalMs) {
        return { allowed: false, reason: 'rate_limited', retryAfterMs: Math.max(0, minIntervalMs - diff), dailyCount: todayCount, dailyLimit };
      }
    }

    return { allowed: true, dailyCount: todayCount, dailyLimit };
  } catch (e) {
    console.warn('checkUsageLimits error:', (e as any)?.message || e);
    // Em caso de erro, não bloquear o usuário
    return { allowed: true };
  }
}

serve(async (req) => {
  // CORS headers com allowlist opcional
  const corsStrict = (Deno.env.get('HUMANIZED_CORS_STRICT') || 'false') === 'true';
  const allowedOrigins = (Deno.env.get('HUMANIZED_ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin') || '';
  const allowOrigin = corsStrict ? (allowedOrigins.includes(origin) ? origin : 'null') : '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...(corsStrict ? { 'Vary': 'Origin' } : {}),
  } as Record<string, string>;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Gate de autenticação com rollback toggle
  const requireAuth = (Deno.env.get('HUMANIZED_REQUIRE_AUTH') || 'false') === 'true';
  let authOk = false as boolean;
  try {
    const hdrAuth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const hdrApiKey = req.headers.get('x-api-key') || '';

    // Validar JWT se presente
    if (hdrAuth?.startsWith('Bearer ')) {
      const token = hdrAuth.substring(7);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userData?.user && !userErr) authOk = true;
      } catch (e) {
        console.warn('JWT validation error:', (e as any)?.message || e);
      }
    }

    // Fallback: validar x-api-key
    if (!authOk && hdrApiKey) {
      try {
        const { data: keyRow, error: keyErr } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_hash', hdrApiKey)
          .single();
        if (keyRow && !keyErr) authOk = true;
      } catch (e) {
        console.warn('x-api-key validation error (db):', (e as any)?.message || e);
      }
      // Alternativa: chave interna via env para tráfego interno entre funções
      if (!authOk) {
        const internalKey = Deno.env.get('HUMANIZED_INTERNAL_API_KEY') || '';
        if (internalKey && hdrApiKey === internalKey) {
          authOk = true;
        }
      }
    }

    if (!authOk && requireAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing or invalid Authorization or x-api-key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!authOk && !requireAuth) {
      console.warn('[DEPRECATION] Unauthenticated call accepted temporariamente. Em breve JWT ou x-api-key será obrigatório.');
    }
  } catch (e) {
    console.warn('Auth gate error:', (e as any)?.message || e);
    if (requireAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const { phoneNumber, question, studentId, aiModel, platform, customPersonality, imageUrl, visionModel, hierarchicalContext } = await req.json();
    const hasImage = !!imageUrl;

    if ((!question && !hasImage) || (!studentId && !phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Envie "question" OU "imageUrl" e pelo menos um identificador: "studentId" (preferido) ou "phoneNumber".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar imageUrl se presente (apenas URLs assinadas do Supabase são aceites)
    if (hasImage) {
      if (!isSignedSupabaseUrl(imageUrl)) {
        return new Response(
          JSON.stringify({ error: 'imageUrl inválida. Forneça uma URL assinada do Supabase Storage com TTL curto.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ETAPA 1.1: Sanitização da pergunta do utilizador (quando existir)
    const safeQuestion = sanitizeUserInput(question || '');
    console.log(`🛡️ ETAPA 1.1: Pergunta sanitizada (orig=${(question || '').length} chars => safe=${safeQuestion.length} chars)`);
    if (!hasImage && (!safeQuestion || safeQuestion.length < 2)) {
      return new Response(
        JSON.stringify({ error: 'A tua pergunta parece vazia ou inválida após sanitização.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 ETAPA 1: Carregando contextos hierárquicos...');
    const student = await getStudentHierarchicalContext(phoneNumber, studentId);

    // ETAPA 1.2: Verificação de limites de consumo (opcional)
    const usageLimitsEnabled = (Deno.env.get('HUMANIZED_USAGE_LIMITS_ENABLED') || 'false') === 'true';
    if (usageLimitsEnabled) {
      console.log('⏱️ ETAPA 1.2: Verificando limites de uso do aluno...');
      const limits = await checkUsageLimits(student.id, platform || 'web');
      if (!limits.allowed) {
        const retryAfterSec = Math.ceil((limits.retryAfterMs || 60 * 60 * 1000) / 1000);
        const reason = limits.reason === 'daily_limit'
          ? `Atingiste o limite diário de ${(limits.dailyLimit ?? 'N/D')} interações. Tenta novamente mais tarde.`
          : `Estás a enviar mensagens muito rápido. Aguarda ${retryAfterSec} segundos e tenta novamente.`;
        return new Response(
          JSON.stringify({ canRespond: false, error: reason, reason: limits.reason, retryAfterSec, dailyCount: limits.dailyCount, dailyLimit: limits.dailyLimit }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) } }
        );
      }
    } else {
      console.log('⏱️ ETAPA 1.2: Limites de uso desativados (HUMANIZED_USAGE_LIMITS_ENABLED=false)');
    }

    console.log('💬 ETAPA 2: Carregando histórico da conversa...');
    const conversationHistory = await getConversationHistory(student.id);

    console.log('📚 ETAPA 3: Analisando necessidade de conteúdo educacional...');
    let educationalContent: SubjectContent[] = [];
    try {
      const analysis = await analyzeContentNeed(
        safeQuestion,
        student,
        conversationHistory,
        hierarchicalContext,
        customPersonality,
        aiModel,
        platform || 'web'
      );
      if (analysis?.needsContent) {
        educationalContent = await getRelevantEducationalContent(safeQuestion, student);
      }
    } catch (e) {
      console.warn('Falha ao analisar necessidade de conteúdo. Prosseguindo sem conteúdo adicional.', (e as any)?.message || e);
    }

    console.log('🧠 ETAPA 4: Gerando resposta inteligente...');
    const generated = await generateIntelligentResponseWithSchoolContext(
      safeQuestion,
      student,
      conversationHistory,
      educationalContent,
      hierarchicalContext,
      customPersonality,
      aiModel,
      platform || 'web',
      undefined,
      imageUrl,
      visionModel
    );

    // 🔍 DEBUG: Log detalhado da resposta gerada
    console.log(`📊 Resposta gerada - Tamanho: ${generated.answer?.length || 0} caracteres`);
    console.log(`📊 Resposta gerada - canRespond: true`);
    console.log(`📊 Resposta gerada - Modelo usado: ${generated.modelUsed || 'N/A'}`);
    if (generated.answer && generated.answer.length > 0) {
      console.log(`📊 Resposta gerada - Primeiros 200 caracteres: ${generated.answer.substring(0, 200)}...`);
    } else {
      console.log('📊 Resposta gerada - RESPOSTA VAZIA!');
    }

    console.log('💾 ETAPA 5: Salvando interação e gerindo histórico...');
    try {
      await saveInteractionAndManageHistory(
        student.id,
        safeQuestion,
        generated.answer,
        student.school_id,
        aiModel
      );
    } catch (e) {
      console.warn('Falha ao salvar interação no histórico:', (e as any)?.message || e);
    }

    // 🔧 OTIMIZAÇÃO: Remover URLs longas do contexto para evitar limite do Discord
    let safeWebSearchContext = generated.webSearchContext;
    if (safeWebSearchContext && typeof safeWebSearchContext === 'string') {
      // Remover URLs completas do contexto de busca web
      safeWebSearchContext = safeWebSearchContext.replace(/https?:\/\/[^\s<>"']+/g, '[URL_REMOVED]');
      
      // Se ainda for muito longo, truncar
      if (safeWebSearchContext.length > 1000) {
        safeWebSearchContext = safeWebSearchContext.substring(0, 1000) + '...';
      }
    }

    const body = {
      canRespond: true,
      answer: generated.answer,
      webSearchContext: safeWebSearchContext || undefined,
      toolsUsed: generated.toolsUsed || undefined,
      modelUsed: generated.modelUsed || undefined,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro na função humanized-ai-tutor:', error);
    const message = error instanceof Error ? error.message : String(error);
    const body = {
      canRespond: false,
      answer: 'Desculpe, não consegui responder agora. Tente novamente em instantes.',
      error: message,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});