-- Run this in your Supabase dashboard: SQL Editor > New Query
-- Creates the notifications table + database triggers for automatic notification generation.

-- ─── 1. Notifications Table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,          -- 'enrollment', 'lesson_completed', 'quiz_completed', 'lesson_added', 'course_published'
    title TEXT NOT NULL,
    body TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ─── 2. SECURITY DEFINER Function (bypasses RLS for cross-user insert) ─

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- ─── 3. Trigger: Enrollment → notify educator ──────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_enrollment_notify ON public.enrollments;
CREATE TRIGGER on_enrollment_notify
    AFTER INSERT ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_enrollment();

-- ─── 4. Trigger: Lesson progress (first view) → notify educator ────────

CREATE OR REPLACE FUNCTION public.notify_on_lesson_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_lesson_progress_notify ON public.lesson_progress;
CREATE TRIGGER on_lesson_progress_notify
    AFTER INSERT ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_lesson_progress();

-- ─── 5. Trigger: Quiz attempt → notify educator ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_quiz_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_quiz_attempt_notify ON public.quiz_attempts;
CREATE TRIGGER on_quiz_attempt_notify
    AFTER INSERT ON public.quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_quiz_attempt();

-- ─── 6. Trigger: Lesson added → notify enrolled learners ──────────────

CREATE OR REPLACE FUNCTION public.notify_on_lesson_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_lesson_added_notify ON public.lessons;
CREATE TRIGGER on_lesson_added_notify
    AFTER INSERT ON public.lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_lesson_added();

-- ─── 7. Trigger: Course published → notify enrolled learners ──────────

CREATE OR REPLACE FUNCTION public.notify_on_course_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_course_published_notify ON public.courses;
CREATE TRIGGER on_course_published_notify
    AFTER UPDATE OF status ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_course_published();

-- ─── 8. Grant permissions ──────────────────────────────────────────────

GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notification TO anon, authenticated, service_role;
