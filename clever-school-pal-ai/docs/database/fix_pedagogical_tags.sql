-- Criar tabela pedagogical_tags se não existir
CREATE TABLE IF NOT EXISTS pedagogical_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  color text DEFAULT 'blue',
  is_active boolean DEFAULT true,
  created_by text DEFAULT 'system',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_category ON pedagogical_tags(category);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_active ON pedagogical_tags(is_active) WHERE is_active = true;

-- Inserir tags pedagógicas básicas
INSERT INTO pedagogical_tags (name, category, color, is_active, created_by) VALUES
-- Disciplinas
('matemática', 'subject', 'blue', true, 'system'),
('português', 'subject', 'blue', true, 'system'),
('ciências', 'subject', 'blue', true, 'system'),
('história', 'subject', 'blue', true, 'system'),
('geografia', 'subject', 'blue', true, 'system'),
('inglês', 'subject', 'blue', true, 'system'),
('educação-física', 'subject', 'blue', true, 'system'),
('física', 'subject', 'blue', true, 'system'),
('química', 'subject', 'blue', true, 'system'),

-- Atividades
('exercício', 'activity', 'green', true, 'system'),
('teoria', 'activity', 'green', true, 'system'),
('prática', 'activity', 'green', true, 'system'),
('projeto', 'activity', 'green', true, 'system'),
('laboratório', 'activity', 'green', true, 'system'),
('discussão', 'activity', 'green', true, 'system'),
('pesquisa', 'activity', 'green', true, 'system'),

-- Dificuldade
('básico', 'difficulty', 'orange', true, 'system'),
('intermédio', 'difficulty', 'orange', true, 'system'),
('avançado', 'difficulty', 'orange', true, 'system'),
('iniciante', 'difficulty', 'orange', true, 'system'),
('expert', 'difficulty', 'orange', true, 'system'),

-- Formato
('visual', 'format', 'purple', true, 'system'),
('áudio', 'format', 'purple', true, 'system'),
('interativo', 'format', 'purple', true, 'system'),
('vídeo', 'format', 'purple', true, 'system'),
('texto', 'format', 'purple', true, 'system'),
('pdf', 'format', 'purple', true, 'system'),
('apresentação', 'format', 'purple', true, 'system'),

-- Contexto
('exame', 'context', 'pink', true, 'system'),
('teste', 'context', 'pink', true, 'system'),
('trabalho-casa', 'context', 'pink', true, 'system'),
('revisão', 'context', 'pink', true, 'system'),
('introdução', 'context', 'pink', true, 'system'),
('avaliação', 'context', 'pink', true, 'system'),
('recuperação', 'context', 'pink', true, 'system')

ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE pedagogical_tags ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Enable read access for authenticated users" ON pedagogical_tags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção/atualização para administradores (futuro)
CREATE POLICY "Enable insert for authenticated users" ON pedagogical_tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON pedagogical_tags
    FOR UPDATE USING (auth.role() = 'authenticated'); 