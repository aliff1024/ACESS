-- ============================================================================
-- Repair new-user provisioning.
--
-- Two defects, both found while rebuilding the schema:
--
-- 1. BROKEN SIGNUP.  handle_new_auth_user() inserts into
--    user_profiles.age_group, but migration 20260822000000_dynamic_age_group
--    dropped that column and replaced it with the computed age_group(profile)
--    function. The trigger fires on every auth.users insert, so since that
--    migration *every* signup has failed with
--        column "age_group" of relation "user_profiles" does not exist
--    and src/app/signup/page.tsx does nothing else — it calls
--    supabase.auth.signUp() and relies entirely on this trigger to create the
--    public.users and public.user_profiles rows.
--
-- 2. ROLE ESCALATION.  The role was taken straight from
--    raw_user_meta_data->>'role', which is attacker-controlled on a public
--    signup call. Posting {"role":"admin"} to the signup endpoint minted an
--    admin. The signup UI only ever offers 'learner', and educators are
--    created by src/app/api/admin/approve-instructor/route.ts, which upserts
--    role='educator' itself immediately after auth.admin.createUser().
--    So the trigger can safely pin every self-provisioned account to 'learner'.
--
-- Also made idempotent (ON CONFLICT DO NOTHING) so re-provisioning an existing
-- id cannot abort the auth insert.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    -- Never trust a client-supplied role. Elevation happens through the
    -- instructor-application flow, under the service role.
    'learner'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id, accessibility_prefs, notification_prefs)
  VALUES (NEW.id, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- The trigger lives on auth.users, so it is outside the `public` schema dump
-- that produced the baseline. Recreated here explicitly.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
