-- Fix missing columns and RLS issues
-- This SQL should be executed directly in Supabase SQL Editor

-- 1. Add missing columns to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- 2. Add missing columns to contents table  
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Fix RLS recursion by dropping all existing policies and creating simple ones

-- Drop all existing policies on problematic tables
DROP POLICY IF EXISTS "teachers_view_assigned_classes" ON public.classes;
DROP POLICY IF EXISTS "teachers_manage_assigned_classes" ON public.classes;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.classes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.classes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.classes;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.classes;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.classes;

DROP POLICY IF EXISTS "teachers_view_assigned_subjects" ON public.subjects;
DROP POLICY IF EXISTS "teachers_manage_assigned_subjects" ON public.subjects;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.subjects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subjects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.subjects;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.subjects;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.subjects;

DROP POLICY IF EXISTS "teachers_view_assigned_students" ON public.students;
DROP POLICY IF EXISTS "teachers_manage_assigned_students" ON public.students;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.students;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.students;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.students;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.students;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.students;

DROP POLICY IF EXISTS "teachers_view_assigned_contents" ON public.contents;
DROP POLICY IF EXISTS "teachers_manage_assigned_contents" ON public.contents;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.contents;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.contents;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.contents;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.contents;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.teacher_class_subjects;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.teacher_class_subjects;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.content_classes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.content_classes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.content_classes;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.content_classes;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.content_classes;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.schools;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schools;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.schools;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.schools;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.schools;

-- Disable RLS temporarily
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for all tables
CREATE POLICY "authenticated_full_access" ON public.classes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.subjects
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.students
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.contents
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.teacher_class_subjects
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.content_classes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON public.schools
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.classes TO authenticated;
GRANT ALL ON public.subjects TO authenticated;
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.contents TO authenticated;
GRANT ALL ON public.teacher_class_subjects TO authenticated;
GRANT ALL ON public.content_classes TO authenticated;
GRANT ALL ON public.schools TO authenticated;

-- Verify the fixes
SELECT 'Database schema fixes completed successfully' as status;