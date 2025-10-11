-- EXECUTAR ESTE SQL NO SUPABASE DASHBOARD
-- Vá para https://supabase.com → Seu projeto → SQL Editor → Nova Query → Cole este código

-- Add color column to delivery_zones table
ALTER TABLE delivery_zones 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment to explain the column
COMMENT ON COLUMN delivery_zones.color IS 'Hexadecimal color code for zone visualization (e.g., #FF0000 for red)';

-- Update existing zones to have a default color if they don't have one
UPDATE delivery_zones 
SET color = '#3B82F6' 
WHERE color IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'delivery_zones' AND column_name = 'color'; 