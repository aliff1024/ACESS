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
