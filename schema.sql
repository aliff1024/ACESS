


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_certificate_eligibility"("p_enrollment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."check_certificate_eligibility"("p_enrollment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_certificate_reference"() RETURNS "text"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."generate_certificate_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'learner')
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_course_published"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."notify_on_course_published"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."notify_on_enrollment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_lesson_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."notify_on_lesson_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_lesson_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."notify_on_lesson_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_quiz_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."notify_on_quiz_attempt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."certificate_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "layout_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificate_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificate_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "certificate_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "verified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificate_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "reference_code" character varying NOT NULL,
    "pdf_url" character varying,
    "status" character varying DEFAULT 'issued'::character varying NOT NULL,
    "issued_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp without time zone,
    "revoke_reason" "text",
    "course_id" "uuid",
    "user_id" "uuid",
    "learner_name" "text",
    "course_title" "text",
    "educator_name" "text",
    "institution_name" "text" DEFAULT 'ACESS Platform'::"text",
    "completion_date" timestamp with time zone,
    "verification_url" "text",
    "skills_earned" "text"[] DEFAULT '{}'::"text"[],
    "course_duration_hours" numeric DEFAULT 0,
    "signed_token" "text",
    "template_id" "text" DEFAULT 'default'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "certificates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['issued'::character varying, 'revoked'::character varying])::"text"[]))),
    CONSTRAINT "chk_revoke_consistency" CHECK ((((("status")::"text" = 'revoked'::"text") AND ("revoked_at" IS NOT NULL)) OR ((("status")::"text" = 'issued'::"text") AND ("revoked_at" IS NULL))))
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'unread'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_messages_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'technical'::"text", 'instructor_application'::"text", 'accessibility'::"text", 'feedback'::"text"]))),
    CONSTRAINT "contact_messages_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text", 'replied'::"text"])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_chapters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "required_completion_pct" integer DEFAULT 100 NOT NULL,
    "icon" "text",
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "course_milestones_required_completion_pct_check" CHECK ((("required_completion_pct" >= 0) AND ("required_completion_pct" <= 100)))
);


ALTER TABLE "public"."course_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "tag" character varying NOT NULL
);


ALTER TABLE "public"."course_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" character varying NOT NULL,
    "slug" character varying NOT NULL,
    "description" "text",
    "status" character varying DEFAULT 'draft'::character varying NOT NULL,
    "difficulty_level" character varying,
    "thumbnail_url" character varying,
    "published_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "category" "text",
    "course_type" "text" DEFAULT 'educator'::"text" NOT NULL,
    "system_course" boolean DEFAULT false NOT NULL,
    "built_in_course" boolean DEFAULT false NOT NULL,
    "created_by_role" "text" DEFAULT 'educator'::"text" NOT NULL,
    "guided_learning_enabled" boolean DEFAULT false NOT NULL,
    "official_course_order" integer,
    "managed_by_admin" boolean DEFAULT false NOT NULL,
    "recommended_age_group" "text",
    "learning_streaks_enabled" boolean DEFAULT false NOT NULL,
    "milestone_tracking_enabled" boolean DEFAULT false NOT NULL,
    "accessibility_mode_enabled" boolean DEFAULT false NOT NULL,
    "course_layout_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "chapter_organization_enabled" boolean DEFAULT false NOT NULL,
    "certificate_enabled" boolean DEFAULT false,
    "certificate_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "certification_locked" boolean DEFAULT false,
    "supports_tts" boolean DEFAULT false,
    "supports_transcripts" boolean DEFAULT false,
    "supports_focus_mode" boolean DEFAULT false,
    "supports_chunked_learning" boolean DEFAULT false,
    CONSTRAINT "courses_course_layout_type_check" CHECK (("course_layout_type" = ANY (ARRAY['standard'::"text", 'guided'::"text", 'simplified'::"text", 'focused'::"text"]))),
    CONSTRAINT "courses_course_type_check" CHECK (("course_type" = ANY (ARRAY['educator'::"text", 'system'::"text"]))),
    CONSTRAINT "courses_created_by_role_check" CHECK (("created_by_role" = ANY (ARRAY['educator'::"text", 'admin'::"text"]))),
    CONSTRAINT "courses_difficulty_level_check" CHECK ((("difficulty_level")::"text" = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying])::"text"[]))),
    CONSTRAINT "courses_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'published'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_accessibility_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "accessibility_category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_accessibility_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_accessibility_categories" IS 'Many-to-many: courses tagged with accessibility categories for discoverability';


CREATE TABLE IF NOT EXISTS "public"."accessibility_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "target_disability" "text" NOT NULL,
    "content_structure" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accessibility_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."accessibility_templates" IS 'Predefined lesson structure templates keyed to disability types';


COMMENT ON COLUMN "public"."accessibility_templates"."content_structure" IS 'JSON array of typed sections';


CREATE TABLE IF NOT EXISTS "public"."adaptive_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "course_id" "uuid",
    "adaptation_used" "text" NOT NULL,
    "session_id" "text",
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."adaptive_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."adaptive_interactions" IS 'Analytics: tracks which accessibility adaptations learners actually use';


COMMENT ON COLUMN "public"."adaptive_interactions"."adaptation_used" IS 'tts | focus_mode | chunked_content | simplified_summary | captions | slideshow | guided_mode';


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrolled_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp without time zone,
    "status" character varying DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT "enrollments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'dropped'::character varying])::"text"[])))
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructor_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "experience" "text",
    "reason" "text",
    "portfolio_links" "text",
    "referral_code" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "instructor_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'request_info'::"text"])))
);


ALTER TABLE "public"."instructor_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learner_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "checkpoint_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."learner_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learner_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "milestone_id" "uuid" NOT NULL,
    "achieved" boolean DEFAULT false NOT NULL,
    "achieved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."learner_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learner_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "disability_type" character varying,
    "preferred_font_size" character varying DEFAULT 'md'::character varying NOT NULL,
    "preferred_theme" character varying DEFAULT 'light'::character varying NOT NULL,
    "line_spacing" character varying DEFAULT 'normal'::character varying NOT NULL,
    "tts_enabled" boolean DEFAULT false NOT NULL,
    "learning_goals" "text",
    "onboarded_at" timestamp without time zone,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "learner_profiles_disability_type_check" CHECK ((("disability_type")::"text" = ANY ((ARRAY['dyslexia'::character varying, 'adhd'::character varying, 'mild_cognitive_impairment'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "learner_profiles_line_spacing_check" CHECK ((("line_spacing")::"text" = ANY ((ARRAY['normal'::character varying, 'relaxed'::character varying, 'loose'::character varying])::"text"[]))),
    CONSTRAINT "learner_profiles_preferred_font_size_check" CHECK ((("preferred_font_size")::"text" = ANY ((ARRAY['sm'::character varying, 'md'::character varying, 'lg'::character varying, 'xl'::character varying])::"text"[]))),
    CONSTRAINT "learner_profiles_preferred_theme_check" CHECK ((("preferred_theme")::"text" = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'highContrast'::character varying])::"text"[])))
);


ALTER TABLE "public"."learner_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text",
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lesson_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "checkpoint_type" "text" DEFAULT 'reflection'::"text" NOT NULL,
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lesson_checkpoints_checkpoint_type_check" CHECK (("checkpoint_type" = ANY (ARRAY['reflection'::"text", 'practice'::"text", 'quiz'::"text", 'activity'::"text", 'milestone'::"text"])))
);


ALTER TABLE "public"."lesson_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "is_viewed" boolean DEFAULT false NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "first_viewed_at" timestamp without time zone,
    "last_viewed_at" timestamp without time zone,
    "checkpoint_completed" boolean DEFAULT false NOT NULL,
    "time_spent_learning" integer DEFAULT 0 NOT NULL,
    "assisted_learning_mode" boolean DEFAULT false NOT NULL,
    "summary_completed" boolean DEFAULT false,
    CONSTRAINT "lesson_progress_view_count_check" CHECK (("view_count" >= 0))
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "word_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'draft'::"text",
    "ai_feedback" "text",
    "educator_feedback" "text",
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lesson_summaries_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'reviewed'::"text"])))
);


ALTER TABLE "public"."lesson_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "lesson_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "content_html" "text",
    "estimated_duration" integer,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lesson_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" character varying NOT NULL,
    "content_html" "text",
    "video_url" character varying,
    "transcript" "text",
    "sequence_order" integer NOT NULL,
    "status" character varying DEFAULT 'draft'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "estimated_duration" integer,
    "prerequisite_lesson_id" "uuid",
    "simplified_summary" "text",
    "accessibility_notes" "text",
    "focus_mode_enabled" boolean DEFAULT false NOT NULL,
    "chunked_content_enabled" boolean DEFAULT false NOT NULL,
    "lesson_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "chapter_id" "uuid",
    "chapter_title" "text",
    "learning_objectives" "text",
    "is_template" boolean DEFAULT false NOT NULL,
    "template_id" "uuid",
    "scheduled_release_at" timestamp with time zone,
    "visibility_status" "text" DEFAULT 'visible'::"text" NOT NULL,
    "checkpoints_enabled" boolean DEFAULT false NOT NULL,
    "adaptive_learning_enabled" boolean DEFAULT false NOT NULL,
    "has_video" boolean DEFAULT true,
    "has_pdf" boolean DEFAULT true,
    "has_quiz" boolean DEFAULT true,
    "has_transcript" boolean DEFAULT true,
    "has_summary_activity" boolean DEFAULT false,
    "summary_source" "text" DEFAULT 'entire_lesson'::"text",
    "summary_word_target" integer DEFAULT 100,
    "summary_key_points" "jsonb" DEFAULT '[]'::"jsonb",
    "summary_reflection_questions" "jsonb" DEFAULT '[]'::"jsonb",
    "summary_ai_feedback_enabled" boolean DEFAULT false,
    "lesson_layout" "text" DEFAULT 'standard'::"text",
    "interactive_activity_type" "text",
    CONSTRAINT "lessons_lesson_layout_check" CHECK (("lesson_layout" = ANY (ARRAY['standard'::"text", 'focus'::"text", 'two_column'::"text", 'wide'::"text"]))),
    CONSTRAINT "lessons_lesson_type_check" CHECK (("lesson_type" = ANY (ARRAY['standard'::"text", 'video'::"text", 'quiz'::"text", 'practice'::"text", 'reading'::"text", 'assessment'::"text"]))),
    CONSTRAINT "lessons_sequence_order_check" CHECK (("sequence_order" > 0)),
    CONSTRAINT "lessons_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::"text"[]))),
    CONSTRAINT "lessons_summary_source_check" CHECK (("summary_source" = ANY (ARRAY['video'::"text", 'pdf'::"text", 'lesson_text'::"text", 'entire_lesson'::"text"]))),
    CONSTRAINT "lessons_visibility_status_check" CHECK (("visibility_status" = ANY (ARRAY['visible'::"text", 'hidden'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_option_id" "uuid",
    "is_correct" boolean
);


ALTER TABLE "public"."quiz_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "attempt_number" integer NOT NULL,
    "score_pct" integer,
    "result" character varying DEFAULT 'in_progress'::character varying NOT NULL,
    "started_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp without time zone,
    CONSTRAINT "quiz_attempts_attempt_number_check" CHECK (("attempt_number" > 0)),
    CONSTRAINT "quiz_attempts_result_check" CHECK ((("result")::"text" = ANY ((ARRAY['pass'::character varying, 'fail'::character varying, 'in_progress'::character varying])::"text"[]))),
    CONSTRAINT "quiz_attempts_score_pct_check" CHECK ((("score_pct" >= 0) AND ("score_pct" <= 100)))
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "sequence_order" integer NOT NULL,
    CONSTRAINT "quiz_options_sequence_order_check" CHECK (("sequence_order" > 0))
);


ALTER TABLE "public"."quiz_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" character varying NOT NULL,
    "sequence_order" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_questions_question_type_check" CHECK ((("question_type")::"text" = ANY ((ARRAY['multiple_choice'::character varying, 'scenario'::character varying])::"text"[]))),
    CONSTRAINT "quiz_questions_sequence_order_check" CHECK (("sequence_order" > 0))
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "title" character varying NOT NULL,
    "time_limit_seconds" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 0 NOT NULL,
    "pass_threshold_pct" integer DEFAULT 60 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quizzes_max_attempts_check" CHECK (("max_attempts" >= 0)),
    CONSTRAINT "quizzes_pass_threshold_pct_check" CHECK ((("pass_threshold_pct" >= 0) AND ("pass_threshold_pct" <= 100))),
    CONSTRAINT "quizzes_time_limit_seconds_check" CHECK (("time_limit_seconds" >= 0))
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "recommended_lesson_id" "uuid" NOT NULL,
    "difficulty_tier" character varying NOT NULL,
    "trigger_reason" "text",
    "is_acknowledged" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recommendations_difficulty_tier_check" CHECK ((("difficulty_tier")::"text" = ANY ((ARRAY['revision'::character varying, 'standard'::character varying, 'advanced'::character varying])::"text"[])))
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "user_id" "uuid",
    "usage_count" integer DEFAULT 0,
    "max_uses" integer DEFAULT 50,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_accessibility_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferred_text_size" "text" DEFAULT 'medium'::"text",
    "preferred_reading_mode" "text" DEFAULT 'standard'::"text",
    "reduced_stimulation_mode" boolean DEFAULT false NOT NULL,
    "text_to_speech_enabled" boolean DEFAULT false NOT NULL,
    "simplified_navigation_enabled" boolean DEFAULT false NOT NULL,
    "dyslexia_friendly_font" boolean DEFAULT false NOT NULL,
    "focus_mode_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_accessibility_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_accessibility_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "disability_type" "text",
    "preferred_font_size" "text" DEFAULT 'medium'::"text",
    "preferred_theme" "text" DEFAULT 'system'::"text",
    "line_spacing" "text" DEFAULT 'normal'::"text",
    "tts_enabled" boolean DEFAULT false,
    "captions_enabled" boolean DEFAULT false,
    "screen_reader_optimized" boolean DEFAULT false,
    "keyboard_navigation_enabled" boolean DEFAULT false,
    "reduced_motion" boolean DEFAULT false,
    "simplified_ui" boolean DEFAULT false,
    "dyslexia_friendly_font" boolean DEFAULT false,
    "preferred_reading_level" "text",
    "preferred_content_format" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "preferred_font" "text" DEFAULT 'default'::"text",
    "preferred_language" "text" DEFAULT 'en'::"text",
    "tts_rate" real DEFAULT 1.0,
    "tts_voice_uri" "text",
    "custom_notes" "text"
);



ALTER TABLE "public"."user_accessibility_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_accessibility_settings" IS 'Replaces learner_profiles. Covers all users (not just learners) with richer accessibility options.';



COMMENT ON COLUMN "public"."user_accessibility_settings"."preferred_font" IS 'Font preference: default, serif, sans_serif, dyslexia';



COMMENT ON COLUMN "public"."user_accessibility_settings"."preferred_language" IS 'Language preference: en (English) or ms (Bahasa Melayu)';



COMMENT ON COLUMN "public"."user_accessibility_settings"."tts_rate" IS 'Speech synthesis rate multiplier (e.g. 0.75, 1.0, 1.5)';



COMMENT ON COLUMN "public"."user_accessibility_settings"."tts_voice_uri" IS 'Browser speechSynthesis voice URI preference';



CREATE TABLE IF NOT EXISTS "public"."user_notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "course_updates" boolean DEFAULT true,
    "certificate_notifications" boolean DEFAULT true,
    "marketing_notifications" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_notification_settings" IS 'Per-user notification preferences. All new â€” no conflicts with existing schema.';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "phone_number" "text",
    "birth_date" "date",
    "bio" "text",
    "country" "text",
    "preferred_language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Extended identity fields for all users. full_name and email live in public.users.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" character varying NOT NULL,
    "role" character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "email_verified_at" timestamp without time zone,
    "last_login_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "full_name" "text",
    "instructor_application_status" "text",
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['learner'::character varying, 'educator'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."certificate_templates"
    ADD CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificate_verifications"
    ADD CONSTRAINT "certificate_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_enrollment_id_key" UNIQUE ("enrollment_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_reference_code_key" UNIQUE ("reference_code");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_chapters"
    ADD CONSTRAINT "course_chapters_course_id_sequence_order_key" UNIQUE ("course_id", "sequence_order");



ALTER TABLE ONLY "public"."course_chapters"
    ADD CONSTRAINT "course_chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_accessibility_categories"
    ADD CONSTRAINT "course_accessibility_categories_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."accessibility_templates"
    ADD CONSTRAINT "accessibility_templates_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."adaptive_interactions"
    ADD CONSTRAINT "adaptive_interactions_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_milestones"
    ADD CONSTRAINT "course_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_course_id_tag_key" UNIQUE ("course_id", "tag");



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."instructor_applications"
    ADD CONSTRAINT "instructor_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learner_checkpoints"
    ADD CONSTRAINT "learner_checkpoints_enrollment_id_checkpoint_id_key" UNIQUE ("enrollment_id", "checkpoint_id");



ALTER TABLE ONLY "public"."learner_checkpoints"
    ADD CONSTRAINT "learner_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learner_milestones"
    ADD CONSTRAINT "learner_milestones_enrollment_id_milestone_id_key" UNIQUE ("enrollment_id", "milestone_id");



ALTER TABLE ONLY "public"."learner_milestones"
    ADD CONSTRAINT "learner_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learner_profiles"
    ADD CONSTRAINT "learner_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learner_profiles"
    ADD CONSTRAINT "learner_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."lesson_assets"
    ADD CONSTRAINT "lesson_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_checkpoints"
    ADD CONSTRAINT "lesson_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_enrollment_id_lesson_id_key" UNIQUE ("enrollment_id", "lesson_id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_summaries"
    ADD CONSTRAINT "lesson_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_summaries"
    ADD CONSTRAINT "lesson_summaries_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lesson_templates"
    ADD CONSTRAINT "lesson_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_course_id_sequence_order_key" UNIQUE ("course_id", "sequence_order");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_attempt_id_question_id_key" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_enrollment_id_quiz_id_attempt_number_key" UNIQUE ("enrollment_id", "quiz_id", "attempt_number");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_sequence_order_key" UNIQUE ("question_id", "sequence_order");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_sequence_order_key" UNIQUE ("quiz_id", "sequence_order");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_accessibility_preferences"
    ADD CONSTRAINT "user_accessibility_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_accessibility_preferences"
    ADD CONSTRAINT "user_accessibility_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_accessibility_settings"
    ADD CONSTRAINT "user_accessibility_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_accessibility_settings"
    ADD CONSTRAINT "user_accessibility_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_course_accessibility_categories_unique" ON "public"."course_accessibility_categories" USING "btree" ("course_id", "accessibility_category");


CREATE INDEX "idx_accessibility_user_id" ON "public"."user_accessibility_settings" USING "btree" ("user_id");



CREATE INDEX "idx_certificate_verifications_cert_id" ON "public"."certificate_verifications" USING "btree" ("certificate_id");



CREATE INDEX "idx_certificates_course_id" ON "public"."certificates" USING "btree" ("course_id");



CREATE INDEX "idx_certificates_enrollment" ON "public"."certificates" USING "btree" ("enrollment_id");



CREATE INDEX "idx_certificates_enrollment_id" ON "public"."certificates" USING "btree" ("enrollment_id");



CREATE INDEX "idx_certificates_reference_code" ON "public"."certificates" USING "btree" ("reference_code");



CREATE INDEX "idx_certificates_status" ON "public"."certificates" USING "btree" ("status");



CREATE INDEX "idx_certificates_user_id" ON "public"."certificates" USING "btree" ("user_id");



CREATE INDEX "idx_contact_messages_category" ON "public"."contact_messages" USING "btree" ("category");



CREATE INDEX "idx_contact_messages_status" ON "public"."contact_messages" USING "btree" ("status");



CREATE INDEX "idx_course_chapters_course" ON "public"."course_chapters" USING "btree" ("course_id");



CREATE INDEX "idx_course_favorites_user" ON "public"."course_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_course_milestones_course" ON "public"."course_milestones" USING "btree" ("course_id");



CREATE INDEX "idx_course_tags_course" ON "public"."course_tags" USING "btree" ("course_id");



CREATE INDEX "idx_course_tags_tag" ON "public"."course_tags" USING "btree" ("tag");



CREATE INDEX "idx_courses_course_type" ON "public"."courses" USING "btree" ("course_type");



CREATE INDEX "idx_courses_created_by" ON "public"."courses" USING "btree" ("created_by");



CREATE INDEX "idx_courses_published" ON "public"."courses" USING "btree" ("id") WHERE (("deleted_at" IS NULL) AND (("status")::"text" = 'published'::"text"));



CREATE INDEX "idx_courses_status" ON "public"."courses" USING "btree" ("status");



CREATE INDEX "idx_courses_system_course" ON "public"."courses" USING "btree" ("system_course");



CREATE INDEX "idx_enrollments_course" ON "public"."enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enrollments_status" ON "public"."enrollments" USING "btree" ("status");



CREATE INDEX "idx_enrollments_user" ON "public"."enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_instructor_applications_status" ON "public"."instructor_applications" USING "btree" ("status");



CREATE INDEX "idx_instructor_applications_user_id" ON "public"."instructor_applications" USING "btree" ("user_id");



CREATE INDEX "idx_learner_checkpoints_enrollment" ON "public"."learner_checkpoints" USING "btree" ("enrollment_id");



CREATE INDEX "idx_learner_milestones_enrollment" ON "public"."learner_milestones" USING "btree" ("enrollment_id");



CREATE INDEX "idx_lesson_checkpoints_lesson" ON "public"."lesson_checkpoints" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_progress_enrollment" ON "public"."lesson_progress" USING "btree" ("enrollment_id");



CREATE INDEX "idx_lesson_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_summaries_enrollment" ON "public"."lesson_summaries" USING "btree" ("enrollment_id");



CREATE INDEX "idx_lesson_summaries_lesson" ON "public"."lesson_summaries" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_summaries_user" ON "public"."lesson_summaries" USING "btree" ("user_id");



CREATE INDEX "idx_lessons_chapter" ON "public"."lessons" USING "btree" ("chapter_id");



CREATE INDEX "idx_lessons_course" ON "public"."lessons" USING "btree" ("course_id");



CREATE INDEX "idx_lessons_prerequisite" ON "public"."lessons" USING "btree" ("prerequisite_lesson_id");



CREATE INDEX "idx_notification_user_id" ON "public"."user_notification_settings" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_password_reset_tokens_email" ON "public"."password_reset_tokens" USING "btree" ("email");



CREATE INDEX "idx_password_reset_tokens_token" ON "public"."password_reset_tokens" USING "btree" ("token");



CREATE INDEX "idx_quiz_answers_attempt" ON "public"."quiz_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_quiz_answers_question" ON "public"."quiz_answers" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_attempts_enrollment" ON "public"."quiz_attempts" USING "btree" ("enrollment_id");



CREATE INDEX "idx_quiz_attempts_quiz" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_result" ON "public"."quiz_attempts" USING "btree" ("result");



CREATE INDEX "idx_quiz_options_question" ON "public"."quiz_options" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_recommendations_enrollment" ON "public"."recommendations" USING "btree" ("enrollment_id");



CREATE INDEX "idx_recommendations_lesson" ON "public"."recommendations" USING "btree" ("recommended_lesson_id");



CREATE INDEX "idx_recommendations_unread" ON "public"."recommendations" USING "btree" ("enrollment_id") WHERE ("is_acknowledged" = false);



CREATE INDEX "idx_referral_codes_code" ON "public"."referral_codes" USING "btree" ("code");



CREATE INDEX "idx_user_accessibility_prefs" ON "public"."user_accessibility_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "lesson_assets_lesson_id_idx" ON "public"."lesson_assets" USING "btree" ("lesson_id");



CREATE OR REPLACE TRIGGER "learner_profiles_set_updated_at" BEFORE UPDATE ON "public"."learner_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "lesson_assets_set_updated_at" BEFORE UPDATE ON "public"."lesson_assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_course_published_notify" AFTER UPDATE OF "status" ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_course_published"();



CREATE OR REPLACE TRIGGER "on_enrollment_notify" AFTER INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_enrollment"();



CREATE OR REPLACE TRIGGER "on_lesson_added_notify" AFTER INSERT ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_lesson_added"();



CREATE OR REPLACE TRIGGER "on_lesson_progress_notify" AFTER INSERT ON "public"."lesson_progress" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_lesson_progress"();



CREATE OR REPLACE TRIGGER "on_quiz_attempt_notify" AFTER INSERT ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_quiz_attempt"();



CREATE OR REPLACE TRIGGER "set_accessibility_updated_at" BEFORE UPDATE ON "public"."user_accessibility_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_notification_updated_at" BEFORE UPDATE ON "public"."user_notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_learner_profiles_updated_at" BEFORE UPDATE ON "public"."learner_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quiz_questions_updated_at" BEFORE UPDATE ON "public"."quiz_questions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quizzes_updated_at" BEFORE UPDATE ON "public"."quizzes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."certificate_verifications"
    ADD CONSTRAINT "certificate_verifications_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_chapters"
    ADD CONSTRAINT "course_chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_accessibility_categories_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."adaptive_interactions"
    ADD CONSTRAINT "adaptive_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."adaptive_interactions"
    ADD CONSTRAINT "adaptive_interactions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "public"."adaptive_interactions"
    ADD CONSTRAINT "adaptive_interactions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_milestones"
    ADD CONSTRAINT "course_milestones_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tags"
    ADD CONSTRAINT "course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_applications"
    ADD CONSTRAINT "instructor_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."instructor_applications"
    ADD CONSTRAINT "instructor_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learner_checkpoints"
    ADD CONSTRAINT "learner_checkpoints_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."lesson_checkpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learner_checkpoints"
    ADD CONSTRAINT "learner_checkpoints_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learner_milestones"
    ADD CONSTRAINT "learner_milestones_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learner_milestones"
    ADD CONSTRAINT "learner_milestones_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."course_milestones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learner_profiles"
    ADD CONSTRAINT "learner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_assets"
    ADD CONSTRAINT "lesson_assets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_checkpoints"
    ADD CONSTRAINT "lesson_checkpoints_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_summaries"
    ADD CONSTRAINT "lesson_summaries_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_summaries"
    ADD CONSTRAINT "lesson_summaries_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_summaries"
    ADD CONSTRAINT "lesson_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_templates"
    ADD CONSTRAINT "lesson_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_prerequisite_lesson_id_fkey" FOREIGN KEY ("prerequisite_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_answers"
    ADD CONSTRAINT "quiz_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."quiz_options"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_recommended_lesson_id_fkey" FOREIGN KEY ("recommended_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_accessibility_preferences"
    ADD CONSTRAINT "user_accessibility_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_accessibility_settings"
    ADD CONSTRAINT "user_accessibility_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all applications" ON "public"."instructor_applications" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view all referral codes" ON "public"."referral_codes" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view contact messages" ON "public"."contact_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Anyone can submit contact message" ON "public"."contact_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own accessibility settings" ON "public"."user_accessibility_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own application" ON "public"."instructor_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notification settings" ON "public"."user_notification_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert referral codes" ON "public"."referral_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can view course accessibility categories" ON "public"."course_accessibility_categories" FOR SELECT USING (true);

CREATE POLICY "educators can manage course accessibility categories" ON "public"."course_accessibility_categories" FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM "public"."courses" WHERE (("courses"."id" = "course_accessibility_categories"."course_id") AND ("courses"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS (SELECT 1 FROM "public"."courses" WHERE (("courses"."id" = "course_accessibility_categories"."course_id") AND ("courses"."created_by" = "auth"."uid"())))));

CREATE POLICY "users can insert own interactions" ON "public"."adaptive_interactions" FOR INSERT TO authenticated WITH CHECK ("user_id" = "auth"."uid"());

CREATE POLICY "users can view own interactions" ON "public"."adaptive_interactions" FOR SELECT TO authenticated USING ("user_id" = "auth"."uid"());

CREATE POLICY "educators can view course interactions" ON "public"."adaptive_interactions" FOR SELECT TO authenticated USING ((EXISTS (SELECT 1 FROM "public"."courses" WHERE (("courses"."id" = "adaptive_interactions"."course_id") AND (("courses"."created_by" = "auth"."uid"()) OR (EXISTS (SELECT 1 FROM "public"."users" WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))))))));

CREATE POLICY "Users can update own accessibility settings" ON "public"."user_accessibility_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notification settings" ON "public"."user_notification_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own accessibility settings" ON "public"."user_accessibility_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own applications" ON "public"."instructor_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification settings" ON "public"."user_notification_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own referral codes" ON "public"."referral_codes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own summaries" ON "public"."lesson_summaries" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "admins can update all users" ON "public"."users" FOR UPDATE USING (( SELECT ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK (( SELECT ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "authenticated users can read all users" ON "public"."users" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "cert_templates_select_policy" ON "public"."certificate_templates" FOR SELECT USING (true);



CREATE POLICY "cert_verifications_insert_policy" ON "public"."certificate_verifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "cert_verifications_select_policy" ON "public"."certificate_verifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



ALTER TABLE "public"."certificate_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificate_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificates_insert_policy" ON "public"."certificates" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "certificates_select_policy" ON "public"."certificates" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "c"."created_by"
   FROM "public"."courses" "c"
  WHERE ("c"."id" = "certificates"."course_id"))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text"))))));



CREATE POLICY "certificates_update_policy" ON "public"."certificates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = 'admin'::"text")))));



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "educators can delete lesson assets" ON "public"."lesson_assets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."courses" "c" ON (("c"."id" = "l"."course_id")))
  WHERE (("l"."id" = "lesson_assets"."lesson_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "educators can insert lesson assets" ON "public"."lesson_assets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."courses" "c" ON (("c"."id" = "l"."course_id")))
  WHERE (("l"."id" = "lesson_assets"."lesson_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "educators can read lesson assets" ON "public"."lesson_assets" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."courses" "c" ON (("c"."id" = "l"."course_id")))
  WHERE (("l"."id" = "lesson_assets"."lesson_id") AND ("c"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."lessons" "l"
     JOIN "public"."courses" "c" ON (("c"."id" = "l"."course_id")))
     JOIN "public"."enrollments" "e" ON (("e"."course_id" = "c"."id")))
  WHERE (("l"."id" = "lesson_assets"."lesson_id") AND ("e"."user_id" = "auth"."uid"()) AND (("c"."status")::"text" = 'published'::"text"))))));



CREATE POLICY "educators can view lesson assets" ON "public"."lesson_assets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."lessons" "l"
     JOIN "public"."courses" "c" ON (("c"."id" = "l"."course_id")))
  WHERE (("l"."id" = "lesson_assets"."lesson_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."instructor_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_accessibility_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accessibility_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."adaptive_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_accessibility_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users can manage own favorites" ON "public"."course_favorites" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can read own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_certificate_eligibility"("p_enrollment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_certificate_eligibility"("p_enrollment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_certificate_eligibility"("p_enrollment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_certificate_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_certificate_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_certificate_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_course_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_course_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_course_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_enrollment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_enrollment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_enrollment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_lesson_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_lesson_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."certificate_templates" TO "anon";
GRANT ALL ON TABLE "public"."certificate_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_templates" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_verifications" TO "anon";
GRANT ALL ON TABLE "public"."certificate_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."course_chapters" TO "anon";
GRANT ALL ON TABLE "public"."course_chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."course_chapters" TO "service_role";



GRANT ALL ON TABLE "public"."course_favorites" TO "anon";
GRANT ALL ON TABLE "public"."course_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."course_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."course_milestones" TO "anon";
GRANT ALL ON TABLE "public"."course_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."course_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."course_tags" TO "anon";
GRANT ALL ON TABLE "public"."course_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."course_tags" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."instructor_applications" TO "anon";
GRANT ALL ON TABLE "public"."instructor_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."instructor_applications" TO "service_role";



GRANT ALL ON TABLE "public"."learner_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."learner_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."learner_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."learner_milestones" TO "anon";
GRANT ALL ON TABLE "public"."learner_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."learner_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."learner_profiles" TO "anon";
GRANT ALL ON TABLE "public"."learner_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."learner_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_assets" TO "anon";
GRANT ALL ON TABLE "public"."lesson_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_assets" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."lesson_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_summaries" TO "anon";
GRANT ALL ON TABLE "public"."lesson_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_templates" TO "anon";
GRANT ALL ON TABLE "public"."lesson_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_templates" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_answers" TO "anon";
GRANT ALL ON TABLE "public"."quiz_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_answers" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_options" TO "anon";
GRANT ALL ON TABLE "public"."quiz_options" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_options" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."user_accessibility_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_accessibility_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_accessibility_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."course_accessibility_categories" TO "anon";
GRANT ALL ON TABLE "public"."course_accessibility_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."course_accessibility_categories" TO "service_role";

GRANT ALL ON TABLE "public"."accessibility_templates" TO "anon";
GRANT ALL ON TABLE "public"."accessibility_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."accessibility_templates" TO "service_role";

GRANT ALL ON TABLE "public"."adaptive_interactions" TO "anon";
GRANT ALL ON TABLE "public"."adaptive_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."adaptive_interactions" TO "service_role";

GRANT ALL ON TABLE "public"."user_accessibility_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_accessibility_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_accessibility_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";









































