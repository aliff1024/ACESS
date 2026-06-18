-- ============================================================================
-- Migration: Add age_group to learner_profiles
-- Used to drive Age-Based Adaptation in Accessibility Architecture Phase 11
-- ============================================================================

ALTER TABLE public.learner_profiles
  ADD COLUMN IF NOT EXISTS age_group text;

ALTER TABLE public.learner_profiles
  ADD CONSTRAINT learner_profiles_age_group_check
  CHECK (age_group IN ('6-12', '13-17', '18+'));

-- Default existing rows to adult/18+ if we don't know
UPDATE public.learner_profiles
SET age_group = '18+'
WHERE age_group IS NULL;

COMMENT ON COLUMN public.learner_profiles.age_group IS 'Learner age group: 6-12, 13-17, 18+, used for UI adaptations';
