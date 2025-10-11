-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to contents table
ALTER TABLE contents ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- Create chat_logs table for storing AI conversations
CREATE TABLE IF NOT EXISTS chat_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question text NOT NULL,
    answer text NOT NULL,
    content_ids uuid[] DEFAULT '{}',
    response_type TEXT,
    whatsapp_metadata JSONB,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contents_embedding ON contents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_chat_logs_student_id ON chat_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION search_content_by_similarity(
    query_embedding vector(1024),
    class_id uuid,
    similarity_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    content_data text,
    content_type text,
    similarity float,
    subjects json,
    classes json
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.content_data,
        c.content_type,
        1 - (c.embedding <=> query_embedding) AS similarity,
        json_build_object(
            'name', s.name,
            'grade', s.grade
        ) AS subjects,
        json_build_object(
            'id', cl.id,
            'name', cl.name,
            'grade', cl.grade
        ) AS classes
    FROM contents c
    JOIN subjects s ON c.subject_id = s.id
    JOIN content_classes cc ON c.id = cc.content_id
    JOIN classes cl ON cc.class_id = cl.id
    WHERE 
        cc.class_id = search_content_by_similarity.class_id
        AND c.status = 'published'
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create bot configuration table
CREATE TABLE IF NOT EXISTS bot_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    whatsapp_phone_number text,
    whatsapp_access_token text,
    ollama_url text DEFAULT 'http://localhost:11434',
    ai_model text DEFAULT 'mistral:7b',
    embedding_model text DEFAULT 'mxbai-embed-large',
    max_response_length integer DEFAULT 300,
    similarity_threshold float DEFAULT 0.7,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create unique index for one config per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_config_school_id ON bot_config(school_id);

-- Update students table to ensure bot_active column exists with proper default
ALTER TABLE students ADD COLUMN IF NOT EXISTS bot_active BOOLEAN DEFAULT true;
ALTER TABLE students 
ALTER COLUMN bot_active SET DEFAULT true;

-- Create RLS policies for new tables
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Chat logs policy - users can only see logs from their school's students
CREATE POLICY "Users can view chat logs from their school" ON chat_logs
    FOR SELECT USING (
        student_id IN (
            SELECT s.id FROM students s 
            JOIN classes c ON s.class_id = c.id 
            WHERE c.school_id = (auth.jwt() ->> 'school_id')::uuid
        )
    );

-- Bot config policy - users can only manage their school's config
CREATE POLICY "Users can manage their school's bot config" ON bot_config
    FOR ALL USING (school_id = (auth.jwt() ->> 'school_id')::uuid);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_config_updated_at 
    BEFORE UPDATE ON bot_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default bot config for existing schools
INSERT INTO bot_config (school_id, active)
SELECT id, true 
FROM schools 
WHERE NOT EXISTS (SELECT 1 FROM bot_config WHERE school_id = schools.id);

-- Response cache table is created in admin tables migration
-- Skip creation here to avoid conflicts

-- Indexes for response_cache are created in admin tables migration
-- Skip creation here to avoid conflicts

-- Enable RLS for response cache
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- Cache policy - users can only access their school's cache
CREATE POLICY "Users can access their school's response cache" ON response_cache
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Create trigger for response cache updated_at
CREATE TRIGGER update_response_cache_updated_at
    BEFORE UPDATE ON response_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old cache entries (keep only 1000 most recent per school)
CREATE OR REPLACE FUNCTION clean_response_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM response_cache
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY last_used_at DESC, hit_count DESC) as rn
            FROM response_cache
        ) ranked
        WHERE rn <= 1000
    );
END;
$$ LANGUAGE plpgsql;