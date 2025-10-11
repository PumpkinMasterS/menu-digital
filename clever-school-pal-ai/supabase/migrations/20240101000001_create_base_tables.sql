-- Create base tables first
-- This migration creates all the fundamental tables that other migrations depend on

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    grade TEXT,
    teacher_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    grade TEXT,
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    whatsapp_number TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    bot_active BOOLEAN DEFAULT true,
    special_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contents table
CREATE TABLE IF NOT EXISTS public.contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    permissions TEXT[] DEFAULT ARRAY['read_students', 'read_contents'],
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_whatsapp ON students(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_contents_subject_id ON contents(subject_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now)
CREATE POLICY "Allow all operations" ON schools FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON students FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON contents FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON api_keys FOR ALL USING (true);

-- Insert sample data
INSERT INTO schools (id, name, address) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Escola Exemplo', 'Rua das Flores, 123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, name, description, school_id, grade) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Matemática', 'Disciplina de Matemática', '550e8400-e29b-41d4-a716-446655440000', '5º Ano'),
('550e8400-e29b-41d4-a716-446655440002', 'Português', 'Disciplina de Português', '550e8400-e29b-41d4-a716-446655440000', '5º Ano')
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, name, description, school_id, grade) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '5º Ano A', 'Turma do 5º Ano A', '550e8400-e29b-41d4-a716-446655440000', '5º Ano'),
('550e8400-e29b-41d4-a716-446655440004', '5º Ano B', 'Turma do 5º Ano B', '550e8400-e29b-41d4-a716-446655440000', '5º Ano')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contents (id, title, content, subject_id, status) VALUES 
('550e8400-e29b-41d4-a716-446655440005', 'Adição e Subtração', 'Conteúdo sobre operações básicas de matemática', '550e8400-e29b-41d4-a716-446655440001', 'published'),
('550e8400-e29b-41d4-a716-446655440006', 'Leitura e Interpretação', 'Conteúdo sobre leitura e interpretação de textos', '550e8400-e29b-41d4-a716-446655440002', 'published')
ON CONFLICT (id) DO NOTHING;

-- Create a sample API key (hash of 'test-key-123')
INSERT INTO api_keys (id, name, key_hash, active, permissions) VALUES 
('550e8400-e29b-41d4-a716-446655440007', 'Test API Key', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', true, ARRAY['read_students', 'read_contents'])
ON CONFLICT (id) DO NOTHING;

SELECT 'Base tables created successfully!' as status;