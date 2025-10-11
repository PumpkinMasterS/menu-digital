-- ================================================================
-- COMPLETE DATABASE RESTORATION SCRIPT
-- Execute this in Supabase Dashboard SQL Editor
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- 1. CORE TABLES - FOUNDATION
-- ================================================================

-- Schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    student_number TEXT,
    birth_date DATE,
    phone TEXT,
    address TEXT,
    parent_name TEXT,
    parent_email TEXT,
    parent_phone TEXT,
    special_needs TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contents table
CREATE TABLE IF NOT EXISTS public.contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    topics TEXT[] DEFAULT '{}',
    year INTEGER,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 3,
    content_type TEXT DEFAULT 'lesson' CHECK (content_type IN ('lesson', 'exercise', 'exam', 'project', 'resource')),
    tags TEXT[] DEFAULT '{}',
    embedding vector(1536),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. JUNCTION TABLES
-- ================================================================

-- Class-Subject relationship
CREATE TABLE IF NOT EXISTS public.class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_name TEXT,
    teacher_email TEXT,
    schedule TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, subject_id)
);

-- Content-Class relationship
CREATE TABLE IF NOT EXISTS public.content_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, class_id)
);

-- Teacher-Class-Subject relationship
CREATE TABLE IF NOT EXISTS public.teacher_class_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'assistant', 'coordinator')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id)
);

-- ================================================================
-- 3. SYSTEM TABLES
-- ================================================================

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'teacher', 'coordinator')),
    permissions TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- Bot configuration table
CREATE TABLE IF NOT EXISTS public.bot_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    bot_name TEXT DEFAULT 'EduConnect AI',
    bot_personality TEXT DEFAULT 'friendly',
    welcome_message TEXT DEFAULT 'Olá! Como posso ajudar você hoje?',
    system_prompt TEXT,
    max_tokens INTEGER DEFAULT 1000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    model TEXT DEFAULT 'gpt-3.5-turbo',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

-- Chat logs table
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    context_used TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School context table
CREATE TABLE IF NOT EXISTS public.school_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('general', 'holidays', 'events', 'policies', 'schedules', 'contacts')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, context_type, title)
);

-- ================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ================================================================

-- Schools indexes
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(active);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(active);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_year ON classes(year);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(active);

-- Contents indexes
CREATE INDEX IF NOT EXISTS idx_contents_school_id ON contents(school_id);
CREATE INDEX IF NOT EXISTS idx_contents_subject_id ON contents(subject_id);
CREATE INDEX IF NOT EXISTS idx_contents_year ON contents(year);
CREATE INDEX IF NOT EXISTS idx_contents_topics ON contents USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_contents_tags ON contents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contents_active ON contents(active);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_content_id ON content_classes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_class_id ON content_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_teacher_id ON teacher_class_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_school_id ON teacher_class_subjects(school_id);

-- System table indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_school_id ON admin_users(school_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_chat_logs_school_id ON chat_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_student_id ON chat_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_school_context_school_id ON school_context(school_id);
CREATE INDEX IF NOT EXISTS idx_school_context_type ON school_context(context_type);

-- ================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_context ENABLE ROW LEVEL SECURITY;

-- Super admin policies (can access everything)
CREATE POLICY "Super admin full access schools" ON schools FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admin full access subjects" ON subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admin full access classes" ON classes FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admin full access students" ON students FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admin full access contents" ON contents FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- School admin policies (can access their school's data)
CREATE POLICY "School admin access schools" ON schools FOR ALL USING (
    id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "School admin access classes" ON classes FOR ALL USING (
    school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "School admin access students" ON students FOR ALL USING (
    school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "School admin access contents" ON contents FOR ALL USING (
    school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Teacher policies (can access their assigned classes and subjects)
CREATE POLICY "Teacher access classes" ON classes FOR SELECT USING (
    id IN (SELECT class_id FROM teacher_class_subjects WHERE teacher_id = auth.uid())
    OR school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Teacher access students" ON students FOR SELECT USING (
    class_id IN (SELECT class_id FROM teacher_class_subjects WHERE teacher_id = auth.uid())
    OR school_id IN (SELECT school_id FROM admin_users WHERE user_id = auth.uid())
);

-- Public read access for subjects
CREATE POLICY "Public read subjects" ON subjects FOR SELECT USING (active = true);

-- Service role full access
CREATE POLICY "Service role full access" ON schools FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access subjects" ON subjects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access classes" ON classes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access students" ON students FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access contents" ON contents FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- 6. BASIC DATA INSERTION
-- ================================================================

-- Insert default subjects
INSERT INTO subjects (name, description, color, icon) VALUES
('Matemática', 'Disciplina de Matemática', '#3B82F6', 'calculator'),
('Português', 'Disciplina de Português', '#10B981', 'book-open'),
('Ciências', 'Disciplina de Ciências', '#8B5CF6', 'flask'),
('História', 'Disciplina de História', '#F59E0B', 'clock'),
('Geografia', 'Disciplina de Geografia', '#EF4444', 'globe'),
('Inglês', 'Disciplina de Inglês', '#06B6D4', 'message-circle'),
('Educação Física', 'Disciplina de Educação Física', '#84CC16', 'activity'),
('Artes', 'Disciplina de Artes', '#EC4899', 'palette')
ON CONFLICT DO NOTHING;

-- Insert test school
INSERT INTO schools (name, description, address, email) VALUES
('Escola Teste EduConnect', 'Escola de demonstração do sistema EduConnect', 'Rua Exemplo, 123', 'contato@escolateste.edu')
ON CONFLICT DO NOTHING;

-- Get the school ID for further insertions
DO $$
DECLARE
    escola_id UUID;
    matematica_id UUID;
    portugues_id UUID;
    ciencias_id UUID;
    classe_id UUID;
BEGIN
    -- Get school ID
    SELECT id INTO escola_id FROM schools WHERE name = 'Escola Teste EduConnect' LIMIT 1;
    
    -- Get subject IDs
    SELECT id INTO matematica_id FROM subjects WHERE name = 'Matemática' LIMIT 1;
    SELECT id INTO portugues_id FROM subjects WHERE name = 'Português' LIMIT 1;
    SELECT id INTO ciencias_id FROM subjects WHERE name = 'Ciências' LIMIT 1;
    
    -- Insert test class
    INSERT INTO classes (school_id, name, year, description) VALUES
    (escola_id, '9º Ano A', 9, 'Turma de 9º ano - Turma A')
    ON CONFLICT DO NOTHING;
    
    -- Get class ID
    SELECT id INTO classe_id FROM classes WHERE school_id = escola_id AND name = '9º Ano A' LIMIT 1;
    
    -- Insert class-subject relationships
    INSERT INTO class_subjects (class_id, subject_id, teacher_name) VALUES
    (classe_id, matematica_id, 'Prof. João Silva'),
    (classe_id, portugues_id, 'Prof. Maria Santos'),
    (classe_id, ciencias_id, 'Prof. Ana Costa')
    ON CONFLICT DO NOTHING;
    
    -- Insert sample content
    INSERT INTO contents (school_id, subject_id, title, content, summary, topics, year, difficulty_level) VALUES
    (escola_id, matematica_id, 'Frações - Conceitos Básicos', 'Uma fração representa uma parte de um todo. É composta por numerador e denominador...', 'Introdução aos conceitos básicos de frações', ARRAY['frações', 'numerador', 'denominador'], 9, 2),
    (escola_id, portugues_id, 'Classes Gramaticais', 'As classes gramaticais são grupos de palavras que possuem características semelhantes...', 'Estudo das principais classes gramaticais', ARRAY['gramática', 'substantivo', 'adjetivo'], 9, 3),
    (escola_id, ciencias_id, 'Sistema Solar', 'O Sistema Solar é composto pelo Sol e todos os corpos celestes que orbitam ao seu redor...', 'Estudo do Sistema Solar e seus componentes', ARRAY['astronomia', 'planetas', 'sistema solar'], 9, 2)
    ON CONFLICT DO NOTHING;
    
END $$;

-- ================================================================
-- 7. UTILITY FUNCTIONS
-- ================================================================

-- Function to search contents with semantic similarity
CREATE OR REPLACE FUNCTION search_contents(
    query_text TEXT,
    school_id_param UUID DEFAULT NULL,
    subject_id_param UUID DEFAULT NULL,
    year_param INTEGER DEFAULT NULL,
    limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    subject_name TEXT,
    topics TEXT[],
    year INTEGER,
    similarity_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.content,
        c.summary,
        s.name as subject_name,
        c.topics,
        c.year,
        (
            CASE WHEN c.title ILIKE '%' || query_text || '%' THEN 0.8 ELSE 0 END +
            CASE WHEN c.summary ILIKE '%' || query_text || '%' THEN 0.6 ELSE 0 END +
            CASE WHEN c.content ILIKE '%' || query_text || '%' THEN 0.4 ELSE 0 END +
            CASE WHEN array_to_string(c.topics, ' ') ILIKE '%' || query_text || '%' THEN 0.7 ELSE 0 END
        ) as similarity_score
    FROM contents c
    LEFT JOIN subjects s ON c.subject_id = s.id
    WHERE 
        c.active = true
        AND (school_id_param IS NULL OR c.school_id = school_id_param)
        AND (subject_id_param IS NULL OR c.subject_id = subject_id_param)
        AND (year_param IS NULL OR c.year = year_param)
        AND (
            c.title ILIKE '%' || query_text || '%' OR
            c.summary ILIKE '%' || query_text || '%' OR
            c.content ILIKE '%' || query_text || '%' OR
            array_to_string(c.topics, ' ') ILIKE '%' || query_text || '%'
        )
    ORDER BY similarity_score DESC, c.created_at DESC
    LIMIT limit_param;
END;
$$;

-- Function to get school statistics
CREATE OR REPLACE FUNCTION get_school_stats(school_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_students', (SELECT COUNT(*) FROM students WHERE school_id = school_id_param AND active = true),
        'total_classes', (SELECT COUNT(*) FROM classes WHERE school_id = school_id_param AND active = true),
        'total_contents', (SELECT COUNT(*) FROM contents WHERE school_id = school_id_param AND active = true),
        'total_subjects', (SELECT COUNT(DISTINCT subject_id) FROM contents WHERE school_id = school_id_param AND active = true),
        'total_chat_interactions', (SELECT COUNT(*) FROM chat_logs WHERE school_id = school_id_param)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ================================================================
-- RESTORATION COMPLETE
-- ================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Success message
SELECT 'Database restoration completed successfully! All core tables, indexes, RLS policies, and basic data have been created.' as status;