-- Fixes a race condition in submit_quiz_attempt() flagged during load
-- testing (docs/testing-report.md, 2026-09-03): attempt_number was computed
-- with a plain `SELECT COALESCE(max(attempt_number), 0) + 1` and then
-- inserted, with no lock in between. Two truly concurrent submissions for
-- the same (enrollment_id, quiz_id) — a double-click, or the same account
-- open in two tabs — could both read the same max() and then race to
-- insert the same attempt_number, and the loser would fail with a raw
-- unique-constraint violation (quiz_attempts_enrollment_id_quiz_id_attempt_number_key)
-- instead of being correctly assigned the next number.
--
-- Fixed with pg_advisory_xact_lock: every call takes a transaction-scoped
-- lock keyed on (enrollment_id, quiz_id) before computing the next
-- attempt_number, so a second concurrent call for the same pair blocks
-- until the first call's transaction commits (or rolls back) rather than
-- racing it. The lock is released automatically at the end of the
-- function's implicit transaction (each PostgREST RPC call is its own
-- transaction) — no explicit unlock needed, and unrelated (enrollment_id,
-- quiz_id) pairs never contend with each other since hashtextextended
-- gives each pair its own lock key.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Serialize concurrent submissions for this exact (enrollment, quiz) pair.
  -- A concurrent call for a DIFFERENT enrollment or quiz gets a different
  -- lock key and never waits on this one.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_enrollment.id::text || ':' || p_quiz_id::text, 0));

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
$function$;
