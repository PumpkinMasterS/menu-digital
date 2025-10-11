-- Fix content_type constraint by removing it temporarily
-- This allows for more flexible content types

-- Drop the existing constraint that's causing issues
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_type_check;

-- Add new columns to support topic-based content
ALTER TABLE contents ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS learning_objectives text;

-- Create index for better performance on content_type queries (commented out - column doesn't exist in base table)
-- CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);

-- Add comment to explain the topic content type (commented out - column doesn't exist in base table)
-- COMMENT ON COLUMN contents.content_type IS 'Type of content: topic (LLM guidance), text, pdf, image, video, link, file, document, audio, or presentation';