-- ============================================================================
-- Correction to 20260825001100: max_attempts = 0 means UNLIMITED.
--
-- The server-side grading function guarded with
--     IF v_quiz.max_attempts IS NOT NULL AND v_attempt_no > v_quiz.max_attempts
-- which reads 0 as "zero attempts permitted" and rejected every submission
-- with "No attempts remaining for this quiz".
--
-- That is not this schema's convention. checkQuizAttempts() in
-- src/lib/learner-api.ts has always treated it as unlimited:
--     const max = quiz.max_attempts ?? 0
--     if (max <= 0) return { canAttempt: true, ... }
-- and every one of the 50 quizzes in the database has max_attempts = 0, with
-- learners holding many attempts against them. Caught by a live grading test
-- before this reached the UI.
-- ============================================================================

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

  -- 0 or NULL means unlimited, matching checkQuizAttempts() in learner-api.ts.
  IF COALESCE(v_quiz.max_attempts, 0) > 0 AND v_attempt_no > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'No attempts remaining for this quiz' USING ERRCODE = '42501';
  END IF;

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
