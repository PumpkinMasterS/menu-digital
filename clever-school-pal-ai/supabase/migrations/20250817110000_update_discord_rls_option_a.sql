-- Update Discord RLS to Option A: only service_role and super_admin can manage
-- Teachers, directors and other authenticated users have no special privileges
-- They can still DM the bot (handled by service_role) and use Discord rooms normally

-- ================================
-- Clean up existing Discord policies
-- ================================

-- discord_interactions
DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions;
DROP POLICY IF EXISTS "System can insert discord_interactions" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_service_role" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_system_access" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_select_policy" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_insert_policy" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_update_policy" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_user_select" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_admin_manage" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_service_role_access" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_authenticated_select" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_authenticated_insert" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_authenticated_update" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_authenticated_delete" ON discord_interactions;

-- discord_guilds
DROP POLICY IF EXISTS "discord_guilds_select_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_update_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_delete_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_service_role_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_authenticated_read" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_admin_access" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_service_role" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_service_role_access" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_authenticated_access" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_jwt_select" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_jwt_insert" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_jwt_update" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_jwt_delete" ON discord_guilds;

-- discord_channels
DROP POLICY IF EXISTS "discord_channels_service_role" ON discord_channels;
DROP POLICY IF EXISTS "discord_channels_service_role_access" ON discord_channels;
DROP POLICY IF EXISTS "discord_channels_authenticated_access" ON discord_channels;

-- discord_users
DROP POLICY IF EXISTS "discord_users_service_role" ON discord_users;
DROP POLICY IF EXISTS "discord_users_service_role_access" ON discord_users;
DROP POLICY IF EXISTS "discord_users_authenticated_access" ON discord_users;

-- discord_bot_config
DROP POLICY IF EXISTS "discord_bot_config_service_role" ON discord_bot_config;
DROP POLICY IF EXISTS "discord_bot_config_service_role_access" ON discord_bot_config;
DROP POLICY IF EXISTS "discord_bot_config_authenticated_access" ON discord_bot_config;

-- ================================
-- Ensure RLS is enabled on all Discord tables
-- ================================
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;

-- ================================
-- Create strict Option A policies
-- ================================

-- Helper expression for super_admin detection from JWT
-- We will reuse this expression across policies
-- NOTE: This uses both app_metadata and user_metadata to be robust
-- COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), (auth.jwt() -> 'user_metadata' ->> 'role')) = 'super_admin'

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

-- ================================
-- Verification helpers
-- ================================
SELECT 'Discord RLS updated to Option A (super_admin-only management) — teachers/directors act as regular users' AS status;