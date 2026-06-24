-- Fix: Missing RLS policy for media_assets
-- Learners cannot see lesson resources because the only SELECT policy
-- on media_assets restricts to auth.uid() = user_id (the uploader/educator).
-- This adds a policy for enrolled learners to read assets linked to lessons.

DROP POLICY IF EXISTS "Enrolled learners can read lesson assets" ON public.media_assets;
CREATE POLICY "Enrolled learners can read lesson assets" ON public.media_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            JOIN public.enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()
            WHERE l.id = media_assets.lesson_id
            AND e.status != 'dropped'
        )
    );
