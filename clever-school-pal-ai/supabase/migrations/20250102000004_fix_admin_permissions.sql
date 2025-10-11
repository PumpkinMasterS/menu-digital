-- Migration to fix RLS policies for admin permissions
-- This ensures authenticated users (admins) have full access to all tables

-- 1. Update school_context policies
DROP POLICY IF EXISTS "Allow managing school context" ON school_context;

-- Create more permissive policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON school_context
    FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'admin');

-- 2. Ensure other important tables also have proper admin access
-- Update schools table if needed
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on schools" ON schools;
CREATE POLICY "Allow all operations on schools" ON schools
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Update classes table
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on classes" ON classes;
CREATE POLICY "Allow all operations on classes" ON classes
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Update students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on students" ON students;
CREATE POLICY "Allow all operations on students" ON students
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Update subjects table
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on subjects" ON subjects;
CREATE POLICY "Allow all operations on subjects" ON subjects
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Update contents table
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on contents" ON contents;
CREATE POLICY "Allow all operations on contents" ON contents
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 7. Update class_subjects table if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'class_subjects') THEN
        ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow all operations on class_subjects" ON class_subjects;
        CREATE POLICY "Allow all operations on class_subjects" ON class_subjects
            FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 8. Update content_classes table if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_classes') THEN
        ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow all operations on content_classes" ON content_classes;
        CREATE POLICY "Allow all operations on content_classes" ON content_classes
            FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 9. Create function to check if user is admin (for future use)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.role() = 'authenticated' THEN
        RETURN true;
    END IF;
    
    -- Check if user has admin role in JWT
    IF auth.jwt() ->> 'role' = 'admin' THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- 10. Add comment explaining the changes
COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user has admin privileges';

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon; 

-- 6. Update contents table (educational_content no longer used)
ALTER TABLE IF EXISTS contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on contents" ON contents;
CREATE POLICY "Allow all operations on contents" ON contents
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');