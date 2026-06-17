-- Migration: Accessibility Engine — adaptive learning core
-- Adds: custom_notes on user_accessibility_settings
--       course_accessibility_categories (many-to-many)
--       lesson_templates (typed JSON structure)
--       adaptive_interactions (analytics)
--       course metadata booleans for fine-grained capability reporting

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Custom notes on user accessibility settings (for "Other" disability)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.user_accessibility_settings
ADD COLUMN IF NOT EXISTS custom_notes text;

COMMENT ON COLUMN public.user_accessibility_settings.custom_notes
  IS 'Free-text notes for "Other" disability type — future-proofs against unlisted accessibility needs';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Course accessibility categories (many-to-many)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.course_accessibility_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    accessibility_category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.course_accessibility_categories OWNER TO postgres;

COMMENT ON TABLE public.course_accessibility_categories
  IS 'Many-to-many: courses can support multiple accessibility categories';

COMMENT ON COLUMN public.course_accessibility_categories.accessibility_category
  IS 'One of: cognitive, adhd, dyslexia, asd, visual, hearing, motor';

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_access_cat_unique
  ON public.course_accessibility_categories(course_id, accessibility_category);

ALTER TABLE public.course_accessibility_categories ENABLE ROW LEVEL SECURITY;

-- Educators can manage categories for their own courses (admin too)
DROP POLICY IF EXISTS "educators_manage_course_access_cats" ON public.course_accessibility_categories;
CREATE POLICY "educators_manage_course_access_cats" ON public.course_accessibility_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_accessibility_categories.course_id
      AND (c.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_accessibility_categories.course_id
      AND (c.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- Learners can read categories for any visible course
DROP POLICY IF EXISTS "learners_view_course_access_cats" ON public.course_accessibility_categories;
CREATE POLICY "learners_view_course_access_cats" ON public.course_accessibility_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_accessibility_categories.course_id
      AND (c.status = 'published' OR c.created_by = auth.uid())
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Course-level adaptation metadata booleans
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS supports_tts boolean DEFAULT false;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS supports_transcripts boolean DEFAULT false;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS supports_focus_mode boolean DEFAULT false;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS supports_chunked_learning boolean DEFAULT false;

COMMENT ON COLUMN public.courses.supports_tts
  IS 'Course provides text-to-speech support for lessons';
COMMENT ON COLUMN public.courses.supports_transcripts
  IS 'Course provides video/audio transcripts';
COMMENT ON COLUMN public.courses.supports_focus_mode
  IS 'Course supports focus mode (minimal distractions)';
COMMENT ON COLUMN public.courses.supports_chunked_learning
  IS 'Course supports chunked/sectioned content navigation';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Lesson templates (typed JSON, not raw HTML)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.accessibility_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    target_disability text NOT NULL,
    content_structure jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.accessibility_templates OWNER TO postgres;

COMMENT ON TABLE public.accessibility_templates
  IS 'Predefined lesson structure templates keyed to disability types';

COMMENT ON COLUMN public.accessibility_templates.content_structure
  IS 'JSON array of typed sections: [{"type":"learning_objective","required":true,"label":"Learning Objective"}, ...]';

ALTER TABLE public.accessibility_templates ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read templates
DROP POLICY IF EXISTS "authenticated_view_templates" ON public.accessibility_templates;
CREATE POLICY "authenticated_view_templates" ON public.accessibility_templates
  FOR SELECT TO authenticated USING (true);

-- Only admins manage templates
DROP POLICY IF EXISTS "admins_manage_templates" ON public.accessibility_templates;
CREATE POLICY "admins_manage_templates" ON public.accessibility_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Seed default templates (idempotent — skip if already seeded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accessibility_templates LIMIT 1) THEN
    INSERT INTO public.accessibility_templates (name, description, target_disability, content_structure) VALUES
    (
      'Cognitive Learning Template',
      'Simplified language, step-by-step flow, reduced distractions. Best for learners with cognitive impairments.',
      'cognitive_impairment',
      '[
        {"type":"learning_objective","required":true,"label":"Learning Objective"},
        {"type":"simple_explanation","required":true,"label":"Simple Explanation"},
        {"type":"visual_example","required":true,"label":"Visual Example"},
        {"type":"interactive_activity","required":true,"label":"Interactive Activity"},
        {"type":"knowledge_check","required":true,"label":"Quick Knowledge Check"},
        {"type":"summary","required":true,"label":"Summary"}
      ]'::jsonb
    ),
    (
      'ADHD Learning Template',
      'Short segments, progress indicators, interactive checkpoints. Best for learners with ADHD.',
      'adhd',
      '[
        {"type":"learning_objective","required":true,"label":"Learning Objective"},
        {"type":"micro_lesson","required":true,"label":"Micro-Lesson"},
        {"type":"interactive_activity","required":true,"label":"Interactive Activity"},
        {"type":"progress_checkpoint","required":true,"label":"Progress Checkpoint"},
        {"type":"summary","required":true,"label":"Summary"}
      ]'::jsonb
    ),
    (
      'ASD Learning Template',
      'Predictable structure, visual schedule, step-by-step instructions. Best for learners with Autism Spectrum Disorder.',
      'asd',
      '[
        {"type":"learning_objective","required":true,"label":"Learning Objective"},
        {"type":"visual_schedule","required":false,"label":"Visual Schedule"},
        {"type":"step_by_step","required":true,"label":"Step-by-Step Instruction"},
        {"type":"example","required":true,"label":"Example"},
        {"type":"activity","required":true,"label":"Activity"},
        {"type":"summary","required":true,"label":"Summary"}
      ]'::jsonb
    ),
    (
      'Visual Accessibility Template',
      'Audio-first presentation with text transcript. Best for learners with visual impairments.',
      'visual_impairment',
      '[
        {"type":"audio_explanation","required":true,"label":"Audio Explanation"},
        {"type":"text_transcript","required":true,"label":"Text Transcript"},
        {"type":"interactive_activity","required":true,"label":"Interactive Activity"},
        {"type":"summary","required":true,"label":"Summary"}
      ]'::jsonb
    );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Adaptive interactions analytics
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.adaptive_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
    course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
    adaptation_used text NOT NULL,
    session_id text,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.adaptive_interactions OWNER TO postgres;

COMMENT ON TABLE public.adaptive_interactions
  IS 'Analytics: tracks which accessibility adaptations learners actually use — enables data-driven reporting';

COMMENT ON COLUMN public.adaptive_interactions.adaptation_used
  IS 'tts | focus_mode | chunked_content | simplified_summary | captions | slideshow | guided_mode';

ALTER TABLE public.adaptive_interactions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own interactions
DROP POLICY IF EXISTS "users_insert_own_interactions" ON public.adaptive_interactions;
CREATE POLICY "users_insert_own_interactions" ON public.adaptive_interactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own interactions
DROP POLICY IF EXISTS "users_view_own_interactions" ON public.adaptive_interactions;
CREATE POLICY "users_view_own_interactions" ON public.adaptive_interactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Educators/admins can view analytics for their courses
DROP POLICY IF EXISTS "educators_view_course_interactions" ON public.adaptive_interactions;
CREATE POLICY "educators_view_course_interactions" ON public.adaptive_interactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = adaptive_interactions.course_id
      AND (c.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Interactive activity type placeholder on lessons (forward-compat)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS interactive_activity_type text;

COMMENT ON COLUMN public.lessons.interactive_activity_type
  IS 'Placeholder for future interactive activity types: h5p, drag_drop, flashcards, branching_scenario, interactive_presentation';
