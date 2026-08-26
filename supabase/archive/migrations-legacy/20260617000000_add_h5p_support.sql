-- Migration: Add H5P support for lessons
-- Adds h5p_contents table and has_h5p flag to lessons

-- ── H5P Contents table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.h5p_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title text NOT NULL,
    embed_url text NOT NULL,
    source_url text,
    description text,
    width text DEFAULT '100%',
    height text DEFAULT '500px',
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.h5p_contents OWNER TO postgres;

-- Add has_h5p column to lessons
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS has_h5p boolean DEFAULT false;

-- RLS Policies
ALTER TABLE public.h5p_contents ENABLE ROW LEVEL SECURITY;

-- Educators can manage H5P content for their own course lessons
CREATE POLICY "educators_manage_h5p" ON public.h5p_contents
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = h5p_contents.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = h5p_contents.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

-- Learners can view H5P content for published/enrolled lessons
CREATE POLICY "learners_view_h5p" ON public.h5p_contents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.enrollments e ON e.course_id = l.course_id
            WHERE l.id = h5p_contents.lesson_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
        )
    );