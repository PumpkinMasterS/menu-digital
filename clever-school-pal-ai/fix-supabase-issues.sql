-- Comprehensive Supabase Fix Script
-- This script addresses:
-- 1. Missing public_list_admin_users function
-- 2. RLS policy infinite recursion issues
-- 3. Proper permissions for authenticated role

-- First, temporarily disable RLS on problematic tables to avoid recursion
ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_class_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contents DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view classes they teach" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;
DROP POLICY IF EXISTS "Allow teachers to view classes" ON public.classes;
DROP POLICY IF EXISTS "teacher_class_subjects_policy" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "Allow read access to schools" ON public.schools;
DROP POLICY IF EXISTS "Allow authenticated users to read schools" ON public.schools;
DROP POLICY IF EXISTS "Allow read access to subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated users to read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated users to read students" ON public.students;
DROP POLICY IF EXISTS "Allow read access to contents" ON public.contents;
DROP POLICY IF EXISTS "Allow authenticated users to read contents" ON public.contents;

-- Create the missing public_list_admin_users function
CREATE OR REPLACE FUNCTION public.public_list_admin_users()
RETURNS TABLE (
    id uuid,
    email text,
    role text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        COALESCE(p.role, 'user')::text as role,
        au.created_at,
        au.updated_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.role IN ('admin', 'super_admin')
    ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO anon;

-- Re-enable RLS with simple, non-recursive policies
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies

-- Schools: Allow all authenticated users to read
CREATE POLICY "authenticated_read_schools" ON public.schools
    FOR SELECT TO authenticated
    USING (true);

-- Classes: Allow all authenticated users to read
CREATE POLICY "authenticated_read_classes" ON public.classes
    FOR SELECT TO authenticated
    USING (true);

-- Subjects: Allow all authenticated users to read
CREATE POLICY "authenticated_read_subjects" ON public.subjects
    FOR SELECT TO authenticated
    USING (true);

-- Students: Allow all authenticated users to read
CREATE POLICY "authenticated_read_students" ON public.students
    FOR SELECT TO authenticated
    USING (true);

-- Contents: Allow all authenticated users to read
CREATE POLICY "authenticated_read_contents" ON public.contents
    FOR SELECT TO authenticated
    USING (true);

-- Teacher Class Subjects: Allow all authenticated users to read
CREATE POLICY "authenticated_read_teacher_class_subjects" ON public.teacher_class_subjects
    FOR SELECT TO authenticated
    USING (true);

-- Grant necessary SELECT permissions to authenticated role
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.teacher_class_subjects TO authenticated;
GRANT SELECT ON public.contents TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant additional permissions that might be needed
GRANT INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teacher_class_subjects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

SELECT 'All Supabase fixes applied successfully!' as result;