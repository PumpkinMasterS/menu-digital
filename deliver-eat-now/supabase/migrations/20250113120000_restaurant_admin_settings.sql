-- Migration: Restaurant Administrative Settings
-- Description: Add administrative-only columns to restaurants table for platform_owner and super_admin configuration

-- Add administrative settings columns to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS marketing_description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1 CHECK (priority_level >= 1 AND priority_level <= 10);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,2) DEFAULT 15.00 CHECK (commission_rate >= 0 AND commission_rate <= 30);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_zones JSONB DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN restaurants.display_name IS 'Name displayed to customers (can be different from internal name)';
COMMENT ON COLUMN restaurants.marketing_description IS 'Enhanced description for marketing campaigns';
COMMENT ON COLUMN restaurants.admin_notes IS 'Internal notes visible only to administrators';
COMMENT ON COLUMN restaurants.priority_level IS 'Priority level 1-10 for platform visibility (higher = more prominent)';
COMMENT ON COLUMN restaurants.commission_rate IS 'Commission rate percentage for this restaurant';
COMMENT ON COLUMN restaurants.featured_until IS 'Date until which restaurant is featured';
COMMENT ON COLUMN restaurants.seo_keywords IS 'SEO keywords for search optimization';
COMMENT ON COLUMN restaurants.banner_url IS 'URL for restaurant banner image';
COMMENT ON COLUMN restaurants.social_media IS 'Social media links and settings';
COMMENT ON COLUMN restaurants.business_hours IS 'Detailed business hours configuration';
COMMENT ON COLUMN restaurants.delivery_zones IS 'Custom delivery zone configurations';
COMMENT ON COLUMN restaurants.notification_settings IS 'Restaurant-specific notification preferences';

-- Update RLS policies to ensure only platform_owner and super_admin can modify admin settings
-- First, let's create a function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('platform_owner', 'super_admin')
  );
END;
$$;

-- Create a policy for admin-only columns update
-- This policy will be enforced by the application layer for specific columns
CREATE POLICY "Admin can update admin settings" ON restaurants
FOR UPDATE 
TO authenticated
USING (
  -- Platform owners can update any restaurant
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'platform_owner'
  ))
  OR
  -- Super admins can only update restaurants in their organization
  (EXISTS (
    SELECT 1 FROM profiles p
    JOIN restaurants r ON r.id = restaurants.id
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
    AND r.organization_id = p.organization_id
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_priority_level ON restaurants(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_featured_until ON restaurants(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_commission_rate ON restaurants(commission_rate);

-- Create a view for public restaurant data (excludes admin-only fields)
CREATE OR REPLACE VIEW public_restaurants AS
SELECT 
  id,
  name,
  COALESCE(display_name, name) as display_name,
  description,
  address,
  phone,
  email,
  image_url,
  banner_url,
  cuisine_type,
  is_active,
  delivery_radius,
  delivery_fee,
  minimum_order,
  average_delivery_time as delivery_time,
  rating,
  organization_id,
  created_at,
  social_media,
  business_hours
FROM restaurants
WHERE is_active = true;

-- Grant permissions
GRANT SELECT ON public_restaurants TO authenticated;
GRANT SELECT ON public_restaurants TO anon;

-- Update existing restaurants to have display_name if null
UPDATE restaurants 
SET display_name = name 
WHERE display_name IS NULL;

-- Create audit log for admin changes (optional)
CREATE TABLE IF NOT EXISTS restaurant_admin_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS for audit table
ALTER TABLE restaurant_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON restaurant_admin_audit
FOR SELECT
TO authenticated
USING (auth.is_admin());

CREATE POLICY "System can insert audit logs" ON restaurant_admin_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a function to log admin changes
CREATE OR REPLACE FUNCTION log_restaurant_admin_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log changes to admin-specific fields
  IF TG_OP = 'UPDATE' THEN
    -- Check each admin field for changes
    IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
      INSERT INTO restaurant_admin_audit (restaurant_id, admin_user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'UPDATE', 'admin_notes', OLD.admin_notes, NEW.admin_notes);
    END IF;
    
    IF OLD.priority_level IS DISTINCT FROM NEW.priority_level THEN
      INSERT INTO restaurant_admin_audit (restaurant_id, admin_user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'UPDATE', 'priority_level', OLD.priority_level::text, NEW.priority_level::text);
    END IF;
    
    IF OLD.commission_rate IS DISTINCT FROM NEW.commission_rate THEN
      INSERT INTO restaurant_admin_audit (restaurant_id, admin_user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'UPDATE', 'commission_rate', OLD.commission_rate::text, NEW.commission_rate::text);
    END IF;
    
    IF OLD.featured_until IS DISTINCT FROM NEW.featured_until THEN
      INSERT INTO restaurant_admin_audit (restaurant_id, admin_user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'UPDATE', 'featured_until', OLD.featured_until::text, NEW.featured_until::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS restaurant_admin_audit_trigger ON restaurants;
CREATE TRIGGER restaurant_admin_audit_trigger
  AFTER UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION log_restaurant_admin_change(); 