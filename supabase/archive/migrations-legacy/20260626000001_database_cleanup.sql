-- Phase 3: Database Cleanup
-- Run this migration ONLY AFTER codebase has been updated and deployed.

BEGIN;

-- Drop redundant auth/custom token tables
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;

-- Drop redundant tracking tables (consolidated into learner_checkpoints)
DROP TABLE IF EXISTS public.lesson_summaries CASCADE;

-- Drop redundant profile/accessibility tables (consolidated into user_profiles)
DROP TABLE IF EXISTS public.learner_profiles CASCADE;
DROP TABLE IF EXISTS public.user_accessibility_preferences CASCADE;

-- Drop redundant asset tracking (consolidated into media_assets)
DROP TABLE IF EXISTS public.lesson_assets CASCADE;

-- Drop entirely unused tables
DROP TABLE IF EXISTS public.course_achievements CASCADE;
DROP TABLE IF EXISTS public.user_achievements CASCADE;

-- Drop unused granular H5P tables
DROP TABLE IF EXISTS public.h5p_content_dependencies CASCADE;
DROP TABLE IF EXISTS public.h5p_libraries CASCADE;
DROP TABLE IF EXISTS public.h5p_library_dependencies CASCADE;
DROP TABLE IF EXISTS public.h5p_user_data CASCADE;

COMMIT;
