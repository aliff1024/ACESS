-- Create lesson_versions table
CREATE TABLE IF NOT EXISTS public.lesson_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content_html TEXT NOT NULL,
    version_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Only the course owner can view/manage lesson versions
CREATE POLICY "Educators can manage versions for their courses" ON public.lesson_versions
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.courses c
            JOIN public.lessons l ON l.course_id = c.id
            WHERE l.id = lesson_versions.lesson_id
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson_id ON public.lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_created_at ON public.lesson_versions(created_at);
