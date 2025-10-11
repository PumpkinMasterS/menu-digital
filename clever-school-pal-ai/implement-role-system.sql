-- Implementar Sistema de Roles no Supabase
-- Este SQL deve ser executado no Supabase SQL Editor

-- 1. Criar função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (raw_user_meta_data->>'role')::TEXT 
     FROM auth.users 
     WHERE id = user_id),
    'student' -- role padrão
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função para verificar se usuário tem pelo menos um role específico
CREATE OR REPLACE FUNCTION public.has_role_or_higher(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
BEGIN
  user_role := public.get_user_role(auth.uid());
  
  -- Definir hierarquia de roles (maior número = mais permissões)
  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 4
    WHEN 'director' THEN 3
    WHEN 'teacher' THEN 2
    WHEN 'student' THEN 1
    ELSE 0
  END;
  
  RETURN role_hierarchy >= CASE required_role
    WHEN 'super_admin' THEN 4
    WHEN 'director' THEN 3
    WHEN 'teacher' THEN 2
    WHEN 'student' THEN 1
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar função para verificar se usuário é admin (super_admin ou director)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) IN ('super_admin', 'director');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para verificar se usuário pode acessar escola específica
CREATE OR REPLACE FUNCTION public.can_access_school(school_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_school_id INTEGER;
BEGIN
  user_role := public.get_user_role(auth.uid());
  
  -- Super admin pode acessar qualquer escola
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Buscar school_id do usuário baseado no role
  IF user_role = 'director' THEN
    -- Directors têm school_id no user_metadata
    user_school_id := COALESCE(
      (SELECT (raw_user_meta_data->>'school_id')::INTEGER 
       FROM auth.users 
       WHERE id = auth.uid()),
      0
    );
  ELSIF user_role = 'teacher' THEN
    -- Teachers podem ter school_id no user_metadata ou ser inferido das classes
    user_school_id := COALESCE(
      (SELECT (raw_user_meta_data->>'school_id')::INTEGER 
       FROM auth.users 
       WHERE id = auth.uid()),
      0
    );
  ELSIF user_role = 'student' THEN
    -- Students têm school_id na tabela students
    SELECT s.school_id INTO user_school_id
    FROM public.students s
    WHERE s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_school_id, 0) = school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar função para verificar se usuário pode acessar turma específica
CREATE OR REPLACE FUNCTION public.can_access_class(class_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  class_school_id INTEGER;
BEGIN
  user_role := public.get_user_role(auth.uid());
  
  -- Buscar school_id da turma
  SELECT school_id INTO class_school_id
  FROM public.classes
  WHERE id = class_id;
  
  -- Verificar se pode acessar a escola da turma
  IF NOT public.can_access_school(class_school_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Teachers precisam estar associados à turma
  IF user_role = 'teacher' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.teacher_class_subjects tcs
      WHERE tcs.class_id = can_access_class.class_id
      AND tcs.teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  
  -- Students precisam estar na turma
  IF user_role = 'student' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.class_id = can_access_class.class_id
      AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
  END IF;
  
  -- Admins podem acessar qualquer turma da escola
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_or_higher(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_school(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_class(INTEGER) TO authenticated;

SELECT 'Sistema de roles implementado com sucesso' as status;