-- ============================================================================
-- P1 DATA INTEGRITY — enrollments finished but never marked complete
--
-- Companion to 20260825000100_canonicalize_lesson_completion.sql.
--
-- Nothing in the product derived course completion from lesson completion.
-- The only three writers of `enrollments.status = 'completed'` were the
-- certificate endpoints:
--     src/app/api/certificates/claim/route.ts
--     src/app/api/certificates/custom/route.ts
--     src/app/api/educator/certificates/issue/route.ts
--
-- So completion was a side-effect of claiming a certificate. A learner who
-- finished every lesson of a course that has certificates disabled — or who
-- simply hadn't claimed one — stayed `active` forever. Observed live for
-- learner@acess.demo: the dashboard showed "Lets learn about animal 5/5,
-- 100%" and "Animal Adventures 10/10, 100%" while the "Courses Completed"
-- tile read 1.
--
-- learner-api.ts now calls syncEnrollmentCompletion() from completeLesson(),
-- which closes the gap going forward. This migration closes it for the
-- enrollments that are already finished.
--
-- Scope is deliberately narrow: an enrollment is promoted only when EVERY
-- published, visible lesson of its course has an is_completed progress row.
-- Courses with no published lessons are excluded — "0 of 0" is not a
-- completion. Nothing is ever demoted.
-- ============================================================================

UPDATE "public"."enrollments" e
SET "status" = 'completed',
    "completed_at" = COALESCE(e."completed_at", now())
WHERE e."status" = 'active'
  AND EXISTS (
    SELECT 1 FROM "public"."lessons" l
    WHERE l."course_id" = e."course_id"
      AND l."status" = 'published'
      AND (l."visibility_status" = 'visible' OR l."visibility_status" IS NULL)
  )
  AND NOT EXISTS (
    -- any published lesson without a completed progress row on this enrollment
    SELECT 1
    FROM "public"."lessons" l
    WHERE l."course_id" = e."course_id"
      AND l."status" = 'published'
      AND (l."visibility_status" = 'visible' OR l."visibility_status" IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM "public"."lesson_progress" lp
        WHERE lp."enrollment_id" = e."id"
          AND lp."lesson_id" = l."id"
          AND lp."is_completed" = true
      )
  );
