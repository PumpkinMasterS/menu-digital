-- ===================================================================
-- MANUAL MIGRATION FOR CONTENT ORGANIZATION FEATURES
-- ===================================================================
-- Copy and paste these statements one by one into the Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/nsaodmuqjtabfblrrdqv/sql/new
-- ===================================================================

-- STEP 1: Add new columns to contents table
-- This adds year_level, topic_id, views, and last_viewed columns
ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS year_level INTEGER DEFAULT 5 CHECK (year_level BETWEEN 5 AND 9),
ADD COLUMN IF NOT EXISTS topic_id UUID,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMP;

-- STEP 2: Create topics table for hierarchical content organization
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

-- STEP 3: Add foreign key constraint for contents->topics relationship
-- This uses proper PostgreSQL syntax without IF NOT EXISTS
DO $$
BEGIN
  BEGIN
    ALTER TABLE contents 
    ADD CONSTRAINT fk_contents_topic_id 
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Constraint fk_contents_topic_id already exists, skipping';
  END;
END $$;

-- STEP 4: Create content_assignments table for multiple class assignments
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

-- STEP 5: Create media_files table for enhanced media management
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

-- STEP 6: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_contents_year_level ON contents(year_level);
CREATE INDEX IF NOT EXISTS idx_contents_topic_id ON contents(topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_year_level ON topics(year_level);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_topic_id ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_content_id ON content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_class_id ON content_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_media_files_content_id ON media_files(content_id);

-- STEP 7: Create updated_at trigger for topics table
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_topics_updated_at_trigger ON topics;
CREATE TRIGGER update_topics_updated_at_trigger
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_topics_updated_at();

-- STEP 8: Insert sample topics for existing subjects
-- This creates one topic per subject with appropriate names based on subject type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subjects LIMIT 1) THEN
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
      COALESCE(
        CAST(NULLIF(regexp_replace(s.grade, '[^0-9]', '', 'g'), '') AS INTEGER),
        6
      ) as year_level,
      s.id as subject_id,
      1 as order_index
    FROM subjects s
    WHERE NOT EXISTS (
      SELECT 1 FROM topics t WHERE t.subject_id = s.id
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Sample topics inserted for existing subjects';
  ELSE
    RAISE NOTICE 'No subjects found, skipping topic insertion';
  END IF;
END $$;

-- STEP 9: Update existing contents with appropriate year_level based on subject grade
-- This sets year_level based on the grade field in the subjects table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM contents LIMIT 1) THEN
    UPDATE contents 
    SET year_level = COALESCE(
      (SELECT CAST(NULLIF(regexp_replace(s.grade, '[^0-9]', '', 'g'), '') AS INTEGER)
       FROM subjects s WHERE s.id = contents.subject_id),
      6
    )
    WHERE year_level IS NULL OR year_level = 5;
    
    RAISE NOTICE 'Updated existing contents with year_level';
  ELSE
    RAISE NOTICE 'No contents found, skipping year_level update';
  END IF;
END $$;

-- ===================================================================
-- VERIFICATION QUERIES (Optional - run to verify migration success)
-- ===================================================================

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('topics', 'content_assignments', 'media_files');

-- Check if new columns were added to contents
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contents' 
AND column_name IN ('year_level', 'topic_id', 'views', 'last_viewed');

-- Check sample data
SELECT COUNT(*) as topic_count FROM topics;
SELECT COUNT(*) as contents_with_year_level FROM contents WHERE year_level IS NOT NULL;

-- ===================================================================
-- SUCCESS! 
-- After running all steps above:
-- 1. Generate new TypeScript types: 
--    npx supabase gen types typescript --project-ref nsaodmuqjtabfblrrdqv > src/integrations/supabase/types.ts
-- 2. Remove type assertions in src/pages/Contents.tsx
-- 3. Enable full drag-drop and topic features
-- =================================================================== 