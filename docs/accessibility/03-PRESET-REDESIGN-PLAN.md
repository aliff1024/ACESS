# Preset Redesign Plan

**Making each preset feel like it was built for that learner — not like a colour theme.**

- **Companion docs:** [01-LEARNING-STANDARDS.md](01-LEARNING-STANDARDS.md) (the evidence and the numbers), [02-SETTINGS-REFERENCE.md](02-SETTINGS-REFERENCE.md) (per-setting behaviour and conflicts)
- **Scope:** learner surfaces only — dashboard, course list, course detail, lesson, quiz, activity, settings

---

## 1. The problem, stated honestly

Today a preset changes **colours, fonts, and a small number of booleans**. Two of the
three presets get a bespoke dashboard and sidebar; one does not. The behavioural
features that would make a preset *feel* different are either buried, inert, or hidden
by another feature in the same preset ([02 §7](02-SETTINGS-REFERENCE.md)).

Concretely, measured against the codebase:

| Preset | Bespoke dashboard | Bespoke nav | Bespoke lesson flow | Working supports |
|---|---|---|---|---|
| Dyslexia | ❌ falls through to default + `space-y-16` | ⚠️ width only (`Sidebar.tsx:149`) | ❌ chunking only | ❌ TTS autoplays, spacing sliders inert |
| ADHD | ✅ `learner/page.tsx:20–36` | ✅ `Sidebar.tsx:44` | ⚠️ forced focus mode | 🔴 its own focus mode hides them |
| Autism | ✅ `learner/page.tsx:40–74` | ✅ `Sidebar.tsx:71` | ⚠️ chunk + checkpoint | ⚠️ schedule renders at page bottom |

**Dyslexia has no behavioural identity at all** — it is a cream palette with a wide
sidebar. That is the whole reason it "feels lacking".

---

## 2. Design thesis — one sentence per preset

These are the north stars. Every decision below should be checkable against them.

> **Dyslexia — "The Reading Room."**
> The page becomes a book page. One column, one job: read this, at your pace, with your
> ears if you want. Everything that is not the text gets out of the way, and the text
> itself is the most carefully made thing on screen.

> **ADHD — "The Runway."**
> There is exactly one next action and it is impossible to lose. Where you are, how far
> is left, and what happens when you finish are permanently on screen. Everything else
> is one labelled click away, and nothing ever moves on its own.

> **Autism — "The Itinerary."**
> You see the entire path before you take the first step, in an order that will be
> identical tomorrow. Every step tells you what it is, how long it takes, what finished
> looks like, and what comes next. Nothing happens that was not announced.

A quick test for any proposed change: *if I removed the colours, would you still be able
to tell which preset this is?* Today the answer is no for Dyslexia. It must become yes
for all three.

---

## 3. The layout and sizing system (this replaces ad-hoc `max-w-*`)

This is the "location and size of the content" specification.

### 3.1 Introduce a measure token

The root cause of the current sizing mess is that width is expressed in `rem`-based
Tailwind classes chosen by a chain of ternaries (`LessonViewPage.tsx:1105`, `:1115–1123`),
while font size is chosen independently by a slider. The two never agree.

Add to `globals.css`:

```css
:root {
  --content-measure: 72ch;   /* default */
  --content-gutter: 1.5rem;
  --block-rhythm: 3rem;      /* vertical space between major blocks */
}
html[data-preset="dyslexia"] { --content-measure: 62ch; --block-rhythm: 4rem; }
html[data-preset="adhd"]     { --content-measure: 66ch; --block-rhythm: 2rem; }
html[data-preset="autism"]   { --content-measure: 66ch; --block-rhythm: 3rem; }

.content-column {
  max-width: var(--content-measure);
  margin-inline: auto;
  padding-inline: var(--content-gutter);
}
```

Because `ch` is font-relative, the measure stays inside the WCAG 1.4.8 80-character cap
at **every** font size the learner picks. Replace every content-width ternary with
`.content-column`.

**`distraction_free_mode` must stop setting `max-w-full`** (`LessonViewPage.tsx:1115`)
and `max-width: none` (`globals.css:515`). Distraction-free means "remove chrome", never
"remove measure" ([02 §3.3](02-SETTINGS-REFERENCE.md)).

### 3.2 The three-zone page model

Every learner page resolves to the same three zones. Presets change what occupies them,
never their order.

```
┌─────────────────────────────────────────────┐
│  ZONE A — Orientation  (sticky, above fold) │   ← preset-specific, always present
├─────────────────────────────────────────────┤
│  ZONE B — Content      (.content-column)    │   ← the actual work, measure-locked
├─────────────────────────────────────────────┤
│  ZONE C — Continuation (end of content)     │   ← what to do next
└─────────────────────────────────────────────┘
```

| Zone | Default | **Dyslexia** | **ADHD** | **Autism** |
|---|---|---|---|---|
| **A** | breadcrumb + title | **Reading Toolbar** — play/pause, speed, size, spacing, tint, spotlight | **Now Bar** — "Now: Read section 2 of 5 · ~4 min · [Continue]" + progress + save state | **Itinerary** — numbered steps with durations and done-state |
| **B** | content, 72ch | content, 62ch, cream, one section per screen, per-paragraph listen buttons | content, 66ch, one chunk, completion confirm at the end of each | content, 66ch, one step, expectations stated before it |
| **C** | next lesson card | "Listen again" / "Next section" / "Finished reading" | single primary button, no alternatives above it | transition notice: "Section 2 complete. Next: Quiz (5 min). [Continue]" |

Zone A is sticky and **must survive focus mode and distraction-free mode**. Fixing
[02 §4.2](02-SETTINGS-REFERENCE.md) — the ADHD preset hiding its own supports — is
exactly this rule.

### 3.3 Sizing table

| Property | Default | Dyslexia | ADHD | Autism |
|---|---|---|---|---|
| Content measure | 72ch | **62ch** | 66ch | 66ch |
| Sidebar | `w-64` | `w-72` | `w-64`, collapsed by default, **never auto-hidden** | `w-72`, fixed, never collapses |
| Zone A height | — | 56px | 64px | auto (list) |
| Block rhythm | 3rem | **4rem** | 2rem | 3rem |
| Card padding | 1.25rem | 1.75rem | 1.25rem | 1.5rem |
| Tap target min | 44px | 48px | 48px | 48px |
| Cards per viewport (dashboard) | 3–4 | **1** | **1 primary + collapsed rest** | numbered sections, one per row |
| Dashboard grid | 3-col | **single column** | single column | single column, numbered |

**Note on the ADHD sidebar.** ADHD currently enables `distraction_free_mode`, which
hides the sidebar entirely (`globals.css:506`). Removing navigation removes the mental
model ([01 §4.3](01-LEARNING-STANDARDS.md) — "reduce, don't hide"). Replace with a
collapsed icon rail that expands on click, never on hover.

---

## 4. Dyslexia — "The Reading Room" (largest redesign)

> **[00 §4 Phase 3](00-PROGRAM-PLAN.md) landed most of this section**, at reduced scope
> in two places (not sticky; "read from here" is block-level, not sentence-level) — see
> that status note for the full list of what shipped, what shipped differently, and
> what's still open.

Originally: palette + fonts + `space-y-16` + a wider sidebar. Nothing else.

### 4.1 New component: `ReadingToolbar` (Zone A)

`src/components/accessibility/ReadingToolbar.tsx` — sticky, 56px, present on every
lesson and content page under this preset (and available as an opt-in for anyone).

```
┌────────────────────────────────────────────────────────────────┐
│ ▶ Listen   1×▾   │  A− A+   ⇕ spacing   ◐ tint   ◎ spotlight  │
└────────────────────────────────────────────────────────────────┘
```

This is the single highest-value addition. Right now every reading control lives inside
a modal behind a sidebar item — a dyslexic learner must leave the text, open a dialog,
guess a value, save, and come back. The controls belong **next to the text they change**,
with live effect.

- Listen: starts TTS **from the current spotlight position**, not the top
- Speed: reuses `TTS_SPEED_OPTIONS`
- A− / A+: writes `font_size_px`, persisted
- Spacing: cycles Normal / Wide / Widest, mapped to the WCAG-floor values in [01 §7](01-LEARNING-STANDARDS.md)
- Tint: the existing `TintPicker`, as a popover
- Spotlight: toggles `reading_spotlight`

### 4.2 Real text-to-speech, with visual sync

Rewrite the TTS path in `LessonViewPage.tsx`:

1. **Never auto-start** — delete the autoplay at `:747–752`.
2. Split content into sentences; speak sentence-by-sentence with `SpeechSynthesisUtterance`.
3. Use `onboundary` / per-utterance callbacks to add `.tts-active` to the sentence currently being spoken, and scroll it into view (respecting `animation_level`).
4. Click any paragraph → "Read from here".
5. Pause/resume preserves position across chunk navigation.

Bimodal text + synchronised audio is the best-supported dyslexia accommodation
([01 §3.4](01-LEARNING-STANDARDS.md)); TTS without highlight is the weak version, which is
what ships today.

### 4.3 Fix the typography so the controls actually work

From [02 §2.2–2.4](02-SETTINGS-REFERENCE.md):

- Delete `globals.css:168–171` (the `!important` letter/word spacing that makes the slider inert)
- Add `--user-letter-spacing` as a first-class variable and setting
- Change the word-spacing mapping to `(pct/100) * 0.6em` — or express it in em directly
- Raise Dyslexia defaults to the WCAG floors: `1.7` line height, `0.12em` letter, `0.16em` word, `2em` paragraph
- Delete the legacy enum overrides in lesson rendering (`LessonViewPage.tsx:1127–1128`)
- Add `text-align: left` enforcement and `hyphens: manual` under the preset (BDA: never justify)
- Ban italic emphasis in learner copy under this preset — `em { font-style: normal; font-weight: 600; }`

### 4.4 Dedicated dashboard branch

`src/app/learner/page.tsx` — add a `dyslexia` branch before the default return.

```
Zone A   Reading Toolbar
Zone B   ┌──────────────────────────────────────┐
         │  Continue reading                    │   ← one card, full measure
         │  Photosynthesis · Section 3 of 7     │
         │  About 6 minutes left                │
         │  [ Continue ]   [ ▶ Listen ]         │
         └──────────────────────────────────────┘

         Your courses                              ← vertical list, not a grid
         • Biology 101      3 of 12 lessons  [▶]
         • Chemistry Basics 1 of 8 lessons   [▶]
```

No stat tiles, no charts, no 3-column grid, no progress ring. One card per viewport,
`--block-rhythm: 4rem`, every title with a Listen affordance. Progress moves to its own
page, reachable from the nav.

### 4.5 Reading aid rework

- Remove `filter: blur(0.4px)` (`globals.css:481`) — blurring text harms decoding
- Raise dimmed opacity `0.35 → 0.45` and verify 4.5:1 against every tint
- Add an optional **reading ruler** variant: a horizontal band that follows the active line, as an alternative to dimming
- Suppress dimming when the current chunk is fewer than 3 blocks ([02 §3.2](02-SETTINGS-REFERENCE.md))

### 4.6 Reading-aware chunking

- Chunk by `<h2>`, with a fallback to paragraph count when a lesson has no headings
- Header for each chunk: **"Section 3 of 7 · about 4 minutes"**
- Per-section footer: `[▶ Listen to this section]  [Next section]`
- Never show a countdown; estimated reading time is a label, not a clock

### 4.7 Quiz and activity support

- Read-aloud button on every question stem and every option
- One question per screen by default
- No timers under this preset (make the educator's timer non-blocking, with a note)
- Answers left-aligned, generous spacing, no two-column option grids

---

## 5. Autism — "The Itinerary"

> **[00 §4 Phase 5](00-PROGRAM-PLAN.md) landed §5.1 and §5.4 of this section**, at
> reduced scope — see that status note for what shipped, what shipped differently, and
> what's still open (§5.2 transition announcements, §5.3 expectation cards, §5.5 literal
> language, §5.6 sensory fixes are all still unbuilt).

Currently: numbered dashboard sections, numbered sidebar labels, muted colours, no
animation, checkpoint gating. Good bones. What is missing is the *contract* with the
learner.

### 5.1 The Itinerary panel (Zone A) — promote `VisualSchedule`

Move `VisualSchedule` from the bottom of the lesson (`LessonViewPage.tsx:1991`) to the
top, and populate it from the real lesson phases rather than a passed-in array.

```
This lesson has 4 parts. About 18 minutes in total.

  ✓ 1. Watch the video               4 min    Done
  ▸ 2. Read the lesson               8 min    You are here
    3. Complete the matching task    3 min
    4. Take the quiz (5 questions)   3 min

You can stop at any time. Your place is saved.
```

Rendered **before** step 1 begins, and collapsed to a one-line summary once started
("Part 2 of 4 · Read the lesson"). This is COGA Objective 5's "Provide Information So a
User Can Complete and Prepare for a Task", and it is the preset's whole identity.

### 5.2 Transition announcements (Zone C)

`docs/Accessibility.md` already specifies this and it was never built. Add
`SectionTransition`:

```
┌────────────────────────────────────────────┐
│  Part 2 complete.                          │
│                                            │
│  Next: Part 3 — Matching task              │
│  About 3 minutes. 6 pairs to match.        │
│                                            │
│  [ Continue ]        [ Stop for now ]      │
└────────────────────────────────────────────┘
```

- `aria-live="polite"`, focus moves to the heading
- Never auto-advances — the learner presses Continue
- "Stop for now" saves and exits without any scolding copy
- This is also the **text equivalent** that makes `animation_level: none` lossless ([02 §5.3](02-SETTINGS-REFERENCE.md))

### 5.3 Expectations before every task

Extend `structure_mode: 'checklist'` (rename to `explicitness: 'explicit'`) from quizzes
and activities to **lesson start, every section, every activity, every quiz**. One
component, `ExpectationCard`, with a fixed field order that never varies:

*What this is · How long · How many parts · What counts as finished · What happens next
· What happens if you get it wrong*

### 5.4 Structural consistency (fixes a real violation)

- **Container width must not vary by course.** Fix the dead `??` at `LessonViewPage.tsx:1107` so the preset width wins over the educator's `lesson_layout` ([02 §3.5](02-SETTINGS-REFERENCE.md)). Today an autistic learner gets a different page width in every course.
- Section order is fixed: Itinerary → Video → Content → Activity → Quiz → Transition. Same order even when a section is empty (show "This lesson has no video" rather than omitting the slot silently).
- Sidebar never collapses, never reorders, never changes width.
- **Resolve the double numbering.** The sidebar labels pages "Step 1: Dashboard … Step 5: Settings" (`Sidebar.tsx:71–95`) while the dashboard numbers its sections 1–3 (`learner/page.tsx:47–70`). Two competing numbering systems on screen at once is itself a source of confusion ([01 §5.4](01-LEARNING-STANDARDS.md)). **Keep numbering for within-task sequences only**; make the sidebar plain labels.

### 5.5 Literal language layer

Add `src/locales/*.autism.ts` overrides (or an `explicit` variant key per string) for
learner-facing copy:

| Standard | Explicit |
|---|---|
| "Pick up where you left off" | "Continue lesson 3: Photosynthesis" |
| "Your Journey" | "Modules you have finished" |
| "Nice work!" | "You finished part 2 of 4." |
| "Let's dive in" | "Start part 1" |
| "Almost there!" | "1 part left." |

### 5.6 Sensory fixes

- Replace `filter: saturate(0.6)` with token-level chroma reduction, preserving `--destructive` and `--ring` ([02 §5.1](02-SETTINGS-REFERENCE.md))
- Video must not autoplay; TTS force-disabled from autoplay
- Either honour the `animation_level` control under this preset or hide it and say so in the preset dialog (`globals.css:222–226` currently makes it inert)

---

## 6. ADHD — "The Runway"

> **[00 §4 Phase 4](00-PROGRAM-PLAN.md) landed the NowBar**, at reduced scope (dashboard
> sharpening, time-based chunking, interruption discipline, mobile variant, and the
> nav rail are all still open). Building it surfaced a second, more severe bug than
> the one it was scoped to fix — the ADHD-forced-focus state had *no header at all*,
> not just hidden supports — see that status note for the full trace.

### 6.1 The Now Bar (Zone A) — the centrepiece

New `src/components/accessibility/NowBar.tsx`. Sticky under the header, 64px, **inside**
focus mode rather than excluded by it.

```
┌──────────────────────────────────────────────────────────────────────┐
│ NOW  Read section 2 of 5 — Light reactions        ~4 min   ✓ Saved   │
│ ████████░░░░░░░░░░░░░░░░  40%                        [ Continue → ]  │
└──────────────────────────────────────────────────────────────────────┘
```

This single component absorbs `TaskChecklist`, `ProgressTimeline`, and
`AutoSaveIndicator`, and fixes the worst bug in the system: the ADHD preset currently
enables all three and then hides them behind its own forced focus mode
(`LessonViewPage.tsx:1984` vs `:1110` — see [02 §4.2](02-SETTINGS-REFERENCE.md)).

Rules:
- Always visible, at any scroll position, in every mode
- Names the current action in imperative form
- One primary button; no competing actions in this zone
- Progress and save state are permanent, not transient toasts
- Expanding it reveals the full checklist; collapsed is the default

### 6.2 Dashboard — sharpen what exists

Keep the "focus area first" shape (`learner/page.tsx:20–36`) and tighten it:

- **Exactly one** recommendation card, full measure, with lesson name and time remaining
- Drop the `ring-2 ring-primary bg-primary/10` wrapper — decorative salience competing with the button inside it
- Everything else behind one labelled disclosure: `▸ More courses (4)` — collapsed, not hidden
- No progress charts on this page (already the case); one line of text instead: "3 of 12 lessons done"
- ≤ 2 clicks from here to learning ([01 §4.3](01-LEARNING-STANDARDS.md))

### 6.3 Chunking by time, not just headings

- Target 3–7 minutes per chunk; if an `<h2>` section exceeds it, split further on paragraph boundaries
- Label every chunk with both position and time: "Section 2 of 5 · ~4 min"
- Immediate, small completion confirmation at the end of each chunk (a checkmark and a line of text — no confetti, no animation when `animation_level` is low/none)

### 6.4 Interruption discipline

- No toast, notification, or modal may fire while a lesson, activity, or quiz is active
- Optional, opt-in break prompt after a learner-set interval, and only **between** chunks — never mid-task (COGA Objective 5, "Limit Interruptions")
- Quiz timers become non-blocking under this preset: elapsed time shown, no countdown, no auto-submit ([01 §4.4](01-LEARNING-STANDARDS.md), WCAG 2.2.1)

### 6.5 Resume, prominently

On returning to a lesson: `You stopped at section 3 of 5. [ Continue ] [ Start over ]`.
No hunting, no scroll restoration guesswork.

### 6.6 Navigation

Replace `distraction_free_mode`'s full sidebar removal with a **collapsed icon rail**
that expands on click. Keep the ADHD grouping from `Sidebar.tsx:44–67`, but never
auto-expand on hover — nothing moves without a press.

---

## 7. Guided mode redesign — "Guided Run"

> **[00 §4 Phase 5](00-PROGRAM-PLAN.md) landed the core of §7.1 and the mandatory
> disabled-Next explanation from §7.2** — the two components now agree (`guidedMode`'s
> `showChunkNav` precondition, the actual root cause below, is replaced with a
> phase-count check). **Not landed:** the rest of the six-field step contract (the card
> still shows only a title and step counter, not "What to do / Done when / Next up"),
> the sticky bottom step bar (§7.4), moving focus to the new step heading on advance
> (§7.4), and the pre-flight/completion interstitials (§7.3, the Itinerary panel from
> §5.1 covers the pre-flight case for Autism specifically but the general "on return"
> and "after each step" interstitials aren't built) — those need live/AT verification
> this session didn't have. See the status note for the full reasoning.

This addresses "the guided doesn't really feel like it's helping" directly. The
diagnosis is in [02 §4.3](02-SETTINGS-REFERENCE.md): **two components disagree about
whether guided mode is on**, and on a lesson with fewer than two `<h2>` headings the
wizard chrome renders while no sequencing happens at all.

### 7.1 One sequencer

Replace the `focus_mode` / `step_by_step_enabled` / `guidedMode` / `sequentialMode`
tangle with a single value:

```ts
type Sequencer = 'none' | 'focus' | 'guided';
```

- Derived once, in the resolver ([02 §8](02-SETTINGS-REFERENCE.md))
- Guided wins if both are requested
- **No chunk-count precondition.** Steps are built from lesson *phases* (video / content / activity / quiz), which already exist at `LessonViewPage.tsx:1008–1013` and are always ≥ 1. Chunks subdivide the content phase; they do not gate whether guided mode exists.

### 7.2 The step contract

Every step renders the same six fields, in the same order, every time. This is the
difference between a progress bar and actual guidance.

```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 4                                    ~8 minutes  │
│                                                             │
│  Read the lesson                                            │
│  ─────────────────────────────────────────────────────────  │
│  What to do    Read all 5 sections. Use Next at the         │
│                bottom of each section.                      │
│                                                             │
│  Done when     You reach the end of section 5.              │
│                                                             │
│  Next up       Step 3 — Matching task (3 min)               │
│                                                             │
│  [ ← Back ]                          [ Next step → ]        │
│                    ⓘ Finish reading section 5 to continue.  │
└─────────────────────────────────────────────────────────────┘
```

- **"What to do"** — imperative, plain language (COGA Objective 1)
- **"Done when"** — the completion criterion, stated before the learner starts (COGA Objective 5)
- **"Next up"** — no surprises (Autism), and a reason to finish (ADHD)
- **The disabled-Next explanation is mandatory.** Never a greyed button with no reason ([01 §6.4](01-LEARNING-STANDARDS.md)). Today `StepByStepGuidance.tsx` disables Next with no message at all.

### 7.3 Pre-flight and completion

- **Before step 1:** the Itinerary panel (§5.1) — all steps, total time, "you can stop any time".
- **After each step:** the transition notice (§5.2).
- **On return:** "You stopped at step 3 of 4. [Continue] [Start over]".
- **Always exitable:** a permanent "Leave step-by-step mode" that persists the setting off and keeps progress. The current exit exists (`LessonViewPage.tsx:1261`) but is styled as a ghost link in a crowded footer — promote it.

### 7.4 Layout changes

- Move the controls to a **sticky bottom step bar** so Back/Next are always reachable without scrolling; the top card shrinks to "Step 2 of 4 · Read the lesson".
- On advancing, move focus to the new step heading and reset scroll to the top of the step (respecting `animation_level`).
- Hard-scope the DOM: non-current steps get `hidden` + `aria-hidden="true"` (they already do via the `hidden` class at `:1587`, `:1747`, `:1998` — but only when `guidedMode` is true, which §7.1 makes unconditional).

### 7.5 Per-preset guided behaviour

| | Dyslexia | ADHD | Autism |
|---|---|---|---|
| Guided default | off (chunking is enough) | off (Now Bar covers it) | **on** |
| Steps built from | — | chunks | phases + chunks |
| Transition notice | — | inline confirm | **full interstitial** |
| Pre-flight itinerary | — | one line in Now Bar | **full panel** |

---

## 8. The Preset Details dialog (explicit requirement)

> **[00 §4 Phase 7](00-PROGRAM-PLAN.md) landed this for trigger point 1** (§8.1 below) —
> `src/components/accessibility/PresetDetailsDialog.tsx`, wired into
> `AccessibilitySettingsModal.tsx`'s preset chips. Trigger point 2 (the onboarding
> `PresetCard`) is untouched. Content is generated from `ACCESSIBILITY_PRESETS` and the
> previously-unused `getPresetDiff()` rather than the not-yet-built `SETTING_CATALOG`
> (§8.3, still not started) — see the status note there and in
> [00's Phase 7 section](00-PROGRAM-PLAN.md) for what that means for scope. The footer
> is Cancel / Apply preset, not Cancel / Preview / Apply — see §8.2's note.

When a learner picks a preset, show what it will do **before** applying it. This is COGA
Objective 7's "Clearly State the Results and Disadvantages of Actions, Options, and
Selections", and it is also the consent mechanism from
[01 §9](01-LEARNING-STANDARDS.md).

### 8.1 Trigger points

1. ✅ **Done — Phase 7.** Clicking a preset chip in the Accessibility Settings modal (`AccessibilitySettingsModal.tsx`, search "pendingPresetId") — **opens the dialog instead of applying immediately**
2. ❌ **Not attempted.** Clicking a `PresetCard` in onboarding (`src/app/learner/onboarding/page.tsx:319`) — separate flow, own pre-existing bugs, untouched
3. ❌ **Not attempted.** A permanent "What does this preset do?" link next to the active preset name — no such link exists yet

### 8.2 Content

```
┌───────────────────────────────────────────────────────────────┐
│  Dyslexia preset                                          [×] │
│  Reduces reading fatigue and visual crowding                  │
├───────────────────────────────────────────────────────────────┤
│  ┌─ Preview ─────────────────────────────────────────────┐    │
│  │ The quick brown fox jumps over the lazy dog.          │    │  ← existing
│  │ Learning is a journey, not a destination.             │    │    SettingsPreview
│  └───────────────────────────────────────────────────────┘    │
├───────────────────────────────────────────────────────────────┤
│  WHAT THIS TURNS ON                                           │
│                                                               │
│  ✓ Atkinson Hyperlegible, 19px                                │
│    Letters are easier to tell apart (b/d, I/l/1).             │
│    Why: letterform confusion is a common decoding error.      │
│                                                               │
│  ✓ Wider letter and word spacing                              │
│    Text feels less crowded, so lines are easier to follow.    │
│    Why: BDA Style Guide — word spacing ≥ 3× letter spacing.   │
│                                                               │
│  ✓ Cream background                                           │
│    Less glare than white.                                     │
│                                                               │
│  ✓ Narrower reading column (about 62 characters)              │
│    Short lines are easier to return to. Long lines cause      │
│    you to lose your place.                                    │
│                                                               │
│  ✓ Listen (text-to-speech) controls                           │
│    Reads the lesson aloud and highlights the sentence.        │
│    It will not start on its own.                              │
│                                                               │
│  ✓ Reading spotlight   ✓ One section at a time                │
│                                                               │
│  WHAT THIS TURNS OFF                                          │
│                                                               │
│  ✗ Slide view                                                 │
│    Slides hide how much is left, which makes it harder to     │
│    pace yourself.                                             │
│                                                               │
│  ✗ Most animation                                             │
│                                                               │
│  CHANGES FROM YOUR CURRENT SETTINGS            (7 changes)  ▾  │
│    Font size          16px  →  19px                           │
│    Background         White →  Cream                          │
│    … 5 more                                                   │
├───────────────────────────────────────────────────────────────┤
│  You can change any of this afterwards, one setting at a time. │
│                                                               │
│  [ Cancel ]              [ Preview ]        [ Apply preset ]   │
└───────────────────────────────────────────────────────────────┘
```

Requirements:

- ⚠️ **Partially done.** ON list generated from the preset definition (`additional_features`) ✅ — but there's no separate OFF list; what would be shown there is covered by the diff below instead (a value flipping true→false already shows as a change), except for code-enforced behaviours with no stored value, which get a hand-written note instead (see the slide-view row below)
- ❌ **Not done.** Each row does not have the three-line what/plain/why structure — `SETTING_CATALOG.why`/`.source` don't exist yet (§8.3, still not started), so there's no sourced rationale per row, only the plain feature name
- ✅ **Done.** "Changes from your current settings" uses `getPresetDiff()` — exactly as specified, and for the Default/`none` case (which `getPresetDiff` doesn't cover, since it only looks up named presets) a parallel diff against `DEFAULT_PRESET_SETTINGS` was added alongside it
- ✅ **Done, differently.** Trade-offs are stated — but as one hand-written note ("Slide view becomes unavailable under this preset") for ADHD/Autism specifically, verified against `LessonViewPage.tsx`'s actual `isSlideMode` definition before writing it, rather than a generated OFF list derived from a catalog that doesn't exist
- ❌ **Not done.** No separate Preview step — Cancel / Apply preset only; see [00's Phase 7 status note](00-PROGRAM-PLAN.md) for why (there's no "preview without commit" state distinct from what the modal already does on every change)
- ❌ **Not done.** No live mini-preview (`SettingsPreview`) inside the dialog itself
- ✅ **Done.** Reassurance line present: "You can change any of this afterwards, one setting at a time, from this same panel."

### 8.3 The setting catalog — one source of truth

Create `src/lib/accessibility-catalog.ts`:

```ts
export interface SettingMeta {
  key: keyof AccessibilitySettingsData;
  label: string;          // "Word spacing"
  group: 'reading' | 'focus' | 'sensory' | 'supports';
  plain: string;          // what the learner will notice
  why: string;            // the reason, from doc 01
  source?: string;        // "BDA Style Guide 2023" / "WCAG 1.4.12"
  helps: ('dyslexia' | 'adhd' | 'autism')[];
  conflictsWith?: (keyof AccessibilitySettingsData)[];
  requires?: (keyof AccessibilitySettingsData)[];
}
export const SETTING_CATALOG: Record<string, SettingMeta>;
```

Four consumers, one definition:

1. The Preset Details dialog (ON / OFF / why)
2. The settings modal descriptions ([02 §9](02-SETTINGS-REFERENCE.md) copy table)
3. The conflict resolver's warning messages ([02 §8](02-SETTINGS-REFERENCE.md))
4. These docs, which can be regenerated from it

This is what stops the documentation, the UI copy, and the behaviour from drifting apart
— which is how the current state was reached.

---

## 9. Implementation phases

Ordered by *learner impact per unit of risk*. Phase 1 alone fixes most of "it feels
lacking", because several settings are currently inert.

### Phase 1 — Make the existing settings actually work (no new UI)

| # | Change | File |
|---|---|---|
| 1 | Delete `!important` letter/word spacing so the sliders work | `globals.css:168–171` |
| 2 | Fix word-spacing scale to reach the WCAG floor; add `--user-letter-spacing` | `AccessibilityProvider.tsx:113` |
| 3 | Remove legacy enum overrides in lesson rendering | `LessonViewPage.tsx:1127–1128` |
| 4 | `computeAdaptiveSettings` reads `base_preset`, not `active_preset` | `adaptive-engine.ts:366` |
| 5 | Stop TTS autoplay | `LessonViewPage.tsx:747–752` |
| 6 | Stop emitting deprecated `data-low-contrast`; delete the contrast filter | `AccessibilityProvider.tsx:108`, `globals.css` |
| 7 | Scope Soft Backgrounds off `--background`/`--card` | `globals.css:541` |
| 8 | `muted_colors` → token chroma reduction instead of `filter` | `globals.css:559` |
| 9 | Remove the spotlight blur; raise dim opacity to 0.45 | `globals.css:478–483` |
| 10 | Fix the `??` → `\|\|` so Autism gets a consistent container width | `LessonViewPage.tsx:1107` |

**Acceptance:** every slider in the Reading tab visibly changes lesson text under every
preset; no page starts talking on its own.

### Phase 2 — Layout system

| # | Change | File |
|---|---|---|
| 11 | Add `--content-measure` / `.content-column`; replace width ternaries | `globals.css`, `LessonViewPage.tsx:1105,1115–1123` |
| 12 | Distraction-free keeps measure, removes chrome only | `globals.css:515`, `LessonViewPage.tsx:1115` |
| 13 | Three-way layout radio; delete `chunked_content_mode` as a separate switch | `AccessibilitySettingsModal.tsx:428–487` |
| 14 | `resolveSettings()` + inline conflict notices in the modal | new `src/lib/accessibility-resolver.ts` |

**Acceptance:** no learner surface exceeds 80ch at any font size, in any mode.

### Phase 3 — Preset identities

| # | Change | File |
|---|---|---|
| 15 | `NowBar` and move ADHD supports inside focus mode | new component, `LessonViewPage.tsx:1984` |
| 16 | Promote `VisualSchedule` to the Itinerary panel at the top | `LessonViewPage.tsx:1991` |
| 17 | `SectionTransition` announcements | new component |
| 18 | `ExpectationCard`, applied consistently | new; `QuizPage.tsx:318`, `InteractiveActivityViewer.tsx:48` |
| 19 | `ReadingToolbar` | new component |
| 20 | Dyslexia dashboard branch | `src/app/learner/page.tsx` |
| 21 | Single `sequencer`; Guided Run step contract | `LessonViewPage.tsx:1147`, `StepByStepGuidance.tsx` |
| 22 | Autism single numbering system | `Sidebar.tsx:71–95` |

**Acceptance:** the §2 test passes — remove the colours and each preset is still
identifiable.

### Phase 4 — Depth

| # | Change |
|---|---|
| 23 | `SETTING_CATALOG` + Preset Details dialog |
| 24 | TTS sentence-level highlighting and "read from here" |
| 25 | Literal-language locale layer for Autism |
| 26 | Time-based chunking (3–7 min) for ADHD |
| 27 | Opt-in break prompts; non-blocking quiz timers |
| 28 | Age-group adaptation, per `docs/Accessibility.md` |

> The Preset Details dialog is a Phase 4 item **only because it should describe the
> redesigned behaviour**. If it ships earlier it will document the broken state. If you
> need it sooner, ship it after Phase 1 and update its copy each phase.

---

## 10. Risks and migration

| Risk | Mitigation |
|---|---|
| Existing learners have saved settings with the old word-spacing scale | Migrate on read: `word_spacing_pct` → the em value that reproduces today's rendering, then let them adjust. Do not silently double their spacing. |
| Removing `!important` from preset CSS may unmask other cascade issues | Land Phase 1 items 1–3 together and screenshot-test each preset on lesson, quiz, activity, dashboard. |
| `muted_colors` token rewrite changes every colour under the Autism preset | Contrast-test all tokens against the 4.5:1 floor before merge; the acceptance list in [01 §10](01-LEARNING-STANDARDS.md) covers it. |
| `.content-column` may break existing two-column educator layouts | Apply to the content column only; leave `layoutContainer` for page shells. |
| Single `sequencer` touches a 2,700-line component | Extract the sequencer into a hook (`useLessonSequencer`) first, unchanged, then change behaviour. |
| Presets diverging from these docs again | The `SETTING_CATALOG` (§8.3) is the guard — UI copy, warnings, and docs all read from it. |

---

## 11. Definition of done

A preset ships when:

1. Every box in its section of [01 §10](01-LEARNING-STANDARDS.md) is checked.
2. Every 🔴 in [02 §7](02-SETTINGS-REFERENCE.md) involving it is resolved.
3. Its Preset Details dialog is generated from the catalog and matches observed behaviour.
4. The §2 test passes: colours removed, the preset is still recognisable from its structure.
5. Turning it off returns the learner to the default product with no loss of progress.
