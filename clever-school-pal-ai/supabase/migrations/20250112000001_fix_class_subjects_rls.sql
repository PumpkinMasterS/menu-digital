-- Fix class_subjects table RLS policies
-- This migration ensures the class_subjects table exists and has proper RLS policies

-- 1. Create class_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure unique class-subject pairs
    UNIQUE(class_id, subject_id)
);

-- 2. Enable RLS on the table
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can update class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can delete class_subjects" ON class_subjects;

-- 4. Create comprehensive RLS policies for authenticated users
CREATE POLICY "Allow all operations on class_subjects" ON class_subjects
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Grant permissions to authenticated users
GRANT ALL ON class_subjects TO authenticated;
GRANT ALL ON class_subjects TO service_role;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON class_subjects(subject_id);

-- 7. Add comments for documentation
COMMENT ON TABLE class_subjects IS 'Junction table linking classes to subjects (many-to-many relationship)';
COMMENT ON COLUMN class_subjects.class_id IS 'Reference to the class';
COMMENT ON COLUMN class_subjects.subject_id IS 'Reference to the subject';
COMMENT ON COLUMN class_subjects.created_at IS 'When the class-subject relationship was created';

-- 8. Verify the policies were created
DO $$
BEGIN
    -- Check if policies exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'class_subjects' 
        AND policyname = 'Allow all operations on class_subjects'
    ) THEN
        RAISE NOTICE 'RLS policies for class_subjects created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create RLS policies for class_subjects';
    END IF;
END $$; 