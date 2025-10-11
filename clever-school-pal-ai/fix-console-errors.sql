-- Fix Console Errors - Execute this in Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'student',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- 2. Create the missing public_list_admin_users function
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
  -- Try to get from profiles table first
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role
  FROM public.profiles p
  WHERE p.role IN ('admin', 'super_admin')
  ORDER BY p.full_name;
  
  -- If no results from profiles, try auth.users with user_metadata
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email::text,
      COALESCE((au.user_metadata->>'name')::text, au.email::text) as full_name,
      COALESCE((au.user_metadata->>'role')::text, 'user') as role
    FROM auth.users au
    WHERE (au.user_metadata->>'role') IN ('admin', 'super_admin')
    ORDER BY au.email;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO anon;

-- 3. Fix schools table RLS policies
ALTER TABLE IF EXISTS public.schools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view schools" ON public.schools;
DROP POLICY IF EXISTS "Allow read access to schools" ON public.schools;
DROP POLICY IF EXISTS "Allow authenticated users to read schools" ON public.schools;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access schools" ON public.schools
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions on schools
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;

-- 4. Fix pedagogical_tags table (if it exists)
CREATE TABLE IF NOT EXISTS public.pedagogical_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pedagogical_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access pedagogical_tags" ON public.pedagogical_tags
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedagogical_tags TO authenticated;

-- 5. Fix chat_logs table RLS
ALTER TABLE IF EXISTS public.chat_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own chat logs" ON public.chat_logs;

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access chat_logs" ON public.chat_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_logs TO authenticated;

-- Success message
SELECT 'Console errors fix completed successfully!' as result;