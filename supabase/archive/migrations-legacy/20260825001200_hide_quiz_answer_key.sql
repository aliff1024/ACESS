-- ============================================================================
-- P0 — the quiz answer key was readable by every learner
--
-- Found by scripts/audit/escalation-probe.ts (2026-08-25):
--
--     await supabase.from('quiz_options').select('question_id, is_correct')
--                   .eq('is_correct', true)
--     -> 110 correct answers, platform-wide
--
-- `quiz_options` carries `is_correct`, and its SELECT policy was
-- `USING (true)`. Any authenticated learner could download the complete answer
-- key for every quiz in ACESS before answering a single question. Quiz scores
-- feed achievement criteria and the certificate quiz threshold, so this was an
-- assessment-integrity hole, not just a curiosity.
--
-- WHY NOT RLS OR COLUMN GRANTS
-- RLS is row-level: hiding `is_correct` while still showing `option_text` is
-- not expressible as a row policy — denying the row would stop the learner
-- from seeing the answers to choose between. Column-level GRANTs cannot help
-- either, because educators and learners are both the `authenticated` role.
--
-- THE FIX
-- A view that returns the same shape but nulls `is_correct` unless the caller
-- is entitled to it: staff, or a learner who has already submitted an attempt
-- for that quiz (which is what the answer-review screen legitimately needs).
-- The learner client reads the view; educator authoring keeps reading the base
-- table, whose policy is now restricted to staff and post-attempt learners.
--
-- The view is SECURITY DEFINER (security_invoker = off, the default) so it can
-- read the base table on the caller's behalf while applying its own rule.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.may_see_quiz_answer_key(p_question_id "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" = "public"
AS $$
  SELECT
    public.current_user_role() IN ('admin', 'educator')
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions qq
      JOIN public.quiz_attempts qa ON qa.quiz_id = qq.quiz_id
      JOIN public.enrollments e    ON e.id = qa.enrollment_id
      WHERE qq.id = p_question_id
        AND e.user_id = auth.uid()
        AND qa.submitted_at IS NOT NULL
    );
$$;

REVOKE ALL ON FUNCTION public.may_see_quiz_answer_key("uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.may_see_quiz_answer_key("uuid") TO "authenticated", "service_role";

-- Same columns as quiz_options, but the key is withheld until it is earned.
CREATE OR REPLACE VIEW public.quiz_options_scoped AS
SELECT
  o.id,
  o.question_id,
  o.option_text,
  o.sequence_order,
  o.image_url,
  CASE WHEN public.may_see_quiz_answer_key(o.question_id) THEN o.is_correct ELSE NULL END AS is_correct
FROM public.quiz_options o;

ALTER VIEW public.quiz_options_scoped SET (security_invoker = off);
GRANT SELECT ON public.quiz_options_scoped TO "authenticated", "service_role";

COMMENT ON VIEW public.quiz_options_scoped IS
  'Learner-facing quiz options. is_correct is NULL until the learner has submitted an attempt for that quiz (or is staff), so the answer key cannot be read ahead of time. Learner code must read this, never quiz_options.';

-- Base table: no longer world-readable.
DROP POLICY IF EXISTS "Users can view quiz options" ON "public"."quiz_options";
CREATE POLICY "Staff and post-attempt learners can view quiz options"
  ON "public"."quiz_options"
  FOR SELECT TO "authenticated"
  USING (public.may_see_quiz_answer_key("question_id"));
