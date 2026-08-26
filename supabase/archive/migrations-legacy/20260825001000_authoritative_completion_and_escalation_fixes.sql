-- ============================================================================
-- P0 SECURITY + THE AUTHORITATIVE COMPLETION MODEL
--
-- Found by scripts/audit/escalation-probe.ts during the post-audit hardening
-- pass (2026-08-25). Three escalation paths that the first audit missed,
-- all exploitable by any learner through the public anon key:
--
--   1. enrollments.status  — "Users can update their own enrollments"
--      is FOR UPDATE USING (auth.uid() = user_id) with no WITH CHECK and no
--      column restriction, so a learner could simply declare a course finished:
--          .from('enrollments').update({ status: 'completed' })
--      Confirmed ACCEPTED against the live database.
--
--   2. user_achievements   — "Learners can insert achievements" is
--      FOR INSERT WITH CHECK (auth.uid() = user_id), so a learner could award
--      themselves any badge in the catalogue. Confirmed ACCEPTED.
--
--   3. courses             — "Educators can insert courses" only checks
--      WITH CHECK (auth.uid() = created_by). The name says educators; the rule
--      says "anyone who names themselves as the author". A learner could
--      publish a course to the platform. Confirmed ACCEPTED.
--
-- THE UNDERLYING PROBLEM
--
-- All three are the same mistake: something that must be *derived from what
-- the learner actually did* was instead *asserted by the client*. The Learner
-- Portal speaks to PostgREST directly with the public anon key, so anything
-- the client asserts, a learner can assert.
--
-- This migration moves the derivation into the database. `sync_learner_course_state`
-- is now the single authoritative implementation of:
--
--     lesson completed  -> lesson_progress.is_completed  (set by completeLesson)
--     course completed  -> every published, visible lesson of the course has a
--                          completed progress row on this enrollment
--     achievement earned -> course_achievements criteria evaluated against that
--                          same completion data, server-side
--
-- The client calls it and reads the result; it can no longer write the answer.
--
-- ON "REQUIRED" LESSONS: the schema has no is_required / optional flag on
-- `lessons`. The only gates that exist are `status = 'published'` and
-- `visibility_status`. So "all required lessons" means "all published, visible
-- lessons", which is the same set every learner-facing percentage and the
-- certificate gate already divide by. If an optional-lesson concept is added
-- later, this function is the one place that needs to change.
--
-- RESIDUAL TRUST BOUNDARY (documented, not closed): a learner can still write
-- their own `lesson_progress` rows, because marking a lesson complete is a
-- legitimate client action and the requirements that gate it (video watched,
-- content scrolled) are client-side signals with no server-side equivalent.
-- Everything downstream of lesson_progress — course completion, achievements,
-- certificate eligibility — is now derived server-side from it, so a learner
-- can only ever over-report their own reading, not mint credentials.
-- ============================================================================

-- ─── The authoritative derivation ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_learner_course_state(p_course_id "uuid")
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_enrollment  record;
  v_total       integer;
  v_completed   integer;
  v_avg_score   integer;
  v_streak      integer := 0;
  v_progress    integer;
  v_ach         record;
  v_awarded     jsonb := '[]'::jsonb;
  v_now         timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments e
  WHERE e.user_id = v_user_id AND e.course_id = p_course_id AND e.status <> 'dropped'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('enrolled', false);
  END IF;

  -- Completion is counted over the SAME lesson set the learner-facing
  -- percentage divides by: published and visible. A progress row that outlives
  -- its lesson being unpublished must not count toward completion.
  SELECT count(*) INTO v_total
  FROM public.lessons l
  WHERE l.course_id = p_course_id
    AND l.status = 'published'
    AND (l.visibility_status = 'visible' OR l.visibility_status IS NULL);

  SELECT count(*) INTO v_completed
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.enrollment_id = v_enrollment.id
    AND lp.is_completed = true
    AND l.course_id = p_course_id
    AND l.status = 'published'
    AND (l.visibility_status = 'visible' OR l.visibility_status IS NULL);

  v_progress := CASE WHEN v_total > 0 THEN round((v_completed::numeric / v_total) * 100) ELSE 0 END;

  -- Course completion. Only ever moves forward: adding a lesson to a finished
  -- course must not retroactively un-complete a learner, or invalidate a
  -- certificate already issued against that completion.
  IF v_total > 0 AND v_completed >= v_total AND v_enrollment.status = 'active' THEN
    UPDATE public.enrollments
    SET status = 'completed', completed_at = COALESCE(completed_at, v_now)
    WHERE id = v_enrollment.id;
    v_enrollment.status := 'completed';
  END IF;

  -- Achievement criteria, evaluated here rather than in the browser.
  SELECT COALESCE(round(avg(qa.score_pct)), 0) INTO v_avg_score
  FROM public.quiz_attempts qa WHERE qa.enrollment_id = v_enrollment.id;

  SELECT count(DISTINCT d.day) INTO v_streak
  FROM (
    SELECT date_trunc('day', lp.last_viewed_at) AS day
    FROM public.lesson_progress lp
    WHERE lp.enrollment_id = v_enrollment.id AND lp.last_viewed_at IS NOT NULL
  ) d;

  FOR v_ach IN
    SELECT ca.* FROM public.course_achievements ca
    WHERE ca.course_id = p_course_id
      AND NOT EXISTS (
        SELECT 1 FROM public.user_achievements ua
        WHERE ua.user_id = v_user_id AND ua.achievement_id = ca.id
      )
  LOOP
    IF (v_ach.requirement_type = 'progress' AND v_progress   >= v_ach.requirement_threshold)
    OR (v_ach.requirement_type = 'lesson'   AND v_completed  >= v_ach.requirement_threshold)
    OR (v_ach.requirement_type = 'quiz'     AND v_avg_score  >= v_ach.requirement_threshold)
    OR (v_ach.requirement_type = 'streak'   AND v_streak     >= v_ach.requirement_threshold)
    THEN
      -- course_id was never populated by the old client-side engine, which left
      -- every badge unattributed to the course that granted it.
      INSERT INTO public.user_achievements (user_id, achievement_id, course_id, earned_at)
      VALUES (v_user_id, v_ach.id, p_course_id, v_now)
      ON CONFLICT DO NOTHING;
      v_awarded := v_awarded || jsonb_build_object('id', v_ach.id, 'name', v_ach.name);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'enrolled', true,
    'enrollment_id', v_enrollment.id,
    'status', v_enrollment.status,
    'lessons_total', v_total,
    'lessons_completed', v_completed,
    'progress_pct', v_progress,
    'avg_score', v_avg_score,
    'newly_awarded', v_awarded
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_learner_course_state("uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_learner_course_state("uuid") TO "authenticated", "service_role";

COMMENT ON FUNCTION public.sync_learner_course_state("uuid") IS
  'The single authoritative derivation of course completion and achievement eligibility from lesson_progress. Clients call this instead of writing enrollments.status or user_achievements directly.';

-- ─── Fix 1: a learner may not declare their own course complete ────────────
CREATE OR REPLACE FUNCTION public.guard_enrollment_status()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  jwt_claims text;
BEGIN
  jwt_claims := current_setting('request.jwt.claims', true);
  -- Direct SQL (migrations, seeds) and the service role are trusted paths.
  IF jwt_claims IS NULL OR jwt_claims = '' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- sync_learner_course_state() and the certificate endpoints run SECURITY
  -- DEFINER / service role and therefore never reach this branch.
  IF public.current_user_role() IN ('admin', 'educator') THEN
    RETURN NEW;
  END IF;

  -- Learners may drop and re-activate their own enrollment. They may not
  -- award themselves a completion, or backdate one.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'completed' THEN
    RAISE EXCEPTION 'Course completion is derived from lesson progress; call sync_learner_course_state()'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'completed_at is set by the system, not by the learner'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    RAISE EXCEPTION 'An enrollment cannot be reassigned' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "guard_enrollment_status" ON "public"."enrollments";
CREATE TRIGGER "guard_enrollment_status"
  BEFORE UPDATE ON "public"."enrollments"
  FOR EACH ROW EXECUTE FUNCTION public.guard_enrollment_status();

-- Also stop a learner from enrolling straight into a completed state.
DROP POLICY IF EXISTS "Users can enroll themselves" ON "public"."enrollments";
CREATE POLICY "Users can enroll themselves" ON "public"."enrollments"
  FOR INSERT TO "authenticated"
  WITH CHECK ("auth"."uid"() = "user_id" AND "status" <> 'completed' AND "completed_at" IS NULL);

-- ─── Fix 2: a learner may not award themselves a badge ─────────────────────
-- Awarding now happens inside sync_learner_course_state(), which is SECURITY
-- DEFINER and so bypasses this policy; the client no longer inserts at all.
DROP POLICY IF EXISTS "Learners can insert achievements" ON "public"."user_achievements";

COMMENT ON TABLE "public"."user_achievements" IS
  'Written only by public.sync_learner_course_state() (SECURITY DEFINER) or the service role. Direct client INSERT is deliberately not permitted: a learner could otherwise award themselves any badge in the catalogue.';

-- ─── Fix 3: only staff may author courses ──────────────────────────────────
DROP POLICY IF EXISTS "Educators can insert courses" ON "public"."courses";
CREATE POLICY "Educators can insert courses" ON "public"."courses"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "auth"."uid"() = "created_by"
    AND public.current_user_role() IN ('educator', 'admin')
  );
