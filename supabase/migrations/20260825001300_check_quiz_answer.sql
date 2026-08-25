-- ============================================================================
-- Keep adaptive in-quiz feedback working now that the answer key is hidden.
--
-- 20260825001200 stopped serving quiz_options.is_correct to a learner before
-- they have attempted the quiz. That closed the answer-key hole, but it also
-- silently disabled the adaptive-learning hint in QuizPage, which compared the
-- chosen option against is_correct in the browser to decide whether to offer a
-- "that wasn't quite right, review this section" prompt. With the key withheld
-- the comparison always evaluated to "not wrong", so the hint never fired.
--
-- This function answers the narrow question the hint actually needs — "was the
-- option I just picked correct?" — without revealing which option is. A
-- learner can only ask about a choice they have already made, and only for a
-- course they are enrolled in.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id "uuid", p_option_id "uuid")
RETURNS boolean
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_is_correct boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT l.course_id INTO v_course_id
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE qq.id = p_question_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = v_user_id AND e.course_id = v_course_id AND e.status <> 'dropped'
  ) AND public.current_user_role() NOT IN ('admin', 'educator') THEN
    RAISE EXCEPTION 'Not enrolled in this course' USING ERRCODE = '42501';
  END IF;

  SELECT o.is_correct INTO v_is_correct
  FROM public.quiz_options o
  WHERE o.id = p_option_id AND o.question_id = p_question_id;

  RETURN COALESCE(v_is_correct, false);
END;
$$;

REVOKE ALL ON FUNCTION public.check_quiz_answer("uuid", "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer("uuid", "uuid") TO "authenticated", "service_role";

COMMENT ON FUNCTION public.check_quiz_answer("uuid", "uuid") IS
  'Validates one already-made choice without revealing the answer key. Used by the adaptive-learning hint during a quiz.';
