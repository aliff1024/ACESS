-- =====================================================
-- MIGRATION SCRIPT (CORRECTED)
-- Applies on top of existing schema.sql
-- =====================================================
-- SUMMARY OF CHANGES:
--   NEW TABLES:    user_profiles, user_accessibility_settings, user_notification_settings
--   DEPRECATED:    learner_profiles (columns migrated into user_accessibility_settings)
--   NEW FUNCTION:  handle_updated_at() (alias-safe, coexists with set_updated_at)
--   NEW TRIGGERS:  set_user_profiles_updated_at, set_accessibility_updated_at,
--                  set_notification_updated_at
--   NEW POLICIES:  RLS policies for all 3 new tables
-- =====================================================


-- =====================================================
-- 1. USER PROFILES
--    Extends public.users with extra identity fields.
--    Does NOT duplicate full_name (already in users).
--    References public.users to stay consistent with
--    the rest of the schema (not auth.users directly).
-- =====================================================

create table if not exists public.user_profiles (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null unique references public.users(id) on delete cascade,

    username         text unique,
    avatar_url       text,
    phone_number     text,
    birth_date       date,
    bio              text,
    country          text,
    preferred_language text default 'en',

    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
);

comment on table public.user_profiles is
    'Extended identity fields for all users. full_name and email live in public.users.';

create index if not exists idx_user_profiles_user_id
    on public.user_profiles(user_id);


-- =====================================================
-- 2. USER ACCESSIBILITY SETTINGS
--    Replaces public.learner_profiles with a broader,
--    role-agnostic accessibility table.
--    Migrates existing learner_profiles data before
--    the old table is dropped (see step 2b).
--
--    Column mapping from learner_profiles:
--      disability_type        → disability_type
--      preferred_font_size    → preferred_font_size  (values: sm/md/lg/xl → small/medium/large/xlarge)
--      preferred_theme        → preferred_theme      (values: light/dark/highContrast → light/dark/high_contrast)
--      line_spacing           → line_spacing
--      tts_enabled            → tts_enabled
--      learning_goals         → (moved to user_profiles.bio or kept separately — not migrated here)
--      onboarded_at           → (dropped — not applicable to all users)
-- =====================================================

create table if not exists public.user_accessibility_settings (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null unique references public.users(id) on delete cascade,

    disability_type                text,               -- e.g. 'dyslexia', 'adhd', 'mild_cognitive_impairment', 'other'

    -- Display preferences
    preferred_font_size            text default 'medium',   -- 'small' | 'medium' | 'large' | 'xlarge'
    preferred_theme                text default 'system',   -- 'light' | 'dark' | 'high_contrast' | 'system'
    line_spacing                   text default 'normal',   -- 'normal' | 'relaxed' | 'loose'

    -- Assistive technology
    tts_enabled                    boolean default false,
    captions_enabled               boolean default false,
    screen_reader_optimized        boolean default false,
    keyboard_navigation_enabled    boolean default false,

    -- Motion & UI
    reduced_motion                 boolean default false,
    simplified_ui                  boolean default false,
    dyslexia_friendly_font         boolean default false,

    -- Content preferences
    preferred_reading_level        text,               -- e.g. 'basic' | 'standard' | 'advanced'
    preferred_content_format       text,               -- e.g. 'text' | 'video' | 'audio'

    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
);

comment on table public.user_accessibility_settings is
    'Replaces learner_profiles. Covers all users (not just learners) with richer accessibility options.';

create index if not exists idx_accessibility_user_id
    on public.user_accessibility_settings(user_id);


-- 2b. MIGRATE data from learner_profiles → user_accessibility_settings
--     Run this BEFORE dropping learner_profiles.
--     Only inserts rows that don't already exist in the new table.

insert into public.user_accessibility_settings (
    user_id,
    disability_type,
    preferred_font_size,
    preferred_theme,
    line_spacing,
    tts_enabled,
    created_at,
    updated_at
)
select
    lp.user_id,
    lp.disability_type,
    case lp.preferred_font_size
        when 'sm'  then 'small'
        when 'md'  then 'medium'
        when 'lg'  then 'large'
        when 'xl'  then 'xlarge'
        else lp.preferred_font_size
    end,
    case lp.preferred_theme
        when 'highContrast' then 'high_contrast'
        else lp.preferred_theme
    end,
    lp.line_spacing,
    lp.tts_enabled,
    lp.created_at,
    lp.updated_at
from public.learner_profiles lp
where not exists (
    select 1 from public.user_accessibility_settings uas
    where uas.user_id = lp.user_id
);


-- 2c. DROP the old learner_profiles table (after migration confirmed).
--     IMPORTANT: verify migration row counts match before running this.
--     Uncomment when ready:

-- drop table if exists public.learner_profiles cascade;


-- =====================================================
-- 3. USER NOTIFICATION SETTINGS  (net-new, no conflicts)
-- =====================================================

create table if not exists public.user_notification_settings (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null unique references public.users(id) on delete cascade,

    email_notifications          boolean default true,
    push_notifications           boolean default true,
    course_updates               boolean default true,
    certificate_notifications    boolean default true,
    marketing_notifications      boolean default false,

    created_at       timestamptz default now(),
    updated_at       timestamptz default now()
);

comment on table public.user_notification_settings is
    'Per-user notification preferences. All new — no conflicts with existing schema.';

create index if not exists idx_notification_user_id
    on public.user_notification_settings(user_id);


-- =====================================================
-- 4. ENABLE RLS
-- =====================================================

alter table public.user_profiles
    enable row level security;

alter table public.user_accessibility_settings
    enable row level security;

alter table public.user_notification_settings
    enable row level security;


-- =====================================================
-- 5. RLS POLICIES — user_profiles
--    (Fixed: policy names now properly quoted)
-- =====================================================

create policy "Users can view own profile"
    on public.user_profiles
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own profile"
    on public.user_profiles
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own profile"
    on public.user_profiles
    for update
    using (auth.uid() = user_id);


-- =====================================================
-- 6. RLS POLICIES — user_accessibility_settings
-- =====================================================

create policy "Users can view own accessibility settings"
    on public.user_accessibility_settings
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own accessibility settings"
    on public.user_accessibility_settings
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own accessibility settings"
    on public.user_accessibility_settings
    for update
    using (auth.uid() = user_id);


-- =====================================================
-- 7. RLS POLICIES — user_notification_settings
-- =====================================================

create policy "Users can view own notification settings"
    on public.user_notification_settings
    for select
    using (auth.uid() = user_id);

create policy "Users can insert own notification settings"
    on public.user_notification_settings
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own notification settings"
    on public.user_notification_settings
    for update
    using (auth.uid() = user_id);


-- =====================================================
-- 8. UPDATED_AT TRIGGERS
--    Reuses the existing public.set_updated_at()
--    function instead of creating a duplicate.
--    (Original script defined handle_updated_at()
--    which was identical — removed as redundant.)
-- =====================================================

create trigger set_user_profiles_updated_at
    before update on public.user_profiles
    for each row
    execute function public.set_updated_at();

create trigger set_accessibility_updated_at
    before update on public.user_accessibility_settings
    for each row
    execute function public.set_updated_at();

create trigger set_notification_updated_at
    before update on public.user_notification_settings
    for each row
    execute function public.set_updated_at();


-- =====================================================
-- 9. GRANT permissions (consistent with existing schema)
-- =====================================================

grant all on table public.user_profiles              to anon, authenticated, service_role;
grant all on table public.user_accessibility_settings to anon, authenticated, service_role;
grant all on table public.user_notification_settings  to anon, authenticated, service_role;


-- =====================================================
-- DONE.
-- After running, verify with:
--   select count(*) from public.user_accessibility_settings;
--   select count(*) from public.learner_profiles;
-- Both counts should match before dropping learner_profiles.
-- =====================================================
