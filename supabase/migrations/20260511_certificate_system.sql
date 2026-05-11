-- Certificate System Migration
-- Adds certificate support to courses and enhances certificates table

-- 1. Add certificate columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certificate_enabled boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certificate_settings jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certification_locked boolean DEFAULT false;

-- 2. Enhance certificates table
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS learner_name text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS course_title text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS educator_name text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS institution_name text DEFAULT 'ACESS Platform';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS completion_date timestamptz;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verification_url text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS skills_earned text[] DEFAULT '{}';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS course_duration_hours numeric DEFAULT 0;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS signed_token text;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS template_id text DEFAULT 'default';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. Create certificate templates table
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  layout_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create certificate verification log
CREATE TABLE IF NOT EXISTS public.certificate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES public.certificates(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  verified_at timestamptz DEFAULT now()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_reference_code ON public.certificates(reference_code);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_enrollment_id ON public.certificates(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_cert_id ON public.certificate_verifications(certificate_id);

-- 6. RLS Policies for certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Certificates: learners can view their own, educators can view their course certificates, admins can view all
DROP POLICY IF EXISTS certificates_select_policy ON public.certificates;
CREATE POLICY certificates_select_policy ON public.certificates
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT c.created_by FROM public.courses c WHERE c.id = course_id
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Certificates: only system/service can insert
DROP POLICY IF EXISTS certificates_insert_policy ON public.certificates;
CREATE POLICY certificates_insert_policy ON public.certificates
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Certificates: only admins can update (revoke)
DROP POLICY IF EXISTS certificates_update_policy ON public.certificates;
CREATE POLICY certificates_update_policy ON public.certificates
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Certificate templates: readable by all authenticated
DROP POLICY IF EXISTS cert_templates_select_policy ON public.certificate_templates;
CREATE POLICY cert_templates_select_policy ON public.certificate_templates
  FOR SELECT
  USING (true);

-- Certificate verifications: insertable by anyone (public verification)
DROP POLICY IF EXISTS cert_verifications_insert_policy ON public.certificate_verifications;
CREATE POLICY cert_verifications_insert_policy ON public.certificate_verifications
  FOR INSERT
  WITH CHECK (true);

-- Certificate verifications: readable by admins
DROP POLICY IF EXISTS cert_verifications_select_policy ON public.certificate_verifications;
CREATE POLICY cert_verifications_select_policy ON public.certificate_verifications
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 7. Insert default certificate template
INSERT INTO public.certificate_templates (name, description, is_default, layout_config)
VALUES (
  'Default',
  'Standard ACESS platform certificate template',
  true,
  '{
    "primaryColor": "#1e40af",
    "secondaryColor": "#3b82f6",
    "accentColor": "#f59e0b",
    "fontFamily": "Inter, sans-serif",
    "headerFontSize": 24,
    "bodyFontSize": 14,
    "showLogo": true,
    "showBorder": true,
    "showSignatures": true,
    "showQRCode": true,
    "backgroundStyle": "clean"
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 8. Create function to generate unique certificate reference code
CREATE OR REPLACE FUNCTION public.generate_certificate_reference()
RETURNS text
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

-- 9. Create function to check certificate eligibility
CREATE OR REPLACE FUNCTION public.check_certificate_eligibility(p_enrollment_id uuid)
RETURNS jsonb
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
