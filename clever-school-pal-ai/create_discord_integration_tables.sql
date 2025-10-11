-- Discord Integration Tables for Educational Agent
-- This script creates the necessary tables to map Discord entities to the educational hierarchy

-- Table to map Discord guilds (servers) to schools
CREATE TABLE IF NOT EXISTS discord_guilds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guild_id VARCHAR(20) UNIQUE NOT NULL, -- Discord guild ID
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    guild_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to map Discord channels to classes
CREATE TABLE IF NOT EXISTS discord_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id VARCHAR(20) UNIQUE NOT NULL, -- Discord channel ID
    guild_id VARCHAR(20) REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    channel_name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) DEFAULT 'text', -- text, voice, category, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to map Discord users to students
CREATE TABLE IF NOT EXISTS discord_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL, -- Discord user ID
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store Discord message interactions
CREATE TABLE IF NOT EXISTS discord_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(20) UNIQUE NOT NULL, -- Discord message ID
    user_id VARCHAR(20) REFERENCES discord_users(user_id) ON DELETE CASCADE,
    channel_id VARCHAR(20) REFERENCES discord_channels(channel_id) ON DELETE CASCADE,
    guild_id VARCHAR(20) REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    bot_response TEXT,
    context_applied JSONB, -- Store the hierarchical context applied
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store Discord bot configuration per guild
CREATE TABLE IF NOT EXISTS discord_bot_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guild_id VARCHAR(20) REFERENCES discord_guilds(guild_id) ON DELETE CASCADE,
    bot_personality TEXT, -- Guild-specific bot personality
    response_language VARCHAR(10) DEFAULT 'pt',
    auto_response BOOLEAN DEFAULT true,
    allowed_channels TEXT[], -- Array of channel IDs where bot can respond
    admin_roles TEXT[], -- Array of role IDs that can manage bot
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discord_guilds_guild_id ON discord_guilds(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_channel_id ON discord_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_channels_guild_id ON discord_channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_user_id ON discord_users(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_user_id ON discord_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_channel_id ON discord_interactions(channel_id);
CREATE INDEX IF NOT EXISTS idx_discord_interactions_created_at ON discord_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_discord_bot_config_guild_id ON discord_bot_config(guild_id);

-- RLS (Row Level Security) policies
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_bot_config ENABLE ROW LEVEL SECURITY;

-- Policy for discord_guilds - users can only see guilds from their school
CREATE POLICY "Users can view discord_guilds from their school" ON discord_guilds
    FOR SELECT USING (
        school_id IN (
            SELECT s.id FROM schools s
            JOIN users u ON u.school_id = s.id
            WHERE u.id = auth.uid()
        )
    );

-- Policy for discord_channels - users can only see channels from their school's guilds
CREATE POLICY "Users can view discord_channels from their school" ON discord_channels
    FOR SELECT USING (
        guild_id IN (
            SELECT dg.guild_id FROM discord_guilds dg
            JOIN schools s ON s.id = dg.school_id
            JOIN users u ON u.school_id = s.id
            WHERE u.id = auth.uid()
        )
    );

-- Policy for discord_users - users can view all discord users (for admin purposes)
CREATE POLICY "Users can view discord_users" ON discord_users
    FOR SELECT USING (true);

-- Policy for discord_interactions - users can only see interactions from their school
CREATE POLICY "Users can view discord_interactions from their school" ON discord_interactions
    FOR SELECT USING (
        guild_id IN (
            SELECT dg.guild_id FROM discord_guilds dg
            JOIN schools s ON s.id = dg.school_id
            JOIN users u ON u.school_id = s.id
            WHERE u.id = auth.uid()
        )
    );

-- Policy for discord_bot_config - users can only see config from their school's guilds
CREATE POLICY "Users can view discord_bot_config from their school" ON discord_bot_config
    FOR SELECT USING (
        guild_id IN (
            SELECT dg.guild_id FROM discord_guilds dg
            JOIN schools s ON s.id = dg.school_id
            JOIN users u ON u.school_id = s.id
            WHERE u.id = auth.uid()
        )
    );

-- Insert/Update/Delete policies for admins and teachers
CREATE POLICY "Admins and teachers can manage discord_guilds" ON discord_guilds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = discord_guilds.school_id
        )
    );

CREATE POLICY "Admins and teachers can manage discord_channels" ON discord_channels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN discord_guilds dg ON dg.guild_id = discord_channels.guild_id
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
            AND u.school_id = dg.school_id
        )
    );

CREATE POLICY "Admins and teachers can manage discord_users" ON discord_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "System can insert discord_interactions" ON discord_interactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins and teachers can manage discord_bot_config" ON discord_bot_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
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