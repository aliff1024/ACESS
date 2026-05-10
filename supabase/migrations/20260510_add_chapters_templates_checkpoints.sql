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
