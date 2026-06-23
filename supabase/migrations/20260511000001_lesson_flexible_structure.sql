-- Flexible Lesson Components
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS has_video boolean DEFAULT true;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS has_pdf boolean DEFAULT true;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS has_quiz boolean DEFAULT true;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS has_transcript boolean DEFAULT true;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS has_summary_activity boolean DEFAULT false;

-- Summary Activity Settings
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_source text DEFAULT 'entire_lesson'
  CHECK (summary_source IN ('video', 'pdf', 'lesson_text', 'entire_lesson'));
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_word_target integer DEFAULT 100;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_key_points jsonb DEFAULT '[]';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_reflection_questions jsonb DEFAULT '[]';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_ai_feedback_enabled boolean DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_layout text DEFAULT 'standard'
  CHECK (lesson_layout IN ('standard', 'focus', 'two_column', 'wide'));

-- Student Summaries
CREATE TABLE IF NOT EXISTS public.lesson_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  ai_feedback TEXT,
  educator_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_summaries_lesson ON public.lesson_summaries(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_summaries_user ON public.lesson_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_summaries_enrollment ON public.lesson_summaries(enrollment_id);

ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own summaries"
  ON public.lesson_summaries
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Lesson progress: add summary_completed flag
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS summary_completed boolean DEFAULT false;
