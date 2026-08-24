# Accessibility Settings Reference

**Every setting: what it claims, what it actually does today, what it should do, and what it breaks.**

This document answers three questions for each control in the Accessibility Settings
modal:

1. **What happens** when it is on?
2. **What is broken** about it right now (with file and line)?
3. **What does it conflict with** — does turning this on break something else?

- **Companion docs:** [01-LEARNING-STANDARDS.md](01-LEARNING-STANDARDS.md) (why these values), [03-PRESET-REDESIGN-PLAN.md](03-PRESET-REDESIGN-PLAN.md) (the redesign)
- **Code:** `src/lib/adaptive-engine.ts`, `src/providers/AccessibilityProvider.tsx`, `src/components/learner/AccessibilitySettingsModal.tsx`, `src/app/globals.css`
- **Legend:** ✅ works · ⚠️ works partially / misleading · 🔴 broken or inert

> **Implementation status — [00 §4 Phase 1](00-PROGRAM-PLAN.md) landed.** The following
> 🔴 rows are now fixed in code; the sections below still describe the *before* state as
> the record of what was wrong and why, per [10 §5](10-GOVERNANCE-RUNBOOK.md) ("retire,
> don't rewrite history"). Fixed: §2.4 word-spacing scale + Dyslexia's `!important`
> block (now reaches the 0.16em WCAG floor); §2.3/§2.2 legacy line-spacing/font-size
> enum overrides in lesson content (now CSS-variable-driven via `.rich-content` rules
> and an inline `--user-font-size` style); §2.6 TTS autoplay (now never starts without a
> press); §3.5 the Autism `??`→`||` container-width bug; §5.1 is unchanged (still 🔴,
> deferred — see note below); §5.2 the deprecated `data-low-contrast` contrast filter
> (removed) and Soft Backgrounds silently overriding `background_tint` (scoped off
> `--background`/`--card`); the [02 §7](02-SETTINGS-REFERENCE.md) resolver row for
> `active_preset` vs `base_preset` (fixed in `computeAdaptiveSettings`); the reading
> spotlight's blur (removed) and dim opacity (0.35 → 0.45). **Deliberately deferred:**
> §5.1 `muted_colors`'s `filter: saturate(0.6)` mechanism — a true token-level fix
> requires converting the many literal Tailwind color utility classes used for status
> colors (`bg-red-50`, `text-green-600`, etc.) to a form a filter can exempt, which is
> larger and riskier than a Phase 1 change; tracked for Phase 2/3.
>
> **[00 §4 Phase 2](00-PROGRAM-PLAN.md) partially landed.** Also fixed: §3.1
> `layout_mode`'s "third value with no control" (the Focus tab is now a real three-way
> radio; the separate `chunked_content_mode` switch that wrote to the same field is
> gone — `chunked_content_mode` is derived everywhere it's saved); §3.3 distraction-free
> losing measure (`max-w-full` → `.content-column`, reading `--content-measure` — 62ch
> Dyslexia / 66ch ADHD & Autism / 72ch default — in both `LessonViewPage.tsx` and
> `QuizPage.tsx`, which had the identical bug). **§8's resolver now exists and is live**
> (`src/lib/accessibility-resolver.ts`, wired into `AccessibilityProvider`), implementing
> 4 of the 11 precedence rules — the layout-axis and `base_preset`-reading rules that
> were mechanically well-defined without a schema change; the rest (a real `sequencer`
> type, `tts_autoplay`, `transition_announcements`, token-level `muted_colors`) need
> infrastructure Phase 2 hasn't built yet and are tracked there. See the fuller status
> note in [00's Phase 2 section](00-PROGRAM-PLAN.md) for the complete list.

---

## 0. How a setting travels through the system

```
AccessibilitySettingsModal  (local React state, one per setting)
        │  previewSettings() on every change
        ▼
AccessibilityProvider.settings
        │  computeAdaptiveSettings()  → adaptiveOverrides.ui + .lesson_modes
        ▼
applySettingsToDOM()  →  <html data-preset data-bg-tint data-chunked … >
        │                  + CSS custom properties (--user-font-size, …)
        ├──────────────► globals.css   (visual layer)
        └──────────────► component reads useAccessibility().settings  (behaviour layer)
```

**Two consumers, two failure modes.** A setting can be styled but not behave
(`structure_mode: 'checklist'` has no CSS), or behave but not be styled
(`layout_mode: 'chunked'` has no button in the modal). Every setting below is graded
on both.

**Critical architectural bug — `active_preset` vs `base_preset`.**
`applySettingsToDOM` reads `base_preset` (`AccessibilityProvider.tsx:96`) so the palette
survives a manual tweak, but `computeAdaptiveSettings` reads `active_preset`
(`adaptive-engine.ts:366`), which flips to `'custom'` the moment any switch is touched.
**Result: moving one slider silently drops the preset's lesson modes (chunking,
checkpoints) while keeping its colours.** Both must read `base_preset`.

---

## 1. Full settings index

| Setting | Group | Type | Default | Dyslexia | ADHD | Autism | Status |
|---|---|---|---|---|---|---|---|
| `font_family` | Reading | enum | `arial` | `atkinson_hyperlegible` | `arial` | `arial` | ✅ |
| `font_size_px` | Reading | 12–24 | 16 | 18 | 18 | 18 | ⚠️ double-driven |
| `line_spacing_multiplier` | Reading | 1.0–3.0 | 1.5 | 1.6 | 1.5 | 1.5 | ⚠️ overridden in lessons |
| `word_spacing_pct` | Reading | 0–50 | 0 | 20 | 10 | 10 | 🔴 inert under Dyslexia; under WCAG floor everywhere |
| `background_tint` | Reading | enum | `white` | `cream` | `grey` | `pale_blue` | ⚠️ loses to Soft Backgrounds |
| `tts_enabled` | Reading | bool | off | **on** | off | off | ⚠️ autoplays; no visual sync |
| `tts_rate` | Reading | 0.75–1.5 | 1 | 1 | 1 | 1 | ✅ |
| `preferred_language` | Reading | `en`/`ms` | `en` | — | — | — | ✅ |
| `layout_mode` | Focus | `scroll`/`slide`/`chunked` | `slide` | `chunked` | `chunked` | `scroll` | 🔴 `chunked` has no UI control |
| `reading_spotlight` | Focus | bool | off | **on** | **on** | off | ⚠️ blurs text; repurposed elsewhere |
| `distraction_free_mode` | Focus | bool | off | off | **on** | **on** | 🔴 destroys line measure |
| `chunked_content_mode` | Focus | bool | off | **on** | **on** | **on** | ⚠️ duplicates `layout_mode` |
| `simplified_ui` | Focus | bool | off | off | off | off | 🔴 dead fallback in lessons |
| `animation_level` | Sensory | `none`/`low`/`normal` | `normal` | `low` | `low` | **`none`** | ⚠️ removes orientation cues |
| `muted_colors` | Sensory | bool | off | off | off | **on** | 🔴 global CSS filter |
| `low_contrast` (Soft Backgrounds) | Sensory | bool | off | off | off | off | 🔴 silently overrides tint |
| `preferred_theme` | Sensory | enum | `light` | `light` | `light` | `light` | ⚠️ conflicts with tint |
| `captions_enabled` | Sensory | bool | off | — | — | — | ✅ |
| `keyboard_navigation_enabled` | Sensory | bool | off | — | — | — | ⚠️ attribute only |
| `structure_mode` | Supports | `full`/`minimal`/`checklist` | `full` | `full` | `minimal` | `checklist` | ⚠️ thin |
| `task_checklist_enabled` | Supports | bool | off | off | **on** | off | 🔴 hidden by ADHD's own focus mode |
| `visual_schedule_enabled` | Supports | bool | off | off | off | **on** | ⚠️ rendered at the bottom of the page |
| `step_by_step_enabled` | Supports | bool | off | off | off | **on** | 🔴 inert on single-section lessons |
| `auto_save_enabled` | Supports | bool | off | **on** | **on** | **on** | ⚠️ gates only the indicator |
| `progress_timeline_enabled` | Supports | bool | off | off | **on** | **on** | 🔴 hidden by ADHD's own focus mode |
| `birth_date` → `userAgeGroup` | Profile | date | — | — | — | — | ⚠️ affects nav sizing + course filter only |

---

## 2. Reading group

### 2.1 `font_family` ✅

**What happens.** `applySettingsToDOM` sets `data-font-family`; `globals.css:392–398`
applies the family to `body` with `!important`. Atkinson Hyperlegible and OpenDyslexic
load from CDN in `src/app/layout.tsx:59–66`.

**Should also.** Preload the CDN fonts (currently `display=swap` only, so the first
paint of a dyslexia session is in a fallback face — a jarring reflow for the exact user
who needs stability). Add a local fallback so the preset degrades gracefully offline.

**Note.** OpenDyslexic hardcodes `letter-spacing: 0.05em` (`globals.css:398`), which is
*below* the WCAG 1.4.12 floor of 0.12em. See [01 §3.3](01-LEARNING-STANDARDS.md) for why
OpenDyslexic should not be the default at all.

---

### 2.2 `font_size_px` ⚠️ — two sources of truth

**What happens.** Sets `--user-font-size` (`AccessibilityProvider.tsx:111`), applied to
the root at `globals.css:402–404`. Since Tailwind sizes are `rem`-based, the whole app
scales. Good.

**What is broken.** `LessonViewPage.tsx:1128` *also* applies a Tailwind size class
derived from the **legacy enum** `preferred_font_size`:

```ts
const contentFontSize = fontSizeMap[settings.preferred_font_size ?? 'medium']; // 'text-lg prose-lg'
```

So inside lesson content the pixel slider is competing with a coarse 4-value enum.
Moving the slider from 18 → 19px changes nothing visible in a lesson, because the enum
is still `large`.

**Fix.** Delete the enum path in lesson rendering. Keep `preferred_font_size` as a
write-only legacy mirror for the database, never read it for layout.

**Conflicts.** With measure — see §7.1. Raising font size without a `ch`-based measure
pushes line length past 80 characters.

---

### 2.3 `line_spacing_multiplier` ⚠️ — overridden where it matters most

**What happens.** Sets `--user-line-spacing` (`AccessibilityProvider.tsx:112`), applied
at `globals.css:407–409` on `body`.

**What is broken.** `LessonViewPage.tsx:1127` applies `leading-relaxed` / `leading-loose`
to the `.prose` container, from the legacy 3-value `line_spacing` enum. A Tailwind class
on the content container beats an inherited `body` value. **The slider works everywhere
except inside a lesson.**

**Fix.** Same as §2.2 — one source of truth, the CSS variable, applied to
`.rich-content` directly.

---

### 2.4 `word_spacing_pct` 🔴 — inert under Dyslexia, and below the WCAG floor everywhere

Two independent defects.

**Defect 1 — the scale is too small to reach the legal floor.**

```ts
// AccessibilityProvider.tsx:113
root.style.setProperty('--user-word-spacing', `${(wordSpacingPct / 100) * 0.3}em`);
```

| Slider | Rendered | WCAG 1.4.12 floor |
|---|---|---|
| 20% (Dyslexia default) | **0.06em** | 0.16em |
| 50% (maximum) | 0.15em | 0.16em |

**The slider cannot reach the WCAG minimum at any position.** The Dyslexia preset ships
at roughly one third of the required value.

**Defect 2 — the Dyslexia preset shadows the slider entirely.**

```css
/* globals.css:168–171 */
html[data-preset="dyslexia"] body {
  letter-spacing: 0.1em !important;
  word-spacing: 0.2em !important;   /* !important */
}
/* globals.css:412–414 */
html[data-font-family] body {
  word-spacing: var(--user-word-spacing, 0em);   /* no !important — loses */
}
```

While the Dyslexia preset is active, **the Word Spacing slider does nothing.** The
learner drags it across its whole range and the page does not change. That, on its own,
is a large part of "the dyslexia preset feels lacking".

Letter spacing is also hardcoded to `0.1em`, below the 0.12em floor.

**Fix.**
1. Change the mapping to `(pct / 100) * 0.6em` so 50% = 0.3em and the 0.16em floor sits at ~27%.
2. Better: express the control in em directly (0 → 0.4em), with the WCAG floor marked on the slider track and a warning below it.
3. Delete the `!important` block at `globals.css:168–171`; move those values into the preset's *settings object* so they flow through `--user-word-spacing` and stay adjustable.
4. Add `--user-letter-spacing` as a first-class variable and setting — it currently exists only as hardcoded preset CSS.

---

### 2.5 `background_tint` ⚠️

**What happens.** Sets `data-bg-tint`; `globals.css:417–421` rewrites `--background`,
`--card`, `--popover`. Dark variants exist (`dark_cream`, etc.) but **no UI exposes
them** — `BACKGROUND_TINTS` in `accessibility-utils.ts` lists only the five light tints.

**Conflicts.**
- **Soft Backgrounds wins.** `html[data-soft-bg="true"]` (`globals.css:541`) also sets `--background` and `--card`, at equal specificity but *later in the file*. Turning on Soft Backgrounds silently replaces the cream ground with a neutral one — the Dyslexia preset visibly loses its identity and the learner has no idea why. See §7.2.
- **Theme.** `preferred_theme: 'dark'` adds `.dark` to the root (`AccessibilityProvider.tsx:121–126`) while a light tint still forces a light `--background` — a half-dark page.

**Fix.** Establish precedence explicitly: `background_tint` owns the ground; Soft
Backgrounds may only touch `--border`, `--muted`, `--secondary`, `--sidebar-*`. Filter
the tint list by theme so dark mode offers dark tints.

---

### 2.6 `tts_enabled` ⚠️ — autoplays, and has no visual sync

**What happens.** When on, `LessonViewPage.tsx:747–752` **starts speaking automatically**
when a chunk loads.

**Why this is wrong.**
- Violates WCAG 3.2.5 (Change on Request) and [01 §6.1](01-LEARNING-STANDARDS.md) — nothing may start without a press.
- The Dyslexia preset sets `tts_enabled: true`, so **applying the Dyslexia preset makes the site start talking**. For an autistic learner who also enables TTS, unsolicited audio is an arousal event.
- The text is stripped to plain text (`ttsTextRef`), so **there is no visual synchronisation** — no word or sentence highlight. Per [01 §3.4](01-LEARNING-STANDARDS.md), TTS without visual sync is the weak version of the intervention.

**Fix.**
1. Never auto-start. `tts_enabled` means "show me reading controls", not "speak now".
2. Add sentence-level highlight driven by `SpeechSynthesisUtterance.onboundary`.
3. Allow "read from here" on any paragraph click.
4. Split into `tts_enabled` (controls visible) and `tts_autoplay` (default off, and force-disabled under the Autism preset).

---

## 3. Focus group

### 3.1 `layout_mode` 🔴 — a third value with no control

`layout_mode` is typed `'scroll' | 'slide' | 'chunked'`, but the Focus tab
(`AccessibilitySettingsModal.tsx:428–433`) renders only **two** buttons, Scroll and
Slide. The Dyslexia and ADHD presets both set `layout_mode: 'chunked'`, so after
applying either preset **neither button appears selected** and the learner cannot tell
what state they are in. Your screenshot of the Focus tab shows exactly this: "Scroll
View" is highlighted by luck of the fallback, not because it is the actual mode.

The Chunked switch below then *writes* `layout_mode`
(`AccessibilitySettingsModal.tsx:479`), so one control secretly drives another.

**Fix.** Make layout a single **three-way radio**: `Scroll · Slide · One section at a
time`. Delete `chunked_content_mode` as a separate switch (§3.4). This removes the dead
state and makes the mutual exclusion structural instead of accidental.

Also: `LessonViewPage.tsx:759` force-disables slide mode for ADHD and Autism regardless
of the setting. That is a reasonable behaviour but an invisible one — the preset details
dialog ([03 §6](03-PRESET-REDESIGN-PLAN.md)) must state it.

---

### 3.2 `reading_spotlight` ⚠️

**What happens.** `ReadingSpotlight.tsx` tracks the element nearest viewport centre and
adds `.spotlight-active`; `globals.css:478–495` dims everything else to `opacity: 0.35`
plus `filter: blur(0.4px)`.

**Problems.**
- **The blur is actively counterproductive.** Blurring text raises decoding cost for dyslexic readers — the population this is aimed at. Dim by opacity only ([01 §3.4](01-LEARNING-STANDARDS.md)).
- `opacity: 0.35` on body text can drop effective contrast below 4.5:1 → WCAG 1.4.3 failure on the dimmed text. Use `0.45` and verify against each tint.
- **Semantic drift.** `InteractiveActivityViewer.tsx:50–52` reads `reading_spotlight` to wrap the whole activity in a permanent blue ring. That is not a reading spotlight; it is a different feature riding on the same flag. Give it its own setting or drop it.
- Granularity is the block element. For a long paragraph the "spotlight" covers the whole paragraph, which is close to no help. Sentence-level or line-band granularity is the useful version.

**Conflicts.** With `chunked_content_mode` — if only one section is on screen, the
spotlight is dimming content that is already isolated. Doubly reducing is not doubly
helpful. Recommend: when the current chunk is under ~3 blocks, suppress the dimming.

---

### 3.3 `distraction_free_mode` 🔴 — destroys line measure

**What happens.**
- Hides sidebar, widgets, notifications (`globals.css:506–513`)
- Sets `main { max-width: none }` (`globals.css:515–518`)
- `LessonViewPage.tsx:1115–1116` sets the content container to **`max-w-full`**

**Why this is broken.** On a 27-inch monitor, distraction-free mode produces lines of
200+ characters. WCAG 1.4.8 caps them at 80. Distraction-free is supposed to *help*
concentration, and it delivers the single most fatiguing possible text layout. It is
also the one mode where the Dyslexia preset's `max-w-2xl` is thrown away, so a dyslexic
learner who wants fewer distractions gets punished for asking.

**Fix.** Distraction-free removes **chrome**, never **measure**:

```
distraction-free  =  hide sidebar/topbar/badges  +  centre the column  +  keep --content-measure
```

**Conflicts.**
- Overrides the Dyslexia container width — see §7.1.
- Hides the sidebar, and therefore anything that lives in it.
- ADHD and Autism presets both enable it while also enabling supports that need somewhere to live — see §3.6 and §4.2.

---

### 3.4 `chunked_content_mode` ⚠️ — duplicates `layout_mode`

Splits content on `<h2>` (`LessonViewPage.tsx:1132–1138`) and shows one section with
prev/next navigation. It works, but it is a second control for the same axis as
`layout_mode`, and the two write to each other. Merge into the three-way radio (§3.1).

The chunk-detection heuristic is also fragile: a lesson with no `<h2>` produces a single
chunk, which silently disables chunking, checkpoints, **and** guided mode (§4.3) with no
feedback. Add a fallback: if there are fewer than 2 headings, chunk by paragraph count
targeting the 3–7 minute window from [01 §7](01-LEARNING-STANDARDS.md).

---

### 3.5 `simplified_ui` 🔴 — a dead fallback

```ts
// LessonViewPage.tsx:1107
const simplifiedMode = settings.simplified_ui ?? (activePreset === 'autism' || activePreset === 'adhd');
```

`??` only falls back on `null`/`undefined`. Every preset sets `simplified_ui: false`
explicitly (`DEFAULT_PRESET_SETTINGS` in `adaptive-engine.ts`), so the right-hand side
**never runs**. `simplifiedMode` is therefore `false` for ADHD and Autism, despite the
code being written to assume otherwise.

**Consequence for Autism** (this one matters): with `simplifiedMode === false`, the
content container falls through to `layoutContainer` — the **educator's** per-lesson
layout choice (`LessonViewPage.tsx:1105`). So an autistic learner gets `max-w-4xl` in one
course and `max-w-7xl` in the next. That directly violates the preset's central promise
of consistent, predictable structure, and WCAG 3.2.3/3.2.4.

**Fix.** Replace `??` with `||`, or better: derive `simplifiedMode` from the preset
definition rather than a boolean that presets keep setting to `false`. Then make the
Autism preset's container width **override** the educator layout unconditionally.

---

### 3.6 Interaction: distraction-free + supports

`distraction_free_mode` hides `[data-sidebar]`. Any support surface that lives in the
sidebar disappears. Today the supports render in the main column
(`LessonViewPage.tsx:1984–1994`), so they survive — but see §4.2 for the worse problem.

---

## 4. Supports group — where the biggest bugs are

### 4.1 `structure_mode` ⚠️ — three values, uneven implementation

| Value | What it actually does |
|---|---|
| `full` | nothing |
| `minimal` | hides `.lesson-secondary-badge` (`globals.css:501–503`) |
| `checklist` | quiz expectations panel (`QuizPage.tsx:318`) + boxed activity instruction (`InteractiveActivityViewer.tsx:48`) |

Named as if it controlled lesson structure; actually a grab-bag. The Autism preset sets
`checklist`, which is the right intent — explicit expectations — but it only reaches
quizzes and activities, not the lesson itself or the course page.

**Fix.** Rename to `explicitness` (`standard` / `reduced` / `explicit`) and make
`explicit` do one consistent thing everywhere: **state expectations before every task**
— lesson start, each section, activity, quiz. That is COGA Objective 1 and 5, and it is
what the Autism preset promises.

---

### 4.2 `task_checklist_enabled` and `progress_timeline_enabled` 🔴 — the ADHD preset hides its own supports

> **Fixed in [00 §4 Phase 4](00-PROGRAM-PLAN.md)** by the new `NowBar` component, which
> turned out to need fixing a second, more severe bug first — the ADHD-forced-focus
> state had no header of any kind, not just hidden supports. See that status note.

This was the headline defect.

```tsx
// LessonViewPage.tsx:1984
{!effectiveFocusMode && (
  <div className="space-y-4">
    <AutoSaveIndicator … />
    <TaskChecklist tasks={dynamicTasks} />
    <VisualSchedule … />
    <ProgressTimeline … />
  </div>
)}

// LessonViewPage.tsx:1110
const effectiveFocusMode = (focusMode || activePreset === 'adhd') && !focusModeManuallyExited;
```

The ADHD preset turns **on** `task_checklist_enabled`, `progress_timeline_enabled`, and
`auto_save_enabled` — and then forces focus mode, whose wrapper **hides all three**.

**A learner applies the ADHD preset and receives none of the executive-function supports
the preset advertises.** They only appear if the learner manually exits focus mode, at
which point the ADHD layout changes underneath them.

**Second problem: position.** Even when visible, these render *after* the lesson content
card. A checklist of what to do that appears below everything you have already done is
decoration. Per [01 §4.3](01-LEARNING-STANDARDS.md), the support must be visible
*simultaneously with* the work it scaffolds — which means sticky, above the fold.

**Fix.** Move ADHD's supports into a **sticky "Now" bar** (see
[03 §4](03-PRESET-REDESIGN-PLAN.md)) that is part of focus mode rather than excluded by it.

---

### 4.3 `step_by_step_enabled` 🔴 — the "guided mode doesn't help" problem, diagnosed

Two components claim to implement guided mode, and they disagree about when it is on.

**Component A — the wizard card.** `LessonViewPage.tsx:1516`:

```tsx
{settings.step_by_step_enabled && guidedSteps.length > 0 && (
  <StepByStepGuidance … />
)}
```

**Component B — the actual sequencing.** `LessonViewPage.tsx:1147`:

```ts
const guidedMode = !!settings.step_by_step_enabled
  && !isSlideMode
  && !effectiveFocusMode
  && showChunkNav              // ← requires totalChunks > 1
  && (effectiveChunkedEnabled || simplifiedMode || activePreset === 'autism');
```

`guidedMode` is what actually gates content (`sequentialMode` at `:1152`, and the
`hidden` classes at `:1587`, `:1747`, `:1998`).

**So when a lesson has fewer than two `<h2>` headings, or focus mode is on:**
Component A renders (a header, a step title, a progress bar, a Next button) while
Component B is `false` — no content is gated, no sequencing happens, nothing is hidden.
The learner sees a wizard chrome wrapped around an ordinary scrolling page. **That is
precisely why guided mode "doesn't feel like it's helping": on a large fraction of
lessons it is literally inert.**

**Third problem — the step card carries almost no information.** It shows a title
("Read Lesson Content"), dots, and a disabled Next. It does not say what to do, how long
it takes, what counts as done, or why Next is disabled. COGA Objectives 1, 4, and 5 all
ask for exactly those.

**Fix.** See [03 §7 "Guided Run"](03-PRESET-REDESIGN-PLAN.md) — one sequencer, no chunk-count
precondition, a real step contract per step, and an explanation on every disabled control.

---

### 4.4 `visual_schedule_enabled` ⚠️ — right idea, wrong place

`VisualSchedule` renders a timeline of now/next/later — genuinely the right pattern for
the Autism preset. But it renders **below the lesson content**
(`LessonViewPage.tsx:1991`). A schedule you read after finishing is not a schedule.

**Fix.** Move to the top of the lesson, above the first content block, populated from
the real lesson phases (video / content / activity / quiz), with per-step durations and
done-state. This becomes the Autism preset's "itinerary" ([03 §5](03-PRESET-REDESIGN-PLAN.md)).

---

### 4.5 `auto_save_enabled` ⚠️ — gates the indicator, not the saving

Saving happens regardless; this flag only controls whether `AutoSaveIndicator` is shown
(documented at `AccessibilityProvider.tsx:53–60`). That is defensible, but the label
"Automatically save your progress" is misleading — a learner may believe turning it
**off** stops saving.

**Fix.** Relabel: "Show a save indicator — your work is always saved automatically."

---

### 4.6 `keyboard_navigation_enabled` ⚠️

Sets `data-keyboard-nav` and nothing reads it. Keyboard navigation must work
unconditionally (WCAG 2.1.1); it is not a preference. Either delete the setting, or
redefine it as what learners actually want — "show keyboard shortcut hints" — and
implement that.

---

## 5. Sensory group

### 5.1 `muted_colors` 🔴 — a global CSS filter is the wrong mechanism

```css
/* globals.css:559 */
html[data-muted-colors="true"] { filter: saturate(0.6); }
```

Applying `filter` to `<html>` has three side effects beyond desaturation:

1. **It creates a containing block for every `position: fixed` descendant.** Fixed toolbars, the distraction-free exit button (`LearnerShell.tsx`), toasts, and dialog overlays position relative to the filtered element instead of the viewport. Any future sticky "Now" bar or reading toolbar will be affected.
2. **It desaturates semantic colour.** Error red, success green, and the focus ring all lose distinguishability together — a WCAG 1.4.1 (Use of Colour) and 1.4.11 (Non-text Contrast) risk. The Autism acceptance checklist in [01 §10](01-LEARNING-STANDARDS.md) explicitly tests this.
3. It forces whole-page compositing, which costs performance on low-end devices.

**Fix.** Implement muted colours as a **token swap** — reduce the chroma component of
the `oklch()` design tokens under `html[data-muted-colors="true"]`, leaving
`--destructive`, `--ring`, and success colours at full chroma. This composes cleanly
with `background_tint` instead of fighting it.

---

### 5.2 `low_contrast` / "Soft Backgrounds" 🔴 — silently overrides the tint

`globals.css:541` sets `--background` and `--card`, at the same specificity as the
`data-bg-tint` rules at `:417` but later in the file, so it wins. A Dyslexia learner who
enables Soft Backgrounds loses the cream ground and has no way to tell why.

There is also a deprecated `html[data-low-contrast="true"] { filter: contrast(0.85) }`
still shipping, which *reduces* text contrast — the opposite of an accessibility
feature, and a WCAG 1.4.3 failure. `applySettingsToDOM` sets **both**
`data-soft-bg` and `data-low-contrast` from the same field
(`AccessibilityProvider.tsx:107–108`), so the deprecated filter fires for every user who
turns Soft Backgrounds on.

**Fix.** Stop emitting `data-low-contrast`; delete the contrast filter rule; scope
`data-soft-bg` to borders and muted surfaces only.

---

### 5.3 `animation_level` ⚠️

`none` sets `animation-duration: 0.01ms` and `scroll-behavior: auto` globally
(`globals.css:522–531`). Correct for WCAG 2.3.3 and the Autism preset.

**But** motion currently carries meaning: chunk transitions, slide changes, and progress
bar fills are the only cue that something changed. Removing motion removes the cue.
Per [01 §6.8](01-LEARNING-STANDARDS.md), every one of those needs a **text equivalent**
before `animation_level: none` is safe. This is the technical reason the Autism preset
needs transition announcements — not a separate nice-to-have.

Also note `globals.css:222–226` duplicates the reduced-motion rule for
`html[data-preset="autism"]`, so a learner who sets animation to `normal` under the
Autism preset still gets no animation. Either honour the override or remove the control
under this preset and say so in the preset dialog.

---

## 6. Profile group

`birth_date` → `userAgeGroup` ('6-12' / '13-17' / '18+'), computed in
`AccessibilityProvider.tsx`. Consumed by only three things: sidebar button sizing
(`Sidebar.tsx:135–140`), course filtering (`AdaptiveRecommendations.tsx`), and a
`data-age-group` attribute (`AccessibilityEnhancements.tsx:13`) that no CSS reads.

`docs/Accessibility.md` specifies far more age adaptation than this (icon-driven
navigation and gamification for 6–12, professional/productivity framing for 18+). Either
implement it or remove the promise. Recommendation: keep age out of scope for this round
and treat it as a phase-4 item — the preset work is higher value.

---

## 7. The conflict matrix

**"If one is turned on, does the other break?"** — this is the answer.

| A | B | Result today | Severity | Resolution rule |
|---|---|---|---|---|
| Dyslexia preset | Word Spacing slider | Slider is **completely inert** (`!important` at `globals.css:169–170`) | 🔴 | Remove preset `!important`; drive everything through `--user-word-spacing` |
| Dyslexia preset | Line Spacing slider | Works outside lessons, **overridden inside** by `leading-*` (`LessonViewPage.tsx:1127`) | 🔴 | Single source of truth = CSS variable |
| `distraction_free_mode` | Dyslexia measure | `max-w-full` overrides `max-w-2xl`; lines exceed 80ch | 🔴 | Distraction-free never changes measure |
| **ADHD preset** | **its own supports** | Forced focus mode hides checklist + timeline + autosave (`:1984` vs `:1110`) | 🔴 | Supports move into the sticky Now bar, inside focus mode |
| `step_by_step_enabled` | lesson with < 2 `<h2>` | Wizard chrome renders, sequencing does not (`:1516` vs `:1147`) | 🔴 | Drop the `showChunkNav` precondition; build steps from phases |
| `step_by_step_enabled` | `focus_mode` | Both can be on; focus silently wins, wizard renders inert | 🔴 | One `sequencer` enum: `none` / `focus` / `guided` |
| Soft Backgrounds | `background_tint` | Soft-bg wins by source order; tint silently lost | 🔴 | Tint owns the ground; soft-bg owns borders/muted only |
| Soft Backgrounds | itself | Also emits deprecated `data-low-contrast` → `filter: contrast(0.85)`, lowering text contrast | 🔴 | Stop emitting the deprecated attribute |
| `muted_colors` | fixed-position UI | `filter` on `<html>` re-parents fixed elements, desaturates focus ring and status colours | 🔴 | Token-level chroma reduction instead of a filter |
| Autism preset | educator `lesson_layout` | Container width varies per course (dead `??` at `:1107`) | 🔴 | Preset width wins unconditionally |
| `active_preset` tweak | preset lesson modes | One slider move → `'custom'` → `PRESET_LESSON_MODES` lookup misses → chunking/checkpoints silently drop | 🔴 | `computeAdaptiveSettings` must read `base_preset` |
| `layout_mode: 'chunked'` | the Focus tab UI | No button represents this state; UI shows a wrong selection | 🔴 | Three-way radio |
| `chunked_content_mode` | `layout_mode` | Two controls, one axis, writing to each other | ⚠️ | Merge |
| `tts_enabled` | any preset | Auto-starts speech on chunk load (`:747`) | 🔴 | Never autoplay; split out `tts_autoplay` |
| `tts_enabled` | `animation_level: none` | Audio plays with no visual anchor at all | ⚠️ | Sentence highlight is required, not optional |
| `reading_spotlight` | `chunked_content_mode` | Dims content that is already isolated; double reduction | ⚠️ | Suppress dimming when the chunk is < 3 blocks |
| `reading_spotlight` | dimmed text contrast | `opacity: 0.35` can fall below 4.5:1 | ⚠️ | Raise to 0.45 and verify per tint |
| `reading_spotlight` | activities | Repurposed as a permanent blue ring (`InteractiveActivityViewer.tsx:50`) | ⚠️ | Separate setting or remove |
| `animation_level: none` | orientation | Removes the only cue that a section changed | ⚠️ | Text equivalent for every transition |
| Autism preset | `animation_level` control | Preset CSS forces reduced motion; the control appears to do nothing | ⚠️ | Honour the override, or hide the control and explain |
| `preferred_theme: dark` | light `background_tint` | `.dark` class + light `--background` = half-dark page | ⚠️ | Filter tint options by theme |
| `slide` layout | `chunked` / guided | Slide splits on `<hr>`, chunk splits on `<h2>`; guided is disabled in slide mode | ⚠️ | Mutually exclusive by radio |
| `structure_mode: checklist` | lesson body | Only quizzes and activities get expectation panels | ⚠️ | Apply consistently to lesson and course pages |
| `auto_save_enabled: false` | learner belief | Label implies saving stops; it does not | ⚠️ | Relabel |
| `simplified_ui` | every preset | `??` fallback never fires because presets set `false` | ⚠️ | Use `\|\|` or derive from the preset |

---

## 8. Precedence rules to implement

Add a pure resolver, `resolveSettings(raw) → { effective, conflicts[] }`, in
`src/lib/accessibility-resolver.ts`. It runs once in `AccessibilityProvider` before
`applySettingsToDOM`, and the settings modal renders `conflicts[]` as inline notices
("Soft Backgrounds will replace your Cream background").

**The rules, in order:**

1. **Measure is inviolable.** No mode may set the content column wider than 80ch. `distraction_free_mode` removes chrome only.
2. **One sequencer.** `sequencer: 'none' | 'focus' | 'guided'` replaces the `focus_mode` / `step_by_step_enabled` pair. Guided beats focus if both are requested.
3. **One layout axis.** `layout_mode: 'scroll' | 'slide' | 'chunked'`. `chunked_content_mode` is derived, never stored.
4. **Slide is exclusive.** Slide mode disables guided and chunked by construction, and is unavailable under ADHD and Autism (state this in the preset dialog).
5. **Ground colour precedence.** `background_tint` > `preferred_theme` > `low_contrast`. Soft Backgrounds may not write `--background`, `--card`, or `--popover`.
6. **Chroma reduction never touches semantics.** `--destructive`, `--ring`, and success colours keep full chroma under `muted_colors`.
7. **No autoplay, ever.** `tts_autoplay` is force-`false` under the Autism preset and defaults `false` everywhere.
8. **Motion removal requires text equivalents.** Setting `animation_level: 'none'` implies `transition_announcements: true`.
9. **Preset gating always reads `base_preset`,** never `active_preset`.
10. **Supports are never hidden by a focus mode.** A support the learner enabled must appear somewhere, in every mode.
11. **User overrides always win over preset values** and survive a reload (COGA Objective 8) — already the intent, must be enforced by the resolver rather than by merge order in three separate files.

---

## 9. Copy rules for setting descriptions

Each setting's description in the modal must answer *what happens to me*, not *what the
system does*. Current copy fails this ("Show one section at a time" is fine; "Show your
learning journey" is not).

| Setting | Current | Proposed |
|---|---|---|
| Reading Spotlight | "Dim surrounding content to highlight current paragraph" | "Fades everything except the line you are reading, so you don't lose your place." |
| Distraction-Free Mode | "Hide sidebar, widgets, and notifications" | "Hides the menu and notifications. Your reading width stays the same." |
| Chunked Content | "Show one section at a time" | "Shows one section at a time, with Next and Back buttons. You'll see 'Section 2 of 5'." |
| Step-by-Step Guidance | "Break activities into guided steps" | "Takes you through the lesson one step at a time. Each step says what to do and when you're done." |
| Visual Schedule | "Display upcoming work in a visual timeline" | "Lists every part of the lesson before you start, with how long each part takes." |
| Progress Timeline | "Show your learning journey" | "Shows which modules you have finished and which one you are on." |
| Auto-Save Drafts | "Automatically save your progress" | "Shows a save indicator. Your work is always saved automatically either way." |
| Muted Colors | "Use calm, desaturated colors" | "Makes colours softer. Warnings and errors stay clearly visible." |
| Soft Backgrounds | "Softer backgrounds and borders, keeps text readable" | "Softens borders and panel edges. Your background colour choice is kept." |

Every description also carries a **"why this helps"** line in the preset dialog, sourced
from [01](01-LEARNING-STANDARDS.md). One catalog, three consumers — see
[03 §6.3](03-PRESET-REDESIGN-PLAN.md).
