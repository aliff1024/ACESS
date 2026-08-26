-- Phase 1: Database Migration Scripts (Consolidation)

BEGIN;

-- 1. Add missing columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS learning_goals text,
ADD COLUMN IF NOT EXISTS onboarded_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS disability_type character varying;

-- Port data from learner_profiles to user_profiles
UPDATE public.user_profiles up
SET 
  learning_goals = lp.learning_goals,
  onboarded_at = lp.onboarded_at,
  disability_type = lp.disability_type
FROM public.learner_profiles lp
WHERE up.user_id = lp.user_id;

-- 2. Add JSONB response data to learner_checkpoints
ALTER TABLE public.learner_checkpoints
ADD COLUMN IF NOT EXISTS response_data jsonb,
ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Make checkpoint_id nullable so we can store generic summaries without a hardcoded checkpoint definition
ALTER TABLE public.learner_checkpoints
ALTER COLUMN checkpoint_id DROP NOT NULL;

-- Port data from lesson_summaries to learner_checkpoints
INSERT INTO public.learner_checkpoints (enrollment_id, lesson_id, completed, completed_at, created_at, response_data)
SELECT 
  enrollment_id, 
  lesson_id, 
  (status = 'submitted' OR status = 'reviewed'), 
  submitted_at, 
  created_at, 
  jsonb_build_object(
    'content', content,
    'word_count', word_count,
    'status', status,
    'ai_feedback', ai_feedback,
    'educator_feedback', educator_feedback
  )
FROM public.lesson_summaries;

-- 3. Consolidate lesson_assets into media_assets
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title character varying;

-- Port data from lesson_assets to media_assets
INSERT INTO public.media_assets (user_id, course_id, lesson_id, title, file_name, file_type, url, size_bytes, created_at)
SELECT 
  (SELECT c.created_by FROM public.courses c JOIN public.lessons l ON l.course_id = c.id WHERE l.id = la.lesson_id LIMIT 1) as user_id, 
  (SELECT l.course_id FROM public.lessons l WHERE l.id = la.lesson_id LIMIT 1) as course_id, 
  la.lesson_id, 
  la.title, 
  COALESCE(la.title, 'lesson_asset') as file_name, 
  la.kind as file_type, 
  la.url as url, 
  0 as size_bytes, 
  la.created_at
FROM public.lesson_assets la;

COMMIT;
