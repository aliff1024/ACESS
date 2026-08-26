-- ============================================================================
-- ACESS storage configuration
--
-- Three buckets, matching what the application actually uses:
--   course-assets  src/lib/educator-api.ts  (STORAGE_BUCKET) — lesson media
--   certificates   src/lib/educator-api.ts  (uploadEducatorCustomCertificate)
--   avatars        src/components/profile/ProfileDialog.tsx  — profile pictures
--
-- All three are public-read because the app hands out getPublicUrl() links
-- that are rendered in <img>/<a> tags. Writes are restricted.
--
-- (The historical 'course-files' bucket from the root fix_storage.sql is not
--  referenced anywhere in the codebase and is deliberately not recreated.)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-assets', 'course-assets', true),
       ('certificates',  'certificates',  true),
       ('avatars',       'avatars',       true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ─── Public read ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "acess_public_read" ON storage.objects;
CREATE POLICY "acess_public_read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('course-assets', 'certificates', 'avatars'));

-- ─── Avatars: a learner may only write inside their own {uid}/ folder ──────
DROP POLICY IF EXISTS "acess_avatar_write" ON storage.objects;
CREATE POLICY "acess_avatar_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "acess_avatar_update" ON storage.objects;
CREATE POLICY "acess_avatar_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "acess_avatar_delete" ON storage.objects;
CREATE POLICY "acess_avatar_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─── Course assets & certificates: educators and admins only ──────────────
DROP POLICY IF EXISTS "acess_staff_write" ON storage.objects;
CREATE POLICY "acess_staff_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('course-assets', 'certificates')
    AND public.current_user_role() IN ('educator', 'admin')
  );

DROP POLICY IF EXISTS "acess_staff_update" ON storage.objects;
CREATE POLICY "acess_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('course-assets', 'certificates')
    AND public.current_user_role() IN ('educator', 'admin')
  );

DROP POLICY IF EXISTS "acess_staff_delete" ON storage.objects;
CREATE POLICY "acess_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('course-assets', 'certificates')
    AND public.current_user_role() IN ('educator', 'admin')
  );
