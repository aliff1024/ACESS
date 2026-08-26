-- ============================================================================
-- ACESS — consolidated baseline schema
--
-- This single migration recreates the complete ACESS database: tables, views,
-- functions, triggers, row level security policies, indexes, constraints and
-- role grants.
--
-- It replaces the previous 44 incremental migrations, which could NOT rebuild
-- the database on their own: none of them created the core tables (users,
-- courses, lessons, enrollments, ...). Those tables only ever existed in an
-- out-of-band pg_dump, so a fresh `supabase db reset` produced a broken
-- database. This baseline was produced by replaying that dump plus every
-- migration that post-dated it, verifying the result column-for-column against
-- the live project's schema, and then removing the structures the current
-- codebase no longer uses.
--
-- Companion migration: 20260826000100_storage_buckets.sql (buckets + policies)
--
-- Objects: 36 tables, 1 view, 20 functions, 15 triggers, 84 RLS policies.
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    username text,
    avatar_url text,
    phone_number text,
    birth_date date,
    bio text,
    country text,
    preferred_language text DEFAULT 'en'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    disability_type character varying,
    accessibility_prefs jsonb DEFAULT '{}'::jsonb,
    notification_prefs jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_profiles IS 'Extended identity fields for all users. full_name and email live in public.users.';


--
-- Name: age_group(public.user_profiles); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.age_group(profile public.user_profiles) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN CASE 
    WHEN profile.birth_date IS NULL THEN '18+'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, profile.birth_date::date)) < 13 THEN '6-12'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, profile.birth_date::date)) < 18 THEN '13-17'
    ELSE '18+'
  END;
END;
$$;


--
-- Name: FUNCTION age_group(profile public.user_profiles); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.age_group(profile public.user_profiles) IS 'Dynamically calculates age group based on birth_date for PostgREST';


--
-- Name: check_certificate_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_certificate_eligibility(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_enrollment record;
  v_course record;
  v_total_lessons int;
  v_completed_lessons int;
  v_quiz_threshold int;
  v_passed_quizzes int;
  v_total_quizzes int;
  v_result jsonb;
BEGIN
  -- Get enrollment info
  SELECT e.*, c.title as course_title, c.certificate_enabled, c.certificate_settings
  INTO v_enrollment
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  WHERE e.id = p_enrollment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Enrollment not found');
  END IF;

  IF NOT v_enrollment.certificate_enabled THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Course does not offer certificates');
  END IF;

  -- Count total and completed lessons
  SELECT COUNT(*) INTO v_total_lessons
  FROM public.lessons
  WHERE course_id = v_enrollment.course_id AND status = 'published';

  SELECT COUNT(*) INTO v_completed_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.enrollment_id = p_enrollment_id AND lp.is_viewed = true
  AND l.course_id = v_enrollment.course_id;

  -- Check completion requirements
  IF v_completed_lessons < v_total_lessons THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Not all lessons completed',
      'completed', v_completed_lessons,
      'total', v_total_lessons
    );
  END IF;

  -- Check quiz thresholds
  SELECT COUNT(*) INTO v_total_quizzes
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE l.course_id = v_enrollment.course_id;

  IF v_total_quizzes > 0 THEN
    SELECT COUNT(*) INTO v_passed_quizzes
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    WHERE l.course_id = v_enrollment.course_id
    AND qa.enrollment_id = p_enrollment_id
    AND qa.result = 'pass';

    v_quiz_threshold := COALESCE((v_enrollment.certificate_settings->>'pass_threshold_pct')::int, 100);

    IF (v_passed_quizzes * 100 / NULLIF(v_total_quizzes, 0)) < v_quiz_threshold THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'Quiz pass threshold not met',
        'passed', v_passed_quizzes,
        'total', v_total_quizzes,
        'threshold', v_quiz_threshold
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'completed', v_completed_lessons,
    'total', v_total_lessons,
    'passed_quizzes', v_passed_quizzes,
    'total_quizzes', v_total_quizzes
  );
END;
$$;


--
-- Name: check_quiz_answer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION check_quiz_answer(p_question_id uuid, p_option_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) IS 'Validates one already-made choice without revealing the answer key. Used by the adaptive-learning hint during a quiz.';


--
-- Name: create_notification(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_id UUID;

BEGIN

    INSERT INTO public.notifications (user_id, type, title, body, metadata)

    VALUES (p_user_id, p_type, p_title, p_body, p_metadata)

    RETURNING id INTO v_id;

    RETURN v_id;

END;

$$;


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT u.role FROM public.users u WHERE u.id = auth.uid();
$$;


--
-- Name: generate_certificate_reference(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_certificate_reference() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
            || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
            || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.certificates WHERE reference_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;


--
-- Name: guard_enrollment_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_enrollment_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: guard_quiz_attempt_writes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_quiz_attempt_writes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: guard_users_privileged_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_users_privileged_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  jwt_claims "text";
  caller_role "text";
BEGIN
  jwt_claims := current_setting('request.jwt.claims', true);

  -- Direct SQL (migrations, seed scripts, psql) has no PostgREST JWT context.
  -- Those paths are already trusted; leave them alone so seeding still works.
  IF jwt_claims IS NULL OR jwt_claims = '' THEN
    RETURN NEW;
  END IF;

  -- The service role bypasses RLS by design; server-side API routes that use
  -- it (e.g. /api/admin/approve-instructor) are trusted code paths.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  caller_role := public.current_user_role();
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only an administrator can change account role, email, or status'
      USING ERRCODE = '42501';
  END IF;

  -- A user may *apply* to become an instructor; they may not approve
  -- themselves. Approval happens server-side in /api/admin/approve-instructor
  -- under the service role, which returned above.
  IF NEW.instructor_application_status IS DISTINCT FROM OLD.instructor_application_status
     AND COALESCE(NEW.instructor_application_status, 'none') NOT IN ('none', 'pending', 'withdrawn')
  THEN
    RAISE EXCEPTION 'Only an administrator can approve or reject an instructor application'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_auth_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_auth_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'learner')
  );

  insert into public.user_profiles (user_id, accessibility_prefs, notification_prefs, age_group)
  values (
    new.id,
    '{}'::jsonb,
    '{}'::jsonb,
    '18+'
  );

  return new;
end;
$$;


--
-- Name: may_see_quiz_answer_key(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.may_see_quiz_answer_key(p_question_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: notify_on_course_published(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_course_published() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_enrolled_user RECORD;

BEGIN

    -- Only notify when status changes TO 'published'

    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN

        FOR v_enrolled_user IN

            SELECT DISTINCT e.user_id

            FROM public.enrollments e

            WHERE e.course_id = NEW.id

              AND e.status = 'active'

        LOOP

            PERFORM public.create_notification(

                v_enrolled_user.user_id,

                'course_published',

                'Course Published',

                '"' || NEW.title || '" has been published! Start learning now.',

                jsonb_build_object('course_id', NEW.id)

            );

        END LOOP;

    END IF;



    RETURN NEW;

END;

$$;


--
-- Name: notify_on_enrollment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_enrollment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_course_title TEXT;

    v_course_creator UUID;

    v_learner_name TEXT;

BEGIN

    SELECT c.title, c.created_by INTO v_course_title, v_course_creator

    FROM public.courses c WHERE c.id = NEW.course_id;



    SELECT COALESCE(u.full_name, u.email, 'A learner') INTO v_learner_name

    FROM public.users u WHERE u.id = NEW.user_id;



    IF v_course_creator IS NOT NULL THEN

        PERFORM public.create_notification(

            v_course_creator,

            'enrollment',

            'New Enrollment',

            v_learner_name || ' enrolled in "' || v_course_title || '"',

            jsonb_build_object('course_id', NEW.course_id, 'enrollment_id', NEW.id, 'actor_id', NEW.user_id)

        );

    END IF;



    RETURN NEW;

END;

$$;


--
-- Name: notify_on_lesson_added(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_lesson_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_course_title TEXT;

    v_course_creator UUID;

    v_enrolled_user RECORD;

BEGIN

    SELECT c.title, c.created_by INTO v_course_title, v_course_creator

    FROM public.courses c WHERE c.id = NEW.course_id;



    FOR v_enrolled_user IN

        SELECT DISTINCT e.user_id

        FROM public.enrollments e

        WHERE e.course_id = NEW.course_id

          AND e.status = 'active'

    LOOP

        PERFORM public.create_notification(

            v_enrolled_user.user_id,

            'lesson_added',

            'New Lesson Added',

            'A new lesson "' || NEW.title || '" has been added to "' || v_course_title || '"',

            jsonb_build_object('course_id', NEW.course_id, 'lesson_id', NEW.id)

        );

    END LOOP;



    RETURN NEW;

END;

$$;


--
-- Name: notify_on_lesson_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_lesson_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_lesson_title TEXT;

    v_course_id UUID;

    v_course_title TEXT;

    v_course_creator UUID;

    v_learner_name TEXT;

BEGIN

    -- Only notify on first view (not subsequent views)

    IF TG_OP = 'INSERT' THEN

        SELECT l.title, l.course_id INTO v_lesson_title, v_course_id

        FROM public.lessons l WHERE l.id = NEW.lesson_id;



        SELECT c.title, c.created_by INTO v_course_title, v_course_creator

        FROM public.courses c WHERE c.id = v_course_id;



        SELECT COALESCE(u.full_name, u.email, 'A learner') INTO v_learner_name

        FROM public.users u

        WHERE u.id = (SELECT e.user_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id);



        IF v_course_creator IS NOT NULL THEN

            PERFORM public.create_notification(

                v_course_creator,

                'lesson_completed',

                'Lesson Completed',

                v_learner_name || ' completed "' || v_lesson_title || '" in "' || v_course_title || '"',

                jsonb_build_object('course_id', v_course_id, 'lesson_id', NEW.lesson_id, 'actor_id', (SELECT e.user_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id))

            );

        END IF;

    END IF;



    RETURN NEW;

END;

$$;


--
-- Name: notify_on_quiz_attempt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_quiz_attempt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$

DECLARE

    v_quiz_title TEXT;

    v_lesson_title TEXT;

    v_course_id UUID;

    v_course_title TEXT;

    v_course_creator UUID;

    v_learner_name TEXT;

    v_result_text TEXT;

BEGIN

    SELECT q.title, q.lesson_id INTO v_quiz_title, v_course_id -- reusing v_course_id as lesson_id placeholder

    FROM public.quizzes q WHERE q.id = NEW.quiz_id;



    SELECT l.title, l.course_id INTO v_lesson_title, v_course_id

    FROM public.lessons l WHERE l.id = v_course_id; -- now v_course_id is real course_id



    SELECT c.title, c.created_by INTO v_course_title, v_course_creator

    FROM public.courses c WHERE c.id = v_course_id;



    SELECT COALESCE(u.full_name, u.email, 'A learner') INTO v_learner_name

    FROM public.users u

    WHERE u.id = (SELECT e.user_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id);



    v_result_text := CASE WHEN NEW.result = 'pass' THEN 'passed' ELSE 'attempted' END;



    IF v_course_creator IS NOT NULL THEN

        PERFORM public.create_notification(

            v_course_creator,

            'quiz_completed',

            'Quiz ' || CASE WHEN NEW.result = 'pass' THEN 'Passed' ELSE 'Attempted' END,

            v_learner_name || ' ' || v_result_text || ' "' || v_quiz_title || '" (Score: ' || NEW.score_pct || '%) in "' || v_course_title || '"',

            jsonb_build_object(

                'course_id', v_course_id, 'quiz_id', NEW.quiz_id,

                'score_pct', NEW.score_pct, 'result', NEW.result,

                'actor_id', (SELECT e.user_id FROM public.enrollments e WHERE e.id = NEW.enrollment_id)

            )

        );

    END IF;



    RETURN NEW;

END;

$$;


--
-- Name: set_interactive_content_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_interactive_content_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

begin

  new.updated_at = now();

  return new;

end;

$$;


--
-- Name: submit_quiz_attempt(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) IS 'Authoritative quiz grading. Verifies enrollment, enforces max_attempts, grades against the stored answer key and records the attempt. Clients cannot write quiz_attempts directly.';


--
-- Name: sync_learner_course_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_learner_course_state(p_course_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION sync_learner_course_state(p_course_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_learner_course_state(p_course_id uuid) IS 'The single authoritative derivation of course completion and achievement eligibility from lesson_progress. Clients call this instead of writing enrollments.status or user_achievements directly.';


--
-- Name: accessibility_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accessibility_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    target_disability text NOT NULL,
    content_structure jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE accessibility_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accessibility_templates IS 'Predefined lesson structure templates keyed to disability types';


--
-- Name: COLUMN accessibility_templates.content_structure; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accessibility_templates.content_structure IS 'JSON array of typed sections: [{"type":"learning_objective","required":true,"label":"Learning Objective"}, ...]';


--
-- Name: adaptive_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid,
    course_id uuid,
    adaptation_used text NOT NULL,
    session_id text,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE adaptive_interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.adaptive_interactions IS 'Analytics: tracks which accessibility adaptations learners actually use ΓÇö enables data-driven reporting';


--
-- Name: COLUMN adaptive_interactions.adaptation_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adaptive_interactions.adaptation_used IS 'tts | focus_mode | chunked_content | simplified_summary | captions | slideshow | guided_mode';


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    reference_code character varying NOT NULL,
    pdf_url character varying,
    status character varying DEFAULT 'issued'::character varying NOT NULL,
    issued_at timestamp without time zone DEFAULT now() NOT NULL,
    revoked_at timestamp without time zone,
    revoke_reason text,
    course_id uuid,
    user_id uuid,
    learner_name text,
    course_title text,
    educator_name text,
    institution_name text DEFAULT 'ACESS Platform'::text,
    completion_date timestamp with time zone,
    verification_url text,
    skills_earned text[] DEFAULT '{}'::text[],
    course_duration_hours numeric DEFAULT 0,
    signed_token text,
    template_id text DEFAULT 'default'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT certificates_status_check CHECK (((status)::text = ANY (ARRAY[('issued'::character varying)::text, ('revoked'::character varying)::text]))),
    CONSTRAINT chk_revoke_consistency CHECK (((((status)::text = 'revoked'::text) AND (revoked_at IS NOT NULL)) OR (((status)::text = 'issued'::text) AND (revoked_at IS NULL))))
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    category text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'unread'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contact_messages_category_check CHECK ((category = ANY (ARRAY['general'::text, 'technical'::text, 'instructor_application'::text, 'accessibility'::text, 'feedback'::text]))),
    CONSTRAINT contact_messages_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'replied'::text])))
);


--
-- Name: course_accessibility_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_accessibility_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    accessibility_category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE course_accessibility_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.course_accessibility_categories IS 'Many-to-many: courses can support multiple accessibility categories';


--
-- Name: COLUMN course_accessibility_categories.accessibility_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.course_accessibility_categories.accessibility_category IS 'One of: cognitive, adhd, dyslexia, asd, visual, hearing, motor';


--
-- Name: course_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    icon_url character varying,
    requirement_type character varying NOT NULL,
    requirement_threshold integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_req_type CHECK (((requirement_type)::text = ANY (ARRAY[('progress'::character varying)::text, ('lesson'::character varying)::text, ('activity'::character varying)::text, ('quiz'::character varying)::text, ('streak'::character varying)::text, ('engagement'::character varying)::text])))
);


--
-- Name: TABLE course_achievements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.course_achievements IS 'Educator-defined achievements/badges for a specific course.';


--
-- Name: course_chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: course_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    required_completion_pct integer DEFAULT 100 NOT NULL,
    icon text,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT course_milestones_required_completion_pct_check CHECK (((required_completion_pct >= 0) AND (required_completion_pct <= 100)))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    description text,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    difficulty_level character varying,
    thumbnail_url character varying,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    category text,
    course_type text DEFAULT 'educator'::text NOT NULL,
    system_course boolean DEFAULT false NOT NULL,
    built_in_course boolean DEFAULT false NOT NULL,
    created_by_role text DEFAULT 'educator'::text NOT NULL,
    guided_learning_enabled boolean DEFAULT false NOT NULL,
    official_course_order integer,
    managed_by_admin boolean DEFAULT false NOT NULL,
    recommended_age_group text,
    learning_streaks_enabled boolean DEFAULT false NOT NULL,
    milestone_tracking_enabled boolean DEFAULT false NOT NULL,
    course_layout_type text DEFAULT 'standard'::text NOT NULL,
    chapter_organization_enabled boolean DEFAULT false NOT NULL,
    certificate_enabled boolean DEFAULT false,
    certificate_settings jsonb DEFAULT '{}'::jsonb,
    certification_locked boolean DEFAULT false,
    supports_tts boolean DEFAULT false,
    supports_transcripts boolean DEFAULT false,
    supports_focus_mode boolean DEFAULT false,
    supports_chunked_learning boolean DEFAULT false,
    tags text[] DEFAULT '{}'::text[],
    accessibility_categories text[] DEFAULT '{}'::text[],
    primary_disability_focus text,
    secondary_disability_focuses text[] DEFAULT '{}'::text[],
    target_reading_age integer DEFAULT 13,
    educator_custom_guide text,
    CONSTRAINT courses_course_layout_type_check CHECK ((course_layout_type = ANY (ARRAY['standard'::text, 'guided'::text, 'simplified'::text, 'focused'::text]))),
    CONSTRAINT courses_course_type_check CHECK ((course_type = ANY (ARRAY['educator'::text, 'system'::text]))),
    CONSTRAINT courses_created_by_role_check CHECK ((created_by_role = ANY (ARRAY['educator'::text, 'admin'::text]))),
    CONSTRAINT courses_difficulty_level_check CHECK (((difficulty_level)::text = ANY (ARRAY[('beginner'::character varying)::text, ('intermediate'::character varying)::text, ('advanced'::character varying)::text]))),
    CONSTRAINT courses_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('pending_review'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: COLUMN courses.supports_tts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.supports_tts IS 'Course provides text-to-speech support for lessons';


--
-- Name: COLUMN courses.supports_transcripts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.supports_transcripts IS 'Course provides video/audio transcripts';


--
-- Name: COLUMN courses.supports_focus_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.supports_focus_mode IS 'Course supports focus mode (minimal distractions)';


--
-- Name: COLUMN courses.supports_chunked_learning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courses.supports_chunked_learning IS 'Course supports chunked/sectioned content navigation';


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    enrolled_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT enrollments_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('completed'::character varying)::text, ('dropped'::character varying)::text])))
);


--
-- Name: h5p_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.h5p_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    embed_url text NOT NULL,
    source_url text,
    description text,
    width text DEFAULT '100%'::text,
    height text DEFAULT '500px'::text,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    thumbnail_url text
);


--
-- Name: h5p_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.h5p_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    h5p_content_id uuid NOT NULL,
    score integer,
    max_score integer,
    completed boolean DEFAULT false NOT NULL,
    raw_statement jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE h5p_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.h5p_responses IS 'Tracks learner responses to H5P interactive content';


--
-- Name: instructor_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructor_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name text NOT NULL,
    email text NOT NULL,
    experience text,
    reason text,
    portfolio_links text,
    referral_code text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT instructor_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'request_info'::text])))
);


--
-- Name: learner_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learner_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    checkpoint_id uuid,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    response_data jsonb,
    lesson_id uuid
);


--
-- Name: lesson_ai_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_ai_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    summary text NOT NULL,
    suggested_questions text[] DEFAULT '{}'::text[],
    source_content_hash text NOT NULL,
    model text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    checkpoint_type text DEFAULT 'reflection'::text NOT NULL,
    sequence_order integer DEFAULT 0 NOT NULL,
    required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lesson_checkpoints_checkpoint_type_check CHECK ((checkpoint_type = ANY (ARRAY['reflection'::text, 'practice'::text, 'quiz'::text, 'activity'::text, 'milestone'::text])))
);


--
-- Name: lesson_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_interactive_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_interactive_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    content_type text NOT NULL,
    title text NOT NULL,
    content_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    accessibility_settings jsonb DEFAULT '{}'::jsonb,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_draft boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE lesson_interactive_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lesson_interactive_content IS 'Native plug-and-play interactive activities for lessons ΓÇö flashcards, drag_drop, fill_blanks, memory_game, timeline';


--
-- Name: COLUMN lesson_interactive_content.content_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_interactive_content.content_type IS 'Activity type: flashcards | drag_drop | fill_blanks | memory_game | timeline';


--
-- Name: COLUMN lesson_interactive_content.content_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_interactive_content.content_data IS 'JSON configuration specific to the activity type';


--
-- Name: COLUMN lesson_interactive_content.accessibility_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_interactive_content.accessibility_settings IS 'Per-activity accessibility overrides: tts, reduced_motion, simplified_ui, etc.';


--
-- Name: COLUMN lesson_interactive_content.is_draft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_interactive_content.is_draft IS 'Whether this activity is still a draft and should not be shown to learners.';


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    is_viewed boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    first_viewed_at timestamp without time zone,
    last_viewed_at timestamp without time zone,
    time_spent_learning integer DEFAULT 0 NOT NULL,
    summary_completed boolean DEFAULT false,
    is_completed boolean DEFAULT false,
    progress_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lesson_progress_completed_implies_viewed CHECK (((is_completed IS NOT TRUE) OR (is_viewed IS TRUE))),
    CONSTRAINT lesson_progress_view_count_check CHECK ((view_count >= 0))
);


--
-- Name: COLUMN lesson_progress.is_viewed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_progress.is_viewed IS 'The learner opened this lesson. Set by trackLessonView().';


--
-- Name: COLUMN lesson_progress.is_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lesson_progress.is_completed IS 'Canonical completion flag. Set by completeLesson(). All progress percentages, course completion and certificate eligibility are computed from this column.';


--
-- Name: lesson_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    title text NOT NULL,
    description text,
    lesson_type text DEFAULT 'standard'::text NOT NULL,
    content_html text,
    estimated_duration integer,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    content_html text NOT NULL,
    version_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title character varying NOT NULL,
    content_html text,
    video_url character varying,
    transcript text,
    sequence_order integer NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    estimated_duration integer,
    prerequisite_lesson_id uuid,
    simplified_summary text,
    accessibility_notes text,
    focus_mode_enabled boolean DEFAULT false NOT NULL,
    chunked_content_enabled boolean DEFAULT false NOT NULL,
    lesson_type text DEFAULT 'standard'::text NOT NULL,
    chapter_id uuid,
    learning_objectives text,
    visibility_status text DEFAULT 'visible'::text NOT NULL,
    checkpoints_enabled boolean DEFAULT false NOT NULL,
    adaptive_learning_enabled boolean DEFAULT false NOT NULL,
    has_video boolean DEFAULT true,
    has_pdf boolean DEFAULT true,
    has_quiz boolean DEFAULT true,
    has_transcript boolean DEFAULT true,
    has_summary_activity boolean DEFAULT false,
    summary_source text DEFAULT 'entire_lesson'::text,
    summary_word_target integer DEFAULT 100,
    summary_key_points jsonb DEFAULT '[]'::jsonb,
    summary_reflection_questions jsonb DEFAULT '[]'::jsonb,
    summary_ai_feedback_enabled boolean DEFAULT false,
    lesson_layout text DEFAULT 'standard'::text,
    has_h5p boolean DEFAULT false,
    accessibility_score integer DEFAULT 100,
    allow_discussions boolean DEFAULT false,
    allow_download boolean DEFAULT false,
    CONSTRAINT lessons_lesson_layout_check CHECK ((lesson_layout = ANY (ARRAY['standard'::text, 'focus'::text, 'two_column'::text, 'wide'::text, 'slideshow'::text]))),
    CONSTRAINT lessons_lesson_type_check CHECK ((lesson_type = ANY (ARRAY['standard'::text, 'video'::text, 'quiz'::text, 'practice'::text, 'reading'::text, 'assessment'::text]))),
    CONSTRAINT lessons_sequence_order_check CHECK ((sequence_order > 0)),
    CONSTRAINT lessons_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text]))),
    CONSTRAINT lessons_summary_source_check CHECK ((summary_source = ANY (ARRAY['video'::text, 'pdf'::text, 'lesson_text'::text, 'entire_lesson'::text]))),
    CONSTRAINT lessons_visibility_status_check CHECK ((visibility_status = ANY (ARRAY['visible'::text, 'hidden'::text, 'scheduled'::text])))
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid,
    file_name character varying NOT NULL,
    file_type character varying NOT NULL,
    url character varying NOT NULL,
    size_bytes bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lesson_id uuid,
    title character varying
);


--
-- Name: TABLE media_assets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.media_assets IS 'Global media library for users to reuse assets across the LMS.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quiz_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_option_id uuid,
    is_correct boolean
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    quiz_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    score_pct integer,
    result character varying DEFAULT 'in_progress'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    submitted_at timestamp without time zone,
    CONSTRAINT quiz_attempts_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT quiz_attempts_result_check CHECK (((result)::text = ANY (ARRAY[('pass'::character varying)::text, ('fail'::character varying)::text, ('in_progress'::character varying)::text]))),
    CONSTRAINT quiz_attempts_score_pct_check CHECK (((score_pct >= 0) AND (score_pct <= 100)))
);


--
-- Name: quiz_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    sequence_order integer NOT NULL,
    image_url text,
    CONSTRAINT quiz_options_sequence_order_check CHECK ((sequence_order > 0))
);


--
-- Name: quiz_options_scoped; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.quiz_options_scoped WITH (security_invoker=off) AS
 SELECT id,
    question_id,
    option_text,
    sequence_order,
    image_url,
        CASE
            WHEN public.may_see_quiz_answer_key(question_id) THEN is_correct
            ELSE NULL::boolean
        END AS is_correct
   FROM public.quiz_options o;


--
-- Name: VIEW quiz_options_scoped; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.quiz_options_scoped IS 'Learner-facing quiz options. is_correct is NULL until the learner has submitted an attempt for that quiz (or is staff), so the answer key cannot be read ahead of time. Learner code must read this, never quiz_options.';


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying NOT NULL,
    sequence_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text,
    CONSTRAINT quiz_questions_question_type_check CHECK (((question_type)::text = ANY (ARRAY[('multiple_choice'::character varying)::text, ('scenario'::character varying)::text]))),
    CONSTRAINT quiz_questions_sequence_order_check CHECK ((sequence_order > 0))
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title character varying NOT NULL,
    time_limit_seconds integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 0 NOT NULL,
    pass_threshold_pct integer DEFAULT 60 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT quizzes_max_attempts_check CHECK ((max_attempts >= 0)),
    CONSTRAINT quizzes_pass_threshold_pct_check CHECK (((pass_threshold_pct >= 0) AND (pass_threshold_pct <= 100))),
    CONSTRAINT quizzes_time_limit_seconds_check CHECK ((time_limit_seconds >= 0))
);


--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    recommended_lesson_id uuid NOT NULL,
    difficulty_tier character varying NOT NULL,
    trigger_reason text,
    is_acknowledged boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendations_difficulty_tier_check CHECK (((difficulty_tier)::text = ANY (ARRAY[('revision'::character varying)::text, ('standard'::character varying)::text, ('advanced'::character varying)::text])))
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    user_id uuid,
    usage_count integer DEFAULT 0,
    max_uses integer DEFAULT 50,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    course_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_achievements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_achievements IS 'Written only by public.sync_learner_course_state() (SECURITY DEFINER) or the service role. Direct client INSERT is deliberately not permitted: a learner could otherwise award themselves any badge in the catalogue.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying NOT NULL,
    role character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    email_verified_at timestamp without time zone,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    full_name text,
    instructor_application_status text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('learner'::character varying)::text, ('educator'::character varying)::text, ('admin'::character varying)::text])))
);


--
-- Name: video_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    title text NOT NULL,
    timestamp_seconds numeric NOT NULL,
    question_text text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct_option_index integer DEFAULT 0 NOT NULL,
    sequence_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: accessibility_templates accessibility_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessibility_templates
    ADD CONSTRAINT accessibility_templates_pkey PRIMARY KEY (id);


--
-- Name: adaptive_interactions adaptive_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_interactions
    ADD CONSTRAINT adaptive_interactions_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_enrollment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_enrollment_id_key UNIQUE (enrollment_id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_reference_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_reference_code_key UNIQUE (reference_code);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: course_accessibility_categories course_accessibility_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_accessibility_categories
    ADD CONSTRAINT course_accessibility_categories_pkey PRIMARY KEY (id);


--
-- Name: course_achievements course_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_achievements
    ADD CONSTRAINT course_achievements_pkey PRIMARY KEY (id);


--
-- Name: course_chapters course_chapters_course_id_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT course_chapters_course_id_sequence_order_key UNIQUE (course_id, sequence_order);


--
-- Name: course_chapters course_chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT course_chapters_pkey PRIMARY KEY (id);


--
-- Name: course_favorites course_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_favorites
    ADD CONSTRAINT course_favorites_pkey PRIMARY KEY (id);


--
-- Name: course_favorites course_favorites_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_favorites
    ADD CONSTRAINT course_favorites_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: course_milestones course_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_milestones
    ADD CONSTRAINT course_milestones_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: h5p_contents h5p_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_contents
    ADD CONSTRAINT h5p_contents_pkey PRIMARY KEY (id);


--
-- Name: h5p_responses h5p_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_responses
    ADD CONSTRAINT h5p_responses_pkey PRIMARY KEY (id);


--
-- Name: instructor_applications instructor_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_applications
    ADD CONSTRAINT instructor_applications_pkey PRIMARY KEY (id);


--
-- Name: learner_checkpoints learner_checkpoints_enrollment_id_checkpoint_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_checkpoints
    ADD CONSTRAINT learner_checkpoints_enrollment_id_checkpoint_id_key UNIQUE (enrollment_id, checkpoint_id);


--
-- Name: learner_checkpoints learner_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_checkpoints
    ADD CONSTRAINT learner_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: lesson_ai_summaries lesson_ai_summaries_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_ai_summaries
    ADD CONSTRAINT lesson_ai_summaries_lesson_id_key UNIQUE (lesson_id);


--
-- Name: lesson_ai_summaries lesson_ai_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_ai_summaries
    ADD CONSTRAINT lesson_ai_summaries_pkey PRIMARY KEY (id);


--
-- Name: lesson_checkpoints lesson_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_checkpoints
    ADD CONSTRAINT lesson_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: lesson_comments lesson_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_pkey PRIMARY KEY (id);


--
-- Name: lesson_interactive_content lesson_interactive_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_interactive_content
    ADD CONSTRAINT lesson_interactive_content_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_enrollment_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_enrollment_id_lesson_id_key UNIQUE (enrollment_id, lesson_id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_templates lesson_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_templates
    ADD CONSTRAINT lesson_templates_pkey PRIMARY KEY (id);


--
-- Name: lesson_versions lesson_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_versions
    ADD CONSTRAINT lesson_versions_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_course_id_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_sequence_order_key UNIQUE (course_id, sequence_order);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: quiz_answers quiz_answers_attempt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);


--
-- Name: quiz_answers quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_enrollment_id_quiz_id_attempt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_enrollment_id_quiz_id_attempt_number_key UNIQUE (enrollment_id, quiz_id, attempt_number);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_options quiz_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_options
    ADD CONSTRAINT quiz_options_pkey PRIMARY KEY (id);


--
-- Name: quiz_options quiz_options_question_id_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_options
    ADD CONSTRAINT quiz_options_question_id_sequence_order_key UNIQUE (question_id, sequence_order);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_quiz_id_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_sequence_order_key UNIQUE (quiz_id, sequence_order);


--
-- Name: quizzes quizzes_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_lesson_id_key UNIQUE (lesson_id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_profiles user_profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_username_key UNIQUE (username);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_questions video_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_questions
    ADD CONSTRAINT video_questions_pkey PRIMARY KEY (id);


--
-- Name: idx_certificates_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_course_id ON public.certificates USING btree (course_id);


--
-- Name: idx_certificates_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_enrollment ON public.certificates USING btree (enrollment_id);


--
-- Name: idx_certificates_enrollment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_enrollment_id ON public.certificates USING btree (enrollment_id);


--
-- Name: idx_certificates_reference_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_reference_code ON public.certificates USING btree (reference_code);


--
-- Name: idx_certificates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_status ON public.certificates USING btree (status);


--
-- Name: idx_certificates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certificates_user_id ON public.certificates USING btree (user_id);


--
-- Name: idx_contact_messages_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_category ON public.contact_messages USING btree (category);


--
-- Name: idx_contact_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_status ON public.contact_messages USING btree (status);


--
-- Name: idx_course_access_cat_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_course_access_cat_unique ON public.course_accessibility_categories USING btree (course_id, accessibility_category);


--
-- Name: idx_course_achievements_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_achievements_course ON public.course_achievements USING btree (course_id);


--
-- Name: idx_course_chapters_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_chapters_course ON public.course_chapters USING btree (course_id);


--
-- Name: idx_course_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_favorites_user ON public.course_favorites USING btree (user_id);


--
-- Name: idx_course_milestones_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_milestones_course ON public.course_milestones USING btree (course_id);


--
-- Name: idx_courses_course_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_course_type ON public.courses USING btree (course_type);


--
-- Name: idx_courses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_created_by ON public.courses USING btree (created_by);


--
-- Name: idx_courses_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_published ON public.courses USING btree (id) WHERE ((deleted_at IS NULL) AND ((status)::text = 'published'::text));


--
-- Name: idx_courses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_status ON public.courses USING btree (status);


--
-- Name: idx_courses_system_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_system_course ON public.courses USING btree (system_course);


--
-- Name: idx_enrollments_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_course ON public.enrollments USING btree (course_id);


--
-- Name: idx_enrollments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_status ON public.enrollments USING btree (status);


--
-- Name: idx_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_user ON public.enrollments USING btree (user_id);


--
-- Name: idx_h5p_responses_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_h5p_responses_content ON public.h5p_responses USING btree (h5p_content_id);


--
-- Name: idx_h5p_responses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_h5p_responses_user ON public.h5p_responses USING btree (user_id);


--
-- Name: idx_instructor_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instructor_applications_status ON public.instructor_applications USING btree (status);


--
-- Name: idx_instructor_applications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instructor_applications_user_id ON public.instructor_applications USING btree (user_id);


--
-- Name: idx_interactive_content_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactive_content_lesson ON public.lesson_interactive_content USING btree (lesson_id);


--
-- Name: idx_learner_checkpoints_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learner_checkpoints_enrollment ON public.learner_checkpoints USING btree (enrollment_id);


--
-- Name: idx_lesson_ai_summaries_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_ai_summaries_lesson_id ON public.lesson_ai_summaries USING btree (lesson_id);


--
-- Name: idx_lesson_checkpoints_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_checkpoints_lesson ON public.lesson_checkpoints USING btree (lesson_id);


--
-- Name: idx_lesson_comments_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments USING btree (lesson_id);


--
-- Name: idx_lesson_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_comments_parent_id ON public.lesson_comments USING btree (parent_id);


--
-- Name: idx_lesson_progress_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress USING btree (enrollment_id);


--
-- Name: idx_lesson_progress_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress USING btree (lesson_id);


--
-- Name: idx_lesson_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_versions_created_at ON public.lesson_versions USING btree (created_at);


--
-- Name: idx_lesson_versions_lesson_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_versions_lesson_id ON public.lesson_versions USING btree (lesson_id);


--
-- Name: idx_lessons_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_chapter ON public.lessons USING btree (chapter_id);


--
-- Name: idx_lessons_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_course ON public.lessons USING btree (course_id);


--
-- Name: idx_lessons_prerequisite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_prerequisite ON public.lessons USING btree (prerequisite_lesson_id);


--
-- Name: idx_media_assets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_assets_type ON public.media_assets USING btree (file_type);


--
-- Name: idx_media_assets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_assets_user ON public.media_assets USING btree (user_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_quiz_answers_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_answers_attempt ON public.quiz_answers USING btree (attempt_id);


--
-- Name: idx_quiz_answers_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_answers_question ON public.quiz_answers USING btree (question_id);


--
-- Name: idx_quiz_attempts_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_enrollment ON public.quiz_attempts USING btree (enrollment_id);


--
-- Name: idx_quiz_attempts_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts USING btree (quiz_id);


--
-- Name: idx_quiz_attempts_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_result ON public.quiz_attempts USING btree (result);


--
-- Name: idx_quiz_options_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_options_question ON public.quiz_options USING btree (question_id);


--
-- Name: idx_quiz_questions_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions USING btree (quiz_id);


--
-- Name: idx_recommendations_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendations_enrollment ON public.recommendations USING btree (enrollment_id);


--
-- Name: idx_recommendations_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendations_lesson ON public.recommendations USING btree (recommended_lesson_id);


--
-- Name: idx_recommendations_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendations_unread ON public.recommendations USING btree (enrollment_id) WHERE (is_acknowledged = false);


--
-- Name: idx_referral_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);


--
-- Name: idx_user_achievements_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_course ON public.user_achievements USING btree (course_id);


--
-- Name: idx_user_achievements_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_user ON public.user_achievements USING btree (user_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: enrollments guard_enrollment_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guard_enrollment_status BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.guard_enrollment_status();


--
-- Name: quiz_attempts guard_quiz_attempt_writes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guard_quiz_attempt_writes BEFORE INSERT OR UPDATE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_attempt_writes();


--
-- Name: users guard_users_privileged_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guard_users_privileged_columns BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.guard_users_privileged_columns();


--
-- Name: courses on_course_published_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_course_published_notify AFTER UPDATE OF status ON public.courses FOR EACH ROW EXECUTE FUNCTION public.notify_on_course_published();


--
-- Name: enrollments on_enrollment_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_enrollment_notify AFTER INSERT ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.notify_on_enrollment();


--
-- Name: lessons on_lesson_added_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_lesson_added_notify AFTER INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.notify_on_lesson_added();


--
-- Name: lesson_progress on_lesson_progress_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_lesson_progress_notify AFTER INSERT ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.notify_on_lesson_progress();


--
-- Name: quiz_attempts on_quiz_attempt_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_quiz_attempt_notify AFTER INSERT ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.notify_on_quiz_attempt();


--
-- Name: lesson_interactive_content set_interactive_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_interactive_content_updated_at BEFORE UPDATE ON public.lesson_interactive_content FOR EACH ROW EXECUTE FUNCTION public.set_interactive_content_updated_at();


--
-- Name: user_profiles set_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: courses trg_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lessons trg_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quiz_questions trg_quiz_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quizzes trg_quizzes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: adaptive_interactions adaptive_interactions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_interactions
    ADD CONSTRAINT adaptive_interactions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: adaptive_interactions adaptive_interactions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_interactions
    ADD CONSTRAINT adaptive_interactions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: adaptive_interactions adaptive_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_interactions
    ADD CONSTRAINT adaptive_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: course_accessibility_categories course_accessibility_categories_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_accessibility_categories
    ADD CONSTRAINT course_accessibility_categories_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_achievements course_achievements_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_achievements
    ADD CONSTRAINT course_achievements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_chapters course_chapters_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_chapters
    ADD CONSTRAINT course_chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_favorites course_favorites_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_favorites
    ADD CONSTRAINT course_favorites_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_favorites course_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_favorites
    ADD CONSTRAINT course_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: course_milestones course_milestones_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_milestones
    ADD CONSTRAINT course_milestones_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: h5p_contents h5p_contents_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_contents
    ADD CONSTRAINT h5p_contents_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: h5p_responses h5p_responses_h5p_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_responses
    ADD CONSTRAINT h5p_responses_h5p_content_id_fkey FOREIGN KEY (h5p_content_id) REFERENCES public.h5p_contents(id) ON DELETE CASCADE;


--
-- Name: h5p_responses h5p_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.h5p_responses
    ADD CONSTRAINT h5p_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: instructor_applications instructor_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_applications
    ADD CONSTRAINT instructor_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: instructor_applications instructor_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_applications
    ADD CONSTRAINT instructor_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: learner_checkpoints learner_checkpoints_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_checkpoints
    ADD CONSTRAINT learner_checkpoints_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.lesson_checkpoints(id) ON DELETE CASCADE;


--
-- Name: learner_checkpoints learner_checkpoints_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_checkpoints
    ADD CONSTRAINT learner_checkpoints_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: learner_checkpoints learner_checkpoints_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_checkpoints
    ADD CONSTRAINT learner_checkpoints_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_ai_summaries lesson_ai_summaries_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_ai_summaries
    ADD CONSTRAINT lesson_ai_summaries_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_checkpoints lesson_checkpoints_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_checkpoints
    ADD CONSTRAINT lesson_checkpoints_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_comments lesson_comments_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_comments lesson_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.lesson_comments(id) ON DELETE CASCADE;


--
-- Name: lesson_comments lesson_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_comments
    ADD CONSTRAINT lesson_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_interactive_content lesson_interactive_content_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_interactive_content
    ADD CONSTRAINT lesson_interactive_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lesson_interactive_content lesson_interactive_content_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_interactive_content
    ADD CONSTRAINT lesson_interactive_content_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_templates lesson_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_templates
    ADD CONSTRAINT lesson_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lesson_versions lesson_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_versions
    ADD CONSTRAINT lesson_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_versions lesson_versions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_versions
    ADD CONSTRAINT lesson_versions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_prerequisite_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_prerequisite_lesson_id_fkey FOREIGN KEY (prerequisite_lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: media_assets media_assets_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: media_assets media_assets_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: media_assets media_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_selected_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.quiz_options(id) ON DELETE RESTRICT;


--
-- Name: quiz_attempts quiz_attempts_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_options quiz_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_options
    ADD CONSTRAINT quiz_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: recommendations recommendations_recommended_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_recommended_lesson_id_fkey FOREIGN KEY (recommended_lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.course_achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: video_questions video_questions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_questions
    ADD CONSTRAINT video_questions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: instructor_applications Admins can view all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all applications" ON public.instructor_applications USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: referral_codes Admins can view all referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all referral codes" ON public.referral_codes USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: contact_messages Admins can view contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view contact messages" ON public.contact_messages USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: contact_messages Anyone can submit contact message; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact message" ON public.contact_messages FOR INSERT WITH CHECK (true);


--
-- Name: course_achievements Anyone can view course achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view course achievements" ON public.course_achievements FOR SELECT USING (true);


--
-- Name: lesson_comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comments are viewable by everyone" ON public.lesson_comments FOR SELECT USING (true);


--
-- Name: courses Educators can delete their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can delete their own courses" ON public.courses FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: courses Educators can insert courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (((auth.uid() = created_by) AND (public.current_user_role() = ANY (ARRAY['educator'::text, 'admin'::text]))));


--
-- Name: course_achievements Educators can manage achievements for their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage achievements for their courses" ON public.course_achievements USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_achievements.course_id) AND (courses.created_by = auth.uid())))));


--
-- Name: course_chapters Educators can manage chapters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage chapters" ON public.course_chapters USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_chapters.course_id) AND (c.created_by = auth.uid())))));


--
-- Name: lesson_checkpoints Educators can manage lesson checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage lesson checkpoints" ON public.lesson_checkpoints USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_checkpoints.lesson_id) AND (c.created_by = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_checkpoints.lesson_id) AND (c.created_by = auth.uid())))));


--
-- Name: lessons Educators can manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage lessons" ON public.lessons USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = lessons.course_id) AND (c.created_by = auth.uid())))));


--
-- Name: quiz_options Educators can manage quiz options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage quiz options" ON public.quiz_options USING ((EXISTS ( SELECT 1
   FROM (((public.quiz_questions qq
     JOIN public.quizzes q ON ((q.id = qq.quiz_id)))
     JOIN public.lessons l ON ((l.id = q.lesson_id)))
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((qq.id = quiz_options.question_id) AND (c.created_by = auth.uid())))));


--
-- Name: quiz_questions Educators can manage quiz questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage quiz questions" ON public.quiz_questions USING ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.lessons l ON ((l.id = q.lesson_id)))
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((q.id = quiz_questions.quiz_id) AND (c.created_by = auth.uid())))));


--
-- Name: quizzes Educators can manage quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage quizzes" ON public.quizzes USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = quizzes.lesson_id) AND (c.created_by = auth.uid())))));


--
-- Name: lesson_versions Educators can manage versions for their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can manage versions for their courses" ON public.lesson_versions USING ((auth.uid() IN ( SELECT c.created_by
   FROM (public.courses c
     JOIN public.lessons l ON ((l.course_id = c.id)))
  WHERE (l.id = lesson_versions.lesson_id))));


--
-- Name: courses Educators can update their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can update their own courses" ON public.courses FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: user_achievements Educators can view achievements for their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view achievements for their courses" ON public.user_achievements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = user_achievements.course_id) AND (courses.created_by = auth.uid())))));


--
-- Name: quiz_attempts Educators can view attempts in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view attempts in their courses" ON public.quiz_attempts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
  WHERE ((e.id = quiz_attempts.enrollment_id) AND (c.created_by = auth.uid())))));


--
-- Name: enrollments Educators can view enrollments in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view enrollments in their courses" ON public.enrollments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.created_by = auth.uid())))));


--
-- Name: learner_checkpoints Educators can view learner checkpoints in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view learner checkpoints in their courses" ON public.learner_checkpoints FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
  WHERE ((e.id = learner_checkpoints.enrollment_id) AND (c.created_by = auth.uid())))));


--
-- Name: lesson_progress Educators can view progress in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view progress in their courses" ON public.lesson_progress FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
  WHERE ((e.id = lesson_progress.enrollment_id) AND (c.created_by = auth.uid())))));


--
-- Name: courses Educators can view their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Educators can view their own courses" ON public.courses FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: media_assets Enrolled learners can read lesson assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled learners can read lesson assets" ON public.media_assets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
     JOIN public.enrollments e ON (((e.course_id = c.id) AND (e.user_id = auth.uid()))))
  WHERE ((l.id = media_assets.lesson_id) AND ((e.status)::text <> 'dropped'::text)))));


--
-- Name: h5p_responses Learners can insert their own h5p responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Learners can insert their own h5p responses" ON public.h5p_responses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: learner_checkpoints Learners can manage their own checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Learners can manage their own checkpoints" ON public.learner_checkpoints USING ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = learner_checkpoints.enrollment_id) AND (e.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = learner_checkpoints.enrollment_id) AND (e.user_id = auth.uid())))));


--
-- Name: lesson_checkpoints Learners can view lesson checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Learners can view lesson checkpoints" ON public.lesson_checkpoints FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_checkpoints.lesson_id) AND (((c.status)::text = 'published'::text) OR (c.created_by = auth.uid()))))));


--
-- Name: h5p_responses Learners can view their own h5p responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Learners can view their own h5p responses" ON public.h5p_responses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recommendations Learners can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Learners can view their own recommendations" ON public.recommendations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = recommendations.enrollment_id) AND (e.user_id = auth.uid())))));


--
-- Name: course_chapters Public can view chapters of published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view chapters of published courses" ON public.course_chapters FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_chapters.course_id) AND ((c.status)::text = 'published'::text)))) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_chapters.course_id) AND (c.created_by = auth.uid()))))));


--
-- Name: lessons Public can view lessons of published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view lessons of published courses" ON public.lessons FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = lessons.course_id) AND ((c.status)::text = 'published'::text)))) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = lessons.course_id) AND (c.created_by = auth.uid()))))));


--
-- Name: courses Public can view published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view published courses" ON public.courses FOR SELECT USING (((status)::text = 'published'::text));


--
-- Name: quiz_options Staff and post-attempt learners can view quiz options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and post-attempt learners can view quiz options" ON public.quiz_options FOR SELECT TO authenticated USING (public.may_see_quiz_answer_key(question_id));


--
-- Name: media_assets Users can delete their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own assets" ON public.media_assets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: lesson_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.lesson_comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can delete their own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own enrollments" ON public.enrollments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can enroll themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND ((status)::text <> 'completed'::text) AND (completed_at IS NULL)));


--
-- Name: instructor_applications Users can insert own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own application" ON public.instructor_applications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referral_codes Users can insert referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert referral codes" ON public.referral_codes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: media_assets Users can insert their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own assets" ON public.media_assets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_comments Users can insert their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own comments" ON public.lesson_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: quiz_answers Users can manage their own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own answers" ON public.quiz_answers USING ((EXISTS ( SELECT 1
   FROM (public.quiz_attempts qa
     JOIN public.enrollments e ON ((e.id = qa.enrollment_id)))
  WHERE ((qa.id = quiz_answers.attempt_id) AND (e.user_id = auth.uid())))));


--
-- Name: lesson_progress Users can manage their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own progress" ON public.lesson_progress USING ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = lesson_progress.enrollment_id) AND (e.user_id = auth.uid())))));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: lesson_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.lesson_comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can update their own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own enrollments" ON public.enrollments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: lesson_ai_summaries Users can view AI summaries for accessible lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view AI summaries for accessible lessons" ON public.lesson_ai_summaries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_ai_summaries.lesson_id) AND (((c.status)::text = 'published'::text) OR (c.created_by = auth.uid()))))));


--
-- Name: instructor_applications Users can view own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own applications" ON public.instructor_applications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_codes Users can view own referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referral codes" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_questions Users can view quiz questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);


--
-- Name: quizzes Users can view quizzes for lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quizzes for lessons" ON public.quizzes FOR SELECT USING (true);


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_answers Users can view their own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own answers" ON public.quiz_answers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.quiz_attempts qa
     JOIN public.enrollments e ON ((e.id = qa.enrollment_id)))
  WHERE ((qa.id = quiz_answers.attempt_id) AND (e.user_id = auth.uid())))));


--
-- Name: media_assets Users can view their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own assets" ON public.media_assets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_attempts Users can view their own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = quiz_attempts.enrollment_id) AND (e.user_id = auth.uid())))));


--
-- Name: enrollments Users can view their own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own enrollments" ON public.enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: lesson_progress Users can view their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own progress" ON public.lesson_progress FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.id = lesson_progress.enrollment_id) AND (e.user_id = auth.uid())))));


--
-- Name: accessibility_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accessibility_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: adaptive_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adaptive_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: users admins can update all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins can update all users" ON public.users FOR UPDATE USING (( SELECT (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text))) WITH CHECK (( SELECT (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)));


--
-- Name: accessibility_templates admins_manage_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_templates ON public.accessibility_templates TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: accessibility_templates authenticated_view_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_view_templates ON public.accessibility_templates FOR SELECT TO authenticated USING (true);


--
-- Name: certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: certificates certificates_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY certificates_insert_policy ON public.certificates FOR INSERT TO authenticated WITH CHECK (((public.current_user_role() = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = certificates.course_id) AND (c.created_by = auth.uid()))))));


--
-- Name: POLICY certificates_insert_policy ON certificates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY certificates_insert_policy ON public.certificates IS 'Learners cannot mint their own certificates. Issuance goes through /api/certificates/claim (service role), which re-verifies completion, or through an educator issuing for their own course.';


--
-- Name: certificates certificates_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY certificates_select_policy ON public.certificates FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT c.created_by
   FROM public.courses c
  WHERE (c.id = certificates.course_id))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))));


--
-- Name: certificates certificates_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY certificates_update_policy ON public.certificates FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))));


--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: course_accessibility_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_accessibility_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: course_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: course_chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: course_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: course_accessibility_categories educators_manage_course_access_cats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educators_manage_course_access_cats ON public.course_accessibility_categories TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_accessibility_categories.course_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_accessibility_categories.course_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))))))));


--
-- Name: h5p_contents educators_manage_h5p; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educators_manage_h5p ON public.h5p_contents TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = h5p_contents.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = h5p_contents.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))))))));


--
-- Name: lesson_interactive_content educators_manage_interactive_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educators_manage_interactive_content ON public.lesson_interactive_content TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_interactive_content.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = lesson_interactive_content.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))))))));


--
-- Name: video_questions educators_manage_video_questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educators_manage_video_questions ON public.video_questions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = video_questions.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.courses c ON ((c.id = l.course_id)))
  WHERE ((l.id = video_questions.lesson_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))))))));


--
-- Name: adaptive_interactions educators_view_course_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educators_view_course_interactions ON public.adaptive_interactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = adaptive_interactions.course_id) AND ((c.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND ((users.role)::text = 'admin'::text)))))))));


--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: h5p_contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.h5p_contents ENABLE ROW LEVEL SECURITY;

--
-- Name: h5p_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.h5p_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: instructor_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: learner_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learner_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: course_accessibility_categories learners_view_course_access_cats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY learners_view_course_access_cats ON public.course_accessibility_categories FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_accessibility_categories.course_id) AND (((c.status)::text = 'published'::text) OR (c.created_by = auth.uid()))))));


--
-- Name: h5p_contents learners_view_h5p; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY learners_view_h5p ON public.h5p_contents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.enrollments e ON ((e.course_id = l.course_id)))
  WHERE ((l.id = h5p_contents.lesson_id) AND (e.user_id = auth.uid()) AND ((e.status)::text = 'active'::text)))));


--
-- Name: lesson_interactive_content learners_view_interactive_content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY learners_view_interactive_content ON public.lesson_interactive_content FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.enrollments e ON ((e.course_id = l.course_id)))
  WHERE ((l.id = lesson_interactive_content.lesson_id) AND (e.user_id = auth.uid()) AND ((l.status)::text = 'published'::text)))));


--
-- Name: video_questions learners_view_video_questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY learners_view_video_questions ON public.video_questions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.enrollments e ON ((e.course_id = l.course_id)))
  WHERE ((l.id = video_questions.lesson_id) AND (e.user_id = auth.uid()) AND ((e.status)::text = 'active'::text)))));


--
-- Name: lesson_ai_summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_ai_summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_interactive_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_interactive_content ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: media_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications users can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can insert notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: users users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can insert own profile" ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: course_favorites users can manage own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can manage own favorites" ON public.course_favorites USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: users users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can read own profile" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: notifications users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: users users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can update own profile" ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: notifications users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users users read own row and staff rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own row and staff rows" ON public.users FOR SELECT TO authenticated USING (((id = auth.uid()) OR (public.current_user_role() = ANY (ARRAY['admin'::text, 'educator'::text])) OR ((role)::text = ANY ((ARRAY['educator'::character varying, 'admin'::character varying])::text[]))));


--
-- Name: POLICY "users read own row and staff rows" ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "users read own row and staff rows" ON public.users IS 'Learners can read only their own row plus educator/admin rows (needed to show course-creator names). Replaces a policy that exposed every user email to every authenticated account.';


--
-- Name: adaptive_interactions users_insert_own_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_interactions ON public.adaptive_interactions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: adaptive_interactions users_view_own_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own_interactions ON public.adaptive_interactions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: video_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: FUNCTION age_group(profile public.user_profiles); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.age_group(profile public.user_profiles) TO anon;
GRANT ALL ON FUNCTION public.age_group(profile public.user_profiles) TO authenticated;
GRANT ALL ON FUNCTION public.age_group(profile public.user_profiles) TO service_role;


--
-- Name: FUNCTION check_certificate_eligibility(p_enrollment_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_certificate_eligibility(p_enrollment_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_certificate_eligibility(p_enrollment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_certificate_eligibility(p_enrollment_id uuid) TO service_role;


--
-- Name: FUNCTION check_quiz_answer(p_question_id uuid, p_option_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_quiz_answer(p_question_id uuid, p_option_id uuid) TO service_role;


--
-- Name: FUNCTION create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION current_user_role(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_user_role() TO anon;
GRANT ALL ON FUNCTION public.current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.current_user_role() TO service_role;


--
-- Name: FUNCTION generate_certificate_reference(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_certificate_reference() TO anon;
GRANT ALL ON FUNCTION public.generate_certificate_reference() TO authenticated;
GRANT ALL ON FUNCTION public.generate_certificate_reference() TO service_role;


--
-- Name: FUNCTION guard_enrollment_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_enrollment_status() TO anon;
GRANT ALL ON FUNCTION public.guard_enrollment_status() TO authenticated;
GRANT ALL ON FUNCTION public.guard_enrollment_status() TO service_role;


--
-- Name: FUNCTION guard_quiz_attempt_writes(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_quiz_attempt_writes() TO anon;
GRANT ALL ON FUNCTION public.guard_quiz_attempt_writes() TO authenticated;
GRANT ALL ON FUNCTION public.guard_quiz_attempt_writes() TO service_role;


--
-- Name: FUNCTION guard_users_privileged_columns(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_users_privileged_columns() TO anon;
GRANT ALL ON FUNCTION public.guard_users_privileged_columns() TO authenticated;
GRANT ALL ON FUNCTION public.guard_users_privileged_columns() TO service_role;


--
-- Name: FUNCTION handle_new_auth_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_auth_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_auth_user() TO service_role;


--
-- Name: FUNCTION may_see_quiz_answer_key(p_question_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.may_see_quiz_answer_key(p_question_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.may_see_quiz_answer_key(p_question_id uuid) TO anon;
GRANT ALL ON FUNCTION public.may_see_quiz_answer_key(p_question_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.may_see_quiz_answer_key(p_question_id uuid) TO service_role;


--
-- Name: FUNCTION notify_on_course_published(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_on_course_published() TO anon;
GRANT ALL ON FUNCTION public.notify_on_course_published() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_course_published() TO service_role;


--
-- Name: FUNCTION notify_on_enrollment(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_on_enrollment() TO anon;
GRANT ALL ON FUNCTION public.notify_on_enrollment() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_enrollment() TO service_role;


--
-- Name: FUNCTION notify_on_lesson_added(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_on_lesson_added() TO anon;
GRANT ALL ON FUNCTION public.notify_on_lesson_added() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_lesson_added() TO service_role;


--
-- Name: FUNCTION notify_on_lesson_progress(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_on_lesson_progress() TO anon;
GRANT ALL ON FUNCTION public.notify_on_lesson_progress() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_lesson_progress() TO service_role;


--
-- Name: FUNCTION notify_on_quiz_attempt(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notify_on_quiz_attempt() TO anon;
GRANT ALL ON FUNCTION public.notify_on_quiz_attempt() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_quiz_attempt() TO service_role;


--
-- Name: FUNCTION set_interactive_content_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_interactive_content_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_interactive_content_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_interactive_content_updated_at() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) TO anon;
GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb) TO service_role;


--
-- Name: FUNCTION sync_learner_course_state(p_course_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_learner_course_state(p_course_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_learner_course_state(p_course_id uuid) TO anon;
GRANT ALL ON FUNCTION public.sync_learner_course_state(p_course_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.sync_learner_course_state(p_course_id uuid) TO service_role;


--
-- Name: TABLE accessibility_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.accessibility_templates TO anon;
GRANT ALL ON TABLE public.accessibility_templates TO authenticated;
GRANT ALL ON TABLE public.accessibility_templates TO service_role;


--
-- Name: TABLE adaptive_interactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.adaptive_interactions TO anon;
GRANT ALL ON TABLE public.adaptive_interactions TO authenticated;
GRANT ALL ON TABLE public.adaptive_interactions TO service_role;


--
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.certificates TO anon;
GRANT ALL ON TABLE public.certificates TO authenticated;
GRANT ALL ON TABLE public.certificates TO service_role;


--
-- Name: TABLE contact_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contact_messages TO anon;
GRANT ALL ON TABLE public.contact_messages TO authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;


--
-- Name: TABLE course_accessibility_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_accessibility_categories TO anon;
GRANT ALL ON TABLE public.course_accessibility_categories TO authenticated;
GRANT ALL ON TABLE public.course_accessibility_categories TO service_role;


--
-- Name: TABLE course_achievements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_achievements TO anon;
GRANT ALL ON TABLE public.course_achievements TO authenticated;
GRANT ALL ON TABLE public.course_achievements TO service_role;


--
-- Name: TABLE course_chapters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_chapters TO anon;
GRANT ALL ON TABLE public.course_chapters TO authenticated;
GRANT ALL ON TABLE public.course_chapters TO service_role;


--
-- Name: TABLE course_favorites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_favorites TO anon;
GRANT ALL ON TABLE public.course_favorites TO authenticated;
GRANT ALL ON TABLE public.course_favorites TO service_role;


--
-- Name: TABLE course_milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_milestones TO anon;
GRANT ALL ON TABLE public.course_milestones TO authenticated;
GRANT ALL ON TABLE public.course_milestones TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: TABLE enrollments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.enrollments TO anon;
GRANT ALL ON TABLE public.enrollments TO authenticated;
GRANT ALL ON TABLE public.enrollments TO service_role;


--
-- Name: TABLE h5p_contents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.h5p_contents TO anon;
GRANT ALL ON TABLE public.h5p_contents TO authenticated;
GRANT ALL ON TABLE public.h5p_contents TO service_role;


--
-- Name: TABLE h5p_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.h5p_responses TO anon;
GRANT ALL ON TABLE public.h5p_responses TO authenticated;
GRANT ALL ON TABLE public.h5p_responses TO service_role;


--
-- Name: TABLE instructor_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.instructor_applications TO anon;
GRANT ALL ON TABLE public.instructor_applications TO authenticated;
GRANT ALL ON TABLE public.instructor_applications TO service_role;


--
-- Name: TABLE learner_checkpoints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.learner_checkpoints TO anon;
GRANT ALL ON TABLE public.learner_checkpoints TO authenticated;
GRANT ALL ON TABLE public.learner_checkpoints TO service_role;


--
-- Name: TABLE lesson_ai_summaries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_ai_summaries TO anon;
GRANT ALL ON TABLE public.lesson_ai_summaries TO authenticated;
GRANT ALL ON TABLE public.lesson_ai_summaries TO service_role;


--
-- Name: TABLE lesson_checkpoints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_checkpoints TO anon;
GRANT ALL ON TABLE public.lesson_checkpoints TO authenticated;
GRANT ALL ON TABLE public.lesson_checkpoints TO service_role;


--
-- Name: TABLE lesson_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_comments TO anon;
GRANT ALL ON TABLE public.lesson_comments TO authenticated;
GRANT ALL ON TABLE public.lesson_comments TO service_role;


--
-- Name: TABLE lesson_interactive_content; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_interactive_content TO anon;
GRANT ALL ON TABLE public.lesson_interactive_content TO authenticated;
GRANT ALL ON TABLE public.lesson_interactive_content TO service_role;


--
-- Name: TABLE lesson_progress; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_progress TO anon;
GRANT ALL ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;


--
-- Name: TABLE lesson_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_templates TO anon;
GRANT ALL ON TABLE public.lesson_templates TO authenticated;
GRANT ALL ON TABLE public.lesson_templates TO service_role;


--
-- Name: TABLE lesson_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_versions TO anon;
GRANT ALL ON TABLE public.lesson_versions TO authenticated;
GRANT ALL ON TABLE public.lesson_versions TO service_role;


--
-- Name: TABLE lessons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;


--
-- Name: TABLE media_assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.media_assets TO anon;
GRANT ALL ON TABLE public.media_assets TO authenticated;
GRANT ALL ON TABLE public.media_assets TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE quiz_answers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_answers TO anon;
GRANT ALL ON TABLE public.quiz_answers TO authenticated;
GRANT ALL ON TABLE public.quiz_answers TO service_role;


--
-- Name: TABLE quiz_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_attempts TO anon;
GRANT ALL ON TABLE public.quiz_attempts TO authenticated;
GRANT ALL ON TABLE public.quiz_attempts TO service_role;


--
-- Name: TABLE quiz_options; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_options TO anon;
GRANT ALL ON TABLE public.quiz_options TO authenticated;
GRANT ALL ON TABLE public.quiz_options TO service_role;


--
-- Name: TABLE quiz_options_scoped; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_options_scoped TO anon;
GRANT ALL ON TABLE public.quiz_options_scoped TO authenticated;
GRANT ALL ON TABLE public.quiz_options_scoped TO service_role;


--
-- Name: TABLE quiz_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quiz_questions TO anon;
GRANT ALL ON TABLE public.quiz_questions TO authenticated;
GRANT ALL ON TABLE public.quiz_questions TO service_role;


--
-- Name: TABLE quizzes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quizzes TO anon;
GRANT ALL ON TABLE public.quizzes TO authenticated;
GRANT ALL ON TABLE public.quizzes TO service_role;


--
-- Name: TABLE recommendations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recommendations TO anon;
GRANT ALL ON TABLE public.recommendations TO authenticated;
GRANT ALL ON TABLE public.recommendations TO service_role;


--
-- Name: TABLE referral_codes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.referral_codes TO anon;
GRANT ALL ON TABLE public.referral_codes TO authenticated;
GRANT ALL ON TABLE public.referral_codes TO service_role;


--
-- Name: TABLE user_achievements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_achievements TO anon;
GRANT ALL ON TABLE public.user_achievements TO authenticated;
GRANT ALL ON TABLE public.user_achievements TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE video_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.video_questions TO anon;
GRANT ALL ON TABLE public.video_questions TO authenticated;
GRANT ALL ON TABLE public.video_questions TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


