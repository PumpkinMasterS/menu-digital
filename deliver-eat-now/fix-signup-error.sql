-- FIX SIGNUP ERROR - Adicionar roles faltantes e política RLS para INSERT

-- 1. Adicionar roles faltantes ao enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'kitchen';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_owner';

-- 2. Adicionar política RLS para permitir criação de perfis (CRÍTICO!)
CREATE POLICY "Enable insert for new user profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- 3. Verificar se a função handle_new_user está funcionando
-- (A função já existe, só precisamos da política RLS)

-- 4. Verificar triggers ativos
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- 5. Opcional: Política mais restritiva (comentada)
-- DROP POLICY IF EXISTS "Enable insert for new user profiles" ON public.profiles;
-- CREATE POLICY "Users can insert own profile" ON public.profiles
--   FOR INSERT WITH CHECK (auth.uid() = id); 