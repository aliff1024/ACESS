# Information Architecture & Display Specification

**What goes on each learner page, in what order, at what size, and how much of it at once — for every preset and every screen width.**

- **Scope:** learner surfaces only. Educator authoring is deferred to doc 11.
- **Depends on:** [01 §7](01-LEARNING-STANDARDS.md) (the token table), [03 §3](03-PRESET-REDESIGN-PLAN.md) (the three-zone model)
- **Unblocks:** Phases 3–5 of [00 §4](00-PROGRAM-PLAN.md)

---

## 1. The four display principles

Everything in this document derives from these. When a layout question is not answered
here, answer it with these.

### P1 — One decision per screen

A learner should never be asked to choose between two things of equal visual weight.
Exactly one element is the primary action; everything else is quieter than it. This is
COGA "Make Short Critical Paths" and it is the difference between a dashboard and a
runway.

**Test:** cover the page and ask someone "what do I do here?" If they need more than two
seconds, the page fails.

### P2 — Measure is sacred, width is not

The reading column never exceeds `--content-measure`. The *page* may be wide; the *text*
may not. Every current width bug traces to conflating the two — most visibly
`distraction_free_mode` setting `max-w-full` on both the lesson
([LessonViewPage.tsx:1115](../../src/components/courses/LessonViewPage.tsx:1115)) and the
quiz ([QuizPage.tsx:550](../../src/components/courses/QuizPage.tsx:550)).

### P3 — Density is a preset variable, not a breakpoint variable

How much fits on a screen is currently decided by viewport width alone — the course
grid goes to four columns at `xl`
([CourseListPage.tsx:449](../../src/components/courses/CourseListPage.tsx:449)) regardless
of who is looking at it. Four course cards across is a reasonable default and a
genuinely bad experience for someone with ADHD or dyslexia. **Density must be a function
of preset first, viewport second.**

### P4 — Structure is constant; content is what changes

Section order, names, and positions are identical on every page of the same type, on
every visit, under every preset. Presets change *emphasis, density, and what is
collapsed* — never the order of things. This is WCAG 3.2.3/3.2.4 and the whole basis of
the Autism preset.

**Corollary:** never remove a section because it is empty. Show it with an empty state
("This lesson has no video"). Removing it changes the structure between lessons, which
is the exact failure the Autism preset exists to prevent — and
[CourseDetailPage.tsx:480](../../src/components/courses/CourseDetailPage.tsx:480) currently
does this, hiding locked lessons entirely when chunked or slide mode is on.

---

## 2. The universal page skeleton

Every learner page resolves to the same five slots. Presets fill them differently; they
never reorder them.

```
┌──────────┬──────────────────────────────────────────────────┐
│          │  ① TOP BAR        identity, search, account      │
│          ├──────────────────────────────────────────────────┤
│  ⓪ NAV   │  ② ORIENTATION    where am I / what now  (sticky)│
│          ├──────────────────────────────────────────────────┤
│          │  ③ PRIMARY        the one thing this page is for │
│          │                   ── .content-column ──          │
│          ├──────────────────────────────────────────────────┤
│          │  ④ SECONDARY      supporting, collapsible        │
│          ├──────────────────────────────────────────────────┤
│          │  ⑤ CONTINUATION   what happens next              │
└──────────┴──────────────────────────────────────────────────┘
```

| Slot | Rule |
|---|---|
| ⓪ **Nav** | Never reorders. Never auto-hides. May collapse to a rail on request. |
| ① **Top bar** | Identity and account only. Never carries task state. |
| ② **Orientation** | Sticky. Preset-specific ([03 §3.2](03-PRESET-REDESIGN-PLAN.md)): Reading Toolbar / Now Bar / Itinerary. **Must survive focus mode and distraction-free mode.** |
| ③ **Primary** | Exactly one job. Measure-locked. The only slot allowed a high-salience action. |
| ④ **Secondary** | Collapsed by default under ADHD and Dyslexia; expanded and numbered under Autism. |
| ⑤ **Continuation** | Single forward action. Under Autism this is the transition notice. |

**Slot ② is the fix for the worst current bug.** Today the executive-function supports
render inside slot ③ *below* the content and are removed entirely when focus mode is on
([LessonViewPage.tsx:1984](../../src/components/courses/LessonViewPage.tsx:1984)), which is
how the ADHD preset ends up hiding its own checklist. Moving them to a sticky slot ②
that no mode can remove resolves it structurally.

---

## 3. Density system

### 3.1 Cards-per-viewport budget

The number of *peer choices* visible at once, at desktop width.

| Surface | Default | Dyslexia | ADHD | Autism |
|---|---|---|---|---|
| Dashboard primary | 3–4 sections | **1 card** | **1 card + collapsed rest** | numbered sections, 1 per row |
| Course grid | 4 columns | **1 column (list)** | **2 columns** | **2 columns, fixed** |
| Lesson sections visible | all | 1 chunk | 1 chunk | 1 step |
| Quiz questions visible | all | 1 | 1 | 1 |
| Stat tiles | 4 | **0** (moved to its own page) | **1 line of text** | 3, numbered |
| Nav items visible | 6 | 6, larger | 4 + 1 disclosure | 5, fixed order |

**Rationale.** COGA "Avoid Too Much Content"; ADHD decision cost ([01 §4.3](01-LEARNING-STANDARDS.md)); dyslexia reading fatigue ([01 §3.1](01-LEARNING-STANDARDS.md)).

### 3.2 Progressive disclosure rules

- **Collapse, never delete.** A collapsed section keeps a visible, labelled, counted trigger: `▸ More courses (4)`. Hiding without a trace destroys the mental model ([01 §4.3](01-LEARNING-STANDARDS.md), "reduce, don't hide").
- **One disclosure level.** No accordion inside an accordion.
- **Disclosure state persists** per learner per surface. Re-collapsing something the learner opened is a small betrayal that accumulates.
- **Never disclose on hover.** Press only — a hard requirement under Autism ([01 §5.3](01-LEARNING-STANDARDS.md)) and correct everywhere.

### 3.3 Vertical rhythm

`--block-rhythm` from [03 §3.1](03-PRESET-REDESIGN-PLAN.md): 3rem default, **4rem
Dyslexia**, 2rem ADHD, 3rem Autism. Applied between slots and between peer cards. The
current dashboard hardcodes `space-y-12` with a `space-y-16` special case for dyslexia
([learner/page.tsx:102](../../src/app/learner/page.tsx:102)) — replace with the token.

---

## 4. Page-by-page specification

### 4.1 Dashboard — `/learner`

**Purpose.** Answer one question: *what should I do now?*

**Current state.** ADHD and Autism have bespoke branches
([learner/page.tsx:20](../../src/app/learner/page.tsx:20), `:40`); Dyslexia and Default
share one, differing only by `space-y-16`. Default shows Welcome → Progress → Recommended
→ Courses, four full sections, `max-w-7xl`.

| Slot | Default | Dyslexia | ADHD | Autism |
|---|---|---|---|---|
| ② | breadcrumb | Reading Toolbar | **Now Bar** — "Continue: Photosynthesis, section 3 of 7" | — |
| ③ | Welcome + stats | **"Continue reading" card, one, full measure, with Listen** | **One recommendation, full width** | **1. Today's schedule** (numbered) |
| ④ | Progress, Recommended | **Your courses, vertical list, large type** | `▸ More courses (4)`, collapsed | **2. All courses**, **3. My progress** |
| ⑤ | Course list link | "Browse courses" | single primary button | "Go to step 2" |

**Changes required**

- Add a Dyslexia branch. Single column, one card per viewport, no stat tiles, no charts, a Listen affordance on every title.
- ADHD: drop the `ring-2 ring-primary bg-primary/10` wrapper around the recommendation ([learner/page.tsx:28](../../src/app/learner/page.tsx:28)) — decorative salience competing with the button inside it. The card *is* the emphasis.
- Move `ProgressOverview`'s four stat tiles ([ProgressOverview.tsx:72](../../src/components/learner/ProgressOverview.tsx:72)) off the dashboard for Dyslexia and ADHD; one sentence instead: "3 of 12 lessons done."
- Autism: numbered sections stay, but see §7 on the double-numbering conflict.
- The `chunked_content_mode` tab-view branch ([learner/page.tsx:81](../../src/app/learner/page.tsx:81)) turns the dashboard into four tabs — a *different information architecture* triggered by a lesson-reading setting. Remove it; chunking is a lesson concept, not a dashboard concept.

---

### 4.2 Course list — `/learner/courses`

**Purpose.** Find a course, or resume one.

**Current state.** `max-w-7xl`, `grid-cols-1 md:2 lg:3 xl:4`
([CourseListPage.tsx:449](../../src/components/courses/CourseListPage.tsx:449)), a filter
panel that expands to a 3-column grid (`:345`), and pagination gated on
`layout_mode === 'slide' || chunked_content_mode` (`:86`).

**Two problems.**

1. **Four cards across is too dense for every preset**, and density is decided purely by viewport (P3).
2. **A semantic leak.** `isPaginated` is derived from *lesson-reading* settings. A learner who chose "Slide view" for reading lessons silently gets a paginated course catalogue. Two unrelated concepts share one flag. The same leak exists on the favourites page and in [CourseDetailPage.tsx:480](../../src/components/courses/CourseDetailPage.tsx:480).

| Slot | Default | Dyslexia | ADHD | Autism |
|---|---|---|---|---|
| ② | search + filters | search only; filters behind one disclosure | **"Resume: <course>"** pinned | count: "12 courses. Sorted by name." |
| ③ | 4-col grid | **1-col list**, title-first, large, Listen button | **2-col**, enrolled first, 12 per page | **2-col, fixed order, never reflows** |
| ④ | filter panel | collapsed | collapsed | expanded, labelled |
| ⑤ | pagination | pagination, always on | pagination, always on | pagination with "Page 2 of 5" stated |

**Changes required**

- Replace `isPaginated` with a real preference (`browse_pagination`), defaulting **on** for all three presets. Infinite scroll and long grids are an ADHD anti-pattern ([01 §4.4](01-LEARNING-STANDARDS.md)).
- Cap the grid at 2 columns for all three presets; 1 for Dyslexia.
- Card content order is fixed: title → progress → duration → action. No preset reorders it (P4).
- Autism: sort order must be stable and stated. Never "recommended for you" ordering that changes between visits.

---

### 4.3 Course detail — `/learner/courses/[id]`

**Purpose.** Show what this course contains and where I am in it.

**Current state.** `max-w-5xl` / `max-w-6xl`, a 4-column stats grid
([CourseDetailPage.tsx:413](../../src/components/courses/CourseDetailPage.tsx:413)), and
**locked lessons are hidden entirely** when slide or chunked mode is on (`:480`).

**The hidden-lessons behaviour must be reversed.** It was presumably meant to reduce
clutter; it actually means the course has a different number of lessons depending on an
unrelated reading setting. For an autistic learner the syllabus changing shape between
visits is precisely the harm the preset prevents. Show locked lessons, dimmed, with a
literal reason: "Locked — finish lesson 3 first."

| Slot | All presets |
|---|---|
| ② | "You are on lesson 4 of 12" + Continue |
| ③ | **The full lesson list, always complete**, one row per lesson, showing state (done / current / locked-with-reason) |
| ④ | Course description, outcomes, stats — collapsed under Dyslexia and ADHD |
| ⑤ | Continue / Start |

Preset variation is density and emphasis only: Dyslexia gets larger rows and a Listen
button per lesson; ADHD pins Continue and collapses everything else; Autism numbers the
lessons and states total duration up front.

---

### 4.4 Lesson — the primary surface

Specified in detail in [03 §3–§7](03-PRESET-REDESIGN-PLAN.md). Summarised here for the
IA contract:

| Slot | Dyslexia | ADHD | Autism |
|---|---|---|---|
| ② | Reading Toolbar (sticky, 56px) | Now Bar (sticky, 64px) | Itinerary (collapses to one line after start) |
| ③ | one chunk, 62ch, cream, per-paragraph Listen | one chunk, 66ch, completion confirm at end | one step, 66ch, expectations stated first |
| ④ | — | collapsed checklist | — |
| ⑤ | "Listen again" / "Next section" | single primary button | transition notice |

**Fixed section order under every preset**, including when a section is empty:
Orientation → Video → Content → Activity → Quiz → Continuation.

---

### 4.5 Quiz — `/learner/quiz` and in-lesson

**Purpose.** Assess without penalising the disability.

**Current state, with two real defects.**

1. **The pulsing red timer.** [QuizPage.tsx:471–472](../../src/components/courses/QuizPage.tsx:471) applies `bg-red-50 text-red-700 animate-pulse` when time is low, suppressed only by `distraction_free_mode || simplified_ui`. But every preset sets `simplified_ui: false` explicitly ([02 §3.5](02-SETTINGS-REFERENCE.md)), so **the pulsing red countdown fires for ADHD and Autism preset users** — an anxiety and attention trigger aimed directly at the two groups least able to absorb it, and animation under a preset that requests none.
2. **Measure loss.** `:550` sets `max-w-full` under distraction-free, same bug as the lesson (P2).

Also: one-question-at-a-time is gated on `chunked_content_mode || layout_mode === 'slide'`
(`:552`) — another lesson-reading setting leaking into assessment.

| Slot | All presets |
|---|---|
| ② | "Question 3 of 10" + progress. **No countdown** — elapsed time only, and only if the learner asked for it |
| ③ | One question, measure-locked, options stacked vertically, large targets |
| ④ | — |
| ⑤ | Back / Next, with the disabled reason stated |

**Pre-quiz expectation card is mandatory under all three presets** (currently
`structure_mode === 'checklist'` only, `:318`): number of questions, timed or not, pass
mark, attempts remaining, what happens if you do not pass. Full policy in
[07](07-ASSESSMENT-POLICY.md).

---

### 4.6 Interactive activity

`InteractiveActivityViewer` already renders a plain-language instruction per activity
type and upgrades it to a boxed callout under `structure_mode === 'checklist'`
([InteractiveActivityViewer.tsx:48](../../src/components/interactive/InteractiveActivityViewer.tsx:48)) — good, keep it, and make it consistent with the quiz expectation card.

Two fixes: remove the `reading_spotlight`-driven blue ring (`:50`), which is an unrelated
feature riding on a reading setting ([02 §3.2](02-SETTINGS-REFERENCE.md)); and every
activity needs a keyboard path — `accessibility-utils.ts` already flags drag-and-drop as
a caution for motor and visual needs and nothing acts on it.

---

### 4.7 Progress, achievements, certificates, favourites

Lower-traffic, currently unaudited, and each has its own layout and pagination.

**Minimum bar for all four:**

- Adopt `.content-column` and the density budget (§3.1)
- Adopt the five-slot skeleton (§2)
- No stat-tile grid wider than 2 under any preset
- Achievements: rewards must be **deterministic and announced** — "finish 3 lessons to earn this" — never surprise reveals ([01 §8](01-LEARNING-STANDARDS.md), gamification row)
- Progress charts need a text equivalent beside them, not only in a tooltip ([01 §6.8](01-LEARNING-STANDARDS.md))
- Certificates: the download path must not be the only route to the content

---

### 4.8 Onboarding — `/learner/onboarding`

A 4-step wizard: preset → reading → focus/sensory → review
([onboarding/page.tsx:294–543](../../src/app/learner/onboarding/page.tsx:294)). Structurally
sound and already uses `PresetCard` and `SettingsPreview`.

Changes are specified in [05 §6](05-CUSTOMIZATION-UX.md): barrier-based questions instead
of a diagnosis prompt, the preset details dialog before applying, and a visible skip on
every step. The wizard itself is a good pattern — it is the only place in the product
that already follows the step contract from [03 §7.2](03-PRESET-REDESIGN-PLAN.md).

---

## 5. Responsive specification

The layouts above are desktop. Mobile is not "the same thing, narrower" — slot ② is the
hard problem, because a sticky Reading Toolbar, Now Bar, or Itinerary competes with
browser chrome for the most valuable 64px on the screen.

| Breakpoint | Slot ⓪ Nav | Slot ② Orientation | Slot ③ measure |
|---|---|---|---|
| **< 768px** | Sheet drawer (already) | **Bottom bar**, not top — thumb-reachable, out of the browser chrome's way | viewport-limited; `--content-measure` becomes a `min()` with `100% - gutters` |
| **768–1279px** | collapsible rail | sticky top | full measure |
| **≥ 1280px** | full sidebar | sticky top | full measure |

**Mobile rules**

- Slot ② collapses to one line plus one action. Reading Toolbar → `▶ Listen · Aa`; Now Bar → "Section 2 of 5 · Continue".
- Slot ④ is always collapsed on mobile, under every preset.
- Tap targets 48px under all three presets, per [01 §7](01-LEARNING-STANDARDS.md).
- **Test at 400% zoom on desktop** as well as at 375px — WCAG 1.4.10 reflow, and the two break differently.
- Never a horizontal scroll except inside a table or code block that owns its own scroll container.

---

## 6. Empty, loading, and error states

Routinely skipped, and disproportionately costly for these learners — an ambiguous
"nothing here" is an uncertainty event for an autistic learner and a dead end for an
ADHD learner.

| State | Rule |
|---|---|
| **Empty** | Say what is empty, why, and the one action that changes it. "You have no courses yet. Browse courses to enrol." Never a lone illustration. |
| **Loading** | Skeletons that match the final layout's shape, so nothing jumps when content arrives (P4, and zero layout shift for ADHD). No spinners longer than 1s without text. |
| **Error** | Plain language, no codes in the primary message, always a recovery action, never blame. "We couldn't load your courses. Try again." |
| **Locked** | Always state the unlock condition literally: "Finish lesson 3 to unlock this." |
| **Offline** | Say what still works and what does not. Settings are cached; content may not be. |
| **Saved** | Persistent, quiet confirmation in slot ②, never a disappearing toast (COGA "Provide Feedback"). |

Under `animation_level: none`, every one of these must read correctly with no motion —
a skeleton that only communicates via shimmer communicates nothing.

---

## 7. Cross-page consistency contract

These hold across every page, and violating one is a bug regardless of how good it looks.

1. **Slot order never changes** — not by preset, not by breakpoint, not by content.
2. **A section is never removed for being empty.** Show the empty state (P4).
3. **Nav order and labels are identical everywhere** (WCAG 3.2.3/3.2.4).
4. **The same concept uses the same word everywhere.** Currently "Lesson", "Section", "Chunk", "Step" and "Part" are used interchangeably across the lesson UI. Pick one vocabulary and publish it: **Course › Lesson › Section › Step**.
5. **One numbering system on screen at a time.** The Autism sidebar labels pages "Step 1: Dashboard … Step 5: Settings" ([Sidebar.tsx:71](../../src/components/learner/Sidebar.tsx:71)) while the dashboard numbers its sections 1–3 ([learner/page.tsx:47](../../src/app/learner/page.tsx:47)). **Resolution: numbering belongs to within-task sequences only.** Sidebar reverts to plain labels; itineraries, sections and steps keep numbers.
6. **The primary action sits in the same place** on every page of a type.
7. **Nothing moves after first paint.** Reserve space for anything that loads in.
8. **Nothing appears on hover.** Press only.
9. **Measure never exceeds `--content-measure`**, in any mode, on any page (P2).
10. **Every page is reachable and operable by keyboard in the same order it appears visually** — see [06](06-INTERACTION-AT-SPEC.md).

---

## 8. Component work implied

| Component | Action | Phase |
|---|---|---|
| `.content-column` + `--content-measure` | new, global | 2 |
| `PageShell` (the five-slot skeleton) | new — stops each page reinventing layout | 2 |
| `ReadingToolbar` | new | 3 |
| `NowBar` | new — absorbs `TaskChecklist`, `ProgressTimeline`, `AutoSaveIndicator` | 4 |
| `Itinerary` | rework of `VisualSchedule`, moved to slot ② | 5 |
| `SectionTransition` | new | 5 |
| `ExpectationCard` | new — unifies quiz `:318` and activity `:48` | 5 |
| `EmptyState` / `LoadingSkeleton` / `ErrorState` | new, shared | 2 |
| `learner/page.tsx` | add Dyslexia branch; remove the chunked tab-view branch | 3 |
| `CourseListPage` | density cap, decouple `isPaginated` | 3 |
| `CourseDetailPage` | stop hiding locked lessons | 3 |
| `QuizPage` | remove pulsing timer, fix measure, decouple one-question-at-a-time | 6 |
| `Sidebar` | drop page numbering under Autism | 5 |
| `TopBar` | currently zero preset awareness — bring into the skeleton | 2 |
| `.readable-content` | today it has no styles of its own and exists only as a spotlight selector hook; either give it meaning or replace it with `.content-column` | 2 |

---

## 9. Acceptance criteria

- [ ] Every learner page uses `PageShell` and the five slots in the same order
- [ ] No text column exceeds 80ch at any font size, on any page, in any mode
- [ ] Slot ② is visible at every scroll position, in focus mode and distraction-free mode
- [ ] Card density matches §3.1 for each preset at desktop width
- [ ] No section disappears because it is empty; every empty state names its recovery action
- [ ] No lesson-reading setting changes the behaviour of a browse or assessment surface
- [ ] Zero layout shift after first paint on dashboard, course list, and lesson
- [ ] No pulsing, flashing, or hover-revealed element under any preset
- [ ] One numbering system visible at a time
- [ ] Every page passes at 375px and at 400% zoom
