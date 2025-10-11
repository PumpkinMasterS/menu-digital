import { Client, GatewayIntentBits, Events, Message, TextChannel, Partials, Attachment, EmbedBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { DiscordContextService } from './context-service';
import { DiscordResponseService } from './response-service';
import { logger } from '../../lib/logger';

interface DiscordBotConfig {
  token: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiApiKey?: string; // OpenRouter-compatible API key (optional)
}

export class DiscordBot {
  private client: Client;
  private supabase: ReturnType<typeof createClient<Database>>;
  private contextService: DiscordContextService;
  private responseService: DiscordResponseService;
  private isReady = false;
  private handlersRegistered = false;
  private supabaseUrl: string; // ✅ Guardar Supabase URL para chamar Edge Functions

  constructor(config: DiscordBotConfig) {
    // Initialize Discord client with necessary intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
      ],
      // Incluir Message/User para garantir acesso a anexos em DMs e mensagens parciais
      partials: [Partials.Channel, Partials.Message, Partials.User]
    });

    // Initialize Supabase client
    this.supabase = createClient<Database>(
      config.supabaseUrl,
      config.supabaseServiceKey
    );
    this.supabaseUrl = config.supabaseUrl; // ✅ Guardar URL

    // Initialize services
    this.contextService = new DiscordContextService(this.supabase);
    this.responseService = new DiscordResponseService(this.supabase, config.openaiApiKey);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Prevent duplicate handler registration within the same process
    if (this.handlersRegistered) {
      logger.warn('⚠️ Event handlers already registered. Skipping duplicate registration.');
      return;
    }

    // Bot ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      logger.info(`✅ Discord bot ready! Logged in as ${readyClient.user.tag}`);
      this.isReady = true;
      this.syncGuildsWithDatabase();
    });

    // Message create event - main interaction handler
    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Algumas DMs chegam como mensagens parciais e podem ocultar anexos até fazer fetch
      try {
        if ((message as any).partial) {
          logger.info('🧩 Mensagem parcial recebida; buscando dados completos...');
          await message.fetch();
        }
      } catch (e) {
        logger.warn('⚠️ Falha ao completar mensagem parcial', { error: (e as any)?.message || e });
      }
      await this.handleMessage(message);
    });

    // Guild join event - auto-setup new guilds
    this.client.on(Events.GuildCreate, async (guild) => {
      logger.info(`📥 Bot joined new guild: ${guild.name} (${guild.id})`);
      await this.contextService.registerGuild(guild.id, guild.name);
    });

    // Guild leave event - cleanup
    this.client.on(Events.GuildDelete, async (guild) => {
      logger.info(`📤 Bot left guild: ${guild.name} (${guild.id})`);
      await this.contextService.deactivateGuild(guild.id);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      logger.error('❌ Discord client error', { error });
    });

    this.client.on(Events.Warn, (warning) => {
      logger.warn('⚠️ Discord client warning', { warning });
    });

    this.handlersRegistered = true;
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      // 🧩 LOG INICIAL: Capturar TODAS as mensagens recebidas
      logger.info(`🧩 MENSAGEM RECEBIDA: 
        - Autor: ${message.author.username} (bot: ${message.author.bot})
        - Canal: ${message.guild ? `${message.guild.name}/${(message.channel as TextChannel).name}` : 'DM'}
        - Conteúdo: "${message.content}"
        - Anexos: ${message.attachments.size}
        - Embeds: ${(message as any).embeds?.length || 0}
        - DISCORD_BOT_ACTIVE: ${process.env.DISCORD_BOT_ACTIVE}`);

      // Ignore bot messages
      if (message.author.bot) {
        logger.info('🤖 Ignorando mensagem de bot');
        return;
      }

      // Ignore messages only if no content AND no attachments
      if (!message.content.trim() && message.attachments.size === 0) {
        logger.info('📭 Ignorando mensagem vazia (sem conteúdo e sem anexos)');
        return;
      }

      // Avoid duplicate responses when another Discord handler is active (default: disabled)
      if (process.env.DISCORD_BOT_ACTIVE !== 'true') {
        logger.info('🔇 DiscordBot (TS) disabled via DISCORD_BOT_ACTIVE != "true". Skipping reply.');
        return;
      }

      // Get guild, channel, and user IDs
      const guildId = message.guild?.id || null;
      const channelId = message.channel.id;
      const userId = message.author.id;

      // 🔍 1) Se houver anexo de imagem, iniciar fluxo de seleção 1/2/3
      if (message.attachments.size > 0) {
        const attachmentValues = [...message.attachments.values()] as Attachment[];
        try {
          logger.info(`📎 Mensagem contém ${attachmentValues.length} anexo(s). guildId=${message.guild?.id || 'DM'} channelId=${message.channel.id}`);
          attachmentValues.forEach((att, idx) => {
            logger.info(`📎[${idx}] name=${att.name || '—'} ct=${att.contentType || '—'} w=${att.width ?? '—'} h=${att.height ?? '—'} url=${att.url}`);
          });
        } catch {}
        const imageAttachment = attachmentValues.find(att => {
          const ct = att.contentType || '';
          const name = att.name || '';
          const isByExt = /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name);
          return ct.startsWith('image/') || att.height !== undefined || att.width !== undefined || isByExt;
        });
        const attachmentToProcess = imageAttachment || attachmentValues[0];
        if (attachmentToProcess) {
          if (!imageAttachment) {
            logger.info('🖼️ Nenhum anexo foi reconhecido como imagem via metadados; vou tentar processar o primeiro anexo e validar pelo cabeçalho HTTP/URL.');
          }
          // Expirar fluxos anteriores pendentes para evitar conflito
          try {
            await (this.supabase as any)
              .from('discord_pending_flows')
              .update({ status: 'expired' })
              .eq('user_id', userId)
              .eq('channel_id', channelId)
              .eq('flow_type', 'image_model_selection')
              .eq('status', 'pending');
          } catch (e) {
            logger.warn('⚠️ Falha ao expirar fluxos anteriores', { error: (e as any)?.message || e });
          }

          // Upload para bucket tmp-ocr e gerar URL assinada
          const uploaded = await this.uploadDiscordImageToTmpOcr(attachmentToProcess as Attachment, guildId, channelId, userId, message.id);

          // Resolver studentId via discord_id (opcional)
          let studentId: string | undefined;
          try {
            const { data: st } = await (this.supabase as any)
              .from('students')
              .select('id')
              .eq('discord_id', userId)
              .single();
            if (st?.id) studentId = st.id;
          } catch {}

          // Fallback: tentar resolver via discord_users quando students.discord_id não existir
          if (!studentId) {
            try {
              const { data: du } = await (this.supabase as any)
                .from('discord_users')
                .select('student_id, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1);
              if (du && du[0]?.student_id) studentId = du[0].student_id;
            } catch {}
          }

          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
          try {
            await (this.supabase as any)
              .from('discord_pending_flows')
              .insert({
                user_id: userId,
                guild_id: guildId,
                channel_id: channelId,
                flow_type: 'image_model_selection',
                status: 'pending',
                state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida', messageId: message.id },
                student_id: studentId || null,
                expires_at: expiresAt
              });

            await message.reply(
              'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
            );
            return; // Consumimos a mensagem com anexo
          } catch (flowErr) {
            logger.error('⚠️ Erro ao preparar fluxo de análise de imagem (Discord)', { error: (flowErr as any)?.message || flowErr });
          }
        }
      }

      // 🔍 1.1) Se colou um LINK de imagem (http/https) ou uma data URL em texto, iniciar o mesmo fluxo
      const contentTrimmed = message.content?.trim();
      if (contentTrimmed) {
        // Detectar data URL
        const dataUrlMatch = contentTrimmed.match(/data:image\/(png|jpg|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)/i);
        if (dataUrlMatch) {
          // Expirar fluxos anteriores pendentes para evitar conflito
          try {
            await (this.supabase as any)
              .from('discord_pending_flows')
              .update({ status: 'expired' })
              .eq('user_id', userId)
              .eq('channel_id', channelId)
              .eq('flow_type', 'image_model_selection')
              .eq('status', 'pending');
          } catch (e) {
            logger.warn('⚠️ Falha ao expirar fluxos anteriores (data URL)', { error: (e as any)?.message || e });
          }

          // Upload da data URL
          try {
            const uploaded = await this.uploadDataUrlImageToTmpOcr(contentTrimmed, guildId, channelId, userId, message.id);

            // Resolver studentId
            let studentId: string | undefined;
            try {
              const { data: st } = await (this.supabase as any)
                .from('students')
                .select('id')
                .eq('discord_id', userId)
                .single();
              if (st?.id) studentId = st.id;
            } catch {}
            if (!studentId) {
              try {
                const { data: du } = await (this.supabase as any)
                  .from('discord_users')
                  .select('student_id, updated_at')
                  .eq('user_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1);
                if (du && du[0]?.student_id) studentId = du[0].student_id;
              } catch {}
            }

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await (this.supabase as any)
              .from('discord_pending_flows')
              .insert({
                user_id: userId,
                guild_id: guildId,
                channel_id: channelId,
                flow_type: 'image_model_selection',
                status: 'pending',
                state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (data URL)', messageId: message.id },
                student_id: studentId || null,
                expires_at: expiresAt
              });

            await message.reply(
              'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
            );
            return;
          } catch (e) {
            logger.warn('⚠️ Falha ao processar data URL de imagem', { error: (e as any)?.message || e });
          }
        }

        // Detectar URLs http/https
        const urls = this.extractUrls(contentTrimmed);
        const imageUrlByExt = urls.find(u => this.isImageUrlByExtension(u));
        const candidateUrl = imageUrlByExt || urls[0];
        if (candidateUrl) {
          // Expirar fluxos anteriores pendentes para evitar conflito
          try {
            await (this.supabase as any)
              .from('discord_pending_flows')
              .update({ status: 'expired' })
              .eq('user_id', userId)
              .eq('channel_id', channelId)
              .eq('flow_type', 'image_model_selection')
              .eq('status', 'pending');
          } catch (e) {
            logger.warn('⚠️ Falha ao expirar fluxos anteriores (URL)', { error: (e as any)?.message || e });
          }

          try {
            const uploaded = await this.uploadImageUrlToTmpOcr(candidateUrl, guildId, channelId, userId, message.id);

            // Resolver studentId
            let studentId: string | undefined;
            try {
              const { data: st } = await (this.supabase as any)
                .from('students')
                .select('id')
                .eq('discord_id', userId)
                .single();
              if (st?.id) studentId = st.id;
            } catch {}
            if (!studentId) {
              try {
                const { data: du } = await (this.supabase as any)
                  .from('discord_users')
                  .select('student_id, updated_at')
                  .eq('user_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1);
                if (du && du[0]?.student_id) studentId = du[0].student_id;
              } catch {}
            }

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await (this.supabase as any)
              .from('discord_pending_flows')
              .insert({
                user_id: userId,
                guild_id: guildId,
                channel_id: channelId,
                flow_type: 'image_model_selection',
                status: 'pending',
                state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (URL)', messageId: message.id },
                student_id: studentId || null,
                expires_at: expiresAt
              });

            await message.reply(
              'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
            );
            return;
          } catch (e) {
            logger.warn('⚠️ Falha ao baixar/processar URL de imagem', { error: (e as any)?.message || e });
          }
        }
      }

      // 🖼️ 1.2) Se a mensagem contém EMBED com imagem, iniciar o mesmo fluxo
      try {
        const embedCount = Array.isArray((message as any).embeds) ? (message as any).embeds.length : 0;
        if (embedCount > 0) {
          logger.info(`🧩 Mensagem contém ${embedCount} embed(s). Tentando extrair URLs de imagem.`);
        }
      } catch {}
      if (Array.isArray((message as any).embeds) && (message as any).embeds.length > 0) {
        const embeds = (message as any).embeds;
        let embedImageUrl: string | undefined;
        for (const em of embeds) {
          // Extrair possíveis URLs de imagem do embed
          const urlCandidates: string[] = [];
          const imageUrl = em?.image?.url || em?.data?.image?.url;
          const thumbUrl = em?.thumbnail?.url || em?.data?.thumbnail?.url;
          const directUrl = em?.url || em?.data?.url;
          if (imageUrl) urlCandidates.push(imageUrl);
          if (thumbUrl) urlCandidates.push(thumbUrl);
          if (directUrl) urlCandidates.push(directUrl);
          // Priorizar por extensão conhecida de imagem, senão tentar o primeiro candidato
          const byExt = urlCandidates.find(u => this.isImageUrlByExtension(u));
          const candidate = byExt || urlCandidates[0];
          if (candidate) { embedImageUrl = candidate; break; }
        }

        if (embedImageUrl) {
          // Expirar fluxos anteriores pendentes para evitar conflito
          try {
            await (this.supabase as any)
              .from('discord_pending_flows')
              .update({ status: 'expired' })
              .eq('user_id', userId)
              .eq('channel_id', channelId)
              .eq('flow_type', 'image_model_selection')
              .eq('status', 'pending');
          } catch (e) {
            logger.warn('⚠️ Falha ao expirar fluxos anteriores (embed)', { error: (e as any)?.message || e });
          }

          try {
            const uploaded = await this.uploadImageUrlToTmpOcr(embedImageUrl, guildId, channelId, userId, message.id);

            // Resolver studentId
            let studentId: string | undefined;
            try {
              const { data: st } = await (this.supabase as any)
                .from('students')
                .select('id')
                .eq('discord_id', userId)
                .single();
              if (st?.id) studentId = st.id;
            } catch {}
            if (!studentId) {
              try {
                const { data: du } = await (this.supabase as any)
                  .from('discord_users')
                  .select('student_id, updated_at')
                  .eq('user_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1);
                if (du && du[0]?.student_id) studentId = du[0].student_id;
              } catch {}
            }

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await (this.supabase as any)
              .from('discord_pending_flows')
              .insert({
                user_id: userId,
                guild_id: guildId,
                channel_id: channelId,
                flow_type: 'image_model_selection',
                status: 'pending',
                state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (embed)', messageId: message.id },
                student_id: studentId || null,
                expires_at: expiresAt
              });

            await message.reply(
              'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
            );
            return;
          } catch (e) {
            logger.warn('⚠️ Falha ao processar EMBED de imagem', { error: (e as any)?.message || e });
          }
        }
      }

      // 🔄 2) Se for texto, verificar se há fluxo pendente de seleção de modelo
      if (message.content && message.content.trim()) {
        try {
          const nowIso = new Date().toISOString();
          const { data: flows } = await (this.supabase as any)
            .from('discord_pending_flows')
            .select('id, state_data, expires_at, status')
            .eq('user_id', userId)
            .eq('channel_id', channelId)
            .eq('flow_type', 'image_model_selection')
            .eq('status', 'pending')
            .gt('expires_at', nowIso)
            .order('created_at', { ascending: false })
            .limit(1);

          const pending = (flows && flows.length > 0) ? flows[0] : null;
          if (pending) {
            const choice = (message.content || '').trim();
            let chosen: 'instruct' | 'thinking' | 'none' | null = null;
            if (/^(1|instruct)\b/i.test(choice)) chosen = 'instruct';
            else if (/^(2|think|thinking)\b/i.test(choice)) chosen = 'thinking';
            else if (/^(3|nao|não|não|no)\b/i.test(choice)) chosen = 'none';

            if (!chosen) {
              await message.reply('Por favor, responda com 1, 2 ou 3 para escolher o modelo.');
              return;
            }

            if (chosen === 'none') {
              await (this.supabase as any)
                .from('discord_pending_flows')
                .update({ status: 'cancelled' })
                .eq('id', pending.id);
              await message.reply('Beleza! Não vou analisar esta imagem. Se quiser, envie outra quando preferir.');
              return;
            }

            const imgUrl = pending.state_data?.imageUrl || pending.state_data?.image_url;
            if (!imgUrl) {
              await (this.supabase as any)
                .from('discord_pending_flows')
                .update({ status: 'expired' })
                .eq('id', pending.id);
              await message.reply('A imagem expirou. Por favor, envie novamente.');
              return;
            }

            // Se tivermos o caminho do objeto, regerar uma URL assinada fresca (TTL maior) para evitar expiração
            const imagePath: string | undefined = pending.state_data?.imagePath;
            let effectiveImgUrl = imgUrl as string;
            if (imagePath) {
              try {
                const { data: reSign, error: reSignErr } = await (this.supabase as any)
                  .storage
                  .from('tmp-ocr')
                  .createSignedUrl(imagePath, 600); // 10 minutos
                if (reSign && reSign.signedUrl) {
                  effectiveImgUrl = reSign.signedUrl;
                } else if (reSignErr) {
                  logger.warn('⚠️ Falha ao regerar signed URL, usando a existente', { error: (reSignErr as any)?.message || reSignErr });
                }
              } catch (reErr) {
                logger.warn('⚠️ Erro ao regerar signed URL, usando a existente', { error: (reErr as any)?.message || reErr });
              }
            }

            const caption = pending.state_data?.caption || 'Imagem recebida';
            const visionModel = chosen === 'instruct'
              ? 'qwen/qwen3-vl-235b-a22b-instruct'
              : 'qwen/qwen3-vl-235b-a22b-thinking';

            // Resolver studentId (opcional)
            let studentIdForCall: string | undefined;
            try {
              const { data: st2 } = await (this.supabase as any)
                .from('students')
                .select('id')
                .eq('discord_id', userId)
                .single();
              if (st2?.id) studentIdForCall = st2.id;
            } catch {}

            // Fallback: tentar resolver via discord_users
            if (!studentIdForCall) {
              try {
                const { data: du2 } = await (this.supabase as any)
                  .from('discord_users')
                  .select('student_id, updated_at')
                  .eq('user_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1);
                if (du2 && du2[0]?.student_id) studentIdForCall = du2[0].student_id;
              } catch {}
            }

            // Chamar Edge Function humanized-ai-tutor
            try {
              const aiResponse = await fetch(`${this.supabaseUrl}/functions/v1/humanized-ai-tutor`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  // Supabase Functions gateway auth (required)
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
                  // App-level auth for the function (optional depending on HUMANIZED_REQUIRE_AUTH)
                  'x-api-key': process.env.HUMANIZED_INTERNAL_API_KEY || ''
                },
                body: JSON.stringify({
                  phoneNumber: null,
                  studentId: studentIdForCall,
                  question: caption,
                  customPersonality: null,
                  platform: 'discord',
                  messageType: 'image',
                  imageUrl: effectiveImgUrl,
                  visionModel
                })
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                if (aiData.canRespond && aiData.answer) {
                  if (aiData.generatedImage?.imageUrl) {
                    const embed = new EmbedBuilder()
                      .setDescription(aiData.answer)
                      .setImage(aiData.generatedImage.imageUrl);
                    await message.reply({ embeds: [embed] });
                  } else {
                    await message.reply(aiData.answer);
                  }
                  await (this.supabase as any)
                    .from('discord_pending_flows')
                    .update({ status: 'completed' })
                    .eq('id', pending.id);
                } else {
                  await message.reply('Não consegui analisar a imagem. Tente novamente em instantes.');
                }
              } else {
                let errBody = '';
                try { errBody = await aiResponse.text(); } catch {}
                logger.error('❌ humanized-ai-tutor non-OK response', { status: aiResponse.status, body: errBody });
                await message.reply('Falha ao processar a imagem. Tente novamente mais tarde.');
              }
              return; // Consumimos a mensagem de escolha
            } catch (callErr) {
              logger.error('❌ Erro ao chamar humanized-ai-tutor', { error: (callErr as any)?.message || callErr });
              await message.reply('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
              return;
            }
          }
        } catch (selErr) {
          logger.warn('⚠️ Erro ao verificar fluxo pendente', { error: (selErr as any)?.message || selErr });
        }
      }

      // Handle DMs (no guild context)
      if (!guildId) {
        logger.info(`📨 DM from ${message.author.username}: ${message.content}`);

        // Register user if not exists
        await this.contextService.registerUser(userId, message.author.username, message.author.displayName);

        // Build DM context (student-centric)
        const context = await this.contextService.buildDMContext(userId);

        // ✅ Apply school-specific AI config for DM based on user's mapped guild/school
        const resolvedGuildId = await this.contextService.getGuildIdForUser(userId);
        const schoolId = context.school?.id || (resolvedGuildId ? await this.contextService.getSchoolIdForGuild(resolvedGuildId) : null);
        await this.responseService.applySchoolAIConfig(schoolId);

        // 🔁 Última tentativa: se for DM e houver anexos/embeds/URL de imagem, iniciar fluxo de imagem aqui
        try {
          const hasAttachments = message.attachments && message.attachments.size > 0;
          const embedCount = Array.isArray((message as any).embeds) ? (message as any).embeds.length : 0;
          const contentTrimmed = message.content?.trim() || '';
          const hasDataUrl = /data:image\/(png|jpg|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)/i.test(contentTrimmed);
          const urls = this.extractUrls(contentTrimmed);
          const imageUrlByExt = urls.find(u => this.isImageUrlByExtension(u));
          const candidateUrl = imageUrlByExt || urls[0];

          if (hasAttachments) {
            const attachmentValues = [...message.attachments.values()] as Attachment[];
            const imageAttachment = attachmentValues.find(att => {
              const ct = att.contentType || '';
              const name = att.name || '';
              const isByExt = /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name);
              return ct.startsWith('image/') || att.height !== undefined || att.width !== undefined || isByExt;
            });
            const attachmentToProcess = imageAttachment || attachmentValues[0];
            if (attachmentToProcess) {
              logger.info('🔁 DM: processando anexo como imagem em fallback');
              // Expirar qualquer fluxo anterior
              try {
                await (this.supabase as any)
                  .from('discord_pending_flows')
                  .update({ status: 'expired' })
                  .eq('user_id', userId)
                  .eq('channel_id', channelId)
                  .eq('flow_type', 'image_model_selection')
                  .eq('status', 'pending');
              } catch {}

              const uploaded = await this.uploadDiscordImageToTmpOcr(attachmentToProcess as Attachment, guildId, channelId, userId, message.id);

              const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
              await (this.supabase as any)
                .from('discord_pending_flows')
                .insert({
                  user_id: userId,
                  guild_id: guildId,
                  channel_id: channelId,
                  flow_type: 'image_model_selection',
                  status: 'pending',
                  state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (DM)', messageId: message.id },
                  student_id: null,
                  expires_at: expiresAt
                });

              await message.reply(
                'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
              );
              return;
            }
          }

          if (embedCount > 0) {
            const embeds = (message as any).embeds;
            let embedImageUrl: string | undefined;
            for (const em of embeds) {
              const urlCandidates: string[] = [];
              const imageUrl = em?.image?.url || em?.data?.image?.url;
              const thumbUrl = em?.thumbnail?.url || em?.data?.thumbnail?.url;
              const directUrl = em?.url || em?.data?.url;
              if (imageUrl) urlCandidates.push(imageUrl);
              if (thumbUrl) urlCandidates.push(thumbUrl);
              if (directUrl) urlCandidates.push(directUrl);
              const byExt = urlCandidates.find(u => this.isImageUrlByExtension(u));
              const candidate = byExt || urlCandidates[0];
              if (candidate) { embedImageUrl = candidate; break; }
            }
            if (embedImageUrl) {
              logger.info('🔁 DM: processando EMBED como imagem em fallback');
              try {
                await (this.supabase as any)
                  .from('discord_pending_flows')
                  .update({ status: 'expired' })
                  .eq('user_id', userId)
                  .eq('channel_id', channelId)
                  .eq('flow_type', 'image_model_selection')
                  .eq('status', 'pending');
              } catch {}

              const uploaded = await this.uploadImageUrlToTmpOcr(embedImageUrl, guildId, channelId, userId, message.id);
              const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
              await (this.supabase as any)
                .from('discord_pending_flows')
                .insert({
                  user_id: userId,
                  guild_id: guildId,
                  channel_id: channelId,
                  flow_type: 'image_model_selection',
                  status: 'pending',
                  state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (DM embed)', messageId: message.id },
                  student_id: null,
                  expires_at: expiresAt
                });
              await message.reply(
                'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
              );
              return;
            }
          }

          if (hasDataUrl || candidateUrl) {
            const srcUrl = hasDataUrl ? contentTrimmed : candidateUrl;
            logger.info('🔁 DM: processando URL/dataURL como imagem em fallback');
            try {
              await (this.supabase as any)
                .from('discord_pending_flows')
                .update({ status: 'expired' })
                .eq('user_id', userId)
                .eq('channel_id', channelId)
                .eq('flow_type', 'image_model_selection')
                .eq('status', 'pending');
            } catch {}

            const uploaded = hasDataUrl
              ? await this.uploadDataUrlImageToTmpOcr(srcUrl, guildId, channelId, userId, message.id)
              : await this.uploadImageUrlToTmpOcr(srcUrl!, guildId, channelId, userId, message.id);

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await (this.supabase as any)
              .from('discord_pending_flows')
              .insert({
                user_id: userId,
                guild_id: guildId,
                channel_id: channelId,
                flow_type: 'image_model_selection',
                status: 'pending',
                state_data: { imageUrl: uploaded.signedUrl, imagePath: uploaded.path, caption: message.content || 'Imagem recebida (DM URL)', messageId: message.id },
                student_id: null,
                expires_at: expiresAt
              });
            await message.reply(
              'Recebi sua imagem! Como você quer que eu analise?\n1) Resposta rápida e objetiva\n2) Raciocínio detalhado (pode demorar mais)\n3) Não analisar'
            );
            return;
          }
        } catch (dmImgErr) {
          logger.warn('⚠️ DM fallback de imagem falhou', { error: (dmImgErr as any)?.message || dmImgErr });
        }

        // Generate response using AI (streaming for faster TTFB)
        const startTime = Date.now();
        let streamedContent = '';
        let replyMessage: Message | null = null;
        // Cadência constante: editar em intervalo fixo
        const editIntervalMs = Number(process.env.DISCORD_STREAM_EDIT_INTERVAL_MS || '650');
        let editedLength = 0;
        let editTimer: NodeJS.Timeout | null = null;

        try { (message.channel as any).sendTyping?.(); } catch {}
        const typingInterval = setInterval(() => {
          try { (message.channel as any).sendTyping?.(); } catch {}
        }, 9000);

        try {
          for await (const chunk of this.responseService.generateResponseStream(message.content, context, { userId, channelId, guildId: resolvedGuildId || null })) {
            streamedContent += chunk;
            if (!replyMessage) {
              if (streamedContent.trim().length > 0) {
                replyMessage = await message.reply(streamedContent);
                editedLength = streamedContent.length;
                // Iniciar temporizador de edição com cadência fixa
                if (!editTimer) {
                  editTimer = setInterval(async () => {
                    if (replyMessage && streamedContent.length > editedLength) {
                      try {
                        await replyMessage.edit(streamedContent);
                        editedLength = streamedContent.length;
                      } catch {}
                    }
                  }, editIntervalMs);
                }
              }
              continue;
            }
            // Sem edição aqui; o temporizador garante cadência constante
          }
        } catch (streamErr) {
          logger.error('Erro no streaming de resposta (DM)', { error: streamErr });
        } finally {
          clearInterval(typingInterval);
          if (editTimer) clearInterval(editTimer);
        }

        let finalResponse = streamedContent;
        if (!finalResponse || !finalResponse.trim()) {
          finalResponse = await this.responseService.generateResponse(message.content, context, { userId, channelId, guildId: resolvedGuildId || null }) || '';
          if (finalResponse) {
            await message.reply(finalResponse);
          }
        } else if (replyMessage) {
          try { await replyMessage.edit(finalResponse); } catch {}
        }

        const responseTime = Date.now() - startTime;

        if (finalResponse) {
          await this.logInteraction({
            messageId: message.id,
            userId,
            channelId,
            guildId: resolvedGuildId || 'DM_NO_SCHOOL',
            messageContent: message.content,
            botResponse: finalResponse,
            contextApplied: context,
            responseTimeMs: responseTime
          });
          logger.info(`✅ Responded to DM from ${message.author.username} in ${responseTime}ms`, {
            streamed: !!streamedContent,
            responseTimeMs: responseTime,
            userId,
            channelId,
            guildId: resolvedGuildId || 'DM_NO_SCHOOL'
          });
        }
        return;
      }

      logger.info(`📨 Message from ${message.author.username} in ${message.guild?.name}/${(message.channel as TextChannel).name}: ${message.content}`, {
        userId,
        channelId,
        guildId,
        messageId: message.id
      });

      // Check if bot should respond in this channel
      const shouldRespond = await this.contextService.shouldRespondInChannel(guildId, channelId);
      if (!shouldRespond) {
        logger.info(`🔇 Bot configured not to respond in channel ${channelId}`, {
          channelId,
          guildId
        });
        return;
      }

      // Register user if not exists
      await this.contextService.registerUser(userId, message.author.username, message.author.displayName);

      // Register channel if not exists
      if (message.channel instanceof TextChannel) {
        await this.contextService.registerChannel(channelId, guildId, message.channel.name);
      }

      // Build hierarchical context
      const context = await this.contextService.buildHierarchicalContext(guildId, channelId, userId);

      // Generate response using AI (prefer streaming)
      const startTime = Date.now();
        let streamedContent = '';
        let replyMessage: Message | null = null;
        // Cadência constante: editar em intervalo fixo
        const editIntervalMs = Number(process.env.DISCORD_STREAM_EDIT_INTERVAL_MS || '650');
        let editedLength = 0;
        let editTimer: NodeJS.Timeout | null = null;

      try { (message.channel as any).sendTyping?.(); } catch {}
      const typingInterval = setInterval(() => {
        try { (message.channel as any).sendTyping?.(); } catch {}
      }, 9000);

      try {
        for await (const chunk of this.responseService.generateResponseStream(message.content, context, { userId, channelId, guildId })) {
          streamedContent += chunk;
          if (!replyMessage) {
            if (streamedContent.trim().length > 0) {
              replyMessage = await message.reply(streamedContent);
              editedLength = streamedContent.length;
              // Iniciar temporizador de edição com cadência fixa
              if (!editTimer) {
                editTimer = setInterval(async () => {
                  if (replyMessage && streamedContent.length > editedLength) {
                    try {
                      await replyMessage.edit(streamedContent);
                      editedLength = streamedContent.length;
                    } catch {}
                  }
                }, editIntervalMs);
              }
            }
            continue;
          }
          // Sem edição aqui; o temporizador garante cadência constante
        }
      } catch (streamErr) {
        logger.error('Erro no streaming de resposta (Guild)', { error: streamErr });
      } finally {
        clearInterval(typingInterval);
        if (editTimer) clearInterval(editTimer);
      }

      let finalResponse = streamedContent;
      if (!finalResponse || !finalResponse.trim()) {
        finalResponse = await this.responseService.generateResponse(message.content, context, { userId, channelId, guildId }) || '';
        if (finalResponse) {
          await message.reply(finalResponse);
        }
      } else if (replyMessage) {
        try { await replyMessage.edit(finalResponse); } catch {}
      }

      const responseTime = Date.now() - startTime;

      if (finalResponse) {
        await this.logInteraction({
          messageId: message.id,
          userId,
          channelId,
          guildId,
          messageContent: message.content,
          botResponse: finalResponse,
          contextApplied: context,
          responseTimeMs: responseTime
        });

        logger.info(`✅ Responded to ${message.author.username} in ${responseTime}ms (stream ${streamedContent ? 'on' : 'off'})`, {
          userId,
          channelId,
          guildId,
          responseTimeMs: responseTime
        });
      }
    } catch (error) {
      logger.error('❌ Error handling message', { error });
      // No user-facing fallback message
    }
  }

  // ✅ Helper: Extrair URLs de texto
  private extractUrls(text: string): string[] {
    if (!text) return [];
    
    // Regex para detectar URLs http/https
    const urlRegex = /https?:\/\/[^\s\u00A0<>"'\[\]()]+/gi;
    const matches = text.match(urlRegex) || [];
    
    // Remover caracteres finais inválidos como pontuação
    return matches.map(url => {
      // Remover caracteres finais inválidos
      let cleanUrl = url.replace(/[.,;:!?\]\)\}\>\"']+$/, '');
      
      // Verificar se termina com parêntese fechando (caso especial)
      if (cleanUrl.endsWith(')') && !cleanUrl.includes('(')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      
      return cleanUrl;
    }).filter(url => url.length > 0);
  }

  // ✅ Helper: Verificar se URL é de imagem por extensão
  private isImageUrlByExtension(url: string): boolean {
    if (!url) return false;
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(ext));
  }

  // ✅ Helper: Upload imagem do Discord para bucket tmp-ocr e gerar URL assinada
  private async uploadDiscordImageToTmpOcr(attachment: Attachment, guildId: string | null, channelId: string, userId: string, messageId: string): Promise<{ path: string; signedUrl: string }> {
    try {
      const url = attachment.url;
      const ctFromAttachment = attachment.contentType || '';
      const filenameBase = attachment.name || `image_${Date.now()}`;
      const ext = (filenameBase.split('.').pop() || 'jpg').toLowerCase();
      const path = `discord/${guildId || 'dm'}/${channelId}/${userId}/${messageId}.${ext}`;

      logger.info(`📤 Iniciando upload de imagem: ${filenameBase} (${ctFromAttachment || 'unknown'})`);
      logger.info(`📤 URL do anexo: ${url}`);
      logger.info(`📤 Caminho no storage: ${path}`);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Falha ao baixar anexo do Discord');
      const arrayBuffer = await resp.arrayBuffer();
      const fetchedCt = resp.headers.get('content-type') || '';
      const byExt = /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(filenameBase);
      let effectiveCt = fetchedCt || ctFromAttachment || '';
      const looksImage = (effectiveCt.startsWith('image/')) || byExt || (attachment.height !== undefined) || (attachment.width !== undefined);
      if (!looksImage) {
        throw new Error('Anexo não parece ser uma imagem');
      }
      if (!effectiveCt || !effectiveCt.startsWith('image/')) {
        effectiveCt = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      }

      const { error: upErr } = await (this.supabase as any)
        .storage
        .from('tmp-ocr')
        .upload(path, new Uint8Array(arrayBuffer), { contentType: effectiveCt, upsert: true });

      if (upErr) throw upErr;
      logger.info('✅ Upload para tmp-ocr concluído com sucesso');

      const { data: signed, error: signErr } = await (this.supabase as any)
        .storage
        .from('tmp-ocr')
        .createSignedUrl(path, 600); // 10 minutos

      if (signErr) throw signErr;
      
      logger.info(`✅ URL assinada gerada: ${signed.signedUrl.substring(0, 100)}...`);
      logger.info(`✅ Tamanho da URL: ${signed.signedUrl.length} caracteres`);
      
      return { path, signedUrl: signed.signedUrl };
    } catch (e) {
      logger.error('❌ Erro no upload para tmp-ocr', { error: (e as any)?.message || e });
      throw e;
    }
  }

  private async syncGuildsWithDatabase(): Promise<void> {
    try {
      logger.info('🔄 Syncing guilds with database...');
      
      const guilds = this.client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        await this.contextService.registerGuild(guildId, guild.name);
        logger.info(`✅ Synced guild: ${guild.name}`);
      }
      
      logger.info(`✅ Synced ${guilds.size} guilds with database`);
    } catch (error) {
      logger.error('❌ Error syncing guilds', { error });
    }
  }

  private async logInteraction(interaction: {
    messageId: string;
    userId: string;
    channelId: string;
    guildId: string | null;
    messageContent: string;
    botResponse: string;
    contextApplied: any;
    responseTimeMs: number;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_interactions')
        .insert({
          user_id: interaction.userId,
          guild_id: interaction.guildId,
          channel_id: interaction.channelId,
          message_content: interaction.messageContent,
          bot_response: interaction.botResponse,
          interaction_type: 'message',
          context_used: interaction.contextApplied
        });

      if (error) {
        logger.error('❌ Error logging interaction', { error });
      }
    } catch (error) {
      logger.error('❌ Error logging interaction', { error });
    }
  }

  public async start(token: string): Promise<void> {
    try {
      logger.info('🚀 Starting Discord bot...');
      await this.client.login(token);
    } catch (error) {
      logger.error('❌ Error starting Discord bot', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      logger.warn('🛑 Stopping Discord bot...');
      this.isReady = false;
      await this.client.destroy();
      logger.info('✅ Discord bot stopped');
    } catch (error) {
      logger.error('❌ Error stopping Discord bot', { error });
      throw error;
    }
  }

  public getClient(): Client {
    return this.client;
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  // ✅ Estatísticas do bot para o servidor
  public getStats() {
    try {
      return {
        ready: this.isReady,
        guilds: this.client.guilds.cache.size,
        usersCached: this.client.users.cache.size,
        channelsCached: this.client.channels.cache.size
      };
    } catch (e) {
      return { ready: this.isReady };
    }
  }

  // Admin commands for managing bot configuration
  async handleGuildMessage(guildId: string, channelId: string, userId: string, message: string): Promise<string | null> {
    try {
      // Checar se deve responder neste canal
      const shouldRespond = await this.contextService.shouldRespondInChannel(guildId, channelId);
      if (!shouldRespond) return null;

      // Construir contexto
      const context = await this.contextService.buildHierarchicalContext(guildId, channelId, userId);

      // ✅ Resolver schoolId para aplicar configuração de IA por escola
      const schoolId = context.school?.id || await this.contextService.getSchoolIdForGuild(guildId);
      await this.responseService.applySchoolAIConfig(schoolId);

      // Gerar resposta
      return await this.responseService.generateResponse(message, context, { userId, channelId, guildId });
    } catch (error) {
      logger.error('Error handling guild message', { error });
      return null;
    }
  }

  async handleDirectMessage(userId: string, message: string): Promise<string | null> {
    try {
      if (!message || !message.trim()) return null;

      // Construir contexto de DM
      const context = await this.contextService.buildDMContext(userId);

      // Resolver guildId para logging e schoolId para configuração
      const guildId = await this.contextService.getGuildIdForUser(userId);
      const schoolId = context.school?.id || (guildId ? await this.contextService.getSchoolIdForGuild(guildId) : null);
      await this.responseService.applySchoolAIConfig(schoolId);

      // Gerar resposta
      return await this.responseService.generateResponse(message, context, { userId, channelId: 'DM', guildId });
    } catch (error) {
      logger.error('Error handling direct message', { error });
      return null;
    }
  }

  async updateGuildConfig(guildId: string, config: Partial<{
    botPersonality: string;
    responseLanguage: string;
    autoResponse: boolean;
    allowedChannels: string[];
    adminRoles: string[];
  }>): Promise<void> {
    await this.contextService.updateBotConfig(guildId, config);
  }
}