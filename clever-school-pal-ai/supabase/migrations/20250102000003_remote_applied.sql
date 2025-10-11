-- Placeholder migration to match remote applied version 20250102000003
-- This is a no-op to resolve migration history drift between local and remote.

DO $$
BEGIN
  RAISE NOTICE 'No-op migration: 20250102000003 already applied on remote. Placeholder to align local history.';
END $$;