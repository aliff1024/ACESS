-- ============================================================================
-- Close the two public tables that were left without row level security.
--
-- course_milestones and lesson_templates are reachable through PostgREST by
-- every authenticated user. With RLS disabled, any learner could INSERT or
-- DELETE rows in either table — deleting an educator's milestones or seeding
-- their own. Both are staff-authored content, so reads stay open (the learner
-- progress page renders course milestones) while writes are restricted.
--
-- Policy shape mirrors the existing course_achievements policies.
-- ============================================================================

-- ─── course_milestones ─────────────────────────────────────────────────────
ALTER TABLE public.course_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course milestones" ON public.course_milestones;
CREATE POLICY "Anyone can view course milestones"
  ON public.course_milestones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage milestones for their courses" ON public.course_milestones;
CREATE POLICY "Staff can manage milestones for their courses"
  ON public.course_milestones FOR ALL
  USING (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_milestones.course_id AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_milestones.course_id AND c.created_by = auth.uid()
    )
  );

-- ─── lesson_templates ──────────────────────────────────────────────────────
ALTER TABLE public.lesson_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates are visible when public or owned" ON public.lesson_templates;
CREATE POLICY "Templates are visible when public or owned"
  ON public.lesson_templates FOR SELECT
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR public.current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Staff can manage their own templates" ON public.lesson_templates;
CREATE POLICY "Staff can manage their own templates"
  ON public.lesson_templates FOR ALL
  USING (created_by = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (created_by = auth.uid() OR public.current_user_role() = 'admin');
