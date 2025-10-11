-- Cleanup Discord RLS to strictly match Option A
-- Drops any legacy/non-Option-A policies from Discord tables, keeping only:
--   *_service_role_all and *_super_admin_manage

-- Ensure RLS remains enabled on all Discord tables
ALTER TABLE public.discord_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_bot_config ENABLE ROW LEVEL SECURITY;

-- Drop all non-Option-A policies dynamically
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS tablename, p.polname AS policyname
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'discord_interactions',
        'discord_guilds',
        'discord_channels',
        'discord_users',
        'discord_bot_config'
      )
      AND p.polname NOT IN (
        'discord_interactions_service_role_all','discord_interactions_super_admin_manage',
        'discord_guilds_service_role_all','discord_guilds_super_admin_manage',
        'discord_channels_service_role_all','discord_channels_super_admin_manage',
        'discord_users_service_role_all','discord_users_super_admin_manage',
        'discord_bot_config_service_role_all','discord_bot_config_super_admin_manage'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

SELECT 'Removed legacy Discord policies to enforce Option A' AS status;