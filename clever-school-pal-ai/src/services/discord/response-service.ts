import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import fetch from 'node-fetch';
import { toOnlineIfNeeded } from '../../lib/onlineModel';
import { logger } from '../../lib/logger';

interface HierarchicalContext {
  global: {
    personality: string;
    language: string;
  };
  school?: {
    id: string;
    name: string;
    personality?: string;
    guidelines?: string;
    subjects?: string[];
  };
  class?: {
    id: string;
    name: string;
    subject?: string;
    level?: string;
    guidelines?: string;
  };
  student?: {
    id: string;
    name: string;
    preferences?: any;
    learningStyle?: string;
    currentTopics?: string[];
  };
  educational?: {
    currentSubject?: string;
    currentTopic?: string;
    difficulty?: string;
    materials?: any[];
  };
}

interface AIResponse {
  content: string;
  confidence: number;
  contextUsed: string[];
  suggestedActions?: string[];
}

export class DiscordResponseService {
  private supabase: ReturnType<typeof createClient<Database>>;
  private openaiApiKey?: string;
  private openrouterApiKey?: string; // ✅ Novo: chave OpenRouter
  private openrouterBaseUrl: string; // ✅ Novo: base URL OpenRouter
  private aiModel: string;
  private temperature: number;
  private maxTokens: number;
  private webSearchMode: 'regex' | 'llm_native' | 'hybrid';

  constructor(supabase: ReturnType<typeof createClient<Database>>, openaiApiKey?: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
    // ✅ OpenRouter config por ambiente
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openrouterBaseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/,'');
    // ✅ Configurações otimizadas para performance
    this.aiModel = process.env.AI_MODEL || 'google/gemini-2.0-flash-exp:free';
    this.temperature = process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : 0.3;
    this.maxTokens = process.env.AI_MAX_TOKENS ? Number(process.env.AI_MAX_TOKENS) : 300;
    const mode = (process.env.DISCORD_WEBSEARCH_MODE || 'regex').toLowerCase();
    this.webSearchMode = (mode === 'llm_native' || mode === 'hybrid' || mode === 'regex') ? (mode as any) : 'regex';
  }

  async generateResponse(message: string, context: HierarchicalContext, scope?: { userId?: string; channelId?: string; guildId?: string | null }): Promise<string | null> {
    try {
      // Build the AI prompt using hierarchical context
      const history = scope ? await this.getChatHistory(scope) : undefined;
      const prompt = this.buildHierarchicalPrompt(message, context, history);
      
      // Generate response using AI via OpenRouter
      const aiResponse = await this.callAI(prompt, context);
      
      if (!aiResponse) {
        return null;
      }

      // Post-process the response
      return this.postProcessResponse(aiResponse.content, context);
    } catch (error) {
      logger.error('Error generating response', { error });
      return null;
    }
  }

  // Novo: streaming de resposta para reduzir tempo até primeiro token
  async *generateResponseStream(message: string, context: HierarchicalContext, scope?: { userId?: string; channelId?: string; guildId?: string | null }): AsyncGenerator<string> {
    const history = scope ? await this.getChatHistory(scope) : undefined;
    const prompt = this.buildHierarchicalPrompt(message, context, history);
    yield* this.streamOpenRouter(prompt, context);
  }

  // Carrega histórico de conversa da tabela discord_interactions
  private async getChatHistory(scope: { userId?: string; channelId?: string; guildId?: string | null }): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>> {
    try {
      if (!scope.userId) return [];

      let q = this.supabase
        .from('discord_interactions')
        .select('message_content, bot_response, created_at, channel_id, guild_id')
        .eq('user_id', scope.userId)
        .order('created_at', { ascending: false })
        .limit(7);

      if (scope.channelId) {
        q = q.eq('channel_id', scope.channelId);
      } else if (scope.guildId !== undefined) {
        q = q.eq('guild_id', scope.guildId);
      }

      const { data, error } = await q;
      if (error || !data) {
        return [];
      }

      const messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }> = [];
      for (const row of data.reverse()) { // cronológico (antigo → recente)
        if (row.message_content) {
          messages.push({ role: 'user', content: row.message_content as string, timestamp: (row as any).created_at });
        }
        if (row.bot_response) {
          messages.push({ role: 'assistant', content: row.bot_response as string, timestamp: (row as any).created_at });
        }
      }

      // Limitar para evitar prompt muito longo (até 14 mensagens)
      return messages.slice(-14);
    } catch (e) {
      logger.warn('getChatHistory failed', { error: (e as any)?.message || e });
      return [];
    }
  }

  // Trunca conteúdo de histórico e remove URLs longas
  private truncateForHistory(text?: string, maxLength = 500): string {
    if (!text) return '';
    const cleaned = text.replace(/https?:\/\/[^\s<>"]+/g, '[URL]');
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  }

  private buildHierarchicalPrompt(message: string, context: HierarchicalContext, history?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>): string {
    let prompt = '';

    // 1. Global personality (base layer)
    prompt += `PERSONALIDADE BASE:\n${context.global.personality}\n\n`;
    prompt += `IDIOMA: ${context.global.language}\n\n`;

    // 2. School context (institutional layer)
    if (context.school) {
      prompt += `CONTEXTO ESCOLAR:\n`;
      prompt += `Escola: ${context.school.name}\n`;
      if (context.school.personality) {
        prompt += `Personalidade da Escola: ${context.school.personality}\n`;
      }
      if (context.school.guidelines) {
        prompt += `Diretrizes da Escola: ${context.school.guidelines}\n`;
      }
      if (context.school.subjects && context.school.subjects.length > 0) {
        prompt += `Disciplinas Disponíveis: ${context.school.subjects.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // 3. Class context (subject/class layer)
    if (context.class) {
      prompt += `CONTEXTO DA TURMA:\n`;
      prompt += `Turma: ${context.class.name}\n`;
      if (context.class.subject) {
        prompt += `Disciplina: ${context.class.subject}\n`;
      }
      if (context.class.level) {
        prompt += `Nível: ${context.class.level}\n`;
      }
      if (context.class.guidelines) {
        prompt += `Diretrizes da Turma: ${context.class.guidelines}\n`;
      }
      prompt += '\n';
    }

    // 4. Student context (individual layer)
    if (context.student) {
      prompt += `CONTEXTO DO ALUNO:\n`;
      prompt += `Aluno: ${context.student.name}\n`;
      if (context.student.learningStyle) {
        prompt += `Estilo de Aprendizagem: ${context.student.learningStyle}\n`;
      }
      if (context.student.preferences) {
        prompt += `Preferências: ${JSON.stringify(context.student.preferences)}\n`;
      }
      if (context.student.currentTopics && context.student.currentTopics.length > 0) {
        prompt += `Tópicos Atuais: ${context.student.currentTopics.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // 5. Educational content context
    if (context.educational) {
      prompt += `CONTEXTO EDUCACIONAL:\n`;
      if (context.educational.currentSubject) {
        prompt += `Disciplina Atual: ${context.educational.currentSubject}\n`;
      }
      if (context.educational.currentTopic) {
        prompt += `Tópico Atual: ${context.educational.currentTopic}\n`;
      }
      if (context.educational.difficulty) {
        prompt += `Nível de Dificuldade: ${context.educational.difficulty}\n`;
      }
      if (context.educational.materials && context.educational.materials.length > 0) {
        prompt += `Materiais Disponíveis: ${context.educational.materials.map(m => m.title || m.name).join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Instructions for the AI
    prompt += `INSTRUÇÕES:\n`;
    prompt += `1. Responde sempre em português (pt-PT)\n`;
    prompt += `2. Adapta a linguagem ao nível do aluno\n`;
    prompt += `3. Sê encorajador e positivo\n`;
    prompt += `4. Usa exemplos práticos quando possível\n`;
    prompt += `5. Se não souberes algo, admite e sugere recursos\n`;
    prompt += `6. Mantém as respostas concisas mas informativas\n`;
    prompt += `7. Usa emojis apropriados para tornar a conversa mais amigável\n\n`;
    // Regras adicionais para evitar links externos
    prompt += `REGRAS ADICIONAIS:\n`;
    prompt += `8. Não incluas links externos (YouTube, sites) por omissão\n`;
    prompt += `9. Nunca termines com uma linha "Link:"\n`;
    prompt += `10. Se mencionares recursos, descreve-os sem URLs\n`;
    prompt += `11. Evita recomendar vídeos em inglês ou espanhol salvo pedido explícito\n\n`;

    // Conversa anterior (se disponível)
    if (history && history.length > 0) {
      prompt += `HISTÓRICO DE CONVERSA (últimas ${history.length}):\n`;
      const formatted = history.map(h => {
        const who = h.role === 'user' ? 'ALUNO' : 'AGENTE';
        const ts = h.timestamp ? ` [${h.timestamp}]` : '';
        const content = this.truncateForHistory(h.content);
        return `- ${who}${ts}: ${content}`;
      }).join('\n');
      prompt += formatted + '\n\n';
    }

    // The actual user message
    prompt += `MENSAGEM DO ALUNO:\n${message}\n\n`;
    prompt += `RESPOSTA:`;

    return prompt;
  }

  private async callAI(prompt: string, context: HierarchicalContext): Promise<AIResponse | null> {
    try {
      // Padronizado: usar sempre OpenRouter
      if (this.openrouterApiKey) {
        return await this.callOpenRouter(prompt, context);
      } else {
        logger.error('OpenRouter API key não configurada. Defina OPENROUTER_API_KEY.');
        return null;
      }
    } catch (error) {
      logger.error('Error calling AI', { error });
      return null;
    }
  }

  // Removido: provedor antigo. O serviço agora usa exclusivamente OpenRouter.

  private async callOpenRouter(prompt: string, context: HierarchicalContext): Promise<AIResponse | null> {
    if (!this.openrouterApiKey) {
      logger.error('OpenRouter API key não configurada.');
      return null;
    }
    
    // 🌐 LÓGICA AUTOMÁTICA PARA MODELOS :ONLINE (suporta DISCORD_WEBSEARCH_MODE)
    let finalModel = this.aiModel;
    const needsWebSearchRegex = /\b(hoje|agora|atual|recente|último|nova|notícia|preço|cotação|tempo|clima|discord|servidor|presidente|primeiro\s*ministro|eleição|posse|mandato|governo|política|ministro)\b/i.test(prompt);
    const forceOnline = this.webSearchMode === 'llm_native' || (this.webSearchMode === 'hybrid' && needsWebSearchRegex) || (this.webSearchMode === 'regex' && needsWebSearchRegex);

    const converted = toOnlineIfNeeded(finalModel, forceOnline);
    if (converted !== finalModel) {
      logger.info('Modelo convertido para versão :online', { from: this.aiModel, to: converted, mode: this.webSearchMode, service: 'discord' });
      finalModel = converted;
    }
    if (forceOnline && !String(finalModel).includes(':online')) {
      logger.warn('Modelo sem variante :online mapeada, aplicando fallback', { fallback: 'deepseek/deepseek-chat:online', mode: this.webSearchMode, service: 'discord' });
      finalModel = 'deepseek/deepseek-chat:online';
    }

    // 📘 Log explícito do modelo final e parâmetros usados nesta chamada
    logger.info('OpenRouter (call) usando modelo final', {
      model: finalModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      webSearchMode: this.webSearchMode,
      service: 'discord'
    });
    
    const url = `${this.openrouterBaseUrl}/chat/completions`;
    const messages = [
      { role: 'system', content: 'És um agente educativo para escolas portuguesas. Responde SEMPRE em português claro e encorajador, evita tags de raciocínio como <think> ou <reasoning>. Não incluas links externos (YouTube, sites) por omissão; descreve recursos em texto sem URLs. Nunca termines com uma linha "Link:". Evita recomendar vídeos em inglês ou espanhol salvo pedido explícito do aluno. Para perguntas de fatos atuais (ex.: presidente, preço, clima, eventos), usa pesquisa web nativa do modelo e valida datas/fontes antes de responder. Se a informação mudar com o tempo, indica a data da fonte.' },
      { role: 'user', content: prompt }
    ];
    const body: any = {
      model: finalModel,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false,
      provider: { sort: 'latency' }
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': 'https://clever-school-pal-ai',
          'X-Title': 'EduBot Discord Agent'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        const errText = await resp.text();
        logger.error('OpenRouter API error', { status: resp.status, error: errText });
        return null;
      }
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      return content ? { content, confidence: 0.8, contextUsed: [] } : null;
    } catch (error) {
      logger.error('Error calling OpenRouter', { error });
      return null;
    }
  }

  // Novo: chamada OpenRouter com SSE e gerador assíncrono
  private async *streamOpenRouter(prompt: string, context: HierarchicalContext): AsyncGenerator<string> {
    if (!this.openrouterApiKey) {
      logger.error('OpenRouter API key não configurada.');
      return;
    }

    // Converter para :online conforme modo configurado
    let finalModel = this.aiModel;
    const needsWebSearchRegex = /\b(hoje|agora|atual|recente|último|nova|notícia|preço|cotação|tempo|clima|discord|servidor|presidente|primeiro\s*ministro|eleição|posse|mandato|governo|política|ministro)\b/i.test(prompt);
    const forceOnline = this.webSearchMode === 'llm_native' || (this.webSearchMode === 'hybrid' && needsWebSearchRegex) || (this.webSearchMode === 'regex' && needsWebSearchRegex);
    const converted = toOnlineIfNeeded(finalModel, forceOnline);
    if (converted !== finalModel) {
      finalModel = converted;
      logger.info('Modelo convertido para :online para streaming', { from: this.aiModel, to: finalModel, mode: this.webSearchMode, service: 'discord' });
    } else if (forceOnline && typeof finalModel === 'string' && !finalModel.includes(':online')) {
    const fallbackOnline = 'deepseek/deepseek-chat:online';
      logger.info('Aplicando fallback para modelo :online no streaming', { from: finalModel, to: fallbackOnline, reason: 'forçado pelo modo', mode: this.webSearchMode, service: 'discord' });
      finalModel = fallbackOnline;
    }

    // 📘 Log explícito do modelo final e parâmetros usados neste streaming
    logger.info('OpenRouter (stream) usando modelo final', {
      model: finalModel,
      temperature: this.temperature,
      webSearchMode: this.webSearchMode,
      service: 'discord'
    });

    const url = `${this.openrouterBaseUrl}/chat/completions`;
    const messages = [
      { role: 'system', content: 'És um agente educativo para escolas portuguesas. Responde SEMPRE em português claro e encorajador, evita tags de raciocínio como <think> ou <reasoning>. Não incluas links externos (YouTube, sites) por omissão; descreve recursos em texto sem URLs. Nunca termines com uma linha "Link:". Evita recomendar vídeos em inglês ou espanhol salvo pedido explícito do aluno. Para perguntas de fatos atuais (ex.: presidente, preço, clima, eventos), usa pesquisa web nativa do modelo e valida datas/fontes antes de responder. Se a informação mudar com o tempo, indica a data da fonte.' },
      { role: 'user', content: prompt }
    ];
    const body: any = {
      model: finalModel,
      messages,
      temperature: this.temperature,
      // Não definir max_tokens para não limitar a resposta (stream)
      stream: true,
      provider: { sort: 'latency' }
    };

    const controller = new AbortController();
    // Timeout apenas para a inicialização da ligação
    const timeout = setTimeout(() => controller.abort(), 30000);
    let buffer = '';
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': 'https://clever-school-pal-ai',
          'X-Title': 'EduBot Discord Agent'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        const errText = await resp.text();
        logger.error('OpenRouter API error (stream)', { status: resp.status, error: errText });
        return;
      }

      // node-fetch retorna um Readable stream
      const stream = resp.body as any;
      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        // manter última linha (pode estar incompleta)
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              return; // fim do stream
            }
            try {
              const json = JSON.parse(dataStr);
              const choice = json?.choices?.[0] || {};
              const token = (choice?.delta?.content ?? choice?.message?.content ?? '').toString();
              if (token) {
                // filtrar tags de raciocínio imediatamente
                const clean = token.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
                if (clean) {
                  const sanitized = this.sanitizeNoLinks(clean);
                  if (sanitized) {
                    yield sanitized;
                  }
                }
              }
            } catch (e) {
              // Ignorar linhas inválidas
            }
          }
        }
      }
    } catch (error) {
      logger.error('Erro no streaming OpenRouter', { error });
      return;
    }
  }

  private extractMessageFromPrompt(prompt: string): string {
    try {
      const idx = prompt.lastIndexOf('MENSAGEM DO ALUNO:');
      if (idx >= 0) {
        return prompt.slice(idx).replace('MENSAGEM DO ALUNO:', '').trim();
      }
      return prompt;
    } catch {
      return prompt;
    }
  }

  private generateSuggestedActions(message: string, context: HierarchicalContext): string[] {
    const actions: string[] = [];
    const msg = message.toLowerCase();

    if (msg.includes('exercício') || msg.includes('praticar')) {
      actions.push('Propor 3 exercícios práticos sobre o tema');
    }
    if (msg.includes('prova') || msg.includes('teste') || msg.includes('exame')) {
      actions.push('Sugerir um simulado rápido com 5 questões');
    }
    if (context.educational?.materials && context.educational.materials.length > 0) {
      actions.push('Recomendar leitura dos materiais listados');
    }

    return actions;
  }

  private postProcessResponse(response: string, context: HierarchicalContext): string {
    const message = this.extractMessageFromPrompt(response) || '';
    const suggestedActions = this.generateSuggestedActions(message, context);

    let final = response.trim();

    if (suggestedActions.length > 0) {
      final += `\n\nSugestões de próximos passos:\n- ${suggestedActions.join('\n- ')}`;
    }

    // Garantir que não vazamos tags de raciocínio
    final = final.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

    // Remover links externos e linhas do tipo "Link:"
    final = this.sanitizeNoLinks(final);

    return final;
  }

  // Remover URLs (http/https), markdown links e linhas como "Link:" ou "Vídeo:"
  private sanitizeNoLinks(text: string): string {
    try {
      let out = text;
      // Remover linhas que começam com Link:, Vídeo:, Video:
      out = out.replace(/^\s*(Link|Vídeo|Video)\s*:\s*.+$/gmi, '');
      // Converter markdown links [texto](url) em apenas texto
      out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1');
      // Remover URLs simples
      out = out.replace(/https?:\/\/\S+/gi, '');
      // Remover excesso de linhas em branco
      out = out.replace(/\n{3,}/g, '\n\n');
      // Não fazer trim aqui para preservar espaços em fronteiras de chunks no streaming
      return out;
    } catch {
      return text;
    }
  }

  async updateAIConfig(config: {
    openaiApiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    openrouterApiKey?: string; // ✅ permitir configurar em runtime
  }): Promise<void> {
    if (config.openaiApiKey) this.openaiApiKey = config.openaiApiKey;
    if (config.model) this.aiModel = config.model;
    if (typeof config.temperature === 'number') this.temperature = config.temperature;
    if (typeof config.maxTokens === 'number') this.maxTokens = config.maxTokens;
    if (config.openrouterApiKey) this.openrouterApiKey = config.openrouterApiKey;

    // 📘 Log resumo da configuração aplicada (sem expor chaves)
    const summary: any = {};
    if (config.model) summary.model = this.aiModel;
    if (typeof config.temperature === 'number') summary.temperature = this.temperature;
    if (typeof config.maxTokens === 'number') summary.maxTokens = this.maxTokens;
    if (config.openrouterApiKey) summary.openrouterApiKeySet = true;
    if (Object.keys(summary).length > 0) {
      logger.info('updateAIConfig: configuração atualizada', { ...summary, service: 'discord' });
    }
  }

  // ✅ Novo: aplicar configuração específica por escola a partir da tabela bot_config
  async applySchoolAIConfig(schoolId: string | null | undefined): Promise<void> {
    try {
      if (!schoolId) return;
      const { data, error } = await (this.supabase as any)
        .from('bot_config')
        .select('ai_model, max_response_length')
        .eq('school_id', schoolId)
        .single();
      if (error) {
        // Se não existir linha, apenas ignora silenciosamente
        logger.warn('applySchoolAIConfig: não foi possível obter bot_config da escola', { error: (error as any)?.message || error });
        return;
      }
      const model = data?.ai_model as string | null;
      const maxLen = (data?.max_response_length as number | null) ?? undefined;
      const updates: any = {};
      if (model && typeof model === 'string' && model.trim()) updates.model = model.trim();
      if (typeof maxLen === 'number' && Number.isFinite(maxLen)) updates.maxTokens = maxLen;
      if (Object.keys(updates).length > 0) {
        await this.updateAIConfig(updates);
        logger.info('applySchoolAIConfig: configuração de IA aplicada para escola', { schoolId, updates });
      }
    } catch (e) {
      logger.warn('applySchoolAIConfig: erro inesperado ao aplicar configuração da escola', { error: (e as any)?.message || e });
    }
  }

  async getResponseStats(guildId?: string, timeframe?: string): Promise<{
    totalResponses: number;
    averageResponseTime: number;
    topTopics: string[];
    userSatisfaction: number;
  }> {
    try {
      const { data: interactions } = await this.supabase
        .from('discord_interactions')
        .select('message_content, bot_response, created_at')
        .eq(guildId ? 'guild_id' : 'guild_id', guildId || '')
        .gte('created_at', timeframe || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!interactions || interactions.length === 0) {
        return {
          totalResponses: 0,
          averageResponseTime: 0,
          topTopics: [],
          userSatisfaction: 0
        };
      }

      const totalResponses = interactions.length;
      const averageResponseTime = 150; // Simulated average response time in ms
      
      // Simple topic extraction (in production, use NLP)
      const topics = interactions.map(i => {
        const content = i.message_content?.toLowerCase() || '';
        if (content.includes('matemática')) return 'matemática';
        if (content.includes('português')) return 'português';
        if (content.includes('ciências')) return 'ciências';
        if (content.includes('história')) return 'história';
        return 'geral';
      });
      
      const topicCounts = topics.reduce((acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic);

      return {
        totalResponses,
        averageResponseTime,
        topTopics,
        userSatisfaction: 0.85 // Placeholder - would be calculated from user feedback
      };
    } catch (error) {
      logger.error('Error getting response stats', { error });
      return {
        totalResponses: 0,
        averageResponseTime: 0,
        topTopics: [],
        userSatisfaction: 0
      };
    }
  }
}