-- ==========================================
-- MISSING MIGRATIONS FOR SUPABASE DASHBOARD
-- (Safe to run: Uses IF NOT EXISTS)
-- ==========================================

-- MIGRATION: 20240618000000_achievements_assets.sql
-- =====================================================
-- MEDIA ASSETS
-- Global media library for educators and courses
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, -- Nullable, can be general asset
    
    file_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL, -- 'image', 'pdf', 'video'
    url VARCHAR NOT NULL,
    size_bytes BIGINT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.media_assets IS 'Global media library for users to reuse assets across the LMS.';

CREATE INDEX IF NOT EXISTS idx_media_assets_user ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON public.media_assets(file_type);

-- RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assets" ON public.media_assets;
CREATE POLICY "Users can view their own assets" ON public.media_assets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own assets" ON public.media_assets;
CREATE POLICY "Users can insert their own assets" ON public.media_assets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own assets" ON public.media_assets;
CREATE POLICY "Users can delete their own assets" ON public.media_assets FOR DELETE
    USING (auth.uid() = user_id);

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


-- =====================================================
-- ACHIEVEMENTS & MILESTONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.course_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    name VARCHAR NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR,
    
    requirement_type VARCHAR NOT NULL, -- 'progress', 'lesson', 'activity', 'quiz', 'streak', 'engagement'
    requirement_threshold INTEGER NOT NULL DEFAULT 1, -- e.g., 25 (%), 5 (lessons), 3 (days)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_req_type CHECK (
        requirement_type IN ('progress', 'lesson', 'activity', 'quiz', 'streak', 'engagement')
    )
);

COMMENT ON TABLE public.course_achievements IS 'Educator-defined achievements/badges for a specific course.';

CREATE INDEX IF NOT EXISTS idx_course_achievements_course ON public.course_achievements(course_id);

-- RLS
ALTER TABLE public.course_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course achievements" ON public.course_achievements;
CREATE POLICY "Anyone can view course achievements" ON public.course_achievements FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Educators can manage achievements for their courses" ON public.course_achievements;
CREATE POLICY "Educators can manage achievements for their courses" ON public.course_achievements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = course_achievements.course_id
            AND courses.created_by = auth.uid()
        )
    );


-- =====================================================
-- USER ACHIEVEMENTS
-- Tracks which users have earned which badges
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.course_achievements(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, achievement_id)
);

COMMENT ON TABLE public.user_achievements IS 'Tracks the achievements earned by learners.';

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_course ON public.user_achievements(course_id);

-- RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Educators can view achievements for their courses" ON public.user_achievements;
CREATE POLICY "Educators can view achievements for their courses" ON public.user_achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = user_achievements.course_id
            AND courses.created_by = auth.uid()
        )
    );

-- System handles inserts, so no direct user insert policy needed 
-- (unless learners can somehow trigger it client-side, but usually service role or function)
DROP POLICY IF EXISTS "Learners can insert achievements" ON public.user_achievements;
CREATE POLICY "Learners can insert achievements" ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- MIGRATION: 20260510_add_chapters_templates_checkpoints.sql
-- Enhanced system course features: chapters, lesson templates, milestones, checkpoints

-- ─── Course Chapters ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, sequence_order)
);

-- Add chapter_id FK to lessons if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE lessons ADD COLUMN chapter_id UUID REFERENCES course_chapters(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_chapters_course ON course_chapters(course_id);

-- ─── Lesson Templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'standard',
  content_html TEXT,
  estimated_duration INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Milestones (course-level) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  required_completion_pct INTEGER NOT NULL DEFAULT 100
    CHECK (required_completion_pct >= 0 AND required_completion_pct <= 100),
  icon TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_milestones_course ON course_milestones(course_id);

-- ─── Learner Milestone Progress ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS learner_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES course_milestones(id) ON DELETE CASCADE,
  achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_milestones_enrollment ON learner_milestones(enrollment_id);

-- ─── Course Checkpoints (lesson-level) ────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  checkpoint_type TEXT NOT NULL DEFAULT 'reflection'
    CHECK (checkpoint_type IN ('reflection', 'practice', 'quiz', 'activity', 'milestone')),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Learner Checkpoint Progress ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS learner_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES lesson_checkpoints(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_checkpoints_lesson ON lesson_checkpoints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learner_checkpoints_enrollment ON learner_checkpoints(enrollment_id);

-- ─── Course-level fields for enhanced features ────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'course_layout_type'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_layout_type TEXT NOT NULL DEFAULT 'standard'
      CHECK (course_layout_type IN ('standard', 'guided', 'simplified', 'focused'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'chapter_organization_enabled'
  ) THEN
    ALTER TABLE courses ADD COLUMN chapter_organization_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'learning_streaks_enabled'
  ) THEN
    ALTER TABLE courses ADD COLUMN learning_streaks_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'milestone_tracking_enabled'
  ) THEN
    ALTER TABLE courses ADD COLUMN milestone_tracking_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── Additional lesson fields ─────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'simplified_summary'
  ) THEN
    ALTER TABLE lessons ADD COLUMN simplified_summary TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'accessibility_notes'
  ) THEN
    ALTER TABLE lessons ADD COLUMN accessibility_notes TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'focus_mode_enabled'
  ) THEN
    ALTER TABLE lessons ADD COLUMN focus_mode_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'learning_objectives'
  ) THEN
    ALTER TABLE lessons ADD COLUMN learning_objectives TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'scheduled_release_at'
  ) THEN
    ALTER TABLE lessons ADD COLUMN scheduled_release_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Progress enhancements ────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'time_spent_learning'
  ) THEN
    ALTER TABLE lesson_progress ADD COLUMN time_spent_learning INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'assisted_learning_mode'
  ) THEN
    ALTER TABLE lesson_progress ADD COLUMN assisted_learning_mode BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── User Accessibility Preferences ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_accessibility_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_text_size TEXT DEFAULT 'medium',
  preferred_reading_mode TEXT DEFAULT 'standard',
  reduced_stimulation_mode BOOLEAN NOT NULL DEFAULT false,
  text_to_speech_enabled BOOLEAN NOT NULL DEFAULT false,
  simplified_navigation_enabled BOOLEAN NOT NULL DEFAULT false,
  dyslexia_friendly_font BOOLEAN NOT NULL DEFAULT false,
  focus_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_accessibility_prefs ON user_accessibility_preferences(user_id);


-- MIGRATION: 20260618_accessibility_engine.sql
-- Migration: Accessibility Engine — adaptive learning core
-- Adds: custom_notes on user_accessibility_settings
--       course_accessibility_categories (many-to-many)
--       lesson_templates (typed JSON structure)
--       adaptive_interactions (analytics)
--       course metadata booleans for fine-grained capability reporting

-- ══════════════════════════════════════════════════════════════════════════════
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
DROP POLICY IF EXISTS "authenticated_view_templates" ON public.accessibility_templates;
CREATE POLICY "authenticated_view_templates" ON public.accessibility_templates
  FOR SELECT TO authenticated USING (true);

-- Only admins manage templates
DROP POLICY IF EXISTS "admins_manage_templates" ON public.accessibility_templates;
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
DROP POLICY IF EXISTS "users_insert_own_interactions" ON public.adaptive_interactions;
CREATE POLICY "users_insert_own_interactions" ON public.adaptive_interactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own interactions
DROP POLICY IF EXISTS "users_view_own_interactions" ON public.adaptive_interactions;
DROP POLICY IF EXISTS "users_view_own_interactions" ON public.adaptive_interactions;
CREATE POLICY "users_view_own_interactions" ON public.adaptive_interactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Educators/admins can view analytics for their courses
DROP POLICY IF EXISTS "educators_view_course_interactions" ON public.adaptive_interactions;
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


-- MIGRATION: 20260625000000_add_age_group_to_users.sql
-- ============================================================================
-- Migration: Add age_group to learner_profiles
-- Used to drive Age-Based Adaptation in Accessibility Architecture Phase 11
-- ============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS age_group text;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_age_group_check
  CHECK (age_group IN ('6-12', '13-17', '18+'));

-- Default existing rows to adult/18+ if we don't know
UPDATE public.user_profiles
SET age_group = '18+'
WHERE age_group IS NULL;

COMMENT ON COLUMN public.user_profiles.age_group IS 'Learner age group: 6-12, 13-17, 18+, used for UI adaptations';


-- MIGRATION: 20260628000002_lesson_comments.sql
-- Create lesson_comments table
CREATE TABLE IF NOT EXISTS public.lesson_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Anyone can read comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.lesson_comments;
CREATE POLICY "Comments are viewable by everyone" ON public.lesson_comments
    FOR SELECT USING (true);

-- Authenticated users can insert their own comments
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.lesson_comments;
CREATE POLICY "Users can insert their own comments" ON public.lesson_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.lesson_comments;
CREATE POLICY "Users can update their own comments" ON public.lesson_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.lesson_comments;
CREATE POLICY "Users can delete their own comments" ON public.lesson_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_parent_id ON public.lesson_comments(parent_id);


-- MIGRATION: 20260628000003_content_versioning.sql
-- Create lesson_versions table
CREATE TABLE IF NOT EXISTS public.lesson_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content_html TEXT NOT NULL,
    version_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Only the course owner can view/manage lesson versions
DROP POLICY IF EXISTS "Educators can manage versions for their courses" ON public.lesson_versions;
CREATE POLICY "Educators can manage versions for their courses" ON public.lesson_versions
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM public.courses c
            JOIN public.lessons l ON l.course_id = c.id
            WHERE l.id = lesson_versions.lesson_id
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson_id ON public.lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_created_at ON public.lesson_versions(created_at);


-- MIGRATION: 20260701_add_is_completed_to_lesson_progress.sql
-- ============================================================================
-- Migration: Add is_completed to lesson_progress for course engagement analytics
-- ============================================================================
ALTER TABLE public.lesson_progress
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;

COMMENT ON COLUMN public.lesson_progress.is_completed IS 'Tracks whether the learner fully completed the lesson (not just viewed)';


-- MIGRATION: 20260702_add_educator_quiz_attempts_policy.sql
-- ============================================================================
-- Migration: Allow educators to view quiz attempts in their courses
-- ============================================================================
DROP POLICY IF EXISTS "Educators can view attempts in their courses" ON public.quiz_attempts;
CREATE POLICY "Educators can view attempts in their courses" ON public.quiz_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.id = quiz_attempts.enrollment_id
      AND c.created_by = auth.uid()
    )
  );


-- MIGRATION: 20260703_fix_learner_checkpoints_rls.sql
-- ============================================================================
-- Migration: Add RLS policies for learner_checkpoints (had RLS, zero policies)
-- ============================================================================
ALTER TABLE public.learner_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can manage their own checkpoints" ON public.learner_checkpoints;
CREATE POLICY "Learners can manage their own checkpoints" ON public.learner_checkpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = learner_checkpoints.enrollment_id
      AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = learner_checkpoints.enrollment_id
      AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Educators can view learner checkpoints in their courses" ON public.learner_checkpoints;
CREATE POLICY "Educators can view learner checkpoints in their courses" ON public.learner_checkpoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.id = learner_checkpoints.enrollment_id
      AND c.created_by = auth.uid()
    )
  );


-- MIGRATION: 20260704_fix_lesson_checkpoints_rls.sql
-- ============================================================================
-- Migration: Add RLS policies for lesson_checkpoints (had RLS, zero policies)
-- ============================================================================
ALTER TABLE public.lesson_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can manage lesson checkpoints" ON public.lesson_checkpoints;
CREATE POLICY "Educators can manage lesson checkpoints" ON public.lesson_checkpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_checkpoints.lesson_id
      AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_checkpoints.lesson_id
      AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Learners can view lesson checkpoints" ON public.lesson_checkpoints;
CREATE POLICY "Learners can view lesson checkpoints" ON public.lesson_checkpoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_checkpoints.lesson_id
      AND (c.status = 'published' OR c.created_by = auth.uid())
    )
  );


-- MIGRATION: 20260705_fix_recommendations_rls.sql
-- ============================================================================
-- Migration: Add RLS policy for recommendations (had RLS, zero policies)
-- ============================================================================
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their own recommendations" ON public.recommendations;
CREATE POLICY "Learners can view their own recommendations" ON public.recommendations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = recommendations.enrollment_id
      AND e.user_id = auth.uid()
    )
  );


-- MIGRATION: 20260706_create_h5p_responses_table.sql
-- ============================================================================
-- Migration: Create h5p_responses table (referenced in learner-api.ts but missing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.h5p_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    h5p_content_id UUID NOT NULL REFERENCES public.h5p_contents(id) ON DELETE CASCADE,
    score INTEGER,
    max_score INTEGER,
    completed BOOLEAN NOT NULL DEFAULT false,
    raw_statement JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.h5p_responses IS 'Tracks learner responses to H5P interactive content';

CREATE INDEX IF NOT EXISTS idx_h5p_responses_user ON public.h5p_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_h5p_responses_content ON public.h5p_responses(h5p_content_id);

ALTER TABLE public.h5p_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can insert their own h5p responses" ON public.h5p_responses;
CREATE POLICY "Learners can insert their own h5p responses" ON public.h5p_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners can view their own h5p responses" ON public.h5p_responses;
CREATE POLICY "Learners can view their own h5p responses" ON public.h5p_responses
  FOR SELECT
  USING (auth.uid() = user_id);

