-- Create/ensure Storage bucket `content_files` and proper RLS policies
-- This fixes 400 "new row violates row-level security policy" when uploading via client SDK

BEGIN;

-- 1) Create bucket if it does not exist (public, max 50MB, common MIME types)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'content_files'
  ) THEN
    PERFORM storage.create_bucket(
      id => 'content_files',
      name => 'content_files',
      public => true,
      file_size_limit => 52428800, -- 50 MB
      allowed_mime_types => ARRAY[
        'application/pdf',
        'image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/webm',
        'text/plain','audio/mpeg','audio/wav'
      ]
    );
  END IF;
END
$$;

-- 2) Re-create policies (idempotent)
DROP POLICY IF EXISTS "content_files_public_read" ON storage.objects;
DROP POLICY IF EXISTS "content_files_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "content_files_authenticated_update_own" ON storage.objects;
DROP POLICY IF EXISTS "content_files_authenticated_delete_own" ON storage.objects;

-- Public read access for this bucket (not strictly required if bucket is public,
-- but keeps SELECT explicit for tools and SQL clients)
CREATE POLICY "content_files_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'content_files');

-- Allow authenticated users to upload to this bucket
CREATE POLICY "content_files_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content_files');

-- Allow authenticated users to update their own files in this bucket
CREATE POLICY "content_files_authenticated_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'content_files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'content_files' AND owner = auth.uid());

-- Allow authenticated users to delete their own files in this bucket
CREATE POLICY "content_files_authenticated_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'content_files' AND owner = auth.uid());

COMMIT;