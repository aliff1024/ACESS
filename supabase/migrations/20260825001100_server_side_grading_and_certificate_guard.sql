-- ============================================================================
-- P0 — assessment integrity and certificate issuance
--
-- Two more findings from scripts/audit/escalation-probe.ts (2026-08-25).
--
-- 1. SELF-ISSUED CERTIFICATES
--    `certificates_insert_policy` is WITH CHECK (auth.uid() = user_id OR
--    caller is admin). So a learner could insert their own certificate row
--    with status = 'issued' for a course they had not finished. Confirmed
--    ACCEPTED against the live database. (It looked blocked in an earlier run
--    only because the probe reused a reference_code and hit a unique-key
--    violation — a coincidence, not a control.)
--
--    Certificates are supposed to come from /api/certificates/claim, which
--    re-verifies completion server-side under the service role. Nothing else
--    should be able to mint one.
--
-- 2. CLIENT-SIDE QUIZ GRADING
--    submitQuizAttempt() read quiz_options.is_correct in the browser, computed
--    score_pct itself, and inserted the result. A learner could skip all of it
--    and insert { score_pct: 100, result: 'pass' } directly. Quiz scores feed
--    achievement criteria (requirement_type = 'quiz') and the certificate
--    quiz threshold, so a forged score bought real credentials.
--
--    Grading now happens here, against the stored answer key, and the client
--    can no longer write quiz_attempts at all.
--
-- KNOWN REMAINING EXPOSURE (not closed here, documented deliberately):
-- "Users can view quiz options" is FOR SELECT USING (true) and quiz_options
-- carries is_correct, so the answer key is readable by any authenticated user.
-- RLS is row-level and cannot hide one column, and column-level GRANTs cannot
-- distinguish an educator from a learner — both are `authenticated`. Closing
-- it properly means serving options through a view or definer function and
-- updating three surfaces (learner quiz, learner answer review, educator quiz
-- builder). That is a feature-sized change, not a hardening fix, so it is
-- recorded in the report instead of half-done here. Server-side grading limits
-- the damage: a learner who reads the key still has to submit the answers, and
-- the score now reflects what they actually submitted.
-- ============================================================================

-- ─── Fix 1: only the service role, admins, or the owning educator may issue ──
DROP POLICY IF EXISTS "certificates_insert_policy" ON "public"."certificates";
CREATE POLICY "certificates_insert_policy" ON "public"."certificates"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = "certificates"."course_id" AND c.created_by = auth.uid()
    )
  );

COMMENT ON POLICY "certificates_insert_policy" ON "public"."certificates" IS
  'Learners cannot mint their own certificates. Issuance goes through /api/certificates/claim (service role), which re-verifies completion, or through an educator issuing for their own course.';

-- ─── Fix 2: grade on the server ─────────────────────────────────────────────
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

  -- Enrollment is the authorization boundary: you may only attempt a quiz for
  -- a course you are actually enrolled in.
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

  IF v_quiz.max_attempts IS NOT NULL AND v_attempt_no > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'No attempts remaining for this quiz' USING ERRCODE = '42501';
  END IF;

  v_total := jsonb_array_length(p_answers);

  INSERT INTO public.quiz_attempts (enrollment_id, quiz_id, attempt_number, score_pct, result, started_at, submitted_at)
  VALUES (v_enrollment.id, p_quiz_id, v_attempt_no, 0, 'fail', now(), now())
  RETURNING id INTO v_attempt_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    -- The option must belong to a question of THIS quiz, so a crafted payload
    -- cannot borrow a correct option from somewhere else.
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

REVOKE ALL ON FUNCTION public.submit_quiz_attempt("uuid", "jsonb") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt("uuid", "jsonb") TO "authenticated", "service_role";

COMMENT ON FUNCTION public.submit_quiz_attempt("uuid", "jsonb") IS
  'Authoritative quiz grading. Verifies enrollment, enforces max_attempts, grades against the stored answer key and records the attempt. Clients cannot write quiz_attempts directly.';

-- The client no longer inserts attempts; the definer function above does.
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON "public"."quiz_attempts";
DROP POLICY IF EXISTS "Users can manage their own attempts" ON "public"."quiz_attempts";
DROP POLICY IF EXISTS "Learners can insert quiz attempts" ON "public"."quiz_attempts";

CREATE OR REPLACE FUNCTION public.guard_quiz_attempt_writes()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  jwt_claims text;
BEGIN
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

DROP TRIGGER IF EXISTS "guard_quiz_attempt_writes" ON "public"."quiz_attempts";
CREATE TRIGGER "guard_quiz_attempt_writes"
  BEFORE INSERT OR UPDATE ON "public"."quiz_attempts"
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_attempt_writes();
