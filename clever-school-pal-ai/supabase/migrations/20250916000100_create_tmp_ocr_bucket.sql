-- Create/ensure Storage bucket `tmp-ocr` (private) and RLS policies for temporary OCR files
-- Used for short-lived image/PDF uploads that will be accessed via signed URLs only

BEGIN;

-- 1) Create bucket if it does not exist (private, max 25MB, images/PDF only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'tmp-ocr'
  ) THEN
    PERFORM storage.create_bucket(
      id => 'tmp-ocr',
      name => 'tmp-ocr',
      public => false,
      file_size_limit => 26214400, -- 25 MB
      allowed_mime_types => ARRAY[
        'image/jpeg','image/png','image/webp','image/gif',
        'application/pdf'
      ]
    );
  END IF;
END
$$;

-- 2) Re-create policies (idempotent)
DROP POLICY IF EXISTS "tmp_ocr_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "tmp_ocr_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "tmp_ocr_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "tmp_ocr_owner_delete" ON storage.objects;

-- Allow authenticated users to upload to this bucket
CREATE POLICY "tmp_ocr_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tmp-ocr');

-- Allow authenticated users to read their own objects (for generating signed URLs)
CREATE POLICY "tmp_ocr_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tmp-ocr' AND owner = auth.uid());

-- Allow authenticated users to update their own objects
CREATE POLICY "tmp_ocr_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'tmp-ocr' AND owner = auth.uid())
WITH CHECK (bucket_id = 'tmp-ocr' AND owner = auth.uid());

-- Allow authenticated users to delete their own objects
CREATE POLICY "tmp_ocr_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'tmp-ocr' AND owner = auth.uid());

COMMIT;