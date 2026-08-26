# Implementation Status & Test Checklist

**A cross-reference for testing what has actually shipped, phase by phase, against
[00-PROGRAM-PLAN.md](00-PROGRAM-PLAN.md)'s plan.**

- **As of:** 2026-08-23 (Phases 1–3), updated same day for Phase 4, again for Phase 5, again for Phase 6, again for Phase 7, again for Phase 8, again for Phase 9, again for the interactive-activity keyboard addendum to Phase 6
- **Verified by:** TypeScript (`npx tsc --noEmit`) and ESLint on every file touched — both clean, zero new issues introduced at any point
- **⚠️ LIVE VERIFICATION NOW EXISTS — SEE [§10](#10-live-verification--2026-08-25).** Everything below was written before any of it had been seen running. §10 records what live testing on 2026-08-25 actually found, including eight accessibility defects that static analysis could not have caught, three of them in features marked ✅ here. Read §10 before trusting any ✅ in this document.
- **Live browser verification:** unavailable for Phases 1–3 (port 3000 was held by another session throughout). Became available during Phase 4 — but both login (documented seed credentials, `docs/SEED_CREDENTIALS.md`) and self-registration (`/signup`, "Database error saving new user") failed for reasons unrelated to this work. **Nothing in this document has actually been seen rendered with real data.** Treat every ✅ as "correct by static analysis and code reading," not "confirmed working on screen." **This document exists so you can close that gap** — you likely have working credentials or can fix the signup/DB issue faster than guessing at it blind. **Phases 5 through 9 could not even attempt live verification** — port 3000 was held by another chat session's `next dev` throughout all five, and Next.js refuses to run a second dev server against the same project directory at all (not just the same port — it detects the existing instance via `.next\dev\logs` and exits with code 1), so there was no way to get a second, independent server up in this working directory without stopping the other session's process, which was out of scope to do unilaterally. Re-checked immediately before starting each of Phases 6, 7, 8, and 9 — still blocked the same way every time. See the Phase 5 (§4b), Phase 6 (§4c), Phase 7 (§4d), Phase 8 (§4e), and Phase 9 (§4f) status notes for what this means for confidence level. **Phase 8 is different in kind, not just in verification confidence** — it is not a coding phase at all (real learner testing, an independent expert reviewer, AT hardware), and its baseline requirement can no longer be met regardless of live access, because Phase 0 never ran before Phases 1–7 shipped. **Phase 9's new public route (`/accessibility-statement`) is the first phase where "not seen live" specifically means a real page has never been loaded in a browser at all**, not just "seen with fallback/default data" like most of what came before.

---

## 0. How to use this document

1. **§1** is the one-screen summary — what phase, what state, done vs total.
2. **§2–§4** are Phases 1–3, each with a table of every change (file:line, what it does, how to test it yourself) and a **manual test script** you can run end to end.
3. **§5** lists Phases 4–9 — not started, so you know what to expect to still be broken/missing.
4. **§6** is a master smoke-test script — one pass through the product that touches everything shipped so far.
5. **§7** is the "found but not fixed" list — real defects or gaps discovered while building, deliberately left alone, with the reason why.
6. **§8** is the full file manifest for your own `git diff` review.

---

## 1. One-screen summary

| Phase | Name | Status | Shipped / Planned |
|---|---|---|---|
| **0** | Decide & baseline | ❌ Not started | 0 / — |
| **1** | Truthfulness | ✅ **9 of 10 items** | 9/10 |
| **2** | Foundations | ⚠️ **Partial** | ~4 of 8 workstreams |
| **3** | Dyslexia — Reading Room | ⚠️ **Reduced scope** | Core shipped, 2 items shipped differently, ~5 deferred |
| **4** | ADHD — Runway | ⚠️ **NowBar only** | 1 of ~6 workstreams — but fixed a more severe bug than scoped (see §4a) |
| **5** | Autism — Itinerary + Guided Run | ⚠️ **Reduced scope** | Core guided-mode bug fixed, Itinerary promoted, sidebar double-numbering fixed; most of the section deferred (see §4b) |
| **6** | Content, authoring, assessment | ⚠️ **Assessment + activity keyboard ops** | Quiz-side fixes from 5 of 8 defects in [07-ASSESSMENT-POLICY.md](07-ASSESSMENT-POLICY.md) §2, **plus** the doc's own top-severity item — interactive-activity keyboard operability, fixed in a later addendum; the other 5 workstreams (runtime resilience, authoring aids, Easy-Read, educator surfaces, catalogue backfill) still deferred (see §4c) |
| **7** | Transparency, onboarding, composition | ⚠️ **Preset Details dialog only** | 1 of 6 workstreams — the one with the most concrete, testable exit criterion (see §4d) |
| **8** | Evaluation with real learners | ⚠️ **Not executable — 1 analytics event shipped** | Real learner testing, expert review, and AT testing need people and hardware this session doesn't have; the quantitative baseline can no longer be captured at all (Phase 0 never ran before Phases 1–7 shipped). One instrumentation event (`preset_applied`) wired up regardless (see §4e) |
| **9** | Governance & handover | ⚠️ **Catalog, checklist, statement — no CI/ownership** | `SETTING_CATALOG` built and consumed (not just written), a completeness check that runs (234/234), a PR template, a published accessibility statement, and backfilled decision records; the 9 CI gates needing a live browser, a named owner, and a scheduled audit are all not attempted (see §4f) |

**Net effect so far:** several previously-inert accessibility controls now actually work (word spacing, line spacing, font size inside lessons, TTS no longer autoplaying, distraction-free mode no longer producing the widest possible line length), the settings data model got a genuine consistency fix (the layout-mode/chunked-content split), and the Dyslexia preset gained real behavioural identity (a reading toolbar, read-from-here, a dedicated dashboard) instead of being a colour theme. ADHD gained a working `NowBar`. Autism's guided mode no longer shows wizard chrome around a page that isn't actually being sequenced, and its Itinerary panel is now at the top of the lesson instead of the bottom. Quizzes no longer punish accessibility-preset learners with a pulsing countdown or a silent auto-submit, show stated expectations before starting, and force one-question-per-screen regardless of the lesson's own layout setting. Selecting any preset now shows what it will change before it changes it, using a diff function (`getPresetDiff()`) that had existed, unused, since before this program started. The settings this whole program has been changing now have a real catalog, a PR checklist to hold future changes to the same standard, and a public statement telling a learner honestly what works and what doesn't before they invest time in the product. The single most severe defect in the whole documentation set — that no interactive activity was keyboard operable — turned out to be stale for 4 of 5 viewer types on inspection, and the one genuine gap (`DragDropViewer`) now has a keyboard path via the same library mechanism (`dnd-kit`'s `KeyboardSensor`) already proven working elsewhere in this codebase, plus a dropdown alternative for its most common mode. **None of it has been measured against real learners or a real baseline** — Phase 0's baseline was never captured, Phase 8's actual evaluation work needs people and hardware an autonomous session cannot supply, and nothing in this paragraph has been confirmed with a real keyboard-only pass or screen reader — no live server has been reachable at any point in this program.

---

## 2. Phase 1 — Truthfulness

**Goal:** stop the product from lying — several settings looked like they did something and didn't.

| # | Item | Status | File(s) |
|---|---|---|---|
| 1 | Remove `!important` word/letter-spacing block | ✅ | `globals.css` |
| 2 | Fix word-spacing scale to reach WCAG floor | ✅ | `AccessibilityProvider.tsx` |
| 3 | Remove legacy enum overrides in lesson content | ✅ | `LessonViewPage.tsx` |
| 4 | `computeAdaptiveSettings` reads `base_preset` | ✅ | `adaptive-engine.ts` |
| 5 | Stop TTS autoplay | ✅ | `LessonViewPage.tsx` |
| 6 | Remove deprecated `data-low-contrast` filter | ✅ | `AccessibilityProvider.tsx`, `globals.css` |
| 7 | Scope Soft Backgrounds off `--background`/`--card` | ✅ | `globals.css` |
| 8 | `muted_colors` → token-level chroma reduction | ❌ **Deferred** | — |
| 9 | Remove spotlight blur, raise dim opacity | ✅ | `globals.css` |
| 10 | Fix Autism `??`→`||` container-width bug | ✅ | `LessonViewPage.tsx` |

### 2.1 Detailed test steps

**#1–#2 — Dyslexia word/letter spacing**
- File: `src/app/globals.css:180-207`, `src/providers/AccessibilityProvider.tsx:126`
- **Test:** Open a lesson, apply the Dyslexia preset. Open DevTools → Elements → find a `<p>` inside `.rich-content`. Computed styles should show `word-spacing` ≈ **0.16em** and `letter-spacing` ≈ **0.12em** (not `0em`/`0.1em`). Then open Settings → Reading → drag the Word Spacing slider — the paragraph's word spacing should visibly change immediately. **Before this fix, dragging the slider under the Dyslexia preset did nothing at all.**

**#3 — Font size / line spacing sliders affecting lesson content**
- File: `src/components/courses/LessonViewPage.tsx:1148` (`contentInlineStyle`), rendered at both `.prose` divs
- **Test:** In Settings → Reading, drag Font Size and Line Spacing. Both should visibly resize/respace the actual lesson paragraph text, not just the settings panel preview. **Before this fix, these sliders changed nothing inside a lesson** — a separate 4-value legacy enum silently controlled it instead.

**#4 — `base_preset` resolver fix**
- File: `src/lib/adaptive-engine.ts:375`
- **Test:** Apply the ADHD preset (which enables `chunked_content` and `checkpoints` lesson modes). Then change *any single* other setting (e.g. toggle Captions on/off) without reapplying the preset. Open a multi-section lesson — it should *still* be chunked/checkpointed. **Before this fix, touching any one setting silently dropped the preset's chunking and checkpoint behaviour** while keeping its colours (because two different pieces of code disagreed about which field meant "the active preset").

**#5 — TTS no longer autoplays**
- File: `src/components/courses/LessonViewPage.tsx:743-757` (search "never auto-starts")
- **Test:** Apply the Dyslexia preset (which sets `tts_enabled: true`) and open any lesson. **Audio must not start on its own.** Only pressing the Listen button should start speech.

**#6–#7 — Contrast filter / Soft Backgrounds**
- File: `globals.css` (`data-low-contrast` rule removed), `AccessibilityProvider.tsx:106-108`
- **Test A:** Apply the Dyslexia preset (cream background), then toggle Sensory → Soft Backgrounds on. The page background should **stay cream** — only borders/panel edges should soften. **Before this fix, the cream background silently disappeared.**
- **Test B:** With Soft Backgrounds on, inspect any text element's computed contrast — should not be artificially reduced. (The old deprecated rule applied `filter: contrast(0.85)`, actively *lowering* readability.)

**#8 — `muted_colors` — DEFERRED, still broken**
- File: `globals.css` — still `filter: saturate(0.6)` on `<html>`
- **Test (expected to still fail):** Apply the Autism preset (which enables `muted_colors: true`). Open DevTools, find an error/destructive-colored element (e.g. a red badge) — it will be desaturated along with everything else. **This is a known, documented gap**, not a regression — see §7.

**#9 — Reading Spotlight blur/opacity**
- File: `globals.css` (search "read-position" / `.spotlight-active`)
- **Test:** Enable Reading Spotlight in a lesson with 3+ paragraphs. Non-active paragraphs should appear **dimmed but crisp** (no blur), at roughly 45% opacity, not blurry.

**#10 — Autism container width consistency**
- File: `src/components/courses/LessonViewPage.tsx:1072,1148`
- **Test:** Apply the Autism preset. Open two different lessons from two different courses, ideally ones an educator configured with different layouts (`lesson_layout` values). The reading column width should be **identical** in both. **Before this fix, an Autism-preset learner got a different page width per course**, contradicting the preset's core "predictable structure" promise.

---

## 3. Phase 2 — Foundations

**Goal:** one source of truth for settings and layout, instead of ad hoc logic re-derived in five different components.

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | `SETTING_CATALOG` | ❌ Not started | — |
| 2.2 | `resolveSettings()` + conflicts | ⚠️ Partial | 4 of 11 precedence rules implemented and **live-wired** |
| 2.3 | `--content-measure` / `.content-column` | ✅ Done | |
| 2.4 | Three-way layout radio | ✅ Done | |
| 2.5 | Extract `useLessonSequencer`/`useLessonAccessibility` hooks | ❌ Not started | Deliberately — needs live testing to verify zero behaviour change on a 2,700-line file |
| 2.6 | Schema migration (`explicit_overrides` etc.) | ❌ Not started | — |
| 2.7 | a11y CI gates | ⚠️ Partial | 18 unit tests exist and pass; no CI pipeline to run them automatically |
| 2.8 | Performance budget | ❌ Not started | — |

### 3.1 Detailed test steps

**#2.3 — `.content-column` measure system**
- File: `src/app/globals.css:83,160,212,238,579-587`
- **Values:** `--content-measure` is `72ch` default, `62ch` Dyslexia, `66ch` ADHD, `66ch` Autism.
- **Test:** Open a lesson under each preset, zoom to 100%. Measure the rendered line length of body text (character count, not pixels). Should be visibly narrower under Dyslexia than under Default. **Also test the specific bug fix:** apply any preset, turn on Distraction-Free Mode, open a lesson **and** a quiz. Line width should **not** balloon to the full viewport width — it should stay at the preset's measure. This exact bug existed independently in both `LessonViewPage.tsx` and `QuizPage.tsx` (found the second instance while fixing the first).

**#2.4 — Layout Mode three-way control**
- File: `src/components/learner/AccessibilitySettingsModal.tsx:449-460`
- **Test:** Open Settings → Focus tab. You should see **three** buttons: "Scroll View", "Slide View", "One Section at a Time" — not two buttons plus a separate "Chunked Content" switch. Apply the Dyslexia or ADHD preset (both default to chunked) and reopen Settings — "One Section at a Time" should show as **selected**. **Before this fix, neither of the two old buttons ever appeared selected** under these presets, because the UI only represented 2 of the field's 3 possible values.

**#2.2 — `resolveSettings()` resolver**
- File: `src/lib/accessibility-resolver.ts` (new), wired into `src/providers/AccessibilityProvider.tsx:184-198`
- **What it does live right now:** normalizes `layout_mode`/`chunked_content_mode` so they can never disagree (fixes stale/legacy data automatically), and computes (but does not yet display) conflict explanations for: Slide view + ADHD/Autism preset, Soft Backgrounds + non-white tint, and "customized from preset X."
- **Test (indirect — nothing renders the conflicts list yet):** Run `npm run test:a11y-resolver` — should print **18 passed, 0 failed**. This is the resolver's actual test surface until Phase 5/7 builds UI that reads `settingsConflicts` from context.
- **Not yet testable in the UI:** the computed conflicts aren't shown anywhere. This is expected — see §7.

**#2.7 — Resolver unit tests**
- **Test:** `npm run test:a11y-resolver` from the repo root. Expect `18 passed, 0 failed`.

---

## 4. Phase 3 — Dyslexia: "The Reading Room"

**Goal:** give Dyslexia an actual behavioural identity — before this phase, applying it changed only colours, fonts, and sidebar width.

| # | Item | Status | Notes |
|---|---|---|---|
| Typography (italic ban, left-align, manual hyphens) | ✅ Done | `globals.css` |
| Reading Spotlight suppressed for short chunks | ✅ Done | `ReadingSpotlight.tsx` |
| Reading-aware chunk time labels | ✅ Done | `LessonViewPage.tsx` |
| "Read from here" (click paragraph mid-TTS) | ✅ Done, **block-level not sentence-level** | `speak()`, `ReadingSpotlight.tsx` |
| `ReadingToolbar` component | ✅ Done, **not sticky** | New file, gated to Dyslexia preset |
| Dyslexia dashboard branch | ✅ Done, **reduced density design** | `learner/page.tsx` |
| Sentence-level TTS highlighting (`onboundary`) | ❌ Not attempted | Cross-browser risk without live testing |
| Mobile bottom-bar toolbar variant | ❌ Not attempted | — |
| TTS + screen reader coexistence | ❌ Not tested | — |
| `ms-MY` voice fallback UI | ❌ Not attempted | — |
| Keyboard-reachable "read from here" | ❌ Not attempted | Listen button remains the keyboard baseline |
| Reading ruler (alternative to dimming) | ❌ Not attempted | — |
| Quiz/activity read-aloud | ❌ Deliberately deferred to Phase 6 | — |

### 4.1 Detailed test steps

**Typography**
- File: `globals.css:195-207`
- **Test:** Apply Dyslexia preset, view a lesson with `<em>` or `<i>` tags in its content (or bold/italic text). Should render as **bold**, never slanted italic. Text should also be strictly left-aligned (never justified) even in a narrow column.

**Reading Spotlight short-chunk suppression**
- File: `ReadingSpotlight.tsx:48-58`
- **Test:** Apply Dyslexia (chunked layout). Navigate to a chunk/section with only 1–2 paragraphs. With spotlight on, **nothing should dim** — everything stays full opacity. Navigate to a chunk with 4+ paragraphs — normal spotlight dimming behaviour should resume (one paragraph highlighted, rest dimmed to ~45%).

**Chunk time labels**
- File: `LessonViewPage.tsx` (`ChunkNavigation`, `currentChunkMinutes`)
- **Test:** Open a chunked lesson. The section badge (e.g. "Section 2 of 5") should now also show **"· ~N min"** based on word count at ~200 wpm, rounded up to at least 1 minute.

**"Read from here"**
- File: `speak()` in `LessonViewPage.tsx`, `ReadingSpotlight.tsx` (`onBlockActivate`, `handleClick`)
- **Test:** Start TTS via the Listen button. While it's speaking, **click a different paragraph further down**. Speech should restart from that paragraph. **Click a paragraph while TTS is NOT playing** — nothing should happen (no accidental interception of normal reading/selection). Cursor should show a pointer only while TTS is active (check via `.reading-spotlight-seekable` class on the container, `cursor: pointer` in DevTools).

**`ReadingToolbar`**
- File: `src/components/accessibility/ReadingToolbar.tsx`, wired at `LessonViewPage.tsx:1524`
- **Test:** Apply the Dyslexia preset, open a lesson (not in Focus Mode). A control bar should appear below the lesson header with: Listen/Stop button + speed selector, A−/A+ text size, a word-spacing cycle button (Normal → Wide → Widest), a tint swatch button (opens the existing background-colour picker in a popover), and a Spotlight toggle. **Every change should apply immediately with no Save button** — e.g. click A+ and the lesson text should resize right away. Reload the page — the change should have persisted (it calls `updateSettings`, not just preview).
- **Known limitation to verify:** scroll down the page — the toolbar should **not** stick to the top (it's not sticky in this version, by design — see §7). It should scroll away normally.
- **Test it's absent elsewhere:** Switch to Default or ADHD preset — the toolbar should **not** appear at all.

**Dyslexia dashboard**
- File: `src/app/learner/page.tsx:86-107`
- **Test:** Apply Dyslexia preset, go to `/learner`. Should see: Welcome section, **one** "Continue reading" recommendation card (not a 3-card grid), and a single-column list of enrolled courses (not a 2-4 column grid). Switch to Default/ADHD/Autism — dashboards should look as they did before (grid layouts, multiple recommendation cards for Default).

---

## 4a. Phase 4 — ADHD: "The Runway" (partial — NowBar only)

**Goal:** fix the ADHD preset hiding its own executive-function supports. Building the
fix surfaced a **second, more severe bug** in the same code path — see below.

| Item | Status | File(s) |
|---|---|---|
| `NowBar` component | ✅ Done | `src/components/accessibility/NowBar.tsx` (new) |
| Wired to replace the header ADHD's forced focus mode was hiding entirely | ✅ Done | `LessonViewPage.tsx` (search "Now Bar (ADHD preset)") |
| Dashboard sharpening | ❌ Not attempted | — |
| Time-based (3–7 min) chunking | ❌ Not attempted | — |
| Interruption discipline (no toast during a task) | ❌ Not attempted | — |
| Non-blocking quiz timers | ❌ Not attempted | — |
| Mobile Now Bar variant | ❌ Not attempted | — |
| Collapsed nav rail (vs. full sidebar removal) | ❌ Not attempted | — |

### The bug found while fixing the bug

The known defect (doc 02 §4.2) was: the ADHD preset turns on Task Checklist, Progress
Timeline, and Auto-Save, then forces focus mode, whose wrapper (`{!effectiveFocusMode
&& (...)}` around the supports block) hides all three.

Tracing *why* that gate existed surfaced something worse. `effectiveFocusMode` is
forced true for ADHD via `activePreset === 'adhd'` in its own definition
(`LessonViewPage.tsx`, search `effectiveFocusMode =`). But the file has exactly two
header variants:
- the normal `<header>`, gated on `!effectiveFocusMode` — hidden for ADHD, correctly by design
- the "Focus Mode Slide Navigation" bar, gated on the *raw* `focusMode` state — which ADHD's forced focus never sets, only the *derived* `effectiveFocusMode`

**Neither condition is ever true at the same time for ADHD's default case.** An
ADHD-preset learner opening a lesson where the educator hadn't explicitly set
`lesson.focus_mode_enabled` got **no header at all** — no lesson title, no back
button — and, combined with `distraction_free_mode` also hiding the sidebar, no
navigation of any kind beyond a floating "Exit Distraction-Free Mode" button in the
corner (from `LearnerShell.tsx`, a different component entirely).

`NowBar` fixes both bugs with one component: it's the ADHD-forced-focus state's only
header now — back button, current action ("Read section 2 of 5" etc., derived from
`lessonPhases`), progress bar, `AutoSaveIndicator` always visible, and an expand
toggle revealing the previously-hidden `TaskChecklist` + `ProgressTimeline`.

### Test steps

- File: `src/components/accessibility/NowBar.tsx`, wired at `LessonViewPage.tsx` (search `activePreset === 'adhd' && effectiveFocusMode`)
- **Test:** Apply the ADHD preset, open a lesson. A bar should appear at the very top of the page (sticky — it should stay visible as you scroll) showing: a back chevron, "NOW" + the current action (e.g. "Read section 2 of 5"), a progress bar, a save-status pill, and a "N/M" tasks button.
- **Test the fix specifically:** click the tasks button — it should expand to reveal the Task Checklist and Progress Timeline **that were previously completely inaccessible** under this preset.
- **Test the back button:** press the chevron — should navigate back to the course (reuses the same `onBack` the normal header uses).
- **Test scope:** switch to Default/Dyslexia/Autism — NowBar should **never** appear. Manually exit ADHD's focus mode (if there's a control to do so) — NowBar should disappear and the **normal** header + supports section should reappear in its place (they share the same underlying state).
- **Not verified live** — see the top of this document. Login and signup both failed in this environment for reasons unrelated to the code.

---

## 4b. Phase 5 — Autism: "The Itinerary" + Guided Run (reduced scope)

**Goal.** Give Autism's guided mode an identity that actually works, and stop lying
about it — [02 §4.3](02-SETTINGS-REFERENCE.md) diagnosed two components disagreeing
about whether guided mode was on, so the wizard chrome could render around a page that
wasn't actually being sequenced.

| Item | Status | File(s) |
|---|---|---|
| Fix the guided-mode disagreement bug | ✅ Done | `LessonViewPage.tsx` |
| Guided mode works on lessons with < 2 `<h2>` headings | ✅ Done (as a consequence of the fix above) | `LessonViewPage.tsx` |
| Disabled "Next" explains why | ✅ Done | `StepByStepGuidance.tsx` |
| Itinerary panel promoted to the top of the lesson | ✅ Done | `LessonViewPage.tsx`, `VisualSchedule.tsx` |
| Itinerary shows done/now/next/later, not just remaining items | ✅ Done | `VisualSchedule.tsx` |
| Sidebar double-numbering resolved | ✅ Done | `Sidebar.tsx` |
| `SectionTransition` interstitial (Zone C) | ❌ Not attempted | — |
| `ExpectationCard` (lesson/section/activity/quiz expectations) | ❌ Not attempted | — |
| Full focus-management contract (focus-to-heading on advance/back/exit) | ❌ Not attempted | — |
| `aria-live` politeness policy for transitions | ❌ Not attempted (existing sr-only region is TTS-only) | — |
| Literal-language locale layer (`ms` + `en`) | ❌ Not attempted | — |
| Escape-space panic switch (D13) | ❌ Not attempted | — |
| `muted_colors` token-level chroma fix | ❌ Still deferred (Phase 1 item 8, unchanged) | — |
| `animation_level` honoured under Autism (or hidden + explained) | ❌ Not attempted | — |

### The core bug and its fix

[02 §4.3](02-SETTINGS-REFERENCE.md) named two components that disagreed about whether
guided mode was on. Component A, the `StepByStepGuidance` wizard chrome, rendered
whenever the raw `settings.step_by_step_enabled` flag was on and `guidedSteps.length >
0` (`LessonViewPage.tsx`, formerly line 1638). Component B, the actual sequencing gate
(`guidedMode`, computed twice — once in a `useEffect` that runs ahead of the
component's early-return guards at `LessonViewPage.tsx:1086`, and once in the main
render body at `LessonViewPage.tsx:1225`), additionally required `showChunkNav`
(`totalChunks > 1`, i.e. the lesson's *body content* has at least two `<h2>`
sections) before it would turn on.

Those two conditions are not the same thing. `guidedSteps` (`LessonViewPage.tsx:1040`)
is built from lesson **phases** — video / content / activity / quiz — which exist
independently of whether the content itself happens to be split by headings. So on any
lesson with fewer than two `<h2>`s: Component A rendered a full wizard (step counter,
progress dots, a Next button) while Component B stayed `false` — no phase was actually
hidden, no section was actually gated, `sequentialMode` was `false`. The learner saw a
guidance UI wrapped around an ordinary flowing page that ignored it completely. This is
exactly [02 §4.3](02-SETTINGS-REFERENCE.md)'s "the guided doesn't really feel like it's
helping."

**Fix:** replace the `showChunkNav` precondition on `guidedMode` with `guidedSteps.length
> 1` (there must be at least two *phases* to step between — chunking the content phase
further is a separate, independent concern that `ChunkNavigation` already gates on
`showChunkNav` by itself, unaffected by this change), and gate the wizard chrome on the
same `guidedMode` value instead of the raw setting. Both `computedGuidedMode`
(`LessonViewPage.tsx:1086`) and `guidedMode` (`LessonViewPage.tsx:1225`) now read
identically; the wizard render (`LessonViewPage.tsx:1679`, was line 1638) now reads
`guidedMode` directly. This closes the false-positive case (wizard renders, nothing
sequenced) and, as a direct consequence, makes guided mode actually sequence lessons
with a single heading — the exact case named in
[00 §Phase 5 exit criteria](00-PROGRAM-PLAN.md) — because the phase-level "Previous
phase / Next phase" navigation at `LessonViewPage.tsx:2555` was already written against
`lessonPhases`, not chunks; it was just unreachable while `guidedMode` required
`showChunkNav`.

**Everywhere else `guidedMode` is read was audited for an assumption that it implied
`showChunkNav`** (the `ChunkNavigation` component and every checkpoint-related read of
`guidedMode`, which are all independently gated on `showChunkNav`/`requireCheckpoint` at
their call sites) — none found; see the code comments at each definition site for the
specific reasoning per call site.

**Disabled Next now explains why.** `StepByStepGuidance.tsx`'s Next button used to grey
out with no stated reason — [03 §7.2](03-PRESET-REDESIGN-PLAN.md) calls this mandatory,
not optional. It now renders `Finish "{step title}" to continue.` beneath the button
whenever it's disabled, with `aria-describedby` wiring it to the button so a screen
reader announces the reason, not just "dimmed."

### The Itinerary panel

[03 §5.1](03-PRESET-REDESIGN-PLAN.md) / [02 §4.4](02-SETTINGS-REFERENCE.md): `VisualSchedule`
used to render at the bottom of the lesson, after the content a learner would use it to
prepare for — "a schedule you read after finishing is not a schedule." It's now rendered
at the very top of the lesson (`LessonViewPage.tsx:1660`, above the guided wizard and all
content), and shows every phase — including already-completed ones, marked done with a
checkmark and struck-through title — not just what's left
(`VisualSchedule.tsx`'s `ScheduleItem.done`). The old bottom-of-page render was removed
rather than duplicated.

Kept the existing gate — `settings.visual_schedule_enabled`, which the Autism preset
turns on by default — rather than hardcoding `activePreset === 'autism'`, so a learner
who enables the setting manually under a different preset still gets it, consistent with
how every other support in this file works.

**Reduced from spec, deliberately:**
- **No total-time intro line wired up.** `VisualSchedule` now accepts an optional
  `totalMinutes` prop and will render "This lesson has N parts. About M minutes in
  total." when given one — but nothing in `LessonViewPage.tsx` currently passes it. The
  codebase has a real per-second-estimate only for the content phase
  (`readTime.minutes`); video/activity/quiz phases have no tracked duration. Inventing a
  number for them would be exactly the kind of thing Phase 1 of this whole program
  exists to stop doing. Wiring this honestly needs either real duration data or accepting
  a partial total, neither of which fit in this session's scope — left as a documented
  gap rather than a fabricated figure.
- **Doesn't collapse to a one-line summary once started.** [03 §5.1](03-PRESET-REDESIGN-PLAN.md)
  specifies the full panel pre-lesson, collapsing to "Part 2 of 4 · Read the lesson"
  once underway. Only the full panel is built; the collapse behaviour is unbuilt.
- **Not sticky, and not proven to "survive focus mode"** ([03 §3.2](03-PRESET-REDESIGN-PLAN.md)'s
  Zone A rule). Rendered unconditionally at the top of the flowing page; Autism doesn't
  force focus mode the way ADHD does, so this gap is lower-stakes than it would be for
  ADHD, but it's still not verified against every mode combination.

### Sidebar double numbering

[03 §5.4](03-PRESET-REDESIGN-PLAN.md): the Autism sidebar labelled every nav entry
"Step 1: Dashboard" … "Step 5: Settings" (plus "2.1"/"2.2"/"2.3" sub-items), while the
Autism dashboard independently numbers its own three sections 1–3
(`src/app/learner/page.tsx:49,57,65`). Two numbering systems for two different things —
site-wide navigation vs. one page's task order — is itself a source of confusion per
[01 §5.4](01-LEARNING-STANDARDS.md). Fixed by stripping the numeric prefixes from every
`labelOverride` in `Sidebar.tsx`'s Autism branch, keeping the plain label text
(`Sidebar.tsx`, search "resolve the double numbering"). Numbering now exists in exactly
one place a learner sees it during a single task: the dashboard's 1–3 sections and the
guided-run step counter ("Step 2 of 4").

### Why the rest was not attempted

Consistent with every prior phase's discipline: reduce scope rather than ship something
unverifiable, and say so. The items marked ❌ above share one or more of these reasons:

- **`SectionTransition` and full focus-management contract** need to be threaded through
  the existing chunk-advance / phase-advance / checkpoint flow in a 2,900-line component
  without breaking any of Phases 1–4's existing behaviour in the same file, and their
  correctness (does focus really land on the right heading, does the live region really
  announce once and not stack) is exactly the kind of thing that needs eyes and a screen
  reader on a running page, not just type-checking. [00's Phase 5 exit criteria](00-PROGRAM-PLAN.md)
  explicitly requires an NVDA/VoiceOver walkthrough for this reason. No live server was
  reachable this session (see the top of this document) — building it now would mean
  shipping unverified interaction/focus code, the exact risk every earlier phase declined
  to take when in the same position.
- **`ExpectationCard`** is genuinely new UI surface repeated across lesson start, section
  start, activity, and quiz — larger than a single-session addition, and it overlaps
  materially with [07-ASSESSMENT-POLICY.md](07-ASSESSMENT-POLICY.md) (Phase 6 scope) for
  its quiz/activity instances.
- **Literal-language locale layer** is content-authoring work (rewriting learner-facing
  copy in two languages against a style guide), not a code-behaviour fix; doing it well
  needs a copy review pass this session doesn't have.
- **Escape-space panic switch** is a new cross-cutting, always-reachable global feature
  (D13) — closer to Phase 7's "settings discoverability" scope than a single preset's
  identity work, and touches every page shell, not just the lesson view this phase
  otherwise stayed contained to.
- **`muted_colors` and `animation_level`** are unchanged from their Phase 1 deferral —
  see that phase's note; nothing here changed the calculus (still needs a broader
  Tailwind-color-to-token conversion, still needs live contrast verification).

---

## 4c. Phase 6 — Content, Authoring & Assessment (assessment workstream + activity keyboard ops)

**Goal.** Phase 6 as specced in [00 §4](00-PROGRAM-PLAN.md) spans six workstreams —
runtime resilience, authoring aids, Easy-Read, assessment, educator surfaces, catalogue
backfill — a multi-week effort on its own. This session's slice: the quiz-side defects
named in [07-ASSESSMENT-POLICY.md §2](07-ASSESSMENT-POLICY.md), all gated on an
accessibility preset being active — **plus, in a later continuation of this program**,
the doc's own top-severity item: interactive-activity keyboard operability.

| Item | Status | File(s) |
|---|---|---|
| Pulsing red countdown fixed | ✅ Done | `QuizPage.tsx` |
| Timer auto-submit → Extend/Submit-now | ✅ Done | `QuizPage.tsx` |
| Measure lost in distraction-free mode | ✅ Already fixed (Phase 2) | `QuizPage.tsx` |
| One-question-per-screen decoupled from lesson-reading setting | ✅ Done | `QuizPage.tsx` |
| Expectation panel shown for every preset | ✅ Done | `QuizPage.tsx` |
| Read-aloud on question stem, independent of `tts_enabled` | ✅ Done (stems only, not options) | `QuizPage.tsx` |
| Interactive activity keyboard operability (all 5 viewer types) | ✅ Done, unverified live — see addendum below | `DragDropViewer.tsx`, `FillBlanksViewer.tsx`, `MemoryGameViewer.tsx`, `FlashcardViewer.tsx`, `TimelineViewer.tsx` |
| `ACTIVITY_ACCESSIBILITY` cautions wired up as real controls | ⚠️ Partial — drag_drop's specific suggestion implemented, not the data structure generically | `DragDropViewer.tsx` |
| Runtime resilience (paragraph-count chunking fallback, etc.) | ❌ Not attempted | — |
| Authoring aids (lesson editor accessibility score, publish blocks) | ❌ Not attempted | — |
| Easy-Read content pipeline | ❌ Not attempted | — |
| Educator surfaces audit (`LessonAccessibilitySettings`) | ❌ Not attempted | — |
| Catalogue backfill | ❌ Not attempted | — |

### Addendum — interactive activity keyboard operability

Landed later in this program, after the user asked for a full-plan status check and
directed this session to prioritise the highest-severity known gap before anything
else. **Audited before writing any code**, and the audit overturned the premise: the
"none of the five viewers is keyboard operable" claim was already stale for four of
them. `FillBlanksViewer` uses native `<input>`/`<select>`; `FlashcardViewer` and
`MemoryGameViewer` use native `<button>`; all three are keyboard-operable by default
with no extra code, just missing position-aware accessible names. `TimelineViewer`
already had dnd-kit's `KeyboardSensor` wired up for its sortable mode. The one real,
structural gap — `DragDropViewer` configured only `PointerSensor` — is fixed by adding
`KeyboardSensor`, the same mechanism already proven working in `TimelineViewer` in this
same codebase, rather than inventing new keyboard-drag logic.

**Per file:**
- **`DragDropViewer.tsx`** — `KeyboardSensor` + `closestCenter` collision detection
  added to `DndContext`. Two mouse-only removal controls (`<div onClick>`, no
  `tabIndex`, no role) converted to real `<button>`s with `aria-label`s. A `<select>`
  alternative added for categories mode — every unplaced item can be assigned to a
  category directly, no drag required — implementing exactly what
  `accessibility-utils.ts`'s `ACTIVITY_ACCESSIBILITY.drag_drop.alternativeSuggestion`
  had prescribed ("keyboard alternatives, e.g. matching dropdowns") since before this
  program started. A polite live region now announces placements and removals. As a
  side effect of properly typing `DroppableDiagramZone` (previously `: any`), one
  pre-existing lint error and one pre-existing unused-variable warning were fixed too —
  confirmed via `git show HEAD:...DragDropViewer.tsx | npx eslint --stdin`, which
  showed the committed baseline at 8 problems (1 error, 7 warnings) against this
  session's 6 (0 errors, 6 warnings).
- **`FillBlanksViewer.tsx`** — every blank now has `aria-label="Blank N of M"` plus
  `aria-invalid`/`aria-describedby` linking to its correct-answer hint. Previously a
  screen reader had no way to know which blank it was on.
- **`MemoryGameViewer.tsx`** — every card now has a stable, position-aware
  `aria-label` ("Card 3 of 12, face down/face up/matched") — previously just "Hidden
  card" with no position, or the raw text with no state. Position is by count, not
  row/column, since the grid's column count is responsive (2/3/4 columns) and a fixed
  row/column would be wrong at some viewport width.
- **`FlashcardViewer.tsx`** — a real bug fix, not just a labelling gap: both card
  faces exist in the DOM at once (`backface-visibility: hidden` is visual-only), and
  without `aria-hidden` toggling with flip state, a screen reader had no reason not to
  read both sides regardless of which was showing. Fixed. Arrow-key navigation between
  cards was **not** added — Tab plus the existing Prev/Next buttons already give full
  access, and [06 §5.2](06-INTERACTION-AT-SPEC.md) frames shortcuts as accelerators,
  never the only route.
- **`TimelineViewer.tsx`** — added the position-aware accessible name its
  already-working `KeyboardSensor` setup was missing ("Event 3 of 6").

**Reduced from spec, deliberately:** diagram/matching-mode drag-drop has no dropdown
alternative (arbitrary x/y zones over an image don't map onto a flat option list the
way named categories do — relies on `KeyboardSensor` alone); `ACTIVITY_ACCESSIBILITY`
still isn't read anywhere to drive this generically for other activity types, only
hand-implemented for `drag_drop` specifically.

**Verification.** Type-check clean across all five files. ESLint 0 errors on every
file; every remaining warning confirmed pre-existing by diffing against each file's
committed `HEAD` version, not just assumed. The resolver's 18 tests and the catalog's
234 assertions both still pass. **Nothing here has been exercised with a real
keyboard-only pass or screen reader** — no live server has been reachable at any point
in this program. The core fix rests on a documented, widely-used library feature
already proven working elsewhere in this codebase rather than hand-rolled logic, which
is a stronger basis for confidence than most of this session's other unverified
changes — but it is still not the same as having watched it work.

### What shipped

All in `QuizPage.tsx`, all gated on `activePreset !== 'none'` (computed the same way as
`learner/page.tsx`: `settings?.base_preset || settings?.active_preset || 'none'`) so the
default, no-preset product experience is byte-for-byte unchanged — consistent with how
every prior phase scoped its changes.

- **No more pulsing/red countdown under any preset.** The old condition
  (`timeLow && !settings.distraction_free_mode && !settings.simplified_ui`) was broken
  exactly as [07 §2](07-ASSESSMENT-POLICY.md) diagnosed: `simplified_ui` is `false` in
  every preset's defaults (never suppresses anything), and `distraction_free_mode` is
  only a preset *default* — a learner can turn it off and keep the preset, bringing the
  pulse straight back. Replaced with `activePreset === 'none'` as the sole gate: no
  accessibility-preset learner ever sees the red pulse; default behaviour is identical
  to before.
- **Timer no longer silently auto-submits under a preset.** The countdown effect used to
  call `autoSubmitRef.current()` unconditionally at zero. Now: under a preset, it sets a
  `timeUpPrompt` flag instead, which renders a small dialog — "Add more time" (one
  self-serve extension, 25% of the original limit, floored at 60 seconds) or "Submit
  now" (the same `handleAutoSubmit` as before, answers preserved). A separate inline
  banner appears once remaining time drops to 25% of the original limit, before zero,
  also offering the extension, so it isn't a surprise the first time it's seen. Default
  (no-preset) behaviour — immediate hard auto-submit at zero, no warning — is
  byte-for-byte unchanged.
- **One question per screen forced under every preset**, regardless of
  `chunked_content_mode`/`layout_mode`. This mattered most for Autism specifically: its
  lesson-reading default is `layout_mode: 'scroll'` (predictable, non-chunked reading),
  which previously meant Autism-preset learners got the full-scroll, all-questions-at-once
  quiz view — the opposite of [07 §4](07-ASSESSMENT-POLICY.md)'s explicit
  "decoupled from lesson-reading settings" requirement.
- **Expectation panel** ("This quiz contains N questions...", pass mark, attempts
  remaining, no-tricks reassurance — a fixed field order that already matched
  [07 §6.1](07-ASSESSMENT-POLICY.md)'s spec once found) now renders for every
  accessibility preset instead of only when `structure_mode === 'checklist'` (Autism's
  default only) — Dyslexia and ADHD learners previously started a potentially timed quiz
  with zero stated expectations.
- **Read-aloud on the question stem** no longer requires `tts_enabled` — a `Volume2`
  button now always renders next to the question text (both in the chunked,
  one-question view, and newly added to the full-scroll view, which never had it at
  all), calling a small shared `handleReadQuestionAloud` helper.

### Reduced from spec, deliberately — and why

- **Interactive activity keyboard operability — deferred at the time this section was
  written, later landed.** This section originally deferred it as the largest
  unverified-risk item in this program. It was picked up in a later continuation of
  this session — see the "Addendum" above for what shipped, what didn't, and why it
  turned out smaller than expected (4 of 5 viewers were already keyboard-operable via
  native elements or an existing `KeyboardSensor`; only `DragDropViewer` had the
  structural gap this note originally worried about).
- **`ACTIVITY_ACCESSIBILITY` wiring — partially landed in the same addendum**, for
  `drag_drop` specifically; still not read anywhere generically.
- **"No countdown at all" reading of [07 §3](07-ASSESSMENT-POLICY.md) — not
  implemented.** That section's heading literally says "Default: no time limit, for
  every learner," which read most literally would mean hiding an educator's configured
  timer entirely for preset learners. Chose the narrower "soft" reading instead — same
  section's own "Educator time limits become soft: **displayed**, never enforced" line —
  because fully suppressing an educator-configured value is a bigger product-policy call
  than this session should make unilaterally without the educator side of that trade-off
  being confirmed.
- **Per-option read-aloud — not attempted.** Each option is currently one `<button>`
  spanning the full row (the whole row is the click target). Nesting a second `<button>`
  for read-aloud inside it is invalid HTML and would corrupt the accessible name/role for
  screen readers. Doing this correctly means restructuring every option to a
  `<div role="radio">` (or similar) with a separate button — real keyboard/ARIA surface
  area, deferred for the identical reason interactive-activity keyboard work was
  deferred above.
- **Runtime resilience, authoring aids, Easy-Read pipeline, educator surfaces audit,
  catalogue backfill — not attempted.** Each is its own substantial workstream (a lesson
  editor accessibility score and blocking publish checks for missing alt text/captions;
  simplified-content storage plus the AI-drafts/educator-approves flow from D4; auditing
  `LessonAccessibilitySettings` for what it actually explains to educators; remediating
  the existing course catalogue against the structural contract) with no code overlap
  with what this session touched. Untouched, not regressed.

### Verification

Type-check (`npx tsc --noEmit`) clean. ESLint on `QuizPage.tsx` and the two locale files:
0 errors, 7 pre-existing warnings (unused `activeTab`/`setActiveTab` state, one
missing-dependency warning on an untouched effect, four `<img>`-vs-`next/image`
warnings on pre-existing image renders) — each cross-checked against this session's
actual edits and confirmed to fall outside them, same discipline as every prior phase.
The resolver's 18 unit tests still pass (untouched this phase). **No live verification
was possible** — re-checked immediately before starting this phase and the environment
block from Phase 5 was unchanged (another chat's `next dev` still holds this directory
outright). The timer state machine (extend / submit-now / auto-submit, and the
percentage-based low-time banner) is verified by tracing every branch by hand against
the pre-existing code, not by watching a countdown actually reach zero on screen —
treat it with the same "should work by code reading, not seen working" caveat as
Phase 5's guided-mode fix.

---

## 4d. Phase 7 — Transparency, Onboarding & Composition (Preset Details dialog only)

**Goal.** Phase 7 as specced spans six workstreams (Preset Details dialog, onboarding
rebuild, composition, migration consent, age adaptation, settings discoverability +
panic switch). This session's slice: the one workstream with a concrete, directly
testable exit criterion — **"no preset applies without the learner seeing what it
changes."**

| Item | Status | File(s) |
|---|---|---|
| Preset Details dialog, settings-modal trigger | ✅ Done | `PresetDetailsDialog.tsx` (new), `AccessibilitySettingsModal.tsx` |
| `getPresetDiff()` wired up (previously unused) | ✅ Done | `PresetDetailsDialog.tsx` |
| Preset Details dialog, onboarding trigger | ❌ Not attempted | — |
| "What does this preset do?" persistent link | ❌ Not attempted | — |
| `SETTING_CATALOG` (per-row why/source) | ❌ Not attempted — still not started since Phase 2 | — |
| Onboarding rebuild (barrier questions) | ❌ Not attempted | — |
| Preset composition (base + modifiers) | ❌ Not attempted | — |
| Migration consent flow | ❌ Not attempted | — |
| Age adaptation | ❌ Not attempted (docs recommend staying out of scope) | — |
| Settings discoverability + escape-space panic switch | ❌ Not attempted | — |

### What shipped

Clicking a preset chip in `AccessibilitySettingsModal.tsx`'s "Quick Apply Preset" row
used to call `handleApplyPreset()` immediately — no description, no diff, no way to see
what was about to change. It now stages the click in a `pendingPresetId` state and opens
the new `PresetDetailsDialog`, showing: the preset's name and goal; a "what this turns
on" list from `ACCESSIBILITY_PRESETS[id].additional_features` (pre-existing, accurate
data); for ADHD and Autism, a note that slide view becomes unavailable (verified against
`LessonViewPage.tsx`'s actual `isSlideMode` logic before writing the copy — a real,
code-enforced behaviour with no stored setting, so it wouldn't otherwise show up in a
diff); and "Changes from your current settings," built on `getPresetDiff()`
(`adaptive-engine.ts`) — a function [03 §8.2](03-PRESET-REDESIGN-PLAN.md) had already
flagged as "existing but currently unused" before this session touched it, plus a
parallel diff against `DEFAULT_PRESET_SETTINGS` for the Default/`none` case that
function doesn't cover. Only the dialog's own "Apply preset" button applies anything;
Cancel leaves every local setting untouched.

**A necessary refactor, done in passing.** The diff needs the modal's current *local*
state (which can already differ from the saved settings — e.g. a learner drags a slider,
then clicks a preset chip), so the object literal that captured this — previously built
inline, once, only inside the live-preview effect — was extracted to a named,
`useMemo`'d `currentLocalSettings` read by both that effect and the new dialog. This also
fixes a latent inefficiency: without memoizing, extracting the object would have made it
a fresh reference every render, and the live-preview effect (which depends on it) would
have started firing on every render instead of only when a tracked field actually
changed.

**Found in passing, not fixed:** the entire settings modal — not just the new dialog —
has never had an `en`/`ms` translation pass for its field labels. "Font Family", "Word
Spacing", "Layout Mode", "Reading Spotlight", and every other Reading/Focus/Sensory/
Supports tab label is hardcoded English, pre-existing across every phase to date. The
new dialog's labels for these same fields match that baseline rather than translating
only the dialog and leaving the identical field name in English one panel over — see
§7 below.

### Reduced from spec, deliberately — and why

- **Onboarding's `PresetCard` trigger — not attempted.** A separate flow
  (`src/app/learner/onboarding/page.tsx`) with its own already-documented, independent
  bugs (row 7 of §5's table below), untouched.
- **`SETTING_CATALOG` — not attempted.** Still not started since Phase 2 (item 2.1).
  The dialog draws only from data that already existed and was already verified
  accurate (`additional_features`, `getPresetDiff()`) rather than hand-writing a
  parallel "why" per setting that would drift from
  [01-LEARNING-STANDARDS.md](01-LEARNING-STANDARDS.md) the moment either changed —
  precisely the failure mode the catalog exists to prevent.
- **No separate "Preview" distinct from "Apply."** The spec's three-button footer
  assumes a preview-without-committing state this codebase's architecture doesn't
  have — the modal already live-previews every local change instantly. Reversibility
  comes from the whole modal's pre-existing Cancel-reverts-everything behaviour, the
  same mechanism every other control in the panel already relies on.
- **Onboarding rebuild, composition, migration consent, age adaptation, settings
  discoverability + panic switch — not attempted.** Each is its own substantial
  workstream: composition in particular is a genuine architecture change (single-preset
  selection → base preset + independent modifiers) comparable in size to the
  `sequencer` type change Phase 5 also declined to build without live verification; the
  panic switch is a new, always-reachable global feature touching every page shell,
  deferred in Phase 5 for the identical reason.

### Verification

Type-check clean. ESLint: `PresetDetailsDialog.tsx` — 0 errors, 0 warnings.
`AccessibilitySettingsModal.tsx` — 0 errors, 2 pre-existing warnings (an unused
`availableVoices` variable, and a missing-dependency warning on the untouched
"sync local state when the modal opens" effect), both confirmed by tracing which
effect each belongs to before attributing them as pre-existing rather than
introduced. The `useMemo` refactor initially introduced one *new* warning
(a missing-dependency complaint on the memo itself) — caught during this same
verification pass and fixed with a scoped, explained `eslint-disable-next-line`
before counting the phase as clean, not left in. The resolver's 18 unit tests still
pass (untouched this phase). **No live verification was possible** — re-checked
immediately before starting this phase, same environment block as Phases 5 and 6
(another chat's `next dev` still holds this directory outright). The diff logic is
verified by tracing `getPresetDiff()`'s existing logic against each preset's actual
settings object, and the `isSlideMode` claim by reading its exact definition before
writing the copy that states it — not by opening the dialog on screen.

---

## 4e. Phase 8 — Evaluation with Real Learners (not executable; one analytics event shipped)

**Goal.** Find out whether any of Phases 1–7 actually helped, from the people they're
for. This phase is categorically different from every one before it: it isn't
implementation work, and most of it cannot be done by an autonomous coding session at
all, regardless of scope reduction.

| Workstream | Status | Why |
|---|---|---|
| Expert heuristic review ([01 §10](01-LEARNING-STANDARDS.md)) | ❌ Cannot be done by this session | Must be done "by someone who did not build it" ([09 §7](09-MEASUREMENT-PLAN.md)) — this session is the implementer for Phases 1–7 |
| AT testing (NVDA/VoiceOver/TalkBack) | ❌ Cannot be done by this session | Needs real screen-reader hardware/software; also blocked by no live server since Phase 5 |
| Learner testing (5–8 per condition) | ❌ Cannot be done by this session | Needs real recruitment, consent, compensation, a moderator |
| Quantitative baseline comparison | ❌ **Permanently impossible in the form specified** | [09 §5](09-MEASUREMENT-PLAN.md) requires the baseline captured before Phase 1; Phase 0 never ran, Phases 1–7 already shipped |
| Educator testing | ❌ Not attempted | Needs a real educator |
| Instrumentation (`preset_applied`) | ✅ Shipped | `adaptive-engine.ts`, `AccessibilitySettingsModal.tsx` |

### Why this phase was handled differently

Every prior phase (4–7) had a code-shaped core that could be reduced to a safely
verifiable slice. Phase 8's core is people: an independent reviewer, real learners, real
AT devices. There is no smaller version of "watch a disabled learner attempt a task" that
a coding session can approximate — attempting to substitute a self-review for the expert
review, or a code trace for a screen-reader pass, would produce something that looks like
Phase 8 completion but isn't, exactly the kind of overclaiming Phase 1 of this whole
program exists to eliminate. **The user was asked directly** rather than this being
assumed or silently skipped — see [00's Phase 8 status note](00-PROGRAM-PLAN.md) for the
options offered and the direction chosen: ship the one piece that was genuinely codeable
(instrumentation), document the rest as blocked on human resources, then continue.

### What shipped

One event from [09 §3.1](09-MEASUREMENT-PLAN.md), `preset_applied` — a new
`trackSettingsEvent()` function in `adaptive-engine.ts`, structurally identical to the
existing `trackAdaptation()` (same table, same swallowed-failure discipline, same
fire-and-forget call style), called from `AccessibilitySettingsModal.tsx`'s
`handleApplyPreset` — which, since Phase 7, only runs on a *confirmed* apply through
`PresetDetailsDialog`, so every recorded event was previewed first. The underlying
`adaptive_interactions` table has no structured-properties column, so which preset was
applied is encoded directly in the event string (`preset_applied:dyslexia`) rather than
a real payload field — a schema migration wasn't attempted with no live database to
verify it against.

**Why this doesn't retroactively fix the baseline problem:** data collected from this
point forward can still answer *some* future questions (e.g. "did preset_applied counts
change after some future settings-panel redesign"), but it cannot answer the specific
question [09](09-MEASUREMENT-PLAN.md) was built to ask — whether Phases 1–7 already
helped, compared to before they existed. That comparison has no data on the "before"
side and never will.

### Deliberately not attempted, alongside it

- **`setting_changed`** — would need a paired call at every one of
  `AccessibilitySettingsModal.tsx`'s roughly 28 `onChange` handlers, several of them
  sliders firing rapidly enough to need debouncing. Too wide a change to make safely
  without a live server to confirm it behaves and doesn't flood the table.
- **`preset_abandoned`** — a metric *derived* from a sequence of `preset_applied` events
  over time (applied, still active or not 24h later), not something a single client
  call can honestly fire in the moment. Needs a query or dashboard, not another
  instrumentation call.
- **`disabled_control_activated`** — native `disabled` buttons never fire click events,
  so tracking attempted presses on `StepByStepGuidance.tsx`'s disabled Next (fixed in
  Phase 5) needs an architecture change to an already-shipped, already-verified control.
  Not worth risking blind for one analytics beacon.
- **Everything else in [09-MEASUREMENT-PLAN.md](09-MEASUREMENT-PLAN.md)** — baseline
  capture, the learner research protocol, expert/technical evaluation, reporting. All
  need human resources this session doesn't have.

### Verification

Type-check clean. ESLint: `adaptive-engine.ts` 0 problems; `AccessibilitySettingsModal.tsx`
0 errors, the same 2 pre-existing warnings carried since Phase 7 (confirmed unchanged).
The resolver's 18 unit tests still pass. **The database insert itself is unverified
against a live Supabase instance** — the row shape matches `database.types.ts` and
mirrors `trackAdaptation()`'s already-working pattern exactly, but whether RLS policies
or constraints on `adaptive_interactions` actually accept this row was not, and could
not be, confirmed this session. Treat it as "should work by code reading," the same
caveat as every phase since live testing became unavailable — but with one additional
layer of uncertainty this specific change carries that earlier UI-only changes didn't:
it's the first change this program has made that writes to the database rather than
only rendering differently.

---

## 4f. Phase 9 — Governance & Handover (catalog, checklist, statement — no CI/ownership)

**Goal.** Stop the drift this whole program exists to fix from starting again the
moment it's handed off. [10-GOVERNANCE-RUNBOOK.md](10-GOVERNANCE-RUNBOOK.md) names four
pieces: the runbook itself (already written, Phase 0), a PR checklist, merge-blocking
CI, ownership + a quarterly audit, and a published accessibility statement.

| Item | Status | File(s) |
|---|---|---|
| `SETTING_CATALOG` (invariant #1) | ✅ Done — and consumed, not just written | `accessibility-catalog.ts` (new), `PresetDetailsDialog.tsx` |
| Catalog completeness check | ✅ Done, runs (234/234) | `check-setting-catalog.ts` (new), `package.json` |
| PR template | ✅ Done | `.github/pull_request_template.md` (new) |
| Accessibility statement | ✅ Done, published | `src/app/accessibility-statement/page.tsx` (new), `Footer.tsx` |
| Decision records | ✅ Backfilled for this session's deviations | `00-PROGRAM-PLAN.md` §3.1 |
| Merge-blocking CI (9 of 10 §7 gates) | ❌ Not attempted | — |
| Named accessibility owner | ❌ Not attempted | — |
| Scheduled quarterly audit | ❌ Not attempted | — |

### What shipped

**`SETTING_CATALOG`** — referenced as "not started since Phase 2 item 2.1" in every
phase's status note up to this one. 21 real, currently learner-facing settings, each
with `label`/`group`/`plain`/`why`/`source`/`helps`, sourced from
[02 §9](02-SETTINGS-REFERENCE.md)'s already-written copy table where one existed, rather
than inventing new UI text that could drift from it. A `CATALOG_EXCLUDED_KEYS` map
documents, with a one-line reason each, the fields deliberately left out — legacy
write-only mirrors (`preferred_font_size`, `preferred_font`, …), derived values
(`chunked_content_mode`, `high_contrast`), and profile bookkeeping (`active_preset`,
`disability_type`, …). That exclusion list is what makes the completeness check below
actually mean something, instead of just being a promise nobody checks.

**Truthfulness carried into the catalog itself.** `muted_colors` and
`keyboard_navigation_enabled` — both known-broken (Phase 1 item 8 deferred, and
[02 §4.6](02-SETTINGS-REFERENCE.md) respectively) — got a `knownGap` field stating what
the code *actually* does today, instead of `plain`/`why` copy describing what a finished
version should do. A catalog entry that oversold a broken setting would recreate the
exact defect class Phase 1 of this whole program exists to remove, one layer up — in the
data that's supposed to prevent inert controls, rather than in the CSS that caused one.

**Wired into a real consumer, not left inert.** `PresetDetailsDialog.tsx` (Phase 7) had
its own hardcoded label map because no catalog existed yet when it was built. That map
is gone; the dialog now reads `SETTING_CATALOG[key].label` directly. Two fields
`getPresetDiff()` can still surface aren't catalogued by design (`chunked_content_mode`,
`high_contrast` — both derived, see the exclusion list) — a small two-entry
`EXTRA_LABELS` fallback in the dialog covers just those, so a diff row never falls back
to a raw field name.

**Completeness check, and it actually runs.** `npm run test:a11y-catalog` — 234
assertions: every `AccessibilitySettingsData` field is either catalogued or has a
documented exclusion; every catalog entry has its required fields; every entry's `key`
matches its own object key. 0 failures. This is the one Phase 9 verification this
session could run *for real*, not just trace by reading — no live browser needed.

**PR template.** `.github/pull_request_template.md` — [10 §6](10-GOVERNANCE-RUNBOOK.md)'s
exact checklist, scoped by an HTML comment to PRs touching accessibility-relevant paths
(GitHub has no native path-conditional templates without a bot). Cannot be verified
actually rendering on a real PR — that needs a GitHub-hosted repo and an opened PR,
neither available this session.

**Accessibility statement, published.** `/accessibility-statement`, linked from the site
footer next to Privacy/Terms. Contains exactly what [10 §11](10-GOVERNANCE-RUNBOOK.md)
requires: the conformance target (WCAG 2.2 AA + four AAA criteria, per D1), what's
supported, known gaps stated honestly (leading with the interactive-activity keyboard
gap — the single most severe one), a report-a-barrier link (reuses the existing
`/contact?category=accessibility` route), and a review date. Says "targets," never
"conforms to" — no independent audit has run, and Phase 8 already established no AT
testing has happened at all. The response-time commitment is an explicit placeholder,
not an invented number.

**Decision records, backfilled.** [00 §3.1](00-PROGRAM-PLAN.md) — five records in the
runbook's exact format (date, decision, options considered, rationale, what would
change it) covering the real deviations made across Phases 1–9: the guided-mode
precondition swap, the quiz timer's "soft" reading, the two-button preset dialog, the
catalog's group taxonomy choice, and `muted_colors` staying broken. Marked
provisional — decided by this session's implementer, not a named accessibility owner,
because §8 below still has no name in it.

### Reduced from spec, deliberately — and why

- **9 of 10 [10 §7](10-GOVERNANCE-RUNBOOK.md) CI gates — not attempted.** Resolver
  correctness beyond the existing unit tests, static/runtime a11y (`eslint-plugin-jsx-a11y`,
  axe via Playwright), the contrast matrix, measure assertions, focus-order snapshots,
  a motion grep, an i18n script, and a performance budget — most need a running page to
  test against. No live server has been reachable since Phase 5. Shipping a CI config
  that has never actually executed risks either silently passing without checking
  anything, or blocking every future PR on a broken pipeline — worse than not having it.
- **Named accessibility owner, scheduled quarterly audit — not attempted.** Real
  organisational decisions (who, and a committed cadence) outside this session's
  authority to make on the user's behalf. Left as explicit placeholders rather than
  invented.
- **Onboarding's separate `PresetCard` trigger — still not wired to the details
  dialog.** Carried over unresolved from Phase 7; unrelated to this phase's scope.

### Verification

Type-check clean. ESLint: 0 errors across every file touched this phase; the 2 warnings
on `AccessibilitySettingsModal.tsx` are the same 2 carried since Phase 7, confirmed
unchanged by this phase's edits. The resolver's 18 tests and the new catalog script's
234 assertions both pass — the catalog check is the first Phase 9 item verified by
actually running it, not just tracing it. **No live verification of the statement page
or footer link was possible** — same environment block as every phase since 5,
reconfirmed immediately before writing this note. This phase's new public route
(`/accessibility-statement`) has never been loaded in a browser at all; treat it with
the same "should work by code reading" caveat as everything else shipped this session,
one notch more cautious than most since nothing about it has been exercised even
indirectly through an existing, working code path the way most other phases' changes
were.

---

## 5. Phases 4–9 — What's still outstanding in each

Every phase from 4 onward now has at least a reduced-scope status: Phase 4 is partial
(see [§4a](#4a-phase-4--adhd-the-runway-partial--nowbar-only)), Phase 5 is reduced-scope
(see [§4b](#4b-phase-5--autism-the-itinerary--guided-run-reduced-scope)), Phase 6 is the
assessment workstream only (see [§4c](#4c-phase-6--content-authoring--assessment-assessment-workstream-only)),
Phase 7 is the Preset Details dialog only (see
[§4d](#4d-phase-7--transparency-onboarding--composition-preset-details-dialog-only)),
Phase 8 shipped one instrumentation event and nothing else it's structurally able to do
(see [§4e](#4e-phase-8--evaluation-with-real-learners-not-executable-one-analytics-event-shipped)),
and Phase 9 shipped the catalog, checklist, and statement but not CI or ownership (see
[§4f](#4f-phase-9--governance--handover-catalog-checklist-statement--no-ciownership)).
Their rows here are kept for the workstreams still untouched in each. Listed so you know
what's still exactly as it was — including known bugs earlier phases didn't touch.

| Phase | What it would build | Known bugs still live because this phase hasn't run |
|---|---|---|
| **4 — ADHD "Runway"** *(partial, see §4a)* | Dashboard sharpening, time-based chunking, interruption discipline, collapsed nav rail — `NowBar` itself is done | The dashboard, chunking, and interruption-discipline pieces are all still exactly as before. |
| **5 — Autism "Itinerary" + Guided Run** *(reduced scope, see §4b)* | Transition interstitials, expectation cards, focus management, `aria-live` policy, literal-language layer, escape-space switch — the core guided-mode bug and the Itinerary panel are done | `muted_colors` still desaturates status colours; `animation_level` still inert under Autism; no screen-reader walkthrough has been done on the fixed guided flow. |
| **6 — Content, authoring, assessment** *(assessment + activity keyboard ops, reduced scope, see §4c)* | Runtime resilience, authoring aids, Easy-Read pipeline, educator surfaces, catalogue backfill, generic `ACTIVITY_ACCESSIBILITY` wiring — the quiz-timing/presentation defects and interactive-activity keyboard operability are both done | Diagram/matching-mode drag-drop still has no dropdown alternative. Nothing in this phase has been confirmed with a real keyboard-only pass or screen reader. |
| **7 — Transparency, onboarding, composition** *(Preset Details dialog only, reduced scope, see §4d)* | Onboarding's own Preset Details trigger, barrier-based onboarding, preset composition (Dyslexia + ADHD together), migration consent, age adaptation, panic switch — the settings-modal Preset Details dialog is done | Onboarding still asks for a diagnosis rather than barriers. A learner can only pick **one** preset. **Also found:** onboarding has its own separate, duplicated `chunkedContentMode` bug — never writes `layout_mode` at all (safety-netted by the Phase 2 resolver at read time, but the onboarding UI itself is unfixed). |
| **8 — Evaluation with real learners** *(not executable by this session, see §4e)* | Expert review, AT testing, learner usability testing, baseline metrics, educator testing — one instrumentation event (`preset_applied`) is done | No evidence any of Phases 1–7 actually helps a real learner — everything above is verified by code reading only, and the quantitative baseline this phase would compare against was never captured and now never can be. |
| **9 — Governance & handover** *(catalog/checklist/statement only, see §4f)* | 9 of 10 merge-blocking CI gates, a named accessibility owner, a scheduled quarterly audit | Nothing mechanically stops a future PR from reintroducing the exact bugs Phase 1 fixed — the PR template asks a human to check, but no CI enforces it. |

---

## 6. Master smoke-test script

One pass, ~15 minutes, touching everything shipped so far. Do this before anything more targeted.

1. **Sign in as a learner.** Open Settings.
2. **Default preset:** confirm dashboard shows Welcome + stat grid + 3-card recommendations + multi-column course grid (unchanged baseline).
3. **Apply Dyslexia preset** via the preset chips.
   - Dashboard should switch to single-column layout with one recommendation card.
   - Open a lesson. Confirm: cream background, wider spacing, the `ReadingToolbar` appears below the header, no audio starts automatically.
   - Drag Font Size and Word Spacing sliders in Settings — lesson text should visibly change both times.
   - Press Listen in the toolbar — speech should start. Click a lower paragraph while it's playing — speech should jump there.
   - Turn on Distraction-Free Mode — sidebar/topbar should hide, but the text column should **not** widen to fill the screen.
4. **Apply ADHD preset.**
   - Reopen Settings → Focus tab. Layout Mode should show "One Section at a Time" selected (not blank/wrong).
   - Toggle any unrelated setting (e.g. Captions). Reopen a multi-section lesson — chunking should still be active (this is the Phase 1 `base_preset` fix).
   - Open a lesson. A sticky bar should now be visible at the very top ("NOW · Read section..."), with a back button, progress bar, save indicator, and a tasks count — this is the Phase 4 `NowBar`, and it should be the **only** header (no separate lesson-title header above it).
   - Press the tasks button — Task Checklist and Progress Timeline should expand and be visible. **Before Phase 4, these were completely inaccessible** under this preset — not just hard to find, structurally hidden.
   - *(Still not addressed)* Dashboard density, time-based chunking, and interruption discipline are all Phase 4 items not yet built.
5. **Apply Autism preset.**
   - Open two different lessons in two different courses — reading column width should match.
   - Open a lesson. An Itinerary panel should appear at the very top, above everything else, listing every phase (video/content/activity/quiz as applicable) with done-state — this is the Phase 5 Itinerary. It should **not** appear below the lesson content anymore.
   - Turn on Step-by-Step Guidance (Accessibility Settings → Focus tab) on a lesson with only one `<h2>` heading (or none). A guided wizard card should appear **and actually gate the page** — only the current phase's section visible, "Previous phase / Next phase" navigation at the bottom. **Before Phase 5, the wizard card rendered here but did nothing** — every phase was visible at once regardless.
   - With Step-by-Step Guidance on, try to advance past an incomplete step (e.g. before scrolling/marking content read). The Next button should be disabled **and show a line of text explaining what to finish** — before Phase 5 it just greyed out with no explanation.
   - *(Expected still-broken, Phase 1 item 8 deferred)* Inspect a status-colored element (e.g. red error text) — it will be desaturated by the `muted_colors` filter along with everything else.
6. **Quiz, under any accessibility preset (Dyslexia/ADHD/Autism), on a quiz with an educator-set time limit.**
   - Start the quiz. An expectation panel ("This quiz contains N questions...") should appear on the start screen — before Phase 6 this only appeared under the Autism preset specifically.
   - The quiz should show **one question per screen** regardless of whatever the lesson's own Layout Mode setting is — this matters most under Autism, whose lesson layout defaults to "Scroll", which previously produced an all-questions-on-one-page quiz.
   - A "Read question aloud" speaker icon should appear next to the question text — before Phase 6 this only appeared when TTS was separately enabled in Settings, and only in the one-question view.
   - Let the timer count down to 25% of the original limit — a banner should appear offering "Add more time," not a silent countdown.
   - Let the timer reach zero — a dialog should appear ("Time's up") offering Extend / Submit now, **not** an automatic silent submission. The countdown badge itself should stay plain (gray), never pulsing red, at any point.
6b. **Every interactive activity, keyboard only, no mouse.** Open a drag-drop activity (categories mode): `Tab` should reach each unplaced item and each category zone; `Space` picks an item up, arrow keys move it, `Space` again drops it, `Esc` cancels — or use the `<select>` next to each unplaced item to assign a category directly, no drag required. Open a fill-blanks activity: `Tab` should reach every blank in reading order; a screen reader (or the accessibility tree in devtools) should read each one as "Blank N of M," not just "textbox." Open a flashcard activity: `Tab` to a card, `Enter`/`Space` flips it; only the currently-visible face should be exposed to the accessibility tree (check `aria-hidden` toggles in devtools). Open a memory game: `Tab` reaches every card in order, each with a name like "Card 3 of 12, face down." Open a timeline/sorting activity: `Tab` reaches each event, `Space` picks up, arrows reorder, `Space` drops. **None of this has been tried with a real keyboard or screen reader this session** — verify it for real if you have a live environment; that's the single highest-value check left in this whole document.
7. **Default preset, same quiz.** Confirm nothing above changed: the expectation panel only shows if the educator's own `structure_mode`/checklist setting is on, one-question-per-screen still follows the lesson's own layout setting, and the countdown still pulses red and auto-submits at zero exactly as before — Phase 6 deliberately left the no-preset experience untouched.
8. **Open Settings and click any preset chip** (Dyslexia, ADHD, Autism, or Default). A dialog should open — **the preset should not apply yet.** It should show the preset's name, goal, a short "what this turns on" list, and a "Changes from your current settings" list with the specific field-by-field before/after (e.g. "Font size: 16px → 19px"). For ADHD or Autism specifically, it should also note that Slide view becomes unavailable. Press **Cancel** — nothing should change, the chip should not become selected. Reopen and click the same chip, then press **Apply preset** — only now should the preset actually apply (visible immediately, same as any other setting change), and the chip should show as selected. **Before Phase 7, clicking a chip applied it instantly with no description or way to back out.**
9. **Confirm the Phase 8 analytics call, via Supabase's table editor or logs, not the UI** — there's nothing to see on screen for this one. After step 8's "Apply preset" click, a new row should appear in `adaptive_interactions` with `adaptation_used` starting `preset_applied:` (e.g. `preset_applied:dyslexia`) and `lesson_id`/`course_id` both `null`. This is the one part of this smoke test that needs direct database access rather than the running app — everything else in this document is UI-only by design.
10. **Open `/accessibility-statement`** (linked from the site footer under "Legal", next to Privacy Policy and Terms of Service). Should show a conformance target ("targets WCAG 2.2 AA," not "conforms to"), a list of what's supported, a list of known gaps led by the interactive-activity keyboard gap, a "Report a barrier" button linking to `/contact?category=accessibility`, and a review date. **This route has never been loaded in a browser this session** — it is the single highest-value thing to check first if you get a working dev server, since everything else in this checklist has at least been traced against working code paths and this hasn't been exercised at all.
11. **Run `npm run test:a11y-catalog`** — expect 234/234 passing. This is Phase 9's catalog-completeness gate.
12. **Run `npm run test:a11y-resolver`** — expect 18/18 passing.
13. **Run `npx tsc --noEmit`** — expect no output (clean).

---

## 7. Found but deliberately not fixed

Real defects/gaps discovered while implementing, left alone on purpose — with the reason, so they read as documented decisions, not oversights.

| Finding | Where | Why left alone |
|---|---|---|
| `muted_colors` still uses a global `filter: saturate(0.6)` on `<html>`, desaturating status colours (errors, success) along with everything else | `globals.css` | A correct token-level fix requires converting dozens of literal Tailwind color utility classes (`bg-red-50`, `text-green-600`, etc.) into a form a filter can exempt — larger and riskier than any single-session change without live visual verification. |
| Onboarding wizard has its own independent `chunkedContentMode` switch and never writes `layout_mode` at all | `src/app/learner/onboarding/page.tsx` | Full onboarding redesign is Phase 7 scope. The Phase 2 resolver already normalizes whatever inconsistent data this produces the next time settings are read, so it's not user-visible today — but the onboarding UI itself still has the same defect class Phase 2 fixed elsewhere. |
| `MyCoursesSection`'s `singleColumn` prop removes the grid but keeps the banner+badge card shape — not the compact "list row" doc 04 §4.2 describes | `MyCoursesSection.tsx` | A true list-row redesign is a separate, larger visual change; this session shipped the density fix (1 column) without the row-format redesign. |
| `resolveSettings()` computes conflict explanations that nothing displays yet | `AccessibilityProvider.tsx` context (`settingsConflicts`) | The inline-notice UI that would consume this is Phase 5/7 scope (the settings panel redesign). The data is live and correct now; the UI to show it doesn't exist yet — still true after Phase 5, which touched the lesson page, not the settings modal. |
| "Read from here" only works by mouse/touch click, not keyboard | `ReadingSpotlight.tsx` | Making arbitrary `dangerouslySetInnerHTML` blocks keyboard-focusable and operable is real a11y surface area (tabindex, roving focus, ARIA) that belongs with the broader focus-management work in doc 06, not bolted on here. |
| `ReadingToolbar` is not sticky | `ReadingToolbar.tsx` | The page header's height changes on scroll (`isScrolled` state) and pinning at a wrong offset would visibly overlap it — couldn't verify the correct offset without a live browser. |
| Sentence-level TTS highlighting not built; "read from here" is paragraph-level | `LessonViewPage.tsx`, `ReadingSpotlight.tsx` | Web Speech API's `onboundary` event support and accuracy varies significantly by browser; shipping it unverified risked a broken/inconsistent experience across browsers. |
| Pre-existing lint error `Cannot access refs during render` in `ReadingSpotlight.tsx:46` | `ReadingSpotlight.tsx` | Confirmed present in the file *before* this session touched it at all (verified against the original file read). Not introduced by this work; fixing ref-timing in a component now depended on by three new features felt like the wrong moment to also change its internal update model without live testing. |
| `VisualSchedule` accepts a `totalMinutes` prop for its intro line, but nothing passes one | `LessonViewPage.tsx`, `VisualSchedule.tsx` | The codebase only tracks a real duration estimate for the content phase (`readTime.minutes`); video/activity/quiz phases have no tracked duration. Fabricating a total would be exactly the kind of overclaiming Phase 1 exists to remove — left as an honest gap (no intro line renders) rather than a made-up number. |
| Itinerary panel doesn't collapse to a one-line summary once the lesson is underway | `VisualSchedule.tsx`, rendered at `LessonViewPage.tsx:1660` | [03 §5.1](03-PRESET-REDESIGN-PLAN.md) specifies this; only the full pre-lesson panel is built. Collapse state needs a decision about *when* "underway" starts (first scroll? first phase advance?) that wasn't safe to guess without seeing it live. |
| Guided-mode fix not verified with a screen reader | `LessonViewPage.tsx`, `StepByStepGuidance.tsx` | No live server was reachable this session (see the top of this document — a second `next dev` instance in the same directory is refused outright, not just blocked by the port). The fix is verified by tracing every `guidedMode` read against the new definition (documented in §4b), not by an NVDA/VoiceOver pass, which [00's Phase 5 exit criteria](00-PROGRAM-PLAN.md) require before calling this done. |
| Quiz timer softening chose the narrower "displayed but not enforced" reading of [07 §3](07-ASSESSMENT-POLICY.md) rather than hiding the educator's timer outright | `QuizPage.tsx` | [07 §3](07-ASSESSMENT-POLICY.md)'s heading says "no time limit, for every learner" but its own body says "time limits become soft: displayed, never enforced" — the two aren't quite the same. Hiding a value an educator configured is a bigger, more debatable product-policy call than a single session should make unilaterally; the softer reading fixes every *punitive* effect (auto-submit, visual alarm) without deciding that question. |
| Per-option read-aloud not built; only the question stem has it | `QuizPage.tsx` | Each option is one `<button>` spanning the full row. A nested `<button>` inside it for read-aloud is invalid HTML and corrupts the accessible name for screen readers — building it correctly means restructuring options to `<div role="radio">` + separate control, real keyboard/ARIA surface area that needs the same live verification the interactive-activity work below does. |
| Diagram/matching-mode drag-drop has no dropdown alternative, and no interactive activity has been confirmed keyboard-operable with a real keyboard or screen reader | `src/components/interactive/*Viewer.tsx` | Categories-mode drag-drop and all other four viewers now have a keyboard path by code tracing (see the Phase 6 addendum, §4c) — arbitrary x/y diagram zones over an image don't map onto a dropdown as cleanly as named categories do, so that one mode still relies on `KeyboardSensor` alone. Nothing has been exercised with NVDA/VoiceOver/TalkBack — no live server has been reachable at any point in this program. |
| `AccessibilitySettingsModal.tsx`'s field labels ("Font Family", "Word Spacing", "Layout Mode", "Reading Spotlight", etc.) are hardcoded English, never routed through `useTranslation()` — and the new `PresetDetailsDialog.tsx` matches that, rather than translating only itself | `AccessibilitySettingsModal.tsx`, `PresetDetailsDialog.tsx` | Pre-existing across every phase to date, not introduced this session — found while building the details dialog, which needed labels for the same ~20 fields the modal's tabs already label in English. Translating only the new dialog while the identical field name sits in English one panel over would be a more confusing, inconsistent experience than leaving both as they were. The real fix is an `en`/`ms` pass across the whole modal, which is bigger than a dialog-sized patch and wasn't attempted. |
| `PresetDetailsDialog` only covers trigger point 1 of 3 named in [03 §8.1](03-PRESET-REDESIGN-PLAN.md) | `AccessibilitySettingsModal.tsx` | Trigger point 2 (onboarding's `PresetCard`) is a separate flow with its own pre-existing bugs; trigger point 3 (a persistent "What does this preset do?" link) doesn't exist anywhere yet. Both are straightforward extensions of the same dialog once built, but were left for a session that also touches onboarding, to keep this phase's diff contained to one flow. |
| Phase 0's baseline was never captured, so Phase 8's before/after comparison is now permanently impossible in the form [09-MEASUREMENT-PLAN.md](09-MEASUREMENT-PLAN.md) specifies | — | Not something this session introduced or could retroactively fix — Phase 0 was skipped before this session began, and Phases 1–7 have since shipped. Recorded here rather than glossed over, per [09 §1](09-MEASUREMENT-PLAN.md)'s own "Compensation for time. Unpaid disability consultation is extraction" ethic extended to data: an unfalsifiable "before/after" claim would be worse than an honestly stated gap. |
| `trackSettingsEvent()`'s database insert is unverified against a live Supabase instance | `adaptive-engine.ts` | No live server was reachable this session (same block as Phases 5–7). The row shape matches `database.types.ts` and mirrors the already-working `trackAdaptation()` pattern exactly, but whether RLS policies on `adaptive_interactions` accept it has not been confirmed — the first change in this program to write to the database rather than only render differently, so this caveat carries slightly more risk than prior "should work by code reading" notes. |
| `SETTING_CATALOG` is not wired into a settings-panel redesign — [05 §4](05-CUSTOMIZATION-UX.md)'s per-row `plain`/`why`/diff-marker UI still doesn't exist | `AccessibilitySettingsModal.tsx` | That's a much larger UI change (the two-pane layout, search, per-row conflict notices) needing live verification this session doesn't have. The catalog itself is real and consumed (`PresetDetailsDialog.tsx`'s labels read from it) — it just has one consumer instead of the several §4 envisions. |
| 9 of 10 [10 §7](10-GOVERNANCE-RUNBOOK.md) CI gates were not attempted; nothing mechanically enforces the PR checklist | `.github/pull_request_template.md` | Most gates need a running page to test against (Playwright, axe, contrast computed from rendered colours) — no live server has been reachable since Phase 5. Shipping a CI config that's never actually run risks silently passing without checking anything, or blocking every future PR on a broken pipeline. The PR template exists and asks a human to self-check; nothing yet blocks a PR that doesn't. |
| No accessibility owner is named; no quarterly audit is scheduled | — | Real organisational decisions (who, and a committed cadence) that this session has no authority to make on the user's behalf. Left as explicit placeholders on the published statement page and in the runbook rather than invented. |
| `/accessibility-statement` has never been loaded in a browser | `src/app/accessibility-statement/page.tsx` | Same live-server block as everything else since Phase 5 — but this is the first *new public route* shipped this session, as opposed to a change to an existing, already-partly-exercised code path, so it carries one additional notch of unverified risk relative to most of this document's other entries. |

---

## 8. Full file manifest (for your own `git diff` review)

| File | Phases touched | What changed |
|---|---|---|
| `src/app/globals.css` | 1, 2, 3 | Spacing fixes, contrast filter removal, Soft Backgrounds scoping, spotlight blur removal, `--content-measure`/`.content-column`, Dyslexia typography, seekable cursor |
| `src/providers/AccessibilityProvider.tsx` | 1, 2 | Word-spacing scale, `data-low-contrast` removal, resolver wiring, `settingsConflicts` |
| `src/lib/adaptive-engine.ts` | 1, 8 | `base_preset` resolver fix, preset default value corrections (1); `trackSettingsEvent()` + `preset_applied` event (8) |
| `src/lib/accessibility-resolver.ts` | 2 | **New file** — `resolveSettings()` |
| `scripts/test-accessibility-resolver.ts` | 2 | **New file** — 18 unit tests |
| `src/lib/accessibility-catalog.ts` | 9 | **New file** — `SETTING_CATALOG`, `CATALOG_EXCLUDED_KEYS`, 21 catalogued settings |
| `scripts/check-setting-catalog.ts` | 9 | **New file** — 234-assertion catalog completeness check |
| `.github/pull_request_template.md` | 9 | **New file** — the [10 §6](10-GOVERNANCE-RUNBOOK.md) checklist |
| `src/app/accessibility-statement/page.tsx` | 9 | **New file** — public conformance/gaps/contact page |
| `src/components/figma/Footer.tsx` | 9 | Added the accessibility statement link |
| `package.json` | 2, 9 | Added `test:a11y-resolver` script (2); added `test:a11y-catalog` script (9) |
| `src/components/courses/LessonViewPage.tsx` | 1, 2, 3, 4, 5 | TTS autoplay removal, legacy enum removal, `simplifiedMode` fix, `.content-column` wiring, chunk time labels, "read from here", `ReadingToolbar` integration, `NowBar` integration + derived props, guided-mode gate fix, Itinerary promoted to top of page |
| `src/components/courses/QuizPage.tsx` | 2, 6 | `.content-column` distraction-free fix (2); preset-gated countdown/auto-submit softening, one-question-per-screen decoupling, expectation panel promotion, read-aloud availability (6) |
| `src/components/interactive/DragDropViewer.tsx` | 6 | `KeyboardSensor` + `closestCenter` added; two mouse-only removal `<div>`s converted to `<button>`s; categories-mode `<select>` alternative; polite live-region announcements; fixed a pre-existing `any`-typed prop + unused var |
| `src/components/interactive/FillBlanksViewer.tsx` | 6 | `aria-label="Blank N of M"`, `aria-invalid`, `aria-describedby` on every blank |
| `src/components/interactive/MemoryGameViewer.tsx` | 6 | Position-aware `aria-label` ("Card N of Total, face down/up/matched") on every card |
| `src/components/interactive/FlashcardViewer.tsx` | 6 | `aria-hidden` toggle on each card face — fixes a screen reader reading both sides at once |
| `src/components/interactive/TimelineViewer.tsx` | 6 | Position-aware `aria-label` ("Event N of Total") on sortable items |
| `src/components/learner/AccessibilitySettingsModal.tsx` | 2, 7, 8 | Three-way Layout Mode control, removed separate chunked switch (2); preset chips stage `PresetDetailsDialog` instead of applying instantly, `currentLocalSettings` extracted + memoized (7); `trackSettingsEvent('preset_applied', ...)` call in `handleApplyPreset` (8) |
| `src/components/accessibility/ReadingSpotlight.tsx` | 1, 3 | Blur removal, short-chunk suppression, `onBlockActivate`/`readAloudActive` |
| `src/components/accessibility/ReadingToolbar.tsx` | 3 | **New file** |
| `src/app/learner/page.tsx` | 3 | Dyslexia dashboard branch, dead conditional cleanup |
| `src/components/learner/AdaptiveRecommendations.tsx` | 3 | Added optional `maxItems`/`singleColumn` props |
| `src/components/learner/MyCoursesSection.tsx` | 3 | Added optional `singleColumn` prop |
| `src/components/accessibility/NowBar.tsx` | 4 | **New file** |
| `src/components/accessibility/StepByStepGuidance.tsx` | 5 | Disabled-Next explanation text + `aria-describedby` |
| `src/components/accessibility/VisualSchedule.tsx` | 5 | `done` item state, optional `totalMinutes` intro line |
| `src/components/learner/Sidebar.tsx` | 5 | Stripped "Step N:" / "N.N" numbering from Autism nav labels |
| `src/components/accessibility/PresetDetailsDialog.tsx` | 7, 9 | Wraps `getPresetDiff()` and `ACCESSIBILITY_PRESETS` into a before/after confirmation dialog, **new file** (7); field labels switched from a hardcoded map to `SETTING_CATALOG` (9) |
| `src/locales/en.ts`, `src/locales/ms.ts` | 5, 6 | `accessibility.itineraryIntro`, `accessibility.done` (5); `quiz.lowTimeNotice`, `quiz.addMoreTime`, `quiz.timeUpTitle`, `quiz.timeUpDesc`, `quiz.submitNow` (6). Not touched in 7 or 9 — see §7's found-in-passing row on English-only settings-surface copy |
| `docs/accessibility/00-PROGRAM-PLAN.md` | 1, 2, 3, 4, 5, 6, 7, 8, 9 | Status notes per phase; §3.1 decision records added in Phase 9 |
| `docs/accessibility/02-SETTINGS-REFERENCE.md` | 1, 2 | Status notes |
| `docs/accessibility/03-PRESET-REDESIGN-PLAN.md` | 3, 5, 7 | Status notes |
| `docs/accessibility/05-CUSTOMIZATION-UX.md` | 7 | Status note, §2 problem table marked, §5/§10 annotated |
| `docs/accessibility/07-ASSESSMENT-POLICY.md` | 6 | Status note, §2 defect table marked, §10 acceptance criteria annotated |
| `docs/accessibility/09-MEASUREMENT-PLAN.md` | 8 | Status note, §2 addendum, §9 acceptance criteria annotated |
| `docs/accessibility/10-GOVERNANCE-RUNBOOK.md` | 9 | Status note, §12 acceptance criteria annotated |

**Not part of this session's changes** (pre-existing, uncommitted before this conversation started): `docs/README.md`, `src/components/interactive/InteractiveActivityViewer.tsx`, `src/lib/learner-api.ts` all show as modified in `git status` from before this session began — unrelated prior work, not touched further here. (`src/components/learner/Sidebar.tsx` was on this list before Phase 5, and `src/components/interactive/MemoryGameViewer.tsx` before the Phase 6 keyboard-operability addendum; each got one small, isolated edit — see the rows above — the rest of each file's pre-existing diff is still unrelated prior work.)

---

# 10. LIVE VERIFICATION — 2026-08-25

**This section supersedes every ✅ above.**

Everything in sections 2 through 4f was, by this document's own admission,
"correct by static analysis and code reading," not "confirmed working on
screen" — no live server was reachable at any point during Phases 1-9. That gap
is now closed. A learner portal audit and a follow-up hardening pass ran the
application against the live Supabase project, signed in as
`learner@acess.demo`, and exercised these features on real data.

Evidence: [`docs/learner-audit/01-FINDINGS.md`](../learner-audit/01-FINDINGS.md),
[`docs/learner-audit/02-REPORT.md`](../learner-audit/02-REPORT.md),
[`docs/learner-audit/03-REMEDIATION.md`](../learner-audit/03-REMEDIATION.md).

**Method note:** the browser pane never composited frames in this environment,
so no screenshots exist. Verification was done through the accessibility tree,
`getComputedStyle`, console, network and direct database reads — stricter than
visual inspection for everything except pure appearance. Nothing below is
marked verified on the strength of a screenshot.

| Feature | Previous claim | Live status | Evidence |
|---|---|---|---|
| **Preset: Dyslexia** | ✅ static | ✅ **Verified** | Applied live. `data-preset=dyslexia`, Atkinson Hyperlegible, 19px, line spacing 1.7, word spacing 0.16em, cream tint, reading spotlight on, TTS on — each checked against `ACCESSIBILITY_PRESETS.dyslexia` |
| **Preset: ADHD** | ⚠️ NowBar only | ✅ **Verified** | Applied live. Arial 18px, 1.6, 0.08em, grey tint, `structure-mode=minimal`, distraction-free genuinely removes sidebar **and** top bar, simplified 4-item menu confirmed present |
| **Preset: Autism** | ⚠️ reduced scope | ✅ **Verified** | Applied live. Pale blue tint, `animation-level=none`, muted colours, `structure-mode=checklist`, plain-language menu (Dashboard / Courses / Progress / Badges / Certificates / Settings) |
| **Preset preview dialog** | ✅ static | ✅ **Verified** | Lists all 11 changes with a rationale for each before applying. Works as designed |
| **Word spacing** | ✅ Phase 1 item 2 | ✅ **Fixed, then verified** | Was **broken in practice**: `html[data-font-type="dyslexia"] body` hard-coded `word-spacing: 0.12em !important`, overriding the learner's own slider — the exact failure mode Phase 1 item 1 claimed to have removed. Now 0.16em on dashboard, catalogue, progress, achievements and lesson |
| **Line spacing** | ✅ Phase 1 | ⚠️→✅ **Fixed** | Body-scoped rule alone never reached Tailwind-styled text. Content containers now listed explicitly; 1.7 confirmed |
| **Font size** | ✅ Phase 1 | ✅ **Verified** | Root scales to 19px and all rem-based text scales with it |
| **Background tints** | ✅ | ⚠️ **Partially verified** | Light tints reach cards and inner surfaces. The full-viewport shell (`div.flex.h-screen.bg-gray-50` in `LearnerShell`) does not pick them up |
| **TTS** | ✅ Phase 1 item 5 | ⚠️→✅ **Fixed** | Autoplay removal confirmed. But TTS **kept speaking after leaving the lesson**, with no stop control on the destination page — `speechSynthesis` is a global service not torn down on unmount. Fixed and verified. Still has no pause/resume, only play and stop |
| **Reading spotlight** | ✅ | ⚠️ **Partially verified** | `data-reading-spotlight=true` set and `.reading-spotlight-container` present on the lesson page. The visual dimming itself was not verifiable without screenshots |
| **Chunked content** | ✅ | ✅ **Verified** | `data-chunked=true` drives real pagination (Favourites paginates at 3/page under it). Note `layout_mode: 'scroll'` in the Autism preset is dead configuration — `handleApplyPreset` forces `chunked` whenever `chunked_content_mode` is true |
| **Focus / distraction-free** | ✅ | ✅ **Verified** | Genuinely removes sidebar and top bar; escapable via a labelled floating button. A real bug was found and fixed: the session override was **sticky**, so a learner who exited once and later chose ADHD or Autism got `distraction_free_mode: true` written to the database while the interface stayed in the old state |
| **Easy Read** | ✅ shipped | ❌→✅ **Was unreachable; now works** | The feature was implemented but **had never run**: it keys off `preferred_reading_level`, which only the profile dialog could set and no preset sets. Added a toggle to the accessibility panel. Testing then exposed a second bug — Exit cleared `simplified_ui` but not the reading level, so `applyReadingLevelDefaults()` turned Easy Read back on after a refresh. Both fixed and verified across a reload |
| **Settings persistence** | ✅ | ✅ **Verified** | Stored in `user_profiles.accessibility_prefs` (JSONB), mirrored to localStorage. Change → navigate → refresh → still applied, and written to the database |
| **Per-learner isolation** | ✅ | ✅ **Verified** | RLS confines `user_profiles` to the owner; a probe signed in as one learner read 0 rows of another's profile |
| **`SETTING_CATALOG` completeness** | ✅ 234/234 | ✅ **Still passes** | `npm run test:a11y-catalog` |
| **Keyboard operability of activities** | ✅ Phase 6 addendum | ❓ **Not verified** | Requires real keyboard/AT interaction the harness could not perform |
| **Screen-reader behaviour** | — | ❓ **Not verified** | No AT available in this environment |

## 10.1 Accessibility defects found by live testing that static analysis missed

1. **Word and letter spacing were overridden by a legacy `!important` rule** —
   the learner's own slider had no effect on `<body>`. Phase 1 item 1 removed
   one such override; this one survived in the `data-font-type` block.
2. **TTS survived navigation** with no way to stop it.
3. **The distraction-free override was sticky**, so presets that enable it
   silently did not.
4. **Easy Read had never been reachable at all.**
5. **Easy Read's Exit did not persist.**
6. **Navigation was not navigable** — every sidebar item was a `<button>` with
   no `href`, so a screen reader announced site navigation as "button" and no
   browser affordance (middle-click, open in new tab, copy link) worked. Now
   real links with `aria-current="page"`.
7. **The favourite toggle had no accessible name or state** — an icon-only
   button whose on/off state was carried purely by a fill colour. WCAG 4.1.2.
8. **The video requirement had no alternative path** — only the YouTube
   `ENDED` event could satisfy it, so a blocked or unplayable embed made the
   lesson permanently uncompletable.

## 10.2 What this means for the programme

Phase 1 was titled "Truthfulness — stop the product from lying: several
settings looked like they did something and didn't." Live testing found that
this was still true of **word spacing, line spacing and Easy Read** after
Phase 1 was marked complete. The lesson is not that the work was wrong; it is
that "correct by code reading" could not have caught any of the eight defects
above, because every one of them is a cascade, lifecycle or reachability
problem that only exists at runtime.

**Phase 0's baseline was never captured and still has not been.** Nothing here
is a measurement against real learners; it is verification that the controls do
what they claim. Phase 8's evaluation remains un-run.
