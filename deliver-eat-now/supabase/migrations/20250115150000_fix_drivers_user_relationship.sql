-- ============================================================================
-- FIX DRIVERS USER RELATIONSHIP - MIGRATION
-- Version: 1.0.0
-- Date: 2025-01-15
-- Description: Establishes proper relationship between drivers and profiles tables
-- Author: SaborPortugues Team
-- ============================================================================

-- First, update existing drivers to have proper user_id relationship
-- This assumes drivers.id matches profiles.id for existing driver profiles
UPDATE drivers 
SET user_id = id 
WHERE user_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = drivers.id 
    AND profiles.role = 'driver'
  );

-- Add foreign key constraint between drivers.user_id and profiles.id
ALTER TABLE drivers 
ADD CONSTRAINT drivers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- Add comment for documentation
COMMENT ON COLUMN drivers.user_id IS 'Foreign key reference to profiles.id for the driver user';
COMMENT ON CONSTRAINT drivers_user_id_fkey ON drivers IS 'Ensures drivers are linked to valid user profiles';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Drivers-Profiles relationship migration completed successfully';
  RAISE NOTICE 'Updated % drivers with user_id relationship', (
    SELECT COUNT(*) FROM drivers WHERE user_id IS NOT NULL
  );
END $$;