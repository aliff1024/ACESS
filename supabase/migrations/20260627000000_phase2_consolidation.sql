-- Phase 2 Consolidation (Users, Courses, Certificates)

BEGIN;

-- 1. Users & Auth Consolidation
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS accessibility_prefs jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;

-- Port User Accessibility Settings
UPDATE public.user_profiles up
SET accessibility_prefs = to_jsonb(uas)
FROM public.user_accessibility_settings uas
WHERE up.user_id = uas.user_id;

-- Port User Notification Settings
UPDATE public.user_profiles up
SET notification_prefs = to_jsonb(uns)
FROM public.user_notification_settings uns
WHERE up.user_id = uns.user_id;

-- 2. Course Metadata Consolidation
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS accessibility_categories text[] DEFAULT '{}';

-- Port Course Tags
WITH tags_agg AS (
    SELECT course_id, array_agg(tag) as tags_arr
    FROM public.course_tags
    GROUP BY course_id
)
UPDATE public.courses c
SET tags = t.tags_arr
FROM tags_agg t
WHERE c.id = t.course_id;

-- Port Accessibility Categories
WITH acc_agg AS (
    SELECT course_id, array_agg(accessibility_category) as acc_arr
    FROM public.course_accessibility_categories
    GROUP BY course_id
)
UPDATE public.courses c
SET accessibility_categories = a.acc_arr
FROM acc_agg a
WHERE c.id = a.course_id;

-- 3. Certificates
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone;

COMMIT;
