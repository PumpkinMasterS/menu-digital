import { DiscordContextService } from './context-service';
import { DiscordResponseService } from './response-service';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import { logger } from '../../lib/logger';

/**
 * Discord Context Pipeline
 * 
 * Este sistema implementa a hierarquia de contextos para o Discord:
 * 1️⃣ Personalidade Global
 * 2️⃣ Escola (Guild)
 * 3️⃣ Turma (Channel/Role)
 * 4️⃣ Aluno (User)
 * 5️⃣ Conteúdo Educacional
 */

interface PipelineContext {
  messageId: string;
  guildId: string;
  channelId: string;
  userId: string;
  messageContent: string;
  timestamp: Date;
}

interface ProcessedContext {
  original: PipelineContext;
  hierarchy: {
    global: GlobalContext;
    school?: SchoolContext;
    class?: ClassContext;
    student?: StudentContext;
    educational?: EducationalContext;
  };
  metadata: {
    processingTimeMs: number;
    contextLayers: string[];
    confidence: number;
  };
}

interface GlobalContext {
  personality: string;
  language: string;
  defaultBehavior: string;
}

interface SchoolContext {
  schoolId: string;
  schoolName: string;
  personality?: string;
  guidelines?: string;
  subjects: string[];
  academicYear: string;
  timezone: string;
}

interface ClassContext {
  classId: string;
  className: string;
  subject: string;
  level: string;
  teacher?: string;
  schedule?: any;
  currentTopic?: string;
  guidelines?: string;
}

interface StudentContext {
  studentId: string;
  studentName: string;
  grade: string;
  learningStyle?: string;
  preferences?: any;
  currentProgress?: any;
  strengths?: string[];
  challenges?: string[];
}

interface EducationalContext {
  currentSubject?: string;
  currentTopic?: string;
  difficulty: string;
  materials: any[];
  assessments?: any[];
  nextLessons?: string[];
}

export class DiscordContextPipeline {
  private contextService: DiscordContextService;
  private responseService: DiscordResponseService;
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    openaiApiKey?: string
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    this.contextService = new DiscordContextService(this.supabase);
    this.responseService = new DiscordResponseService(this.supabase, openaiApiKey);
  }

  /**
   * Processa uma mensagem através do pipeline de contextos hierárquicos
   */
  async processMessage(context: PipelineContext): Promise<{
    response: string;
    processedContext: ProcessedContext;
    success: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('🔄 Processing message through context pipeline...');
      logger.info(`📨 Message: "${context.messageContent}" from user ${context.userId}`, {
        messageId: context.messageId,
        guildId: context.guildId,
        channelId: context.channelId,
        userId: context.userId
      });

      // 1. Build hierarchical context
      const processedContext = await this.buildProcessedContext(context, startTime);
      
      // 2. Generate response using hierarchical context
      const hierarchicalContext = {
        global: processedContext.hierarchy.global,
        school: processedContext.hierarchy.school,
        class: processedContext.hierarchy.class,
        student: processedContext.hierarchy.student,
        educational: processedContext.hierarchy.educational
      };

      const response = await this.responseService.generateResponse(
        context.messageContent,
        hierarchicalContext,
        { userId: context.userId, channelId: context.channelId, guildId: context.guildId }
      );

      if (!response) {
        throw new Error('Failed to generate response');
      }

      logger.info(`✅ Response generated: "${response}"`);
      logger.info(`⏱️ Total processing time: ${Date.now() - startTime}ms`);
      logger.info(`🎯 Context layers used: ${processedContext.metadata.contextLayers.join(', ')}`);

      return {
        response,
        processedContext,
        success: true
      };

    } catch (error) {
      logger.error('❌ Error in context pipeline', { error });
      
      // Sem fallback: não gerar resposta alternativa
      const minimalContext: ProcessedContext = {
        original: context,
        hierarchy: {
          global: await this.buildGlobalContext()
        },
        metadata: {
          processingTimeMs: Date.now() - startTime,
          contextLayers: ['global'],
          confidence: 0
        }
      };

      return {
        response: '',
        processedContext: minimalContext,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Constrói o contexto processado através da hierarquia
   */
  private async buildProcessedContext(context: PipelineContext, startTime: number): Promise<ProcessedContext> {
    const contextLayers: string[] = [];
    let confidence = 1.0;

    // 1️⃣ Camada Global (sempre presente)
    logger.info('🌍 Loading global context...');
    const globalContext = await this.buildGlobalContext();
    contextLayers.push('global');

    // 2️⃣ Camada Escola (Guild → School)
    logger.info('🏫 Loading school context...');
    const schoolContext = await this.buildSchoolContext(context.guildId);
    if (schoolContext) {
      contextLayers.push('school');
      logger.info(`   ✅ School: ${schoolContext.schoolName}`, { schoolId: schoolContext.schoolId });
    } else {
      logger.warn('   ⚠️ No school mapping found for guild', { guildId: context.guildId });
      confidence *= 0.9;
    }

    // 3️⃣ Camada Turma (Channel → Class)
    logger.info('📚 Loading class context...');
    const classContext = await this.buildClassContext(context.channelId);
    if (classContext) {
      contextLayers.push('class');
      logger.info(`   ✅ Class: ${classContext.className} (${classContext.subject})`, { classId: classContext.classId });
    } else {
      logger.warn('   ⚠️ No class mapping found for channel', { channelId: context.channelId });
      confidence *= 0.8;
    }

    // 4️⃣ Camada Aluno (User → Student)
    logger.info('👤 Loading student context...');
    const studentContext = await this.buildStudentContext(context.userId);
    if (studentContext) {
      contextLayers.push('student');
      logger.info(`   ✅ Student: ${studentContext.studentName} (Grade ${studentContext.grade})`, {
        studentId: studentContext.studentId
      });
    } else {
      logger.warn('   ⚠️ No student mapping found for user', {
        userId: context.userId
      });
      confidence *= 0.7;
    }

    // 5️⃣ Camada Educacional (Content)
    logger.info('📖 Loading educational context...');
    const educationalContext = await this.buildEducationalContext(
      schoolContext?.schoolId,
      classContext?.classId,
      studentContext?.studentId
    );
    if (educationalContext) {
      contextLayers.push('educational');
      logger.info(`   ✅ Educational materials: ${educationalContext.materials.length} items`);
    }

    const processingTime = Date.now() - startTime;
    logger.info(`⚡ Context building completed in ${processingTime}ms`);

    return {
      original: context,
      hierarchy: {
        global: globalContext,
        school: schoolContext,
        class: classContext,
        student: studentContext,
        educational: educationalContext
      },
      metadata: {
        processingTimeMs: processingTime,
        contextLayers,
        confidence
      }
    };
  }

  private async buildGlobalContext(): Promise<GlobalContext> {
    return {
      personality: 'Sou um assistente educativo inteligente, criado para ajudar estudantes e professores. Sou paciente, encorajador e adapto-me ao nível de cada aluno.',
      language: 'pt-PT',
      defaultBehavior: 'helpful_educational'
    };
  }

  private async buildSchoolContext(guildId: string): Promise<SchoolContext | undefined> {
    try {
      const { data: guildData } = await this.supabase
        .from('discord_guilds')
        .select('school_id, guild_name')
        .eq('guild_id', guildId)
        .eq('is_active', true)
        .single();

      if (!guildData?.school_id) return undefined;

      const { data: schoolData } = await this.supabase
        .from('schools')
        .select('id, name, description')
        .eq('id', guildData.school_id)
        .single();

      if (!schoolData) return undefined;

      // Get school context configuration
      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('school_id', schoolData.id)
        .eq('context_type', 'school')
        .eq('is_active', true)
        .single();

      return {
        schoolId: schoolData.id,
        schoolName: schoolData.name,
        personality: contextData?.personality,
        guidelines: contextData?.guidelines,
        subjects: [], // TODO: Get from subjects table
        academicYear: '2024/2025',
        timezone: 'Europe/Lisbon'
      };
    } catch (error) {
      logger.error('Error building school context', { error, guildId });
      return undefined;
    }
  }

  private async buildClassContext(channelId: string): Promise<ClassContext | undefined> {
    try {
      const { data: channelData } = await this.supabase
        .from('discord_channels')
        .select('class_id, channel_name')
        .eq('channel_id', channelId)
        .eq('is_active', true)
        .single();

      if (!channelData?.class_id) return undefined;

      const { data: classData } = await this.supabase
        .from('classes')
        .select('id, name, subject_id, level')
        .eq('id', channelData.class_id)
        .single();

      if (!classData) return undefined;

      // Get subject name
      const { data: subjectData } = await this.supabase
        .from('subjects')
        .select('name')
        .eq('id', classData.subject_id)
        .single();

      return {
        classId: classData.id,
        className: classData.name,
        subject: subjectData?.name || 'Unknown',
        level: classData.level || 'Unknown',
        currentTopic: undefined // TODO: Get current topic
      };
    } catch (error) {
      logger.error('Error building class context', { error, channelId });
      return undefined;
    }
  }

  private async buildStudentContext(userId: string): Promise<StudentContext | undefined> {
    try {
      const { data: userData } = await this.supabase
        .from('discord_users')
        .select('student_id, username')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!userData?.student_id) return undefined;

      const { data: studentData } = await this.supabase
        .from('students')
        .select('id, name, preferences')
        .eq('id', userData.student_id)
        .single();

      if (!studentData) return undefined;

      return {
        studentId: studentData.id,
        studentName: studentData.name,
        grade: 'Unknown', // TODO: Get from student data
        preferences: studentData.preferences,
        strengths: [], // TODO: Get from analytics
        challenges: [] // TODO: Get from analytics
      };
    } catch (error) {
      logger.error('Error building student context', { error, userId });
      return undefined;
    }
  }

  private async buildEducationalContext(
    schoolId?: string,
    classId?: string,
    studentId?: string
  ): Promise<EducationalContext | undefined> {
    try {
      if (!schoolId && !classId && !studentId) return undefined;

      const { data: materials } = await this.supabase
        .from('educational_materials')
        .select('*')
        .or(`school_id.eq.${schoolId},class_id.eq.${classId}`)
        .eq('is_active', true)
        .limit(5);

      return {
        difficulty: 'medium',
        materials: materials || [],
        nextLessons: [] // TODO: Get upcoming lessons
      };
    } catch (error) {
      logger.error('Error building educational context', { error, schoolId, classId, studentId });
      return undefined;
    }
  }

  /**
   * Demonstra o pipeline com dados de exemplo
   */
  async demonstratePipeline(): Promise<void> {
    logger.info('🎭 === DEMONSTRAÇÃO DO PIPELINE DE CONTEXTOS ===');

    const exampleContext: PipelineContext = {
      messageId: 'demo-message-123',
      guildId: 'demo-guild-456',
      channelId: 'demo-channel-789',
      userId: 'demo-user-101',
      messageContent: 'Podes ajudar-me com matemática?',
      timestamp: new Date()
    };

    logger.info('📨 Mensagem de exemplo', { message: exampleContext.messageContent });
    logger.info('🏷️ Contexto', {
      guild: exampleContext.guildId,
      channel: exampleContext.channelId,
      user: exampleContext.userId
    });
    logger.info('');

    const result = await this.processMessage(exampleContext);

    logger.info('📊 === RESULTADO DO PIPELINE ===');
    logger.info('✅ Sucesso', { success: result.success });
    logger.info('💬 Resposta', { response: result.response });
    logger.info('🎯 Camadas de contexto', { layers: result.processedContext.metadata.contextLayers });
    logger.info('📈 Confiança', { confidence: result.processedContext.metadata.confidence });
    logger.info('⏱️ Tempo de processamento', { timeMs: result.processedContext.metadata.processingTimeMs });
    
    if (result.error) {
      logger.error('❌ Erro', { error: result.error });
    }
  }

  /**
   * Obtém estatísticas do pipeline
   */
  async getPipelineStats(): Promise<{
    totalProcessed: number;
    averageProcessingTime: number;
    contextLayerUsage: Record<string, number>;
    successRate: number;
  }> {
    // TODO: Implement statistics collection
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      contextLayerUsage: {},
      successRate: 0
    };
  }
}