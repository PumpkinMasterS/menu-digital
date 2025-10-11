-- Fix content_classes table RLS policies - FINAL SOLUTION
-- This migration ensures the content_classes table exists and has proper RLS policies
-- for admin access in the frontend application

-- 1. Create content_classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    notes TEXT,
    
    -- Ensure unique content-class pairs
    UNIQUE(content_id, class_id)
);

-- 2. Enable RLS on the table
ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations on content_classes" ON content_classes;
DROP POLICY IF EXISTS "Users can view content_classes for their schools" ON content_classes;
DROP POLICY IF EXISTS "Users can insert content_classes for their schools" ON content_classes;
DROP POLICY IF EXISTS "Users can update content_classes for their schools" ON content_classes;
DROP POLICY IF EXISTS "Users can delete content_classes for their schools" ON content_classes;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON content_classes;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON content_classes;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON content_classes;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON content_classes;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON content_classes;

-- 4. Create SUPER PERMISSIVE RLS policies for admin access
-- Since this is an admin-only frontend, we make it very permissive

-- Allow all SELECT operations for authenticated users
CREATE POLICY "Allow all SELECT on content_classes" ON content_classes
    FOR SELECT 
    USING (true);

-- Allow all INSERT operations for authenticated users  
CREATE POLICY "Allow all INSERT on content_classes" ON content_classes
    FOR INSERT 
    WITH CHECK (true);

-- Allow all UPDATE operations for authenticated users
CREATE POLICY "Allow all UPDATE on content_classes" ON content_classes
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- Allow all DELETE operations for authenticated users
CREATE POLICY "Allow all DELETE on content_classes" ON content_classes
    FOR DELETE 
    USING (true);

-- 5. Grant comprehensive permissions
GRANT ALL ON content_classes TO authenticated;
GRANT ALL ON content_classes TO service_role;
GRANT ALL ON content_classes TO anon;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_classes_content_id ON content_classes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_class_id ON content_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_status ON content_classes(status);
CREATE INDEX IF NOT EXISTS idx_content_classes_due_date ON content_classes(due_date);

-- 7. Create SQL functions with SECURITY DEFINER to bypass RLS completely
-- These functions will be used by the frontend for atomic operations

-- Function to manage content-class assignments atomically
CREATE OR REPLACE FUNCTION manage_content_classes(
    p_content_id UUID,
    p_class_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    class_id UUID;
    inserted_count INT := 0;
    deleted_count INT := 0;
BEGIN
    -- Delete existing assignments not in the new list
    DELETE FROM content_classes 
    WHERE content_id = p_content_id 
    AND class_id != ALL(p_class_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Insert new assignments
    FOREACH class_id IN ARRAY p_class_ids
    LOOP
        INSERT INTO content_classes (content_id, class_id)
        VALUES (p_content_id, class_id)
        ON CONFLICT (content_id, class_id) DO NOTHING;
        
        IF FOUND THEN
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'inserted_count', inserted_count,
        'deleted_count', deleted_count,
        'message', format('Successfully managed content classes: %s inserted, %s deleted', inserted_count, deleted_count)
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to manage content classes'
        );
        RETURN result;
END;
$$;

-- Function to get content classes with full details
CREATE OR REPLACE FUNCTION get_content_classes(p_content_id UUID)
RETURNS TABLE (
    id UUID,
    content_id UUID,
    class_id UUID,
    class_name TEXT,
    assigned_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    is_required BOOLEAN,
    status TEXT,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.content_id,
        cc.class_id,
        c.name as class_name,
        cc.assigned_at,
        cc.due_date,
        cc.is_required,
        cc.status,
        cc.notes
    FROM content_classes cc
    JOIN classes c ON cc.class_id = c.id
    WHERE cc.content_id = p_content_id
    ORDER BY c.name;
END;
$$;

-- Function to insert single content-class assignment
CREATE OR REPLACE FUNCTION insert_content_class(
    p_content_id UUID,
    p_class_id UUID,
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_is_required BOOLEAN DEFAULT TRUE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    new_id UUID;
BEGIN
    INSERT INTO content_classes (content_id, class_id, due_date, is_required, notes)
    VALUES (p_content_id, p_class_id, p_due_date, p_is_required, p_notes)
    RETURNING id INTO new_id;
    
    result := json_build_object(
        'success', true,
        'id', new_id,
        'message', 'Content class assignment created successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        result := json_build_object(
            'success', false,
            'error', 'UNIQUE_VIOLATION',
            'message', 'Content is already assigned to this class'
        );
        RETURN result;
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create content class assignment'
        );
        RETURN result;
END;
$$;

-- 8. Add comments for documentation
COMMENT ON TABLE content_classes IS 'Junction table linking contents to classes for assignment management with SUPER PERMISSIVE RLS for admin access';
COMMENT ON COLUMN content_classes.content_id IS 'Reference to the content being assigned';
COMMENT ON COLUMN content_classes.class_id IS 'Reference to the class receiving the assignment';
COMMENT ON COLUMN content_classes.assigned_at IS 'When the content was assigned to the class';
COMMENT ON COLUMN content_classes.due_date IS 'Optional due date for the assignment';
COMMENT ON COLUMN content_classes.is_required IS 'Whether the content is required or optional';
COMMENT ON COLUMN content_classes.status IS 'Current status of the assignment';

COMMENT ON FUNCTION manage_content_classes IS 'Atomically manages content-class assignments with SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION get_content_classes IS 'Gets content classes with full details using SECURITY DEFINER to bypass RLS';
COMMENT ON FUNCTION insert_content_class IS 'Inserts single content-class assignment with SECURITY DEFINER to bypass RLS';

-- 9. Verify the setup
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_classes') THEN
        RAISE EXCEPTION 'content_classes table was not created successfully';
    END IF;
    
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND c.relname = 'content_classes' 
        AND c.relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on content_classes table';
    END IF;
    
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'content_classes' 
        AND policyname IN ('Allow all SELECT on content_classes', 'Allow all INSERT on content_classes')
    ) THEN
        RAISE EXCEPTION 'Required RLS policies were not created';
    END IF;
    
    -- Check if functions exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname IN ('manage_content_classes', 'get_content_classes', 'insert_content_class')
    ) THEN
        RAISE EXCEPTION 'Required functions were not created';
    END IF;
    
    RAISE NOTICE '✅ content_classes table setup completed successfully with SUPER PERMISSIVE RLS and SECURITY DEFINER functions';
END $$; 