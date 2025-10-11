import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
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

export class DiscordContextService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabase: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabase;
  }

  // Register Discord guild and map to school
  async registerGuild(guildId: string, guildName: string, schoolId?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_guilds')
        .upsert({
          guild_id: guildId,
          guild_name: guildName,
          school_id: schoolId,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'guild_id'
        });

      if (error) {
        logger.error('Error registering guild', { error });
        throw error;
      }

      logger.info('✅ Guild registered', { guildName, guildId });
    } catch (error) {
      logger.error('Error in registerGuild', { error });
      throw error;
    }
  }

  // Register Discord channel and map to class
  async registerChannel(channelId: string, guildId: string, channelName: string, classId?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_channels')
        .upsert({
          channel_id: channelId,
          guild_id: guildId,
          channel_name: channelName,
          class_id: classId,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'channel_id'
        });

      if (error) {
        logger.error('Error registering channel', { error });
        throw error;
      }

      logger.info('✅ Channel registered', { channelName, channelId });
    } catch (error) {
      logger.error('Error in registerChannel', { error });
      throw error;
    }
  }

  // Register Discord user and map to student
  async registerUser(userId: string, username: string, displayName?: string, studentId?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_users')
        .upsert({
          user_id: userId,
          username: username,
          display_name: displayName,
          student_id: studentId,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Error registering user', { error });
        throw error;
      }

      logger.info('✅ User registered', { username, userId });
    } catch (error) {
      logger.error('Error in registerUser', { error });
      throw error;
    }
  }

  // Build hierarchical context for AI response
  async buildHierarchicalContext(guildId: string, channelId: string, userId: string): Promise<HierarchicalContext> {
    try {
      // 1. Global personality (default)
      const context: HierarchicalContext = {
        global: {
          personality: 'Sou um assistente educativo inteligente, criado para ajudar estudantes e professores. Sou paciente, encorajador e adapto-me ao nível de cada aluno.',
          language: 'pt-PT'
        }
      };

      // 2. School context (guild → school)
      const schoolContext = await this.getSchoolContext(guildId);
      if (schoolContext) {
        context.school = schoolContext;
      }

      // 3. Class context (channel → class)
      const classContext = await this.getClassContext(channelId);
      if (classContext) {
        context.class = classContext;
      }

      // 4. Student context (user → student)
      const studentContext = await this.getStudentContext(userId);
      if (studentContext) {
        context.student = studentContext;
      }

      // 5. Educational content context
      const educationalContext = await this.getEducationalContext(context.school?.id, context.class?.id, context.student?.id);
      if (educationalContext) {
        context.educational = educationalContext;
      }

      return context;
    } catch (error) {
      logger.error('Error building hierarchical context', { error });
      // Return minimal context on error
      return {
        global: {
          personality: 'Sou um assistente educativo inteligente.',
          language: 'pt-PT'
        }
      };
    }
  }

  // Build context for Direct Messages (DM) using the mapped student -> class -> school
  async buildDMContext(userId: string): Promise<HierarchicalContext> {
    try {
      const context: HierarchicalContext = {
        global: {
          personality: 'Sou um assistente educativo inteligente, criado para ajudar estudantes e professores. Sou paciente, encorajador e adapto-me ao nível de cada aluno.',
          language: 'pt-PT'
        }
      };

      // Get discord user mapping to student
      const { data: userData, error: userError } = await this.supabase
        .from('discord_users')
        .select('student_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let studentId = userData?.student_id;

      // If not found in discord_users, try to find by discord_id in students table
      if (userError || !studentId) {
        const { data: studentByDiscordId, error: studentError } = await this.supabase
          .from('students')
          .select('id, name, preferences, class_id, school_id')
          .eq('discord_id', userId)
          .single();

        if (studentByDiscordId && !studentError) {
          // Auto-register the user in discord_users table for future lookups
          await this.registerUser(userId, '', undefined, studentByDiscordId.id);
          studentId = studentByDiscordId.id;
        }
      }

      if (!studentId) {
        // No mapping -> return only global context
        return context;
      }

      // Fetch student with class and school
      const { data: studentData, error: studentError } = await this.supabase
        .from('students')
        .select('id, name, preferences, class_id, school_id')
        .eq('id', studentId)
        .single();

      if (studentError || !studentData) {
        return context; // keep global only
      }

      // Student context
      context.student = {
        id: studentData.id,
        name: studentData.name,
        preferences: (studentData as any).preferences,
        learningStyle: undefined,
        currentTopics: []
      };

      // School context by school_id
      if (studentData.school_id) {
        const schoolCtx = await this.getSchoolContextBySchoolId(studentData.school_id as unknown as string);
        if (schoolCtx) context.school = schoolCtx;
      }

      // Class context by class_id
      if (studentData.class_id) {
        const classCtx = await this.getClassContextByClassId(studentData.class_id as unknown as string);
        if (classCtx) context.class = classCtx;
      }

      // Educational context
      const educationalContext = await this.getEducationalContext(
        (studentData.school_id as unknown as string) || undefined,
        (studentData.class_id as unknown as string) || undefined,
        studentData.id
      );
      if (educationalContext) context.educational = educationalContext;

      return context;
    } catch (error) {
      logger.error('Error building DM context', { error });
      return {
        global: {
          personality: 'Sou um assistente educativo inteligente.',
          language: 'pt-PT'
        }
      };
    }
  }

  // Resolve a guildId to be used for logging DMs based on the user's mapped student's school
  public async getGuildIdForUser(userId: string): Promise<string | null> {
    try {
      const { data: userData } = await this.supabase
        .from('discord_users')
        .select('student_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!userData?.student_id) return null;

      const { data: studentData } = await this.supabase
        .from('students')
        .select('school_id')
        .eq('id', userData.student_id)
        .single();

      if (!studentData?.school_id) return null;

      const { data: guildData } = await this.supabase
        .from('discord_guilds')
        .select('guild_id')
        .eq('school_id', studentData.school_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      return guildData?.guild_id || null;
    } catch (error) {
      logger.error('Error resolving guildId for DM user', { error });
      return null;
    }
  }

  private async getSchoolContext(guildId: string): Promise<HierarchicalContext['school'] | null> {
    try {
      const { data: guildData, error: guildError } = await this.supabase
        .from('discord_guilds')
        .select('school_id, guild_name')
        .eq('guild_id', guildId)
        .eq('is_active', true)
        .single();

      if (guildError || !guildData?.school_id) {
        return null;
      }

      const { data: schoolData, error: schoolError } = await this.supabase
        .from('schools')
        .select('id, name, description')
        .eq('id', guildData.school_id)
        .single();

      if (schoolError || !schoolData) {
        return null;
      }

      // Get school's context configuration
      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('school_id', schoolData.id)
        .eq('context_type', 'school')
        .eq('is_active', true)
        .single();

      return {
        id: schoolData.id,
        name: schoolData.name,
        personality: contextData?.personality,
        guidelines: contextData?.guidelines,
        subjects: [] // TODO: Get school subjects
      };
    } catch (error) {
      logger.error('Error getting school context', { error });
      return null;
    }
  }

  // Helper: get school context directly by school_id (used in DMs)
  private async getSchoolContextBySchoolId(schoolId: string): Promise<HierarchicalContext['school'] | null> {
    try {
      if (!schoolId) return null;

      const { data: schoolData, error: schoolError } = await this.supabase
        .from('schools')
        .select('id, name, description')
        .eq('id', schoolId)
        .single();

      if (schoolError || !schoolData) return null;

      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('school_id', schoolData.id)
        .eq('context_type', 'school')
        .eq('is_active', true)
        .single();

      return {
        id: schoolData.id,
        name: schoolData.name,
        personality: contextData?.personality,
        guidelines: contextData?.guidelines,
        subjects: []
      };
    } catch (error) {
      logger.error('Error getting school context by id', { error });
      return null;
    }
  }

  private async getClassContext(channelId: string): Promise<HierarchicalContext['class'] | null> {
    try {
      const { data: channelData, error: channelError } = await this.supabase
        .from('discord_channels')
        .select('class_id, channel_name')
        .eq('channel_id', channelId)
        .eq('is_active', true)
        .single();

      if (channelError || !channelData?.class_id) {
        return null;
      }

      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('id, name, subject_id, level')
        .eq('id', channelData.class_id)
        .single();

      if (classError || !classData) {
        return null;
      }

      // Get class context configuration
      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('class_id', classData.id)
        .eq('context_type', 'class')
        .eq('is_active', true)
        .single();

      return {
        id: classData.id,
        name: classData.name,
        subject: classData.subject_id,
        level: classData.level,
        guidelines: contextData?.guidelines
      };
    } catch (error) {
      logger.error('Error getting class context', { error });
      return null;
    }
  }

  // Helper: get class context directly by class_id (used in DMs)
  private async getClassContextByClassId(classId: string): Promise<HierarchicalContext['class'] | null> {
    try {
      if (!classId) return null;

      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('id, name, subject_id, level')
        .eq('id', classId)
        .single();

      if (classError || !classData) return null;

      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('class_id', classData.id)
        .eq('context_type', 'class')
        .eq('is_active', true)
        .single();

      return {
        id: classData.id,
        name: classData.name,
        subject: classData.subject_id,
        level: classData.level,
        guidelines: contextData?.guidelines
      };
    } catch (error) {
      logger.error('Error getting class context by id', { error });
      return null;
    }
  }

  private async getStudentContext(userId: string): Promise<HierarchicalContext['student'] | null> {
    try {
      // First, try to find user in discord_users table
      const { data: userData, error: userError } = await this.supabase
        .from('discord_users')
        .select('student_id, username, display_name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let studentId = userData?.student_id;

      // If not found in discord_users, try to find by discord_id in students table
      if (userError || !studentId) {
        const { data: studentByDiscordId, error: studentError } = await this.supabase
          .from('students')
          .select('id, name, preferences')
          .eq('discord_id', userId)
          .single();

        if (studentByDiscordId && !studentError) {
          // Auto-register the user in discord_users table for future lookups
          await this.registerUser(userId, '', undefined, studentByDiscordId.id);
          studentId = studentByDiscordId.id;
        } else {
          return null;
        }
      }

      if (!studentId) {
        return null;
      }

      const { data: studentData, error: studentError } = await this.supabase
        .from('students')
        .select('id, name, preferences')
        .eq('id', studentId)
        .single();

      if (studentError || !studentData) {
        return null;
      }

      // Get student context configuration
      const { data: contextData } = await this.supabase
        .from('context_hierarchy')
        .select('personality, guidelines, educational_content')
        .eq('student_id', studentData.id)
        .eq('context_type', 'student')
        .eq('is_active', true)
        .single();

      return {
        id: studentData.id,
        name: studentData.name,
        preferences: studentData.preferences,
        learningStyle: contextData?.personality,
        currentTopics: [] // TODO: Get current topics
      };
    } catch (error) {
      logger.error('Error getting student context', { error });
      return null;
    }
  }

  private async getEducationalContext(schoolId?: string, classId?: string, studentId?: string): Promise<HierarchicalContext['educational'] | null> {
    try {
      if (!schoolId && !classId && !studentId) {
        return null;
      }

      // Get current educational materials and topics
      const { data: materialsData } = await this.supabase
        .from('educational_materials')
        .select('*')
        .or(`school_id.eq.${schoolId},class_id.eq.${classId}`)
        .eq('is_active', true)
        .limit(5);

      return {
        currentSubject: undefined, // TODO: Determine from context
        currentTopic: undefined,   // TODO: Determine from context
        difficulty: 'medium',      // TODO: Determine from student level
        materials: materialsData || []
      };
    } catch (error) {
      logger.error('Error getting educational context', { error });
      return null;
    }
  }

  // Check if bot should respond in this channel
  async shouldRespondInChannel(guildId: string, channelId: string): Promise<boolean> {
    try {
      const { data: configData } = await this.supabase
        .from('discord_bot_config')
        .select('auto_response, allowed_channels')
        .eq('guild_id', guildId)
        .single();

      if (!configData) {
        return true; // Default to responding if no config
      }

      if (!configData.auto_response) {
        return false;
      }

      if (configData.allowed_channels && configData.allowed_channels.length > 0) {
        return configData.allowed_channels.includes(channelId);
      }

      return true;
    } catch (error) {
      logger.error('Error checking channel response config', { error });
      return true; // Default to responding on error
    }
  }

  // Deactivate guild when bot leaves
  async deactivateGuild(guildId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_guilds')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('guild_id', guildId);

      if (error) {
        logger.error('Error deactivating guild', { error });
      }
    } catch (error) {
      logger.error('Error in deactivateGuild', { error });
    }
  }

  // Update bot configuration for a guild
  async updateBotConfig(guildId: string, config: Partial<{
    botPersonality: string;
    responseLanguage: string;
    autoResponse: boolean;
    allowedChannels: string[];
    adminRoles: string[];
  }>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('discord_bot_config')
        .upsert({
          guild_id: guildId,
          bot_personality: config.botPersonality,
          response_language: config.responseLanguage,
          auto_response: config.autoResponse,
          allowed_channels: config.allowedChannels,
          admin_roles: config.adminRoles,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'guild_id'
        });

      if (error) {
        logger.error('Error updating bot config', { error });
        throw error;
      }
    } catch (error) {
      logger.error('Error in updateBotConfig', { error });
      throw error;
    }
  }

  // Link Discord entities to educational entities
  async linkGuildToSchool(guildId: string, schoolId: string): Promise<void> {
    await this.supabase
      .from('discord_guilds')
      .update({ school_id: schoolId, updated_at: new Date().toISOString() })
      .eq('guild_id', guildId);
  }

  async linkChannelToClass(channelId: string, classId: string): Promise<void> {
    await this.supabase
      .from('discord_channels')
      .update({ class_id: classId, updated_at: new Date().toISOString() })
      .eq('channel_id', channelId);
  }

  async linkUserToStudent(userId: string, studentId: string): Promise<void> {
    await this.supabase
      .from('discord_users')
      .update({ student_id: studentId, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // ✅ Novo: obter school_id a partir de um guild_id
  async getSchoolIdForGuild(guildId: string): Promise<string | null> {
    try {
      if (!guildId) return null;
      const { data, error } = await (this.supabase as any)
        .from('schools')
        .select('id, guild_id')
        .eq('guild_id', guildId)
        .maybeSingle();
      if (error) {
        logger.warn('getSchoolIdForGuild: erro ao buscar escola por guild_id', { error: (error as any)?.message || error });
        return null;
      }
      return (data?.id as string) || null;
    } catch (e) {
      logger.warn('getSchoolIdForGuild: erro inesperado', { error: (e as any)?.message || e });
      return null;
    }
  }
}