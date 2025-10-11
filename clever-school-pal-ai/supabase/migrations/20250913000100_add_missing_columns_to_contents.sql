-- Add missing columns used by the frontend into contents table
-- This migration fixes PostgREST error PGRST204: 'content_data' column not found in the schema cache
-- and aligns the schema with the app payload (description, tags, difficulty, content_data)

BEGIN;

-- Ensure table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contents'
  ) THEN
    RAISE EXCEPTION 'Table public.contents not found';
  END IF;
END $$;

-- content_data TEXT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'content_data'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN content_data text;
    RAISE NOTICE 'Added column contents.content_data (text)';
  ELSE
    RAISE NOTICE 'Column contents.content_data already exists — skipping';
  END IF;
END $$;

-- description TEXT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN description text;
    RAISE NOTICE 'Added column contents.description (text)';
  ELSE
    RAISE NOTICE 'Column contents.description already exists — skipping';
  END IF;
END $$;

-- tags TEXT (CSV string as used by the app)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN tags text;
    RAISE NOTICE 'Added column contents.tags (text)';
  ELSE
    RAISE NOTICE 'Column contents.tags already exists — skipping';
  END IF;
END $$;

-- difficulty TEXT (keeps existing difficulty_level INTEGER; both may coexist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN difficulty text;
    RAISE NOTICE 'Added column contents.difficulty (text)';
  ELSE
    RAISE NOTICE 'Column contents.difficulty already exists — skipping';
  END IF;
END $$;

COMMIT;