
-- CRITICAL FIXES FOR SUPABASE ISSUES
-- Execute these statements manually in your Supabase SQL Editor

-- 1. Create missing public_list_admin_users function
CREATE OR REPLACE FUNCTION public.public_list_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id
  WHERE p.role IN ('admin', 'super_admin')
  ORDER BY p.full_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO anon;

-- 2. Fix RLS policies for classes table (remove infinite recursion)
ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view classes they teach" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;

-- Create simple RLS policy for classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view classes" ON public.classes
  FOR SELECT TO authenticated
  USING (true);

-- 3. Fix schools table access
ALTER TABLE IF EXISTS public.schools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view schools" ON public.schools;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view schools" ON public.schools
  FOR SELECT TO authenticated
  USING (true);

-- 4. Grant necessary permissions
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.contents TO authenticated;

-- 5. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'student',
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

GRANT SELECT ON public.profiles TO authenticated;

SELECT 'All critical fixes completed successfully!' as result;
