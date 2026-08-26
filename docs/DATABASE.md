# ACESS Database

Reference for the rebuilt ACESS database: what the schema contains, what was
removed and why, and what the seed data represents.

**Rebuilt:** 2026-08-26 · **Schema:** 36 tables + 1 view, 370 columns, 20
functions, 15 triggers, 88 RLS policies, 57 foreign keys, 115 indexes, 3 storage
buckets.

---

## 1. Rebuilding from scratch

```bash
supabase start
npm run db:rebuild
```

`db:rebuild` runs `supabase db reset` (applies the four migrations below to an
empty database) and then `npm run seed`. Both are idempotent and safe to re-run.

```bash
npm run verify:data
```

Runs the RLS probe (20 assertions) and the learner-scenario probe (28
assertions). The seed itself runs 21 referential-integrity checks before it
reports success and exits non-zero if any fail.

### Migrations

| File | Purpose |
| --- | --- |
| `20260826000000_baseline_schema.sql` | Complete schema: tables, view, functions, triggers, RLS, indexes, grants. |
| `20260826000100_storage_buckets.sql` | The three buckets the app uses, plus their object policies. |
| `20260826000200_rls_close_open_tables.sql` | Enables RLS on `course_milestones` and `lesson_templates`. |
| `20260826000300_fix_auth_user_provisioning.sql` | Repairs the signup trigger and pins self-signup to the `learner` role. |

### Why the history was consolidated

The previous 44 migrations **could not rebuild the database**. Not one of them
contained a `CREATE TABLE` for `users`, `courses`, `lessons`, `enrollments`,
`lesson_progress`, `quizzes`, `certificates` or `user_profiles` — every file
assumed those tables already existed and only `ALTER`ed them. The core schema
lived only in an out-of-band `pg_dump` committed as `scripts/schema.sql`, so a
fresh `supabase db reset` produced a broken database.

The history had also drifted from the live project:
`20260627000001_phase2_cleanup.sql` drops `certificate_verifications`, yet that
table was still present in the live database — migrations and reality disagreed.

The baseline was rebuilt by replaying the newest dump plus the eleven migrations
that post-dated it (`20260822000000` … `20260825001500`), then **verified
column-for-column against the live project's PostgREST schema** — 43 objects and
433 columns matched exactly before any cleanup was applied. Only then were the
unused structures removed.

All 44 original migrations are preserved unmodified in
`supabase/archive/migrations-legacy/`, with 20 superseded scratch SQL files in
`supabase/archive/superseded-sql/`. See `supabase/archive/README.md`.

---

## 2. What was removed, and why

Every object below was verified unreferenced across **all** of: application code
(`src/**`, excluding the generated `database.types.ts`), API routes, database
function bodies (`pg_proc.prosrc`), RLS policy expressions, index definitions,
inbound foreign keys and views. Nothing was dropped merely for lacking a
front-end reference.

### Tables removed (6)

| Table | Why |
| --- | --- |
| `user_accessibility_preferences` | Superseded by `user_profiles.accessibility_prefs` (jsonb), which is what `learner-api.ts`, `admin-analytics.ts` and `educator-analytics-api.ts` actually read and write. The table had no reader or writer. |
| `password_reset_tokens` | Recovery goes through Supabase Auth — `/api/auth/forgot-password` calls `auth.admin.generateLink({type:'recovery'})` and emails the token hash. No custom token table is involved. |
| `certificate_verifications` | `/verify/[code]` resolves a certificate by `certificates.reference_code`; no verification event is ever recorded. Migration `20260627000001` already intended to drop it. |
| `learner_milestones` | No reader or writer anywhere. Learner-facing milestones are computed in `learner-api.ts` from `course_milestones` plus live progress. |
| `lesson_summaries` | The lesson summary activity persists into `learner_checkpoints.response_data` — see `saveLessonSummary` / `submitLessonSummary` in `learner-api.ts`. This table was the superseded design. |
| `certificate_templates` | Its only reference filtered on a `course_id` column the table does not have, so the query could never match. Certificate layout is generated in code (`certificate-utils.ts`). The dead query was removed from `api/admin/courses/[id]/status/route.ts`. |

### Columns removed (11 from surviving tables)

| Column | Why |
| --- | --- |
| `courses.accessibility_mode_enabled` | Course accessibility is driven by the `supports_*` flags and `course_accessibility_categories`. Never read. |
| `lesson_progress.assisted_learning_mode` | Superseded; assisted learning resolves from accessibility preferences. |
| `lesson_progress.checkpoint_completed` | Checkpoint state lives in `learner_checkpoints`. |
| `lessons.accessibility_overrides` | The resolver uses `accessibility_score` plus the lesson toggle columns. |
| `lessons.chapter_title` | Denormalised copy; `chapter_id` → `course_chapters` is authoritative. |
| `lessons.interactive_activity_type` | Superseded by `lesson_interactive_content.content_type`. |
| `lessons.is_template` | Replaced by the `lesson_templates` table. |
| `lessons.template_id` | Same; its foreign key even pointed at `lessons(id)` instead of `lesson_templates(id)`. |
| `lessons.scheduled_release_at` | No scheduling feature exists. |
| `user_profiles.learning_goals` | Never read or written by any surface. |
| `user_profiles.onboarded_at` | Same. |

(A further 52 columns disappeared with the six dropped tables: 433 → 370.)

### Defects found and fixed

| Defect | Fix |
| --- | --- |
| **Signup was broken.** `handle_new_auth_user()` inserted into `user_profiles.age_group`, but `20260822000000_dynamic_age_group` dropped that column and replaced it with a computed function. The trigger fires on every `auth.users` insert, and `signup/page.tsx` relies entirely on it, so every signup since that migration failed. | `20260826000300` — trigger rewritten against the current schema, made idempotent, and recreated on `auth.users` (it lives outside the `public` schema, so the baseline dump did not carry it). |
| **Role escalation at signup.** The role came straight from `raw_user_meta_data->>'role'`, which is attacker-controlled on a public signup call — posting `{"role":"admin"}` minted an admin. | Same migration — self-provisioned accounts are pinned to `learner`. Educators are promoted by `approve-instructor`, under the service role. |
| **`course_milestones` and `lesson_templates` had RLS disabled**, so any authenticated user could insert or delete rows through PostgREST. | `20260826000200` — reads stay open (the learner progress page renders milestones), writes restricted to the owning educator or an admin. |
| **Promoted educators were locked out.** `approve-instructor` updated `public.users.role` for an existing learner but not their auth metadata — and routing reads the role from the token, so the new educator was sent to `/access-denied`. | `approve-instructor/route.ts` now calls `auth.admin.updateUserById` to keep the token in step with the table. |
| **Roadmap showed "Estimated time: N/A" on every lesson**, though the course header totalled durations correctly. `fetchCourseDetail` selected `estimated_duration` and used it for the total, then dropped it when mapping each lesson. | `learner-api.ts` — the field is carried through to `LessonSummary`. |

---

## 3. Schema

### Tables kept (36) and what they are for

**Identity** — `users` (role, active flag, login timestamps), `user_profiles`
(bio, avatar, birth date, language, `accessibility_prefs` jsonb,
`notification_prefs` jsonb), `referral_codes`, `instructor_applications`,
`contact_messages`.

**Catalogue** — `courses`, `course_chapters`, `lessons`,
`course_accessibility_categories`, `lesson_templates`, `accessibility_templates`,
`lesson_versions`, `media_assets`.

**Lesson content** — `lesson_interactive_content` (the five activity types),
`video_questions`, `h5p_contents`, `h5p_responses`, `lesson_checkpoints`,
`lesson_ai_summaries`, `lesson_comments`.

**Assessment** — `quizzes`, `quiz_questions`, `quiz_options`,
`quiz_options_scoped` (view), `quiz_attempts`, `quiz_answers`.

**Learning record** — `enrollments`, `lesson_progress`, `learner_checkpoints`,
`recommendations`, `adaptive_interactions`.

**Recognition** — `course_achievements`, `user_achievements`, `course_milestones`,
`certificates`.

**Platform** — `notifications`, `course_favorites`.

### Key relationships

```
users ──< enrollments >── courses ──< course_chapters
  │            │              │
  │            │              └──< lessons ──< quizzes ──< quiz_questions ──< quiz_options
  │            │                      │                                          │
  │            ├──< lesson_progress ──┘                    quiz_attempts ──< quiz_answers
  │            ├──< quiz_attempts                                 │
  │            ├──< learner_checkpoints                           └── enrollment_id
  │            ├──< recommendations
  │            └──< certificates  (UNIQUE on enrollment_id)
  ├──< user_profiles (1:1)
  ├──< user_achievements >── course_achievements >── courses
  ├──< course_favorites, notifications, adaptive_interactions
  └──< referral_codes, instructor_applications
```

`certificates.enrollment_id` is **unique** — the platform keeps exactly one
certificate row per enrolment, and `metadata.is_custom` records whether the
educator replaced the generated certificate with their own upload.

### Functions (20)

Callable RPCs: `submit_quiz_attempt(uuid, jsonb)` (server-side grading — the only
sanctioned path to a quiz score), `sync_learner_course_state(uuid)` (derives
course completion and awards achievements), `check_quiz_answer`,
`check_certificate_eligibility`, `may_see_quiz_answer_key`, `current_user_role`,
`age_group(user_profiles)` (computed column), `generate_certificate_reference`,
`create_notification`.

Trigger functions: `handle_new_auth_user`, `guard_enrollment_status`,
`guard_quiz_attempt_writes`, `guard_users_privileged_columns`, `set_updated_at`,
`set_interactive_content_updated_at`, and five `notify_on_*` functions.

### Triggers (15)

`on_auth_user_created` on `auth.users` provisions new accounts. Three guards
(`guard_enrollment_status`, `guard_quiz_attempt_writes`,
`guard_users_privileged_columns`) stop learners forging completion, quiz scores
or roles; they exempt the service role and the trusted derivation functions via a
transaction-local `acess.trusted_write` flag. Five `notify_on_*` triggers generate
notifications on enrolment, lesson view, quiz attempt, lesson creation and course
publication. The rest maintain `updated_at`.

### RLS (88 policies, all 36 tables enabled)

Verified by `npm run verify:rls`:

- A learner sees only their own enrolments, progress, quiz attempts,
  certificates, achievements and notifications.
- A learner cannot promote themselves, enrol someone else, forge a quiz score, or
  declare a course complete.
- The quiz answer key is readable **only for quizzes the learner has already
  submitted**; `quiz_options_scoped` returns the options with `is_correct` as
  `NULL` for everything else.
- An educator sees their own courses and cannot read or edit another educator's
  unpublished work.
- Anonymous visitors can browse published courses only — no users, no progress,
  no certificates.

### Storage (3 buckets)

| Bucket | Used by | Access |
| --- | --- | --- |
| `course-assets` | `educator-api.ts` — lesson media | public read; educator/admin write |
| `certificates` | `uploadEducatorCustomCertificate` | public read; educator/admin write |
| `avatars` | `ProfileDialog.tsx` | public read; each user writes only inside their own `{uid}/` folder |

The historical `course-files` bucket is not referenced anywhere in the codebase
and was not recreated.

---

## 4. Seed data

`npm run seed` — deterministic (fixed PRNG seed), so re-runs reproduce the same
dataset. Data spans **2026-01-15 → 2026-08-25**, about seven months.

### Test accounts

All accounts share the password **`AcessDemo#2026`**.

| Email | Role | Joined | Scenario |
| --- | --- | --- | --- |
| `aliff.admin@acess.edu.my` | admin | 15 Jan | Primary admin; owns the system course. |
| `nurul.admin@acess.edu.my` | admin | 2 Feb | Accessibility compliance lead. |
| `rajesh.admin@acess.edu.my` | admin | 10 Apr | Content operations; newest admin. |
| `siti.educator@acess.edu.my` | educator | 20 Jan | Senior educator — 4 published courses, issues educator certificates. |
| `marcus.educator@acess.edu.my` | educator | 5 Mar | Owns a popular course, an empty course and the archived one. |
| `farah.educator@acess.edu.my` | educator | 18 Jun | Newest educator (promoted from an approved application); has a draft and a pending-review course, no learners. |
| **`amir.learner@acess.edu.my`** | learner | 10 Feb | **Learner A — advanced.** 5 enrolments, 2 completed, both certificate types, 14 achievements, 7 quiz attempts @ 83%, active today. ADHD preset. |
| **`mei.learner@acess.edu.my`** | learner | 22 Mar | **Learner B — mid-progress.** 4 enrolments all between 0–80%, 8/12 lessons, 4 quiz attempts @ 69%, 7 achievements, no course finished, one revoked educator certificate. Dyslexia preset. |
| **`haziq.learner@acess.edu.my`** | learner | 28 Jul | **Learner C — beginner/lapsed.** 2 enrolments, 1 lesson completed, 1 achievement, no certificates, last active 4 Aug. |
| `aisyah.learner@acess.edu.my` | learner | 25 Feb | High performer — 3 completed courses, full marks. |
| `priya.learner@acess.edu.my` | learner | 15 Apr | Steady; 1 completed course. Autism preset. |
| `daniel.learner@acess.edu.my` | learner | 1 Mar | At risk — 1 dropped enrolment, quizzes averaging 36%, inactive since April. |

### Content

- **11 courses** — 8 published, 1 draft, 1 pending review, 1 archived. Includes a
  popular course (6 learners), a published course with **no** learners, a
  recently created course with one learner, and courses across five categories,
  three difficulty levels and four accessibility focus profiles.
- **30 lessons** across 14 chapters — a mix of text, video (8 verified YouTube
  sources), transcripts, PDF materials, quizzes, checkpoints, H5P embeds and
  in-video questions. Thumbnails come from the app's own
  `STOCK_COURSE_THUMBNAILS` constant; every URL was checked to return HTTP 200.
- **10 interactive activities** covering all five supported types: `drag_drop` ×3,
  `fill_blanks` ×2, `flashcards` ×2, `timeline` ×2, `memory_game` ×1 — each stored
  in the exact shape `src/lib/interactive-types.ts` declares.
- **5 quizzes**, 14 questions, 56 options.

### Accessibility variation

Lesson accessibility scores are **not invented**. Every seeded lesson is run
through `auditLesson()` from `src/lib/accessibility-audit.ts` — the same engine
the educator's compliance checker uses — and the score it returns is stored. Each
lesson carries a tier that decides which audited fields get filled (transcript,
learning objectives, simplified summary, accessibility notes, focus/chunking
toggles, estimated duration), so the spread is a genuine consequence of content
quality:

| Band | Lessons | Range |
| --- | --- | --- |
| Good (80–100) | 22 | 82–100 |
| Warning (50–79) | 6 | 52–78 |
| Critical (< 50) | 2 | 41–49 |

The weakest lessons fail for real, diagnosable reasons — a video with no
transcript, a single dense jargon-heavy paragraph, no learning objectives, no
estimated duration.

### Learning record

21 enrolments (14 active, 6 completed, 1 dropped) · 64 `lesson_progress` rows ·
19 quiz attempts (12 pass, 7 fail) · 60 quiz answers · 24 learner checkpoints ·
34 adaptive interactions · 46 achievements earned from 27 defined · 14 course
milestones · 7 certificates (4 system, 2 educator-issued, 1 revoked) ·
104 notifications · 12 recommendations · 8 comments in 5 threads.

### How the chronology holds together

Achievements are **not** inserted directly. After the progress history is in
place, the seeder signs in as each learner and calls the real
`sync_learner_course_state()` RPC, which derives course completion and awards
whatever `course_achievements` the learner has genuinely earned. Only the
timestamps are then corrected, to the date each requirement was actually met.

Every chain runs forwards:

```
enrolment → lesson first view → lesson completion → quiz attempt
          → course completion → achievement unlock → certificate issue
```

The seed enforces this with 21 integrity checks, including: no orphaned rows, no
duplicate enrolments or progress rows, no certificate issued before its
completion date, no lesson viewed before its enrolment, no achievement earned
before enrolment, and quiz `score_pct` agreeing with the stored `quiz_answers`.

---

## 5. Known issues and follow-ups

Not defects in the data — things worth knowing.

1. **Routing trusts auth metadata.** `src/proxy.ts` and
   `src/providers/AuthProvider.tsx` read the role from `user_metadata.role`
   rather than `public.users.role`, deliberately, to avoid a database round-trip
   per request. `20260826000300` closes the signup escalation path, and every API
   route (`requireAdmin`) and RLS policy (`current_user_role()`) still reads the
   authoritative table — so a forged token buys the UI shell and nothing behind
   it. Worth revisiting if a stronger guarantee is wanted.
2. **`lessons.accessibility_score` is still excluded from analytics.**
   `admin-analytics.ts` skips it with the note that "every row holds the column
   default". That is no longer true — the column now carries real audited scores
   (41–100). The analytics could surface it.
3. **The quiz intro tile renders "Attempts 0"** where `max_attempts = 0` means
   unlimited. The prose below it correctly says "You have unlimited attempts".
   Cosmetic.
4. **PostgREST v14.5 segfaults on this machine** (exit 139, WSL2 kernel 6.18).
   The working v13.0.4 image is tagged locally as `v14.5` so the CLI starts. If
   `supabase start` ever fails at the health check with empty `supabase_rest`
   logs, re-apply:
   ```bash
   docker tag public.ecr.aws/supabase/postgrest:v13.0.4 public.ecr.aws/supabase/postgrest:v14.5
   ```
5. **`.env.local` now points at the local Docker stack.** The previous remote
   configuration is saved unchanged at `.env.remote.backup` (git-ignored). Swap
   it back to work against the hosted project.
6. **The remote hosted project was not touched.** Everything here was done against
   local Docker. Applying the consolidated baseline to the remote would require a
   deliberate migration-history repair, since that database already contains the
   old objects.
