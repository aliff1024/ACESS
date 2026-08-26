-- Cached AI-generated lesson summaries (Gemini-powered lesson summary + Q&A
-- assistant). Distinct from public.learner_checkpoints, which stores
-- STUDENT-authored lesson summaries for an unrelated feature.
CREATE TABLE IF NOT EXISTS public.lesson_ai_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    suggested_questions TEXT[] DEFAULT '{}'::text[],
    source_content_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (lesson_id)
);

ALTER TABLE public.lesson_ai_summaries ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can already see the lesson (published course, or the
-- owning educator). Writes are performed only via a service-role client
-- inside the API route, so no INSERT/UPDATE policy is granted here.
CREATE POLICY "Users can view AI summaries for accessible lessons" ON public.lesson_ai_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_ai_summaries.lesson_id
              AND (c.status = 'published' OR c.created_by = auth.uid())
        )
    );

CREATE INDEX IF NOT EXISTS idx_lesson_ai_summaries_lesson_id ON public.lesson_ai_summaries(lesson_id);

-- NOTE: 20260628000003_content_versioning.sql has a pre-existing RLS policy on
-- lesson_versions that references courses.user_id, but the real column is
-- courses.created_by. Flagged here for visibility; not fixed by this migration.
