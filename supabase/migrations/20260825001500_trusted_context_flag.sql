-- ============================================================================
-- Let the trusted derivation functions write past their own guards.
--
-- 20260825001000 and ...001100 added BEFORE-write triggers so a learner cannot
-- declare a course complete or forge a quiz score. Both triggers exempt the
-- service role and direct SQL, and assumed that was enough — but a
-- SECURITY DEFINER function called through PostgREST is neither. It runs with
-- the owner's *privileges*, while `request.jwt.claims` is still the learner's
-- and `auth.role()` is still 'authenticated', so the guards fired against the
-- very functions that are supposed to be doing the writing:
--
--     submit_quiz_attempt()        -> "Quiz results are graded by the server"
--     sync_learner_course_state()  -> "Course completion is derived from ..."
--
-- Caught by a live grading test. Fixed with an explicit, transaction-local
-- flag that only these functions set, so the guards can tell "this write came
-- from the trusted derivation path" from "a learner is writing directly".
-- set_config(..., true) scopes the flag to the current transaction, so it
-- cannot leak into a later request on a pooled connection.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_enrollment_status()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  jwt_claims text;
BEGIN
  IF current_setting('acess.trusted_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  jwt_claims := current_setting('request.jwt.claims', true);
  IF jwt_claims IS NULL OR jwt_claims = '' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.current_user_role() IN ('admin', 'educator') THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.guard_quiz_attempt_writes()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  jwt_claims text;
BEGIN
  IF current_setting('acess.trusted_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  jwt_claims := current_setting('request.jwt.claims', true);
  IF jwt_claims IS NULL OR jwt_claims = '' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.current_user_role() IN ('admin', 'educator') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Quiz results are graded by the server; use submit_quiz_attempt()'
    USING ERRCODE = '42501';
END;
$$;

-- ─── Re-declare the two trusted functions so they raise the flag ───────────
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id "uuid", p_answers "jsonb")
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_course_id    uuid;
  v_enrollment   record;
  v_quiz         record;
  v_total        integer;
  v_correct      integer := 0;
  v_score        integer;
  v_passed       boolean;
  v_attempt_no   integer;
  v_attempt_id   uuid;
  v_answer       jsonb;
  v_is_correct   boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT q.*, l.course_id INTO v_quiz
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE q.id = p_quiz_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found' USING ERRCODE = '22023';
  END IF;
  v_course_id := v_quiz.course_id;

  SELECT * INTO v_enrollment
  FROM public.enrollments e
  WHERE e.user_id = v_user_id AND e.course_id = v_course_id AND e.status <> 'dropped'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enrolled in this course' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1 INTO v_attempt_no
  FROM public.quiz_attempts
  WHERE enrollment_id = v_enrollment.id AND quiz_id = p_quiz_id;

  IF COALESCE(v_quiz.max_attempts, 0) > 0 AND v_attempt_no > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'No attempts remaining for this quiz' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('acess.trusted_write', 'on', true);

  v_total := jsonb_array_length(p_answers);

  INSERT INTO public.quiz_attempts (enrollment_id, quiz_id, attempt_number, score_pct, result, started_at, submitted_at)
  VALUES (v_enrollment.id, p_quiz_id, v_attempt_no, 0, 'fail', now(), now())
  RETURNING id INTO v_attempt_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    SELECT o.is_correct INTO v_is_correct
    FROM public.quiz_options o
    JOIN public.quiz_questions qq ON qq.id = o.question_id
    WHERE o.id = (v_answer->>'selectedOptionId')::uuid
      AND qq.id = (v_answer->>'questionId')::uuid
      AND qq.quiz_id = p_quiz_id;

    IF COALESCE(v_is_correct, false) THEN
      v_correct := v_correct + 1;
    END IF;

    INSERT INTO public.quiz_answers (attempt_id, question_id, selected_option_id)
    VALUES (v_attempt_id, (v_answer->>'questionId')::uuid, (v_answer->>'selectedOptionId')::uuid);
  END LOOP;

  v_score := CASE WHEN v_total > 0 THEN round((v_correct::numeric / v_total) * 100) ELSE 0 END;
  v_passed := v_score >= COALESCE(v_quiz.pass_threshold_pct, 80);

  UPDATE public.quiz_attempts
  SET score_pct = v_score, result = CASE WHEN v_passed THEN 'pass' ELSE 'fail' END
  WHERE id = v_attempt_id;

  PERFORM set_config('acess.trusted_write', 'off', true);

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_number', v_attempt_no,
    'score_pct', v_score,
    'correct', v_correct,
    'total', v_total,
    'passed', v_passed,
    'pass_threshold_pct', COALESCE(v_quiz.pass_threshold_pct, 80)
  );
END;
$$;

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

  IF v_total > 0 AND v_completed >= v_total AND v_enrollment.status = 'active' THEN
    PERFORM set_config('acess.trusted_write', 'on', true);
    UPDATE public.enrollments
    SET status = 'completed', completed_at = COALESCE(completed_at, v_now)
    WHERE id = v_enrollment.id;
    PERFORM set_config('acess.trusted_write', 'off', true);
    v_enrollment.status := 'completed';
  END IF;

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
