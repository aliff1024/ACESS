CREATE TABLE IF NOT EXISTS public.course_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  requirement_type TEXT DEFAULT 'progress',
  requirement_threshold INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.course_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course achievements are viewable by everyone." ON public.course_achievements;
CREATE POLICY "Course achievements are viewable by everyone."
  ON public.course_achievements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Educators can manage their own course achievements." ON public.course_achievements;
CREATE POLICY "Educators can manage their own course achievements."
  ON public.course_achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_achievements.course_id
      AND courses.created_by = auth.uid()
    )
  );
