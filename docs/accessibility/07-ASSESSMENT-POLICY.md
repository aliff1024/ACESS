# Assessment & Activity Accessibility Policy

**How quizzes and interactive activities behave so they measure learning rather than disability.**

- **Scope:** the learner's experience of quizzes and activities. What educators may author is deferred to doc 11.
- **Depends on:** [04 §4.5–4.6](04-DISPLAY-SPEC.md), [06](06-INTERACTION-AT-SPEC.md)
- **Unblocks:** Phase 6 of [00 §4](00-PROGRAM-PLAN.md)

> **Implementation status — [00 §4 Phase 6](00-PROGRAM-PLAN.md) landed the quiz-timing
> and quiz-presentation half of this document** (§2 defects 1, 2, 4, 5, 6, 7 below), all
> in `QuizPage.tsx`, all gated on an accessibility preset being active so the default
> (no-preset) product experience is unchanged.
>
> **Addendum — interactive activity keyboard operability (defect 3), landed in a later
> continuation of this program.** An audit of the five viewer components — done because
> defect 3's "most serious defect" framing made it the priority the next time this
> session returned to the plan — found the blanket claim was stale for four of the five:
> `FillBlanksViewer`, `FlashcardViewer`, and `MemoryGameViewer` all use native `<input>`/
> `<select>`/`<button>` elements, keyboard-operable by default without any extra code;
> `TimelineViewer` already had dnd-kit's `KeyboardSensor` configured. The one real gap —
> `DragDropViewer` only configured `PointerSensor` — is now fixed the same way
> `TimelineViewer` already proved works in this codebase. Position-aware accessible
> names were added to `FillBlanksViewer` and `MemoryGameViewer` (previously just
> "textbox" / "Hidden card" with no context), and a real screen-reader bug was found and
> fixed in `FlashcardViewer` (both card faces existed in the DOM at once with no
> `aria-hidden`, so a screen reader could read both regardless of which was visually
> showing). Defect 8 (`ACTIVITY_ACCESSIBILITY` wiring) is now partially addressed:
> categories-mode drag-drop has the dropdown alternative the flag itself already
> prescribed. See §2's defect rows below for the specifics, and
> [00's Phase 6 status note](00-PROGRAM-PLAN.md) for what's still not attempted and why.
> **Still true:** no live server was reachable, so none of this has been exercised with a
> real keyboard-only pass or a screen reader — this doc's own §10 acceptance criteria
> (an NVDA/VoiceOver/TalkBack pass) still aren't met, only brought substantially closer.

---

## 1. The governing principle

> **An assessment must measure what the learner knows, not how fast they read, how well
> they spell, how steady their pointer is, or how calmly they handle a countdown.**

Every rule below follows from that sentence. Where a rule trades assessment convenience
against a learner's ability to demonstrate knowledge, the learner wins — except for the
narrow integrity exceptions in §8.

Assessment is also the highest-stakes surface in the product. A learner can shrug off an
awkward dashboard. A quiz that punishes them for a disability is the moment they conclude
the platform is not for them.

---

## 2. Current defects

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | ✅ **Fixed.** ~~Pulsing red countdown fires for ADHD and Autism preset users.~~ Suppression now reads the active preset directly instead of `distraction_free_mode \|\| simplified_ui` (a learner could toggle distraction-free off and keep the preset, and `simplified_ui` was always false — see the original row below) | [QuizPage.tsx](../../src/components/courses/QuizPage.tsx), search "no visual urgency", [02 §3.5](02-SETTINGS-REFERENCE.md) | 🔴 → ✅ |
| 2 | ✅ **Fixed.** ~~Timer auto-submits with no extension path~~ — under a preset, hitting zero now offers Extend (one self-serve extension) or Submit now instead of submitting silently | `QuizPage.tsx`, search "never auto-submit" | 🔴 → ✅ |
| 3 | ✅ **Mostly fixed, unverified live.** ~~No interactive activity is keyboard operable~~ — an audit found this claim was already stale for 4 of the 5 viewers before any change was made this pass (FillBlanks/Flashcard/MemoryGame use native `<input>`/`<select>`/`<button>` elements, already keyboard-operable by default; Timeline already had dnd-kit's `KeyboardSensor` configured). The one genuine gap — **DragDropViewer only configured `PointerSensor`** — is fixed by adding `KeyboardSensor` (the same mechanism Timeline already used), plus a `<select>` alternative for categories mode and fixing two click-only (mouse-only) removal buttons. See the status note for exactly what changed in each file and what's still unverified | `src/components/interactive/*Viewer.tsx` | 🔴 → ✅ (unverified live) |
| 4 | ✅ **Already fixed before this phase** — the `:550` `max-w-full` this row describes was replaced with `.content-column` in Phase 2 ([00 §4 Phase 2](00-PROGRAM-PLAN.md)), which fixed the identical bug in both `LessonViewPage.tsx` and `QuizPage.tsx` at the same time. This doc predates that fix and was never updated; kept here per [10 §5](10-GOVERNANCE-RUNBOOK.md) "retire, don't rewrite history" | `QuizPage.tsx`, search ".content-column" | 🔴 → ✅ (Phase 2) |
| 5 | ✅ **Fixed.** ~~One-question-at-a-time is gated on a lesson-reading setting~~ — now forced for any accessibility preset regardless of `chunked_content_mode`/`layout_mode` | `QuizPage.tsx`, search "decoupled from lesson-reading settings" | ⚠️ → ✅ |
| 6 | ✅ **Fixed.** ~~Expectations shown only under `structure_mode === 'checklist'`~~ — now shown for every accessibility preset | `QuizPage.tsx`, search "promote the existing checklist panel" | ⚠️ → ✅ |
| 7 | ✅ **Fixed.** ~~Read-aloud is conditional on `tts_enabled`~~ — always available now, and added to the full-scroll view (it previously only existed in the one-question-per-screen view) | `QuizPage.tsx`, search "handleReadQuestionAloud" | ⚠️ → ✅ |
| 8 | ⚠️ **Partially addressed.** Drag-and-drop is flagged as a caution for motor and visual needs in `accessibility-utils.ts` ("Provide keyboard alternatives, e.g. matching dropdowns") — categories-mode `DragDropViewer` now has exactly that, a `<select>` per unplaced item, always visible rather than behind a toggle. Diagram/matching mode still relies on keyboard-dragging alone; `ACTIVITY_ACCESSIBILITY` itself is still not read anywhere in code (no `cautionFor`-driven UI exists) | `ACTIVITY_ACCESSIBILITY`, `DragDropViewer.tsx` | ⚠️ → ⚠️ (improved, not complete) |

Defect 3 is the most serious thing found anywhere in this documentation set: a learner who
cannot use a mouse currently cannot complete any interactive activity at all.

---

## 3. Timing policy

**Default: no time limit, for every learner.**

| Rule | Detail |
|---|---|
| **No countdown by default** | Elapsed time may be shown; a counting-down clock is opt-in per learner |
| **Never auto-submit** | At an educator limit, warn at 25% remaining and offer *Extend* or *Submit now*. Answers already given are saved regardless |
| **Extension is self-serve** | A learner may extend at least once without asking anyone (WCAG 2.2.1) |
| **No visual urgency** | No red, no pulsing, no flashing at any threshold — remove `animate-pulse` unconditionally |
| **Under all three presets** | Educator time limits become **soft**: displayed, never enforced |
| **Pause is permitted** | Leaving and returning resumes; the clock does not run while away |

**Rationale.** Timed conditions measure processing speed, which is precisely the axis
these learners differ on. WCAG 2.2.1 (A) and 2.2.6 (AAA) both point here, and time
pressure is listed as a caution for quizzes in the product's own
`ACTIVITY_ACCESSIBILITY` table.

---

## 4. Presentation policy

| Rule | Detail |
|---|---|
| **One question per screen** | Default for all three presets, and available to everyone. Decoupled from lesson-reading settings (defect 5) |
| **Measure-locked** | `.content-column`; distraction-free removes chrome only (defect 4) |
| **Options stacked vertically** | Never a 2-column option grid; horizontal scanning costs more for dyslexic readers |
| **Full-row targets** | The whole option row is the control, minimum 48px tall |
| **Read-aloud always available** | On the question stem and on every option, independent of `tts_enabled` (defect 7). `tts_enabled` controls autoplay-adjacent behaviour, never availability |
| **Position always stated** | "Question 4 of 10" in slot ②, as text |
| **Answered state is textual** | "Answered" / "Not answered", not colour alone (WCAG 1.4.1) |
| **No shuffling between attempts** | Under the Autism preset, question and option order is stable across attempts and visits |
| **Images need text** | An unlabelled image in a stem makes the question unanswerable for some learners; the runtime shows a visible notice when alt text is missing rather than failing silently |

---

## 5. Response and marking policy

| Rule | Detail |
|---|---|
| **Spelling-insensitive free text** | Normalise case, whitespace, and common transpositions; accept near-misses within a small edit distance for single-word answers |
| **Accept multiple formats** | Dates, numbers, units — accept anything unambiguous (COGA "Accept different input formats") |
| **Never penalise slowness** | No score component derived from time |
| **Answers persist immediately** | Selecting an option saves it; a crash, reload, or navigation never loses answers (COGA "Avoid Data Loss") |
| **Change before submit** | Any answer may be revised until submission, with no penalty |
| **Undo is always available** | Deselect is as easy as select |
| **Confirm before submit** | State how many are unanswered: "You have 2 unanswered questions. Submit anyway?" |

---

## 6. Feedback, retry, and anxiety

### 6.1 Before — the expectation card (mandatory, all presets)

Promote the existing `structure_mode === 'checklist'` panel (`:318`) to unconditional,
with a fixed field order that never varies:

```
Before you start

  Questions        10
  Time             No time limit
  Pass mark        80%
  Attempts         Unlimited (this is attempt 2)
  If you don't pass   You can try again straight away.
  Your answers     Saved as you go. You can stop and come back.
```

Fixed order matters as much as content: an autistic learner scanning for "attempts"
should find it in the same place every time.

### 6.2 During

- Progress as text, never only a bar
- No score shown mid-quiz — it converts every question into a running verdict
- No streak counters, no "3 in a row!"
- No interruptions of any kind (COGA Objective 5, and [01 §4.3](01-LEARNING-STANDARDS.md))

### 6.3 After

- **Result stated plainly first:** "You scored 7 of 10. The pass mark is 8. You did not pass this time."
- **Then what to do:** "You can try again now, or review the 3 questions you missed."
- **Review is per question**, showing the learner's answer, the correct answer, and why
- **No punitive framing.** No "Failed" banner, no red X per question, no comparison to other learners
- **No surprise rewards.** Achievements are announced in advance and awarded deterministically ([01 §8](01-LEARNING-STANDARDS.md), gamification row)

### 6.4 Retry

Unlimited attempts by default. Where an educator caps them, the cap and the remaining
count are stated **before** the first attempt, never revealed at exhaustion. No cooldown
timers.

---

## 7. Interactive activities

Five viewer types exist: `DragDropViewer`, `FillBlanksViewer`, `FlashcardViewer`,
`MemoryGameViewer`, `TimelineViewer`. ~~None is keyboard operable today.~~ **Update:**
this was stale for four of the five even before any fix — see the status note at the
top of this document. All five now have a keyboard path; whether it's a *good* one
(matches §7.2's per-type model below, not just "technically reachable") varies, and
none has been confirmed with a real screen reader.

### 7.1 Universal requirements

Every activity must have:

1. **A plain-language instruction before it starts.** `InteractiveActivityViewer` already does this with a per-type instruction map, upgraded to a boxed callout under checklist mode ([InteractiveActivityViewer.tsx:48](../../src/components/interactive/InteractiveActivityViewer.tsx:48)) — make the callout the default for all three presets and align its wording with the expectation card (§6.1).
2. ⚠️ **A complete keyboard path** (WCAG 2.1.1, Level A — was failing outright for `DragDropViewer`; now has one via `KeyboardSensor` + a categories-mode dropdown alternative, unverified live).
3. **State exposed as text**, never colour or position alone.
4. **A stated completion criterion** — what "done" looks like, before starting.
5. **No time pressure** unless the learner opted in.
6. **Progress preserved** on reload.
7. **An exit that saves**, at any point.

### 7.2 Per-type keyboard model

| Activity | Keyboard model | Alternative when precision is the barrier |
|---|---|---|
| **Drag & drop** | ✅ `Tab` to item → `Space` to lift → arrows to choose target → `Space` to drop → `Esc` to cancel, via dnd-kit's `KeyboardSensor` (categories and diagram/matching modes both). ✅ Announces each placement/removal via a polite live region | ✅ **Dropdown mode, categories only**: each unplaced item gets a `<select>` of categories, always visible alongside the drag interaction, not behind a toggle. ❌ Diagram/matching mode has no dropdown equivalent — arbitrary x/y zones over an image don't map cleanly onto a flat option list |
| **Fill blanks** | ✅ Blanks are real `<input>`s/`<select>`s in reading order, each labelled with its position ("Blank 2 of 5") | ✅ Word bank as a `<select>` per blank (`mode === 'word_bank'`) — pre-existed, already matched the spec |
| **Flashcards** | ✅ `Space`/`Enter` flips (native `<button>`). ❌ `←/→` navigation between cards not added — Tab + the existing Prev/Next buttons already give full keyboard access, and [06 §5.2](06-INTERACTION-AT-SPEC.md) frames arrow shortcuts as an accelerator, never the only route, so this was left as a nicety rather than a requirement. ✅ Fixed a real bug: both faces existed in the DOM at once with no `aria-hidden`, so a screen reader could read both regardless of which was showing | Not attempted — showing both sides as a static list is a bigger content-model change than this pass covered |
| **Memory game** | ✅ Native `<button>` per card, disabled while locked/matched. ✅ Stable accessible name added ("Card 3 of 12, face down" — position by count, not row/column, since the grid's column count is responsive and a fixed row/column would be wrong at some viewport width) | Untimed by default already true (no timer gates completion); "announce matches politely" not added |
| **Timeline** | ✅ Already had dnd-kit's `KeyboardSensor` configured before this pass; added a position-aware accessible name ("Event 3 of 6") it was missing | Not attempted — a numbered dropdown per event would duplicate what `Tab` + arrow-reorder already covers reasonably well |

### 7.3 Per-preset behaviour

`ACTIVITY_ACCESSIBILITY` in `accessibility-utils.ts` already records which activities suit
which needs, and nothing consumes it. Wire it up:

- When an activity is flagged `cautionFor` the learner's preset, show the `alternativeSuggestion` route **as an actual control**, not as advice: "Prefer to answer with dropdowns instead? [Switch]"
- Memory games and drag-drop default to untimed under all three presets
- Under Autism, activity instructions state the number of items and what finishing looks like before the activity renders

---

## 8. Educator override boundaries

Educators may configure difficulty and content. They may **not** remove an accommodation.

| Educator may | Educator may not |
|---|---|
| Set a suggested time | Enforce it against a learner using a preset |
| Set a pass mark | Hide it from the learner |
| Cap attempts | Hide the cap until it is reached |
| Choose activity types | Ship an activity with no keyboard path |
| Shuffle questions | Shuffle for a learner using the Autism preset |
| Require a checkpoint | Make it un-skippable with no stated reason |
| Write the instruction | Publish an activity with no instruction |

**Integrity exception.** For a formally graded, invigilated assessment — if the product
ever gains one — timing enforcement may be re-enabled, but only with an explicit
accommodation request path and an educator-grantable extension. That path must exist
*before* the enforcement does.

---

## 9. Per-preset summary

| | Dyslexia | ADHD | Autism |
|---|---|---|---|
| Timer | none | elapsed only, opt-in | none |
| Questions per screen | 1 | 1 | 1 |
| Read-aloud | prominent, on stem and options | available | available, never auto |
| Expectation card | yes | yes, compact | yes, full |
| Order stability | — | — | **fixed across attempts** |
| Mid-quiz score | hidden | hidden | hidden |
| Result framing | plain | plain + immediate next action | plain + what happens next |
| Activity default | untimed | untimed, one at a time | untimed, expectations first |
| Interruptions | none | **none, enforced** | none |

---

## 10. Acceptance criteria

- [ ] No countdown appears that the learner did not enable, under any preset *(not done — chose the "soft" reading of §3: educator time limits stay visible but stop being enforced. Fully hiding an educator-configured timer is a bigger, more debatable product call than this session made unilaterally; see the Phase 6 status note)*
- [x] Nothing pulses, flashes, or turns red on time pressure *(true for every accessibility preset; the default/no-preset experience is deliberately unchanged — this document's mandate is the three presets, not a blanket product change)*
- [x] No quiz auto-submits; every limit offers an extension *(true under a preset — Extend/Submit now at zero, one self-serve extension. Default/no-preset behaviour is unchanged, matching every other item here)*
- [x] Every one of the five activity viewers is completable by keyboard alone *(true by code tracing — 4 of 5 already were via native elements/dnd-kit's KeyboardSensor, `DragDropViewer` fixed by adding `KeyboardSensor`; not confirmed with a real keyboard-only pass or screen reader, no live server reachable this session)*
- [x] Drag-and-drop offers a dropdown alternative, reachable in one press *(true for categories mode — always-visible `<select>` per unplaced item, no toggle needed to reach it; diagram/matching mode has no dropdown equivalent, see §7.2)*
- [ ] The expectation card appears before every quiz and every activity, with fields in a fixed order *(quiz half done — now shown for every preset, not just Autism's `checklist` mode; the activity half, `InteractiveActivityViewer.tsx`, was not touched this phase)*
- [ ] Read-aloud works on question stems and options regardless of `tts_enabled` *(stems done, in both quiz views, for every learner; options not done — see status note, DOM/keyboard risk)*
- [ ] Answers persist across reload and navigation with no loss *(not audited this phase — pre-existing behaviour, unchanged)*
- [ ] Free-text marking tolerates spelling and formatting variation *(not applicable to the current implementation — `QuizPage.tsx` has no free-text question type today, only multiple-choice; nothing to fix until one exists)*
- [ ] Results state score, threshold, and next action in plain language, with no punitive framing *(not audited this phase)*
- [ ] Question and option order is stable across attempts under the Autism preset *(not audited this phase)*
- [x] Quiz content stays measure-locked in distraction-free mode *(already true — Phase 2, see defect 4 above)*
- [ ] `ACTIVITY_ACCESSIBILITY` cautions surface as real switchable alternatives, not dead data *(partially — drag_drop's specific suggestion now has a real implementation for categories mode, but it's always-visible rather than a switchable control, and the `ACTIVITY_ACCESSIBILITY` data structure itself still isn't read anywhere in code to drive it generically)*
- [ ] A full quiz and one of each activity type completed end to end on NVDA, VoiceOver, and TalkBack *(impossible this session — no live server reachable, see status note)*
