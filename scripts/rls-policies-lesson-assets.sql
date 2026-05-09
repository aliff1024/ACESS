-- Enable RLS on lesson_assets table
ALTER TABLE public.lesson_assets ENABLE ROW LEVEL SECURITY;

-- Policy for educators to insert lesson assets into their lessons
CREATE POLICY "educators can insert lesson assets" ON public.lesson_assets 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  )
);

-- Policy for educators to read their lesson assets and learners to read from published courses
CREATE POLICY "educators can read lesson assets" ON public.lesson_assets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    JOIN public.enrollments e ON e.course_id = c.id
    WHERE l.id = lesson_id AND e.learner_id = auth.uid() AND c.status = 'published'
  )
);

-- Policy for educators to delete lesson assets from their courses
CREATE POLICY "educators can delete lesson assets" ON public.lesson_assets 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND c.created_by = auth.uid()
  )
);
