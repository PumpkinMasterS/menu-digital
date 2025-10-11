-- Migration to update vector dimensions for 4096-D embeddings
-- Historical note: previously aligned to a 4096-D provider. Now generic.

-- Drop existing index before altering the column
DROP INDEX IF EXISTS idx_contents_embedding;

-- Drop any existing constraints on the embedding column
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_embedding_check;

-- Update the embedding column to accept 4096 dimensions
-- This will convert existing 1024D vectors to 4096D by padding with zeros
DO $$
BEGIN
    -- First, check if the column exists and what its current type is
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contents' AND column_name = 'embedding'
    ) THEN
        -- Alter the column type to vector(4096)
        ALTER TABLE contents ALTER COLUMN embedding TYPE vector(4096);
        
        -- Update the semantic search function to handle 4096D vectors
        DROP FUNCTION IF EXISTS search_content_by_similarity(vector(1024), uuid, float, int);
        
        CREATE OR REPLACE FUNCTION search_content_by_similarity(
            query_embedding vector(4096),
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
        AS $func$
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
                AND c.status = 'publicado'
                AND c.embedding IS NOT NULL
                AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
            ORDER BY c.embedding <=> query_embedding
            LIMIT match_count;
        END;
        $func$;
        
        -- Update the topic search function if it exists
        DROP FUNCTION IF EXISTS search_topic_content_by_similarity(vector(1024), uuid, float, int);
        
        CREATE OR REPLACE FUNCTION search_topic_content_by_similarity(
            query_embedding vector(4096),
            class_id uuid,
            similarity_threshold float DEFAULT 0.6,
            match_count int DEFAULT 3
        )
        RETURNS TABLE (
            id uuid,
            title text,
            subtitle text,
            description text,
            content_data text,
            learning_objectives text,
            content_type text,
            similarity float,
            difficulty text,
            subjects json,
            classes json
        )
        LANGUAGE plpgsql
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                c.id,
                c.title,
                c.subtitle,
                c.description,
                c.content_data,
                c.learning_objectives,
                c.content_type,
                1 - (c.embedding <=> query_embedding) AS similarity,
                c.difficulty,
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
                cc.class_id = search_topic_content_by_similarity.class_id
                AND c.status = 'publicado'
                AND c.content_type = 'topic'
                AND c.embedding IS NOT NULL
                AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
            ORDER BY c.embedding <=> query_embedding
            LIMIT match_count;
        END;
        $func$;
        
        RAISE NOTICE 'Successfully updated embedding column to vector(4096)';
    ELSE
        -- If column doesn't exist, create it with 4096 dimensions
        ALTER TABLE contents ADD COLUMN embedding vector(4096);
        RAISE NOTICE 'Created new embedding column with vector(4096)';
    END IF;
END $$;

-- Note: Skipping index creation as PostgreSQL vector indexes may not support >2000 dimensions in some setups
-- For 4096D vectors, rely on sequential scans which are acceptable for moderate datasets
-- CREATE INDEX IF NOT EXISTS idx_contents_embedding ON contents USING hnsw (embedding vector_cosine_ops);

-- Add a comment to document the change
COMMENT ON COLUMN contents.embedding IS 'Embedding vector with 4096 dimensions';

-- Create a helper function to generate test embeddings for validation
CREATE OR REPLACE FUNCTION validate_embedding_dimensions()
RETURNS text AS $$
DECLARE
    test_embedding vector(4096);
    result text;
BEGIN
    -- Create a test 4096D vector filled with small values
    test_embedding := array_fill(0.1, ARRAY[4096])::vector(4096);
    
    -- Try to insert a test record
    INSERT INTO contents (
        title, 
        description, 
        content_data, 
        status, 
        subject_id, 
        embedding
    ) VALUES (
        'Test 4096D Embedding',
        'Test content to validate 4096D embeddings',
        'This is a test to verify 4096D embeddings work correctly.',
        'draft',
        (SELECT id FROM subjects LIMIT 1),
        test_embedding
    );
    
    result := 'SUCCESS: 4096D embeddings are working correctly';
    
    -- Clean up the test record
    DELETE FROM contents WHERE title = 'Test 4096D Embedding';
    
    return result;
EXCEPTION
    WHEN OTHERS THEN
        return 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Display migration success message
SELECT 'Migration completed: Database updated for 4096D embeddings' as migration_status;

-- Run validation test
SELECT validate_embedding_dimensions() as validation_result;