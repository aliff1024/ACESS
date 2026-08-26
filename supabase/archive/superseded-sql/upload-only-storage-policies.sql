-- UPLOAD-ONLY STORAGE POLICIES FOR COURSE-ASSETS BUCKET
-- This removes read/delete access, allowing only uploads

-- Delete existing policies that allow read/delete access
DROP POLICY IF EXISTS "authenticated can upload to course-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can read course-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete from course-assets" ON storage.objects;

-- Create STRICT upload-only policy
-- Only authenticated users can INSERT (upload) files to course-assets bucket
-- Files must be in the 'courses/' folder structure
-- NO read or delete access allowed
CREATE POLICY "upload-only to course-assets" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'courses'  -- Ensures files go in courses/ folder
);