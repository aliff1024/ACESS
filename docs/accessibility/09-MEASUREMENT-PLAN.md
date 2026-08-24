# Measurement & Evaluation Plan

**How we find out whether any of this actually helped — and how we avoid fooling ourselves.**

- **Scope:** instrumentation, metric definitions, baseline capture, and the learner research protocol.
- **Depends on:** [08 §7](08-DATA-PRIVACY-MIGRATION.md) (audit trail), [01 §10](01-LEARNING-STANDARDS.md) (acceptance checklists)
- **Unblocks:** Phase 8 of [00 §4](00-PROGRAM-PLAN.md); baseline capture must happen in Phase 0

> **Implementation status — [00 §4 Phase 8](00-PROGRAM-PLAN.md).** Phase 8 is real-learner
> testing, expert review by a non-implementer, and AT hardware testing — none of which an
> autonomous coding session can execute, and this document's own §9 acceptance criterion
> #1 ("§3 events shipped ... before any Phase 1 fix") can no longer be satisfied in its
> intended form: Phase 0 never ran, Phases 1–7 already shipped, and no baseline was ever
> captured to compare against. **One `§3.1` event — `preset_applied`** — was wired up
> anyway (`trackSettingsEvent()` in `adaptive-engine.ts`, called from
> `AccessibilitySettingsModal.tsx`'s `handleApplyPreset`), on the reasoning that data
> collected from now on is better than none, even though it cannot retroactively answer
> the before/after question this section exists to ask. See
> [00's Phase 8 status note](00-PROGRAM-PLAN.md) for the full reasoning, including why
> `setting_changed`, `preset_abandoned`, and `disabled_control_activated` were not
> attempted. Everything else in this document — the baseline capture, the learner
> research protocol (§6), expert/technical evaluation (§7), reporting (§8) — is
> unstarted and requires human resources this session doesn't have.

---

## 1. The measurement trap

Accessibility work is unusually easy to declare successful and unusually hard to prove.
Three traps to name before writing a single metric:

1. **Engagement metrics invert.** A learner who stops re-reading the same paragraph spends *less* time on the page. A learner who stops hunting for the next action makes *fewer* clicks. If time-on-page and click depth go down after Phase 3, that is probably the feature working. Optimising them would undo the work.
2. **The people most helped are the least represented.** A learner who bounced off the product before Phase 1 is not in the post-Phase-3 data. Improvements can look like nothing because the beneficiaries were never counted.
3. **Compliance is not usability.** Passing every axe check and every WCAG criterion proves an absence of known defects, not a presence of usefulness. The acceptance checklists in [01 §10](01-LEARNING-STANDARDS.md) are a floor, and no amount of green ticks substitutes for a learner completing a lesson in front of you.

**Consequence:** the primary evidence is qualitative and task-based. Quantitative data
supports it and flags regressions. Not the other way round.

---

## 2. Current instrumentation

`trackAdaptation()` writes to `adaptive_interactions` with `user_id`, `lesson_id`,
`course_id`, `adaptation_used`, `session_id`, `duration_seconds`
([adaptive-engine.ts](../../src/lib/adaptive-engine.ts)). The `AdaptationType` union
covers tts, focus_mode, chunked_content, simplified_summary, captions, slideshow,
guided_mode, reading_spotlight, distraction_free.

**Good:** the table exists, failures are swallowed so analytics never break the UX, and
the vocabulary is roughly right.

**Missing:** it records that an adaptation was *used*, never whether it *helped*. There
is no start/stop pairing, no completion linkage, no record of settings changes, and no
baseline. As it stands it can answer "how many people turned on TTS" and nothing else.

> **Phase 8 addendum.** `adaptive_interactions` has no structured-properties column —
> only the fixed columns above. A new sibling function, `trackSettingsEvent()`, reuses
> this same table for one settings-surface event (`preset_applied`), encoding which
> preset directly in the `adaptation_used` string (`preset_applied:dyslexia`) rather
> than a real property, because adding a proper payload column is a schema migration
> this session had no live database to verify against. It can now also answer "how many
> people applied the Dyslexia preset" — still nothing about whether it helped.

---

## 3. Events to add

Minimal, purposeful, and privacy-safe per [08 §6](08-DATA-PRIVACY-MIGRATION.md) — never
join any of these to `disability_type`, and treat `base_preset` as sensitive.

### 3.1 Settings events

| Event | Properties | Answers |
|---|---|---|
| `setting_changed` | key, from, to, `via` (onboarding / preset / settings_panel / quick_control), preset context | Which defaults are wrong; whether Tier 1 controls get used |
| `preset_applied` | preset, source, previewed_first | Whether the details dialog changes behaviour |
| `preset_abandoned` | preset, seconds_active, reverted_to | **The single most informative metric** — a preset applied then reverted within a session felt worse |
| `setting_reset` | key, scope | Where the preset defaults miss |
| `conflict_shown` / `conflict_ignored` | conflict id | Whether the warnings are legible |

### 3.2 Reading and lesson events

| Event | Properties |
|---|---|
| `tts_started` / `tts_stopped` | position (top / mid-content), duration, rate, language |
| `chunk_advanced` / `chunk_reversed` | index, total, dwell_seconds |
| `step_advanced` / `step_blocked` | step id, reason blocked |
| `guided_exited` | step index of exit, total steps |
| `lesson_resumed` | via, gap_hours, resumed_position |
| `section_revisited` | section id, visit count |

`section_revisited` and `chunk_reversed` are the closest available proxies for
comprehension difficulty: re-reading is a signal, and it is the one a reading-support
feature should reduce.

### 3.3 Assessment events

| Event | Properties |
|---|---|
| `quiz_started` / `quiz_submitted` | question count, timer visible, attempt number |
| `quiz_abandoned` | last question index, seconds elapsed |
| `activity_completed` / `activity_abandoned` | type, input mode (pointer / keyboard) |
| `alternative_used` | activity type, alternative (e.g. dropdown instead of drag) |

`alternative_used` with input mode is how we learn whether the keyboard paths from
[07 §7.2](07-ASSESSMENT-POLICY.md) are real routes or theatre.

### 3.4 Friction events

| Event | Why |
|---|---|
| `disabled_control_activated` | Someone pressed a disabled Next. Every occurrence is a UX defect |
| `rage_click` | ≥ 3 presses on the same non-responsive element in 2s |
| `back_within_5s` | Arrived somewhere and immediately left — the page did not deliver |
| `settings_opened_from` | Which surface drove them to settings; high counts from the lesson page mean Tier 1 controls are missing or insufficient |

---

## 4. Metric definitions

### 4.1 Leading — is the system behaving?

| Metric | Definition | Good direction | Caveat |
|---|---|---|---|
| **Preset abandonment** | applied then reverted within 24h ÷ applied | ↓ | The clearest verdict on a preset |
| **Setting churn** | distinct `setting_changed` per learner per week, after week 1 | ↓ after an initial spike | Early churn is healthy exploration |
| **Override depth** | count of `explicit_overrides` per learner | ↓ | High values mean the preset defaults are miscalibrated |
| **Quick-control share** | `setting_changed` via quick_control ÷ all | ↑ | Directly evaluates the Tier 1 investment |
| **Support visibility** | share of lesson time slot ② was on screen | → 100% | Would have caught the ADHD hidden-supports bug automatically |
| **Guided completion** | guided lessons finished ÷ guided lessons started | ↑ | The direct test of Guided Run |
| **Disabled activations** | `disabled_control_activated` per 1,000 lesson views | → 0 | Every one is a missing explanation |
| **TTS start position** | share of `tts_started` from mid-content | ↑ | Proves "read from here" is used |

### 4.2 Lagging — did learning improve?

| Metric | Good direction | Caveat |
|---|---|---|
| Lesson completion rate, by preset | ↑ | Confounded by course difficulty — segment by course |
| Return rate (days active in 14) | ↑ | The most honest engagement signal available |
| Drop-off position distribution | shifts later | Compare shape, not means |
| Quiz attempts to pass | context-dependent | **Not** automatically better when lower — timers were removed |
| Time to complete a lesson | **no target** | Slower can be better. Report it; never optimise it |
| Re-read rate (`section_revisited`) | ↓ for Dyslexia | The nearest proxy to reading effort |

### 4.3 Qualitative — the ones that decide

| Measure | Method |
|---|---|
| **Task success rate** | Can they complete a defined task unaided? Binary, per participant, per task |
| **Assists required** | Count of moments the facilitator had to intervene |
| **Self-reported effort** | Single item, 1–7, immediately after each task |
| **Preference** | Direct comparison, old build vs new, order counterbalanced |
| **Verbatims** | Does anyone say it feels made for them? Does anyone say it feels patronising? |

### 4.4 Anti-metrics — never optimise

Time on page · clicks per session · scroll depth · feature adoption counts · session
length · "engagement". Every one of these can improve because a learner is struggling.

---

## 5. Baseline — capture in Phase 0

**Before any fix from Phase 1 lands.** Without this the whole plan is unfalsifiable.

| Capture | How |
|---|---|
| Quantitative baseline | Ship §3 events, run 2–4 weeks unchanged, snapshot §4.1 and §4.2 |
| Technical baseline | axe results per page; contrast matrix (tint × preset × muted); keyboard walkthrough result; AT smoke test — all as recorded numbers, not adjectives |
| Content baseline | Of the existing lessons: how many have ≥ 2 `<h2>`, how many images lack alt text, how many videos lack captions. This sizes Phase 6 |
| Qualitative baseline | 3–5 learner sessions on the **current** build, same task script as Phase 8. Uncomfortable and the most valuable single item here |

Publish the baseline. A baseline recorded privately becomes a baseline quietly adjusted.

---

## 6. Learner research protocol

### 6.1 Participants

Per [00 §3](00-PROGRAM-PLAN.md) D14: **5–8 per condition** for usability, plus expert
review. Enough to find most design-level problems; not enough for statistical claims, and
the write-up must say so.

- Recruit through disability support services, student groups, and educators — not general convenience sampling
- **Include people who abandoned the product.** They hold the most important findings and never appear in analytics
- Include at least one screen-reader user and one keyboard-only user per round
- Include at least one participant using Bahasa Melayu as their interface language
- Compensate for time. Unpaid disability consultation is extraction

### 6.2 Ethics

- Informed consent in plain language, with an Easy-Read version available
- **Under 18:** guardian consent *and* participant assent; either may stop it
- Diagnosis is never a requirement to participate, and never recorded beyond what the participant volunteers
- The right to stop, skip, or withdraw data afterwards, stated at the start and honoured without discussion
- **Test the product, never the person.** Say it explicitly, more than once: "If something is confusing, that is the design's fault, not yours"
- Recordings only with consent; anonymise; store per [08 §6](08-DATA-PRIVACY-MIGRATION.md)
- If a session causes distress, stop. No data is worth it
- Follow the institution's ethics process where one applies

### 6.3 Session structure (~45 min)

1. **Setup (5 min).** Consent, their own device where possible, no coaching.
2. **Onboarding (5 min).** Watch them choose. Do they understand what a preset does? Do the barrier questions read naturally?
3. **Core tasks (25 min).** Think-aloud, no assistance until genuinely stuck:
   - Find and start a lesson you have not done
   - Read/complete section 2, then stop and come back later
   - Make the text more comfortable for you *(the real test of Tier 1 vs settings panel)*
   - Complete the activity
   - Take the quiz
   - Find out how far through the course you are
4. **Comparison (5 min).** Same task on the old build, counterbalanced order.
5. **Debrief (5 min).** Effort rating, preference, one thing to change.

### 6.4 Analysis

- Task success and assists per participant, tabulated — not averaged into a single score
- Findings triaged: **blocking** (fix before release) / **major** (fix this phase) / **minor** (backlog)
- **Report what did not work.** A phase that produced no measurable improvement is a finding, and burying it guarantees repeating it
- Feed confirmed findings back into the [01 §10](01-LEARNING-STANDARDS.md) checklists so the next round inherits them

---

## 7. Expert and technical evaluation

Runs alongside, cheaper, catches different things.

| Method | Cadence | Output |
|---|---|---|
| Heuristic review against [01 §10](01-LEARNING-STANDARDS.md) | each phase gate, by someone who did not build it | pass/fail per box |
| Conflict-matrix regression | each phase gate | every 🔴 in [02 §7](02-SETTINGS-REFERENCE.md) re-tested |
| AT matrix | Phases 3, 5, 6, 8 | per [06 §10](06-INTERACTION-AT-SPEC.md) |
| Automated CI | every PR | axe, contrast matrix, jsx-a11y, resolver units |
| Performance | each phase gate | against the reference device budget |

Automated tooling catches roughly 30% of real issues. It is a regression guard, never
evidence.

---

## 8. Reporting

**Per phase gate:** acceptance boxes passed, defects found and fixed, metric movement vs
baseline, and what is deferred.

**End of programme:** baseline vs final on every §4 metric; task success by condition;
verbatims; what worked, what did not, what remains. Include limitations honestly —
sample size, self-selection, the learners who never appeared in the data — and resist
converting 6 participants into a percentage.

**Standing dashboard:** preset abandonment, disabled activations, support visibility, and
guided completion. Those four surface regressions fastest.

---

## 9. Acceptance criteria

- [ ] §3 events shipped and verified before any Phase 1 fix *(structurally impossible now — Phase 1 shipped in this same overall program before this criterion could be met; one event, `preset_applied`, shipped in Phase 8 instead, after the fact, per the status note above)*
- [ ] Baseline captured, published, and immutable *(not done, and can no longer be done in the form this document specifies — no baseline was captured before Phase 1)*
- [x] No analytics payload contains `disability_type`; `base_preset` handled as sensitive *(true for the one event shipped — `preset_applied`'s payload is just the preset id, e.g. "dyslexia", which is a UI/UX category the learner chose, not a diagnosis; nothing in `trackSettingsEvent()` reads or forwards `disability_type`)*
- [ ] Every metric in §4 has an owner and a definition that two people would compute identically *(not attempted — no owner assigned, no dashboard built)*
- [ ] Anti-metrics documented where dashboards can see them, so nobody optimises them by accident *(not attempted — no dashboard exists yet for them to be documented on)*
- [ ] Research protocol approved, consent materials available in plain language and in Bahasa Melayu *(not attempted — needs human review/approval this session can't provide)*
- [ ] ≥ 5 participants per condition completed, including at least one AT user and one prior abandoner *(not attempted — needs real learner recruitment)*
- [ ] Findings triaged, blocking issues fixed and re-tested *(not applicable — no findings exist without the research this phase couldn't run)*
- [ ] Final report states limitations plainly and reports negative results *(this status note is the honest substitute: the limitation is that Phase 8 could not run as designed, stated plainly rather than glossed over)*
