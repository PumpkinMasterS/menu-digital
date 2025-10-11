-- Migration: Add missing grade column to classes table
-- Date: 2025-01-30
-- Description: Adds the missing grade column to classes table that is referenced throughout the application

-- Add grade column to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN classes.grade IS 'Grade level of the class (e.g., "1", "2", "3", etc.)';

-- Create index for better performance on grade queries
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);

-- Update existing classes with default grade if needed (optional)
-- You may want to run this manually to set appropriate grades for existing classes:
-- UPDATE classes SET grade = '5' WHERE grade IS NULL;