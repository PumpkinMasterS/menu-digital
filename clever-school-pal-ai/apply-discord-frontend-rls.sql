-- Apply Discord RLS policies for frontend access
-- Execute this in Supabase Dashboard > SQL Editor

-- Drop existing conflicting policies for discord_interactions
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

-- Enable RLS on discord_interactions
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for discord_interactions
-- Allow service role full access (for Discord bot operations)
CREATE POLICY "discord_interactions_service_role_access" ON discord_interactions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to view all interactions (simplified for now)
CREATE POLICY "discord_interactions_authenticated_select" ON discord_interactions
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to insert interactions
CREATE POLICY "discord_interactions_authenticated_insert" ON discord_interactions
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to update interactions
CREATE POLICY "discord_interactions_authenticated_update" ON discord_interactions
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to delete interactions
CREATE POLICY "discord_interactions_authenticated_delete" ON discord_interactions
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Also fix other Discord tables to allow authenticated access
-- Discord Guilds
DROP POLICY IF EXISTS "discord_guilds_service_role" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_service_role_access" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_select_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_insert_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_update_policy" ON discord_guilds;
DROP POLICY IF EXISTS "discord_guilds_delete_policy" ON discord_guilds;

ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_guilds_service_role_access" ON discord_guilds
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "discord_guilds_authenticated_access" ON discord_guilds
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Discord Channels  
DROP POLICY IF EXISTS "discord_channels_service_role" ON discord_channels;
DROP POLICY IF EXISTS "discord_channels_service_role_access" ON discord_channels;

ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_channels_service_role_access" ON discord_channels
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "discord_channels_authenticated_access" ON discord_channels
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Discord Users
DROP POLICY IF EXISTS "discord_users_service_role" ON discord_users;
DROP POLICY IF EXISTS "discord_users_service_role_access" ON discord_users;

ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_users_service_role_access" ON discord_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "discord_users_authenticated_access" ON discord_users
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

-- Discord Bot Config
DROP POLICY IF EXISTS "discord_bot_config_service_role" ON discord_bot_config;
DROP POLICY IF EXISTS "discord_bot_config_service_role_access" ON discord_bot_config;

ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_bot_config_service_role_access" ON discord_bot_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "discord_bot_config_authenticated_access" ON discord_bot_config
    FOR ALL USING (
        auth.role() = 'service_role' OR
        auth.role() = 'authenticated'
    );

SELECT 'Discord frontend RLS policies created successfully!' as status;