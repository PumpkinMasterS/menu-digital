-- 🗄️ SQL PARA EXECUTAR NO SUPABASE DASHBOARD
-- Copie e cole este código no SQL Editor do Supabase

-- 1. Criar tabela pedagogical_tags (se não existir)
CREATE TABLE IF NOT EXISTS public.pedagogical_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inserir tags pedagógicas
INSERT INTO public.pedagogical_tags (name, category, description, color) VALUES
-- Disciplinas
('matemática', 'subject', 'Matemática e cálculos', '#EF4444'),
('português', 'subject', 'Língua portuguesa', '#10B981'),
('ciências', 'subject', 'Ciências naturais', '#8B5CF6'),
('história', 'subject', 'História e eventos passados', '#F59E0B'),
('geografia', 'subject', 'Geografia e localização', '#06B6D4'),
('inglês', 'subject', 'Língua inglesa', '#EC4899'),
('física', 'subject', 'Física e fenômenos', '#6366F1'),
('química', 'subject', 'Química e reações', '#84CC16'),

-- Atividades
('exercício', 'activity', 'Exercícios práticos', '#3B82F6'),
('teoria', 'activity', 'Conteúdo teórico', '#6B7280'),
('prática', 'activity', 'Atividade prática', '#059669'),
('projeto', 'activity', 'Projeto escolar', '#DC2626'),
('laboratório', 'activity', 'Atividade de laboratório', '#7C3AED'),
('discussão', 'activity', 'Discussão em grupo', '#DB2777'),

-- Dificuldade
('básico', 'difficulty', 'Nível básico', '#22C55E'),
('intermédio', 'difficulty', 'Nível intermédio', '#F59E0B'),
('avançado', 'difficulty', 'Nível avançado', '#EF4444'),
('iniciante', 'difficulty', 'Para iniciantes', '#84CC16'),
('expert', 'difficulty', 'Nível expert', '#8B5CF6'),

-- Formato
('visual', 'format', 'Conteúdo visual', '#06B6D4'),
('áudio', 'format', 'Conteúdo em áudio', '#EC4899'),
('vídeo', 'format', 'Conteúdo em vídeo', '#EF4444'),
('texto', 'format', 'Conteúdo textual', '#6B7280'),
('pdf', 'format', 'Documento PDF', '#DC2626'),
('apresentação', 'format', 'Apresentação', '#7C3AED'),

-- Contexto
('exame', 'context', 'Preparação para exame', '#EF4444'),
('teste', 'context', 'Preparação para teste', '#F59E0B'),
('trabalho-casa', 'context', 'Trabalho de casa', '#10B981'),
('revisão', 'context', 'Revisão de matéria', '#3B82F6'),
('introdução', 'context', 'Introdução ao tópico', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.pedagogical_tags ENABLE ROW LEVEL SECURITY;

-- 4. Política para leitura pública
DROP POLICY IF EXISTS "Allow public read access on pedagogical_tags" ON public.pedagogical_tags;
CREATE POLICY "Allow public read access on pedagogical_tags" ON public.pedagogical_tags
    FOR SELECT USING (true);

-- 5. Política para inserção/atualização por usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated users to manage pedagogical_tags" ON public.pedagogical_tags;
CREATE POLICY "Allow authenticated users to manage pedagogical_tags" ON public.pedagogical_tags
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Verificar se foi criado corretamente
SELECT 'pedagogical_tags criada com sucesso!' as status, count(*) as total_tags 
FROM public.pedagogical_tags; 