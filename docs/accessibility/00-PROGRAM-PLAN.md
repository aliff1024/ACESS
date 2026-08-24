# Accessibility Program Plan

**What the existing docs miss, what else to write, and the phased plan to get from
"a colour theme with bugs" to "an LMS a disabled learner would choose."**

- **Read first:** [README.md](README.md) for the doc map
- **This doc supersedes** the short phase list in [03 §9](03-PRESET-REDESIGN-PLAN.md), which becomes Phases 1–5 here
- **Status:** planning. No implementation should start before Phase 0 exits.

---

## 1. Are the three documents enough?

**No.** They are strong on one layer and silent on eight others.

What [01](01-LEARNING-STANDARDS.md), [02](02-SETTINGS-REFERENCE.md) and
[03](03-PRESET-REDESIGN-PLAN.md) actually cover is **the learner-runtime settings
layer**: what a preset should be, what each toggle does, how they conflict, and how the
three preset experiences should be rebuilt. That is real coverage of a real problem, and
it is roughly 40% of what makes an LMS usable for these learners.

Here is the honest gap map.

| # | Dimension | Covered? | Why it matters |
|---|---|---|---|
| **A** | **Content & authoring** | ❌ Not at all | Chunking splits on `<h2>` ([LessonViewPage.tsx:1137](../../src/components/courses/LessonViewPage.tsx:1137)). An educator who writes one wall of text with no headings silently disables chunking, checkpoints **and** guided mode for every learner. The best runtime in the world cannot fix unstructured content. |
| **B** | **Assessment accessibility** | ⚠️ Two sentences | Quizzes are where accommodation is most consequential and most legally exposed. Extended time, no-timer defaults, read-aloud stems, one-question-at-a-time, spelling-insensitive marking, retry policy — none specified. |
| **C** | **Assistive technology & semantics** | ❌ | Focus management, ARIA live regions, heading hierarchy, skip links, screen-reader testing. Guided mode *is* a focus-management feature and there is no focus spec for it. |
| **D** | **Co-occurring conditions** | ⚠️ One paragraph ([01 §8](01-LEARNING-STANDARDS.md)) | ADHD and dyslexia co-occur very often. The product lets you pick exactly **one** preset. There is a composition *rule* but no composition *feature*. |
| **E** | **Mobile & low-end devices** | ❌ | Every layout spec in [03 §3](03-PRESET-REDESIGN-PLAN.md) assumes desktop. Sticky Now Bar + reading toolbar + itinerary on a 375px screen is a genuine design problem, not a media query. |
| **F** | **Language & locale** | ❌ | The app ships `en` + `ms`. Every typography rule in [01](01-LEARNING-STANDARDS.md) is derived from English-language research. Malay is a *transparent orthography* — decoding difficulty presents differently. TTS voice quality for `ms-MY` is unverified. Easy-Read simplification in Malay has no source. |
| **G** | **Evidence & measurement** | ❌ | `trackAdaptation()` and the `adaptive_interactions` table exist and are barely used. There is no definition of what "this preset helped" looks like in data, so there is no way to know if any of this worked. |
| **H** | **Onboarding & recommendation ethics** | ⚠️ Principles only ([01 §9](01-LEARNING-STANDARDS.md)) | The onboarding flow asks for a diagnosis. It should ask about *barriers*. No design for that. |
| **I** | **Data model, privacy, migration** | ❌ | New settings need schema changes. Existing learners' saved values will be reinterpreted. Who may see a learner's accessibility profile — educator, admin, exports, RLS? Unspecified. |
| **J** | **Testing & CI** | ❌ | No automated a11y checks, no contrast gate, no regression tests for the resolver, no AT test matrix. Everything documented here will rot within two sprints without gates. |
| **K** | **Governance** | ⚠️ One line (the catalog idea) | No "how to add a setting" runbook, no PR checklist, no ownership. This is exactly how the current inconsistencies arose. |
| **L** | **Rollout & change management** | ⚠️ One risk row | Changing preset defaults changes a learner's interface without warning. For an autistic learner that is precisely the harm the preset exists to prevent. Needs a consent path. |
| **M** | **Educator & admin surfaces** | ❌ | [LessonAccessibilitySettings.tsx](../../src/components/educator/LessonAccessibilitySettings.tsx) exists but is unaudited. Educators have no feedback on whether their content is usable. |
| **N** | **Offline / poor network** | ❌ | The settings cache in `localStorage` can diverge from the server with no conflict resolution. Accessibility that fails to load is not accessibility. |
| **O** | **Component architecture** | ⚠️ One risk row | [LessonViewPage.tsx](../../src/components/courses/LessonViewPage.tsx) is 2,693 lines and holds most of the accessibility behaviour. Everything in Phases 3–6 lands in that one file. |
| **P** | **Compliance framing** | ❌ | Which standard is this product claiming to meet, at what level, and who signs that off? |

**Verdict.** The three docs are a good *specification of the settings system*. They are
not a plan for an accessible LMS. Sections 2–4 close that.

---

## 2. Documents to add

Seven more. Six are written; one is deferred. Each unblocks a specific later phase —
none is documentation for its own sake.

| Doc | Covers | Unblocks | Status |
|---|---|---|---|
| **[04 — Display Spec](04-DISPLAY-SPEC.md)** | Page-by-page information architecture: what goes in which slot, density budgets ("how much on one page"), per-preset and per-breakpoint layout, empty/loading/error states, the cross-page consistency contract | Phases 3–5 | written |
| **[05 — Customization UX](05-CUSTOMIZATION-UX.md)** | The settings panel redesign, in-context quick controls, setting row anatomy, preset chips and details dialog, barrier-based onboarding, preset composition | Phase 7 | written |
| **[06 — Interaction & AT Spec](06-INTERACTION-AT-SPEC.md)** | Landmarks and headings, skip links, the focus-management contract, live-region policy, keyboard model, custom-control requirements, TTS/screen-reader coexistence, the AT test matrix | Phases 2, 5, 6 | written |
| **[07 — Assessment Policy](07-ASSESSMENT-POLICY.md)** | Timing, presentation, marking tolerance, retry and feedback framing, per-activity keyboard models, educator override boundaries | Phase 6 | written |
| **[08 — Data, Privacy & Migration](08-DATA-PRIVACY-MIGRATION.md)** | The intent-vs-value split (`explicit_overrides`), real units, deprecation schedule, two-stage migration, cache and offline rules, privacy classification of disability data | Phase 2 | written |
| **[09 — Measurement Plan](09-MEASUREMENT-PLAN.md)** | Events to add, metric definitions, anti-metrics, baseline capture, learner research protocol and ethics | Phase 8 (baseline in Phase 0) | written |
| **[10 — Governance Runbook](10-GOVERNANCE-RUNBOOK.md)** | The five invariants, runbooks for adding/changing/retiring a setting, PR checklist, CI gates, ownership and audit cadence | Phase 9 (follow from Phase 1) | written |
| **11 — Content & Authoring Contract** | Educator-side: structural requirements for lessons, authoring aids, Easy-Read variants, media rules | Phase 6 | **deferred — planned separately** |

**Note on doc 11.** Its learner-facing half — what the runtime does when content violates
the contract — is specified as Phase 6 runtime resilience below and does not wait on the
educator plan.

---

## 3. Decisions required before any code

These block implementation. Each has a recommendation; the point is to decide
deliberately rather than discover the answer in a merge conflict.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Conformance target** | WCAG 2.2 AA / AA + selected AAA / 2.1 AA | **2.2 AA, plus 1.4.8, 2.2.6, 2.3.3, 3.2.5 as AAA extras** — those four *are* the cognitive ones |
| D2 | **Baseline browser/device floor** | Modern only / include low-end Android | **Include low-end Android**; it changes the motion, filter and font-loading decisions |
| D3 | **Can a learner combine presets?** | One at a time / stackable / preset + modifiers | **Preset + modifiers** in Phase 7 — a base preset plus independently toggled reading/focus modifiers |
| D4 | **Who authors Easy-Read content?** | Educator writes it / AI drafts + educator approves / out of scope | **AI drafts, educator approves, never auto-published** — anything else means the feature stays empty |
| D5 | **Are educator settings overridable by learners?** | Educator wins / learner wins / learner wins except assessment integrity | **Learner wins except assessment integrity** — and name the exact exceptions in [06] |
| D6 | **Does TTS use the browser API or a cloud voice?** | Web Speech only / cloud for `ms-MY` / hybrid | **Web Speech first**, evaluate `ms-MY` quality in Phase 0; cloud only if it fails |
| D7 | **Keep OpenDyslexic?** | Remove / keep as a choice / keep as default | **Keep as a choice, never the default, never labelled as evidence-based** ([01 §3.3](01-LEARNING-STANDARDS.md)) |
| D8 | **What happens to existing learners' settings?** | Silent migration / migrate + notify / opt-in | **Migrate to visually-identical values, then offer the improved defaults with a diff** ([03 §8](03-PRESET-REDESIGN-PLAN.md)'s dialog) |
| D9 | **Is disability type visible to educators?** | Yes / aggregate only / never | **Never individually; aggregate only, and only if it drives a real decision** |
| D10 | **Refactor `LessonViewPage` before or during?** | Before / during / never | **Before Phase 3** — extract the sequencer and settings reads into hooks first, no behaviour change |
| D11 | **Onboarding: diagnosis or barriers?** | Diagnosis dropdown / barrier questions / both | **Barrier questions**, with diagnosis strictly optional and never required to get support |
| D12 | **Age adaptation in scope?** | Now / Phase 7 / drop | **Phase 7** — the preset work is higher value and age currently affects only nav sizing |
| D13 | **Do we ship a "reduce everything" panic switch?** | Yes / no | **Yes** — a one-press low-stimulus mode reachable from any page; it is the "escape space" from [01 §5.2](01-LEARNING-STANDARDS.md) |
| D14 | **Minimum evaluation sample** | Heuristic only / 5–8 learners / 15+ | **5–8 learners per condition for usability, plus expert review** — enough for design decisions, and say so honestly rather than overclaiming |

---

### 3.1 Decision records

Per [10 §9](10-GOVERNANCE-RUNBOOK.md): "Any decision that changes learner experience,
deviates from [01](01-LEARNING-STANDARDS.md), or trades one group's needs against
another's gets a short record." Backfilled in Phase 9 for the real deviations made
across Phases 1–8, which existed only as scattered status-note prose until now. **Who
decided:** every record below was decided by this session's implementer, not a named
human accessibility owner — no such role has been assigned yet (§8 below). Treat these
as provisional, pending review by whoever takes that role.

| Date | Decision | Options considered | Rationale | What would change it |
|---|---|---|---|---|
| 2026-08-23 | Guided mode's chunk-count precondition (`showChunkNav`) replaced with a phase-count check (`guidedSteps.length > 1`) | (a) Leave as-is; (b) remove the precondition entirely; (c) replace it with a phase-count check | [02 §4.3](02-SETTINGS-REFERENCE.md) diagnosed the wizard chrome rendering while sequencing stayed inert on lessons with < 2 headings — the precondition was gating the wrong thing (content chunking, not phase sequencing). (b) risked always-on guided mode for single-phase lessons with nothing to sequence; (c) matches what the feature is actually for | A live screen-reader walkthrough finding the phase-count threshold wrong for a real lesson shape |
| 2026-08-23 | Quiz timer softening under a preset keeps the timer **displayed**, only removes auto-submit and visual urgency — does not hide an educator-set limit outright | (a) Hide the timer/limit entirely for preset learners, per [07 §3](07-ASSESSMENT-POLICY.md)'s "no time limit, for every learner" heading; (b) keep it displayed but non-punitive, per that same section's "time limits become soft: displayed, never enforced" body text | The doc's own heading and body aren't quite consistent; hiding a value an educator configured is a bigger product-policy call than a single session should make unilaterally without confirming intent with the educator side of that trade-off | An explicit decision from whoever owns educator-facing policy that (a) is actually intended |
| 2026-08-23 | `PresetDetailsDialog` footer is Cancel / Apply preset, not the Cancel / Preview / Apply specified in [03 §8.2](03-PRESET-REDESIGN-PLAN.md) | (a) Build a genuine third "Preview" state; (b) two buttons only | This codebase's settings modal already live-previews every local-state change instantly — there is no "preview without commit" state distinct from what happens on any other control, so a third button would have nothing unique to do. Reversibility instead comes from the modal's existing Cancel-reverts-everything behaviour | A settings-panel redesign ([05 §4](05-CUSTOMIZATION-UX.md)) that introduces a real staged-preview state for every control, not just presets |
| 2026-08-23 | `SETTING_CATALOG`'s `group` field uses the six-value taxonomy from [05 §4.4](05-CUSTOMIZATION-UX.md) (splitting out Listening and Language), not the four-value union first sketched in [03 §8.3](03-PRESET-REDESIGN-PLAN.md) | (a) Match 03 §8.3 exactly; (b) use 05 §4.4's later, more complete taxonomy | 05 postdates and explicitly refines 03 on this point ("Listening is promoted out of Reading... because it is a distinct modality"); building the catalog against the narrower type would need it widened again the moment a settings panel is actually built against 05 | A settings-panel redesign choosing a different grouping than either doc currently specifies |
| 2026-08-23 (originally 2026-08-23, Phase 1) | `muted_colors`'s `filter: saturate(0.6)` mechanism, which desaturates status/error colours along with everything else, was left unfixed across Phases 1–9 | (a) Fix now with a token-level chroma reduction; (b) leave as a documented, deferred gap | A correct fix requires converting dozens of literal Tailwind colour utility classes into a form a filter can exempt — larger and riskier than any single-session change without live visual/contrast verification, and this session never had a reachable dev server to verify a colour-system change against | A live browser session to verify the token conversion doesn't break contrast elsewhere |

---

## 4. The phased program

**Assumptions to correct if wrong:** one primary developer working part-time; effort
shown as calendar weeks at that rate; phases are sequential unless marked parallel.
Total ≈ 26–34 weeks, of which Phases 0–2 (≈ 8 weeks) are the ones that make everything
after them cheap.

---

### Phase 0 — Decide, document, and measure the "before"
**≈ 3 weeks · no product code**

**Goal.** Never start building on an undecided foundation, and make sure there is a
recorded baseline to prove improvement against.

| Workstream | Deliverable |
|---|---|
| Decisions | §3 decision log, answered and dated |
| Docs | Docs 04–10 written (done) and reviewed |
| Baseline audit | axe-core run on 8 key pages; contrast audit of every tint × preset × `muted_colors` combination; keyboard-only walkthrough of enrol → lesson → quiz → certificate; screen-reader smoke test |
| Baseline metrics | Instrument and capture current values for §6's metrics — **before** any fix, or the improvement is unprovable |
| Content sample | Audit 10 real lessons against the draft authoring contract (doc 11): how many have ≥ 2 `<h2>`? how many images lack alt text? This number decides how much of Phase 6 is needed |
| TTS spike | Test Web Speech `ms-MY` voice quality on Windows, Android and iOS (D6) |
| Device floor | Pick and acquire/emulate the low-end reference device (D2) |

**Exit criteria**
- [ ] All 14 decisions recorded with rationale
- [ ] Baseline report published with numbers, not adjectives
- [ ] Content audit says what fraction of existing lessons satisfy the structural contract
- [ ] Docs 04–10 reviewed and decisions reflected back into them

**Risk if skipped.** Every later phase re-litigates the same questions, and there is no
evidence any of it helped.

---

### Phase 1 — Truthfulness: make existing settings do what they say
**≈ 2 weeks · highest impact per line changed**

**Goal.** Before adding anything, stop the product from lying. Several controls are
currently inert; a learner dragging a dead slider learns that accessibility settings
don't work here.

Scope is exactly the ten fixes in [03 §9 Phase 1](03-PRESET-REDESIGN-PLAN.md):
spacing `!important` removal, word-spacing scale, legacy enum overrides, `base_preset`
gating, TTS autoplay, deprecated contrast filter, Soft Backgrounds scope, `muted_colors`
mechanism, spotlight blur, and the Autism container-width `??` bug.

Add one thing not in that list: **a temporary settings debug panel** (dev-only) showing
raw → effective values and which rule won. It pays for itself immediately and becomes
the resolver's test harness in Phase 2.

> **Status: 9 of 10 landed** (2026-08-23). Code changes: `globals.css`,
> `AccessibilityProvider.tsx`, `adaptive-engine.ts`, `LessonViewPage.tsx`. Verified by
> type-check and lint (both clean) and by reading the Tailwind Typography source to
> confirm the line-height cascade mechanism; **not yet verified in a live browser** —
> port 3000 was held by another session, and repointing it risked breaking Supabase
> OAuth callback URLs, so live verification is still owed. See
> [02's status note](02-SETTINGS-REFERENCE.md) for the itemised list. **`muted_colors`
> (item 8) deliberately deferred** to Phase 2/3 — it turned out to need a larger,
> riskier change than "no new UI" allows (see the note there); everything else shipped
> as planned, plus preset word/line-spacing defaults bumped to actually reach the
> WCAG 1.4.12 floors the new scale makes reachable.

**Exit criteria**
- [ ] Every control in the Reading tab visibly changes lesson text under every preset — recorded as a screen capture per preset *(fixed in code; screen capture still owed — no reachable preview this session)*
- [x] No surface starts audio, video or motion without a press *(TTS autoplay removed)*
- [x] Word and paragraph spacing meet the WCAG 1.4.12 floors at preset defaults, verified by computing the rendered values *(letter-spacing already met the floor via preset CSS; not yet devtools-verified live)*
- [x] Container width is identical across two courses with different educator layouts *(Autism `??`→`||` fix)*
- [ ] Contrast audit re-run: no regression, `muted_colors` no longer desaturates status colours *(deferred — see status note above)*

---

### Phase 2 — Foundations: one source of truth
**≈ 3 weeks · unglamorous, and everything after depends on it**

**Goal.** Stop the drift permanently by giving settings one definition, one resolver,
and one layout system.

| # | Work | Notes |
|---|---|---|
| 2.1 | `SETTING_CATALOG` ([03 §8.3](03-PRESET-REDESIGN-PLAN.md)) | label, plain description, why, source, helps, conflicts, requires |
| 2.2 | `resolveSettings()` + conflict notices | ⚠️ **partial** — see status note |
| 2.3 | `--content-measure` / `.content-column` | ✅ **done** |
| 2.4 | Three-way layout radio | ✅ **done** |
| 2.5 | **Extract `useLessonSequencer` + `useLessonAccessibility`** | from `LessonViewPage`, no behaviour change, per D10 — **not started** |
| 2.6 | Schema migration + value migration | per [08](08-DATA-PRIVACY-MIGRATION.md) — **not started** |
| 2.7 | **a11y CI gates** | axe on key routes, contrast check, ⚠️ resolver unit tests **exist but aren't wired to CI**, ESLint jsx-a11y — merge-blocking |
| 2.8 | Performance budget | font loading strategy, no global filters, bundle ceiling for the reference device — **not started** |

> **Status: 2.3 and 2.4 fully landed; 2.2 partially landed** (2026-08-23). Code:
> `globals.css` (`--content-measure` + `.content-column`, per-preset 62/66/66/72ch),
> `LessonViewPage.tsx` and `QuizPage.tsx` (both distraction-free `max-w-full` bugs fixed
> — measure now survives distraction-free mode in both), `AccessibilitySettingsModal.tsx`
> (Layout Mode is now one three-way control; the separate `chunkedContentMode` switch is
> gone, `chunked_content_mode` is derived from `layout_mode` everywhere it's saved).
>
> **`resolveSettings()` exists** (`src/lib/accessibility-resolver.ts`) and is **wired
> live** into `AccessibilityProvider` — it normalizes the layout_mode/chunked_content_mode
> split before `computeAdaptiveSettings` runs, and exposes `settingsConflicts` on
> context. It implements 4 of the 11 precedence rules in [02 §8](02-SETTINGS-REFERENCE.md)
> (one layout axis, slide unavailable under ADHD/Autism, ground-colour precedence,
> preset-customization notice) — the ones that were mechanically well-defined and safe
> to ship without the bigger, riskier changes the other 7 require (a real `sequencer`
> type replacing `focus_mode`/`step_by_step_enabled`, `tts_autoplay`/
> `transition_announcements` fields that don't exist in the schema yet, token-level
> chroma reduction). Nothing currently reads `settingsConflicts` — that's Phase 5/7's
> inline-notice UI ([05 §4.3](05-CUSTOMIZATION-UX.md)) — but the source of truth is live
> and correct now rather than being built to spec later.
>
> 18 unit tests in `scripts/test-accessibility-resolver.ts` (`npm run
> test:a11y-resolver`), covering every rule the resolver implements plus purity. Not
> yet wired into CI (no CI exists yet — that's 2.7/2.8, deferred).
>
> **Found in passing:** the onboarding wizard (`src/app/learner/onboarding/page.tsx`)
> has its own independent `chunkedContentMode` switch and never writes `layout_mode` at
> all — same defect class as 2.4, in a second place. Left unfixed here (onboarding's UI
> is Phase 7 scope), but `resolveSettings()` already safety-nets the data it produces:
> any row it saves gets normalized correctly the next time settings are read.
>
> **Not started:** 2.1 (catalog), 2.5 (hook extraction — deliberately not attempted
> without a reachable live preview to verify zero behaviour change on a 2,700-line
> component), 2.6 (schema migration), 2.8. 2.7 partially: unit tests exist, no CI
> pipeline to run them in yet.

**Exit criteria**
- [ ] No setting exists outside the catalog *(catalog not built yet)*
- [ ] All conflicts from [02 §7](02-SETTINGS-REFERENCE.md) either resolved or surfaced as a user-visible notice *(4 of 11 resolver rules shipped; conflicts are computed but not yet rendered anywhere)*
- [x] No learner surface exceeds 80ch at any font size, in any mode, including distraction-free *(`.content-column` + both distraction-free fixes — not yet devtools-verified live)*
- [ ] `LessonViewPage` under 1,800 lines with accessibility logic in hooks *(hook extraction not started)*
- [ ] CI blocks a PR that introduces a contrast or axe violation *(no CI pipeline yet; resolver tests exist and pass)*

---

### Phase 3 — Dyslexia: "The Reading Room"
**≈ 3–4 weeks · the preset with no identity today**

Per [03 §4](03-PRESET-REDESIGN-PLAN.md): `ReadingToolbar`, TTS with sentence
synchronisation and read-from-here, the dedicated dashboard branch, typography
correctness, reading-aid rework, reading-aware chunking.

Additions not in [03](03-PRESET-REDESIGN-PLAN.md):
- **Mobile reading toolbar** — a bottom bar on small screens, not a sticky top bar
- **TTS + screen reader coexistence** ([06 §7](06-INTERACTION-AT-SPEC.md)) — do not double-speak
- **`ms-MY` voice fallback** behaviour when no quality voice exists
- Per-paragraph "read from here" must be keyboard reachable, not click-only

> **Status: landed at reduced scope** (2026-08-23). Shipped: typography (`em`/`i` under
> the Dyslexia preset render as bold, not italic; `text-align: left !important` +
> `hyphens: manual` on lesson/quiz text — BDA Style Guide rules that had no
> enforcement before); Reading Spotlight no longer dims a chunk with fewer than 3
> blocks (previously it dimmed content that was already isolated); chunk/section labels
> now show an estimated reading time (`~N min`, ~200wpm, both `ChunkNavigation` call
> sites); **"read from here"** — clicking a paragraph while TTS is playing jumps
> reading to that paragraph (`speak()` now takes an optional override text;
> `ReadingSpotlight` gained `onBlockActivate`/`readAloudActive` props); the
> **`ReadingToolbar`** component exists and is wired into `LessonViewPage`, gated to
> `activePreset === 'dyslexia'` — Listen/speed, text size ±, a 3-step word-spacing
> cycle (Normal/Wide/Widest, the last landing exactly on the WCAG floor), a tint
> popover reusing `TintPicker`, and a spotlight toggle, all writing through
> `updateSettings` so changes persist immediately with no Save button; the
> **Dyslexia dashboard branch** exists (single column, one recommendation instead of a
> 3-card grid, no stat tiles) — `AdaptiveRecommendations` and `MyCoursesSection` each
> gained optional, backward-compatible `maxItems`/`singleColumn` props to support it,
> verified unaffected for their two other existing callers.
>
> **Two things landed differently than specced, deliberately:**
> - **Not sticky.** The toolbar renders in normal document flow, not `position:
>   sticky`. The header above it changes height on scroll (`isScrolled` state) and
>   pinning at a fixed offset without a live browser to verify against risked visibly
>   overlapping it. Noted in the component's own doc comment as a follow-up.
> - **"Read from here" is block-level (paragraph), not sentence-level**, and reuses
>   `ReadingSpotlight`'s existing block index rather than the Web Speech API's
>   `onboundary` event. Sentence/word-boundary behaviour is inconsistent enough across
>   browsers that verifying it correctly needed a live test matrix this session didn't
>   have; block-level reuses infrastructure that already works and degrades honestly
>   (no false claim of word-level sync).
>
> **Not attempted:** sentence-level TTS highlighting via `onboundary`; the mobile
> bottom-bar variant of the toolbar; TTS/screen-reader coexistence testing; `ms-MY`
> voice fallback UI; keyboard-reachable "read from here" (currently pointer/click
> only — the Listen button remains the fully keyboard-operable baseline, per the
> component's doc comment); the reading-ruler alternative to dimming; quiz/activity
> read-aloud (intentionally deferred to Phase 6, [07](07-ASSESSMENT-POLICY.md), to avoid
> duplicating that work here).
>
> **Found in passing:** `MyCoursesSection`'s card layout (banner image + badges) isn't
> actually a "list row" — `singleColumn` only removes the grid, so Dyslexia gets one
> wide card per row rather than the more compact list doc 04 §4.2 describes. A true
> list-row variant is a larger, separate change.

**Exit criteria**
- [ ] Every box in [01 §10 Dyslexia](01-LEARNING-STANDARDS.md) is checked *(typography/spacing boxes now pass on inspection; several need a live/AT check)*
- [x] The [03 §2](03-PRESET-REDESIGN-PLAN.md) test passes: strip the colours and it is still recognisably the Reading Room *(ReadingToolbar + single-column dashboard + time-labelled sections are all structural, not colour)*
- [ ] TTS highlights the spoken sentence, starts from any paragraph, never on its own *(2 of 3: starts from any paragraph ✅, never on its own ✅ — Phase 1; sentence-level highlight not built, see status note)*
- [ ] Works at 375px and at 400% zoom *(not verified — no reachable live preview this session)*

---

### Phase 4 — ADHD: "The Runway"
**≈ 3 weeks**

Per [03 §6](03-PRESET-REDESIGN-PLAN.md): the `NowBar` (which fixes the preset hiding its
own supports), dashboard sharpening, time-based chunking, interruption discipline,
prominent resume, the collapsed nav rail.

Additions:
- **Interruption policy is global, not per-preset** — enforce "no toast during an active task" for everyone; it is good for everyone and only *required* here
- **Non-blocking quiz timers** land here rather than Phase 6, because the Now Bar owns time display
- **Mobile Now Bar** — it competes with the browser chrome for the most valuable 64px on the screen; design it deliberately

> **Status: NowBar landed, at reduced scope** (2026-08-23). New component:
> `src/components/accessibility/NowBar.tsx`, wired into `LessonViewPage.tsx` gated on
> `activePreset === 'adhd' && effectiveFocusMode`.
>
> **A bug worse than the one this was scoped to fix was found while building it.** The
> known defect was "ADHD's forced focus mode hides the Task Checklist / Progress
> Timeline / Auto-Save it turns on" (`!effectiveFocusMode` gate around the supports
> block). Tracing the render tree to fix that surfaced a second, previously
> undocumented bug: the ADHD preset forces `effectiveFocusMode` on via
> `activePreset === 'adhd'` in its definition, but the *only* two header variants in
> `LessonViewPage` are gated on `!effectiveFocusMode` (the normal header) and on the
> raw `focusMode` state specifically (the "Focus Mode Slide Navigation" bar) — and
> ADHD's forced focus never sets that raw state, only the derived one. **The two
> conditions never overlapped for ADHD's actual default case**, so an ADHD-preset
> learner in a lesson got neither header: no lesson title, no back button, no
> orientation of any kind — combined with distraction-free mode also hiding the
> sidebar, effectively no chrome at all until they noticed a floating "Exit
> Distraction-Free Mode" button in the corner (from `LearnerShell.tsx`, unrelated to
> the lesson page itself).
>
> NowBar now fills that exact gap: it is the ADHD-forced-focus state's only header,
> carrying a back button (reusing the existing `onBack` prop the header already used),
> the current action derived from `lessonPhases` (e.g. "Read section 2 of 5", reusing
> the Phase 3 `currentChunkMinutes` estimate when the phase is content), a progress
> bar, the `AutoSaveIndicator` always visible, and an expand toggle revealing
> `TaskChecklist` + `ProgressTimeline` (both reused directly rather than
> re-implemented — their own internal `settings.*_enabled` gates already align with
> when the ADHD preset is active, so no duplicate gating logic was needed).
>
> **Sticky, safely** — unlike the Dyslexia `ReadingToolbar` (deliberately *not* sticky
> in Phase 3, because the header above it changes height on scroll), NowBar sits where
> `sticky top-0` is provably safe: nothing else occupies that position while it
> renders, because the two conditions are mutually exclusive by construction (traced
> above), not merely by observation.
>
> **Verification.** Type-check and lint both clean, zero new issues (same standard as
> every prior phase). **Live verification was attempted and blocked by environment
> issues unrelated to this code:** the documented seed credentials in
> `docs/SEED_CREDENTIALS.md` all returned "Invalid login credentials" (tried a learner
> account and the admin account); self-registration via `/signup` returned "Database
> error saving new user" server-side. Neither is caused by anything in this session's
> changes — both are pre-existing environment/infrastructure state. This is the first
> phase where a live dev server was actually reachable (port 3000 was free), so it is
> also the first phase where the gap between "verified statically" and "seen rendered"
> was attempted to be closed and could not be, for reasons outside this work.
>
> **Not attempted:** dashboard sharpening, time-based (3–7 min) chunking, interruption
> discipline enforcement, non-blocking quiz timers, the mobile Now Bar variant, the
> collapsed nav rail replacing full sidebar removal under distraction-free mode.

**Exit criteria**
- [ ] Every box in [01 §10 ADHD](01-LEARNING-STANDARDS.md) is checked *(several now plausibly pass; unverified live)*
- [x] Supports visible **simultaneously with** the content they scaffold, in every mode *(NowBar's expand panel; visible in the one state that was previously fully hidden)*
- [ ] ≤ 2 clicks from dashboard to resuming the last lesson *(not addressed this phase)*
- [ ] Nothing shifts position after first paint *(not measured — no live verification)*

---

### Phase 5 — Autism: "The Itinerary" + Guided Run
**≈ 4 weeks · the two are the same work**

Per [03 §5 and §7](03-PRESET-REDESIGN-PLAN.md): itinerary panel, transition
announcements, expectation cards, structural consistency, literal-language layer, sensory
fixes — and the single `sequencer` with the six-field step contract.

Additions:
- **Focus management** per [06](06-INTERACTION-AT-SPEC.md) — where focus goes on every advance, back, exit, and interruption. Guided mode is a focus feature and will fail for screen-reader users without this.
- **`aria-live` politeness policy** for transitions — announce once, do not stack.
- **Literal-language layer needs a `ms` counterpart**; do not ship English-only explicitness.
- **The "escape space"** panic switch from D13 lands here.

> **Status: reduced scope, landed** (2026-08-23). Code: `LessonViewPage.tsx`,
> `StepByStepGuidance.tsx`, `VisualSchedule.tsx`, `Sidebar.tsx`, `src/locales/{en,ms}.ts`.
> Shipped the two items [02 §4.3](02-SETTINGS-REFERENCE.md) diagnosed as the actual cause
> of "guided mode doesn't feel like it's helping": the wizard-chrome-vs-sequencing
> disagreement, and the missing disabled-Next explanation. Also shipped the Itinerary
> panel promotion from [03 §5.1](03-PRESET-REDESIGN-PLAN.md) and the sidebar
> double-numbering fix from [03 §5.4](03-PRESET-REDESIGN-PLAN.md).
>
> **The core bug.** Two components disagreed about whether guided mode was on: the
> `StepByStepGuidance` wizard chrome rendered on the raw `step_by_step_enabled` flag
> alone, while the actual sequencing gate (`guidedMode`, computed twice — once ahead of
> the component's early-return guards, once in the render body) additionally required
> `showChunkNav` (the lesson's body content having ≥ 2 `<h2>` headings). Those aren't the
> same precondition: `guidedSteps` is built from lesson *phases* (video/content/activity/
> quiz), which exist regardless of whether the content itself is chunked. So on any
> lesson with fewer than two headings, the wizard rendered a full step UI while nothing
> was actually being sequenced underneath it — exactly the "chrome renders, sequencing is
> inert" bug named in [02 §4.3](02-SETTINGS-REFERENCE.md). Fixed by replacing the
> `showChunkNav` precondition with `guidedSteps.length > 1` (at least two *phases* to step
> between; content-chunk navigation is a separate, still-independently-gated concern) in
> both copies of the computation, and gating the wizard chrome on the same `guidedMode`
> value instead of the raw setting. This closes the disagreement and, as a direct
> consequence, makes guided mode sequence correctly on a lesson with a single heading —
> the phase-level "Previous phase / Next phase" navigation already existed and was keyed
> off `lessonPhases`, not chunks; it was simply unreachable while `guidedMode` required
> `showChunkNav`. Every other read of `guidedMode` in the file was audited against the
> new, looser precondition and found to be independently gated wherever chunk-count
> mattered (`ChunkNavigation` and the checkpoint UI both require `showChunkNav`/
> `requireCheckpoint` at their own call sites).
>
> **Disabled Next now explains why**, per [03 §7.2](03-PRESET-REDESIGN-PLAN.md)'s "the
> disabled-Next explanation is mandatory" — a line of text ("Finish "X" to continue.")
> now renders under the button whenever it's disabled, wired to it with
> `aria-describedby` so a screen reader announces the reason.
>
> **The Itinerary panel** moved from the bottom of the lesson to the top
> (`LessonViewPage.tsx`, above the guided wizard and all content), and now shows every
> phase including already-completed ones (marked done, struck through, with a checkmark)
> rather than only what's left — `VisualSchedule` gained a `done` item state for this.
> Gated on `settings.visual_schedule_enabled` itself (as the component already checked
> internally) rather than hardcoded to the Autism preset, so it stays correct if a
> learner enables the setting manually under a different preset.
>
> **Sidebar double numbering resolved** ([03 §5.4](03-PRESET-REDESIGN-PLAN.md)): the
> Autism sidebar's "Step 1: Dashboard" … "Step 5: Settings" labels (plus "2.1"/"2.2"/
> "2.3" sub-items) competed with the dashboard's own independent 1–3 section numbering.
> Stripped the numeric prefixes from the sidebar's labels; numbering now exists in
> exactly one place per task (the dashboard's sections, the guided-run step counter).
>
> **Reduced from spec, deliberately — and why:**
> - **`SectionTransition` interstitial, full focus-management contract, and the
>   `aria-live` politeness policy — not attempted.** These need to be threaded through
>   the existing chunk/phase/checkpoint advance flow in a ~2,900-line component without
>   regressing Phases 1–4, and their correctness (does focus really land on the right
>   heading, does a live region really announce once without stacking) needs a running
>   page and a screen reader to verify, not just a type-checker. No live server was
>   reachable this session (see below) — shipping this now would mean shipping
>   unverified interaction/focus code, which every earlier phase declined to do when in
>   the same position.
> - **`ExpectationCard` — not attempted.** New UI repeated across lesson/section/
>   activity/quiz is larger than a single-session addition and overlaps materially with
>   [07-ASSESSMENT-POLICY.md](07-ASSESSMENT-POLICY.md) (Phase 6 scope) for its quiz/
>   activity instances.
> - **Literal-language `ms` locale layer — not attempted.** This is content-authoring
>   work (rewriting learner-facing copy against a style guide, in two languages), not a
>   code-behaviour fix, and needs a copy review this session doesn't have.
> - **Escape-space panic switch (D13) — not attempted.** A new, always-reachable,
>   cross-cutting global feature — closer to Phase 7's "settings discoverability" scope
>   than one preset's identity work, and would touch every page shell rather than
>   staying contained to the lesson view.
> - **Itinerary total-minutes intro line ("About N minutes in total") — built but not
>   wired up.** `VisualSchedule` accepts an optional `totalMinutes` prop; nothing
>   currently passes one, because the codebase only tracks a real duration estimate for
>   the content phase — inventing numbers for video/activity/quiz phases would be
>   exactly the kind of overclaiming Phase 1 of this program exists to remove.
> - **Itinerary doesn't collapse to a one-line summary once the lesson is underway** —
>   only the full pre-lesson panel is built; deciding *when* "underway" starts needed
>   judgment calls this session couldn't safely make unverified.
> - **`muted_colors` and `animation_level` under Autism — unchanged.** Same Phase 1
>   deferral as before; nothing in this phase changed the risk calculus (still needs a
>   broader Tailwind-color-to-token conversion and live contrast verification).
>
> **Verification.** Type-check and lint both clean, zero new issues (same standard as
> every prior phase) — confirmed by diffing lint output against a baseline, then
> manually auditing every line flagged as an error to confirm it falls outside this
> phase's edits (all pre-existing, from Phases 1–4's already-uncommitted work). The
> resolver's 18 unit tests still pass unchanged (this phase didn't touch the resolver).
> **No live verification was possible at all this session** — port 3000 was held by
> another chat's `next dev` process, and Next.js refuses to start a second instance
> against the same project directory outright (detected via its own `.next\dev\logs`
> lock, independent of port), so there was no way to get an independent server running
> without stopping another session's process, which was out of scope to do unilaterally.
> This is a harder block than Phase 4 hit (a login failure on a reachable server) — this
> phase has **zero** rendered confidence, only static analysis and manual trace-through
> of every `guidedMode` call site. Treat the guided-mode fix and the Itinerary panel as
> "should work by code reading," not "seen working."

**Exit criteria**
- [ ] Every box in [01 §10 Autism](01-LEARNING-STANDARDS.md) is checked *(not audited this phase)*
- [x] Guided mode sequences correctly on a lesson with **one** heading (the current failure case) *(fixed in code — the `showChunkNav` precondition that blocked this is gone; not seen running, see status note)*
- [x] Every disabled Next explains why *(`StepByStepGuidance.tsx` — not seen running)*
- [ ] Screen-reader walkthrough of a full guided lesson passes on NVDA and VoiceOver *(no live server reachable this session — see status note)*
- [x] Only one numbering system visible at a time *(sidebar numbering removed; dashboard's task-sequence numbering is the sole remaining one — not seen running)*

---

### Phase 6 — Content, authoring & assessment
**≈ 3–4 weeks · the phase that makes the runtime work on real lessons**

This is where the biggest untouched risk lives. Everything in Phases 3–5 assumes
well-structured lessons.

| Workstream | Work |
|---|---|
| Runtime resilience | Paragraph-count chunking fallback when a lesson has < 2 `<h2>`; generated section labels; never silently disable a feature |
| Authoring aids | Accessibility score in the lesson editor; blocking publish check for missing alt text and captions; heading-order and reading-level warnings |
| Easy-Read | Storage for alternate simplified content; the drafting and approval flow (D4); wire `preferred_reading_level` to real content instead of just `simplified_ui` |
| Assessment | [07](07-ASSESSMENT-POLICY.md) in full: no-timer defaults, read-aloud stems, one question per screen, keyboard alternatives for drag-drop, spelling-insensitive marking, expectation cards |
| Educator surfaces | Audit and fix `LessonAccessibilitySettings`; explain to educators what each control does *for a learner* |
| Backfill | Remediate the existing course catalogue against the contract |

> **Status: Assessment workstream only, reduced scope** (2026-08-23). Code:
> `QuizPage.tsx`, `src/locales/{en,ms}.ts`. This phase as specced spans six workstreams
> (runtime resilience, authoring aids, Easy-Read, assessment, educator surfaces,
> catalogue backfill) — a multi-week effort. This session picked the single
> highest-value, safely-verifiable slice: the quiz-side defects in
> [07-ASSESSMENT-POLICY.md §2](07-ASSESSMENT-POLICY.md), all gated on an accessibility
> preset being active (default/no-preset behaviour is untouched, consistent with every
> prior phase never changing the baseline product for its own sake).
>
> **Fixed (07 §2 defects 1, 2, 5, 6, 7 — defect 4 was already fixed in Phase 2, the doc
> was stale on that point):**
> - **No more pulsing/red countdown under any preset.** The old suppression condition
>   (`distraction_free_mode || simplified_ui`) was broken exactly as [07 §2](07-ASSESSMENT-POLICY.md)
>   describes — `simplified_ui` is false in every preset's defaults, and
>   `distraction_free_mode` is a preset *default*, not a lock, so turning it off brought
>   the pulse straight back. Now gated on the preset itself.
> - **Timer no longer silently auto-submits under a preset.** Reaching zero now shows a
>   dialog offering one self-serve extension (25% of the original limit, floored at a
>   minute) or "Submit now" — answers already given are preserved either way, same as
>   before. A separate inline banner appears at 25% of the original time remaining,
>   before zero, also offering the extension. Default (no-preset) behaviour — hard
>   auto-submit at zero — is unchanged.
> - **One question per screen is now forced for every preset**, independent of the
>   lesson's own `chunked_content_mode`/`layout_mode` — this matters most for Autism,
>   whose lesson-reading default is `layout_mode: 'scroll'` (predictable, non-chunked)
>   while still needing one-question-at-a-time in quizzes specifically, per
>   [07 §4](07-ASSESSMENT-POLICY.md)'s "decoupled from lesson-reading settings."
> - **The expectation panel** ("This quiz contains N questions...") now shows for every
>   preset, not only when `structure_mode === 'checklist'` (Autism's default) — Dyslexia
>   and ADHD learners previously started a potentially timed task with zero stated
>   expectations.
> - **Read-aloud on the question stem no longer requires `tts_enabled`.** It's a
>   standalone, harmless affordance now available to every learner in both quiz views
>   (it previously only existed in the one-question-per-screen view at all).
>
> **Reduced from spec, deliberately — and why:**
> - **Interactive activity keyboard operability (07 §2 defect 3) — not attempted.**
>   [07's own words](07-ASSESSMENT-POLICY.md): "the most serious thing found anywhere in
>   this documentation set." Not attempted anyway, because it's five separate keyboard
>   models (drag-drop with a dropdown fallback, real `<input>`s for fill-blanks, flip/nav
>   for flashcards, grid nav for memory game, reorder for timeline) across five files
>   this session hadn't read, each one genuinely unverifiable without a keyboard and a
>   screen reader on a running page — [07 §10](07-ASSESSMENT-POLICY.md) itself requires
>   an NVDA/VoiceOver/TalkBack pass before calling this done. Building five untested
>   keyboard-interaction surfaces in one session, several touching drag gestures, is a
>   materially bigger risk than anything else this program has shipped blind so far.
>   This is next in line by severity — flagged, not silently dropped.
> - **`ACTIVITY_ACCESSIBILITY` wiring (07 §2 defect 8) — not attempted.** Downstream of
>   the activity keyboard work above; wiring "switch to dropdown mode" as a real control
>   only makes sense once the dropdown mode itself exists.
> - **"No countdown at all, ever" reading of §3 — not implemented.** Chose the narrower,
>   safer "soft" reading instead (timer stays visible, stops being punitive) — see
>   [07's acceptance criteria](07-ASSESSMENT-POLICY.md) for the full reasoning. Fully
>   suppressing an educator's configured timer for preset learners is a bigger product
>   policy call than a single session should make unilaterally without confirming intent.
> - **Per-option read-aloud — not attempted.** Options are currently rendered as a
>   single `<button>` per row (the whole row is the click target). Nesting a second
>   `<button>` inside it for read-aloud is invalid HTML and would break screen-reader
>   semantics; doing this properly means restructuring each option to a
>   `<div role="radio">` + separate button, which is exactly the kind of keyboard/ARIA
>   surface area deferred above for the same reason.
> - **Runtime resilience, authoring aids, Easy-Read pipeline, educator surfaces audit,
>   catalogue backfill — not attempted.** Each is its own multi-day workstream (a lesson
>   editor accessibility score and blocking publish checks; a simplified-content storage
>   and drafting/approval flow per D4; an audit of `LessonAccessibilitySettings`;
>   remediating the existing course catalogue) unrelated to the code touched this
>   session. Untouched, not regressed.
>
> **Verification.** Type-check and lint both clean, zero new issues (same standard as
> every prior phase) — `QuizPage.tsx` lint output compared line-by-line against the
> pre-edit warnings (unused `activeTab`/`setActiveTab`, a missing-dependency warning on
> an untouched effect, four `<img>`-vs-`next/image` warnings on pre-existing image
> renders) and none fall inside this session's edits. The resolver's 18 unit tests still
> pass (untouched by this phase). **No live verification was possible** — same
> environment block as Phase 5 (another chat's `next dev` holds this directory
> outright, not just the port; see that phase's status note for detail). The timer
> state-machine change (extend/submit-now/auto-submit) is verified by tracing every
> path through the new branches by hand, not by watching a countdown actually reach
> zero on screen — treat it as "should work by code reading," same caveat as Phase 5.
>
> **Addendum, landed later in this program: interactive activity keyboard operability.**
> The user asked for a full-plan status check and, on finding real gaps, directed this
> session to prioritise the highest-severity one before anything else — this defect,
> named by [07-ASSESSMENT-POLICY.md](07-ASSESSMENT-POLICY.md) itself as "the most
> serious thing found anywhere in this documentation set."
>
> **Audited before writing any code**, per this program's own discipline — and the
> audit found the blanket "none is keyboard operable" claim was already false for 4 of
> the 5 viewers: `FillBlanksViewer` (native `<input>`/`<select>`), `FlashcardViewer`
> (native `<button>`), and `MemoryGameViewer` (native `<button>`) were all
> keyboard-operable by default already, just without position-aware accessible names.
> `TimelineViewer` already had dnd-kit's `KeyboardSensor` configured for its sortable
> mode. The one real, structural gap — `DragDropViewer` configured only `PointerSensor`,
> so Tab reached items (dnd-kit's `useDraggable` supplies `role`/`tabIndex` by default)
> but Space/arrows did nothing — was fixed by adding `KeyboardSensor`, the exact
> mechanism already proven working elsewhere in this same codebase (`TimelineViewer`),
> rather than inventing new keyboard-drag logic from scratch.
>
> **What shipped, per file:**
> - `DragDropViewer.tsx`: `KeyboardSensor` + `closestCenter` collision detection added;
>   two click-only (mouse-only) removal controls converted from `<div onClick>` to real
>   `<button>`s with `aria-label`s; a `<select>`-based alternative added for categories
>   mode (every unplaced item can be assigned directly, no drag needed) — the exact fix
>   `accessibility-utils.ts`'s `ACTIVITY_ACCESSIBILITY` data had prescribed for drag_drop
>   without anything implementing it; a polite live region announcing placements/
>   removals; and, as a side effect of properly typing `DroppableDiagramZone` (it was
>   typed `any`), a pre-existing lint error and an unused-variable warning were fixed too.
> - `FillBlanksViewer.tsx`: every blank got a position-aware `aria-label` ("Blank 2 of
>   5") plus `aria-invalid`/`aria-describedby` linking to its correct-answer hint —
>   previously a screen reader had no way to know which blank it was on.
> - `MemoryGameViewer.tsx`: every card got a stable, position-aware `aria-label` ("Card
>   3 of 12, face down/face up/matched") — previously just "Hidden card" with no
>   position, or the raw answer text with no state.
> - `FlashcardViewer.tsx`: a real bug fix, not just a labelling gap — both card faces
>   exist in the DOM simultaneously (`backface-visibility: hidden` is visual-only), and
>   without `aria-hidden` toggling with flip state, a screen reader had no reason not to
>   read both sides regardless of which was showing. Fixed. Arrow-key navigation between
>   cards was **not** added — Tab plus the existing Prev/Next buttons already give full
>   keyboard access, and [06 §5.2](06-INTERACTION-AT-SPEC.md) frames shortcuts as an
>   accelerator, never the only route, so this stayed a nicety rather than a fix.
> - `TimelineViewer.tsx`: added the position-aware accessible name its already-working
>   `KeyboardSensor` setup was missing ("Event 3 of 6").
>
> **Reduced from spec, deliberately:**
> - **Diagram/matching-mode drag-drop has no dropdown alternative** — arbitrary x/y
>   zones over an educator-uploaded image don't map onto a clean list of options the
>   way named categories do; it relies on the new `KeyboardSensor` alone.
> - **`ACTIVITY_ACCESSIBILITY` still isn't read anywhere to drive this generically** —
>   the categories-mode dropdown is a direct, hand-built implementation of what that
>   data structure already prescribed for `drag_drop` specifically, not a general
>   "cautionFor → show alternative" wiring that would apply to future activity types.
> - **Nothing here has been exercised with a real keyboard-only pass or screen
>   reader.** No live server has been reachable since Phase 5. Unlike most of this
>   session's other unverified changes, though, the core fix (`KeyboardSensor`) is a
>   documented, widely-used library feature already proven working in the same file set
>   (`TimelineViewer`) rather than hand-rolled logic — a stronger basis for confidence
>   than most "should work by code reading" claims in this document set, but still not
>   the same as having watched it work.
>
> **Verification.** Type-check clean across all five files. ESLint: 0 errors on every
> file; every remaining warning (image-optimisation suggestions, pre-existing
> `useMemo`/`useEffect` dependency warnings) confirmed pre-existing by diffing against
> each file's committed version at `HEAD` — for `DragDropViewer.tsx` specifically, that
> baseline diff showed this pass *net-fixed* one pre-existing lint error and one
> pre-existing warning (the `any`-typed, partly-unused `DroppableDiagramZone` props),
> not just avoided adding new ones. The resolver's 18 tests and the catalog's 234
> assertions both still pass, unaffected.

**Exit criteria**
- [ ] A lesson that violates the structural contract still chunks, still guides, still reads aloud *(not attempted — runtime resilience workstream untouched)*
- [ ] Publishing is blocked on missing alt text and captions *(not attempted — authoring aids workstream untouched)*
- [ ] No quiz imposes a countdown under any preset *(not fully done — chose the narrower "soft" reading: the timer display remains for an educator-configured limit, but auto-submit and visual urgency are gone under every preset. See status note for why hiding the timer outright wasn't done unilaterally)*
- [x] Every interactive activity has a keyboard-only path *(true by code tracing, per the addendum above — 4 of 5 already did, `DragDropViewer` fixed; not confirmed with a real keyboard-only pass or screen reader)*
- [ ] ≥ 90% of the existing catalogue satisfies the contract *(not audited — backfill workstream untouched)*

---

### Phase 7 — Transparency, onboarding & composition
**≈ 3 weeks**

| Workstream | Work |
|---|---|
| Preset Details dialog | [03 §8](03-PRESET-REDESIGN-PLAN.md) in full, generated from the catalog, with the current-settings diff |
| Onboarding rebuild | Barrier-based questions instead of a diagnosis dropdown (D11); recommend, never auto-apply; always skippable |
| **Composition** | Base preset + independent modifiers (D3), using the composition rule in [01 §8](01-LEARNING-STANDARDS.md); the "most conservative wins, except measure" logic |
| Change management | The migration consent flow (D8) — show existing learners what would change, let them accept or keep current |
| Age adaptation | D12, if in scope |
| Settings discoverability | Reachable from anywhere, not only the sidebar; and the D13 panic switch surfaced |

> **Status: Preset Details dialog only, reduced scope** (2026-08-23). Code:
> `src/components/accessibility/PresetDetailsDialog.tsx` (new),
> `AccessibilitySettingsModal.tsx`. Of six workstreams (Preset Details dialog,
> onboarding rebuild, composition, migration consent, age adaptation, settings
> discoverability + panic switch), this session shipped the one with the most
> concrete, testable exit criterion: **"no preset applies without the learner seeing
> what it changes."**
>
> **What shipped.** Clicking a preset chip in the settings modal
> (`AccessibilitySettingsModal.tsx`, the "Quick Apply Preset" row) used to call
> `handleApplyPreset()` directly — instant, no description, no diff, exactly the
> [05 §2](05-CUSTOMIZATION-UX.md) problem #6 ("applying a preset is instant and
> irreversible-looking"). It now stages the click in a `pendingPresetId` state instead
> and opens `PresetDetailsDialog`, which shows: the preset's name and goal; a "what this
> turns on" list drawn from `ACCESSIBILITY_PRESETS[id].additional_features` (already
> existed, e.g. "Text-to-Speech, Reading Spotlight" for Dyslexia); for ADHD and Autism
> specifically, a note that slide view becomes unavailable under this preset (a real,
> code-enforced behaviour — `LessonViewPage.tsx`'s `isSlideMode` forces it off for both,
> confirmed in code before writing the copy — that doesn't show up in a settings diff
> because it isn't a stored value); and "Changes from your current settings," which
> **wires up `getPresetDiff()`** (`adaptive-engine.ts`) — [03 §8.2](03-PRESET-REDESIGN-PLAN.md)
> had already flagged this function as "existing but currently unused" before this
> session touched it. Only the dialog's own "Apply preset" button actually applies;
> "Cancel" leaves every local setting untouched.
>
> **A necessary refactor, done in passing.** Building an accurate diff meant knowing
> exactly what the modal's current *local* state is (which may already differ from the
> saved `settings` from context — e.g. a learner drags a slider, then clicks a preset
> chip). The object literal that captured this was previously constructed inline, once,
> only inside the live-preview `useEffect`. Extracted it to a named, `useMemo`'d
> `currentLocalSettings`, read by both that effect and the new dialog. This incidentally
> fixes a latent inefficiency: the inline version was a fresh object on every render with
> no memoization; the effect's own dependency array (the ~28 individual state variables)
> already prevented it from *re-running* needlessly, but extracting it without
> memoizing would have made `currentLocalSettings` fail an object-identity comparison
> every render, which is exactly what `useMemo` here avoids.
>
> **Reduced from spec, deliberately — and why:**
> - **Only trigger point 1 of 2** ([03 §8.1](03-PRESET-REDESIGN-PLAN.md)) — the settings
>   modal's preset chips. Trigger point 2, the onboarding wizard's `PresetCard`
>   (`src/app/learner/onboarding/page.tsx`), is a separate flow with its own
>   already-documented, independent bugs (§7 of this document, "found but not fixed" in
>   [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)) and wasn't touched.
> - **No `SETTING_CATALOG`-sourced "why"/"source" per setting.** The catalog itself
>   (Phase 2 item 2.1) was never built — still not started, unchanged since Phase 2's own
>   status note. The dialog draws only from data that already existed and was already
>   verified accurate (`additional_features`, `getPresetDiff()`), rather than
>   hand-writing a parallel "why" text per setting that would drift from
>   [01-LEARNING-STANDARDS.md](01-LEARNING-STANDARDS.md) the next time either changed —
>   exactly the failure mode [03 §8.3](03-PRESET-REDESIGN-PLAN.md) names the catalog as
>   existing to prevent.
> - **No separate "Preview" step distinct from "Apply."** [03 §8.2](03-PRESET-REDESIGN-PLAN.md)'s
>   three-button footer (Cancel / Preview / Apply) assumes a preview-without-committing
>   state that doesn't exist in this codebase's architecture — the modal already
>   live-previews every local-state change the instant it happens. "Apply preset" here
>   sets that same local state, which the existing preview effect immediately reflects —
>   the change is visible right away, same as any other control — and reversibility
>   comes from the whole modal's pre-existing
>   Cancel-reverts-everything behaviour, same mechanism every other control in the panel
>   already relies on. Two buttons instead of three, but no loss of reversibility.
> - **Everything else in [05-CUSTOMIZATION-UX.md](05-CUSTOMIZATION-UX.md) — not
>   attempted:** Tier 1 quick controls (the doc's own words: "the largest single UX
>   gap" — but a new always-on-screen UI surface, similar risk profile to the Zone A
>   work deferred in Phase 5, needing live verification this session didn't have); the
>   full settings-panel redesign (two-pane layout, search, per-row conflict notices from
>   `resolveSettings().conflicts` — which has sat unconsumed since Phase 2 — diff
>   markers with per-setting Reset, freezing the panel against its own preview); the
>   onboarding barrier-question rebuild (D11); preset composition, base + modifiers
>   (D3 — a genuine architecture change, replacing single-preset selection with a
>   layered model, comparable in size to the `sequencer` type change Phase 5 also
>   declined to build without live testing); the migration consent flow (D8 — no
>   existing infrastructure to detect and diff a learner's prior settings against new
>   defaults); age adaptation (D12 — the docs' own recommendation is to keep this out of
>   scope, unchanged here); settings discoverability and the D13 "escape space" panic
>   switch (deferred in Phase 5 for the same reason it's deferred here — a new,
>   always-reachable global feature touching every page shell, not contained to one
>   surface).
>
> **Verification.** Type-check clean. ESLint on both touched files: 0 errors, 2
> pre-existing warnings on `AccessibilitySettingsModal.tsx` (an unused `availableVoices`
> var, and a missing-dependency warning on the untouched "sync local state when the
> modal opens" effect) — both confirmed present before this session's edits by tracing
> which effect each belongs to; `PresetDetailsDialog.tsx` itself: 0 errors, 0 warnings.
> The resolver's 18 unit tests still pass (untouched this phase). **No live
> verification was possible** — re-checked immediately before starting this phase,
> same environment block as Phases 5 and 6 (another chat's `next dev` still holds this
> directory outright). The dialog's diff logic is verified by tracing `getPresetDiff()`'s
> existing, already-tested-by-nothing-but-reading logic against each preset's actual
> settings object, and the `isSlideMode` claim by reading its exact definition in
> `LessonViewPage.tsx` before writing the copy that states it — not by opening the
> dialog on screen. Same "should work by code reading, not seen working" caveat as every
> phase since live testing became unavailable.

**Exit criteria**
- [x] No preset applies without the learner seeing what it changes *(true for the settings-modal trigger; the onboarding trigger is untouched and still applies presets a different way — see status note)*
- [ ] Onboarding never requires disclosing a diagnosis to receive support *(not attempted — onboarding rebuild untouched)*
- [ ] A learner can run "Dyslexia + ADHD focus" and get a coherent result *(not attempted — composition/modifiers untouched, a single preset is still the only choice)*
- [ ] No existing learner's interface changed without their acceptance *(not attempted — migration consent flow untouched)*

---

### Phase 8 — Evaluation with real learners
**≈ 4 weeks · can start recruiting during Phase 5**

**Goal.** Find out whether any of this actually helped, from the people it is for.
Everything before this is informed opinion.

| Workstream | Work |
|---|---|
| Expert review | Heuristic evaluation against [01 §10](01-LEARNING-STANDARDS.md) by someone who did not build it |
| AT testing | The full [06 §10](06-INTERACTION-AT-SPEC.md) matrix, on real devices |
| **Learner testing** | 5–8 participants per condition (D14), task-based, think-aloud, per [09](09-MEASUREMENT-PLAN.md)'s protocol and consent requirements |
| Quantitative | Compare §6 metrics against the Phase 0 baseline |
| Educator testing | Can an educator produce a contract-compliant lesson without help? |
| Synthesis | What worked, what did not, what to change — and publish the negative results too |

> **Status: not executable by this session, one instrumentation event shipped instead**
> (2026-08-23). Asked the user directly how to handle this phase, because — unlike
> Phases 1–7 — nothing here is resolvable by reading code or writing more of it: every
> workstream needs something an autonomous coding session structurally cannot supply.
>
> - **Expert review** requires "someone who did not build it" ([09 §7](09-MEASUREMENT-PLAN.md))
>   — this session *is* the implementer for Phases 1–7, so it's explicitly disqualified
>   from providing this, not merely under-resourced for it.
> - **Learner testing** needs 5–8 real participants per condition, recruited through
>   disability support services, with informed consent, compensation, and a moderator
>   running 45-minute think-aloud sessions ([09 §6](09-MEASUREMENT-PLAN.md)). None of
>   that exists in this environment.
> - **AT testing** needs NVDA, VoiceOver, and TalkBack on real devices — this session has
>   had no live server reachable since Phase 5 (another chat's `next dev` holds this
>   directory outright), let alone screen-reader hardware.
> - **The quantitative baseline is the sharpest problem.** [09 §5](09-MEASUREMENT-PLAN.md)
>   and its own §9 acceptance criterion #1 require the baseline to be captured *before
>   any Phase 1 fix lands* — Phase 0 was never run (still "❌ Not started" in
>   [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) §1), and Phases 1–7 have
>   already shipped in this program. There is no way to retroactively produce a
>   "before Phase 1" measurement now. This isn't a scope reduction like every other
>   phase's — it's a window that closed permanently several phases ago, and pretending
>   otherwise here would be exactly the kind of overclaiming Phase 1 of this program
>   exists to eliminate.
>
> **What shipped anyway.** One `§3.1` event, `preset_applied` — a new
> `trackSettingsEvent()` in `adaptive-engine.ts`, called from
> `AccessibilitySettingsModal.tsx`'s `handleApplyPreset` (fired only on confirmed
> apply, i.e. every recorded event was previewed via Phase 7's `PresetDetailsDialog`
> first). It reuses the existing `adaptive_interactions` table — which has no
> structured-properties column — by encoding which preset was applied directly in the
> event string (`preset_applied:dyslexia`) rather than adding a real payload column,
> because a schema migration isn't something this session could verify against a live
> database. This can't retroactively create the missing baseline, but it means
> evaluation *from this point forward* has real data instead of none — the one piece of
> Phase 8 that turned out to be genuinely codeable without people, hardware, or an
> independent reviewer.
>
> **Deliberately not attempted, alongside it:**
> - **`setting_changed`** — would need a paired tracking call at every one of
>   `AccessibilitySettingsModal.tsx`'s roughly 28 `onChange` handlers, several of them
>   sliders that fire rapidly enough to need debouncing to avoid flooding the table. A
>   wide, error-prone change across a file already carrying real user-facing logic,
>   not safe to make without a live server to confirm it behaves and doesn't spam.
> - **`preset_abandoned`** ("applied then reverted within 24h") is a metric *derived*
>   from a sequence of `preset_applied` events over time, not something a single
>   client-side call can honestly fire in the moment — building it needs a query or
>   dashboard, not another instrumentation call.
> - **`disabled_control_activated`** (e.g. pressing the disabled Next in
>   `StepByStepGuidance.tsx`, fixed in Phase 5) can't be wired via a click handler at
>   all — native `disabled` buttons never fire click events, so tracking attempted
>   presses needs an architecture change to an already-shipped, already-verified
>   control. Not worth risking blind, for one analytics beacon, with no way to confirm
>   the control still behaves correctly afterward.
>
> **User confirmed this direction directly** (asked via a clarifying question rather
> than assumed, since it's a judgment call about resourcing this session cannot make on
> its own): ship the minimal analytics slice, document the rest as blocked on human
> resources, then continue to Phase 9.
>
> **Verification.** Type-check clean. ESLint: `adaptive-engine.ts` 0 problems;
> `AccessibilitySettingsModal.tsx` 0 errors, the same 2 pre-existing warnings carried
> since Phase 7 (confirmed unchanged, not newly introduced). The resolver's 18 tests
> still pass. **The insert itself is unverified against a live database** — the column
> shapes match `database.types.ts` and the function mirrors `trackAdaptation()`'s
> already-working pattern exactly (same table, same swallowed-failure discipline), but
> whether Supabase RLS policies or constraints on `adaptive_interactions` accept this
> row has not been, and could not be, confirmed live this session.

**Exit criteria**
- [ ] Every acceptance checklist verified by someone other than the implementer *(cannot be done by this session — it is the implementer)*
- [ ] Learner sessions completed and findings triaged into fix / backlog / won't-fix *(not attempted — needs real learner recruitment)*
- [ ] Before/after metrics reported honestly, including where nothing improved *(the honest report is: no "before" was ever captured, so no before/after comparison is possible for this program — stated here rather than fabricated)*
- [ ] Top findings fixed and re-tested *(not applicable — no findings exist without the research this phase couldn't run)*

---

### Phase 9 — Governance & handover
**≈ 1 week, then ongoing**

[10](10-GOVERNANCE-RUNBOOK.md) in force: the "add a setting" runbook, the PR checklist, merge-blocking CI,
ownership, a quarterly audit, and a documented process for retiring a setting. Plus a
short accessibility statement naming the conformance target (D1), known gaps, and a
contact route for learners to report barriers.

> **Status: catalog, checklist, and statement landed; merge-blocking CI and ownership
> not attempted** (2026-08-23). Code: `src/lib/accessibility-catalog.ts` (new),
> `scripts/check-setting-catalog.ts` (new), `PresetDetailsDialog.tsx`,
> `src/app/accessibility-statement/page.tsx` (new), `Footer.tsx`,
> `.github/pull_request_template.md` (new), `package.json`. Docs:
> `00-PROGRAM-PLAN.md` (this section, plus §3.1 decision records), `10-GOVERNANCE-RUNBOOK.md`.
>
> **`SETTING_CATALOG` built** ([10 §2](10-GOVERNANCE-RUNBOOK.md) invariant #1, referenced
> as "not started" since Phase 2 item 2.1 in every phase's status note up to this one).
> 21 real, currently learner-facing settings, each with `label`/`group`/`plain`/`why`/
> `source`/`helps`, sourced from [02 §9](02-SETTINGS-REFERENCE.md)'s already-written copy
> table where one existed rather than inventing new UI text and risking drift. A
> `CATALOG_EXCLUDED_KEYS` map documents, with a reason each, the fields deliberately left
> out (legacy write-only mirrors, derived values, profile bookkeeping) — this is what
> makes the completeness check below actually enforceable instead of just aspirational.
> **Not wired into a settings-panel redesign** ([05 §4](05-CUSTOMIZATION-UX.md)) — that's
> a much larger UI change needing live verification this session doesn't have — but it
> is a real, consumed dependency, not a second unused artifact next to `getPresetDiff()`:
> `PresetDetailsDialog.tsx`'s field labels now read from it directly.
>
> **Catalog completeness check, and it runs.** `scripts/check-setting-catalog.ts`
> (`npm run test:a11y-catalog`) verifies every field on `AccessibilitySettingsData` is
> either catalogued or has a documented exclusion reason, and that every catalog entry
> has its required fields — 234 assertions, 0 failures, actually run this session
> (unlike most of this phase, this one didn't need a live browser). This is [10 §7](10-GOVERNANCE-RUNBOOK.md)'s
> "Catalog completeness" gate as a script; **not wired into an actual CI pipeline**, because
> no CI exists in this repo yet — see below for why the rest of §7's gates weren't attempted.
>
> **Truthfulness carried into the catalog itself.** `muted_colors` and
> `keyboard_navigation_enabled` — both known-broken, per Phase 1 item 8 (deferred) and
> [02 §4.6](02-SETTINGS-REFERENCE.md) respectively — got a `knownGap` field stating the
> actual current behaviour instead of `plain`/`why` copy that oversells what the code
> does. A catalog that describes aspirational behaviour would recreate exactly the
> defect class Phase 1 of this whole program exists to remove, just one layer higher up
> (in the data that's supposed to prevent it, rather than in the CSS).
>
> **PR template added** (`.github/pull_request_template.md`) with [10 §6](10-GOVERNANCE-RUNBOOK.md)'s
> exact checklist, scoped to only appear as required for PRs touching accessibility
> paths (stated in an HTML comment, since GitHub's template mechanism has no path-based
> conditional templates without a bot). **Cannot be verified working** — GitHub only
> renders a PR template when a PR is actually opened against a GitHub-hosted repo, which
> this session has no way to do.
>
> **Accessibility statement published** (`/accessibility-statement`, linked from the
> site footer next to Privacy/Terms) — [10 §11](10-GOVERNANCE-RUNBOOK.md)'s exact
> required content: conformance target, what's supported, known gaps stated honestly,
> a report-a-barrier link (reusing the existing `/contact?category=accessibility` route),
> and a review date. States "targets," never "conforms to" WCAG 2.2 AA — no independent
> audit has been run, and Phase 8 already established that no AT testing has happened at
> all; a page whose whole purpose is honesty about limitations cannot itself overclaim.
> The response-time commitment is left as an explicit placeholder rather than an invented
> number — that's a real organisational commitment this session has no authority to make.
>
> **Decision records backfilled** ([00 §3.1](#31-decision-records) above) — five records
> covering the genuine deviations made across Phases 1–9, in the runbook's exact format.
> Marked provisional: decided by this session's implementer, not a named accessibility
> owner, because no such role has been assigned (see below).
>
> **Not attempted, and why:**
> - **The other nine [10 §7](10-GOVERNANCE-RUNBOOK.md) CI gates** (resolver correctness
>   beyond the existing unit tests, static/runtime a11y via `eslint-plugin-jsx-a11y` and
>   axe-through-Playwright, the contrast matrix, measure assertions, focus-order
>   snapshots, motion grep, i18n script, performance budget) — most need a running page
>   to test against (Playwright driving a real browser, axe evaluating rendered DOM,
>   contrast computed from actual rendered colours). No live server has been reachable
>   since Phase 5; shipping a CI config that has never actually run would risk either
>   silently passing without checking anything, or blocking every future PR on a broken
>   pipeline — worse than not having it yet. Building it is squarely a "needs a
>   reachable dev environment" item, the same category as the AT-testing work deferred
>   in Phases 5–8.
> - **A named accessibility owner and a scheduled quarterly audit** — real organisational
>   decisions (who, and a committed cadence) that this session has no authority to make
>   on the user's behalf. Left as explicit placeholders (in the statement page and
>   implicitly in [10 §8](10-GOVERNANCE-RUNBOOK.md)'s existing table) rather than
>   inventing a name or a date.
> - **Onboarding's separate `PresetCard` trigger, still not wired to the details
>   dialog** — carried over from Phase 7, unrelated to this phase's scope, still true.
>
> **Verification.** Type-check clean. ESLint 0 errors across every touched file; the 2
> warnings on `AccessibilitySettingsModal.tsx` are the same 2 carried since Phase 7
> (untouched by this phase's edits, confirmed unchanged). The resolver's 18 tests and
> the new catalog script's 234 assertions both pass. **No live verification of the
> statement page or footer link was possible** — same environment block as every phase
> since 5 (another chat's `next dev` still holds this directory outright, reconfirmed
> immediately before writing this note). The new page's route, imports, and JSX were
> verified by type-check and lint only, not by loading `/accessibility-statement` in a
> browser — treat it with the same "should work by code reading" caveat as everything
> else this session shipped blind.

**Exit criteria**
- [x] A new contributor can add a setting correctly by following the runbook alone *(the runbook's §3 steps are now backed by a real catalog to add an entry to, and a script that catches a missing one — not fully proven without a live contributor actually trying it)*
- [ ] CI blocks the classes of regression catalogued in [02 §7](02-SETTINGS-REFERENCE.md) *(not attempted — no CI pipeline exists; the catalog-completeness check runs standalone but isn't merge-blocking anywhere)*
- [ ] Quarterly audit scheduled with an owner *(not attempted — needs a real organisational decision)*
- [x] Accessibility statement published *(published at `/accessibility-statement`, dated, honest about gaps — not yet seen rendered live)*

---

## 5. Cross-cutting workstreams

These run continuously rather than sitting in one phase. Give each an owner in Phase 0.

1. **Automated a11y in CI** — established in Phase 2, extended every phase. The single strongest defence against re-rot.
2. **Performance budget** — every accessibility feature is also a payload. Track it from Phase 2; the reference device is the arbiter.
3. **Learner research panel** — recruit early, involve throughout, not just at Phase 8. COGA explicitly asks for users in research, design *and* testing.
4. **Content remediation** — begins in Phase 6 but the backlog should be built during Phase 0's audit.
5. **Copy review** — plain language and literalism apply to every string added in every phase, in both languages.
6. **Documentation currency** — docs 01–09 are updated in the same PR as the behaviour they describe. Enforced by the Phase 9 checklist.

---

## 6. Success metrics

Define these in [09](09-MEASUREMENT-PLAN.md), instrument in Phase 0, and report against baseline in Phase 8.

**Leading indicators — is the system working?**

| Metric | Signal |
|---|---|
| Setting churn per learner per week | High churn means the preset defaults are wrong for them |
| Preset abandonment rate | Applied then reverted within a session = the preset felt worse |
| Distance from preset defaults | How much learners customise tells you which defaults are miscalibrated |
| TTS session length and start position | Whether reading support is actually used, and from where |
| Guided-mode completion vs exit rate | The direct test of whether Guided Run helps |
| Support visibility rate | % of lesson time the Now Bar / itinerary was on screen |

**Lagging indicators — did learning improve?**

| Metric | Caveat |
|---|---|
| Lesson completion rate by preset | Confounded by course difficulty; segment carefully |
| Time-to-complete by preset | **Slower can be better** — do not optimise this blindly |
| Return rate / days-active | The most honest engagement signal |
| Quiz attempts before pass | Fewer is not automatically better if timers were removed |
| Drop-off point distribution | Where learners abandon, before vs after |

**Qualitative — the ones that matter most**

- Task success rate in learner testing
- Assistance requests during testing
- Self-reported effort (a single-item scale, before and after)
- Verbatims: does anyone say the product feels made for them?

**Anti-metrics — do not optimise these:** time on page, clicks, feature adoption
counts. An accessibility feature succeeding often *reduces* engagement metrics, because
the learner stopped struggling.

---

## 7. Sequencing rules

Hard dependencies. Breaking these is how the current state happened.

```
Phase 0 ──► Phase 1 ──► Phase 2 ──┬──► Phase 3 (Dyslexia) ──┐
                                   ├──► Phase 4 (ADHD)      ─┼──► Phase 7 ──► Phase 8 ──► Phase 9
                                   └──► Phase 5 (Autism)    ─┘        ▲
                                              Phase 6 ───────────────┘
```

- **Phase 2 gates 3, 4 and 5.** Building three preset identities on top of an unresolved settings layer means building each conflict three times.
- **Phases 3, 4, 5 are parallelisable** if more than one developer exists — they touch different components once Phase 2's hooks land.
- **Phase 6 must precede Phase 8.** Testing the runtime on non-compliant content measures the content, not the runtime.
- **Phase 7 must follow 3–5.** The Preset Details dialog must describe the redesigned behaviour, or it documents the broken state.
- **Phase 1 must precede the Phase 0 baseline being *closed*** — capture the "before" numbers first, then fix.
- **Do not start Phase 3 before D10** (the `LessonViewPage` extraction), or three phases of work land in a 2,700-line file simultaneously.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Content is worse than assumed and Phase 6 dominates the schedule | High | High | The Phase 0 content audit sizes this before committing; runtime fallbacks reduce the dependency |
| Scope creep — "while we're in here" | High | Medium | Exit criteria are the contract; anything else goes to backlog |
| `LessonViewPage` becomes unmergeable | Medium | High | D10 extraction first; parallel phases touch different files |
| Learner recruitment fails | Medium | High | Start in Phase 5; have an expert-review fallback and report the limitation honestly |
| Malay TTS quality is unusable | Medium | Medium | Phase 0 spike; if it fails, D6 escalates to a cloud voice or the feature is scoped to `en` with a stated limitation |
| Preset changes upset existing learners | Medium | High | D8 consent flow; never change an active learner's interface silently |
| Docs drift from behaviour again | High | High | `SETTING_CATALOG` + Phase 9 PR checklist; this is the specific failure being designed against |
| Performance regression on low-end devices | Medium | Medium | Budget from Phase 2; reference device is the arbiter, not a laptop |
| Over-claiming results from a small sample | Medium | Medium | D14 sets expectations up front; report limitations explicitly |
| Accessibility features themselves become inaccessible (toolbar not keyboard reachable, live regions spamming) | Medium | High | Doc 05 is a gate on Phases 3–5, not an afterthought |

---

## 9. Definition of done for the program

1. Every acceptance box in [01 §10](01-LEARNING-STANDARDS.md) is verified by someone who did not implement it.
2. Every 🔴 in [02 §7](02-SETTINGS-REFERENCE.md) is resolved or has a documented, deliberate exception.
3. The [03 §2](03-PRESET-REDESIGN-PLAN.md) test passes for all three presets: remove the colours, the preset is still identifiable from its structure.
4. A lesson that violates the authoring contract still works — degraded, never broken.
5. No setting exists outside `SETTING_CATALOG`; no catalog entry lacks a conflict declaration.
6. CI blocks the regression classes catalogued in [02 §7](02-SETTINGS-REFERENCE.md).
7. Real learners from each of the three groups completed a full course path in testing, and their findings were acted on.
8. Metrics are reported against the Phase 0 baseline, including where nothing improved.
9. An accessibility statement is published naming the conformance target, the known gaps, and how to report a barrier.
10. A learner can turn all of it off in one press and still have a working LMS with their progress intact.
