-- Phase 2 Database Cleanup

BEGIN;

DROP TABLE IF EXISTS public.user_accessibility_settings CASCADE;
DROP TABLE IF EXISTS public.user_notification_settings CASCADE;
DROP TABLE IF EXISTS public.course_tags CASCADE;
DROP TABLE IF EXISTS public.course_accessibility_categories CASCADE;
DROP TABLE IF EXISTS public.course_milestones CASCADE;
DROP TABLE IF EXISTS public.learner_milestones CASCADE;
DROP TABLE IF EXISTS public.certificate_verifications CASCADE;
DROP TABLE IF EXISTS public.accessibility_templates CASCADE;
DROP TABLE IF EXISTS public.lesson_templates CASCADE;

COMMIT;
