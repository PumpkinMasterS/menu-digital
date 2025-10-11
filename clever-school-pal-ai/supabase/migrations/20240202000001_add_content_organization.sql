-- Add year_level and topic support to contents table
ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS year_level INTEGER DEFAULT 5 CHECK (year_level BETWEEN 5 AND 9),
ADD COLUMN IF NOT EXISTS topic_id UUID,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMP;

-- Create topics table for hierarchical content organization
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  year_level INTEGER NOT NULL CHECK (year_level BETWEEN 5 AND 9),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint for topics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contents_topic_id' 
        AND table_name = 'contents'
    ) THEN
        ALTER TABLE contents 
        ADD CONSTRAINT fk_contents_topic_id 
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create content_assignments table for multiple class assignments
CREATE TABLE IF NOT EXISTS content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by VARCHAR(255),
  due_date TIMESTAMP,
  is_required BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(content_id, class_id)
);

-- Create media_files table for enhanced media management
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contents_year_level ON contents(year_level);
CREATE INDEX IF NOT EXISTS idx_contents_topic_id ON contents(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_year_level ON topics(year_level);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_topic_id ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_content_id ON content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_class_id ON content_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_media_files_content_id ON media_files(content_id);

-- Create updated_at trigger for topics table
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_topics_updated_at_trigger' 
        AND event_object_table = 'topics'
    ) THEN
        CREATE TRIGGER update_topics_updated_at_trigger
          BEFORE UPDATE ON topics
          FOR EACH ROW
          EXECUTE FUNCTION update_topics_updated_at();
    END IF;
END $$;

-- Insert some sample topics for existing subjects
INSERT INTO topics (name, description, year_level, subject_id, order_index) 
SELECT 
  CASE 
    WHEN s.name ILIKE '%matemática%' OR s.name ILIKE '%math%' THEN 'Números e Operações'
    WHEN s.name ILIKE '%português%' OR s.name ILIKE '%língua%' THEN 'Leitura e Interpretação'
    WHEN s.name ILIKE '%ciências%' OR s.name ILIKE '%science%' THEN 'Seres Vivos'
    WHEN s.name ILIKE '%história%' OR s.name ILIKE '%history%' THEN 'Civilizações Antigas'
    WHEN s.name ILIKE '%geografia%' OR s.name ILIKE '%geography%' THEN 'Continentes e Oceanos'
    ELSE 'Conceitos Fundamentais'
  END as name,
  'Tópico fundamental da disciplina' as description,
  6 as year_level,
  s.id as subject_id,
  1 as order_index
FROM subjects s
WHERE NOT EXISTS (
  SELECT 1 FROM topics t WHERE t.subject_id = s.id
)
ON CONFLICT DO NOTHING;

-- Update existing contents to have default year_level
UPDATE contents 
SET year_level = 6
WHERE year_level IS NULL OR year_level = 5;