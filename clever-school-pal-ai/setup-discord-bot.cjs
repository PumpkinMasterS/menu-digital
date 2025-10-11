const { createClient } = require('@supabase/supabase-js');
const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ✅ Persistent logging setup (writes to logs/discord.log and logs/discord-error.log)
const LOG_DIR = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {}
const outStream = fs.createWriteStream(path.join(LOG_DIR, 'discord.log'), { flags: 'a' });
const errStream = fs.createWriteStream(path.join(LOG_DIR, 'discord-error.log'), { flags: 'a' });

const formatLog = (level, args) => {
  const ts = new Date().toISOString();
  const msg = args.map(a => {
    try {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      return JSON.stringify(a);
    } catch { return String(a); }
  }).join(' ');
  return `[${ts}] [DiscordBot] [${level}] ${msg}\n`;
};

const _origLog = console.log;
const _origInfo = console.info;
const _origWarn = console.warn;
const _origError = console.error;

console.log = (...args) => { try { outStream.write(formatLog('INFO', args)); } catch {} _origLog.apply(console, args); };
console.info = (...args) => { try { outStream.write(formatLog('INFO', args)); } catch {} _origInfo.apply(console, args); };
console.warn = (...args) => { try { outStream.write(formatLog('WARN', args)); } catch {} _origWarn.apply(console, args); };
console.error = (...args) => { try { const line = formatLog('ERROR', args); outStream.write(line); errStream.write(line); } catch {} _origError.apply(console, args); };

process.on('exit', () => {
  try { outStream.end(); } catch {}
  try { errStream.end(); } catch {}
});

console.log('📝 Persistent logging enabled at', path.join(LOG_DIR, 'discord.log'));

// Configuração do Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração do Discord Bot (com intents básicos disponíveis)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Contexto educativo simplificado
class EducationalContextService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getContextForMessage(guildId, channelId, userId) {
    try {
      // 1. Buscar escola através do guild
      const { data: guild } = await this.supabase
        .from('discord_guilds')
        .select(`
          *,
          schools (
            id,
            name,
            description
          )
        `)
        .eq('guild_id', guildId)
        .single();

      if (!guild) {
        return { 
          error: 'Guild não mapeado para nenhuma escola',
          school: { name: 'Escola Exemplo', description: 'Sistema educativo' },
          class: null,
          student: null
        };
      }

      // 2. Buscar turma através do canal
      const { data: channel } = await this.supabase
        .from('discord_channels')
        .select(`
          *,
          classes (
            id,
            name,
            grade,
            subject_id,
            subjects (
              name,
              description
            )
          )
        `)
        .eq('channel_id', channelId)
        .single();

      // 3. Buscar estudante através do user
      const { data: discordUser } = await this.supabase
        .from('discord_users')
        .select(`
          *,
          students (
            id,
            name,
            grade,
            special_needs,
            learning_preferences
          )
        `)
        .eq('user_id', userId)
        .single();

      // Fallback: resolver estudante diretamente via students.discord_id se não houver relação em discord_users
      let resolvedStudent = discordUser?.students || null;
      if (!resolvedStudent?.id) {
        try {
          const { data: studentByDiscord } = await this.supabase
            .from('students')
            .select('id, name, grade, special_needs, learning_preferences')
            .eq('discord_id', userId)
            .single();
          if (studentByDiscord?.id) {
            resolvedStudent = studentByDiscord;
            console.log('🔗 Fallback: estudante resolvido via students.discord_id');
          }
        } catch (e) {
          console.warn('⚠️ Fallback students.discord_id falhou:', e?.message || e);
        }
      }

      // Tentar resolver escola via guild associada ao utilizador
      let school = null;
      if (discordUser?.guild_id) {
        const { data: guild } = await this.supabase
          .from('discord_guilds')
          .select(`
            *,
            schools (
              id,
              name,
              description
            )
          `)
          .eq('guild_id', discordUser.guild_id)
          .single();
        school = guild?.schools || null;
      }

      return {
        school: school || { name: 'Escola Exemplo', description: 'Sistema educativo' },
        class: channel?.classes || { name: 'Turma Geral', grade: '10º', subjects: { name: 'Geral' } },
        student: resolvedStudent || { name: 'Estudante', grade: '10º' },
        guild: guild,
        channel: channel,
        discordUser: discordUser
      };
    } catch (error) {
      console.error('Erro ao buscar contexto:', error);
      return { 
        error: error.message,
        school: { name: 'Escola Exemplo', description: 'Sistema educativo' },
        class: { name: 'Turma Geral', grade: '10º', subjects: { name: 'Geral' } },
        student: { name: 'Estudante', grade: '10º' }
      };
    }
  }

  // Novo: construir contexto para DMs (baseado no utilizador)
  async getContextForDM(userId) {
    try {
      // Buscar utilizador do Discord e o estudante associado
      const { data: discordUser } = await this.supabase
        .from('discord_users')
        .select(`
          *,
          students (
            id,
            name,
            grade,
            special_needs,
            learning_preferences
          )
        `)
        .eq('user_id', userId)
        .single();

      // Fallback: resolver estudante diretamente via students.discord_id
      let resolvedStudent = discordUser?.students || null;
      if (!resolvedStudent?.id) {
        try {
          const { data: studentByDiscord } = await this.supabase
            .from('students')
            .select('id, name, grade, special_needs, learning_preferences')
            .eq('discord_id', userId)
            .single();
          if (studentByDiscord?.id) {
            resolvedStudent = studentByDiscord;
            console.log('🔗 Fallback DM: estudante resolvido via students.discord_id');
          }
        } catch (e) {
          console.warn('⚠️ Fallback DM students.discord_id falhou:', e?.message || e);
        }
      }

      // Tentar resolver escola via guild associada ao utilizador
      let school = null;
      if (discordUser?.guild_id) {
        const { data: guild } = await this.supabase
          .from('discord_guilds')
          .select(`
            *,
            schools (
              id,
              name,
              description
            )
          `)
          .eq('guild_id', discordUser.guild_id)
          .single();
        school = guild?.schools || null;
      }

      return {
        school: school || { name: 'Escola Exemplo', description: 'Sistema educativo' },
        class: null, // sem canal, não há turma definida no contexto de DM
        student: resolvedStudent || { name: 'Estudante', grade: '10º' },
        guild: null,
        channel: null,
        discordUser: discordUser || null
      };
    } catch (error) {
      console.error('Erro ao construir contexto de DM:', error);
      return {
        school: { name: 'Escola Exemplo', description: 'Sistema educativo' },
        class: null,
        student: { name: 'Estudante', grade: '10º' },
        guild: null,
        channel: null,
        discordUser: null
      };
    }
  }

  async logInteraction(guildId, channelId, userId, messageContent, botResponse, context) {
    try {
      await this.supabase
        .from('discord_interactions')
        .insert({
          user_id: userId,
          guild_id: guildId,
          channel_id: channelId,
          message_content: messageContent,
          bot_response: botResponse,
          context_used: context
        });
    } catch (error) {
      console.error('Erro ao registrar interação:', error);
    }
  }
}

// Serviço de resposta educativa
class EducationalResponseService {
  constructor() {
    this.responses = {
      greeting: {
        pt: 'Olá! Sou o Agente Educativo. Como posso ajudar-te hoje?',
        en: 'Hello! I\'m the Educational Agent. How can I help you today?'
      },
      help: {
        pt: `🎓 **Comandos Disponíveis:**\n\n📚 **!materia** - Informações sobre a matéria atual\n👥 **!turma** - Informações sobre a turma\n🏫 **!escola** - Informações sobre a escola\n📝 **!ajuda** - Mostrar esta mensagem\n🤖 **!contexto** - Ver o teu contexto educativo\n\n💡 Também podes fazer perguntas diretas sobre os conteúdos!`,
        en: `🎓 **Available Commands:**\n\n📚 **!subject** - Information about current subject\n👥 **!class** - Class information\n🏫 **!school** - School information\n📝 **!help** - Show this message\n🤖 **!context** - View your educational context\n\n💡 You can also ask direct questions about the content!`
      }
    };
  }

  generateContextualResponse(message, context) {
    const content = message.content.toLowerCase();
    const lang = 'pt'; // Padrão português

    // Comandos específicos
    if (content.startsWith('!ajuda') || content.startsWith('!help')) {
      return this.responses.help[lang];
    }

    if (content.startsWith('!contexto') || content.startsWith('!context')) {
      return this.formatContextInfo(context, lang);
    }

    if (content.startsWith('!escola') || content.startsWith('!school')) {
      return this.formatSchoolInfo(context.school, lang);
    }

    if (content.startsWith('!turma') || content.startsWith('!class')) {
      return this.formatClassInfo(context.class, lang);
    }

    if (content.startsWith('!materia') || content.startsWith('!subject')) {
      return this.formatSubjectInfo(context.class?.subjects, lang);
    }

    // Resposta contextual baseada no conteúdo
    return this.generateEducationalResponse(content, context, lang);
  }

  formatContextInfo(context, lang = 'pt') {
    if (lang === 'pt') {
      return `🎓 **O Teu Contexto Educativo:**\n\n` +
        `🏫 **Escola:** ${context.school?.name || 'Não definida'}\n` +
        `👥 **Turma:** ${context.class?.name || 'Não definida'}\n` +
        `📚 **Matéria:** ${context.class?.subjects?.name || 'Não definida'}\n` +
        `👤 **Estudante:** ${context.student?.name || 'Não identificado'}\n` +
        `📊 **Ano:** ${context.student?.grade || context.class?.grade || 'Não definido'}`;
    }
    return `🎓 **Your Educational Context:**
      \n\n` +
      `🏫 **School:** ${context.school?.name || 'Not defined'}\n` +
      `👥 **Class:** ${context.class?.name || 'Not defined'}\n` +
      `📚 **Subject:** ${context.class?.subjects?.name || 'Not defined'}\n` +
      `👤 **Student:** ${context.student?.name || 'Not identified'}\n` +
      `📊 **Grade:** ${context.student?.grade || context.class?.grade || 'Not defined'}`;
  }

  formatSchoolInfo(school, lang = 'pt') {
    if (!school) {
      return lang === 'pt' ? '🏫 Escola não identificada.' : '🏫 School not identified.';
    }
    
    if (lang === 'pt') {
      return `🏫 **${school.name}**\n\n${school.description || 'Informações não disponíveis.'}`;
    }
    return `🏫 **${school.name}**\n\n${school.description || 'Information not available.'}`;
  }

  formatClassInfo(classInfo, lang = 'pt') {
    if (!classInfo) {
      return lang === 'pt' ? '👥 Turma não identificada.' : '👥 Class not identified.';
    }
    
    if (lang === 'pt') {
      return `👥 **${classInfo.name}**\n\n` +
        `📊 **Ano:** ${classInfo.grade}\n` +
        `📚 **Matéria:** ${classInfo.subjects?.name || 'Não definida'}`;
    }
    return `👥 **${classInfo.name}**\n\n` +
      `📊 **Grade:** ${classInfo.grade}\n` +
      `📚 **Subject:** ${classInfo.subjects?.name || 'Not defined'}`;
  }

  formatSubjectInfo(subject, lang = 'pt') {
    if (!subject) {
      return lang === 'pt' ? '📚 Matéria não identificada.' : '📚 Subject not identified.';
    }
    
    if (lang === 'pt') {
      return `📚 **${subject.name}**\n\n${subject.description || 'Descrição não disponível.'}`;
    }
    return `📚 **${subject.name}**\n\n${subject.description || 'Description not available.'}`;
  }

  generateEducationalResponse(content, context, lang = 'pt') {
    // Resposta básica contextualizada
    const studentName = context.student?.name || 'estudante';
    const subjectName = context.class?.subjects?.name || 'matéria atual';
    
    if (lang === 'pt') {
      return `Olá ${studentName}! 👋\n\n` +
        `Estou aqui para te ajudar com ${subjectName}. ` +
        `Podes fazer perguntas específicas sobre os conteúdos ou usar os comandos disponíveis.\n\n` +
        `💡 Dica: Usa **!ajuda** para ver todos os comandos disponíveis.`;
    }
    
    return `Hello ${studentName}! 👋\n\n` +
      `I'm here to help you with ${subjectName}. ` +
      `You can ask specific questions about the content or use the available commands.\n\n` +
      `💡 Tip: Use **!help** to see all available commands.`;
  }
}

// Inicialização do bot
const contextService = new EducationalContextService(supabase);
const responseService = new EducationalResponseService();

// Adiciona: Configuração e função para respostas por IA (OpenRouter)
const AI_SETTINGS = {
  model: process.env.AI_MODEL || 'deepseek/deepseek-r1:free',
  temperature: Number(process.env.AI_TEMPERATURE || '0.2'),
  maxTokens: Number(process.env.AI_MAX_TOKENS || '2048'),
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterBaseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/,'')
};

async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch; // Node >=18
  const mod = await import('node-fetch');
  return mod.default;
}

function buildAIPrompt(userMessage, context) {
  let prompt = '';
  prompt += 'PERSONALIDADE BASE:\nAgente educativo para escolas portuguesas. Sê claro, encorajador, e responde sempre em pt-PT.\n\n';

  if (context?.school) {
    prompt += 'CONTEXTO ESCOLAR:\n';
    prompt += `Escola: ${context.school.name}\n\n`;
  }
  if (context?.class) {
    prompt += 'CONTEXTO DA TURMA:\n';
    prompt += `Turma: ${context.class.name}\n`;
    if (context.class.subjects?.name) prompt += `Disciplina: ${context.class.subjects.name}\n`;
    if (context.class.grade) prompt += `Ano: ${context.class.grade}\n`;
    prompt += '\n';
  }
  if (context?.student) {
    prompt += 'CONTEXTO DO ALUNO:\n';
    prompt += `Aluno: ${context.student.name}\n`;
    if (context.student.grade) prompt += `Ano: ${context.student.grade}\n`;
    prompt += '\n';
  }

  prompt += 'INSTRUÇÕES:\n';
  prompt += '1. Responde sempre em português (pt-PT)\n';
  prompt += '2. Adapta a linguagem ao nível do aluno\n';
  prompt += '3. Usa exemplos simples e práticos quando possível\n';
  prompt += '4. Mantém a resposta objetiva, mas completa\n';
  prompt += '5. Se o pedido for muito geral, faz 1-2 perguntas de clarificação no fim\n\n';

  prompt += `MENSAGEM DO ALUNO:\n${userMessage}\n\n`;
  prompt += 'RESPOSTA:';
  return prompt;
}

function sanitizeAIResponse(rawResponse) {
  if (!rawResponse) return null;
  
  // Remove tags de raciocínio que podem aparecer nas respostas
  let cleaned = rawResponse
    .replace(/<think>[\s\S]*?<\/think>/gi, '')  // Remove <think>...</think>
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')  // Remove <reasoning>...</reasoning>
    .replace(/\*\*thinking\*\*:?[\s\S]*?\n\n/gi, '')  // Remove **thinking**: blocks
    .replace(/chain_of_thought:[\s\S]*?\n\n/gi, '')   // Remove chain_of_thought blocks
    .trim();
  
  return cleaned || null;
}

async function sendLongMessage(message, content) {
  const maxLength = 2000; // Limite do Discord
  
  if (content.length <= maxLength) {
    await message.reply(content);
    return;
  }
  
  // Dividir mensagem em chunks, preferindo quebras naturais
  const chunks = [];
  let currentChunk = '';
  
  const paragraphs = content.split('\n\n');
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + '\n\n' + paragraph).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        // Parágrafo muito longo, dividir por frases
        const sentences = paragraph.split('. ');
        for (const sentence of sentences) {
          if ((currentChunk + '. ' + sentence).length > maxLength) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              // Frase muito longa, dividir por caracteres
              chunks.push(sentence.substring(0, maxLength - 50) + '...');
              currentChunk = '...' + sentence.substring(maxLength - 50);
            }
          } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  // Enviar o primeiro chunk como reply, os restantes como mensagens normais
  await message.reply(chunks[0]);
  
  for (let i = 1; i < chunks.length; i++) {
    await message.channel.send(chunks[i]);
  }
}

// URL da Edge Function humanized-ai-tutor (preferir variável dedicada; fallback usa VITE_SUPABASE_URL)
const EDGE_TUTOR_URL = process.env.HUMANIZED_TUTOR_URL || (
  process.env.VITE_SUPABASE_URL
    ? `${process.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/humanized-ai-tutor`
    : ''
);

async function callEdgeTutor(question, studentId, aiModel, platform = 'discord') {
  try {
    const f = await getFetch();
    if (!EDGE_TUTOR_URL) return null;

    // Primeiro, verificar se precisa de web search
    let webSearchContext = null;
    let relevantContent = null;

    // Chamar ai-query para determinar se precisa de web search
    const aiQueryUrl = process.env.VITE_SUPABASE_URL 
      ? `${process.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/ai-query`
      : null;

    if (aiQueryUrl) {
      try {
        console.log('🔍 Verificando necessidade de web search para:', question);
        
        const aiQueryResp = await f(aiQueryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''}`,
          },
          body: JSON.stringify({
            question,
            platform: 'discord'
          })
        });

        if (aiQueryResp.ok) {
          const aiQueryData = await aiQueryResp.json();
          if (aiQueryData.webSearchContext) {
            webSearchContext = aiQueryData.webSearchContext;
            relevantContent = aiQueryData.relevantContent;
            console.log('✅ Web search context obtido para Discord');
          }
        }
      } catch (webSearchError) {
        console.warn('⚠️ Erro ao obter web search context:', webSearchError.message);
      }
    }

    // 🎭 Buscar PERSONALIDADE ATIVA (igual ao WhatsApp)
    let customPersonality = null;
    try {
      const { data: globalPref } = await supabase
        .from('global_preferences')
        .select('preference_value')
        .eq('preference_key', 'active_personality')
        .single();

      if (globalPref?.preference_value) {
        let personalityId = globalPref.preference_value;
        if (typeof personalityId === 'object' && personalityId.value) {
          personalityId = personalityId.value;
        } else if (typeof personalityId === 'string') {
          try {
            const parsed = JSON.parse(personalityId);
            personalityId = typeof parsed === 'object' && parsed.value ? parsed.value : parsed;
          } catch {}
        }
        if (personalityId !== 'default-assistant' && personalityId !== 'default') {
          const { data: personality } = await supabase
            .from('custom_personalities')
            .select('prompt')
            .eq('id', personalityId)
            .eq('is_active', true)
            .single();
          if (personality?.prompt) {
            customPersonality = personality.prompt;
            console.log('🎭 Discord: Personalidade ativa aplicada');
          }
        }
      }
    } catch (err) {
      console.log('⚠️ Discord: Erro ao buscar personalidade, usando padrão:', err?.message || err);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''}`,
      'Accept-Encoding': 'gzip, deflate, br',
      ...(process.env.HUMANIZED_INTERNAL_API_KEY ? { 'x-api-key': process.env.HUMANIZED_INTERNAL_API_KEY } : {})
    };

    const payload = {
      question,
      studentId,
      aiModel, // ✅ Passar modelo selecionado para a Edge Function
      platform,
      customPersonality,
      ...(webSearchContext ? { webSearchContext } : {})
    };

    console.log(`📤 Enviando para Edge Tutor | studentId=${studentId || 'N/A'} | platform=${platform}`);

    const timeoutMs = Number(process.env.DISCORD_AI_REQUEST_TIMEOUT || '20000');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await f(EDGE_TUTOR_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      // otimizações
      keepalive: true
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const t = await resp.text();
      console.warn('⚠️ Edge Tutor falhou:', resp.status, t);
      return null;
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      // Processar streaming SSE
      console.log('🌊 Discord: recebendo resposta em streaming (SSE)');
      const reader = resp.body?.getReader();
      if (!reader) {
        console.warn('⚠️ SSE sem reader disponível, caindo para JSON');
      } else {
        const decoder = new TextDecoder('utf-8');
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          // Opcional: poderíamos enviar parciais ao Discord no futuro
        }
        // Tentar extrair a mensagem final
        // Muitos servidores SSE enviam linhas começadas com 'data: '
        const lines = full.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let aggregated = '';
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.replace(/^data:\s?/, '');
            if (dataStr === '[DONE]') continue;
            try {
              const obj = JSON.parse(dataStr);
              const piece = obj?.delta?.content ?? obj?.content ?? obj?.answer ?? '';
              if (piece) aggregated += piece;
            } catch {
              aggregated += dataStr;
            }
          }
        }
        if (aggregated.trim()) {
          return aggregated.trim();
        }
      }
    }

    // Fallback: JSON
    const data = await resp.json();
    if (data?.canRespond && data?.answer) {
      return typeof data.answer === 'string' ? data.answer : JSON.stringify(data.answer);
    }
    return null;
  } catch (e) {
    console.warn('⚠️ Erro ao chamar Edge Tutor:', e?.message || e);
    return null;
  }
}

async function generateAIResponse(userMessage, context, userId) {
  try {
    const trimmed = typeof userMessage === 'string' ? userMessage.trim() : String(userMessage || '').trim();
    if (!trimmed) {
      return null;
    }
    // 1) Tentar primeiro via Edge Function (alinha com WhatsApp)
    const studentId = context?.student?.id || `discord:${context?.discordUser?.user_id || userId || 'unknown'}`;
    const edgeAnswer = await callEdgeTutor(
      trimmed,
      studentId,
      AI_SETTINGS.model,
      'discord'
    );
    if (edgeAnswer) {
      return sanitizeAIResponse(edgeAnswer) || edgeAnswer;
    }

    // 2) Fallback: Seleção dinâmica de provedor conforme o modelo
const isOpenRouter = true;
const baseUrl = AI_SETTINGS.openrouterBaseUrl;
const apiKey = AI_SETTINGS.openrouterApiKey;

if (!apiKey) {
  console.warn('⚠️ API key não configurada para OpenRouter - usando respostas contextuais básicas.');
  return null;
}


    const url = `${baseUrl}/chat/completions`;

    // Mensagens: system + user com prompt construído pelo contexto
    const messages = [
      { role: 'system', content: 'És um agente educativo para escolas portuguesas. Responde SEMPRE em português claro e encorajador, SEM tags de raciocínio como <think> ou <reasoning>. Dá respostas diretas e educativas.' },
      { role: 'user', content: buildAIPrompt(userMessage, context) }
    ];

    // TODO: centralizar esta lógica importando de src/lib/onlineModel.ts quando o build permitir compartilhar entre CJS/TS
    // Mantido em paridade com src/lib/onlineModel.ts e supabase/functions/_shared/onlineModel.ts
    // Reuso do mapeamento compartilhado (JSON) para evitar divergências
    const ONLINE_MODEL_MAP = require('./supabase/functions/_shared/online-models.json');
    let finalModel = AI_SETTINGS.model;

    // Se o modelo não parece um slug válido do OpenRouter (sem '/'), aplicar fallback seguro
    if (typeof finalModel === 'string' && !finalModel.includes('/')) {
      console.warn(`⚠️ Modelo inválido para OpenRouter detectado: ${finalModel}. Aplicando fallback para deepseek/deepseek-r1:free`);
      finalModel = 'deepseek/deepseek-r1:free';
    }

    const text = String(trimmed || '').toLowerCase();
    const temporalRegex = /\b(hoje|agora|atual|recente|último|ultima|última|nova|notícia|preço|cotação|tempo|clima|2024|2025|presidente|eleições|guerra|covid|inflação|bitcoin|dólar|euro|bolsa|mercado|stock|news|weather|current|latest|recent|today|now|price|rate|exchange|valor|custo)\b/i;
    const needsOnline = temporalRegex.test(text);
    // Detectar necessidade de informações temporais e forçar modelo :online no fallback do bot Discord
    if (isOpenRouter && needsOnline && typeof finalModel === 'string' && !finalModel.includes(':online')) {
      const onlineMap = ONLINE_MODEL_MAP;
      if (onlineMap[finalModel]) {
        console.log(`🛰️ Discord fallback: modelo convertido para versão :online: ${finalModel} → ${onlineMap[finalModel]}`);
        finalModel = onlineMap[finalModel];
      } else {
        console.log(`ℹ️ Discord fallback: modelo ${finalModel} não tem versão :online mapeada; usando DeepSeek online padrão.`);
        finalModel = 'deepseek/deepseek-chat:online';
      }
    }

    // Corpo da requisição compatível com OpenAI/OpenRouter
    const body = {
      model: finalModel,
      messages,
      temperature: AI_SETTINGS.temperature,
      max_tokens: AI_SETTINGS.maxTokens,
      stream: false,
      ...(isOpenRouter ? { provider: { sort: 'latency' } } : {})
    };

    const f = await getFetch();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(isOpenRouter ? { 'HTTP-Referer': 'https://clever-school-pal-ai', 'X-Title': 'EduBot Discord Agent' } : {})
    };

    const resp = await f(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error('❌ Erro na API de IA:', resp.status, t);
      return null;
    }

    const data = await resp.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim();
    const cleanContent = sanitizeAIResponse(rawContent);
    
    return cleanContent || null;
  } catch (e) {
    console.error('❌ Falha ao gerar resposta por IA:', e);
    return null;
  }
}

// Event handlers
client.once(Events.ClientReady, readyClient => {
  console.log(`🤖 Bot Discord conectado como ${readyClient.user.tag}`);
  console.log(`📚 Agente Educativo ativo em ${readyClient.guilds.cache.size} servidor(es)`);
  console.log('✅ Bot pronto para receber mensagens!');
});

client.on(Events.MessageCreate, async message => {
  // Ignorar mensagens do próprio bot
  if (message.author.bot) return;

  const isDM = !message.guild;

  try {
    if (isDM) {
      console.log(`📨 DM recebida de ${message.author.username} (${message.author.id}): ${message.content}`);
    } else {
      console.log(`📨 Mensagem recebida: ${message.content}`);
      console.log(`👤 De: ${message.author.username} (${message.author.id})`);
      console.log(`🏫 Guild: ${message.guild?.name} (${message.guild?.id})`);
      console.log(`📺 Canal: ${(message.channel && 'name' in message.channel) ? message.channel.name : message.channel.id} (${message.channel.id})`);
    }

    // Buscar contexto educativo
    const context = isDM
      ? await contextService.getContextForDM(message.author.id)
      : await contextService.getContextForMessage(
          message.guild.id,
          message.channel.id,
          message.author.id
        );

    console.log(`🎓 Contexto encontrado:`);
    console.log(`  - Escola: ${context.school?.name || 'N/A'}`);
    console.log(`  - Turma: ${context.class?.name || 'N/A'}`);
    console.log(`  - Estudante: ${context.student?.name || 'N/A'} | ID: ${context.student?.id || 'N/A'}`);

    // Se for comando (começa com '!'), usa respostas pré-definidas; caso contrário, usa IA
    const raw = (message.content || '').trim();
    const isCommand = raw.startsWith('!');

    let response;
    if (isCommand) {
      response = responseService.generateContextualResponse(message, context);
    } else {
      const aiResp = await generateAIResponse(raw, context, message.author.id);
      response = aiResp || responseService.generateContextualResponse(message, context);
    }

    // Sanitizar e enviar resposta (com suporte a mensagens longas)
    const safeResponse = sanitizeAIResponse(response) || response;
    await sendLongMessage(message, safeResponse);

    // Resolver guildId para logging em DMs (usa guild do utilizador se existir)
    const resolvedGuildId = isDM
      ? (context.discordUser?.guild_id || 'DM_NO_SCHOOL')
      : message.guild.id;

    // Registrar interação
    await contextService.logInteraction(
      resolvedGuildId,
      message.channel.id,
      message.author.id,
      message.content,
      response,
      context
    );

    console.log(`✅ Resposta enviada e interação registrada`);

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    try {
      await message.reply('❌ Ocorreu um erro ao processar a tua mensagem. Tenta novamente.');
    } catch (replyError) {
      console.error('❌ Erro ao enviar resposta de erro:', replyError);
    }
  }
});

// Error handling
client.on(Events.Error, error => {
  console.error('❌ Erro do Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Erro não tratado:', error);
});

// Iniciar bot
async function startBot() {
  try {
    console.log('🚀 Iniciando Agente Educativo Discord...');
    
    // Verificar token
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN não encontrado no .env');
    }

    // Verificar conexão Supabase
    const { data, error } = await supabase.from('schools').select('count').limit(1);
    if (error) {
      console.warn(`⚠️ Aviso Supabase: ${error.message}`);
    } else {
      console.log('✅ Conexão Supabase verificada');
    }

    console.log('🔑 Token Discord configurado');
    
    // Login do bot
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
  } catch (error) {
    console.error('❌ Erro ao iniciar bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando Agente Educativo...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando Agente Educativo...');
  client.destroy();
  process.exit(0);
});

// Iniciar
startBot();

console.log('\n🎓 Agente Educativo Discord');
console.log('📚 Sistema de contexto hierárquico: Escola → Turma → Estudante → Conteúdo');
console.log('🤖 Pronto para interações educativas!');