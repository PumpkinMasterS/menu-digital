-- Create contents table if it doesn't exist
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
    embedding vector(4096),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
-- CREATE INDEX IF NOT EXISTS idx_contents_school_id ON contents(school_id); -- Column doesn't exist in base table
CREATE INDEX IF NOT EXISTS idx_contents_subject_id ON contents(subject_id);
-- CREATE INDEX IF NOT EXISTS idx_contents_active ON contents(active); -- Column doesn't exist in base table
-- CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type); -- Column doesn't exist in base table
-- CREATE INDEX IF NOT EXISTS idx_contents_year ON contents(year); -- Column doesn't exist in base table

-- Enable RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Super Admin All Operations on Contents" ON contents;
CREATE POLICY "Super Admin All Operations on Contents" ON contents
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "teachers_view_assigned_contents" ON contents;
CREATE POLICY "teachers_view_assigned_contents" ON contents
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            -- Super admin access
            is_super_admin() OR
            -- Teachers can view contents for subjects they teach
            EXISTS (
                SELECT 1 FROM teacher_class_subjects tcs
                WHERE tcs.teacher_id = auth.uid()
                AND tcs.subject_id = contents.subject_id
            )
        )
    );

-- Grant permissions
GRANT ALL ON contents TO authenticated;
GRANT ALL ON contents TO service_role;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contents_updated_at ON contents;
CREATE TRIGGER update_contents_updated_at
    BEFORE UPDATE ON contents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample content if schools exist
DO $$
DECLARE
    escola_id UUID;
    matematica_id UUID;
    portugues_id UUID;
    ciencias_id UUID;
BEGIN
    -- Get first school
    SELECT id INTO escola_id FROM schools LIMIT 1;
    
    IF escola_id IS NOT NULL THEN
        -- Get subjects
        SELECT id INTO matematica_id FROM subjects WHERE name ILIKE '%matemática%' OR name ILIKE '%math%' LIMIT 1;
        SELECT id INTO portugues_id FROM subjects WHERE name ILIKE '%português%' OR name ILIKE '%portuguese%' LIMIT 1;
        SELECT id INTO ciencias_id FROM subjects WHERE name ILIKE '%ciências%' OR name ILIKE '%science%' LIMIT 1;
        
        -- Insert sample contents only if they don't exist (using base table structure)
        INSERT INTO contents (subject_id, title, content) 
        SELECT matematica_id, 'Frações - Conceitos Básicos', 'Uma fração representa uma parte de um todo. É composta por numerador e denominador...'
        WHERE NOT EXISTS (SELECT 1 FROM contents WHERE title = 'Frações - Conceitos Básicos');
        
        INSERT INTO contents (subject_id, title, content)
        SELECT portugues_id, 'Classes Gramaticais', 'As classes gramaticais são grupos de palavras que possuem características semelhantes...'
        WHERE NOT EXISTS (SELECT 1 FROM contents WHERE title = 'Classes Gramaticais');
        
        INSERT INTO contents (subject_id, title, content)
        SELECT ciencias_id, 'Sistema Solar', 'O Sistema Solar é composto pelo Sol e todos os corpos celestes que orbitam ao seu redor...'
        WHERE NOT EXISTS (SELECT 1 FROM contents WHERE title = 'Sistema Solar');
        
        RAISE NOTICE 'Sample contents created successfully';
    ELSE
        RAISE NOTICE 'No schools found, skipping content creation';
    END IF;
END $$;