-- Migration: Fix RLS policies for school_context table
-- Date: 2025-01-25
-- Description: Ensures proper RLS policies for school_context table access

-- Create school_context table if it doesn't exist
CREATE TABLE IF NOT EXISTS school_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_school_context_school_id ON school_context(school_id);
CREATE INDEX IF NOT EXISTS idx_school_context_active ON school_context(active) WHERE active = true;

-- Enable RLS
ALTER TABLE school_context ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view school contexts" ON school_context;
DROP POLICY IF EXISTS "Users can create school contexts" ON school_context;
DROP POLICY IF EXISTS "Users can update school contexts" ON school_context;
DROP POLICY IF EXISTS "Users can delete school contexts" ON school_context;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON school_context;
DROP POLICY IF EXISTS "Allow service role full access" ON school_context;

-- Create comprehensive RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON school_context
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON school_context
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_school_context_updated_at 
    BEFORE UPDATE ON school_context 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON school_context TO authenticated;
GRANT ALL ON school_context TO service_role;