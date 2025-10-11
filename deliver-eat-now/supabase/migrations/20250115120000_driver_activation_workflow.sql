-- Migration: Add driver activation fields
-- Description: Adds fields to support driver registration and activation workflow

-- Add activation fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activation_email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activation_email_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_activated_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add index for better performance on activation queries
CREATE INDEX IF NOT EXISTS idx_profiles_activation_email_sent ON profiles(activation_email_sent);
CREATE INDEX IF NOT EXISTS idx_profiles_account_activated ON profiles(account_activated);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);

-- Update drivers table to include activation status
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'pending';

-- Add index for driver status queries
CREATE INDEX IF NOT EXISTS idx_drivers_profile_completed ON drivers(profile_completed);
CREATE INDEX IF NOT EXISTS idx_drivers_documents_verified ON drivers(documents_verified);

-- Create function to automatically create driver record when profile is created with driver role
CREATE OR REPLACE FUNCTION create_driver_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create driver record if role is 'driver'
  IF NEW.role = 'driver' THEN
    INSERT INTO drivers (
      id,
      user_id,
      organization_id,
      status,
      profile_completed,
      documents_verified,
      background_check_status
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.organization_id,
      'inactive',
      FALSE,
      FALSE,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create driver record
DROP TRIGGER IF EXISTS trigger_create_driver_on_profile_insert ON profiles;
CREATE TRIGGER trigger_create_driver_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_driver_on_profile_insert();

-- Create function to update driver status when profile is activated
CREATE OR REPLACE FUNCTION update_driver_on_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- If account was just activated and user is a driver
  IF NEW.account_activated = TRUE AND OLD.account_activated = FALSE AND NEW.role = 'driver' THEN
    UPDATE drivers 
    SET 
      status = 'active',
      updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update driver status on activation
DROP TRIGGER IF EXISTS trigger_update_driver_on_activation ON profiles;
CREATE TRIGGER trigger_update_driver_on_activation
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_on_activation();

-- Add RLS policies for driver activation workflow

-- Policy for super_admin to create drivers in their organization
CREATE POLICY "super_admin_can_create_drivers" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles creator
      WHERE creator.id = auth.uid()
      AND creator.role = 'super_admin'
      AND creator.organization_id = organization_id
    )
  );

-- Policy for drivers to view their own profile
CREATE POLICY "drivers_can_view_own_profile" ON profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles viewer
      WHERE viewer.id = auth.uid()
      AND (
        viewer.role IN ('super_admin', 'platform_owner') OR
        (viewer.role = 'super_admin' AND viewer.organization_id = organization_id)
      )
    )
  );

-- Policy for drivers to update their own profile (after activation)
CREATE POLICY "drivers_can_update_own_profile" ON profiles
  FOR UPDATE
  USING (
    id = auth.uid() AND account_activated = TRUE
  )
  WITH CHECK (
    id = auth.uid() AND account_activated = TRUE
  );

-- Add comments for documentation
COMMENT ON COLUMN profiles.activation_email_sent IS 'Indicates if activation email was sent to the user';
COMMENT ON COLUMN profiles.activation_email_sent_at IS 'Timestamp when activation email was sent';
COMMENT ON COLUMN profiles.account_activated IS 'Indicates if the user has activated their account';
COMMENT ON COLUMN profiles.account_activated_at IS 'Timestamp when account was activated';
COMMENT ON COLUMN profiles.temp_password_hash IS 'Temporary password hash for initial login';
COMMENT ON COLUMN profiles.created_by IS 'ID of the admin who created this profile';

COMMENT ON COLUMN drivers.profile_completed IS 'Indicates if driver has completed their profile setup';
COMMENT ON COLUMN drivers.documents_verified IS 'Indicates if driver documents have been verified';
COMMENT ON COLUMN drivers.background_check_status IS 'Status of background check: pending, approved, rejected';