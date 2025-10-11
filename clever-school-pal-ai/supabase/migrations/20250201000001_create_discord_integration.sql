-- Discord Integration Tables
-- This migration creates tables to map Discord entities to educational hierarchy

-- Discord Guilds (Servers) mapped to Schools
CREATE TABLE IF NOT EXISTS discord_guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT UNIQUE NOT NULL,
    guild_name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Channels mapped to Classes
CREATE TABLE IF NOT EXISTS discord_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT UNIQUE NOT NULL,
    channel_name TEXT NOT NULL,
    guild_id TEXT REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    channel_type TEXT DEFAULT 'text' CHECK (channel_type IN ('text', 'voice', 'category')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Users mapped to Students
CREATE TABLE IF NOT EXISTS discord_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    guild_id TEXT REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Interactions Log
CREATE TABLE IF NOT EXISTS discord_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_content TEXT,
    bot_response TEXT,
    interaction_type TEXT DEFAULT 'message' CHECK (interaction_type IN ('message', 'command', 'reaction')),
    context_used JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discord Bot Configuration
CREATE TABLE IF NOT EXISTS discord_bot_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT UNIQUE REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    bot_token TEXT,
    command_prefix TEXT DEFAULT '!',
    language TEXT DEFAULT 'pt-BR',
    welcome_message TEXT,
    help_message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discord_guilds_school_id ON discord_guilds(school_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_guild_id ON discord_channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_class_id ON discord_channels(class_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_student_id ON discord_users(student_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_guild_id ON discord_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_user_id ON discord_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_guild_id ON discord_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_created_at ON discord_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_discord_bot_config_guild_id ON discord_bot_config(guild_id);

-- Row Level Security (RLS) Policies
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;

-- Policies for discord_guilds
CREATE POLICY "discord_guilds_admin_access" ON discord_guilds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = discord_guilds.school_id
        )
    );

-- Policies for discord_channels
CREATE POLICY "discord_channels_admin_access" ON discord_channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_channels.guild_id
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = dg.school_id
        )
    );

-- Policies for discord_users
CREATE POLICY "discord_users_admin_access" ON discord_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_users.guild_id
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = dg.school_id
        )
    );

-- Policies for discord_interactions
CREATE POLICY "discord_interactions_admin_access" ON discord_interactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_interactions.guild_id
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = dg.school_id
        )
    );

-- Policies for discord_bot_config
CREATE POLICY "discord_bot_config_admin_access" ON discord_bot_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users u
            JOIN discord_guilds dg ON dg.guild_id = discord_bot_config.guild_id
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = dg.school_id
        )
    );

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_discord_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_discord_guilds_updated_at BEFORE UPDATE ON discord_guilds
    FOR EACH ROW EXECUTE FUNCTION update_discord_updated_at_column();

CREATE TRIGGER update_discord_channels_updated_at BEFORE UPDATE ON discord_channels
    FOR EACH ROW EXECUTE FUNCTION update_discord_updated_at_column();

CREATE TRIGGER update_discord_users_updated_at BEFORE UPDATE ON discord_users
    FOR EACH ROW EXECUTE FUNCTION update_discord_updated_at_column();

CREATE TRIGGER update_discord_bot_config_updated_at BEFORE UPDATE ON discord_bot_config
    FOR EACH ROW EXECUTE FUNCTION update_discord_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE discord_guilds IS 'Maps Discord servers (guilds) to schools in the educational hierarchy';
COMMENT ON TABLE discord_channels IS 'Maps Discord channels to classes, enabling context-aware responses';
COMMENT ON TABLE discord_users IS 'Maps Discord users to students for personalized educational interactions';
COMMENT ON TABLE discord_interactions IS 'Stores all Discord bot interactions for analytics and context building';
COMMENT ON TABLE discord_bot_config IS 'Configuration settings for the Discord bot per guild/school';