-- ============================================
-- CORREÇÃO ESPECÍFICA: POLÍTICA INSERT COM WITH CHECK
-- ============================================
-- Esta correção resolve o erro 403 ao inserir guilds Discord
-- O problema era que a política INSERT não tinha cláusula WITH CHECK

-- 1. Verificar estado atual das políticas
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'discord_guilds'
ORDER BY policyname;

-- 2. Corrigir a política de INSERT (principal problema)
DROP POLICY IF EXISTS discord_guilds_frontend_insert ON public.discord_guilds;

CREATE POLICY discord_guilds_frontend_insert
ON public.discord_guilds
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    -- Super admin pode inserir qualquer guild (sem restrição de school_id)
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
    OR
    -- Admin/diretor/coordenador pode inserir guild com school_id correspondente
    (
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) IN ('admin', 'diretor', 'coordenador')
      AND school_id = COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid,
        (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
      )
    )
  )
);

-- 3. (Opcional) Corrigir UPDATE para simetria USING + WITH CHECK
DROP POLICY IF EXISTS discord_guilds_frontend_update ON public.discord_guilds;

CREATE POLICY discord_guilds_frontend_update
ON public.discord_guilds
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  auth.role() = 'authenticated'
  AND (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
    OR
    (
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) IN ('admin', 'diretor', 'coordenador')
      AND school_id = COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid,
        (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
    OR
    (
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) IN ('admin', 'diretor', 'coordenador')
      AND school_id = COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid,
        (auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid
      )
    )
  )
);

-- 4. Verificar resultado final
SELECT 
  policyname, 
  permissive,
  roles,
  cmd, 
  CASE WHEN qual IS NOT NULL THEN 'USING definido' ELSE 'USING vazio' END as using_status,
  CASE WHEN with_check IS NOT NULL THEN 'WITH CHECK definido' ELSE 'WITH CHECK vazio' END as with_check_status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'discord_guilds'
ORDER BY policyname;

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Copie todo este conteúdo
-- 2. Cole no SQL Editor do Supabase Dashboard
-- 3. Execute o script completo
-- 4. Verifique se a última query mostra "WITH CHECK definido" para INSERT
-- 5. Teste inserção no frontend (/admin/discord)
-- ============================================