-- Create admin and user management tables

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'teacher')),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- Create response_cache table (referenced in AI features migration)
CREATE TABLE IF NOT EXISTS public.response_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash TEXT NOT NULL,
    response_data JSONB NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    UNIQUE(query_hash, school_id)
);

-- Create content_classes table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.content_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    UNIQUE(content_id, class_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_school_id ON admin_users(school_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_response_cache_query_hash ON response_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_response_cache_school_id ON response_cache(school_id);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires_at ON response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_content_classes_content_id ON content_classes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_classes_class_id ON content_classes(class_id);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON response_cache FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON content_classes FOR ALL USING (true);

-- Insert sample admin user
INSERT INTO admin_users (id, email, name, role, school_id, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440008', 'admin@escola.com', 'Administrador', 'super_admin', '550e8400-e29b-41d4-a716-446655440000', true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Admin tables created successfully!' as status;