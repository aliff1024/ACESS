-- Add system/default course support columns to courses table

ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'educator'
  CHECK (course_type IN ('educator', 'system'));

ALTER TABLE courses ADD COLUMN IF NOT EXISTS system_course BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS built_in_course BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'educator'
  CHECK (created_by_role IN ('educator', 'admin'));

ALTER TABLE courses ADD COLUMN IF NOT EXISTS guided_learning_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS official_course_order INTEGER;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS managed_by_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS recommended_age_group TEXT;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_streaks_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS milestone_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

-- Update existing admin-created courses (if any) to have correct course_type
UPDATE courses
SET
  course_type = 'system',
  system_course = true,
  built_in_course = true,
  created_by_role = 'admin',
  managed_by_admin = true,
  guided_learning_enabled = true
WHERE created_by IN (
  SELECT id FROM users WHERE role = 'admin'
);

-- Add lesson-level fields for enhanced lesson management
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS simplified_summary TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS accessibility_notes TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS focus_mode_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chunked_content_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (lesson_type IN ('standard', 'video', 'quiz', 'practice', 'reading', 'assessment'));
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chapter_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS chapter_title TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS learning_objectives TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS scheduled_release_at TIMESTAMPTZ;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'visible'
  CHECK (visibility_status IN ('visible', 'hidden', 'scheduled'));
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS checkpoints_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS adaptive_learning_enabled BOOLEAN NOT NULL DEFAULT false;

-- Course-level accessibility enhancements
ALTER TABLE courses ADD COLUMN IF NOT EXISTS accessibility_mode_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_layout_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (course_layout_type IN ('standard', 'guided', 'simplified', 'focused'));
ALTER TABLE courses ADD COLUMN IF NOT EXISTS chapter_organization_enabled BOOLEAN NOT NULL DEFAULT false;

-- Progress-level enhancements
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS checkpoint_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS time_spent_learning INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS assisted_learning_mode BOOLEAN NOT NULL DEFAULT false;

-- User accessibility preferences
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

-- Chapters/modules table
CREATE TABLE IF NOT EXISTS course_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, sequence_order)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_system_course ON courses(system_course);
CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite ON lessons(prerequisite_lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_chapters_course ON course_chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_user_accessibility_prefs ON user_accessibility_preferences(user_id);
