// One-time setup script to create upload-only bucket
// Run this in browser console or as a one-time script

import { supabase } from './lib/supabase'

async function setupUploadOnlyBucket() {
  const STORAGE_BUCKET = 'course-assets'

  try {
    console.log('Setting up upload-only bucket...')

    // Delete existing bucket if it exists
    try {
      await supabase.storage.deleteBucket(STORAGE_BUCKET)
      console.log('✅ Deleted existing bucket')
    } catch (error) {
      console.log('ℹ️  Bucket deletion (expected if bucket doesn\'t exist):', error.message)
    }

    // Create new bucket with upload-only configuration
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false, // Files are NOT publicly accessible
      file_size_limit: 10485760, // 10MB limit
      allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    })

    if (createError) {
      console.error('❌ Bucket creation error:', createError)
      return
    }

    console.log('✅ Created upload-only bucket successfully')

    // Now apply the storage policies via SQL
    console.log('📝 Apply these SQL policies in your Supabase SQL Editor:')
    console.log(`
-- Delete existing policies
DROP POLICY IF EXISTS "authenticated can upload to course-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can read course-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete from course-assets" ON storage.objects;

-- Create upload-only policy
CREATE POLICY "upload-only to course-assets" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'courses'
);
    `)

  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Uncomment to run:
// setupUploadOnlyBucket()