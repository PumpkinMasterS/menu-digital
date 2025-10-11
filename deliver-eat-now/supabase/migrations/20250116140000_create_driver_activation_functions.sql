-- Create function to activate driver account after document verification
CREATE OR REPLACE FUNCTION activate_driver_account(driver_user_id UUID, activation_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  -- Check if user is authorized (admin only)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('platform_owner', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can activate driver accounts';
  END IF;

  -- Get driver information
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.account_activated,
    d.documents_verified,
    d.profile_completed,
    d.background_check_status
  INTO driver_record
  FROM profiles p
  LEFT JOIN drivers d ON d.user_id = p.id
  WHERE p.id = driver_user_id AND p.role = 'driver';

  -- Check if driver exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found with ID: %', driver_user_id;
  END IF;

  -- Check if account is already activated
  IF driver_record.account_activated THEN
    RAISE NOTICE 'Driver account is already activated';
    RETURN TRUE;
  END IF;

  -- Validate that all requirements are met
  IF NOT driver_record.documents_verified THEN
    RAISE EXCEPTION 'Cannot activate account: Documents not verified';
  END IF;

  IF NOT driver_record.profile_completed THEN
    RAISE EXCEPTION 'Cannot activate account: Profile not completed';
  END IF;

  -- Update profile to activate account
  UPDATE profiles 
  SET 
    account_activated = TRUE,
    account_activated_at = NOW(),
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = driver_user_id;

  -- Update driver status
  UPDATE drivers 
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE user_id = driver_user_id;

  -- Log the activation
  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    'driver_account_activated',
    driver_user_id,
    jsonb_build_object(
      'driver_name', driver_record.full_name,
      'driver_email', driver_record.email,
      'activation_reason', COALESCE(activation_reason, 'Manual activation after document verification')
    ),
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Create function to deactivate driver account
CREATE OR REPLACE FUNCTION deactivate_driver_account(driver_user_id UUID, deactivation_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  -- Check if user is authorized (admin only)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('platform_owner', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can deactivate driver accounts';
  END IF;

  -- Get driver information
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.account_activated
  INTO driver_record
  FROM profiles p
  WHERE p.id = driver_user_id AND p.role = 'driver';

  -- Check if driver exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found with ID: %', driver_user_id;
  END IF;

  -- Update profile to deactivate account
  UPDATE profiles 
  SET 
    account_activated = FALSE,
    is_active = FALSE,
    updated_at = NOW()
  WHERE id = driver_user_id;

  -- Update driver status
  UPDATE drivers 
  SET 
    status = 'inactive',
    updated_at = NOW()
  WHERE user_id = driver_user_id;

  -- Log the deactivation
  INSERT INTO admin_actions (
    admin_id,
    action_type,
    target_user_id,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    'driver_account_deactivated',
    driver_user_id,
    jsonb_build_object(
      'driver_name', driver_record.full_name,
      'driver_email', driver_record.email,
      'deactivation_reason', deactivation_reason
    ),
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Create admin actions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for admin actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Enable RLS on admin actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin actions
CREATE POLICY "Admins can view all admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert admin actions" ON admin_actions
  FOR INSERT WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('platform_owner', 'super_admin')
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_driver_account(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_driver_account(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION activate_driver_account(UUID, TEXT) IS 'Activate a driver account after verification by admin';
COMMENT ON FUNCTION deactivate_driver_account(UUID, TEXT) IS 'Deactivate a driver account with reason by admin';
COMMENT ON TABLE admin_actions IS 'Log of administrative actions performed on the platform';