# How Dyslexic, ADHD and Autistic Learners Actually Learn

**A standards-and-research guide for the ACESS accessibility presets.**

This is the *source of truth* for every design decision in the accessibility system.
When a preset value is questioned ("why 0.16em word spacing?", "why is the sidebar
frozen for Autism?"), the answer belongs here — not in a component.

- **Status:** guide / normative for this project
- **Applies to:** `src/lib/adaptive-engine.ts`, `src/app/globals.css`, `src/providers/AccessibilityProvider.tsx`, and every learner-facing surface
- **Companion docs:** [02-SETTINGS-REFERENCE.md](02-SETTINGS-REFERENCE.md) (what each setting does + conflicts), [03-PRESET-REDESIGN-PLAN.md](03-PRESET-REDESIGN-PLAN.md) (the redesign)

---

## 0. How to use this document

1. Every accessibility setting must trace to a rule in §3–§6. If it cannot, it is decoration — cut it.
2. Every preset default must cite the numeric rule it implements. §7 is the lookup table.
3. When two conditions want opposite things (§8), the preset — not the codebase — picks a side.
4. The acceptance checklist in §10 is what "done" means for a preset.

---

## 1. The three layers of obligation

| Layer | What it is | Status for us |
|---|---|---|
| **WCAG 2.2 A/AA** | Legal/normative accessibility floor. Mostly sensory and motor. | **Must pass.** Non-negotiable. |
| **WCAG 2.2 AAA (selected)** | Stricter criteria that happen to be exactly what cognitive users need — line length, no interruptions, no timing. | **Must pass for the three presets.** They are the whole point of a preset. |
| **W3C COGA — *Making Content Usable*** | 8 objectives / ~60 design patterns for cognitive and learning disabilities. Explicitly *supplemental* to WCAG because WCAG 2.x under-serves cognition. | **This is our actual specification.** |

> COGA exists because WCAG's normative criteria "address accessibility barriers that
> were not included in the current normative WCAG 2.x" for cognitive users. A product
> can be fully WCAG AA conformant and still be unusable for a dyslexic, ADHD, or
> autistic learner. Our presets live in that gap.

### 1.1 The WCAG criteria this product is actually judged on

| SC | Level | Requirement (exact) | Where it binds us |
|---|---|---|---|
| **1.4.3** Contrast (Minimum) | AA | 4.5:1 body text, 3:1 large text | Every tint × `muted_colors` combination |
| **1.4.8** Visual Presentation | AAA | Line width **≤ 80 characters**; **no justified text**; line spacing ≥ 1.5 within paragraphs; paragraph spacing ≥ 1.5× line spacing; user-selectable foreground/background | The measure and width spec (§7) |
| **1.4.12** Text Spacing | AA | Line height **≥ 1.5×** font size; space after paragraph **≥ 2×** font size; letter spacing **≥ 0.12×** font size; word spacing **≥ 0.16×** font size — with no loss of content | Our sliders must *reach* these, not stop below them |
| **2.2.1 / 2.2.6** Timing | A / AAA | Adjustable or no time limits; warn about data loss | Quiz timers, session state |
| **2.2.2** Pause, Stop, Hide | A | Motion longer than 5s must be pausable | Carousels, animated progress |
| **2.3.3** Animation from Interactions | AAA | Interaction-triggered motion can be disabled | `animation_level` |
| **3.2.3 / 3.2.4** Consistent Navigation / Identification | AA | Same order, same names, everywhere | The Autism preset's core promise |
| **3.2.5** Change on Request | AAA | No context change without user request | No autoplay TTS, no auto-advance |
| **3.3.7** Redundant Entry | A (2.2) | Do not ask for the same information twice | Resume / auto-save |

**The 1.4.12 numbers are floors, not targets.** WCAG explicitly says authors are
"encouraged to allow spacing to surpass the values specified, not see them as a
ceiling." A preset whose *default* sits below 0.16em word spacing is failing its own
users.

### 1.2 COGA objectives, translated

| # | COGA Objective | Our translation |
|---|---|---|
| 1 | Help users understand what things are and how to use them | Every step states what to do, in imperative plain language |
| 2 | Help users find what they need | One primary action per screen; **break media into chunks** |
| 3 | Use clear and understandable content | Literal language, short sentences, **white spacing**, summaries |
| 4 | Help users avoid mistakes and know how to correct them | **Content does not move unexpectedly**; always allow back; **avoid data loss and timeouts**; clear step-by-step instructions; feedback |
| 5 | **Help users focus** | **Limit interruptions**; **short critical paths**; **avoid too much content**; tell the user what a task involves *before* they start |
| 6 | Ensure processes do not rely on memory | Progress is externalised on screen, never remembered |
| 7 | Provide help and support | Reminders; state the result of an action before it happens |
| 8 | **Support adaptation and personalisation** | The preset system itself — and it must stay overridable (§9) |

Objective 5 is the ADHD preset. Objective 4 is the Autism preset. Objective 3 is the
Dyslexia preset. Objective 8 is the settings modal. That mapping is the architecture.

---

## 2. Universal Design for Learning (the pedagogy frame)

UDL asks for multiple means of **engagement**, **representation**, and **action and
expression**. In an LMS that is concrete:

- **Representation** — the same lesson available as text *and* audio *and* chunked *and* summarised. This is why TTS, chunking, and simplified summary are settings rather than features of one preset.
- **Action and expression** — a learner may demonstrate understanding by quiz, activity, or completion; never by one modality only.
- **Engagement** — the learner controls pacing and can see why they are doing this.

A preset is a *pre-configured UDL profile*, not a different product.

---

## 3. Dyslexia

### 3.1 The mechanism

Dyslexia is a phonological-processing difference, not a vision problem. The cost shows
up as **decoding effort**: reading is slower and consumes working memory that would
otherwise go to comprehension. Two consequences drive every rule below.

1. **Visual crowding hurts disproportionately.** Tight tracking, long lines, and dense blocks increase fixation errors and line-loss on the return sweep.
2. **Reading fatigue is cumulative.** A learner may read paragraph one fine and paragraph five badly. Design for paragraph five.

### 3.2 What the standards say

**British Dyslexia Association, *Dyslexia Style Guide 2023*** — the typography reference:

| Property | BDA recommendation |
|---|---|
| Typeface | **Sans serif** (Arial, Verdana, Century Gothic, Tahoma, Trebuchet, Calibri, Open Sans) — letters appear less crowded |
| Size | 12–14pt, i.e. **16–19px**; larger on request |
| Line spacing | Larger spacing improves readability, proportional to inter-word spacing; **~1.5 / 150%** |
| Inter-letter spacing (tracking) | **~35% of average letter width** |
| Inter-word spacing | **at least 3× the inter-letter spacing** |
| Alignment | **Left-aligned. Never justified** — justification creates "rivers" of white space and uneven word gaps |
| Colour | Dark text on **off-white / cream**; avoid pure white (glare) and avoid green/red/pink pairings |
| Emphasis | **Bold**. Never italic, never ALL CAPS, never underline for emphasis |
| Structure | Short paragraphs, headings, bullets, generous white space |

BDA's tracking-to-word-spacing ratio and WCAG 1.4.12 agree with each other: 0.12em
letter spacing × 3 ≈ 0.36em is the generous end, and 0.16em word spacing is the floor.
**Anything below 0.16em word spacing is not a dyslexia setting.**

### 3.3 The "dyslexia font" question — settle it here

There is **no reliable evidence that OpenDyslexic (or similar weighted-bottom
typefaces) improves reading speed or accuracy** over a good standard sans-serif.
Controlled comparisons have repeatedly found no advantage, and the BDA itself
recommends ordinary sans-serifs. **Atkinson Hyperlegible** is a defensible default
because it is engineered for letterform disambiguation (I/l/1, O/0, b/d/p/q) — which
*is* a real dyslexia failure mode — without the novelty cost.

**Product rule:** ship Atkinson Hyperlegible as the Dyslexia default; keep
OpenDyslexic as a *user choice*, because learner preference is legitimate even without
an effect size; and never claim in UI copy that OpenDyslexic is "the dyslexia font".

### 3.4 What actually helps, in rough effect-size order

1. **Bimodal presentation — text plus synchronised audio.** Text-to-speech with the spoken word or sentence visually highlighted is the best-supported reading accommodation. TTS *without* visual sync is much weaker: it becomes listening, not reading.
2. **Controlled measure.** 50–70 characters per line. Long lines cause return-sweep errors.
3. **Spacing**, per §3.2.
4. **Chunking by heading**, with a visible "section 3 of 7" so re-finding your place is free.
5. **Reduced glare** — a cream or off-white ground.
6. **A reading-position aid** — a ruler or spotlight band. It must **not blur** surrounding text; blurring increases decoding effort for exactly the population being helped. Dim by opacity only.

### 3.5 Anti-patterns — do not ship

- Justified text; italic emphasis; ALL-CAPS labels; underlined non-links
- A pure `#FFFFFF` page ground under a dyslexia preset
- Line lengths that grow with viewport width (any full-width content column)
- Timed reading, word counts, or "reading speed" metrics
- Auto-playing audio (see §6)
- Text over images or low-contrast decorative backgrounds

---

## 4. ADHD

### 4.1 The mechanism

ADHD is an **executive-function and self-regulation** difference: working memory, task
initiation, sustained attention to low-salience material, time perception, and delay
tolerance. The learner usually *knows* what to do and cannot reliably *start, hold, or
resume* it.

The design consequence is counter-intuitive. The fix is not "make it exciting". It is
**move the executive function out of the learner's head and onto the screen.**

### 4.2 What the research supports

- **Chunking is the core instructional lever.** Grouping content into small units reduces extraneous cognitive load and frees working-memory capacity — and, critically, it creates **frequent completion points**, which supply the reinforcement that sustains engagement. This is also COGA's "Break Media into Chunks" and "Avoid Too Much Content".
- **Externalising executive function** — checklists, visible progress, visual timers, saved state, colour-coded structure — compensates directly for the working-memory deficit. Direct working-memory *training* shows weak transfer to academic outcomes; **compensatory environmental design is the better-supported route.**
- **Short critical paths.** Every extra decision between "I want to learn" and "I am learning" is a failure point.
- **Interruptions are expensive.** Recovering an interrupted task costs disproportionately more. COGA Objective 5's "Limit Interruptions" is a hard rule here, not a nicety.
- **Delay aversion.** Feedback arriving at the end of a 40-minute lesson does not function as feedback. Confirm each chunk.

### 4.3 Design rules

| Rule | Concrete form |
|---|---|
| **One next action, always visible** | A persistent "Now:" bar naming the current step, plus a single primary button |
| **The path is short** | ≤ 2 clicks from dashboard to learning; no interstitial choice screens |
| **Progress is externalised and permanent** | Step counter and progress bar that never scroll out of view |
| **State is never lost** | Auto-save on every interaction; explicit "you stopped at step 3 — continue?" |
| **A chunk is 3–7 minutes of content** | Split on `<h2>`; label as "section 2 of 5 · ~4 min" |
| **Confirm every chunk** | Immediate, small, non-animated completion feedback |
| **Nothing appears or moves on its own** | No toasts mid-task, no layout shift, no auto-advance |
| **Time is made visible, never imposed** | Show elapsed and remaining; never a countdown the learner did not ask for |
| **Reduce, do not hide** | Secondary items collapse behind one labelled disclosure; hiding them entirely destroys the mental model |

### 4.4 Anti-patterns

- Imposed countdown timers on quizzes — WCAG 2.2.1/2.2.6 and ADHD both say no
- Notifications, streak nags, or idle prompts during a task
- Burying the checklist or progress support *below* the content it is supposed to scaffold
- Gamification that adds decisions (choose an avatar, spend points) rather than confirming progress
- Infinite-scroll course lists
- Decorative motion competing with the primary action for salience

---

## 5. Autism

### 5.1 The mechanism

Two design-relevant profiles, usually together.

1. **Uncertainty intolerance.** Unsignalled change is not merely annoying; it is aversive, and it consumes the capacity that was going to be spent on learning.
2. **Sensory sensitivity.** High-arousal colour, motion, sound, and density can push a learner past their processing threshold before content is even reached.

Plus a **language** dimension: figurative, implied, or socially-coded instructions
("dive in", "you're on fire", "nearly there") impose an extra interpretation step.

### 5.2 What the standards and literature say

- **Predictability, sensory quality, and intelligibility** are the three foundations of autism-friendly design. Predictability means the interface behaves identically every time; intelligibility means you can tell what a thing is and what will happen if you use it.
- **Low arousal.** The National Autistic Society's low-arousal principle: soft, pastel, reduced-saturation palettes; no strobing; no unnecessary motion. Give the learner sensory *control*, not a fixed "calm" theme they cannot adjust.
- **Task segmentation with explicit expectations.** Before a task: what it is, how long, how many parts, what counts as finished, and what happens next.
- **Transition support.** In education, the transition between activities is the highest-friction moment, and the mitigation is *forewarning* ("two more questions, then we stop"). The digital equivalent is an explicit section-transition notice.
- **Consistency is normative, not stylistic** — WCAG 3.2.3 and 3.2.4 exist for this.
- The **ASPECTSS** framework (from built-environment research) generalises usefully: *spatial sequencing* (predictable order), *compartmentalisation* (one function per zone), *transition spaces* (a buffer between activities), *sensory zoning*, and *escape space* (a low-stimulus exit that is always available).

### 5.3 Design rules

| Rule | Concrete form |
|---|---|
| **Fixed structure** | Same section order, same names, same widths on every lesson in the product — the educator's layout choice must not change it |
| **The whole path is visible before you start** | A numbered itinerary at the top with per-step durations and done-state |
| **Announce every transition** | "Section 1 complete. Next: Section 2 — Photosynthesis (6 min). [Continue]", with `aria-live="polite"` |
| **State expectations before every task** | Number of questions, timed or not, pass mark, attempts remaining, what happens on failure |
| **Literal language everywhere** | "Continue to section 2", not "Let's keep the momentum going" |
| **Low arousal by default, adjustable** | Reduced-chroma palette, `animation_level: none`, no autoplay of video or audio |
| **No unexpected motion or reveal** | Nothing appears on hover; no parallax; no auto-advancing carousels |
| **An escape is always available** | A visible, permanent way to stop that saves state and does not scold |
| **One thing per zone** | A card does one job; do not co-locate progress, promotion, and controls |

### 5.4 Anti-patterns

- Two competing numbering systems on screen at once (numbered nav items *and* numbered page sections)
- Idioms, exclamation marks, emoji carrying meaning, "friendly" ambiguity
- A "calm mode" implemented as a global saturation filter — it also washes out focus indicators and status colours (see [02](02-SETTINGS-REFERENCE.md))
- Layout width that varies by course
- Surprise modals, mid-flow confirmations, or content that loads in above the current reading position

---

## 6. Rules that apply to all three

Non-negotiable across every preset, including Default.

1. **No autoplay of anything.** Not video, not TTS, not carousels. WCAG 3.2.5 and COGA Objective 8; and for autism it is an arousal event. Audio starts on an explicit press, every time.
2. **Never lose work or place.** Save continuously; on return, offer *Continue* or *Start over*.
3. **No imposed time limits.** Timers are opt-in, or educator-set with an extension path; never a surprise.
4. **Every disabled control explains itself.** A greyed-out "Next" with no reason is a dead end. Say "Finish the activity to continue."
5. **Reduce cognitive load before adding help.** Removing a distraction beats adding a tooltip.
6. **Personalisation is layered, not exclusive.** A preset is a starting point; individual overrides always win and must survive (COGA Objective 8). A learner who is dyslexic *and* has ADHD must be able to compose.
7. **Plain language is the default register.** Preset-specific literalism is an upgrade on top, not a different product.
8. **Every visual signal has a text equivalent.** If motion or colour carries meaning — progress, completion, "you are here" — a sentence must carry it too. This is what makes `animation_level: none` safe rather than lossy.

---

## 7. The numbers — design tokens derived from §1–§6

This table is the contract. `src/lib/adaptive-engine.ts` and `src/app/globals.css`
must implement it.

| Token | Default | **Dyslexia** | **ADHD** | **Autism** | Source |
|---|---|---|---|---|---|
| Base font size | 16px | **19px** | 18px | 18px | BDA 16–19px |
| Line height | 1.5 | **1.7** | 1.6 | 1.6 | WCAG 1.4.12 (≥ 1.5) |
| Letter spacing | 0 | **0.12em** | 0.02em | 0.02em | WCAG 1.4.12 floor |
| Word spacing | 0 | **0.16em** | 0.08em | 0.08em | WCAG 1.4.12 floor; BDA ≥ 3× tracking |
| Paragraph spacing | 1em | **2em** | 1.6em | 1.6em | WCAG 1.4.12 (≥ 2× font size) |
| **Measure (line length)** | 72ch | **62ch** | 66ch | 66ch | WCAG 1.4.8 ≤ 80ch; dyslexia 50–70 |
| Text alignment | left | **left, enforced** | left | left | BDA / WCAG 1.4.8 — never justify |
| Page ground | `#FFFFFF` | **cream `#FDF6E2`** | soft grey `#F0F0F0` | pale blue `#EBF4FA` | BDA off-white; NAS low arousal |
| Body/ground contrast | ≥ 4.5:1 | ≥ 7:1 | ≥ 4.5:1 | ≥ 4.5:1 | WCAG 1.4.3 / 1.4.6 |
| Colour saturation | 100% | 100% | 100% | **~60% chroma, at token level, not a filter** | NAS low arousal |
| Animation level | normal | low | low | **none** | WCAG 2.3.3 |
| Chunk size | educator | by `<h2>` | **3–7 min** | by `<h2>` + declared itinerary | ADHD chunking research |
| Sequencer | none | none | chunked | **guided (step contract)** | COGA Objectives 1 and 4 |
| Minimum tap target | 24px (2.5.8 AA) | 44px | **48px** | 48px | WCAG 2.5.5 AAA |
| Vertical rhythm between blocks | 3rem | **4rem** | 2rem | 3rem | COGA "Use White Spacing" |
| Supports position | — | reading toolbar, sticky top | **"Now" bar, sticky top** | **itinerary, top of page** | Objectives 5 and 6 |
| Emphasis style | bold | **bold only** | bold | bold | BDA — no italic, no caps |
| Autoplay | never | never | never | never | WCAG 3.2.5 |
| Imposed timers | never | never | never | never | WCAG 2.2.1 |

**Implementation note — measure must be in `ch`, not `rem`.** `max-w-2xl` is 42rem;
at a 19px root that is roughly 84 characters, over the WCAG 1.4.8 cap. `62ch` stays
correct at *every* font size the learner picks. Any measure expressed in `rem` or `px`
silently breaks the moment the font-size slider moves — which is precisely when a
dyslexic learner needs it most.

---

## 8. Where the three conditions disagree

These are real conflicts. The preset must pick a side; a composed/custom profile must
warn.

| Tension | Dyslexia wants | ADHD wants | Autism wants | Resolution |
|---|---|---|---|---|
| **Salience** | Calm page, low glare | High-salience *current action* | Low arousal, nothing shouting | Spend salience **only** on the primary action; everything else is calm. One loud thing per screen. |
| **Density** | Very low — big type, wide spacing | Low, but wants the whole path visible at once | Low, wants the full itinerary visible | The itinerary is a compact list, not full-size cards; the content is spacious. Two density zones, deliberately. |
| **Motion** | Low is fine | Low; motion can aid orientation | **None** | Never rely on motion for meaning; give every transition a text equivalent (§6.8). Then motion becomes free to remove. |
| **Chunking** | By heading (semantic) | By time (3–7 min) | By declared plan (fixed count) | Chunk by heading, *label* with time, *declare* the count up front. One algorithm satisfies all three. |
| **Gamification** | Neutral | Reinforcement helps engagement | Unpredictable reward is aversive | Rewards must be **deterministic and announced** ("finish 3 sections → badge"). Never random, never a surprise. |
| **Reading aids** | TTS is central | TTS competes for attention | Audio may be an arousal trigger | TTS on demand, opt-in per preset, never autoplay, always stoppable. |
| **Choice** | Wants font and tint control | More choices = more decision cost | Wants stable, non-shifting options | Settings live in one predictable place, ordered identically every time, never contextually reshuffled. |

**Composition rule.** A learner with more than one profile gets the **most conservative**
value on every axis — lowest motion, lowest density, longest spacing, most explicit
language — *except* measure and font size, where the **dyslexia** value wins, because
those are decoding requirements rather than preferences.

---

## 9. Consent, autonomy, and the ethics of a preset

- A preset is a **starting template**, never a lock. Every value stays editable afterwards.
- The system may **recommend** during onboarding; it must not silently apply a configuration because of a declared diagnosis. Declaring "I have ADHD" is not consent to have the interface rearranged.
- **Show what will change before it changes** — COGA's "Clearly State the Results and Disadvantages of Actions, Options, and Selections". This is why the preset-details dialog in [03](03-PRESET-REDESIGN-PLAN.md) is a requirement rather than a nicety.
- **Never diagnose in UI copy.** Say "reduces reading fatigue", not "for people with dyslexia" as a label on a control.
- **Never expose disability data** in analytics, leaderboards, educator views, or exports without separate explicit consent.
- The learner can always **turn the whole thing off** in one click and get the default product, with no loss of progress.

---

## 10. Acceptance checklist per preset

A preset is not done until every box is true. Use this as the QA script.

### Universal (all presets)

- [ ] No audio, video, or motion begins without a press
- [ ] Text spacing meets the WCAG 1.4.12 floors at the preset's *default* values
- [ ] Line length ≤ 80ch at every font size the sliders allow
- [ ] Text is never justified
- [ ] All contrast ≥ 4.5:1 with the preset's tint **and** `muted_colors` both applied
- [ ] Keyboard reachable, and the visible focus ring survives every colour setting
- [ ] Every disabled control states why it is disabled
- [ ] Progress survives reload, back-navigation, and session expiry
- [ ] Every setting in the preset is individually overridable, and the override survives a reload
- [ ] Turning the preset off restores the default product with no data loss

### Dyslexia

- [ ] Measure ≤ 70ch on every learner surface, **including distraction-free mode**
- [ ] Word spacing ≥ 0.16em, letter spacing ≥ 0.12em, paragraph spacing ≥ 2em — *actually rendered*, verified in devtools
- [ ] The word-spacing, line-spacing, and font-size controls visibly change lesson content (no `!important` shadowing them)
- [ ] TTS highlights the spoken sentence in the visible text
- [ ] TTS can start from any paragraph, not only from the top
- [ ] The reading aid dims but never blurs
- [ ] The page ground is off-white, not `#FFFFFF`
- [ ] No italics are used for emphasis anywhere in the learner UI

### ADHD

- [ ] The current action is nameable at any scroll position, without scrolling
- [ ] Checklist and progress supports are visible **simultaneously with** the content they scaffold
- [ ] ≤ 2 clicks from dashboard to resuming the last lesson
- [ ] Each chunk gives immediate completion feedback
- [ ] No notification, toast, or prompt fires during an active task
- [ ] No countdown appears that the learner did not enable
- [ ] Nothing on the page shifts position after first paint

### Autism

- [ ] Section order and container width are identical across two courses with different educator layouts
- [ ] The full step list, with counts and durations, is visible before step 1 begins
- [ ] Every section transition produces an explicit text announcement
- [ ] Every quiz and activity states expectations before it starts
- [ ] Zero animation, and every state change has a text equivalent
- [ ] No idiomatic or figurative string appears in learner-facing copy under this preset
- [ ] Only one numbering system is visible at a time
- [ ] Focus indicators and status colours remain distinguishable under `muted_colors`

---

## Sources

- [WCAG 2.2 — Understanding SC 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) — W3C
- [Making Content Usable for People with Cognitive and Learning Disabilities — Design Guide](https://www.w3.org/TR/coga-usable/design_guide.html) — W3C COGA Task Force
- [Making Content Usable — full Working Group Note](https://www.w3.org/TR/coga-usable) — W3C
- [Cognitive Accessibility Design Patterns](https://www.w3.org/WAI/news/2022-03-31/new-format-coga-patterns/) — W3C WAI
- [BDA Dyslexia Style Guide 2023](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf) — British Dyslexia Association
- [Dyslexia-friendly typed formats](https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats/) — Dyslexia Scotland
- [A Comparative Study of Dyslexia Style Guides in Improving Readability for People With Dyslexia](https://www.researchgate.net/publication/347481260_A_Comparative_Study_of_Dyslexia_Style_Guides_in_Improving_Readability_for_People_With_Dyslexia)
- [Dos and don'ts on designing for accessibility](https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/) — UK Home Office, includes the dyslexia and autistic-spectrum posters
- [UKHomeOffice/posters — accessibility dos and don'ts](https://github.com/UKHomeOffice/posters/tree/master/accessibility/dos-donts)
- [Chunking to Increase Executive Function Utility in Virtual Learning](https://elearnmag.acm.org/archive.cfm?aid=3708804) — ACM eLearn Magazine
- [Do programs designed to train working memory, other executive functions, and attention benefit children with ADHD? A meta-analytic review](https://www.sciencedirect.com/science/article/abs/pii/S0272735813001219) — Rapport et al., *Clinical Psychology Review*
- [Interventions to improve executive functioning and working memory in school-aged children with AD(H)D](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3548701/) — NIH PMC
- [Sensory-Friendly Design: Creating Digital Spaces that Support Autistic Users](https://www.accessibility.com/blog/sensory-friendly-design-creating-digital-spaces-that-support-autistic-users)
- [Guidelines of inclusive architecture design for autism spectrum disorder: What is new?](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11860188/) — NIH PMC, ASPECTSS framework
- [Built Environment Design and People with Autism Spectrum Disorder (ASD): A Scoping Review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8003767/) — NIH PMC
