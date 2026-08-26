-- Run in Supabase SQL Editor to add favorites functionality.
-- Enables learners to favorite/bookmark courses for later.

CREATE TABLE IF NOT EXISTS public.course_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_favorites_user ON public.course_favorites(user_id);

ALTER TABLE public.course_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own favorites"
    ON public.course_favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE public.course_favorites TO anon, authenticated, service_role;
