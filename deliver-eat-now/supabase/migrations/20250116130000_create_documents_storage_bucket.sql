-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket for security
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for driver documents

-- Policy for drivers to upload their own documents
CREATE POLICY "Drivers can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'driver-documents'
  );

-- Policy for drivers to view their own documents
CREATE POLICY "Drivers can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'driver-documents'
  );

-- Policy for drivers to update their own documents
CREATE POLICY "Drivers can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'driver-documents'
  );

-- Policy for drivers to delete their own documents
CREATE POLICY "Drivers can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'driver-documents'
  );

-- Policy for admins to view all driver documents
CREATE POLICY "Admins can view all driver documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] = 'driver-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('platform_owner', 'super_admin')
    )
  );

-- Policy for admins to manage all driver documents
CREATE POLICY "Admins can manage all driver documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] = 'driver-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('platform_owner', 'super_admin')
    )
  );

-- Create function to get signed URL for document viewing
CREATE OR REPLACE FUNCTION get_driver_document_url(document_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- Check if user is authorized to view this document
  IF NOT (
    -- Driver viewing their own document
    (auth.uid()::text = (string_to_array(document_path, '/'))[1]) OR
    -- Admin viewing any document
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('platform_owner', 'super_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to document';
  END IF;

  -- Generate signed URL (valid for 1 hour)
  SELECT storage.create_signed_url('documents', document_path, 3600) INTO signed_url;
  
  RETURN signed_url;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_driver_document_url(TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_driver_document_url(TEXT) IS 'Generate signed URL for viewing driver documents with proper authorization';
COMMENT ON POLICY "Drivers can upload their own documents" ON storage.objects IS 'Allows drivers to upload documents to their own folder';
COMMENT ON POLICY "Admins can view all driver documents" ON storage.objects IS 'Allows platform owners and super admins to view all driver documents for verification';