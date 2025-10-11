-- Force-recreate Discord RLS to Option A: only service_role and super_admin can manage
-- Drops existing Option A policies and recreates them to ensure convergence

-- ================================
-- Drop current Option A policies if present
-- ================================
DROP POLICY IF EXISTS "discord_interactions_service_role_all" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_super_admin_manage" ON discord_interactions;

DROP POLICY IF EXISTS "discord_guilds_service_role_all" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_super_admin_manage" ON discord_guilds;

DROP POLICY IF EXISTS "discord_channels_service_role_all" ON discord_channels;
DROP POLICY IF EXISTS "discord_channels_super_admin_manage" ON discord_channels;

DROP POLICY IF EXISTS "discord_users_service_role_all" ON discord_users;
DROP POLICY IF EXISTS "discord_users_super_admin_manage" ON discord_users;

DROP POLICY IF EXISTS "discord_bot_config_service_role_all" ON discord_bot_config;
DROP POLICY IF EXISTS "discord_bot_config_super_admin_manage" ON discord_bot_config;

-- ================================
-- Ensure RLS is enabled on all Discord tables
-- ================================
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;

-- ================================
-- Recreate strict Option A policies
-- ================================

-- discord_interactions: only service_role and super_admin can read/write
CREATE POLICY "discord_interactions_service_role_all" ON discord_interactions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_interactions_super_admin_manage" ON discord_interactions
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  );

-- discord_guilds
CREATE POLICY "discord_guilds_service_role_all" ON discord_guilds
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_guilds_super_admin_manage" ON discord_guilds
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  );

-- discord_channels
CREATE POLICY "discord_channels_service_role_all" ON discord_channels
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_channels_super_admin_manage" ON discord_channels
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  );

-- discord_users
CREATE POLICY "discord_users_service_role_all" ON discord_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_users_super_admin_manage" ON discord_users
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  );

-- discord_bot_config
CREATE POLICY "discord_bot_config_service_role_all" ON discord_bot_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "discord_bot_config_super_admin_manage" ON discord_bot_config
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role')
    ) = 'super_admin'
  );

SELECT 'Force-recreated Discord RLS Option A policies' AS status;