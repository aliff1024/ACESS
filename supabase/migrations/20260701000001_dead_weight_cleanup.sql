-- MIGRATION: 20260701000001_dead_weight_cleanup.sql
-- DESCRIPTION: Drops 4 entirely unused tables to optimize database structure.

-- Drop unused H5P tracking tables (application uses direct storage zip parsing instead)
DROP TABLE IF EXISTS public.h5p_responses CASCADE;
DROP TABLE IF EXISTS public.h5p_contents CASCADE;

-- Drop unused accessibility preferences (application uses localStorage exclusively)
DROP TABLE IF EXISTS public.user_accessibility_preferences CASCADE;

-- Drop unused learner milestones (application dynamically calculates progress via lesson_progress and quiz_attempts)
DROP TABLE IF EXISTS public.learner_milestones CASCADE;
