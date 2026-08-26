-- Migration: Add native interactive activity content support
-- Creates lesson_interactive_content table for our own plug-and-play activity types
-- (flashcards, drag_drop, fill_blanks, memory_game, timeline)
-- Independent from the h5p_contents table (external embed model)

-- ── lesson_interactive_content table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_interactive_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content_type text NOT NULL,
    title text NOT NULL,
    content_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    accessibility_settings jsonb DEFAULT '{}'::jsonb,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.lesson_interactive_content OWNER TO postgres;

COMMENT ON TABLE public.lesson_interactive_content
  IS 'Native plug-and-play interactive activities for lessons — flashcards, drag_drop, fill_blanks, memory_game, timeline';

COMMENT ON COLUMN public.lesson_interactive_content.content_type
  IS 'Activity type: flashcards | drag_drop | fill_blanks | memory_game | timeline';

COMMENT ON COLUMN public.lesson_interactive_content.content_data
  IS 'JSON configuration specific to the activity type';

COMMENT ON COLUMN public.lesson_interactive_content.accessibility_settings
  IS 'Per-activity accessibility overrides: tts, reduced_motion, simplified_ui, etc.';

-- Index for fast lesson lookup
CREATE INDEX IF NOT EXISTS idx_interactive_content_lesson
  ON public.lesson_interactive_content (lesson_id);

-- RLS
ALTER TABLE public.lesson_interactive_content ENABLE ROW LEVEL SECURITY;

-- Educators can manage interactive content for their own course lessons
DROP POLICY IF EXISTS "educators_manage_interactive_content" ON public.lesson_interactive_content;
CREATE POLICY "educators_manage_interactive_content" ON public.lesson_interactive_content
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_interactive_content.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_interactive_content.lesson_id
            AND (c.created_by = auth.uid() OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

-- Learners can view interactive content for published lessons they are enrolled in
DROP POLICY IF EXISTS "learners_view_interactive_content" ON public.lesson_interactive_content;
CREATE POLICY "learners_view_interactive_content" ON public.lesson_interactive_content
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.enrollments e ON e.course_id = l.course_id
            WHERE l.id = lesson_interactive_content.lesson_id
            AND e.user_id = auth.uid()
            AND l.status = 'published'
        )
    );

-- Update trigger
CREATE OR REPLACE FUNCTION public.set_interactive_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_interactive_content_updated_at ON public.lesson_interactive_content;
CREATE TRIGGER set_interactive_content_updated_at
    BEFORE UPDATE ON public.lesson_interactive_content
    FOR EACH ROW
    EXECUTE FUNCTION public.set_interactive_content_updated_at();
