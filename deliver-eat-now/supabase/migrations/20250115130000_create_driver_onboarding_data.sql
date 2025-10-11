-- Create table to store driver onboarding data
CREATE TABLE IF NOT EXISTS driver_onboarding_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Legal consent data
    legal_consent JSONB NOT NULL DEFAULT '{}',
    
    -- Personal data
    personal_data JSONB NOT NULL DEFAULT '{}',
    
    -- Documents data
    documents JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(driver_id),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_onboarding_data_driver_id ON driver_onboarding_data(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_onboarding_data_user_id ON driver_onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_onboarding_data_completed_at ON driver_onboarding_data(completed_at);

-- Enable RLS
ALTER TABLE driver_onboarding_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Drivers can view their own onboarding data" ON driver_onboarding_data
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Drivers can insert their own onboarding data" ON driver_onboarding_data
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can update their own onboarding data" ON driver_onboarding_data
    FOR UPDATE USING (user_id = auth.uid());

-- Admin policies
CREATE POLICY "Admins can view all onboarding data" ON driver_onboarding_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('platform_owner', 'super_admin')
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_driver_onboarding_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_onboarding_data_updated_at
    BEFORE UPDATE ON driver_onboarding_data
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_onboarding_data_updated_at();

-- Add comments for documentation
COMMENT ON TABLE driver_onboarding_data IS 'Stores detailed onboarding data for drivers including legal consent, personal information, and document references';
COMMENT ON COLUMN driver_onboarding_data.legal_consent IS 'JSON object containing GDPR consent, terms acceptance, and privacy policy acceptance';
COMMENT ON COLUMN driver_onboarding_data.personal_data IS 'JSON object containing full name, NIF, NISS, address, bank details, and vehicle type';
COMMENT ON COLUMN driver_onboarding_data.documents IS 'JSON object containing references to uploaded documents (identification, tax document, driving license, vehicle insurance)';