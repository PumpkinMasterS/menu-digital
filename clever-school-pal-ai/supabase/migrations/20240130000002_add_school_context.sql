-- Migration to add school context information for AI bot
-- This provides general information about the school that the bot can use for context

-- Create school_context table for general school information
CREATE TABLE IF NOT EXISTS school_context (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    context_type text NOT NULL CHECK (context_type IN ('general', 'holidays', 'events', 'policies', 'schedules', 'contacts')),
    title text NOT NULL,
    content text NOT NULL,
    active boolean DEFAULT true,
    priority integer DEFAULT 1, -- Higher priority = more important for bot context
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_context_school_id ON school_context(school_id);
CREATE INDEX IF NOT EXISTS idx_school_context_type ON school_context(context_type);
CREATE INDEX IF NOT EXISTS idx_school_context_active ON school_context(active);
CREATE INDEX IF NOT EXISTS idx_school_context_priority ON school_context(priority DESC);

-- Create unique constraint to prevent duplicate context entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_context_unique ON school_context(school_id, context_type, title);

-- Add RLS policies
ALTER TABLE school_context ENABLE ROW LEVEL SECURITY;

-- Policy to allow reading school context
CREATE POLICY "Allow reading school context" ON school_context
    FOR SELECT USING (true);

-- Policy to allow authenticated users to manage school context
CREATE POLICY "Allow managing school context" ON school_context
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to get school context for AI bot
CREATE OR REPLACE FUNCTION get_school_context_for_ai(
    school_id_param uuid,
    max_entries integer DEFAULT 10
)
RETURNS TABLE (
    context_type text,
    title text,
    content text,
    priority integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.context_type,
        sc.title,
        sc.content,
        sc.priority
    FROM school_context sc
    WHERE 
        sc.school_id = school_id_param
        AND sc.active = true
    ORDER BY sc.priority DESC, sc.created_at DESC
    LIMIT max_entries;
END;
$$;

-- Function to update school context timestamps
CREATE OR REPLACE FUNCTION update_school_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_school_context_updated_at
    BEFORE UPDATE ON school_context
    FOR EACH ROW
    EXECUTE FUNCTION update_school_context_updated_at();

-- Add comments explaining the table
COMMENT ON TABLE school_context IS 'Stores contextual information about schools that AI bot can use for more personalized responses';
COMMENT ON COLUMN school_context.context_type IS 'Type of context: general, holidays, events, policies, schedules, contacts';
COMMENT ON COLUMN school_context.priority IS 'Priority level (1-10) where higher numbers are more important for bot context';
COMMENT ON FUNCTION get_school_context_for_ai IS 'Retrieves active school context information ordered by priority for AI bot usage'; 