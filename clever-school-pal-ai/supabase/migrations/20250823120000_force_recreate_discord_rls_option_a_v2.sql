-- Force re-create Discord RLS Option A policies (v2)
-- Ensures state convergence by dropping and recreating Option A policies
-- Only service_role and authenticated users with JWT role = super_admin have ALL access

-- ================================
-- discord_interactions
-- ================================
DROP POLICY IF EXISTS "discord_interactions_service_role_all" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_super_admin_manage" ON discord_interactions;
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;
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

-- ================================
-- discord_guilds
-- ================================
DROP POLICY IF EXISTS "discord_guilds_service_role_all" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_super_admin_manage" ON discord_guilds;
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
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

-- ================================
-- discord_channels
-- ================================
DROP POLICY IF EXISTS "discord_channels_service_role_all" ON discord_channels;
DROP POLICY IF EXISTS "discord_channels_super_admin_manage" ON discord_channels;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
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

-- ================================
-- discord_users
-- ================================
DROP POLICY IF EXISTS "discord_users_service_role_all" ON discord_users;
DROP POLICY IF EXISTS "discord_users_super_admin_manage" ON discord_users;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
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

-- ================================
-- discord_bot_config
-- ================================
DROP POLICY IF EXISTS "discord_bot_config_service_role_all" ON discord_bot_config;
DROP POLICY IF EXISTS "discord_bot_config_super_admin_manage" ON discord_bot_config;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;
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

-- ================================
-- Verification helper
-- ================================
SELECT 'Discord RLS Option A policies force-recreated (v2)' AS status;