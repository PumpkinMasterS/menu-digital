-- Add status column to contents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contents' AND column_name = 'status') THEN
        ALTER TABLE contents ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));
        RAISE NOTICE 'Added status column to contents table';
    ELSE
        RAISE NOTICE 'Status column already exists in contents table';
    END IF;
END $$;

-- Create index for status column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);

-- Update existing records to have published status if they don't have one
UPDATE contents SET status = 'published' WHERE status IS NULL;