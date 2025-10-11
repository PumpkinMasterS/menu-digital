-- Create function for semantic search of topic content
CREATE OR REPLACE FUNCTION search_topic_content_by_similarity(
    query_embedding vector(1024),
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
    -- content_type column not available in current schema
    similarity float,
    difficulty text,
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
        c.subtitle,
        c.description,
        c.content_data,
        c.learning_objectives,
        'topic' as content_type,
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
        AND c.content_type = 'topic'  -- Only search topic content
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Create function to get all topics for a class (fallback when no similarity match)
CREATE OR REPLACE FUNCTION get_class_topics(
    class_id uuid
)
RETURNS TABLE (
    id uuid,
    title text,
    subtitle text,
    description text,
    content_data text,
    learning_objectives text,
    content_type text,
    difficulty text,
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
        c.subtitle,
        c.description,
        c.content_data,
        c.learning_objectives,
        c.content_type,
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
        cc.class_id = get_class_topics.class_id
        AND c.status = 'publicado'
        -- Filter by topic content (assuming all content is topic-based)
    ORDER BY c.title;
END;
$$;

-- Index for content_type not needed as column doesn't exist in current schema
-- CREATE INDEX IF NOT EXISTS idx_contents_topic_type ON contents(content_type) WHERE content_type = 'topic';

-- Add comment explaining the topic-based approach
COMMENT ON FUNCTION search_topic_content_by_similarity IS 'Search for topic content using semantic similarity - topics provide guidance for LLM to generate explanations';
COMMENT ON FUNCTION get_class_topics IS 'Get all topics available for a specific class - used as fallback when no semantic matches found';