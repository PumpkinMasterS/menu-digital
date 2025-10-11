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
CREATE INDEX IF NOT EXISTS idx_contents_school_id ON contents(school_id);
CREATE INDEX IF NOT EXISTS idx_contents_subject_id ON contents(subject_id);
CREATE INDEX IF NOT EXISTS idx_contents_active ON contents(active);
CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_contents_year ON contents(year);

-- Enable RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Super Admin All Operations on Contents" ON contents;
CREATE POLICY "Super Admin All Operations on Contents" ON contents
    FOR ALL USING (is_super_admin());

-- Grant permissions
GRANT ALL ON contents TO authenticated;
GRANT ALL ON contents TO service_role;

-- Add some sample content
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
        
        -- Insert sample contents
        INSERT INTO contents (school_id, subject_id, title, content, summary, topics, year, difficulty_level) VALUES
        (escola_id, matematica_id, 'Frações - Conceitos Básicos', 'Uma fração representa uma parte de um todo. É composta por numerador e denominador...', 'Introdução aos conceitos básicos de frações', ARRAY['frações', 'numerador', 'denominador'], 9, 2),
        (escola_id, portugues_id, 'Classes Gramaticais', 'As classes gramaticais são grupos de palavras que possuem características semelhantes...', 'Estudo das principais classes gramaticais', ARRAY['gramática', 'substantivo', 'adjetivo'], 9, 3),
        (escola_id, ciencias_id, 'Sistema Solar', 'O Sistema Solar é composto pelo Sol e todos os corpos celestes que orbitam ao seu redor...', 'Estudo do Sistema Solar e seus componentes', ARRAY['astronomia', 'planetas', 'sistema solar'], 9, 2)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample contents created successfully';
    ELSE
        RAISE NOTICE 'No schools found, skipping content creation';
    END IF;
END $$;

RAISE NOTICE 'Contents table created and configured successfully';