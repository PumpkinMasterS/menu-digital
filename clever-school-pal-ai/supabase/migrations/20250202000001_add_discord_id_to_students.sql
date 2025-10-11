-- Add discord_id field to students table
-- This migration adds Discord ID support to the students table for direct integration

-- Add discord_id column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS discord_id TEXT;

-- Add unique constraint to ensure one Discord ID per student
ALTER TABLE public.students 
ADD CONSTRAINT unique_discord_id UNIQUE (discord_id);

-- Create index for better performance on Discord ID lookups
CREATE INDEX IF NOT EXISTS idx_students_discord_id ON public.students(discord_id);

-- Add comment to document the field
COMMENT ON COLUMN public.students.discord_id IS 'Discord User ID for direct bot integration';

-- Update existing students with NULL discord_id (optional, for data consistency)
UPDATE public.students 
SET discord_id = NULL 
WHERE discord_id IS NULL;