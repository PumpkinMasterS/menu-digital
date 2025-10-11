-- Fix Discord RLS policies to allow service role access
-- This script creates policies that allow the service role to bypass RLS restrictions

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions;
DROP POLICY IF EXISTS "System can insert discord_interactions" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_service_role" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_system_access" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_select_policy" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_insert_policy" ON discord_interactions;
DROP POLICY IF EXISTS "discord_interactions_update_policy" ON discord_interactions;

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

-- Also fix other Discord tables to allow service role access
-- Discord Guilds
DROP POLICY IF EXISTS "discord_guilds_service_role" ON discord_guilds;
CREATE POLICY "discord_guilds_service_role_access" ON discord_guilds
    FOR ALL USING (auth.role() = 'service_role');

-- Discord Channels  
DROP POLICY IF EXISTS "discord_channels_service_role" ON discord_channels;
CREATE POLICY "discord_channels_service_role_access" ON discord_channels
    FOR ALL USING (auth.role() = 'service_role');

-- Discord Users
DROP POLICY IF EXISTS "discord_users_service_role" ON discord_users;
CREATE POLICY "discord_users_service_role_access" ON discord_users
    FOR ALL USING (auth.role() = 'service_role');

-- Discord Bot Config
DROP POLICY IF EXISTS "discord_bot_config_service_role" ON discord_bot_config;
CREATE POLICY "discord_bot_config_service_role_access" ON discord_bot_config
    FOR ALL USING (auth.role() = 'service_role');

SELECT 'Discord service role policies created successfully!' as status;