-- ============================================================================
-- HIERARCHICAL USER SYSTEM - MIGRATION
-- Version: 1.0.0
-- Date: 2025-01-09
-- Description: Implements proper hierarchical user management with regional scoping
-- Author: SaborPortugues Team
-- ============================================================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE REGIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    country_code CHAR(2) NOT NULL DEFAULT 'PT',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ADD HIERARCHICAL FIELDS TO PROFILES
-- ============================================================================

-- Add hierarchical columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add metadata for better tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at_hierarchy TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;

-- ============================================================================
-- 3. ADD HIERARCHICAL FIELDS TO RESTAURANTS
-- ============================================================================

-- Add region and creator tracking to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Hierarchical indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_region_id ON profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_id ON profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_region ON profiles(role, region_id);

-- Regional indexes for restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_region_id ON restaurants(region_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_by ON restaurants(created_by);

-- Regions indexes
CREATE INDEX IF NOT EXISTS idx_regions_created_by ON regions(created_by);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's hierarchical context
CREATE OR REPLACE FUNCTION get_user_hierarchy_context(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_profile profiles%ROWTYPE;
    result JSONB;
BEGIN
    SELECT * INTO user_profile FROM profiles WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "User not found"}'::JSONB;
    END IF;
    
    result := jsonb_build_object(
        'user_id', user_profile.id,
        'role', user_profile.role,
        'region_id', user_profile.region_id,
        'restaurant_id', user_profile.restaurant_id,
        'created_by', user_profile.created_by,
        'hierarchy_level', user_profile.hierarchy_level
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage another user
CREATE OR REPLACE FUNCTION can_manage_user(manager_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    manager_profile profiles%ROWTYPE;
    target_profile profiles%ROWTYPE;
BEGIN
    SELECT * INTO manager_profile FROM profiles WHERE id = manager_id;
    SELECT * INTO target_profile FROM profiles WHERE id = target_user_id;
    
    -- Platform owner can manage everyone
    IF manager_profile.role = 'platform_owner' THEN
        RETURN TRUE;
    END IF;
    
    -- Super admin can manage users in their region
    IF manager_profile.role = 'super_admin' THEN
        RETURN target_profile.region_id = manager_profile.region_id 
               AND target_profile.role IN ('restaurant_admin', 'kitchen', 'driver');
    END IF;
    
    -- Restaurant admin can manage kitchen staff in their restaurant
    IF manager_profile.role = 'restaurant_admin' THEN
        RETURN target_profile.restaurant_id = manager_profile.restaurant_id 
               AND target_profile.role = 'kitchen';
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get allowed roles for user creation
CREATE OR REPLACE FUNCTION get_creatable_roles(creator_role TEXT)
RETURNS TEXT[] AS $$
BEGIN
    CASE creator_role
        WHEN 'platform_owner' THEN
            RETURN ARRAY['super_admin']::TEXT[];
        WHEN 'super_admin' THEN
            RETURN ARRAY['restaurant_admin', 'kitchen', 'driver']::TEXT[];
        WHEN 'restaurant_admin' THEN
            RETURN ARRAY['kitchen']::TEXT[];
        ELSE
            RETURN ARRAY[]::TEXT[];
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. UPDATE EXISTING TRIGGERS
-- ============================================================================

-- Add trigger for regions updated_at
CREATE OR REPLACE FUNCTION update_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regions_updated_at_trigger
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_regions_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on regions table
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Regions policies
CREATE POLICY "Platform owners can manage all regions" ON regions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'platform_owner'
        )
    );

CREATE POLICY "Super admins can view their region" ON regions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin' 
            AND region_id = regions.id
        )
    );

CREATE POLICY "Users can view regions for context" ON regions
    FOR SELECT USING (is_active = true);

-- Enhanced profiles policies for hierarchy
CREATE POLICY "Users can manage according to hierarchy" ON profiles
    FOR ALL USING (
        -- User can manage themselves
        id = auth.uid() 
        OR 
        -- Use hierarchy checking function
        can_manage_user(auth.uid(), id)
    );

-- ============================================================================
-- 8. SEED DATA FOR TESTING
-- ============================================================================

-- Insert default regions (only if they don't exist)
INSERT INTO regions (name, slug, description, is_active) 
VALUES 
    ('Lisboa', 'lisboa', 'Região de Lisboa e Vale do Tejo', true),
    ('Porto', 'porto', 'Região do Norte - Porto', true),
    ('Coimbra', 'coimbra', 'Região do Centro - Coimbra', true),
    ('Faro', 'faro', 'Região do Algarve - Faro', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE regions IS 'Geographic regions for platform organization and super admin management';
COMMENT ON COLUMN profiles.created_by IS 'User who created this profile (hierarchical relationship)';
COMMENT ON COLUMN profiles.region_id IS 'Region assignment for super_admin and driver roles';
COMMENT ON COLUMN profiles.restaurant_id IS 'Restaurant assignment for restaurant_admin and kitchen roles';
COMMENT ON COLUMN profiles.hierarchy_level IS 'Hierarchical level (0=platform_owner, 1=super_admin, 2=restaurant_admin, 3=kitchen/driver/customer)';

COMMENT ON FUNCTION get_user_hierarchy_context(UUID) IS 'Returns complete hierarchical context for a user';
COMMENT ON FUNCTION can_manage_user(UUID, UUID) IS 'Checks if first user can manage second user based on hierarchy';
COMMENT ON FUNCTION get_creatable_roles(TEXT) IS 'Returns array of roles that given role can create';

-- ============================================================================
-- 10. FINAL VERIFICATION
-- ============================================================================

-- Show created objects for verification
DO $$
BEGIN
    RAISE NOTICE 'Hierarchical User System Migration Completed Successfully!';
    RAISE NOTICE 'Created tables: regions';
    RAISE NOTICE 'Added hierarchical columns to: profiles, restaurants'; 
    RAISE NOTICE 'Created functions: get_user_hierarchy_context, can_manage_user, get_creatable_roles';
    RAISE NOTICE 'Seeded % regions', (SELECT COUNT(*) FROM regions);
    RAISE NOTICE 'Ready for hierarchical user management!';
END $$; 