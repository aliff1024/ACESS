-- =====================================================
-- SYSTEM CONTENT MIGRATION
-- Adds system-owned courses (no educator required),
-- child account management, and self-monitored progress.
-- Safe to run on top of existing schema.sql
-- =====================================================


-- =====================================================
-- WHY NEW TABLES INSTEAD OF REUSING courses/lessons?
--
-- courses.created_by is uuid NOT NULL → FK to users.
-- There is no nullable bypass. Inserting a "system"
-- course would require either:
--   (a) a fake system user — messy, leaks into educator
--       lists, educator-specific RLS policies could fire.
--   (b) altering the column to nullable — breaks every
--       query and policy that assumes created_by exists.
--
-- Separate tables are cleaner: different ownership model,
-- different RLS, different progress semantics, no risk
-- of system content appearing in educator dashboards.
-- =====================================================


-- =====================================================
-- 1. SYSTEM COURSES
--    Platform-owned courses. No created_by column.
--    Managed by admins (service_role) only.
-- =====================================================

create table if not exists public.system_courses (
    id                  uuid primary key default gen_random_uuid(),

    title               varchar not null,
    slug                varchar not null unique,
    description         text,
    category            text,
    difficulty_level    varchar,
    thumbnail_url       varchar,
    status              varchar not null default 'draft',

    sequence_order      integer not null default 0,
    is_featured         boolean not null default false,

    published_at        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint system_courses_status_check check (
        status in ('draft', 'published', 'archived')
    ),
    constraint system_courses_difficulty_check check (
        difficulty_level in ('beginner', 'intermediate', 'advanced')
        or difficulty_level is null
    ),
    constraint system_courses_sequence_check check (sequence_order >= 0)
);

comment on table public.system_courses is
    'Platform-owned courses not tied to any educator. Managed by admins only.';

create index if not exists idx_system_courses_status
    on public.system_courses(status);
create index if not exists idx_system_courses_published
    on public.system_courses(id)
    where status = 'published';


-- =====================================================
-- 2. SYSTEM LESSONS
--    Lessons belonging to system courses.
-- =====================================================

create table if not exists public.system_lessons (
    id                  uuid primary key default gen_random_uuid(),
    course_id           uuid not null references public.system_courses(id) on delete cascade,

    title               varchar not null,
    content_html        text,
    video_url           varchar,
    transcript          text,
    sequence_order      integer not null,
    status              varchar not null default 'draft',
    estimated_minutes   integer,        -- helps children and guardians plan time

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint system_lessons_status_check check (
        status in ('draft', 'published')
    ),
    constraint system_lessons_sequence_check check (sequence_order > 0),
    unique (course_id, sequence_order)
);

comment on table public.system_lessons is
    'Lessons for system_courses. No educator owner.';

create index if not exists idx_system_lessons_course
    on public.system_lessons(course_id);


-- =====================================================
-- 3. SYSTEM LESSON ASSETS
--    Files/media attached to system lessons.
-- =====================================================

create table if not exists public.system_lesson_assets (
    id          uuid primary key default gen_random_uuid(),
    lesson_id   uuid not null references public.system_lessons(id) on delete cascade,

    kind        text not null,      -- 'video' | 'audio' | 'image' | 'pdf' | 'interactive'
    title       text,
    url         text not null,

    created_at  timestamptz not null default now()
);

comment on table public.system_lesson_assets is
    'Media and file assets attached to system lessons.';

create index if not exists idx_system_lesson_assets_lesson
    on public.system_lesson_assets(lesson_id);


-- =====================================================
-- 4. SYSTEM ENROLLMENTS
--    Tracks which users are enrolled in which system
--    course. Learner-driven: no educator monitors this.
--    current_lesson_seq lets the UI resume where they
--    left off without scanning all progress rows.
-- =====================================================

create table if not exists public.system_enrollments (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.users(id) on delete cascade,
    course_id           uuid not null references public.system_courses(id) on delete cascade,

    status              varchar not null default 'active',
    current_lesson_seq  integer not null default 1,    -- which lesson they're on

    enrolled_at         timestamptz not null default now(),
    completed_at        timestamptz,

    constraint system_enrollments_status_check check (
        status in ('active', 'completed', 'paused')
    ),
    unique (user_id, course_id)
);

comment on table public.system_enrollments is
    'Self-enrollment in system courses. No educator oversight.';

create index if not exists idx_system_enrollments_user
    on public.system_enrollments(user_id);
create index if not exists idx_system_enrollments_course
    on public.system_enrollments(course_id);


-- =====================================================
-- 5. SYSTEM LESSON PROGRESS
--    Per-lesson tracking. Learner (or their guardian)
--    can see this. No educator can see it.
--    time_spent_seconds helps surface engagement for
--    children who may watch the same lesson many times.
-- =====================================================

create table if not exists public.system_lesson_progress (
    id                  uuid primary key default gen_random_uuid(),
    enrollment_id       uuid not null references public.system_enrollments(id) on delete cascade,
    lesson_id           uuid not null references public.system_lessons(id) on delete cascade,

    is_completed        boolean not null default false,
    view_count          integer not null default 0,
    time_spent_seconds  integer not null default 0,

    first_viewed_at     timestamptz,
    last_viewed_at      timestamptz,

    constraint system_lesson_progress_view_count_check check (view_count >= 0),
    constraint system_lesson_progress_time_check check (time_spent_seconds >= 0),
    unique (enrollment_id, lesson_id)
);

comment on table public.system_lesson_progress is
    'Self-monitored lesson progress. Visible to learner and their guardian only.';

create index if not exists idx_sys_progress_enrollment
    on public.system_lesson_progress(enrollment_id);
create index if not exists idx_sys_progress_lesson
    on public.system_lesson_progress(lesson_id);


-- =====================================================
-- 6. CHILD ACCOUNTS
--    Links a child user to their parent/guardian.
--    guardian_can_view_progress: guardian can read the
--      child's system_lesson_progress via RLS policy.
--    autonomy_granted_at: when the account transitions
--      from guardian-managed to self-managed. NULL means
--      still under guardian control. Once set, guardian
--      access to progress can optionally be revoked.
-- =====================================================

create table if not exists public.child_accounts (
    id                          uuid primary key default gen_random_uuid(),
    child_user_id               uuid not null unique references public.users(id) on delete cascade,
    guardian_user_id            uuid not null references public.users(id) on delete restrict,

    guardian_can_view_progress  boolean not null default true,

    -- When this is set, the account is considered "grown up" and self-managed.
    -- The guardian relationship is preserved for history but access may narrow.
    autonomy_granted_at         date,

    created_at                  timestamptz not null default now(),

    -- A user can only have one guardian record
    constraint child_accounts_no_self_guardian check (child_user_id <> guardian_user_id)
);

comment on table public.child_accounts is
    'Links child users to their parent/guardian. Supports both managed and autonomous modes.';

create index if not exists idx_child_accounts_guardian
    on public.child_accounts(guardian_user_id);
create index if not exists idx_child_accounts_child
    on public.child_accounts(child_user_id);


-- =====================================================
-- 7. UPDATED_AT TRIGGERS
--    Reuses existing public.set_updated_at()
-- =====================================================

create trigger sys_courses_updated_at
    before update on public.system_courses
    for each row execute function public.set_updated_at();

create trigger sys_lessons_updated_at
    before update on public.system_lessons
    for each row execute function public.set_updated_at();


-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.system_courses          enable row level security;
alter table public.system_lessons          enable row level security;
alter table public.system_lesson_assets    enable row level security;
alter table public.system_enrollments      enable row level security;
alter table public.system_lesson_progress  enable row level security;
alter table public.child_accounts          enable row level security;


-- =====================================================
-- 9. RLS POLICIES — system_courses
--    Anyone can read published courses.
--    Only service_role (admins) can write.
-- =====================================================

create policy "Anyone can view published system courses"
    on public.system_courses
    for select
    using (status = 'published');


-- =====================================================
-- 10. RLS POLICIES — system_lessons
--     Learner can read lessons of courses they're enrolled in.
-- =====================================================

create policy "Enrolled users can view system lessons"
    on public.system_lessons
    for select
    using (
        exists (
            select 1 from public.system_enrollments se
            where se.course_id = system_lessons.course_id
              and se.user_id = auth.uid()
              and se.status in ('active', 'completed')
        )
    );


-- =====================================================
-- 11. RLS POLICIES — system_lesson_assets
--     Same rule as lessons.
-- =====================================================

create policy "Enrolled users can view system lesson assets"
    on public.system_lesson_assets
    for select
    using (
        exists (
            select 1
            from public.system_lessons sl
            join public.system_enrollments se on se.course_id = sl.course_id
            where sl.id = system_lesson_assets.lesson_id
              and se.user_id = auth.uid()
              and se.status in ('active', 'completed')
        )
    );


-- =====================================================
-- 12. RLS POLICIES — system_enrollments
--     Users manage their own enrollment.
--     Guardians can read their child's enrollment.
-- =====================================================

create policy "Users can view own system enrollments"
    on public.system_enrollments
    for select
    using (auth.uid() = user_id);

create policy "Users can enroll themselves"
    on public.system_enrollments
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update own enrollment"
    on public.system_enrollments
    for update
    using (auth.uid() = user_id);

create policy "Guardians can view child enrollments"
    on public.system_enrollments
    for select
    using (
        exists (
            select 1 from public.child_accounts ca
            where ca.child_user_id = system_enrollments.user_id
              and ca.guardian_user_id = auth.uid()
        )
    );


-- =====================================================
-- 13. RLS POLICIES — system_lesson_progress
--     Learner owns their progress.
--     Guardian can view (not modify) child's progress
--     when guardian_can_view_progress is true.
-- =====================================================

create policy "Users can view own lesson progress"
    on public.system_lesson_progress
    for select
    using (
        exists (
            select 1 from public.system_enrollments se
            where se.id = system_lesson_progress.enrollment_id
              and se.user_id = auth.uid()
        )
    );

create policy "Users can insert own lesson progress"
    on public.system_lesson_progress
    for insert
    with check (
        exists (
            select 1 from public.system_enrollments se
            where se.id = system_lesson_progress.enrollment_id
              and se.user_id = auth.uid()
        )
    );

create policy "Users can update own lesson progress"
    on public.system_lesson_progress
    for update
    using (
        exists (
            select 1 from public.system_enrollments se
            where se.id = system_lesson_progress.enrollment_id
              and se.user_id = auth.uid()
        )
    );

create policy "Guardians can view child lesson progress"
    on public.system_lesson_progress
    for select
    using (
        exists (
            select 1
            from public.system_enrollments se
            join public.child_accounts ca on ca.child_user_id = se.user_id
            where se.id = system_lesson_progress.enrollment_id
              and ca.guardian_user_id = auth.uid()
              and ca.guardian_can_view_progress = true
        )
    );


-- =====================================================
-- 14. RLS POLICIES — child_accounts
--     Guardian manages the record.
--     Child can read (not modify) their own record.
-- =====================================================

create policy "Guardians can view their child records"
    on public.child_accounts
    for select
    using (auth.uid() = guardian_user_id);

create policy "Guardians can insert child records"
    on public.child_accounts
    for insert
    with check (auth.uid() = guardian_user_id);

create policy "Guardians can update child records"
    on public.child_accounts
    for update
    using (auth.uid() = guardian_user_id);

create policy "Children can view own record"
    on public.child_accounts
    for select
    using (auth.uid() = child_user_id);


-- =====================================================
-- 15. GRANTS (consistent with rest of schema)
-- =====================================================

grant all on table public.system_courses          to anon, authenticated, service_role;
grant all on table public.system_lessons          to anon, authenticated, service_role;
grant all on table public.system_lesson_assets    to anon, authenticated, service_role;
grant all on table public.system_enrollments      to anon, authenticated, service_role;
grant all on table public.system_lesson_progress  to anon, authenticated, service_role;
grant all on table public.child_accounts          to anon, authenticated, service_role;


-- =====================================================
-- DONE.
--
-- HOW THE ACCOUNT LIFECYCLE WORKS:
--
-- CHILD PHASE (autonomy_granted_at IS NULL):
--   - Guardian creates the child's user account.
--   - Guardian inserts a row in child_accounts.
--   - Guardian can view enrollment and progress via RLS.
--   - Child self-enrolls and tracks their own progress.
--
-- GROWING UP (guardian sets autonomy_granted_at = today):
--   - The account is now self-managed.
--   - The child_accounts row stays for history.
--   - If the guardian wants to stop seeing progress:
--       UPDATE child_accounts
--       SET guardian_can_view_progress = false
--       WHERE child_user_id = '<child_id>';
--   - The RLS policy for guardian progress view will
--     immediately stop returning rows.
--
-- No data migration needed. No user deletion.
-- The same user row in public.users just keeps going.
-- =====================================================
