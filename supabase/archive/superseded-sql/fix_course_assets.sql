DROP POLICY IF EXISTS "authenticated can upload to course-assets" ON storage.objects;
CREATE POLICY "authenticated can upload to course-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-assets');

DROP POLICY IF EXISTS "authenticated can update course-assets" ON storage.objects;
CREATE POLICY "authenticated can update course-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'course-assets');

DROP POLICY IF EXISTS "authenticated can delete from course-assets" ON storage.objects;
CREATE POLICY "authenticated can delete from course-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-assets');
