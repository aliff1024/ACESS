-- ============================================================================
-- Migration: Add Accessibility Presets System
-- Expands user_accessibility_settings with granular controls for the
-- Accessibility Presets feature (Reading, Focus, Sensory, Executive Function)
-- ============================================================================

-- ─── New Columns ───────────────────────────────────────────────────────────

-- Active preset identifier
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS active_preset text DEFAULT 'none';

-- Reading Preferences (granular controls)
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'arial';

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS font_size_px integer DEFAULT 16;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS line_spacing_multiplier numeric(3,2) DEFAULT 1.50;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS word_spacing_pct integer DEFAULT 0;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS background_tint text DEFAULT 'white';

-- Focus Preferences
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS reading_spotlight boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS distraction_free_mode boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS chunked_content_mode boolean DEFAULT false;

-- Sensory Preferences
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS animation_level text DEFAULT 'normal';

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS high_contrast boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS low_contrast boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS muted_colors boolean DEFAULT false;

-- Executive Function Supports (Phase 2 features)
ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS task_checklist_enabled boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS visual_schedule_enabled boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS step_by_step_enabled boolean DEFAULT false;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS auto_save_enabled boolean DEFAULT true;

ALTER TABLE public.user_accessibility_settings
  ADD COLUMN IF NOT EXISTS progress_timeline_enabled boolean DEFAULT false;

-- ─── Constraints ───────────────────────────────────────────────────────────

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_active_preset_check
  CHECK (active_preset IN ('none', 'dyslexia', 'adhd', 'autism', 'dyscalculia', 'custom'));

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_font_family_check
  CHECK (font_family IN ('arial', 'verdana', 'calibri', 'atkinson_hyperlegible', 'opendyslexic'));

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_font_size_px_check
  CHECK (font_size_px >= 12 AND font_size_px <= 24);

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_line_spacing_check_v2
  CHECK (line_spacing_multiplier >= 1.0 AND line_spacing_multiplier <= 2.0);

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_word_spacing_check
  CHECK (word_spacing_pct >= 0 AND word_spacing_pct <= 50);

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_background_tint_check
  CHECK (background_tint IN ('white', 'cream', 'pale_blue', 'soft_green', 'grey'));

ALTER TABLE public.user_accessibility_settings
  ADD CONSTRAINT user_accessibility_settings_animation_level_check
  CHECK (animation_level IN ('none', 'low', 'normal'));

-- ─── Data Migration: Convert existing enum values to granular values ───────

-- Migrate preferred_font_size enum → font_size_px
UPDATE public.user_accessibility_settings
SET font_size_px = CASE preferred_font_size
  WHEN 'small'  THEN 14
  WHEN 'medium' THEN 16
  WHEN 'large'  THEN 18
  WHEN 'xlarge' THEN 20
  ELSE 16
END
WHERE font_size_px = 16; -- only migrate rows that haven't been set yet

-- Migrate line_spacing enum → line_spacing_multiplier
UPDATE public.user_accessibility_settings
SET line_spacing_multiplier = CASE line_spacing
  WHEN 'normal'  THEN 1.50
  WHEN 'relaxed' THEN 1.80
  WHEN 'loose'   THEN 2.00
  ELSE 1.50
END
WHERE line_spacing_multiplier = 1.50;

-- Migrate preferred_font → font_family
UPDATE public.user_accessibility_settings
SET font_family = CASE preferred_font
  WHEN 'dyslexia'   THEN 'opendyslexic'
  WHEN 'sans_serif'  THEN 'arial'
  WHEN 'serif'       THEN 'arial'
  ELSE 'arial'
END
WHERE font_family = 'arial' AND preferred_font IS NOT NULL AND preferred_font != 'default';

-- Migrate disability_type → active_preset
UPDATE public.user_accessibility_settings
SET active_preset = CASE disability_type
  WHEN 'dyslexia'             THEN 'dyslexia'
  WHEN 'adhd'                 THEN 'adhd'
  WHEN 'asd'                  THEN 'autism'
  WHEN 'cognitive_impairment' THEN 'custom'
  WHEN 'visual_impairment'    THEN 'custom'
  WHEN 'hearing_impairment'   THEN 'custom'
  WHEN 'motor_impairment'     THEN 'custom'
  WHEN 'multiple_disabilities' THEN 'custom'
  ELSE 'none'
END
WHERE active_preset = 'none' AND disability_type IS NOT NULL AND disability_type != 'none';

-- Migrate reduced_motion → animation_level
UPDATE public.user_accessibility_settings
SET animation_level = 'none'
WHERE reduced_motion = true AND animation_level = 'normal';

-- Migrate high contrast theme → high_contrast boolean
UPDATE public.user_accessibility_settings
SET high_contrast = true
WHERE preferred_theme = 'high_contrast' AND high_contrast = false;

-- ─── Comments ──────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.user_accessibility_settings.active_preset IS 'Currently active accessibility preset: none, dyslexia, adhd, autism, dyscalculia, or custom';
COMMENT ON COLUMN public.user_accessibility_settings.font_family IS 'User-selected font: arial, verdana, calibri, atkinson_hyperlegible, opendyslexic';
COMMENT ON COLUMN public.user_accessibility_settings.font_size_px IS 'Font size in pixels (12-24)';
COMMENT ON COLUMN public.user_accessibility_settings.line_spacing_multiplier IS 'Line spacing multiplier (1.0-2.0)';
COMMENT ON COLUMN public.user_accessibility_settings.word_spacing_pct IS 'Additional word spacing as percentage (0-50)';
COMMENT ON COLUMN public.user_accessibility_settings.background_tint IS 'Background color tint: white, cream, pale_blue, soft_green, grey';
COMMENT ON COLUMN public.user_accessibility_settings.reading_spotlight IS 'Dim surrounding paragraphs to highlight current reading area';
COMMENT ON COLUMN public.user_accessibility_settings.distraction_free_mode IS 'Hide sidebar, widgets, and notifications for focused learning';
COMMENT ON COLUMN public.user_accessibility_settings.chunked_content_mode IS 'Display lesson content one section at a time';
COMMENT ON COLUMN public.user_accessibility_settings.animation_level IS 'UI animation level: none (instant), low (100ms), normal (standard)';
