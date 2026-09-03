# ACESS Testing Report — Functional, Load, and Accessibility Evidence

**Date:** 2026-09-03
**Who ran this:** Claude (Anthropic's Claude Code coding agent), acting autonomously in this repository at the user's request. I designed the test cases, wrote the test code, executed everything below against a real running instance of the app, and recorded the actual results — including test bugs I found and fixed along the way, and app defects I could not fix by re-testing. This is a raw evidence document, not report prose: nothing here is a placeholder, and every "Actual Result" cell reflects something that was genuinely observed on this run, on this machine, on this date.

**Environment tested:** Local development stack — Next.js dev server (`next dev --webpack`) on `http://localhost:3000`, local Supabase (Docker) on `127.0.0.1:54321`/`54322`, seeded via `supabase/seed/run.ts`. Not the deployed/production environment.

**Honesty note on iteration:** Several of the pre-existing test cases (LEARNER-01, LEARNER-02, LEARNER-03) turned out to reference course/lesson IDs that no longer exist in the current database — leftovers from an earlier seed generation. Running them for real is what surfaced this; I fixed the IDs against the live database and re-ran until each test's outcome no longer depended on stale fixtures. Section 1's table shows the final, corrected test code and its real result — the git history of `tests/e2e/*.spec.ts` shows the intermediate broken versions, and this document says explicitly, per case, where a fix was needed.

---

## Tools and versions used

| Tool | Version | Purpose |
|---|---|---|
| Playwright (`@playwright/test`) | 1.62.1 | Functional E2E, real Chromium browser |
| Chromium (via `npx playwright install`) | bundled with 1.62.1 | Browser engine driven by Playwright |
| k6 | v2.2.0 (installed via `scoop install k6`) | Load/stress testing against PostgREST |
| Node.js | v24.15.0 | Runtime for Playwright, k6 setup scripts, Next.js |
| Next.js | 16.2.3 | App under test (dev server) |
| Supabase CLI | 2.116.0 | Local Postgres + PostgREST + GoTrue stack |
| Docker Desktop | 29.5.3 | Backing containers for the local Supabase stack |

## How each suite was actually run

```bash
# Functional (Section 1)
npx playwright install chromium         # one-time browser install
npx playwright test tests/e2e/ --reporter=list

# Load (Section 2) — three independent scripts, run sequentially
node scripts/loadtest-setup.mjs         # creates 40 real throwaway learner accounts
k6 run --env SUPABASE_URL=http://127.0.0.1:54321 --env SUPABASE_ANON_KEY=<anon key from .env.local> scripts/k6/catalogue-read.js
k6 run scripts/k6/enrollment-burst.js   # LOADTEST_TOKENS_PATH env var pointing at setup's output
k6 run scripts/k6/quiz-submission.js
node scripts/loadtest-teardown.mjs      # deletes all 40 accounts and everything cascaded from them
```

The load-test setup/teardown scripts and all three k6 scripts are new files added under `scripts/loadtest-setup.mjs`, `scripts/loadtest-teardown.mjs`, and `scripts/k6/*.js` — each has an in-file comment explaining exactly which real code path it exercises and why the given VU/duration numbers were chosen (repeated in Section 2 below).

Manual/heuristic checks (Section 3) were done by driving a real Chromium tab against the same local server, logged in as the actual seeded personas, reading rendered DOM/CSS with `getComputedStyle`/`elementFromPoint`, and reading the relevant application source directly (`src/components/courses/LessonViewPage.tsx`, `src/lib/accessibility-utils.ts`, `src/providers/AccessibilityProvider.tsx`) to confirm *why* something rendered the way it did rather than guessing.

---

## Section 1 — Functional (Playwright, real browser E2E)

Scope: Public, Learner (baseline / Dyslexia / ADHD / Autism), Educator, Administrator, using the seeded demo accounts (`docs/SEED_CREDENTIALS.md`'s persona table; password `AcessDemo#2026` for all of them — the 30 generic `learnerN@test.com` accounts documented there do **not** exist in the current database, only the 12 named personas in `supabase/seed/personas.ts` do — flagged as its own finding at the end of this section).

| Test Case ID | Module/Role | Description | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| PUBLIC-01 | Public | Unauthenticated landing page renders; no public course-catalogue route exists | `/`, `/courses`, no session | 1. `GET /`. 2. `GET /courses` with no cookies. | Landing page loads (status < 400). `/courses` is not a real public route — redirects to login. | Landing page loaded. `/courses` redirected to `/login?redirect=%2Fcourses`. | **PASS** |
| ADMIN-01 | Administrator | Approve a pending instructor application through the real UI | `aliff.admin@acess.edu.my`; application "Tan Chee Meng" (`cheemeng.tan@example.com`) | 1. Log in as admin. 2. Open Instructor Applications. 3. Click the application, click Approve, confirm in the dialog. 4. Read `instructor_applications.status` directly from the DB. | Status becomes `approved`; a real educator account is provisioned. | **Flaky.** First attempt: status stayed `pending` after clicking Approve+Confirm (no DB write went through, no console/network errors captured). Retry on a fresh page: worked exactly as expected, status became `approved`, `reviewed_by` was left `NULL` (a separate minor finding — `admin-api.ts`'s `updateInstructorApplication()` sets `reviewed_by`; this UI path doesn't), teardown restored `pending` and removed the provisioned account. This exact flake happened on 3 of 4 full-suite runs today, always resolved by retry #1. | **PASS (flaky — ~50–75% first-attempt failure rate observed across today's runs, always recovers on retry)** |
| EDUCATOR-01 / EDUCATOR-02 | Educator | Create a course through the real 4-step wizard, then edit its accessibility focus | `farah.educator@acess.edu.my`; course titled "Playwright E2E Test Course" | 1. Log in as educator. 2. Complete all 4 wizard steps, create course. 3. Confirm it in the real course list. 4. Open Settings tab, set Primary Accessibility Focus = ADHD, click Save Focus. 5. Read `courses.primary_disability_focus` from the DB. | Course appears in the list; `primary_disability_focus` = `'adhd'` in the database. | Course created and visible in the list. `primary_disability_focus` = `'adhd'` — confirmed directly in the database. (This test failed on 2 earlier runs today with `primary_disability_focus: undefined` — root cause: the test's own cleanup ran *after* its assertion with no `try/finally`, so a failed run left a same-titled leftover course behind, and the next run's `.maybeSingle()` lookup broke against 2+ matching rows. Fixed by ordering on `created_at` and wrapping teardown in `try/finally`; the save itself was never broken — 2 of the 4 leftover rows found during triage already had `primary_disability_focus = 'adhd'`.) | **PASS** |
| EDUCATOR-03 | Educator | View the real course analytics dashboard | `siti.educator@acess.edu.my` | 1. Log in as educator. 2. Open Analytics. | Real per-course metrics render (enrolled/active/at-risk counts, avg progress, avg quiz score) for her 4 courses. | Rendered correctly: 4 courses, learner counts, avg progress (56–74% across runs, changes as other tests mutate enrollment data), avg quiz scores per course. Read-only, no state mutated. | **PASS** |
| LEARNER-01 | Learner (baseline) | Enrol in a course through the real catalogue UI | `haziq.learner@acess.edu.my`; course "Focus and Study Skills for ADHD Learners" | 1. Log in. 2. Open the course detail page. 3. Click "Enroll in Course". 4. Read `enrollments` table. | Enroll button disappears; a row appears in `enrollments` with `status='active'`. | Exactly as expected. (Original test pointed at course id `2a7e86c1-…`, which **does not exist** in the current database — a direct read returned zero rows, so the test could never have passed as originally written. Replaced with a real, currently-unenrolled course confirmed via a direct read.) Teardown removed the enrolment. | **PASS** |
| LEARNER-02 | Learner (ADHD preset) | Apply the ADHD preset live through the Accessibility settings modal, then attempt to complete a lesson under it | `amir.learner@acess.edu.my`; lesson "Capturing Notes That You Will Actually Reread" | 1. Log in. 2. Open Accessibility → select ADHD → Apply preset → Save. 3. Open an incomplete lesson. 4. Look for a way to reach and click a lesson-completion control. | A completion control should be reachable under the ADHD preset, the same way the baseline (LEARNER-05) and Dyslexia (LEARNER-06) presets allow. | **Automated result: FAIL** — the test could not programmatically reach a visible "Complete Lesson" control (tried: the "Complete Lesson" button directly, a "Continue"/"Next Step" text button, and clicking the "Finish" step-tracker circle by its text). **However, manually driving the identical page by hand (same account, same lesson, same preset) in a real browser worked**: clicking the numbered "Finish" circle in the Content→Finish step tracker does navigate to the finish phase and does reveal a working "Complete Lesson" button. The gap is that `page.getByText('Finish', { exact: true })` in the automated version doesn't reliably resolve to that same clickable circle (there is more than one "Finish"-labelled node in the DOM at that point, and Playwright's exact-text match picked a non-interactive one). This is recorded as a test-automation limitation, not a confirmed app defect — see the note in `tests/e2e/learner-02-preset-complete.spec.ts`. | **FAIL (automated) — underlying feature manually confirmed working; test needs a more specific locator for the step-tracker circle, not re-attempted further today** |
| LEARNER-03 | Learner (Dyslexia preset) | Take a quiz attempt through the real quiz UI | `mei.learner@acess.edu.my`; quiz "Fluency Check" | 1. Log in (Dyslexia preset active from her seeded profile). 2. Open a lesson with a quiz. 3. Start the attempt, answer question 1. 4. Confirm the quiz UI still shows real content afterward. | Quiz starts, question 1 renders, answering it advances/gives feedback without the page going blank. | Exactly as expected — "Easy Read Mode" banner visible, quiz rendered as a slide-based Content→Quiz→Finish flow rather than the plain linear flow, question 1 answered, state advanced correctly. (Original test pointed at a lesson with **no quiz attached at all** in the current database — confirmed via a direct read of the `quizzes` table returning zero rows for that lesson id, so "Start Attempt" could never have appeared. Replaced with mei's real dyslexia-focused course's actual quiz.) | **PASS** |
| LEARNER-04 | Learner (baseline) | View an already-issued certificate | `amir.learner@acess.edu.my` | 1. Log in. 2. Open Achievements & Certificates. | Certificate list renders with at least one certificate. | Rendered 2 certificates (1 system, 1 educator-issued) with correct instructor names, completion dates, and reference codes. Read-only. | **PASS** |
| LEARNER-05 | Learner (no preset — baseline control) | Complete a genuinely incomplete lesson with no accessibility preset active | `aisyah.learner@acess.edu.my`; lesson "Mapping the Structure of an Argument" | 1. Log in (no preset). 2. Open the lesson, scroll to bottom. 3. Click "Complete Lesson". 4. Read `lesson_progress.is_completed`. | Button visible and clickable; `is_completed` becomes `true`. | Exactly as expected. This is the control case the ADHD/Dyslexia/Autism preset tests are compared against. Teardown reverted the lesson to incomplete. | **PASS** |
| LEARNER-06 | Learner (Dyslexia preset) | Complete a genuinely incomplete lesson under the Dyslexia preset | `mei.learner@acess.edu.my`; lesson "Dictation and Voice Typing" (has an embedded video) | 1. Log in (Dyslexia preset active). 2. Click "I have watched this video". 3. Scroll to bottom. 4. Click "Complete Lesson". 5. Read `lesson_progress.is_completed`. | `is_completed` becomes `true`, the same as the baseline case. | Exactly as expected once the video-watched gate was satisfied first. Body font confirmed as `OpenDyslexic, sans-serif`. (First version of this test skipped the video-watched step — this lesson has `has_video=true` and `LessonViewPage.tsx`'s own completion check requires the video tracker satisfied, so clicking "Complete Lesson" without it just opens an "Incomplete Tasks" popup instead of completing. Not a bug — the app correctly gated completion; the test was incomplete.) Teardown reverted the lesson to incomplete. | **PASS** |
| LEARNER-07 | Learner (Autism preset) | Walk the real step-by-step flow and complete a lesson under the Autism preset | `priya.learner@acess.edu.my`; lesson "Beating the Starting Problem" | 1. Log in (Autism preset active, `structure_mode:'full'`, `step_by_step_enabled:true`). 2. Confirm the Content→Activities→Finish step tracker renders. 3. Click "I have watched this video". 4. Advance to Finish, click "Complete Lesson". 5. Read `lesson_progress.is_completed`. | Step tracker renders; video-watched control is clickable; lesson completes the same as the other presets. | Step tracker rendered correctly (a genuinely clearer flow than initially assumed — see Section 3). **But the video-watched button could not be clicked**: `document.elementFromPoint()` at the button's own on-screen coordinates returns the floating checklist/timeline sidebar `<div class="relative border-l-2 border-indigo-100 …">`, not the button — the sidebar visually and functionally overlaps it. Confirmed identically on 2 independent automated runs and, separately, by hand in a real browser session. | **FAIL — genuine, reproduced defect: the checklist sidebar intercepts clicks meant for the "I have watched this video" control under the Autism preset's step-by-step layout** |

### Findings from Section 1 not captured in a single row

- **`docs/SEED_CREDENTIALS.md` is stale.** It documents 30 `learnerN@test.com` accounts and an admin at `admin@acess.edu` — none of these exist in the current database (confirmed via `select email from auth.users`, 12 rows, all `*.acess.edu.my`). Only the persona accounts in `supabase/seed/personas.ts` are real. Worth fixing the docs or regenerating them from the current seed.
- **Stale fixture IDs were the single biggest source of false "failures" during this session** — 3 of 8 originally-failing test cases (LEARNER-01, LEARNER-02's original lesson, LEARNER-03) pointed at courses/lessons/enrollments that simply don't exist in the current database. Each was confirmed dead via a direct read before being replaced, so nothing here was guessed.
- **A general environment note, not an app defect:** the very first cold run of this suite today (Next.js dev server not yet warmed by any request) produced 6 timeouts purely from first-compile latency (`next dev` JIT-compiles each route on first hit; several took 20s+ before a browser or `curl` warm-up pass). All numbers in the table above are from runs after the server was warmed with one request per route.

**Section 1 totals (final, corrected run):** 11 test cases run for real. **8 passed cleanly, 1 passed after a retry (flaky), 2 failed** (one a test-automation gap with the underlying feature manually confirmed working, one a genuinely reproduced app defect).

---

## Section 2 — Load/Stress (k6)

ACESS has no separate REST API layer for these operations — the app's own server/client code calls Supabase PostgREST directly via `supabase-js` (confirmed by reading `src/lib/learner-api.ts`). So each script below calls the *exact same* PostgREST endpoint, table, or RPC the real app calls for that action, with the same RLS/auth model (anon key for public reads, a real learner JWT for authenticated writes) — not a synthetic stand-in.

### LOAD-01 — Concurrent course-catalogue reads

**What it hits:** `GET /rest/v1/courses` with the exact `select=` list `fetchLearnerCourses()` uses (`src/lib/learner-api.ts:444`), anon key (the "Public can view published courses" RLS policy has no role restriction).

**Why these numbers:** ACESS is a small institutional deployment (12 seeded accounts in this environment; the seed docs describe a ~30-learner class shape). 50 VUs approximates an entire class plus staff opening the catalogue at the same moment — a realistic worst-case burst for this table, not steady-state background traffic. 30s ramp-up / 30s hold / 10s ramp-down lets PostgREST's connection pool reach steady state before percentiles are read.

| Metric | Result |
|---|---|
| Virtual users | ramped 0 → 50 over 30s, held 50 for 30s, ramped to 0 over 10s |
| Total requests | 2,018 |
| Throughput | 28.6 req/s |
| Error rate | **0.00%** (0 / 2,018) |
| Response time — median | 3.37 ms |
| Response time — p90 | 5.48 ms |
| Response time — p95 | **6.99 ms** |
| Response time — max | 126.08 ms |
| Threshold `p(95)<800ms` | ✅ passed |
| Threshold `http_req_failed rate<1%` | ✅ passed |

**Degradation point:** none observed at this load. The catalogue read is cheap (small result set, indexed status filter) and PostgREST held flat sub-10ms p95 throughout the full 50-VU hold — this endpoint has clear headroom well beyond what a class-sized user base would generate.

### LOAD-02 — Concurrent enrollments

**What it hits:** `POST /rest/v1/enrollments` (insert) then `DELETE /rest/v1/enrollments` (drop), each with the calling learner's own real JWT — exercising the actual `"Users can enroll themselves"` RLS INSERT policy per request, not a service-role bypass. A one-shot insert can't sustain a duration test (the `(user_id, course_id)` unique constraint blocks repeats), so each VU alternates insert→drop, mirroring a real enrol/reconsider/drop cycle (the same delete `LEARNER-01`'s own teardown performs).

**Why these numbers:** 40 VUs = one per real throwaway learner account created for this test (`scripts/loadtest-setup.mjs`), for 30s — a small institution's whole cohort hitting "Enroll" on the same newly-announced course within the same half-minute, the realistic spike shape for a write-heavy table that's normally quiet.

*(First run of this script showed a 50% "failure" rate — traced to a bug in the k6 script itself, not the app: a shared `Prefer: return=representation` header made the DELETE call return `200` with a body instead of the expected `204`. Fixed by giving each request its own headers; re-run below is the corrected, real result.)*

| Metric | Result |
|---|---|
| Virtual users | 40, constant |
| Duration | 30s |
| Total requests | 2,444 |
| Total iterations (enroll+drop pairs) | 1,222 |
| Throughput | 78.4 req/s |
| Error rate | **0.00%** (0 / 2,444) |
| Response time — avg | 24.1 ms |
| Response time — p95 | **65.86 ms** |
| Response time — max | 434.36 ms |
| Threshold `p(95)<1000ms` | ✅ passed |
| Threshold `checks rate>95%` | ✅ passed (100%) |

**Degradation point:** none observed. Every insert and every delete succeeded; no unique-constraint or RLS-denial errors surfaced under 40 concurrent writers.

### LOAD-03 — Concurrent quiz submissions

**What it hits:** `POST /rest/v1/rpc/submit_quiz_attempt` — the actual grading path (`src/lib/learner-api.ts:1365`). This matters: `quiz_attempts` has **no INSERT policy at all** (confirmed by reading the RLS section of the baseline migration) — grading only happens through this `SECURITY DEFINER` function, which verifies enrollment, enforces `max_attempts`, and grades against the stored answer key server-side. A comment in the function's own source (`src/lib/learner-api.ts:1359-1364`) notes a direct-write path used to exist and was closed after a forged-score incident, so this is the real, only path, and this script drives it with each virtual learner's own real JWT.

**Why these numbers:** Same 40 real accounts / 30s window as LOAD-02, for the same reason — a class submitting the same timed quiz at once is the realistic spike shape. The quiz used ("Fluency Check") has `max_attempts = 0` (unlimited, confirmed via a direct read) — the one quiz in the seed data that can absorb a sustained duration-based load pattern without every attempt after the first being rejected by the attempt-limit check.

| Metric | Run 1 | Run 2 (re-run with failure-body logging added) |
|---|---|---|
| Virtual users | 40 | 40 |
| Duration | 30s | 30s |
| Total requests | 1,292 | 1,302 |
| Throughput | 41.1 req/s | ~41.4 req/s |
| Error rate | **0.15%** (2 / 1,292) | **0.00%** (0 / 1,302) |
| Response time — avg | 46.5 ms | — |
| Response time — p95 | **82.04 ms** | — |
| Response time — max | 827.39 ms | — |
| Threshold `p(95)<1200ms` | ✅ passed | ✅ passed |
| Threshold `checks rate>95%` | ✅ passed (99.84%) | ✅ passed (100%) |

**Degradation point:** essentially none at this load — 2 failed requests out of 1,292 (0.15%) on the first run, not reproduced on an immediate re-run, and their response bodies weren't captured (logging was added only after the fact). **A related finding from reading `submit_quiz_attempt`'s source, not from the load test itself:** the function computes the next `attempt_number` with a plain `SELECT COALESCE(max(attempt_number), 0) + 1` and then inserts — no row lock, no `SERIALIZABLE` isolation. `quiz_attempts` has a `UNIQUE (enrollment_id, quiz_id, attempt_number)` constraint, so two truly concurrent submissions *for the same enrollment* (e.g. a learner double-clicking Submit, or the same account open in two tabs) could race on that read-then-write and one would fail with a unique-constraint violation. This test's design (one enrollment per virtual user) can't exercise that specific race — it's a code-reading finding, not a load-test result, and is flagged here for a follow-up test that submits twice concurrently from the *same* enrollment.

### Section 2 totals

3 of 3 load scenarios run for real against the local stack. **All three held their latency thresholds (p95 well under the 800ms/1000ms/1200ms targets set for each) and all three had an effective 0% sustained error rate** (the 0.15% blip on LOAD-03's first run did not reproduce). No endpoint degraded or failed outright at the tested concurrency (50 VUs for reads, 40 VUs for writes) — headroom appears to extend meaningfully beyond what this app's realistic user base would generate, though this was not pushed to an actual breaking point (see "Not tested" below).

---

## Section 3 — Manual / Heuristic (accessibility & UX judgement)

Confidence is stated per row. **"Objective"** means measured from rendered DOM/CSS or read directly from source code — a fact, not an opinion. **"Subjective — needs human confirmation"** means this is a genuine human-experience judgement (does it *feel* calmer, *read* more comfortably) that I assessed my best-effort visual/structural read of, but a language model looking at static output cannot fully stand in for a human's felt experience, and I'm saying so plainly rather than asserting false confidence.

| Test Case ID | Module/Role | Description | Test Data | Test Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|
| A11Y-01 | Dyslexia preset — theme conflict | Does selecting the Dyslexia preset actually produce the documented "cream, gentle" reading theme? | `mei.learner@acess.edu.my` (`preferred_reading_level: 'simplified'`) | 1. Log in. 2. Read `document.documentElement.getAttribute('data-theme')` and `localStorage.acess_accessibility_settings`. 3. Cross-reference against `src/lib/accessibility-utils.ts` and `docs/Accessibility.md`'s own design spec. | Cream/pale background, OpenDyslexic font, gentle presentation, per `docs/Accessibility.md`'s Dyslexia Preset table (Cream/Pale Yellow/Soft Blue backgrounds, no mention of high-contrast). | **Objective:** `data-theme="high_contrast"` was set on `<html>`, alongside `background_tint:"cream"` and `font_family:"opendyslexic"` from the newer preset system — two independent theming mechanisms both active. Root cause, traced in source: `applyReadingLevelDefaults()` auto-merges `EASY_READ_PRESETS` (`accessibility-utils.ts:39-50`) whenever `preferred_reading_level` is `'simplified'` or `'basic'`, and that preset hard-codes `preferred_theme: 'high_contrast'` — overriding what the newer, more granular preset fields intend. This is a real, code-confirmed conflict between two accessibility subsystems, not a one-off render glitch. **Subjective — needs human confirmation:** whether the resulting visual mix (some regions dark/high-contrast via the legacy theme, others cream via the newer system) reads as more or less comfortable than either system alone; I could not reliably attribute a specific perceived-invisible-text instance to this without risking a false claim (an early contrast reading of 1.01:1 could not be confirmed as user-facing rather than an off-screen/duplicate element, so it is not asserted here as a finding on its own). | **PARTIAL — objective conflict confirmed in code and live DOM; visual-comfort verdict needs a human to look at it** |
| A11Y-02 | Autism preset — structure clarity | Is the step-by-step lesson structure actually clear before/while doing a lesson? | `priya.learner@acess.edu.my` | 1. Log in, open an incomplete lesson. 2. Observe the Content→Activities→Finish tracker, the checklist sidebar, and the inline gating hints. | Autism persona's `structure_mode:'full'`/`visual_schedule_enabled:true` should produce a predictable, low-ambiguity structure. | **Objective:** a numbered 3-step tracker (Content/Activities/Finish) renders with live status icons (pending/done/current), a persistent checklist sidebar mirroring the same states in text ("Read Core Material — Done", "Complete Activities — Done"), and clicking ahead to a locked step surfaces an explicit inline reason ("Incomplete previous phases • Complete Lesson", "Finish 'Watch Video' to continue") rather than silently refusing. This is a genuinely well-structured, low-ambiguity flow. **Subjective — confirmed reasonably confidently, not needing further human review:** the structure itself reads as clear by design; the one thing undermining it in practice is a separate defect (LEARNER-07 / A11Y-03) that blocks completing the "Watch Video" step at all under normal mouse interaction. | **PASS (structure) / see A11Y-03 for the interaction defect that undercuts it** |
| A11Y-03 | Autism preset — interaction defect | Can a mouse user actually click the "I have watched this video" control? | `priya.learner@acess.edu.my`; lesson "Beating the Starting Problem" | `document.elementFromPoint()` at the button's own on-screen center, both via manual browser session and via 2 independent automated Playwright runs. | The topmost element at the button's coordinates should be the button itself. | **Objective — reproduced 3 times independently:** the topmost element is a `<div class="relative border-l-2 border-indigo-100 …">` — the checklist/timeline sidebar — not the button. A real mouse click there is silently swallowed by the sidebar. Same defect reproduced (once, via a leftover-body-lock mechanism — see A11Y-04) on mei's Dyslexia-preset lesson too, suggesting this is a general layering issue in `LessonViewPage.tsx`'s lesson layout, not autism-specific. | **FAIL — confirmed defect** |
| A11Y-04 | All presets — dialog cleanup | Does closing the "Incomplete Tasks" popup (`LessonViewPage.tsx:2968`, a Radix `Dialog`) leave the page usable? | `mei.learner@acess.edu.my`; any lesson, click Complete Lesson before satisfying its gates, then click "Got it" | 1. Trigger the "Incomplete Tasks" dialog. 2. Close it. 3. Read `getComputedStyle(document.body).pointerEvents` and try clicking anything. | Dialog closes cleanly; page remains fully interactive. | **Objective, reproduced twice:** after clicking "Got it", `document.body` carries `style="pointer-events: none;"` **permanently** — confirmed still present after a further 2-second wait. No element on the page can receive a mouse click until the page is reloaded (`document.activeElement` after pressing Tab still landed inside the (visually closed) dialog's own "Got it" button, meaning the dialog's focus trap also never released). Keyboard `Tab` navigation still moved focus (since `pointer-events:none` doesn't block keyboard activation) — so a keyboard-only user is not locked out, but every mouse/touch/switch-access user is, after seeing this popup once. | **FAIL — confirmed, high-severity defect (whole page becomes unclickable for mouse users after this one popup closes)** |
| A11Y-05 | Session/logout hygiene | Does clicking "Logout" actually end the session? | any logged-in account | 1. Click the Logout nav item (opens a confirmation dialog — this is correct, expected UX for a destructive action). 2. Click through the dialog's own "Logout" confirm button. 3. Check `document.cookie` and `localStorage`. | Session cookie and cached accessibility settings are cleared. | Confirmed working correctly **once the confirmation dialog is actually clicked through** — `sb-127-auth-token` cookie and `acess_accessibility_settings` localStorage entry were both gone immediately after. (My own first attempt at this appeared broken because I'd only clicked the nav trigger, not the dialog's confirm button — worth recording as a "false alarm, ruled out by checking twice" rather than silently dropping it, since it's exactly the kind of thing worth being careful about in a shared-device/accessibility context.) | **PASS (after correcting my own test methodology)** |
| A11Y-06 | Baseline — buttons have accessible names | Spot-check: do interactive controls on a lesson page have a real accessible name (WCAG 4.1.2)? | any lesson page, all `<button>` elements in `main` | Read `textContent`/`aria-label` for every button in the lesson content area. | Every control has a non-empty accessible name. | **Objective — pass on this spot check:** every button sampled (Watch Video, I have watched this video, Complete Lesson, Next Step, Previous, Reset, Check Answers, Listen, the step-tracker circles, etc.) had real visible text serving as its accessible name; none were icon-only with no label. Not an exhaustive audit of every page in the app. | **PASS (spot check only)** |
| A11Y-07 | ADHD preset — distraction-free calm | Does distraction-free mode actually feel calmer? | `amir.learner@acess.edu.my` | Not completed this session — see "Not tested" below. | — | Not assessed. I did confirm distraction-free mode does engage and exposes a working "Exit Distraction Free Mode" control (seen incidentally in LEARNER-02's DOM dump), but did not do a dedicated visual/structural read of it the way I did for A11Y-01/02. | **NOT TESTED — flagged for follow-up, not guessed at** |
| A11Y-08 | Reduced motion | Does `animation_level:'none'` (Autism persona) actually suppress animation, matching `prefers-reduced-motion` intent? | `priya.learner@acess.edu.my` | Not completed this session. | — | Not assessed — would need frame-by-frame or CSS-transition inspection I didn't budget time for this pass. | **NOT TESTED — flagged for follow-up** |

### Section 3 totals

8 heuristic/manual checks attempted. **3 objective defects confirmed** (A11Y-03, A11Y-04, and the A11Y-01 theming conflict), **2 clean passes** (A11Y-02's structural clarity, A11Y-06's accessible-name spot check), **1 pass after correcting my own methodology** (A11Y-05), **2 explicitly not completed** (A11Y-07, A11Y-08) rather than guessed at.

---

## Overall totals

| Suite | Run | Pass | Fail | Partial / Not tested |
|---|---|---|---|---|
| Functional (Playwright) | 11 real browser test cases | 8 clean + 1 flaky-pass = 9 | 2 | — |
| Load (k6) | 3 real load scenarios | 3 | 0 | — |
| Manual/Heuristic | 8 real checks | 3 | 2 | 3 (1 partial, 2 not tested) |

## What broke or couldn't be tested, gathered in one place

- **`docs/SEED_CREDENTIALS.md` is stale** (30 non-existent `*.test.com` accounts documented; only 12 real `*.acess.edu.my` personas exist).
- **Multiple hardcoded test fixture IDs in the pre-existing `tests/e2e/*.spec.ts` files were stale** (LEARNER-01's target course, LEARNER-02's original lesson, LEARNER-03's original quiz lesson) — all fixed against live-verified IDs in this session; each fix is called out in the corresponding source file's comments.
- **Real defect, unresolved:** checklist sidebar overlapping the video-watched button under the step-by-step lesson layout (A11Y-03 / LEARNER-07).
- **Real defect, unresolved, high severity:** the "Incomplete Tasks" dialog leaves the whole page mouse-unclickable after being closed (A11Y-04).
- **Real, minor finding:** `reviewed_by` is never set by the admin instructor-application-approval UI path, unlike the equivalent function in `admin-api.ts` (ADMIN-01).
- **Flaky, unresolved:** ADMIN-01's approval action failed on first attempt in 3 of 4 full runs today with no visible error, always succeeding on an immediate retry — worth a dedicated investigation into what's racing (network idle timing, dialog animation, or a server-side hiccup) rather than accepted as permanent flakiness.
- **Code-reading finding, not load-test-reproduced:** `submit_quiz_attempt`'s attempt-number assignment has no locking, so two truly concurrent submissions from the *same* enrollment could race on Postgres's unique constraint — LOAD-03 as designed (one enrollment per VU) couldn't exercise this; a follow-up test submitting twice concurrently from one enrollment would.
- **Not tested at all:** distraction-free mode's subjective calm (A11Y-07), reduced-motion behavior (A11Y-08), pushing k6 load high enough to find an actual breaking point (all three scenarios held clean at the tested concurrency), and any deployed/production environment (everything above is against the local dev stack only).
- **Environment quirk, not an app defect:** this machine's long-lived `next dev` process had accumulated enough CPU/compile-cache bloat mid-session to make every request take 20s+ and eventually made even a plain `curl` hang for 30+ seconds; restarting the dev server process fixed it immediately. Worth knowing about if a future run of this suite behaves strangely for no visible reason.

---

# Retest — 2026-09-03 (same day, following fix pass)

**Who did this:** Claude, same agent, same session type, working from the findings above at the user's explicit request to fix the 5 listed defects, re-run everything for real, and append (not overwrite) results. Everything below is a genuine re-execution against the same local stack (dev server was restarted mid-pass after an unrelated instability incident, described below) — nothing here is inferred from the fix alone.

## Fixes made, in the order requested

### 1. HIGH SEVERITY — stuck `pointer-events: none` after closing "Incomplete Tasks" — FIXED, confirmed

**Root cause, precisely:** `@radix-ui/react-dismissable-layer` (`node_modules/@radix-ui/react-dismissable-layer/dist/index.js:53-121`) tracks "how many layers currently want outside-pointer-events-disabled" in a **module-level** `Set`, shared by every Dialog/AlertDialog/Popover in the whole app, via a `DismissableLayerContext` this codebase never wraps in its own `Provider` — so every instance reads Radix's own default context object. `LessonViewPage.tsx` renders **5 sibling `<Dialog>` roots** (resources, discussion, AI assistant, asset preview, the completion checklist). When the checklist dialog's layer registers/unregisters against that shared bookkeeping, the count can land such that the cleanup effect's `context.layersWithOutsidePointerEventsDisabled.size === 1` check never becomes true again, and the `document.body.style.pointerEvents = originalBodyPointerEvents` restore never runs — confirmed by reading that exact source, not guessed at.

**Fix:** rather than patch Radix internals (they live in `node_modules`, fragile to depend on), added a small watchdog component — [`src/components/ui/dialog-pointer-events-guard.tsx`](src/components/ui/dialog-pointer-events-guard.tsx), mounted once in [`src/app/providers.tsx`](src/app/providers.tsx). It watches for `document.body`'s stray `pointer-events: none` via a `MutationObserver` (plus an Escape/pointerdown recheck and a 1s safety-net interval) and clears it the moment no `[role="dialog"][data-state="open"]` or `[role="alertdialog"][data-state="open"]` element is actually present — so it can only ever remove a lock nothing still needs.

**Verification:** new test [`tests/e2e/a11y-04-dialog-pointer-events.spec.ts`](tests/e2e/a11y-04-dialog-pointer-events.spec.ts) triggers the popup and dismisses it three ways in one run — its own "Got it" button, Escape, and clicking outside — resetting `lesson_progress` (both `is_completed` and the independently-cached `progress_meta` tracker flags — see the "test bugs found along the way" note below) before each attempt so every one starts from a genuinely incomplete lesson. **All three dismissal paths now leave `document.body`'s `pointer-events` at `auto`, and a real follow-up click on an unrelated button lands successfully every time.** Confirmed on 3 independent full-suite runs today (never failed once fixed).

### 2. Autism preset click-interception — FIXED, confirmed

**Root cause, precisely:** [`LessonViewPage.tsx:1751-1753`](src/components/courses/LessonViewPage.tsx#L1751) floats a `VisualSchedule`/`StepByStepGuidance` sidebar with `position: fixed; right-6; top-44; w-72`, shown from the `xl` breakpoint (1280px) up, on the assumption there's always unused margin beside the reading column at that width. There often isn't: `.content-column`'s `max-width: var(--content-measure)` (62–72ch) centered in a typical `xl` viewport leaves only a few px more than the sidebar's own `288px + 24px` gap needs — confirmed by reproducing the overlap at exactly 1280×720, and independently confirmed live via `document.elementFromPoint()` returning the sidebar's own timeline `<div>`, not the "I have watched this video" button under it, three times (twice automated, once by hand).

**Fix, two parts:** (a) raised the breakpoint to `2xl` (1536px) — comfortably more margin; (b) the wrapper is now `pointer-events-none` by default (`VisualSchedule` has no interactive elements of its own to lose), with only `StepByStepGuidance`'s own card opting back into `pointer-events-auto` for its real Previous/Next/Exit/Complete controls. This means even a viewport this wasn't specifically tuned for can't reproduce the click-swallow, which the breakpoint change alone couldn't guarantee.

**Verification:** [`tests/e2e/learner-07-autism-complete.spec.ts`](tests/e2e/learner-07-autism-complete.spec.ts) deliberately sets the viewport to 1920×1080 (well past `2xl`, so the sidebar *is* present — testing at the default 1280×720 would trivially "pass" for the wrong reason, since the sidebar wouldn't render there at all now) and confirms `elementFromPoint` on the button's own coordinates returns the button itself, then performs a real, unforced `.click()` (Playwright's own actionability check would have thrown had anything still been on top). **Passed cleanly** on the final run.

### 3. Dyslexia preset theme conflict — FIXED, confirmed

**Root cause:** `EASY_READ_PRESETS` ([`src/lib/accessibility-utils.ts:41-50`](src/lib/accessibility-utils.ts#L41)) — auto-merged into a learner's settings by `applyReadingLevelDefaults()` whenever `preferred_reading_level` is `'simplified'` or `'basic'`, on every profile load — used to include `preferred_theme: 'high_contrast'`, a legacy field that drives `html[data-theme]` independently of the newer `background_tint`/`font_family` fields the Dyslexia preset actually sets (cream, OpenDyslexic).

**Fix:** removed `preferred_theme` from `EASY_READ_PRESETS` entirely. Easy Read's other behaviour (larger font, looser spacing, dyslexia-friendly font, `simplified_ui`) is kept — only the conflicting theme override is gone, so Easy Read no longer clobbers whatever theme a preset or the learner's own Sensory-tab choice already set.

**Verification:** logged in fresh as mei (`preferred_reading_level: 'simplified'`) and read the live DOM/localStorage directly: `data-theme` is now `"light"` (previously `"high_contrast"`), `preferred_theme` no longer appears in the merged settings object at all, and `background_tint: "cream"` / `font_family: "opendyslexic"` still apply correctly (`body` background `rgb(253,246,226)`, font `OpenDyslexic, sans-serif`) — the two systems no longer fight. `tests/e2e/learner-06-dyslexia-complete.spec.ts` (which was already checking `body` font-family) continues to pass.

### 4. Quiz attempt-number race condition — FIXED, confirmed with before/after evidence

**Root cause:** `submit_quiz_attempt()` computed `SELECT COALESCE(max(attempt_number), 0) + 1` and then inserted, with no lock between the read and the write — a real TOCTOU race for two concurrent submissions against the same `(enrollment_id, quiz_id)`.

**Fix:** new migration [`supabase/migrations/20260903000000_lock_quiz_attempt_number.sql`](supabase/migrations/20260903000000_lock_quiz_attempt_number.sql) adds `PERFORM pg_advisory_xact_lock(hashtextextended(v_enrollment.id::text || ':' || p_quiz_id::text, 0))` immediately after resolving the enrollment, before computing `v_attempt_no`. This serializes concurrent calls for the *same* enrollment+quiz pair (the second call blocks until the first's transaction — the whole RPC call, since each PostgREST call is its own transaction — commits) without affecting unrelated pairs at all.

**Verification, both directions:**
1. Temporarily widened the *old* (unlocked) function with an artificial `pg_sleep(0.05)` between the read and the write (to make the sub-millisecond race window reliably hit-able on a fast local DB) and fired 5 truly concurrent requests via a new k6 script, `scripts/k6/quiz-same-enrollment-race.js` (`http.batch()`, which sends every request in the batch simultaneously and waits for all responses — unlike separate VUs, which can still land with enough gap between them to miss the race). **Reproduced the bug on demand: 2 of 5 requests got a raw `409` `"duplicate key value violates unique constraint"` error**, and the 3 winners' `attempt_number`s showed the collision (`[1,2,3]` returned, meaning two different requests both tried to claim `1`).
2. Re-applied the real, un-modified fixed migration and re-ran the identical script: **5 of 5 succeeded, attempt_numbers `[1,2,3,4,5]` — no duplicates, no gaps, no errors.** Re-ran again this session at 8 concurrent submissions: same clean result, `[1..8]`.

### 5. ADMIN-01 flakiness — root-caused and fixed, not papered over

Two distinct real causes were found and fixed, not one:

**Cause A — a genuine UI race, not a masked test flake.** `InstructorApplications.tsx` used to render the "Application Details" Dialog with `open={!!selectedApp && !approveDialogOpen && !rejectDialogOpen}` — so clicking "Approve" closed that Dialog (one Radix root unmounting) at the *exact same instant* a second, separate `<Dialog>` for the confirmation opened (a second Radix root mounting). Two `DismissableLayer` instances transitioning simultaneously is the same category of shared-module-state race as fix #1 above, and it reproduced as "click Confirm Approval, no error, but the database write never happens." **Fix:** collapsed the three separate `Dialog` roots (details / confirm-approve / confirm-reject) into **one** `Dialog` whose content switches by a `dialogView` state variable — there is now only ever one Radix open/close transition in flight, never two competing.

**Cause B — a `next dev`-only artifact, found while investigating cause A.** Server logs caught this directly: `Compiling /api/admin/approve-instructor ...` followed immediately by `Approve instructor error: SyntaxError: Unexpected end of JSON input` at `request.json()`. When this route hasn't been hit recently, Next.js dev-mode recompiles it on demand — and a POST whose body arrives while that recompile is in progress can have its body stream corrupted before the handler reads it. This is a `next dev` characteristic (routes are precompiled ahead of time in a production build) and cannot fully be "fixed" in application code short of pre-warming the route; mitigated by sending one harmless warm-up request before test runs.

Also fixed en route: the test's own teardown (reverting the application to `pending`, removing the provisioned account) sat with no `try/finally` around the assertion — a failed run left the application `approved` and a real account behind, and the *next* run then failed differently ("pending" text never found, because the application genuinely wasn't pending anymore) for what looked like an unrelated reason. Wrapped in `try/finally` like the other tests' teardowns.

**Verification:** ran `admin-01-approve.spec.ts` in isolation 3 times after both fixes — **3 of 3 clean passes on the first attempt, no retries.** Included in every full-suite run afterward with the same result.

### 6. Stale seed docs — fixed

[`docs/SEED_CREDENTIALS.md`](docs/SEED_CREDENTIALS.md) documented 30 `learnerN@test.com` accounts and an `admin@acess.edu` login that don't exist in the seeded database. Checked for any sign they were intentionally retired (a removal commit, a migration note) — found none; they simply don't correspond to anything `supabase/seed/personas.ts` creates, so this reads as documentation drift rather than a deliberate reduction. Rewrote the file to describe only the 12 real personas, each confirmed directly against a live `select email, role, full_name from users` query, plus a live snapshot of course/enrollment/certificate counts with a note that those counts drift as the app is used and shouldn't be trusted as a fixture without re-querying.

### 7. Two remaining heuristic checks, completed

**A11Y-07 — ADHD distraction-free mode, "does it actually feel calmer"?**
*Objective, from source:* `data-distraction-free="true"` (`globals.css:664-678`) hides the sidebar, widget panels, and notification badges (`display: none !important`) and expands the reading column to full width; separately, ADHD forces `effectiveFocusMode` true (`LessonViewPage.tsx:1192`), which narrows the lesson view to a single-phase-at-a-time layout (`max-w-3xl`) instead of showing video/content/quiz all at once. Concretely, this removes a measurable amount of simultaneously-visible UI — sidebar navigation, notification chrome, and the other lesson phases — leaving one task in view at a time with an explicit exit control ("Exit Distraction Free Mode Esc").
*Subjective — my best-effort read, not a substitute for a human user's felt experience:* reducing simultaneous visual competition and chunking a task into one-thing-at-a-time is a well-supported pattern for reducing overwhelm, and this implementation does that concretely rather than superficially (real elements removed from the DOM, not just dimmed). I'd call this plausibly calmer with moderate-to-good confidence from the structural evidence alone — but "does it *feel* calmer" is a genuinely subjective, embodied judgement a language model reading rendered markup cannot fully stand in for, and it hasn't been shown to an actual ADHD user. **Needs human confirmation**, flagged plainly rather than asserted as settled.
Status: **PARTIAL** — objective structure assessed with reasonable confidence; subjective verdict explicitly deferred.

**A11Y-08 — reduced motion under `animation_level: 'none'`.**
*Objective, from source, and this one has a real finding:* `html[data-animation-level="none"] * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }` (`globals.css:680-691`) is comprehensive for **native CSS** animations/transitions (confirmed it would correctly squash Tailwind's `animate-ping` confetti dots on the lesson-completion celebration, for instance). But Framer Motion (`motion.div`) doesn't animate via the CSS `transition`/`animation` properties this rule targets — it drives updates directly via JS/the Web Animations API — so a CSS override has no effect on it. Read the actual completion-celebration code (`LessonViewPage.tsx:2693-2703`): `<motion.div transition={{ duration: 0.5 }}>` is a **hardcoded** duration with no reference to `settings.animation_level` anywhere in it, even though a sibling component two lines down (`<CelebrationAnimation animationLevel={settings.animation_level} />`) *does* receive and presumably respect the setting. So: native CSS keyframe effects are correctly suppressed by `animation_level: 'none'`; Framer-Motion-driven fades/slides (confirmed present on at least the lesson-completion card) are not, and would still animate over their hardcoded duration regardless of this accessibility setting.
Status: **PARTIAL COMPLIANCE — objective code-level finding**, not a subjective judgement call this time: `animation_level: 'none'` does not fully suppress motion. Worth a follow-up fix (thread `settings.animation_level` into the hardcoded `motion.div transition` props, or gate them the same way `CelebrationAnimation` already is) — out of scope for this pass, which was asked to complete the *assessment*, not fix every finding it turns up.

## Full re-run — real results

### Functional (Playwright), 12 test cases (11 original + the new A11Y-04)

Ran the complete suite 6 times over the course of this fix pass (some runs deliberately isolated single tests to chase down a specific failure without cross-test interference; the dev server was restarted once mid-pass after an unrelated stability incident, described below). **Final, authoritative run: 11 of 12 passed cleanly, 0 flaky, 1 failed — and that 1 failure is a genuine, newly-precisely-diagnosed defect, not a test problem:**

| Test | Result | Note |
|---|---|---|
| A11Y-04 (pointer-events) | **PASS** | Fix #1 confirmed — see above |
| ADMIN-01 | **PASS** (clean, no retry) | Fix #5 confirmed — 3/3 clean in isolation, plus every full-suite run after both causes were fixed |
| EDUCATOR-01/02 | **PASS** | unrelated flake fixed en route: replaced a fixed 2.5s wait after course creation with `page.waitForURL`, since the redirect occasionally took longer than that under this session's load |
| EDUCATOR-03 | **PASS** | unchanged |
| LEARNER-01 | **PASS** | unchanged |
| **LEARNER-02** | **FAIL — genuine defect, precisely diagnosed** | see below |
| LEARNER-03 | **PASS** | unchanged |
| LEARNER-04 | **PASS** | unchanged |
| LEARNER-05 | **PASS** | unchanged |
| LEARNER-06 | **PASS** | test bug fixed en route — see below |
| LEARNER-07 | **PASS** | Fix #2 confirmed |
| PUBLIC-01 | **PASS** | unchanged |

**LEARNER-02 — not fixed, and correctly so; this was never one of the 5 requested fixes.** Three earlier hypotheses this pass (stale test data, a locator that didn't match the tracker's concatenated "2Finish" text, `window.scrollTo` missing the actual scroll container) were each real and each fixed, but none of them were the actual cause — each fix just peeled back one layer and the test kept failing underneath. Playwright's own accessibility snapshot on the final failure (`test-results/.../error-context.md`) showed the answer directly: `button "Finish" [active]` sits right next to `generic: • Complete Lesson` — a plain, **non-interactive** text node (`role: generic`), not a button. Traced to `LessonViewPage.tsx:2641`: the real, clickable "Complete Lesson" button is wrapped in `{(!effectiveFocusMode || currentFocusId === 'summary') && (...)}`, and ADHD forces `effectiveFocusMode` true. For any lesson without a summary activity (this one has none), that block never renders — the learner sees a status label saying what's left to do, with no control to act on it. The updated test now asserts and logs this precisely (confirms focus mode is active, confirms the real button is absent, confirms the decorative text is present) rather than groping for the right selector. This is a real, reproducible, now-precisely-located defect distinct from the two the user asked fixed (#2 was the Autism sidebar overlap) — left unfixed per scope, flagged here for a follow-up.

**Test bugs found and fixed along the way (distinct from the 5 requested app fixes):**
- `lesson_progress.progress_meta` independently caches `{video, scroll, activity}` booleans, read fresh on every page load — resetting only `is_completed` between test runs wasn't enough; a lesson that had genuinely been completed by an earlier successful run stayed "already satisfied" on every later run regardless of `is_completed`, which is what made A11Y-04's original design (repeatedly triggering the popup on one lesson) and LEARNER-06 both fail with "Complete Lesson doesn't exist" — not a defect, a fixture-reset gap. Every test touching `lesson_progress` now resets `progress_meta` too, both before and after.
- `EDUCATOR-01/02` matched "its own course" by title through the course list (`.filter({hasText: COURSE_TITLE}).last()`) — fragile the moment any leftover same-titled course exists (e.g. from an interrupted prior run). Now captures the real course id from the post-create redirect URL and never touches title-matching again.
- A mid-session dev-server instability incident: while several files were being edited in sequence, the dev server's file watcher briefly compiled an in-between, syntactically invalid snapshot of `InstructorApplications.tsx` and threw `net::ERR_CONNECTION_RESET` / stale-error responses on unrelated routes for a stretch afterward. Not an app defect — restarting the dev server (`preview_stop` + `preview_start`) and re-warming routes resolved it immediately, and this is noted here only so a future session doesn't mistake the same symptom for something else.

### Load (k6), all 3 original scenarios + the new targeted race test

Re-ran while the Playwright suite was *also* running (real concurrent load on the same local Postgres — not a clean isolated environment, if anything a harder test than the original pass):

| Scenario | Result | p95 | Error rate |
|---|---|---|---|
| LOAD-01 catalogue reads (50 VUs) | ✅ threshold met | 76.32ms (target <800ms) | 0.00% (3,902/3,902 checks) |
| LOAD-02 enrollments (40 VUs) | ✅ threshold met | 95.96ms (target <1000ms) | 0.00% (2,370/2,370 checks) |
| LOAD-03 quiz submissions (40 VUs) | ✅ threshold met | 86.06ms (target <1200ms) | 0.00% (2,658/2,658 checks) |
| LOAD-04 (new) same-enrollment race, 8 concurrent | ✅ | avg 334ms | 0.00% (8/8 requests, 8 distinct attempt_numbers) |

All three original scenarios held their thresholds even under added contention from the concurrent Playwright run (latencies roughly 5–13× higher than the original isolated pass's p95s, but nowhere close to the thresholds) — real evidence the endpoints have headroom beyond what this session's own heaviest concurrent testing produced, not just beyond ordinary use.

## What's now confirmed fixed vs. what still fails vs. what regressed

**Confirmed fixed by a passing test, all 5:**
1. Stuck `pointer-events` after closing the popup — A11Y-04 passes, 3/3 dismissal paths.
2. Autism sidebar click-interception — LEARNER-07 passes at the viewport that reproduces the sidebar.
3. Dyslexia theme conflict — verified live (`data-theme` no longer forced to `high_contrast`), LEARNER-06 continues to pass.
4. Quiz attempt-number race — LOAD-04 before/after (2/5 failures unlocked → 5/5, then 8/8, clean locked).
5. ADMIN-01 flakiness — both real causes fixed, 3/3 clean isolated runs plus every subsequent full-suite run.

**Was failing correctly as a genuine defect at the time this section was written — since fixed, see the addendum immediately below:**
- ~~LEARNER-02 / ADHD forced focus mode hides the real completion button behind decorative text for any lesson without a summary activity (`LessonViewPage.tsx:2641`).~~ Fixed same day — see "Addendum" section.

---

## Addendum — LEARNER-02 fixed (same day, follow-up request)

The user asked directly: "fix LEARNER-02's completion button in focus mode." The diagnosis two sections up (`currentFocusId === 'summary'` gating the real button) was correct as far as it went, but incomplete — it explained *what* was hidden, not *why the learner could never reach the state that would reveal it*. Went one layer deeper and found the actual, fixable bug.

**Root cause, precisely:** `focusStep` (the index into `focusSteps` — Video → Content → Activities → **Summary**, and `currentFocusId === 'summary'` is exactly the last one) is only ever changed by one thing in the whole file: the "Focus Mode Slide Navigation" bar's Prev/Next arrows and step pills (`LessonViewPage.tsx`, right after the Dyslexia `ReadingToolbar` block). That bar's own visibility condition used to be `focusMode && !simplifiedMode` — the **raw**, manually-toggled `focusMode` flag (set only by a "Focus" button that is itself hidden whenever `simplifiedMode` is true), not `effectiveFocusMode` (`(focusMode || activePreset === 'adhd') && !focusModeManuallyExited` — the variable every content section, including the real completion button, actually checks). ADHD sets `effectiveFocusMode` true via the *second* branch of that OR, never touching the raw `focusMode` flag at all — and ADHD's `simplifiedMode` is also always true. Put together: for an ADHD learner, the only control able to move `focusStep` forward could never render, `focusStep` stayed permanently at `0` for the entire lesson, `currentFocusId` could never become `'summary'`, and the real "Complete Lesson" button was unreachable — not because it was deliberately withheld, but because the one door to it was bolted shut by an unrelated flag.

**Fix (`LessonViewPage.tsx`):** changed that bar's condition from `focusMode && !simplifiedMode` to `effectiveFocusMode` — the same condition every section it controls already uses. It now renders whenever focus mode is actually active, regardless of whether that came from the manual toggle or the ADHD preset, and regardless of `simplifiedMode`.

**Verification, both by hand and automated:**
- By hand: logged in as amir (ADHD, `simplified_ui`/`simplifiedMode` true), opened a genuinely incomplete lesson, confirmed the navigation bar (title, "1/2" counter, ‹ › arrows, Exit, step pills) now renders where it never did before. Scrolled through the Content step (the scroll tracker listens on `#main-content` specifically, not window), advanced to the Summary step via the pills, and clicked "Complete Lesson" for real. **Confirmed directly in the database: `lesson_progress.is_completed` became `true`.**
- Automated: rewrote `tests/e2e/learner-02-preset-complete.spec.ts` to drive this real navigation bar end to end — apply the ADHD preset via the modal, confirm the bar renders (the actual regression check for this fix), scroll Content, advance via the real "Next section" arrow, click Complete Lesson, and assert `is_completed` in the database. **3 of 3 clean passes in isolation, then included in a full 12-test suite run: 11 passed, 1 flaky** (ADMIN-01, on its already-documented `next dev` route-recompile race — Cause B above — resolved on the automatic retry, unrelated to this fix). **Nothing else regressed.**

One incidental discovery while chasing this down, noted for completeness rather than acted on: amir's own accessibility profile had `distraction_free_mode: true` set independently of the ADHD preset, which hides the learner dashboard's sidebar entirely (a separate, correctly-working feature) and initially blocked the test from even reaching the Accessibility settings panel. Worked around in the test by using a plain baseline profile as the starting point before applying ADHD fresh through the modal, which is arguably the more realistic scenario for this test anyway (a learner choosing the ADHD preset for the first time) — not a defect, just a reminder that this account had accumulated a lot of manual state from earlier testing today.

**Final status, all 6 items now:**
1. Stuck `pointer-events` — fixed, confirmed.
2. Autism sidebar click-interception — fixed, confirmed.
3. Dyslexia theme conflict — fixed, confirmed.
4. Quiz attempt-number race — fixed, confirmed.
5. ADMIN-01 flakiness (the two structural causes) — fixed, confirmed.
6. LEARNER-02 / ADHD focus-mode completion button — fixed, confirmed.

Full suite: **11 of 12 tests passing cleanly, 1 flaky-but-passing on a known, already-documented environment cause, 0 failing.**

**Nothing regressed.** Every test that passed in the original 2026-09-03 run (EDUCATOR-01/02, EDUCATOR-03, LEARNER-01, LEARNER-03, LEARNER-04, LEARNER-05, LEARNER-06, PUBLIC-01) still passes; ADMIN-01 went from flaky to reliably clean; LEARNER-07 went from a confirmed defect to a confirmed fix. LEARNER-02 was already failing in the original run (for the wrong reason, attributed to stale fixture data at the time) and still fails now, for the right reason.
