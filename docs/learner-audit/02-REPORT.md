# ACESS Learner Portal — Final Audit

**Date:** 2026-08-25 · **Learner under test:** `learner@acess.demo` ("Leo Learner")
**Method:** live browser session against the running dev server, every finding
reproduced on screen and cross-checked against the live Supabase project.
Full evidence log: [01-FINDINGS.md](01-FINDINGS.md).

---

## Executive summary

The Learner Portal is well built — the preset preview dialog, the lesson
completion gating, sequential lesson locking and the RLS on every learning
table are genuinely good work. But it shipped with **one critical security hole
and a systematic progress-reporting error**, both of which were invisible from
the UI and both of which are now fixed and verified.

The two that matter most:

1. **Any learner could make themselves an administrator** with a single
   PostgREST call from browser devtools. The Learner Portal talks to Supabase
   directly with the public anon key, so RLS was the only boundary — and the
   `users` update policy permitted a change to *any* column, `role` included.
2. **The learner portal and the educator/admin dashboards disagreed about what
   "completed" means.** The learner counted `is_viewed`, the analytics side
   counted `is_completed`. The same enrollment read **100% to the learner and
   40% to their educator**.

Everything was tested as a real learner: enrolled state, favourites round-trip,
a lesson completed for real, progress re-verified in the database and after a
refresh, every accessibility preset applied and persisted, TTS driven to the
point of failure, and the whole portal exercised at 375px.

**19 defects found, 18 fixed**, across 3 commits and 3 database migrations.
TypeScript clean, production build succeeds, no new lint problems in
application code, and the isolation probe now reports **0 leaks in 26 probes**.

---

## Critical issues (P0)

### 1. Privilege escalation — any learner could become admin ✅ fixed

```js
await supabase.from('users').update({ role: 'admin' }).eq('id', myUserId)
// → 200, row returned with role: "admin"
```

The policy was `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`. The row
is the caller's own both before *and* after the write, so it admitted a change
to any column. RLS structurally cannot express "this column may not change" —
`WITH CHECK` only ever sees the new row.

Also self-writable through the same hole: `is_active`, `email`,
`email_verified_at`, `deleted_at`, and `instructor_application_status`
(setting it to `approved` bypassed the entire educator-approval workflow).

**Fix:** `20260825000000_fix_users_privilege_escalation.sql` — a `BEFORE UPDATE`
trigger pinning the privileged columns for non-admins. A trigger rather than a
policy, precisely because it can compare `NEW` to `OLD`.

**Verified:** every attack blocked with `42501`; the three legitimate self-writes
(`last_login_at` from the login flow, `full_name` from profile editing,
`instructor_application_status = 'pending'` from apply-to-teach) still work;
admin role changes and user activation through `UserManagement.tsx` still work.

### 2. Every learner could read the whole user directory ✅ fixed

`select('id,email,full_name,role,last_login_at')` on `users` returned **25 rows** —
every learner, every educator and the admin, with email addresses and last-login
times. On a platform whose own data model has a `6-12` age group, that is a
children's-PII leak.

**Fix:** SELECT policy narrowed to own row + staff rows. Learners can still
resolve educator names, which is the only cross-user read the learner UI
performs (course-creator names).

**Verified:** learner now sees 8 rows (was 25); educator and admin still see 25,
so student lists, user management and global search are unaffected.

---

## Bugs fixed

| # | Route / surface | Problem | Root cause | Verification |
|---|---|---|---|---|
| 1 | PostgREST `users` | Privilege escalation | `WITH CHECK` cannot compare to the old row | probe: blocked `42501` |
| 2 | PostgREST `users` | Whole directory readable | `USING (auth.role() = 'authenticated')` | 25 → 8 rows |
| 3 | Dashboard, cards, detail, Progress, lesson | Progress overstated everywhere | learner counted `is_viewed`, analytics counted `is_completed` | every figure now equals the oracle |
| 4 | Certificate eligibility (client **and** `/api/certificates/claim`) | Gate satisfiable without finishing the course | numerator unscoped, denominator scoped to published lessons | both counts now over the same set |
| 5 | Course completion | Finishing every lesson never completed the course | only certificate endpoints ever set `status='completed'` | tile 1 → 2, matching the two 100% courses |
| 6 | Dashboard stats | Study time fabricated as `lessons × 10 min` | real `time_spent_learning` sat unused in the same rows | now sums the real column |
| 7 | Sidebar | `/learner/achievements` unreachable | nav entry labelled "Achievements" carried `id: 'certificates'` | both entries present and correctly routed |
| 8 | Sidebar | No nav item was a link | every item a `<button>` + `router.push()` | all report `href` + `aria-current="page"` |
| 9 | `/learner/favorites` | Could not unfavourite | no remove control existed on the page | round-trip verified: 3 → 2 → 3 rows |
| 10 | `/learner/favorites` | Failed fetch showed "no favourites yet" | `.catch(() => {})` | distinct error state + retry |
| 11 | Course cards | Favourite toggle had no accessible name or state | icon-only button, state carried by a fill colour | `aria-label` + `aria-pressed` flip on toggle |
| 12 | `?filter=enrolled` | Titled "Browse Courses / Discover new skills" | heading hardcoded | own heading when the filter is active |
| 13 | Progress list | "View Certificate" for courses with certificates disabled | `certificate_enabled` present but not consulted | falls back to "Review Course" |
| 14 | Lesson page | Video requirement was an inescapable dead end | only the YouTube `ENDED` event could satisfy it | explicit "I have watched this video" path |
| 15 | Lesson page | TTS kept speaking after navigating away | `speechSynthesis` is global, not unmounted with React | verified: speaking → silent on navigation |
| 16 | Accessibility | Distraction-free override was sticky across presets | override never cleared on save | DB and DOM now agree |
| 17 | Accessibility | Word/line spacing never reached lesson text | applied only through a `body`-scoped rule | lesson content now 0.16em / 1.7 |
| 18 | `/learner/achievements` | "1,000 XP needed" when 608 were needed | displayed the level *span*, not the remainder | `xpRemaining` added and used |

---

## Security & data isolation

Tested at the PostgREST boundary with a real learner JWT and the anon key —
the exact capability a learner has in devtools. UI-level checks prove nothing
here, because the browser talks to the database directly.

`scripts/audit/rls-probe.ts` — **26 probes, 0 leaks** after fixes (2 before).

Learner A could not read or write learner B's `enrollments`, `lesson_progress`,
`quiz_attempts`, `course_favorites`, `user_achievements`, `certificates`,
`user_profiles`, `notifications`, `learner_checkpoints` or `recommendations`,
by user id, by B's enrollment ids, by **B's certificate id directly (IDOR)**, or
by unfiltered `select *`. Writes attributed to B were rejected with `42501`,
confirming `WITH CHECK` is present on those tables.

**Learner-to-learner isolation on the learning tables was already sound.** Both
defects were confined to `public.users`.

---

## Data integrity

Every learner-visible number was traced to its query and diffed against a
service-role oracle (`scripts/audit/learner-db.ts`), re-read immediately before
each comparison because the act of testing kept changing it.

**Before the fix** — dashboard vs database, same learner, same moment:

| Course | Dashboard | Database |
|---|---|---|
| Introduction to Reading | 3/9, 33% | 2/9, 22% |
| Digital Literacy | 3/9, 33% | 1/9, 11% |
| Animal Adventures | **10/10, 100%** | **4/10, 40%** |
| Lets learn about animal | **5/5, 100%** | **0/5, 0%** |
| Lessons Mastered | 26 | 11 |

**After:** every figure matches, and matches across Dashboard, Enrolled,
Progress and Course Detail simultaneously. Verified again after completing a
lesson for real: 4/9 → 5/9 in both the database and the UI, surviving a full
page reload.

The root cause deserves recording: `lesson_progress` carries both `is_viewed`
and `is_completed`. The learner portal counted `is_viewed` at all seven of its
read sites and its own `completeLesson()` wrote `is_viewed` and never
`is_completed`; `admin-analytics.ts` and `educator-analytics-api.ts` count
`is_completed` and explicitly model the gap as `skipped = is_viewed &&
!is_completed`. Cross-tabulating all 137 rows separated seeded data from real
completions cleanly — 13 rows had `summary_completed`, which only
`completeLesson()` ever sets — so the backfill promoted exactly those 13 and
left the 24 seeded partial-progress rows alone.

---

## Fake data

A codebase sweep of `mockData|dummyData|fakeData|sampleData|placeholder|Math.random`
plus hardcoded percentages across learner-facing files found **one** value
presented as the learner's own data that was not:

- **Study time** — `getLearnerStats()` computed `completed_lessons × 10 minutes`
  while `lesson_progress.time_spent_learning` (populated on 122 of 137 rows)
  sat unused in the very rows being read. **Removed**, now sums the real column.

Everything else checked out. The XP figures on `/learner/achievements` are a
deterministic formula over real stats (verified by hand: 24 lessons × 100 +
round(0.91 × 24 × 50) + 2 × 500 + 2 × 200 = 4,892, matching the screen exactly),
not fabrication. Preset preview data and seed content were left in place.

**Retained, flagged, not fixed:** the audit learner holds an `issued` certificate
for a course they are 2/9 through. It predates this audit and was reachable
through the weak eligibility gate (#4). Deleting it would destroy demo/report
data; the gate that allowed it is now closed.

---

## Accessibility

The prior accessibility programme (`docs/accessibility/`) states plainly that
every ✅ across its nine phases was "correct by static analysis" and had **never
been seen rendered** — port 3000 was always held by another session. This is the
first live verification of that work. Most of it holds up.

**Presets — all three applied correctly**, verified against their definitions:

| | Dyslexia | ADHD | Autism |
|---|---|---|---|
| font / size | Atkinson Hyperlegible / 19px ✅ | Arial / 18px ✅ | Arial / 18px ✅ |
| line spacing | 1.7 ✅ | 1.6 ✅ | 1.6 ✅ |
| word spacing | 0.16em ✅ (WCAG floor) | 0.08em ✅ | 0.08em ✅ |
| background tint | cream ✅ | grey ✅ | pale blue ✅ |
| structure / layout | full / chunked ✅ | **minimal** ✅ | **checklist** ✅ |
| animation | low ✅ | low ✅ | **none** ✅ |
| distinctive behaviour | reading spotlight, TTS on | distraction-free (sidebar and top bar genuinely removed), simplified 4-item menu | muted colours, structured plain-language menu |

These are real behavioural differences, not colour themes. The **preset preview
dialog is excellent** — it lists all 11 changes with a plain-language rationale
for each before applying anything.

**Persistence:** settings live in `user_profiles.accessibility_prefs` (JSONB),
mirrored to `localStorage`. Verified: change → navigate → refresh → still
applied; written to the database; and RLS confines `user_profiles` to the owner,
so learner A's settings cannot reach learner B. "Default" doubles as the reset
control the brief asked for. The `user_accessibility_preferences` **table is dead**
— it exists, has no row for this learner, and nothing reads it.

**TTS:** starts, stops, honours voice and rate, and offers 0.75×–1.5× speed.
It kept speaking after navigation with no stop control on the destination page —
**fixed and verified**. It still has no pause/resume, only play and stop.

**Typography reach — the one real gap.** With Dyslexia active,
`--user-word-spacing` resolved correctly to 0.16em on the root, yet every
learner-facing text element computed `word-spacing: 0px`; driving the variable to
`1em` changed nothing while `--user-font-size` took effect in the same
recalculation. The rules were applied only through a `body`-scoped selector that
never landed. Now applied to the content containers as well:

- **Lesson content: fixed and verified** — `.rich-content` computes 19px,
  line-height 32.3px (= 1.7), word-spacing 3.04px (= 0.16em). This is the surface
  that matters most for the accommodation.
- **Dashboard and list pages: still not applied.** Those pages use plain Tailwind
  text utilities with no `.rich-content` wrapper. Font size and font family do
  scale there; word and line spacing do not. **Not fixed — see Remaining issues.**

**Focus / distraction-free:** genuinely removes the sidebar and top bar, and is
escapable via a clearly labelled floating button. Worth noting as a design
tension rather than a bug: the ADHD preset enables distraction-free *and* defines
a custom simplified sidebar, so that sidebar is never seen until the learner
exits distraction-free mode.

**Chunked content:** `data-chunked` and `layout_mode: 'chunked'` are set by all
three presets and drive real pagination (the Favourites page paginates at 3 per
page under it). Note that `handleApplyPreset` forces `chunked` whenever
`chunked_content_mode` is true, which makes the Autism preset's declared
`layout_mode: 'scroll'` dead configuration.

**Easy Read:** an `EasyReadIndicator` renders in the shell, but no preset in
`ACCESSIBILITY_PRESETS` sets a reading level, so it was never exercised in this
audit. **Untested — see Remaining issues.**

---

## Learning flow

`Course → Lesson → Content → Activity → Completion → Next` works end to end.

Verified live on "Learning Numbers 1-20": course detail showed 44%, 4 of 9, with
lessons 1-4 as Review, lesson 5 Continue and 6-9 Locked — sequential unlocking is
real. Completion correctly **refused** with an itemised "Incomplete Tasks" dialog,
then succeeded once the requirements were met, wrote a real `lesson_progress`
row, advanced the course to 5/9, and survived a full reload. Quiz panels showed
real attempt history (1 attempt, 85%, passed) matching `quiz_attempts`.

Achievements are driven by real `user_achievements` rows (1 earned, 2 locked with
their criteria shown). Certificates belong to the logged-in learner and could not
be reached by manipulating a certificate id.

---

## UX

Changes were made only where testing showed a concrete problem:

- **Navigation is now real links** with `aria-current`, so the browser's own
  affordances work and screen readers announce navigation as navigation.
- **Achievements is reachable**, and Achievements/Certificates are no longer
  conflated under one mislabelled entry.
- **"Enrolled" says what it is** instead of telling a learner with five enrolled
  courses to "discover new skills".
- **Favourites is a complete workflow** rather than one-way.
- **The video dead end has an exit.**

Deliberately *not* done: no new dashboard cards, charts, gamification or nav
items beyond exposing the page that already existed. The portal's information
hierarchy is already reasonable — the dashboard leads with a greeting, four real
stats, "Recommended Next Steps" with genuine reasons ("You scored 39% on the
Birds in the Sky quiz"), then courses in progress with Continue buttons. The
answer to "can a learner tell what to do next?" was already yes.

One clarity note left as-is: **"Average Score" averages every attempt**, so
retakes drag it down and repeated 100s inflate it (11 of 18 attempts are 100).
Mean of best-attempt-per-quiz would be 93.1 rather than 91. The arithmetic is
correct and the label is literally accurate, so this is a product decision, not
a defect.

---

## Performance

Measured on one dashboard load: **68 requests**, of which

- **`/auth/v1/user` × 18.** Every one of the 48 exported functions in
  `learner-api.ts` begins with `ensureUserId()`, which calls
  `supabase.auth.getUser()` — a network round-trip, not a cached read, and each
  one blocks the query that follows it.
- `/rest/v1/users` × 12 across three different column shapes.
- `enrollments?select=course_id` × 6.
- **`POST /api/recommendations/generate` × 3** on a single page load.

React Strict Mode doubles some of this in development, but 18 identical auth
round-trips on the critical path is real. **Not fixed** — it is a cross-cutting
change to all 48 functions and carries regression risk disproportionate to an
audit pass. Recorded with the measurement so it can be scheduled properly.

No 4xx or 5xx responses were seen on any learner route.

---

## Features added

Only two, both closing gaps found in testing rather than adding surface:

- **Remove-from-favourites** on the Favourites page, with optimistic update,
  rollback on failure, and a labelled control.
- **"I have watched this video"** — an alternative path for the video
  requirement, so a failed or unusable embed cannot strand a learner.

---

## Remaining issues (not fixed)

1. **Typography accommodations do not reach dashboard/list pages.** Word and line
   spacing apply to lesson content but not to the dashboard, course catalogue or
   Progress pages, which use plain Tailwind text utilities. Every `body`-scoped
   rule for these properties fails there, including a pre-existing `!important`
   one — I could not fully explain the cascade behaviour within this session and
   chose to report it honestly rather than guess. Font size and family do apply.
2. **`ensureUserId()` performance** — 18 auth round-trips per screen (above).
3. **Easy Read untested** — no preset sets a reading level, so the feature was
   never triggered.
4. **TTS has no pause/resume**, only play and stop.
5. **An activity renders with no content** — "Interactive: Even and Odd Numbers"
   shows *"No content in this activity."* A broken authored artefact, not a code
   defect; it does not block completion.
6. **`user_accessibility_preferences` is a dead table** — nothing reads or writes it.
7. **`community-api.ts` selects columns that do not exist** (`display_name`, `role`
   on `user_profiles`) and joins user ids against `user_profiles.id` rather than
   `user_id`. Two bugs in one query; the surface appeared unreachable from the
   learner lesson page, so it was not exercised.
8. **The "Incomplete Tasks" dialog stays open after completion succeeds** (cosmetic).
9. **OpenDyslexic loads from a third-party CDN** (`fonts.cdnfonts.com`) which
   failed with `ERR_CONNECTION_RESET` in this environment — that font option
   silently falls back.

### Environmental limitations

- **Screenshots were unavailable** — the Browser pane was never displayed, so the
  page did not composite frames and `requestAnimationFrame` never fired.
  Verification was done through the accessibility tree, computed styles, console
  and network instead, which is stricter than visual inspection for everything
  except pure appearance.
- **The production build was deferred to the end** and run into an isolated
  `distDir`, because `next dev` was live on the same project directory
  throughout. It succeeds; all learner routes compile.
- **Direct Postgres access was impossible** — `SUPABASE_PASSWORD` in `.env.local`
  is stale. All migrations were applied through the authenticated Supabase CLI.

### Process note

The first commit unintentionally included the admin/educator changes that were
already uncommitted in the working tree when the audit began. Nothing was lost
and nothing was overwritten, but that commit is not purely learner-portal work.
History was left intact rather than rewritten around someone else's in-progress
changes.

---

## Final status

| Area | Status | Why |
|---|---|---|
| Dashboard | ✅ | Every statistic verified against the database after fixing the completion-column defect |
| My Courses | ✅ | Grouping header; sub-items all reachable and correctly labelled |
| All Courses | ✅ | Search, category, difficulty, sort, favourite and enrolled state all work |
| Enrolled | ✅ | Exactly the learner's 5 enrollments; progress matches Progress and Detail |
| Favourites | ✅ | Full round-trip verified against the database; remove control added |
| Progress | ✅ | Matches the oracle; live completion propagated correctly through a refresh |
| Achievements | ✅ | Now reachable; XP formula verified by hand against real stats |
| Accessibility | ⚠️ | Presets, persistence and isolation all correct — but word/line spacing still do not reach dashboard and list pages |
| Course Detail | ✅ | Progress, certificate progress, lesson states and sequential locking all correct |
| Lesson Experience | ✅ | Completion gating, real DB write, resume and refresh-persistence verified |
| Quizzes/Activities | ⚠️ | Attempt history, scoring and gating verified against real `quiz_attempts`; one authored activity renders with no content |
| TTS | ⚠️ | Play/stop/voice/rate work and the navigation leak is fixed; no pause/resume |
| Easy Read | ⚠️ | Not exercised — no preset sets a reading level, so the feature never triggered |
| Chunked Content | ✅ | Drives real pagination; note that `layout_mode: 'scroll'` in the Autism preset is dead configuration |
| Focus Mode | ✅ | Genuinely removes chrome, clearly escapable; sticky-override bug fixed |
| Accessibility Presets | ✅ | All three verified setting-by-setting against their definitions, and persisted |
| Certificates | ✅ | Eligibility gate fixed on both the client and the authoritative server route; no IDOR |
| Security/Data Isolation | ✅ | 26 probes, 0 leaks; both `users` defects fixed and regression-checked against admin and educator |
| Mobile/Responsive | ✅ | No horizontal overflow at 375px on dashboard, catalogue, lesson or progress; accessibility modal fits and its Save button is reachable |
| Performance | ⚠️ | Correct but wasteful — 18 auth round-trips and 3 duplicate recommendation POSTs per dashboard load; not fixed |
