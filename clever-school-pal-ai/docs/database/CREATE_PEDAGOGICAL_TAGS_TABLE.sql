-- ===================================================================
-- CRIAÇÃO DA TABELA DE TAGS PEDAGÓGICAS
-- ===================================================================
-- Copy and paste this SQL into the Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/nsaodmuqjtabfblrrdqv/sql/new
-- ===================================================================

-- Create pedagogical_tags table
CREATE TABLE IF NOT EXISTS pedagogical_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  color VARCHAR(20) NOT NULL DEFAULT 'blue',
  usage_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_category ON pedagogical_tags(category);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_name ON pedagogical_tags(name);
CREATE INDEX IF NOT EXISTS idx_pedagogical_tags_is_system ON pedagogical_tags(is_system);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pedagogical_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_pedagogical_tags_updated_at_trigger ON pedagogical_tags;
CREATE TRIGGER update_pedagogical_tags_updated_at_trigger
  BEFORE UPDATE ON pedagogical_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_pedagogical_tags_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE pedagogical_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users" ON pedagogical_tags
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON pedagogical_tags
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow update for authenticated users
CREATE POLICY "Allow update for authenticated users" ON pedagogical_tags
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Allow delete for authenticated users (but protect system tags)
CREATE POLICY "Allow delete for authenticated users" ON pedagogical_tags
  FOR DELETE 
  TO authenticated 
  USING (is_system = false OR auth.role() = 'service_role');

-- Create content_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES pedagogical_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_id, tag_id)
);

-- Create indexes for content_tags
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

-- Enable RLS for content_tags
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for content_tags
CREATE POLICY "Allow read access for authenticated users" ON content_tags
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert for authenticated users" ON content_tags
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON content_tags
  FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow delete for authenticated users" ON content_tags
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Create function to update usage_count when tags are assigned/unassigned
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pedagogical_tags 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pedagogical_tags 
    SET usage_count = GREATEST(usage_count - 1, 0) 
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update usage_count
DROP TRIGGER IF EXISTS update_tag_usage_count_insert ON content_tags;
CREATE TRIGGER update_tag_usage_count_insert
  AFTER INSERT ON content_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

DROP TRIGGER IF EXISTS update_tag_usage_count_delete ON content_tags;
CREATE TRIGGER update_tag_usage_count_delete
  AFTER DELETE ON content_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- Insert some initial system tags
INSERT INTO pedagogical_tags (name, category, color, is_system, created_by) VALUES
-- Disciplinas
('matemática', 'subject', 'blue', true, 'system'),
('português', 'subject', 'blue', true, 'system'),
('ciências', 'subject', 'blue', true, 'system'),
('história', 'subject', 'blue', true, 'system'),
('geografia', 'subject', 'blue', true, 'system'),
('inglês', 'subject', 'blue', true, 'system'),
('educação-física', 'subject', 'blue', true, 'system'),

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
('recuperação', 'context', 'pink', true, 'system'),

-- Duração
('5-min', 'duration', 'indigo', true, 'system'),
('15-min', 'duration', 'indigo', true, 'system'),
('30-min', 'duration', 'indigo', true, 'system'),
('45-min', 'duration', 'indigo', true, 'system'),
('1-hora', 'duration', 'indigo', true, 'system'),
('2-horas', 'duration', 'indigo', true, 'system')
ON CONFLICT (name) DO NOTHING; 