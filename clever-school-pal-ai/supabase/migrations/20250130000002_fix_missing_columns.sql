-- Fix missing columns in database schema
-- This migration adds the missing columns that are causing errors

-- Add grade column to classes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' AND column_name = 'grade'
  ) THEN
    ALTER TABLE classes ADD COLUMN grade TEXT DEFAULT '5';
    COMMENT ON COLUMN classes.grade IS 'Grade level of the class (e.g., "5", "6", "7", etc.)';
    CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
  END IF;
END $$;

-- Update existing classes with grade based on name
UPDATE classes SET grade = '5' WHERE name LIKE '%5º%' AND grade IS NULL;
UPDATE classes SET grade = '6' WHERE name LIKE '%6º%' AND grade IS NULL;
UPDATE classes SET grade = '7' WHERE name LIKE '%7º%' AND grade IS NULL;
UPDATE classes SET grade = '8' WHERE name LIKE '%8º%' AND grade IS NULL;
UPDATE classes SET grade = '9' WHERE name LIKE '%9º%' AND grade IS NULL;
UPDATE classes SET grade = '1' WHERE name LIKE '%1º%' AND grade IS NULL;
UPDATE classes SET grade = '2' WHERE name LIKE '%2º%' AND grade IS NULL;
UPDATE classes SET grade = '3' WHERE name LIKE '%3º%' AND grade IS NULL;
UPDATE classes SET grade = '4' WHERE name LIKE '%4º%' AND grade IS NULL;

-- Add last_updated_by_name column to global_preferences table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_preferences' AND column_name = 'last_updated_by_name'
  ) THEN
    ALTER TABLE global_preferences ADD COLUMN last_updated_by_name TEXT;
    COMMENT ON COLUMN global_preferences.last_updated_by_name IS 'Name of the user who last updated the preference';
  END IF;
END $$;

-- Add bot_active column to students table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'bot_active'
  ) THEN
    ALTER TABLE students ADD COLUMN bot_active BOOLEAN DEFAULT true;
    COMMENT ON COLUMN students.bot_active IS 'Whether the bot is active for this student';
  END IF;
END $$;

-- Update all existing students to have bot_active = true if null
UPDATE students SET bot_active = true WHERE bot_active IS NULL;