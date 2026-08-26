-- Migration: Add video_questions table for timestamped in-video questions
CREATE TABLE IF NOT EXISTS public.video_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title text NOT NULL,
    timestamp_seconds numeric NOT NULL,
    question_text text NOT NULL,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    correct_option_index integer NOT NULL DEFAULT 0,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.video_questions OWNER TO postgres;

-- RLS
ALTER TABLE public.video_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educators_manage_video_questions" ON public.video_questions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = video_questions.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = video_questions.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

CREATE POLICY "learners_view_video_questions" ON public.video_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.enrollments e ON e.course_id = l.course_id
            WHERE l.id = video_questions.lesson_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
        )
    );
