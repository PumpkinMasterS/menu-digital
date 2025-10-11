-- Create table for custom personalities
CREATE TABLE IF NOT EXISTS custom_personalities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE custom_personalities ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_personalities' AND policyname = 'Users can view their own personalities') THEN
    EXECUTE 'CREATE POLICY "Users can view their own personalities" ON custom_personalities FOR SELECT USING (created_by = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_personalities' AND policyname = 'Users can create their own personalities') THEN
    EXECUTE 'CREATE POLICY "Users can create their own personalities" ON custom_personalities FOR INSERT WITH CHECK (created_by = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_personalities' AND policyname = 'Users can update their own personalities') THEN
    EXECUTE 'CREATE POLICY "Users can update their own personalities" ON custom_personalities FOR UPDATE USING (created_by = auth.uid())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_personalities' AND policyname = 'Users can delete their own personalities') THEN
    EXECUTE 'CREATE POLICY "Users can delete their own personalities" ON custom_personalities FOR DELETE USING (created_by = auth.uid())';
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_custom_personalities_updated_at ON custom_personalities;
CREATE TRIGGER update_custom_personalities_updated_at
  BEFORE UPDATE ON custom_personalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();