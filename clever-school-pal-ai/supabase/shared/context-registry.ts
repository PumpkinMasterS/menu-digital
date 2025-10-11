// Deno/Edge Context Registry with DB-backed cache (web_search_cache)
// Mirrors the Node module API for unified hierarchical contexts

// Use Supabase client from Deno-friendly ESM import in Edge Functions
// Consumers should pass an initialized client; we avoid importing here.

// Context interfaces
export interface GlobalContext {
  personality: string;
  language: string;
}

export interface SchoolContext {
  id: string;
  name: string;
  personality?: string;
  guidelines?: string;
  subjects?: string[];
}

export interface ClassContext {
  id: string;
  name: string;
  subject?: string;
  level?: string;
  guidelines?: string;
}

export interface StudentContext {
  id: string;
  name: string;
  preferences?: any;
  learningStyle?: string;
  currentTopics?: string[];
  school_id?: string;
  class_id?: string;
}

export interface EducationalContext {
  currentSubject?: string;
  currentTopic?: string;
  difficulty?: string;
  materials?: Array<{ id?: string; title?: string; content?: string; subject?: string; grade?: string; relevance_score?: number }>;
}

export interface HierarchicalContext {
  global: GlobalContext;
  school?: SchoolContext;
  class?: ClassContext;
  student?: StudentContext;
  educational?: EducationalContext;
}

type SupabaseClient = any; // Deno Edge: keep lightweight typing

interface RegistryOptions {
  cacheTtlMs?: number; // TTL for global/school/class caching
}

// Unified global personality loader (shared logic)
async function getActiveGlobalPersonality(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data: globalPref } = await supabase
      .from('global_preferences')
      .select('preference_value')
      .eq('preference_key', 'active_personality')
      .single();

    if (!globalPref?.preference_value) return null;

    let personalityId: string;
    const prefValue = (globalPref as any).preference_value;
    if (typeof prefValue === 'object' && prefValue?.value) {
      personalityId = prefValue.value;
    } else if (typeof prefValue === 'string') {
      try {
        const parsed = JSON.parse(prefValue);
        personalityId = typeof parsed === 'object' && parsed?.value ? parsed.value : (parsed as string);
      } catch {
        personalityId = prefValue;
      }
    } else {
      personalityId = String(prefValue);
    }

    if (['default-assistant', 'default', 'professora-sofia'].includes(personalityId)) {
      return null;
    }

    const { data: customPersonality } = await supabase
      .from('custom_personalities')
      .select('name, prompt')
      .eq('id', personalityId)
      .eq('is_active', true)
      .single();

    if (customPersonality?.prompt) return customPersonality.prompt as string;

    const { data: personalityByName } = await supabase
      .from('custom_personalities')
      .select('name, prompt')
      .ilike('name', `%${personalityId}%`)
      .eq('is_active', true)
      .single();

    return personalityByName?.prompt || null;
  } catch {
    return null;
  }
}

// DB-backed cache using web_search_cache table (available and RLS-configured)
async function getCache<T>(supabase: SupabaseClient, key: string): Promise<T | null> {
  try {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from('web_search_cache')
      .select('results, expires_at')
      .eq('query_hash', key)
      .gt('expires_at', nowIso)
      .single();
    return data?.results ?? null;
  } catch {
    return null;
  }
}

async function setCache(supabase: SupabaseClient, key: string, value: any, ttlMs: number) {
  try {
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    await supabase
      .from('web_search_cache')
      .upsert({
        query_hash: key,
        query_text: key,
        results: value,
        expires_at: expiresAt,
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: 'query_hash' });
  } catch {
    // swallow cache errors to keep UX smooth
  }
}

async function invalidateCacheKeys(supabase: SupabaseClient, keys: string[]) {
  if (!keys.length) return;
  try {
    await supabase
      .from('web_search_cache')
      .delete()
      .in('query_hash', keys);
  } catch {
    // ignore
  }
}

export function createContextRegistry(supabase: SupabaseClient, options: RegistryOptions = {}) {
  const ttl = options.cacheTtlMs ?? 60_000; // default 60s

  async function getGlobalContext(): Promise<GlobalContext> {
    const cacheKey = 'context:global';
    const cached = await getCache<GlobalContext>(supabase, cacheKey);
    if (cached) return cached;

    const personality = await getActiveGlobalPersonality(supabase);
    const globalCtx: GlobalContext = {
      personality: personality || 'És um assistente educativo simples. Responde claramente e incentiva o aprendizado.',
      language: 'pt-PT',
    };
    await setCache(supabase, cacheKey, globalCtx, ttl);
    return globalCtx;
  }

  async function resolveSchoolIdFromGuildId(guildId: string): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('discord_guilds')
        .select('school_id')
        .eq('guild_id', guildId)
        .single();
      return data?.school_id || null;
    } catch {
      return null;
    }
  }

  async function resolveClassIdFromChannelId(channelId: string): Promise<{ class_id: string | null; school_id: string | null }> {
    try {
      const { data } = await supabase
        .from('discord_channels')
        .select('class_id, school_id')
        .eq('channel_id', channelId)
        .single();
      return { class_id: data?.class_id || null, school_id: data?.school_id || null };
    } catch {
      return { class_id: null, school_id: null };
    }
  }

  async function getSchoolContext(schoolId: string): Promise<SchoolContext | undefined> {
    if (!schoolId) return undefined;
    const cacheKey = `context:school:${schoolId}`;
    const cached = await getCache<SchoolContext>(supabase, cacheKey);
    if (cached) return cached;

    const { data: school, error } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single();
    if (error || !school) return undefined;

    let personality: string | undefined;
    let guidelines: string | undefined;
    let subjects: string[] | undefined;
    try {
      const { data: contexts } = await supabase
        .from('school_context')
        .select('context_type, content, active')
        .eq('school_id', schoolId)
        .eq('active', true);
      if (Array.isArray(contexts)) {
        for (const c of contexts) {
          if (c.context_type === 'personality') personality = c.content as string;
          if (c.context_type === 'guidelines') guidelines = c.content as string;
          if (c.context_type === 'subjects') {
            try { subjects = JSON.parse(String(c.content)); } catch { subjects = undefined; }
          }
        }
      }
    } catch {}

    const schoolCtx: SchoolContext = {
      id: school.id,
      name: school.name,
      personality,
      guidelines,
      subjects,
    };
    await setCache(supabase, cacheKey, schoolCtx, ttl);
    return schoolCtx;
  }

  async function getClassContext(classId: string): Promise<ClassContext | undefined> {
    if (!classId) return undefined;
    const cacheKey = `context:class:${classId}`;
    const cached = await getCache<ClassContext>(supabase, cacheKey);
    if (cached) return cached;

    const { data: cls, error } = await supabase
      .from('classes')
      .select('id, name, grade, general_context, subjects')
      .eq('id', classId)
      .single();
    if (error || !cls) return undefined;

    const classCtx: ClassContext = {
      id: cls.id,
      name: cls.name,
      subject: Array.isArray(cls.subjects) && cls.subjects.length ? String(cls.subjects[0]?.name || cls.subjects[0]) : undefined,
      level: cls.grade || undefined,
      guidelines: cls.general_context || undefined,
    };
    await setCache(supabase, cacheKey, classCtx, ttl);
    return classCtx;
  }

  async function getStudentContext(params: { studentId?: string; whatsappNumber?: string; discordUserId?: string }): Promise<StudentContext | undefined> {
    const { studentId, whatsappNumber } = params;
    if (!studentId && !whatsappNumber) return undefined;

    let query = supabase.from('students').select('id, name, special_context, school_id, class_id');
    if (studentId) query = query.eq('id', studentId);
    else if (whatsappNumber) query = query.eq('whatsapp_number', whatsappNumber);

    const { data: st, error } = await query.single();
    if (error || !st) return undefined;

    const studentCtx: StudentContext = {
      id: st.id,
      name: st.name,
      preferences: undefined,
      learningStyle: undefined,
      currentTopics: undefined,
      school_id: (st as any).school_id || undefined,
      class_id: (st as any).class_id || undefined,
    };
    if ((st as any).special_context) studentCtx.preferences = { special_context: (st as any).special_context };
    return studentCtx;
  }

  async function getEducationalContext(filters: { schoolId?: string; classId?: string; studentId?: string }): Promise<EducationalContext | undefined> {
    const { schoolId, classId } = filters;
    try {
      let query = supabase
        .from('contents')
        .select('id, title, content, subjects(name), topics, difficulty_level, status')
        .eq('active', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      if (schoolId) query = query.eq('school_id', schoolId);
      if (classId) query = query.eq('content_classes.class_id', classId);

      const { data } = await query;
      const materials = (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        subject: c.subjects?.name,
        grade: undefined,
        relevance_score: undefined,
      }));

      if (!materials.length) return undefined;
      return {
        currentSubject: materials[0]?.subject,
        currentTopic: Array.isArray(data?.[0]?.topics) ? String(data?.[0]?.topics?.[0]) : undefined,
        difficulty: data?.[0]?.difficulty_level || undefined,
        materials,
      };
    } catch {
      return undefined;
    }
  }

  async function buildHierarchicalContext(params: {
    schoolId?: string;
    classId?: string;
    studentId?: string;
    whatsappNumber?: string;
    discordGuildId?: string;
    discordChannelId?: string;
  }): Promise<HierarchicalContext> {
    let schoolId = params.schoolId;
    let classId = params.classId;

    // Resolve IDs from Discord if provided
    if (!schoolId && params.discordGuildId) {
      schoolId = (await resolveSchoolIdFromGuildId(params.discordGuildId)) || undefined;
    }
    if (!classId && params.discordChannelId) {
      const resolved = await resolveClassIdFromChannelId(params.discordChannelId);
      classId = resolved.class_id || undefined;
      if (!schoolId) schoolId = resolved.school_id || undefined;
    }

    const [global, school, cls, student, educational] = await Promise.all([
      getGlobalContext(),
      schoolId ? getSchoolContext(schoolId) : Promise.resolve(undefined),
      classId ? getClassContext(classId) : Promise.resolve(undefined),
      getStudentContext({ studentId: params.studentId, whatsappNumber: params.whatsappNumber }),
      getEducationalContext({ schoolId, classId, studentId: params.studentId }),
    ]);

    // Natural degradation: return available layers only
    return {
      global,
      school: school || undefined,
      class: cls || undefined,
      student: student || undefined,
      educational: educational || undefined,
    };
  }

  async function invalidateCacheForSchoolClass(schoolId?: string, classId?: string) {
    const keys: string[] = [];
    if (schoolId) keys.push(`context:school:${schoolId}`);
    if (classId) keys.push(`context:class:${classId}`);
    if (!schoolId && !classId) keys.push('context:global');
    await invalidateCacheKeys(supabase, keys);
  }

  return {
    getGlobalContext,
    getSchoolContext,
    getClassContext,
    getStudentContext,
    getEducationalContext,
    buildHierarchicalContext,
    resolveSchoolIdFromGuildId,
    resolveClassIdFromChannelId,
    invalidateCacheForSchoolClass,
  };
}