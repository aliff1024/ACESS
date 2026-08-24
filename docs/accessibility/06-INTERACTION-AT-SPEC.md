# Interaction, Focus & Assistive Technology Specification

**Semantics, focus management, announcements, keyboard model, and the AT test matrix.**

- **Scope:** the technical substrate under every learner surface. Guided mode, chunk navigation, and transitions are all *focus-management* features and cannot be built correctly without this.
- **Depends on:** [04](04-DISPLAY-SPEC.md) (the five-slot skeleton)
- **Unblocks:** Phases 2, 5, 6 of [00 §4](00-PROGRAM-PLAN.md)

---

## 1. Why this document decides whether the rest works

Three of the redesign's centrepieces are, technically, focus and announcement problems
wearing a visual costume:

- **Guided Run** ([03 §7](03-PRESET-REDESIGN-PLAN.md)) hides all but one step. If focus is not moved deliberately, a keyboard or screen-reader user is left focused on a now-hidden element, with no idea the page changed.
- **Section transitions** ([03 §5.2](03-PRESET-REDESIGN-PLAN.md)) are an announcement, and an announcement that is only visual is not an announcement.
- **`animation_level: none`** removes the only change cue the product currently has, which is exactly why [01 §6.8](01-LEARNING-STANDARDS.md) requires text equivalents.

### Current baseline

| Signal | State |
|---|---|
| Component primitives | Radix/shadcn — a genuinely good accessible foundation, largely unused to its potential |
| `aria-label` | 31 uses |
| **`aria-describedby`** | **1 use in the entire codebase** — so no help text, error, or conflict notice is programmatically associated with its control |
| `aria-live` | 4 regions, ad hoc; one useful precedent at [LessonViewPage.tsx:1297](../../src/components/courses/LessonViewPage.tsx:1297) |
| **Skip link** | **None** |
| Focus management on view change | None found |

The primitives are fine. The wiring is missing.

---

## 2. Document semantics

### 2.1 Landmarks — one set, every page

```html
<header>        <!-- top bar: identity, account. banner -->
<nav>           <!-- sidebar. aria-label="Main" -->
<main id="main-content">
  <section aria-label="…">   <!-- slot ②: orientation -->
  <article>                  <!-- slot ③: primary -->
</main>
```

`main#main-content` already exists ([LearnerShell.tsx:73](../../src/components/learner/LearnerShell.tsx:73)) with `tabIndex={-1}` — correct, and now it has a job (§3).

### 2.2 Headings

- Exactly one `<h1>` per page: the page's subject, not the product name
- No skipped levels
- **Slot ② is not an `<h1>`.** The Now Bar and Reading Toolbar are controls, not the page subject
- Every collapsible section's trigger is a heading with a nested button, so heading navigation reaches it
- Lesson content headings are author-controlled; the runtime must not inject headings that break the author's order

### 2.3 Skip links — currently absent

Two, first in tab order, visible on focus:

1. **Skip to main content** → `#main-content`
2. **Skip to orientation** → slot ② — because under Dyslexia and ADHD that slot holds the controls the learner is most likely to want first

Under distraction-free mode the nav is hidden, so skip links must be conditional, not stale.

---

## 3. The focus management contract

**The single rule:** after any event that changes what is on screen, focus is somewhere
deliberate, visible, and announced. Never on a hidden element, never reset to `<body>`.

| Event | Focus goes to | Announced |
|---|---|---|
| Route change | `main#main-content`, then the `<h1>` is read | page title |
| Guided step advance | the new step's heading (`tabindex="-1"`) | "Step 3 of 4. Complete the activity." |
| Guided step back | same, previous step | same pattern |
| Chunk next/previous | the chunk heading | "Section 2 of 5." |
| Slide change | the slide heading | "Slide 3 of 8." |
| Section transition interstitial | the interstitial heading | the full notice, politely |
| Exit guided/focus mode | the control that was pressed | "Step-by-step mode off." |
| Modal open | first focusable, or the heading if content is long | dialog name |
| Modal close | **the trigger that opened it** | — |
| Settings tab/group change | first control in the group | group name and count |
| Quiz next question | the question text (`tabindex="-1"`) | "Question 4 of 10." |
| Quiz submit | the result heading | result |
| Collapse/expand | stays on the trigger | expanded state via `aria-expanded` |
| Content loads into current view | **does not move** | polite count if the change is material |
| Error on submit | the first invalid field | the error text |
| TTS starts | **does not move** | — |

**Prohibited:** moving focus on scroll, on hover, on timer, or on any event the learner
did not initiate. Unrequested focus movement is a WCAG 3.2.1/3.2.5 failure and, for an
autistic learner, exactly the unsignalled change the preset exists to prevent.

**Implementation.** One hook, `useFocusOnChange(ref, deps, { announce })`, used at every
row above — not scattered `element.focus()` calls, which is how focus behaviour drifts.

---

## 4. Live region policy

Announcements are a scarce resource. Over-announcing is as harmful as silence — a
learner using a screen reader alongside the app's own TTS can end up with three voices.

### 4.1 Two regions, application-wide

| Region | Politeness | Carries |
|---|---|---|
| `#a11y-status` | `polite`, `aria-atomic="true"` | progress, saves, step changes, filter counts, section transitions |
| `#a11y-alert` | `assertive` | errors that block progress, session expiry, data-loss warnings |

Owned by a single `AnnouncerProvider` exposing `announce(message, 'polite' \| 'assertive')`.
Replace the four ad-hoc regions; keep the pattern at
[LessonViewPage.tsx:1297](../../src/components/courses/LessonViewPage.tsx:1297) as the model.

### 4.2 Rules

- **Assertive is for loss and blockage only.** Never for success, never for progress.
- **Debounce 150ms; collapse duplicates.** A slider must not announce every intermediate value — announce on release.
- **Never announce what focus already reads.** If focus moved to the step heading, do not also announce the step heading.
- **Every announcement has a visible equivalent** and vice versa ([01 §6.8](01-LEARNING-STANDARDS.md)).
- **Auto-save announces at most once per 30s**, and never mid-typing.
- **Nothing announces while the learner is typing** in a text input.

### 4.3 What must announce

Derived from the redesign: step and section changes; the reason a disabled control is
disabled, when the learner activates it; transition notices; quiz question position; save
state changes; settings conflicts when they appear; and TTS start/stop.

---

## 5. Keyboard model

### 5.1 Global

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move focus in visual order — no positive `tabindex`, anywhere |
| `Esc` | Close the topmost overlay; never destroys unsaved work without a warning |
| `?` | Keyboard help sheet, listing everything in this table |

Single-letter shortcuts must be disableable and must not fire while a text field has
focus (WCAG 2.1.4).

### 5.2 Reading and lesson

| Key | Action |
|---|---|
| `J` / `K` or `↓` / `↑` | Move the reading spotlight by block |
| `N` / `P` | Next / previous section or step |
| `Space` | Play / pause TTS — only when focus is not on a control |
| `[` / `]` | TTS speed down / up |
| `+` / `−` | Text size |

Every one of these has a visible on-screen control too. Keyboard shortcuts are an
accelerator, never the only route.

### 5.3 Requirements

- **Visible focus indicator with ≥ 3:1 contrast against its background, under every tint, theme, and `muted_colors` combination.** This is the single most common casualty of colour settings and belongs in the contrast CI check.
- Focus never obscured by the sticky slot ② or a bottom bar (WCAG 2.4.11/2.4.12) — sticky elements need `scroll-margin` on focus targets.
- Focus trapped in modals; released and returned on close.
- **Every drag-and-drop interaction has a keyboard equivalent.** `accessibility-utils.ts` already flags drag-drop as a caution for motor and visual needs and suggests "keyboard alternatives (e.g. matching dropdowns)" — nothing acts on it. Implement the alternative, do not just document the caution.

---

## 6. Custom control requirements

The Radix primitives in `src/components/ui` provide correct roles by default. The risk is
the ~15 bespoke components that do not.

**Audit and fix list** (Phase 2):

| Component | Requirement |
|---|---|
| `SliderSetting` | `aria-valuenow/min/max/valuetext`; `valuetext` must be human ("19 pixels", not "19"); arrow/Home/End/PageUp/Down |
| `TintPicker` | `radiogroup` with named options; colour name in the label, never colour alone (WCAG 1.4.1) |
| `PresetCard` | already uses `aria-pressed` and a descriptive label — good; keep as the reference pattern |
| `StepByStepGuidance` | disabled Next needs `aria-describedby` pointing at the reason ([03 §7.2](03-PRESET-REDESIGN-PLAN.md)) |
| `ReadingSpotlight` | decorative dimming must not alter the accessibility tree; never `aria-hidden` the non-active blocks |
| `TaskChecklist` | real list semantics; state in text, not only the icon |
| `VisualSchedule` / `ProgressTimeline` | `<ol>` with per-item state as text ("Done", "You are here") |
| `AutoSaveIndicator` | `role="status"`, polite, throttled |
| `NowBar` *(new)* | `role="region"` + `aria-label`; must not become a focus trap |
| `ReadingToolbar` *(new)* | `role="toolbar"` with roving tabindex |
| `EasyReadIndicator` | already `role="status"` + polite — correct |
| `CollapsibleCard` | `aria-expanded` + `aria-controls` on the trigger |
| Interactive activities | each needs a keyboard path and an accessible name per item |

**Global rule:** any control conveying state must convey it in **text**, not only via
icon, colour, or position — otherwise `muted_colors` and monochrome displays destroy it.

---

## 7. TTS and screen readers must not collide

Untested today and near-certain to double-speak: the app's own `speechSynthesis` output
and a screen reader both voicing the same content.

**Rules**

1. **The app's TTS never starts automatically** ([02 §2.6](02-SETTINGS-REFERENCE.md)) — which also means it never starts on top of a screen reader.
2. **Detect nothing.** Screen-reader detection is unreliable and a privacy problem. Instead, make the Listen control obvious and always stoppable, and let the learner decide.
3. **TTS state is announced once** ("Reading started" / "Reading stopped"), never continuously.
4. **The `.tts-active` sentence highlight must not move focus** and must not be announced — it is a visual aid for a learner reading along.
5. **`Esc` and any Stop control halt speech immediately**, including on navigation away — no orphaned audio after leaving the page.
6. On unmount and route change, always `speechSynthesis.cancel()`.
7. If no voice exists for the selected language, say so in the UI rather than silently falling back to a wrong-language voice (relevant to `ms-MY`, per [00 §3](00-PROGRAM-PLAN.md) D6).

---

## 8. Motion, and what replaces it

`animation_level` maps to real mechanics, not just durations.

| Level | CSS | Behaviour |
|---|---|---|
| `normal` | default | smooth scroll, transitions |
| `low` | 100ms cap | transitions kept, no parallax, no autoplay |
| `none` | ~0ms, `scroll-behavior: auto` | **instant** state changes, **text equivalents required** |

**Rules**

- Honour `prefers-reduced-motion` as the *initial* value when the learner has no saved preference — do not override an explicit choice.
- Under `none`, `scrollIntoView` uses `behavior: 'auto'`; a smooth scroll at zero duration is still a jump, and the jump must be paired with an announcement.
- **Nothing pulses, flashes, or loops.** The low-time quiz timer's `animate-pulse` ([QuizPage.tsx:472](../../src/components/courses/QuizPage.tsx:472)) violates this under every preset and is removed by [07](07-ASSESSMENT-POLICY.md).
- Loading skeletons must communicate without their shimmer ([04 §6](04-DISPLAY-SPEC.md)).
- No animation may be the sole indicator of a state change, ever — that is what makes `none` lossless rather than lossy.

---

## 9. Pointer and touch

- Minimum target 48×48px under all three presets ([01 §7](01-LEARNING-STANDARDS.md)); 24px is the AA floor and is not enough here.
- Minimum 8px between adjacent targets.
- **No hover-only affordance.** Anything revealed on hover must also be reachable by press and by keyboard — and under Autism, hover reveals are prohibited outright ([01 §5.3](01-LEARNING-STANDARDS.md)).
- No gesture requiring a path, multipoint, or precision drag without a single-pointer alternative (WCAG 2.5.1, 2.5.7).
- Actions fire on `pointerup`, so a mis-press can be aborted by moving off the target (WCAG 2.5.2).
- No double-tap-only or long-press-only interactions.

---

## 10. Test matrix

Run at each phase gate, not once at the end.

### 10.1 Assistive technology

| Combination | Priority | Covers |
|---|---|---|
| NVDA + Firefox (Windows) | P0 | most common free desktop SR |
| VoiceOver + Safari (macOS) | P0 | different announcement model, catches different bugs |
| TalkBack + Chrome (Android) | P0 | the realistic device for many learners |
| JAWS + Chrome (Windows) | P1 | institutional standard |
| VoiceOver + Safari (iOS) | P1 | — |
| Windows Speech Recognition / Voice Control | P2 | every control needs a spoken name |

### 10.2 Display and input conditions

| Condition | Checks |
|---|---|
| 400% browser zoom | reflow, no horizontal scroll (WCAG 1.4.10) |
| 375px viewport | slot ② behaviour, target sizes |
| Windows High Contrast | nothing conveyed by colour alone survives; focus ring visible |
| Keyboard only, no mouse | every path completable |
| Every tint × preset × `muted_colors` | text ≥ 4.5:1, focus ring ≥ 3:1 |
| `prefers-reduced-motion: reduce` | correct initial state |
| Text spacing bookmarklet (WCAG 1.4.12) | no clipping or overlap |

### 10.3 Automated, in CI (Phase 2)

- `axe-core` via Playwright on: dashboard, course list, course detail, lesson, quiz, activity, settings, onboarding
- Contrast check across the tint × preset × muted matrix — programmatic, not by eye
- `eslint-plugin-jsx-a11y` at error level
- Unit tests for `resolveSettings()` covering every conflict in [02 §7](02-SETTINGS-REFERENCE.md)
- A focus-order snapshot test per key surface

Automated tools catch perhaps 30% of real issues. They are a floor and a regression guard,
never evidence of accessibility.

---

## 11. Acceptance criteria

- [ ] Skip links present, first in tab order, and correct under distraction-free mode
- [ ] One `<h1>` per page, no skipped levels
- [ ] Every row in the §3 focus table implemented via the shared hook and verified with a screen reader
- [ ] Exactly two live regions; no ad-hoc `aria-live` outside the announcer
- [ ] No announcement fires while typing; no duplicate between focus and announcement
- [ ] Focus indicator ≥ 3:1 under every tint, theme, and `muted_colors` combination — checked in CI
- [ ] Focus never obscured by sticky slot ② or a bottom bar
- [ ] Every drag-and-drop activity has a working keyboard path
- [ ] Every custom control in §6 exposes name, role, value, and state as text
- [ ] TTS and a screen reader can be used together without double-speaking; TTS always stops on navigation
- [ ] Nothing pulses, flashes, or loops under any preset
- [ ] A full lesson — including guided mode, a quiz, and an activity — completed end to end on NVDA, VoiceOver, and TalkBack
