-- ============================================================================
-- P0 SECURITY FIX — public.users
--
-- Found by scripts/audit/rls-probe.ts during the Learner Portal audit
-- (2026-08-25). Two defects, both exploitable by any logged-in learner from
-- browser devtools, because the Learner Portal talks to PostgREST directly
-- with the public anon key — RLS is the only authorization boundary there is.
--
-- DEFECT 1 — PRIVILEGE ESCALATION (critical)
--   Policy "users can update own profile":
--       FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
--   The row is the caller's own both before and after the update, so the
--   policy passes for a change to ANY column — including `role`. Verified:
--       await supabase.from('users').update({ role: 'admin' }).eq('id', me)
--   succeeded and returned the modified row. Every admin-side policy in this
--   database keys off that role, so this is a full takeover of the platform
--   from any learner account. `is_active`, `deleted_at`, `email`,
--   `email_verified_at` and `instructor_application_status` were all
--   self-writable the same way (instructor_application_status = 'approved'
--   bypasses the educator-approval workflow).
--
-- DEFECT 2 — USER DIRECTORY EXPOSURE (high)
--   Policy "authenticated users can read all users":
--       FOR SELECT USING (auth.role() = 'authenticated')
--   Any learner could read every row of `users` — 25 rows including the
--   admin's and every other learner's email address, full name, role and
--   last_login_at. On a platform whose own data model has a 6-12 age group,
--   that is a children's-PII leak, not just an information disclosure.
--
-- FIXES
--   1. A BEFORE UPDATE trigger pins the privileged columns for non-admins.
--      A trigger (rather than a WITH CHECK clause) is required because RLS
--      cannot compare NEW to OLD — WITH CHECK only ever sees the new row.
--   2. The SELECT policy is narrowed so learners see their own row plus
--      staff rows (educators/admins), which is all the learner UI actually
--      needs: it reads its own profile and course-creator names, nothing
--      else. Educators and admins keep full visibility so the existing
--      educator student lists, admin user management and global search
--      continue to work unchanged.
--
-- Legitimate self-writes that must keep working, and do:
--   - src/app/login/page.tsx           -> users.last_login_at
--   - src/lib/educator-api.ts:1596     -> instructor_application_status='pending'
--   - profile editing                  -> users.full_name
-- ============================================================================

-- ─── Helper: caller's role, read without tripping RLS on users ─────────────
-- SECURITY DEFINER so it can read public.users while being *called from*
-- a policy on public.users without infinite recursion.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "text"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" = "public"
AS $$
  SELECT u.role FROM public.users u WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO "authenticated", "service_role";

-- ─── Fix 1: pin privileged columns against self-service updates ────────────
CREATE OR REPLACE FUNCTION public.guard_users_privileged_columns()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
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

DROP TRIGGER IF EXISTS "guard_users_privileged_columns" ON "public"."users";
CREATE TRIGGER "guard_users_privileged_columns"
  BEFORE UPDATE ON "public"."users"
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_privileged_columns();

-- ─── Fix 2: narrow the user directory ──────────────────────────────────────
-- Replaces "authenticated users can read all users", which exposed every
-- user row (emails included) to every logged-in account.
DROP POLICY IF EXISTS "authenticated users can read all users" ON "public"."users";

CREATE POLICY "users read own row and staff rows" ON "public"."users"
  FOR SELECT TO "authenticated"
  USING (
    -- your own account
    "id" = auth.uid()
    -- staff need the directory: educator student lists, admin user management,
    -- and the admin/educator global search in src/lib/search-api.ts
    OR public.current_user_role() IN ('admin', 'educator')
    -- everyone may resolve a course creator's name ("Taught by ..."), which is
    -- the only cross-user read the learner UI performs
    OR "role" IN ('educator', 'admin')
  );

COMMENT ON POLICY "users read own row and staff rows" ON "public"."users" IS
  'Learners can read only their own row plus educator/admin rows (needed to show course-creator names). Replaces a policy that exposed every user email to every authenticated account.';
