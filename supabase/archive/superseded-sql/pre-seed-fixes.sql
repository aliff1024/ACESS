-- ============================================================
-- Pre-Seed Database Fixes
-- Run this in Supabase Dashboard SQL Editor BEFORE seeding
-- ============================================================

-- 1. FIX: Auth trigger — add user_profiles insert
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. FIX: Insert default certificate template if missing
INSERT INTO public.certificate_templates (name, description, is_default, layout_config)
SELECT 'Default', 'Standard ACESS platform certificate template', true,
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
WHERE NOT EXISTS (SELECT 1 FROM public.certificate_templates WHERE is_default = true);

-- 3. Verify: create storage buckets if missing (runs via service role)
-- Note: Storage bucket creation requires manual setup via Supabase Dashboard
-- or can be done via the seed script with service_role key

SELECT 'Pre-seed fixes applied successfully' AS result;
