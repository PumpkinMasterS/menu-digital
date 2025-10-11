-- Fix Discord RLS Policies
-- The issue is that policies are using u.id = auth.uid() instead of u.user_id = auth.uid()
-- admin_users.user_id references auth.users(id), not admin_users.id

-- Drop existing policies
DROP POLICY IF EXISTS "discord_guilds_admin_access" ON discord_guilds;
DROP POLICY IF EXISTS "discord_channels_admin_access" ON discord_channels;
DROP POLICY IF EXISTS "discord_users_admin_access" ON discord_users;
DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions;
DROP POLICY IF EXISTS "discord_bot_config_admin_access" ON discord_bot_config;

-- Create corrected policies for discord_guilds
CREATE POLICY "discord_guilds_admin_access" ON discord_guilds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            WHERE u.user_id = auth.uid()
            AND u.role IN ('admin', 'teacher', 'super_admin')
            AND (u.school_id = discord_guilds.school_id OR u.role = 'super_admin')
        )
    );

-- Create corrected policies for discord_channels
CREATE POLICY "discord_channels_admin_access" ON discord_channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_channels.guild_id
            WHERE u.user_id = auth.uid()
            AND u.role IN ('admin', 'teacher', 'super_admin')
            AND (u.school_id = dg.school_id OR u.role = 'super_admin')
        )
    );

-- Create corrected policies for discord_users
CREATE POLICY "discord_users_admin_access" ON discord_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_users.guild_id
            WHERE u.user_id = auth.uid()
            AND u.role IN ('admin', 'teacher', 'super_admin')
            AND (u.school_id = dg.school_id OR u.role = 'super_admin')
        )
    );

-- Create corrected policies for discord_interactions
CREATE POLICY "discord_interactions_admin_access" ON discord_interactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_interactions.guild_id
            WHERE u.user_id = auth.uid()
            AND u.role IN ('admin', 'teacher', 'super_admin')
            AND (u.school_id = dg.school_id OR u.role = 'super_admin')
        )
    );

-- Create corrected policies for discord_bot_config
CREATE POLICY "discord_bot_config_admin_access" ON discord_bot_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_bot_config.guild_id
            WHERE u.user_id = auth.uid()
            AND u.role IN ('admin', 'teacher', 'super_admin')
            AND (u.school_id = dg.school_id OR u.role = 'super_admin')
        )
    );

-- Add service_role policies for bot operations
CREATE POLICY "discord_guilds_service_role" ON discord_guilds
    FOR ALL TO service_role USING (true);

CREATE POLICY "discord_channels_service_role" ON discord_channels
    FOR ALL TO service_role USING (true);

CREATE POLICY "discord_users_service_role" ON discord_users
    FOR ALL TO service_role USING (true);

CREATE POLICY "discord_interactions_service_role" ON discord_interactions
    FOR ALL TO service_role USING (true);

CREATE POLICY "discord_bot_config_service_role" ON discord_bot_config
    FOR ALL TO service_role USING (true);

SELECT 'Discord RLS policies fixed successfully!' as status;