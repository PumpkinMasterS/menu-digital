-- ============================================
-- CORREÇÃO FINAL DAS POLÍTICAS RLS DO DISCORD
-- ============================================

-- PASSO 1: Remover todas as políticas existentes
DROP POLICY IF EXISTS discord_guilds_select_policy ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_insert_policy ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_update_policy ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_delete_policy ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_service_role_policy ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_authenticated_read ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_admin_access ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_service_role ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_jwt_select ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_jwt_insert ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_jwt_update ON discord_guilds;
DROP POLICY IF EXISTS discord_guilds_jwt_delete ON discord_guilds;

-- PASSO 2: Garantir que RLS está ativado
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar políticas simplificadas que funcionam com JWT do frontend

-- SELECT: Super admin vê tudo, admin vê da sua escola
CREATE POLICY discord_guilds_frontend_select ON discord_guilds
  FOR SELECT
  USING (
    -- Permitir acesso para usuários autenticados
    auth.role() = 'authenticated'
    AND
    (
      -- Super admin pode ver tudo
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) = 'super_admin'
      OR
      -- Admin pode ver guilds da sua escola ou se não tem school_id definido
      (
        COALESCE(
          (auth.jwt() -> 'app_metadata' ->> 'role'),
          (auth.jwt() -> 'user_metadata' ->> 'role')
        ) IN ('admin', 'diretor', 'coordenador')
        AND
        (
          school_id = COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          )
          OR
          -- Permitir se school_id do usuário é null (admin geral)
          COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          ) IS NULL
        )
      )
    )
  );

-- INSERT: Super admin pode inserir qualquer guild, admin pode inserir para qualquer escola
CREATE POLICY discord_guilds_frontend_insert ON discord_guilds
  FOR INSERT
  WITH CHECK (
    -- Permitir inserção para usuários autenticados
    auth.role() = 'authenticated'
    AND
    (
      -- Super admin pode inserir qualquer guild
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) = 'super_admin'
      OR
      -- Admin pode inserir guilds (sem restrição de escola para permitir mapeamento)
      COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role'),
        (auth.jwt() -> 'user_metadata' ->> 'role')
      ) IN ('admin', 'diretor', 'coordenador')
    )
  );

-- UPDATE: Mesmas regras do SELECT
CREATE POLICY discord_guilds_frontend_update ON discord_guilds
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND
    (
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
        AND
        (
          school_id = COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          )
          OR
          COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          ) IS NULL
        )
      )
    )
  );

-- DELETE: Mesmas regras do SELECT
CREATE POLICY discord_guilds_frontend_delete ON discord_guilds
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND
    (
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
        AND
        (
          school_id = COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          )
          OR
          COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID,
            (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID
          ) IS NULL
        )
      )
    )
  );

-- PASSO 4: Política para service_role (para scripts de manutenção)
CREATE POLICY discord_guilds_service_role_access ON discord_guilds
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verificação final
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'discord_guilds'
ORDER BY policyname;