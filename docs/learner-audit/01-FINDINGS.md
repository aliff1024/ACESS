# Learner Portal Audit — Findings Log

Raw evidence, recorded as discovered. Every entry was reproduced live against
the running application or the live Supabase project. Nothing here is inferred
from reading code alone unless explicitly labelled **(static)**.

---

## Phase 0 — Baseline

**Environment**

| Check | Result |
|---|---|
| Dev server | Already running on :3000 (PID 28204), `/login` → 200. Reused; no second `next dev` started. |
| `npx tsc --noEmit` | **Clean**, exit 0 |
| `npm run lint` | 508 problems (291 errors, 217 warnings) — **pre-existing baseline**, dominated by `@typescript-eslint/no-explicit-any` and unused vars, mostly in `supabase/seed-*.ts` and legacy scripts. Not introduced by this audit; the bar for this work is "adds no new lint errors". |
| `next build` | **Deferred to Phase 9.** `next dev` is live on this same project directory and shares `.next/`; running a production build concurrently risks corrupting the dev server that the whole audit depends on. |
| Supabase connectivity | ✅ service role via PostgREST; ✅ Supabase CLI 2.115.0 authenticated and project linked (`kdlryupwmydirgvxuixd`, ap-southeast-1), so migrations can be applied and the live schema dumped. |
| Direct Postgres (pg) | ❌ `SUPABASE_PASSWORD` in `.env.local` is stale — password auth fails on both the direct host and the ap-southeast-1 pooler. Worked around entirely via the CLI. |
| Git | branch `main`, HEAD `9349694`. Pre-existing uncommitted admin/educator changes present before this audit began; learner work is kept to separate commits. |

**Audit tooling built**

- `scripts/audit/learner-db.ts` — service-role DB oracle (read-only verification).
- `scripts/audit/rls-probe.ts` — signs in as a learner with the **anon** key and probes cross-learner reads and writes.

Neither is imported by application code; the service-role key stays in `scripts/`
and never reaches a client bundle.

**Learner under test** — `learner@acess.demo` / "Leo Learner"
(`ba551b57-753a-4cb7-91e1-0c1aa3e40531`). Baseline oracle at audit start:

```
enrollments 5 (4 active, 1 completed) | favourites 3 | achievements 1
certificates 2 | lesson_progress rows 27 | lessons completed 11 | quiz attempts 18

[published] Introduction to Reading            active     2/9  (of 10 lessons)  22%   1 quiz attempt
[published] Digital Literacy & Internet Safety active     1/9  (of 9)           11%   1
[published] Lets learn about animal            active     0/5  (of 5)            0%   1
[published] Animal Adventures                  completed  4/10 (of 11)          40%  13
[published] Learning Numbers 1-20              active     4/9  (of 10)          44%   2
```

This is a genuinely useful spread — zero / partial / near-half progress, plus a
course marked *completed* at 40%, which is itself flagged below.

---

## P0 — SECURITY (found and fixed in Phase 0/3)

### P0-1 — Privilege escalation: any learner could make themselves admin ❌→✅

**Severity:** Critical. Full platform takeover from any learner account.

**Route/surface:** Supabase PostgREST, `public.users`. Reachable from browser
devtools on any Learner Portal page, because `src/lib/learner-api.ts` talks to
Supabase directly with the public anon key — RLS is the only boundary.

**Reproduction (before fix):**
```js
await supabase.from('users').update({ role: 'admin' }).eq('id', myUserId)
// → 200, row returned with role: "admin"
```
Verified by `scripts/audit/rls-probe.ts --write`:
`[*** LEAK ***] users — self-promote to admin: ROLE CHANGED`.

**Root cause:**
```sql
CREATE POLICY "users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```
The row is the caller's own both before *and* after the write, so the policy
admits a change to **any column**. RLS cannot express "this column may not
change" — `WITH CHECK` only ever sees the new row, never the old one.

The same hole made these self-writable, all confirmed accepted:
`role`, `is_active`, `email`, `email_verified_at`, `deleted_at`,
`instructor_application_status` (→ `'approved'` bypasses the entire
educator-approval workflow).

**Fix:** `supabase/migrations/20260825000000_fix_users_privilege_escalation.sql`
— a `BEFORE UPDATE` trigger (`guard_users_privileged_columns`) that rejects
changes to privileged columns unless the caller is an admin, the service role,
or direct SQL (so seeding and migrations still work). A trigger rather than a
policy, precisely because it can compare `NEW` to `OLD`.

**Verification after fix:**

| Attempt | Result |
|---|---|
| `role → admin` (self) | blocked `42501` |
| `role → educator` (self) | blocked `42501` |
| `is_active → false` (self) | blocked `42501` |
| `email → hijack@example.com` (self) | blocked `42501` |
| `email_verified_at` (self) | blocked `42501` |
| `deleted_at → now()` (self) | blocked `42501` |
| `instructor_application_status → approved` (self) | blocked `42501` |
| `instructor_application_status → pending` (self) | **accepted** — legitimate apply-to-teach flow, `educator-api.ts:1596` |
| `last_login_at → now()` (self) | **accepted** — legitimate login flow, `login/page.tsx:76` |
| `full_name` (self) | **accepted** — legitimate profile edit |
| admin changing another user's `role` | **works** — `UserManagement.tsx` unaffected |
| admin changing another user's `is_active` | **works** |

### P0-2 — Whole user directory readable by every learner ❌→✅

**Severity:** High. PII disclosure, including on a platform whose own data model
has a `6-12` age group.

**Reproduction (before fix):** signed in as the learner,
`await supabase.from('users').select('id,email,full_name,role,last_login_at')`
returned **25 rows** — every learner, every educator and the admin, with email
addresses and last-login timestamps.

**Root cause:**
```sql
CREATE POLICY "authenticated users can read all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
```

**Fix:** same migration. Policy replaced with "own row + staff rows". Learners
may still resolve educator/admin rows, because that is the only cross-user read
the learner UI actually performs — course-creator names in
`learner-api.ts:279/416/535` (`select('id, full_name')`). Everything else the
learner UI reads about a user is its own row.

**Verification after fix:**

| Account | Rows visible in `users` |
|---|---|
| learner@acess.demo | 8 (own row + 7 staff) — was 25 |
| educator@acess.demo | 25 — unchanged, student lists and search intact |
| admin@acess.demo | 25 — unchanged, user management intact |

### RLS probes that PASSED (no defect)

Everything else held up. `A` = learner@acess.demo, `B` = high_performer@acess.demo
(5 enrollments, 4 favourites, 4 certificates).

| Table | Probe | Result |
|---|---|---|
| enrollments | read B by `user_id` | 0 rows |
| course_favorites | read B by `user_id` | 0 rows |
| user_achievements | read B by `user_id` | 0 rows |
| certificates | read B by `user_id` | 0 rows |
| certificates | **read B's certificate by its id (IDOR)** | 0 rows |
| user_profiles | read B by `user_id` | 0 rows |
| notifications | read B by `user_id` | 0 rows |
| lesson_progress | read by B's `enrollment_id` | 0 rows |
| quiz_attempts | read by B's `enrollment_id` | 0 rows |
| learner_checkpoints | read by B's `enrollment_id` | 0 rows |
| recommendations | read by B's `enrollment_id` | 0 rows |
| enrollments / favorites / achievements / certificates / user_profiles | unfiltered `select *` | returns only A's own rows |
| lesson_progress / quiz_attempts / learner_checkpoints | unfiltered `select *` | 27 / 18 / 3 rows, all within A's own enrollments |
| course_favorites | DELETE B's row | 0 rows affected |
| lesson_progress | UPDATE B's row | 0 rows affected |
| course_favorites | INSERT row owned by B | blocked `42501` (WITH CHECK present) |
| enrollments | INSERT enrollment owned by B | blocked `42501` |
| users | INSERT arbitrary row | blocked `42501` |
| users | UPDATE another user's row | 0 rows affected |

Learner-to-learner data isolation on the *learning* tables is genuinely sound.
The defects were both confined to `public.users`.

---

## Open questions carried into Phase 2

- **"Animal Adventures" is `enrollment.status = 'completed'` at 4/10 published
  lessons (40%).** Either completion is being written without the lesson
  requirement being met, or the seed data is inconsistent. Certificates for this
  learner number **2** against **1** completed enrollment — needs tracing.
- **`community-api.ts:36`** selects `id, display_name, avatar_url, role` from
  `user_profiles` — none of `display_name`, `role` exist on that table
  (its columns are `id, user_id, username, avatar_url, …`), and it filters
  `.in('id', userIds)` where `userIds` are **user ids**, not `user_profiles.id`.
  Two bugs in one query. **(static — pending live confirmation of whether
  `LessonDiscussion` is reachable in the learner lesson page.)**

---

## Phase 1/2 — Dashboard: progress was systematically overstated

### P1-1 — The learner portal measured completion with the wrong column ❌→✅

**Severity:** High. Every progress number a learner sees was wrong, and
disagreed with what their educator saw for the same enrollment.

**Surface:** `/learner` dashboard, course cards, course detail, Progress page,
lesson page, and certificate eligibility — seven read sites in
`src/lib/learner-api.ts`, plus `LessonViewPage.tsx` and the server-side
certificate claim route.

**Observed live, before fix** — dashboard vs. database, same learner, same moment:

| Course | Dashboard said | Database (`is_completed` / published lessons) |
|---|---|---|
| Introduction to Reading | 3/9 Done, 33% | 2/9 — 22% |
| Digital Literacy & Internet Safety | 3/9 Done, 33% | 1/9 — 11% |
| Animal Adventures | **10/10 Done, 100%** | **4/10 — 40%** |
| Lets learn about animal | **5/5 Done, 100%** | **0/5 — 0%** |
| Learning Numbers 1-20 | 4/9 Done, 44% | 4/9 — 44% |
| "LESSONS MASTERED" tile | 26 | 11 |

**Root cause.** `lesson_progress` has both `is_viewed` and `is_completed`, and
the codebase had split into two camps:

- the learner portal counted **`is_viewed`** at all seven read sites, and its
  own `completeLesson()` wrote `is_viewed = true` while never touching
  `is_completed`;
- `admin-analytics.ts` and `educator-analytics-api.ts` count **`is_completed`**,
  and explicitly model the gap as a metric: `skipped = is_viewed && !is_completed`.

So the same enrollment read 100% to the learner and 40% to their educator.
`is_completed` is canonical — it is what the column is named, what two of the
three consumers already used, and what makes "skipped" mean anything.

Cross-tabulating all 137 progress rows made the history legible:

| rows | viewed | completed | summary_completed | meaning |
|---|---|---|---|---|
| 98 | yes | yes | no | seeded completions |
| 24 | yes | no | no | seeded partial progress |
| **13** | yes | no | **yes** | **real completions made through the app UI** |
| 2 | no | no | no | opened, nothing else |

`completeLesson()` is the only code in the repo that sets `summary_completed`,
and it sets it together with `is_viewed` — so those 13 rows are genuine learner
completions that the analytics side had been counting as "skipped" all along.
There were zero rows with `is_completed` and not `is_viewed`, so the
"completed implies viewed" invariant already held.

**Fix:**
- `supabase/migrations/20260825000100_canonicalize_lesson_completion.sql` —
  promotes exactly those 13 rows to `is_completed` (so nobody loses credit for
  work they did), normalises NULLs, sets defaults, and adds a CHECK constraint
  so the two flags can never contradict again. The 24 seeded viewed-only rows
  are deliberately **not** promoted: those are the partial progress that was
  inflating the numbers.
- `learner-api.ts` — all seven read sites switched to `is_completed`;
  `completeLesson()` now writes `is_completed`; `trackLessonView()` now sets
  `is_viewed: true` when the lesson is opened (it used to insert
  `is_viewed: false`, which left the flag meaning nothing at all).
- `LessonViewPage.tsx` and `/api/certificates/claim` switched to `is_completed`.

**Verified after fix** — dashboard reloaded, every figure now equals the oracle:
Introduction to Reading 2/9 22%, Digital Literacy 2/9 22%, Animal Adventures
10/10 100%, Lets learn about animal 5/5 100%, Learning Numbers 4/9 44%,
"LESSONS MASTERED" 24. Learner, educator and admin now compute completion the
same way.

### P1-2 — Certificate eligibility compared two different lesson sets ❌→✅

**Severity:** High — this is the gate on issuing a certificate.

**Root cause.** In both `learner-api.ts` (`checkCourseCertificateEligibility`)
and the authoritative server route `/api/certificates/claim`:

```
totalLessons     = count of lessons WHERE published AND visible
completedLessons = count of ALL progress rows on the enrollment WHERE is_viewed
```

The denominator was scoped to the published/visible lesson set; the numerator
was not scoped at all. A progress row left behind by a lesson that was later
unpublished or deleted therefore counted toward `completedLessons >=
totalLessons` and could satisfy the gate for a course the learner had not
finished. On top of that it counted *opened* rather than *completed*.

This is not hypothetical for this dataset: "Animal Adventures" has 11 lessons of
which 10 are published, and the audit learner holds a completed progress row
against the unpublished one.

**Fix:** both call sites now fetch the published lesson ids once and count
`is_completed` rows restricted to `.in('lesson_id', publishedLessonIds)`, so
numerator and denominator are taken over the same set.

### P1-3 — Finishing every lesson never completed the course ❌→✅

**Severity:** Medium-high. Course completion did not exist as a concept outside
certificates.

**Observed live:** dashboard showed two courses at 100% while the "Courses
Completed" tile read **1**.

**Root cause.** The only three writers of `enrollments.status = 'completed'` in
the entire codebase were the certificate endpoints (`/api/certificates/claim`,
`/api/certificates/custom`, `/api/educator/certificates/issue`). Completion was
a side-effect of *claiming a certificate*, so a course with
`certificate_enabled = false` could never be completed at all, and a learner who
finished everything but had not claimed stayed `active` forever.

**Fix:** new `syncEnrollmentCompletion()` in `learner-api.ts`, called from
`completeLesson()`, marks the enrollment complete once every published lesson
has a completed progress row. It only ever moves completion forward — adding a
lesson to a finished course does not revert a learner, or invalidate a
certificate already issued against it. Migration
`20260825000200_backfill_enrollment_completion.sql` applies the same rule to
enrollments that were already finished, scoped narrowly: promoted only when
every published visible lesson has a completed row, and never for a course with
no published lessons ("0 of 0" is not a completion).

**Verified:** the audit learner went 1 → 2 completed enrollments, matching the
two courses at 100%; dashboard tile now reads 2.

### P1-4 — "Time spent learning" was fabricated ❌→✅

`getLearnerStats()` computed study time as `completed_lessons × 10 minutes` — a
made-up number presented to the learner as their own measured study time, while
the real measurement (`lesson_progress.time_spent_learning`, populated on 122 of
137 rows platform-wide) sat unused in the very rows being read. Now sums the
real column.

### Dashboard statistics — verified against the database

| Tile | Shows | Database | Verdict |
|---|---|---|---|
| Courses Completed | 2 | 2 enrollments with `status='completed'` | OK |
| Lessons Mastered | 24 | 24 rows with `is_completed` | OK |
| Average Score | 91% | mean of all 18 `quiz_attempts.score_pct` = 91.1 | arithmetic correct — see note |
| Certificates Earned | 2 | 2 `certificates` rows with `status='issued'` | OK |

*Note on Average Score:* it averages **every attempt**, so retakes drag the
figure down and repeated 100s inflate it (11 of the 18 attempts are 100). Mean
of best-attempt-per-quiz would be 93.1. The arithmetic is right and the label is
literally accurate; flagged as a clarity question, not a defect.

### Pre-existing data inconsistency (not fixed — seed data)

The audit learner holds an `issued` certificate for **Introduction to Reading**,
an enrollment that is 2/9 complete. It predates this audit and was reachable
through the weaker eligibility gate described in P1-2. Left in place rather than
deleted, because removing it would destroy demo/report data; the gate that
allowed it is now closed.

### Audit tooling note

The first version of `rls-probe.ts` called `auth.signOut()`, whose Supabase
default scope is `global` — it revokes **every** refresh token for the account,
which silently signed the audit's own browser session out mid-walkthrough.
Changed to `signOut({ scope: 'local' })`. Worth knowing generally: any code in
this project calling `signOut()` without a scope logs the user out of every
device.

---

## Phase 1 — Navigation, discovery, favourites, progress

### P1-5 — The Achievements page was unreachable from navigation ❌→✅

`/learner/achievements` is a real, working 364-line page (learning level, XP
breakdown, earned and locked badges). The sidebar entry labelled **Achievements**
carried `id: 'certificates'`, so it routed to `/learner/certificates` instead.
`LearnerShell.handleSidebarNavigate` already had a correct `achievements` case —
nothing ever sent it that id.

Confirmed live: clicking "Achievements" landed on `/learner/certificates`.
Visiting `/learner/achievements` directly rendered the page correctly.

**Fix:** the sidebar now carries both entries with correct labels and ids —
Achievements → `/learner/achievements`, Certificates → `/learner/certificates` —
in the default, ADHD and Autism menu variants. Both translation keys
(`nav.achievements`, `nav.certificates`) already existed in `en.ts` and `ms.ts`.

### P1-6 — No sidebar item was a link ❌→✅

**Severity:** Accessibility. Every navigation item in the learner sidebar was a
`<button>` with an `onClick` calling `router.push()`. Verified live: the entire
nav returned `href: null`.

Consequences: no middle-click or open-in-new-tab, no status-bar URL preview, no
"copy link address", no browser-native focus semantics, and a screen reader
announcing site navigation as "button" rather than "link" — on a product whose
purpose is accessibility.

**Fix:** navigation items now render as Next `<Link>` with real `href`s from a
`VIEW_HREF` map, plus `aria-current="page"` on the active item. Items that
genuinely are buttons keep being buttons: the collapsible **My Courses** group
(now with `aria-expanded`) and **Accessibility**, which opens a dialog rather
than navigating. Verified live — every destination now reports its href, and the
active item reports `aria-current="page"`.

### P1-7 — Favourites could be added but never removed ❌→✅

The favourites workflow the brief describes (All Courses → Favourite →
Favourites → Unfavourite) had no fourth step. `/learner/favorites` rendered
cards with only a "View Course" button; the only unfavourite control in the
product lived back on All Courses.

**Fix:** each favourite card now has a labelled remove control with an optimistic
update that rolls back and toasts on failure.

**Verified live, full round trip:**

| Step | UI | Database |
|---|---|---|
| start | 3 cards | 3 rows |
| remove "Introduction to Coding" | card disappears, toast confirms | **2 rows** |
| re-favourite from All Courses | heart fills, label flips | **3 rows** |

Learner state restored to exactly what it was before the test.

### P1-8 — A failed favourites fetch showed "no favourites yet" ❌→✅

`fetchFavoriteCourses().catch(() => {})` swallowed every error, so a network or
permission failure rendered the empty state — telling a learner their saved
courses were gone when they were not. Now renders a distinct error state with a
retry, and says explicitly that nothing has been lost.

### P1-9 — The favourite toggle had no accessible name or state ❌→✅

The heart on each course card was an icon-only `<button>` with no `aria-label`
and no `aria-pressed`; its on/off state was carried purely by a `fill-current`
class. Verified live: six heart buttons, all reporting `aria-label: null`.
A screen-reader user heard "button" with no way to tell what it did or whether
the course was already saved. WCAG 4.1.2.

**Fix:** `aria-label` naming the course and the action, `aria-pressed` carrying
state, and a `title` for pointer users. Verified live: the label flips between
"Add {course} to favourites" and "Remove {course} from favourites" and
`aria-pressed` flips `false` → `true` on toggle.

### P1-10 — "Enrolled" was Browse Courses wearing the wrong heading ❌→✅

`Enrolled` is `/learner/courses?filter=enrolled` — the same component with a
filter. The heading and description were hardcoded, so a learner who clicked
**Enrolled** landed on a page titled **"Browse Courses"** saying *"Discover new
skills and add them to your learning path"* — with their own five enrolled
courses underneath it.

**Fix:** the view now titles itself "My Enrolled Courses" / "Pick up where you
left off, or review a course you have finished" when the enrolled filter is
active. This is the minimal honest fix; it does not add a page or a nav item.

### P1-11 — "View Certificate" offered for courses with certificates disabled ❌→✅

The Progress list showed **View Certificate** as the CTA for every course at
100%, ignoring `certificate_enabled`. "Lets learn about animal" has
`certificate_enabled = false`, and its own detail page correctly shows no
certificate at all ("Incredible Work! You have successfully completed this
course!"). The list page promised one anyway.

`EnrolledCourse` already carried `certificate_enabled`; it simply was not
consulted. Now falls back to "Review Course". Both occurrences fixed.

### Enrolled / Progress / Course detail — verified against the database

Every figure agreed with the oracle, and agreed with each other across all
three surfaces:

| Course | Enrolled page | Progress page | Course detail | Oracle |
|---|---|---|---|---|
| Introduction to Reading | 22% | 2 of 9, 22% | — | 2/9 22% |
| Digital Literacy | 22% | 2 of 9, 22% | — | 2/9 22% |
| Animal Adventures | 100% | 10 of 10, 100% | — | 10/10 100% |
| Learning Numbers 1-20 | 44% | 4 of 9, 44% | 44%, "Complete all lessons (4/9)" | 4/9 44% |
| Lets learn about animal | 100% | 5 of 5, 100% | — | 5/5 100% |

Enrolled listed exactly the learner's 5 enrollments — no more, no less.

---

## Phase 5 — Lesson experience and live progress

### P1-12 — The video requirement was an inescapable dead end ❌→✅

**Severity:** High. A learner could be permanently unable to finish a lesson.

Lesson completion is gated on four requirements (watch video, scroll content,
complete activities, pass quiz). `tracker.video` was set in exactly one place:

```ts
onStateChange: (event) => {
  if (event.data === window.YT.PlayerState.ENDED) setTracker(p => ({...p, video: true}));
}
```

The **only** way to satisfy it was the embedded YouTube player firing `ENDED`.
If the embed failed to load, was blocked by a network or school filter, was
region-locked, or the video had been removed — or if the learner watched it
elsewhere, or cannot use the player at all — the lesson became permanently
uncompletable, with no alternative and no way out. Because course completion and
certificate eligibility both derive from lesson completion, one unplayable video
strands the learner for the whole course.

**Fix:** an explicit "I have watched this video" control in the video block,
shown only while the requirement is outstanding, flipping to a "Video watched"
confirmation. Automatic detection on playback end still works. This is
self-attestation — the same kind of proxy the "scrolled through the content"
requirement already relies on — and it restores an escape hatch rather than
removing the requirement.

### Live progress test — passed

The brief's exact scenario, run against real data:

1. Opened Lesson 5 of "Learning Numbers 1-20" (course at 4/9, 44%).
2. Completion correctly **refused** with an "Incomplete Tasks" dialog listing
   what was outstanding — Watch Video and Scroll, with Activities and Quiz
   already satisfied. Client-side gating works.
3. Satisfied both requirements, clicked Complete Lesson → "Lesson Complete!
   Great work! You can now proceed to the next lesson. Next: Bigger and Smaller".
4. **Database:** `lesson_progress` rows 27 → 28, `is_completed` total 24 → 25,
   course 4/9 → **5/9**.
5. **Full page reload** of `/learner/progress`: "Learning Numbers 1-20 — 5 of 9
   Lessons — 56%". Every other course unchanged.

Progress is written to real rows, survives refresh, and propagates consistently
to the dashboard, Enrolled and Progress views.

### Smaller lesson-page observations

- **An activity renders with no content.** "Interactive: Even and Odd Numbers —
  Type the missing words in the blanks." is followed by *"No content in this
  activity."* The activity counts as satisfied for completion purposes, so it is
  not a blocker, but it is a broken authored artefact shown to the learner.
- **The "Incomplete Tasks" dialog stays open after completion succeeds.** Its
  contents update to all-ticked, and "Lesson Complete!" renders behind it, but
  the modal is not dismissed. Cosmetic.
- **`?courseId=` is dropped from the lesson URL** shortly after load
  (`/learner/lesson/{id}?courseId={id}` → `/learner/lesson/{id}`). The page
  recovers course context on its own — breadcrumb, outline, prev/next and
  completion all worked — so this is an observation, not a defect.
- Sequential lesson locking works: lessons 6-9 showed "Locked", Next Lesson was
  correctly disabled on a locked boundary, and the quiz panel showed real
  attempt history (1 attempt, 85%, passed) matching `quiz_attempts`.

### P2-1 — `ensureUserId()` makes a network call on every API call

Every one of the 48 exported functions in `learner-api.ts` begins with
`ensureUserId()`, which calls `supabase.auth.getUser()` — a network round-trip
to `/auth/v1/user`, not a cached read. Measured on one dashboard load:

```
/auth/v1/user                     18 requests
/rest/v1/enrollments?select=...    6
/rest/v1/users?select=... (x3 shapes)  12
/rest/v1/user_profiles?select=*    4
/rest/v1/notifications?select=*    4
```

68 requests total for one screen. React Strict Mode in dev doubles some of
these, but 18 identical auth round-trips is a genuine cost on the critical
path — every one of them blocks the query that follows it.

### Session note

Supabase sessions expired twice mid-audit (~1 hour), silently returning the
browser to `/login`. Login correctly returns the learner to the page they were
on afterwards.
