-- MIGRATION: 20260701000000_security_audit_rls.sql
-- DESCRIPTION: Enforces RLS on all core tables and secures storage buckets.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Enable RLS on all core tables
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_checkpoints ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COURSES
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses" ON public.courses
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Educators can view their own courses" ON public.courses;
CREATE POLICY "Educators can view their own courses" ON public.courses
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Educators can insert courses" ON public.courses;
CREATE POLICY "Educators can insert courses" ON public.courses
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Educators can update their own courses" ON public.courses;
CREATE POLICY "Educators can update their own courses" ON public.courses
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Educators can delete their own courses" ON public.courses;
CREATE POLICY "Educators can delete their own courses" ON public.courses
    FOR DELETE USING (auth.uid() = created_by);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. COURSE CHAPTERS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Public can view chapters of published courses" ON public.course_chapters;
CREATE POLICY "Public can view chapters of published courses" ON public.course_chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'
        ) OR EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Educators can manage chapters" ON public.course_chapters;
CREATE POLICY "Educators can manage chapters" ON public.course_chapters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. LESSONS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Public can view lessons of published courses" ON public.lessons;
CREATE POLICY "Public can view lessons of published courses" ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'published'
        ) OR EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Educators can manage lessons" ON public.lessons;
CREATE POLICY "Educators can manage lessons" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ENROLLMENTS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Educators can view enrollments in their courses" ON public.enrollments;
CREATE POLICY "Educators can view enrollments in their courses" ON public.enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
CREATE POLICY "Users can enroll themselves" ON public.enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;
CREATE POLICY "Users can update their own enrollments" ON public.enrollments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own enrollments" ON public.enrollments;
CREATE POLICY "Users can delete their own enrollments" ON public.enrollments
    FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. LESSON PROGRESS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view their own progress" ON public.lesson_progress;
CREATE POLICY "Users can view their own progress" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Educators can view progress in their courses" ON public.lesson_progress;
CREATE POLICY "Educators can view progress in their courses" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e 
            JOIN public.courses c ON c.id = e.course_id
            WHERE e.id = lesson_progress.enrollment_id AND c.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.lesson_progress;
CREATE POLICY "Users can manage their own progress" ON public.lesson_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. QUIZZES
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view quizzes for lessons" ON public.quizzes;
CREATE POLICY "Users can view quizzes for lessons" ON public.quizzes
    FOR SELECT USING (true); -- Read-only access to all quizzes is standard if courses are public

DROP POLICY IF EXISTS "Educators can manage quizzes" ON public.quizzes;
CREATE POLICY "Educators can manage quizzes" ON public.quizzes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = quizzes.lesson_id AND c.created_by = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. QUIZ QUESTIONS & OPTIONS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Educators can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Educators can manage quiz questions" ON public.quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.lessons l ON l.id = q.lesson_id
            JOIN public.courses c ON c.id = l.course_id
            WHERE q.id = quiz_id AND c.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view quiz options" ON public.quiz_options;
CREATE POLICY "Users can view quiz options" ON public.quiz_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Educators can manage quiz options" ON public.quiz_options;
CREATE POLICY "Educators can manage quiz options" ON public.quiz_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quiz_questions qq
            JOIN public.quizzes q ON q.id = qq.quiz_id
            JOIN public.lessons l ON l.id = q.lesson_id
            JOIN public.courses c ON c.id = l.course_id
            WHERE qq.id = question_id AND c.created_by = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. QUIZ ATTEMPTS & ANSWERS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own attempts" ON public.quiz_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view their own answers" ON public.quiz_answers;
CREATE POLICY "Users can view their own answers" ON public.quiz_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            JOIN public.enrollments e ON e.id = qa.enrollment_id
            WHERE qa.id = attempt_id AND e.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their own answers" ON public.quiz_answers;
CREATE POLICY "Users can manage their own answers" ON public.quiz_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            JOIN public.enrollments e ON e.id = qa.enrollment_id
            WHERE qa.id = attempt_id AND e.user_id = auth.uid()
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. STORAGE BUCKET FIXES
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "authenticated can delete from course-assets" ON storage.objects;
CREATE POLICY "authenticated can delete from course-assets" ON storage.objects 
    FOR DELETE TO authenticated USING (
        bucket_id = 'course-assets' AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "authenticated can upload to course-assets" ON storage.objects;
CREATE POLICY "authenticated can upload to course-assets" ON storage.objects 
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'course-assets' AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "authenticated can update course-assets" ON storage.objects;
CREATE POLICY "authenticated can update course-assets" ON storage.objects 
    FOR UPDATE TO authenticated USING (
        bucket_id = 'course-assets' AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- The 'avatars' and 'h5p' buckets if missing
INSERT INTO storage.buckets (id, name, public) VALUES ('h5p', 'h5p', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view h5p" ON storage.objects;
CREATE POLICY "Public can view h5p" ON storage.objects FOR SELECT USING (bucket_id = 'h5p');

DROP POLICY IF EXISTS "Auth users can upload h5p" ON storage.objects;
CREATE POLICY "Auth users can upload h5p" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'h5p');

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth users can manage their own avatars" ON storage.objects;
CREATE POLICY "Auth users can manage their own avatars" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
