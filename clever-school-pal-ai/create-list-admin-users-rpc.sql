-- Função RPC para listar usuários admin (funciona com anon key)
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Criar função para listar usuários admin
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  school_id UUID,
  school_name TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retornar usuários com roles de admin (super_admin, director)
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      'Usuário'
    )::TEXT as name,
    COALESCE(
      au.raw_user_meta_data->>'role',
      'director'
    )::TEXT as role,
    CASE 
      WHEN au.raw_user_meta_data->>'school_id' IS NOT NULL 
      THEN (au.raw_user_meta_data->>'school_id')::UUID
      ELSE NULL
    END as school_id,
    COALESCE(
      s.name,
      au.raw_user_meta_data->>'school_name',
      'Global'
    )::TEXT as school_name,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.schools s ON s.id = (au.raw_user_meta_data->>'school_id')::UUID
  WHERE 
    au.raw_user_meta_data->>'role' IN ('super_admin', 'director')
    AND au.deleted_at IS NULL
  ORDER BY 
    CASE au.raw_user_meta_data->>'role'
      WHEN 'super_admin' THEN 1
      WHEN 'director' THEN 2
      ELSE 3
    END,
    au.created_at DESC;
END;
$$;

-- 2. Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO anon;

-- 3. Comentário da função
COMMENT ON FUNCTION public.list_admin_users() IS 'Lista usuários com roles de administrador (super_admin, director)';

-- 4. Testar a função
SELECT * FROM public.list_admin_users();