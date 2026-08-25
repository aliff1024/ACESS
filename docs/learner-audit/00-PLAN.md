# Learner Portal — Full Audit & Refinement Plan

**Scope:** end-to-end live testing, data verification, security, accessibility,
UX and performance audit of the ACESS Learner Portal, followed by targeted
fixes and a regression pass.

**Status:** EXECUTED 2026-08-25. Results in [02-REPORT.md](02-REPORT.md), evidence in [01-FINDINGS.md](01-FINDINGS.md).

All phases ran. 19 defects found, 18 fixed across 3 commits and 3 database
migrations. Two P0 security defects (privilege escalation, user-directory
exposure) fixed and regression-checked. Not fixed: typography accommodations on
dashboard/list surfaces, and the `ensureUserId()` request cost — both recorded
with measurements in the report.
**Created:** 2026-08-25

---

## 0. Ground truth from recon (already established)

These are facts confirmed by reading the repo before planning, not assumptions.

| Fact | Consequence for the plan |
|---|---|
| Dev server already running on :3000 (PID 28204), `/login` returns 200 | Reuse it. Do **not** start a second `next dev` — Next refuses to run two instances against one project dir, which is exactly what blocked accessibility Phases 5–9 from ever being verified live. |
| Learner data access is client-side Supabase (`learner-api.ts`, anon key, 48 exports) | RLS is the only authorization boundary. Security tests must hit PostgREST directly with a learner JWT, not just check the UI. |
| `SUPABASE_SERVICE_ROLE_KEY` present; `scripts/verify.ts`, `scripts/db-audit.js` show the pattern | A service-role `tsx` harness can cross-check every on-screen number against the DB. |
| Learner routes are real URLs, not tabs: `/learner`, `/learner/courses`, `/learner/courses?filter=enrolled`, `/learner/favorites`, `/learner/progress`, `/learner/certificates`, `/learner/achievements`, `/learner/courses/[id]`, `/learner/lesson/[id]`, `/learner/quiz/[id]`, `/learner/onboarding` | Every one is deep-linkable and back/forward-testable. "Enrolled" is a query-param filter of All Courses — the brief's question in §4/§5/§6 ("do these have genuinely different purposes?") is a real design question here. |
| `Sidebar.tsx` "Achievements" entry uses `id: 'certificates'`; a separate 364-line `/learner/achievements` page exists | **Candidate bug:** `/learner/achievements` may be unreachable from navigation. Verify live before assuming. |
| `Sidebar.tsx` and `app/learner/page.tsx` branch per preset (`adhd`, `autism`, `dyslexia`, default) | Presets change nav structure and dashboard composition, not just colour. Preset testing is preset × page, not one toggle. |
| `docs/accessibility/IMPLEMENTATION-STATUS.md` states every ✅ is static-analysis only, never rendered | This audit is the first live verification of that entire program. Treat its claims as hypotheses to test, not as a passing baseline. |
| Working tree has uncommitted admin/educator changes | Keep learner work on its own commits so it stays separable from that in-flight work. |

### Decisions taken

**DB mutation policy — resolved 2026-08-25.** Testing "as a real learner" mutates
the live Supabase project (enrollments, lesson progress, quiz attempts,
achievements, certificates), which is the same DB holding the seeded dataset the
PSM report figures come from. **Decision: test directly with `learner@acess.demo`
and accept the writes.** No snapshot, no restore, no throwaway account.

Consequences to keep in mind while executing:
- That account's rows will not match `db_backup.json` or the counts in
  `docs/SEED_CREDENTIALS.md` afterwards. If report figures are ever regenerated,
  regenerate them from the DB, not from those files.
- The DB oracle must be re-read immediately before each comparison rather than
  captured once, since the act of testing keeps changing it.
- Other seeded learners stay untouched, so they remain valid as "learner B" for
  the Phase 3 isolation probes.

Still to verify in Phase 0: the brief's credentials (`learner@acess.demo` /
`AcessDemo2026!`) match the password constant in `supabase/master_seed.ts`, and
that email appears in `db_backup_auth.json` — but `docs/SEED_CREDENTIALS.md`
documents a *different* learner set (`learner1@test.com` / `Learn@123`). Confirm
which seed is actually live before starting.

---

## Phase 0 — Environment & harness (no findings yet)

**Goal:** be able to observe everything before touching anything.

1. Confirm the running server belongs to this working directory and is on current source.
2. Baseline health: `npx tsc --noEmit`, `npm run lint`, `npm run build` — record
   pre-existing failures so later noise is attributable.
3. Confirm login works with the supplied learner credentials; resolve the
   credential discrepancy above.
4. Build `scripts/audit/learner-db.ts` (service role): dumps, for a given learner
   id — enrollments, lesson_progress, quiz_attempts, favorites, user_achievements,
   certificates, accessibility preferences, plus per-course lesson counts. This is
   the reference oracle every on-screen number gets checked against.
5. Build `scripts/audit/rls-probe.ts`: signs in as learner A with the **anon** key,
   then attempts to read and write learner B's rows in every learner-facing table.
   This is the §20 security test.
6. Open the browser pane on :3000; set up console + network capture as the standing
   observation method for all of Phase 1.

**Exit:** logged in as the learner, DB oracle runs, RLS probe runs, baseline recorded.

---

## Phase 1 — Instrumented walkthrough (observe, do not fix)

**Goal:** one evidence log covering every learner surface. No code changes in this
phase — fixing while exploring loses the map.

Walk the brief's journey with console + network recording on throughout:

> Login → Dashboard → All Courses → Course Detail → Enroll → My Courses/Enrolled →
> Open Course → Lesson → content/video/PDF → Activity/Quiz → Complete → Next Lesson →
> Progress → Achievements → Certificates → Accessibility

For **every** route record: HTTP/PostgREST status codes, console errors, React
warnings, hydration errors, duplicate requests, time-to-usable-content, and any
dead end, missing back path, or state that fails to refresh after a mutation.

Then the state matrix the brief asks for (§4, §6, §24), driven via the DB oracle so
each state is real rather than simulated:

- courses with **no / partial / near-complete / completed** progress
- learner with **no enrollments, no favourites, no achievements, no certificates, no progress**
- **unpublished / archived / deleted** course still referenced by an enrollment
- **invalid and foreign IDs** on `/learner/courses/[id]`, `/learner/lesson/[id]`, `/learner/quiz/[id]`, certificate routes
- refresh and back-navigation **mid-lesson** and **mid-quiz**

**Output:** `docs/learner-audit/01-FINDINGS.md` — every observation with route,
repro, evidence (status code / console text / screenshot), no fixes yet.

---

## Phase 2 — Data truth (§3, §8, §18)

For every number the learner sees — dashboard stats, course progress %, completed
counts, achievement progress, recent activity — trace it to its source and diff it
against the DB oracle.

1. **Provenance table:** each displayed statistic → the function in `learner-api.ts`
   that produces it → the query behind it → the oracle value → match/mismatch.
2. **Live progress test:** complete part of a lesson → refresh → check Progress page →
   complete the lesson → refresh → verify the delta is correct in both UI and DB.
3. **Calculation audit:** >100%, <0%, duplicate lesson counting, lessons counted
   against the wrong course, deleted lessons skewing denominators, another learner's
   rows leaking into an aggregate.
4. **Fake-data sweep:** `mockData|dummyData|fakeData|sampleData|placeholder|Math.random`
   plus hardcoded percentages/counts across all learner-facing files. Classify each hit
   as (1) legitimate preview/demo, (2) seed/test, (3) unused, (4) **presented as real
   learner data** — only category 4 is a defect. Preview functionality stays.

---

## Phase 3 — Security & isolation (§17, §19, §20) — **P0**

Because the client holds an anon key and queries PostgREST directly, UI-level checks
prove nothing. Test at the API boundary:

1. With learner A's JWT, attempt direct reads of learner B's `enrollments`,
   `lesson_progress`, `quiz_attempts`, `favorites`, `user_achievements`,
   `certificates`, `user_accessibility_preferences`. Any row returned is a P0 leak.
2. Attempt **writes** as A against B's rows (progress, favourites, enrollments) —
   an RLS `USING` clause without a matching `WITH CHECK` is a common gap.
3. Enrollment authorization: can a learner open `/learner/lesson/[id]` for a course
   they are not enrolled in? Is the check server-side, or only a hidden button?
4. Certificate access: can changing a certificate id render another learner's
   certificate? Verify the identity printed on it is the session's identity.
5. Cross-check `20260701000000_security_audit_rls.sql` against what the probe
   actually observes — the migration existing is not proof it is enforced.

---

## Phase 4 — Accessibility (§10–§14) — **P1, highest-value area**

The largest phase, and the one where existing work has the least evidence behind it.
Test **behaviour**, never "the toggle changed".

**4a. Persistence model.** Determine where settings actually live (React state /
localStorage / `users` row / `user_accessibility_preferences`) and whether the
provider's optimistic update ever diverges from what is stored. Then test:
change → navigate → refresh → still applied; change → logout → login → still applied;
and learner A's settings must never follow into learner B's session.

**4b. Every preset individually.** For each of Default, Dyslexia, ADHD, Autism, and
any other in `accessibility-profiles.ts` / `accessibility-catalog.ts`, walk
Dashboard → All Courses → Course Detail → Lesson → Quiz → Settings modal and check
visual (background, contrast, font, size, spacing, borders, buttons, cards, nav),
layout (content width, chunking, distraction reduction), and functionality (modals,
dropdowns, forms, course cards, lesson nav, video player, PDF viewer, quiz UI).
Specifically hunt for CSS variables set by the provider but never consumed, or
consumed only in the shell and not inside lesson content.

**4c. Individual settings.** Drive `SETTING_CATALOG` (`npm run test:a11y-catalog`
reports 234/234) — for each setting claiming a visible effect, verify the effect
exists in the DOM/computed styles, not just the attribute. A setting that writes a
`data-*` attribute no rule reads is a "lying control", and is a P1 defect by this
program's own Phase 1 standard.

**4d. TTS.** Play/pause/stop/resume, sentence progression, correct text selection,
behaviour across lesson switches and navigation, multiple simultaneous utterances,
speech continuing after unmount, reading hidden/`sr-only` text, state after refresh.

**4e. Easy Read / Chunked Content / Focus Mode.** Each independently: is content
genuinely reformatted (not just restyled)? Is information lost? Does chunk
navigation work, and does it avoid falsely triggering completion? Can Focus Mode be
exited, and does it leave navigation intact?

---

## Phase 5 — Learning flow & activities (§9, §15, §16) — **P1**

1. **Course → Lesson → Content → Activity → Complete → Next**: lesson list ordering,
   prev/next boundaries (first/last lesson), completion write, resume position,
   video/PDF/transcript access.
2. **Persistence rule from the brief:** progress must survive refresh and
   navigate-away mid-lesson. Test explicitly, including mid-quiz.
3. **Quizzes:** start, answer, submit, correct/wrong, retry, scoring, multiple
   attempts, refresh mid-attempt, navigate away and back. Verify every score and
   completion lands in a real `quiz_attempts` row — client-only completion, duplicate
   submissions, and progress awarded without completing the activity are the specific
   defects to look for.
4. **Achievements:** derive the actual unlock criteria from `achievement-engine.ts`,
   then trigger them for real and verify unlock timing, duplicate prevention, correct
   course/lesson association, and that nothing displays as unlocked without a matching
   `user_achievements` row.
5. **Certificates:** eligibility gate, generation, display, download, issue date, and
   that the completion requirement is genuinely enforced server-side.

---

## Phase 6 — Triage & fix

Everything from Phases 1–5 goes into one ranked list, fixed in the brief's priority
order:

- **P0** — data isolation, enrollment authorization, progress correctness, achievement
  correctness, certificate access
- **P1** — learning-flow breakage, progress persistence, accessibility settings/presets,
  TTS / Easy Read / Focus / Chunking, runtime errors, wrong calculations, broken
  navigation, state bugs
- **P2** — UX clutter, navigation clarity, information hierarchy, responsive
- **P2** — performance: duplicate queries, over-fetching catalogs/lesson data, repeated
  progress and settings queries, excessive re-renders, unpaginated lists. Priority
  target is the lesson page: lesson content must become usable without waiting on
  unrelated data.
- **P3** — features, only where testing produced a concrete justification

Each fix: one focused commit, root cause named, re-tested live in the same pass. The
brief's constraint holds throughout — **refine the existing implementation, do not
rebuild what already works.**

---

## Phase 7 — UX & features (§22, §23) — deliberately restrained

The test being applied, per the brief: *can a learner immediately tell what to do next?*
Changes come from observed confusion in Phases 1–5, not from a feature list. Expected
candidates, subject to what testing actually shows:

- One unambiguous **Continue Learning** action on the dashboard
- Resolving the **My Courses / All Courses / Enrolled / Favourites** overlap — if two of
  these are the same page with a filter, say so and simplify rather than decorate both
- Fixing the Achievements-vs-Certificates nav mismatch noted in §0
- A quick accessibility toggle and a "reset accessibility settings" escape hatch
- Empty/loading/error states that tell the learner what to do next

Anything that only adds cards, charts or gamification without a learning benefit is
explicitly rejected.

---

## Phase 8 — Responsive (§25)

Desktop / tablet / mobile across Dashboard, catalog, course detail, lesson, quiz,
Progress, Achievements, Accessibility settings, and every modal. Looking for
horizontal scroll, tiny text, broken/overlapping cards, modal overflow, charts
overflowing, and accessibility controls becoming unreachable — which would be the
worst failure mode in this product specifically.

---

## Phase 9 — Regression & report (§26, §27)

1. Re-run the full critical journey end to end after all fixes.
2. Re-run the DB oracle and the RLS probe.
3. Re-run `tsc`, lint, and `build`.
4. Deliver `docs/learner-audit/02-REPORT.md`: critical issues, bugs (route, problem,
   repro, root cause, fix), fake data (removed vs deliberately retained), logic
   problems, accessibility findings, UX findings, performance findings, features added
   — plus the required status table, with an explicit reason written for every ⚠️ and ❌.

---

## Deliverables

| File | Contents |
|---|---|
| `docs/learner-audit/00-PLAN.md` | this plan |
| `docs/learner-audit/01-FINDINGS.md` | raw evidence log from Phases 1–5 |
| `docs/learner-audit/02-REPORT.md` | final structured report + status table |
| `scripts/audit/learner-db.ts` | service-role DB oracle |
| `scripts/audit/rls-probe.ts` | cross-learner isolation probe |
| commits | one per fix, P0 first |

## Ground rules

- A finding is recorded only when reproduced live. No theoretical findings.
- Anything that cannot be verified is reported as unverified, never as passing — that
  is precisely the failure mode this repo's accessibility docs already fell into.
- Fixes are scoped to defects found. Working features are left alone.
