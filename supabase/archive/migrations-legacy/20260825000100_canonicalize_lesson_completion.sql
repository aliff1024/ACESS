-- ============================================================================
-- P1 DATA INTEGRITY — one definition of "lesson completed"
--
-- Found during the Learner Portal audit (2026-08-25).
--
-- `lesson_progress` carries two flags, and the codebase had split into two
-- camps about which one means "done":
--
--   * The LEARNER portal (src/lib/learner-api.ts) counted `is_viewed` as
--     completion at all seven of its read sites — dashboard stats, course
--     cards, course detail, progress page, and certificate eligibility —
--     and its own completeLesson() wrote `is_viewed = true` and never
--     touched `is_completed`.
--   * ADMIN analytics (src/lib/admin-analytics.ts) and EDUCATOR analytics
--     (src/lib/educator-analytics-api.ts) count `is_completed`, and
--     explicitly model the difference as a "skipped" metric:
--         skipped = is_viewed && !is_completed
--
-- So the same enrollment read 100% complete to the learner and 40% complete
-- to their educator. Observed live for learner@acess.demo / "Animal
-- Adventures": learner dashboard "10/10 Done, 100%", database 4 of 10
-- published lessons with is_completed.
--
-- Resolution: `is_completed` is canonical. It is what two of the three
-- consumers already use, it is what the column is named, and it is what makes
-- the "skipped" metric mean anything. The learner portal is the outlier and
-- is corrected in the same change as this migration.
--
-- THE BACKFILL
-- Distribution across all 137 rows before this migration:
--
--   98  viewed=true  completed=true   summary=false   -> seeded completions
--   24  viewed=true  completed=false  summary=false   -> seeded partial progress
--   13  viewed=true  completed=false  summary=true    -> REAL completions made
--                                                        through the app UI
--    2  viewed=false completed=false  summary=false   -> opened, nothing else
--
-- The 13 rows are unambiguous: completeLesson() is the only code in the
-- codebase that sets `summary_completed = true`, and it sets it together with
-- `is_viewed = true`. They are genuine learner completions that the analytics
-- side has been counting as "skipped" ever since. They are promoted to
-- is_completed here so no learner loses credit for work they actually did.
--
-- The 24 seeded viewed-only rows are deliberately NOT promoted — those are
-- partial progress, and promoting them is what was inflating the learner's
-- numbers in the first place.
--
-- There are zero rows with is_completed = true and is_viewed = false, so the
-- "completed implies viewed" invariant already holds and is asserted below.
-- ============================================================================

-- Promote genuine UI completions.
UPDATE "public"."lesson_progress"
SET "is_completed" = true
WHERE "is_viewed" = true
  AND "summary_completed" = true
  AND "is_completed" IS DISTINCT FROM true;

-- Anything completed has, by definition, been viewed. Keeps the educator
-- "skipped" metric (viewed AND NOT completed) from ever going negative.
UPDATE "public"."lesson_progress"
SET "is_viewed" = true
WHERE "is_completed" = true
  AND "is_viewed" IS DISTINCT FROM true;

-- Neither flag should ever be NULL; the learner code now filters on
-- is_completed and a NULL would silently drop the row from every count.
UPDATE "public"."lesson_progress" SET "is_completed" = false WHERE "is_completed" IS NULL;
UPDATE "public"."lesson_progress" SET "is_viewed" = false WHERE "is_viewed" IS NULL;

ALTER TABLE "public"."lesson_progress"
  ALTER COLUMN "is_completed" SET DEFAULT false,
  ALTER COLUMN "is_viewed" SET DEFAULT false;

-- Enforce the invariant from here on, so the two flags can never drift back
-- into the contradictory state this migration just cleaned up.
ALTER TABLE "public"."lesson_progress"
  DROP CONSTRAINT IF EXISTS "lesson_progress_completed_implies_viewed";
ALTER TABLE "public"."lesson_progress"
  ADD CONSTRAINT "lesson_progress_completed_implies_viewed"
  CHECK ("is_completed" IS NOT TRUE OR "is_viewed" IS TRUE);

COMMENT ON COLUMN "public"."lesson_progress"."is_viewed" IS
  'The learner opened this lesson. Set by trackLessonView().';
COMMENT ON COLUMN "public"."lesson_progress"."is_completed" IS
  'Canonical completion flag. Set by completeLesson(). All progress percentages, course completion and certificate eligibility are computed from this column.';
