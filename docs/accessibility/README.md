# Accessibility Documentation

Eleven planning documents plus one status report. **[00-PROGRAM-PLAN.md](00-PROGRAM-PLAN.md)
is the entry point** for planning — it holds the gap analysis, the decisions to make
first, and the phased plan that sequences everything else. **[IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md)
is the entry point for testing** — Phases 1–3 have shipped code; that document is the
file:line, test-step-by-test-step cross-check against what's actually in the repo.

## The set

| Doc | Answers | Read it when |
|---|---|---|
| **[00 — Program Plan](00-PROGRAM-PLAN.md)** | What is missing, what to decide first, the 10 phases with exit criteria, metrics, risks | **Start here.** §1 gap analysis · §3 decisions · §4 phases |
| **[01 — Learning Standards](01-LEARNING-STANDARDS.md)** | How dyslexic, ADHD and autistic learners actually learn; WCAG / COGA / BDA rules and the exact numbers they imply | Before choosing any value. §7 token table · §10 QA checklists |
| **[02 — Settings Reference](02-SETTINGS-REFERENCE.md)** | What each setting claims, what it really does (file:line), and the full conflict matrix | Before touching a setting, or when a control "does nothing". §7 conflict matrix |
| **[03 — Preset Redesign](03-PRESET-REDESIGN-PLAN.md)** | Per-preset identity, guided-mode rebuild, the Preset Details dialog | When building a preset. §2 design thesis · §7 Guided Run |
| **[04 — Display Spec](04-DISPLAY-SPEC.md)** | What goes on each page, in what order, at what size, how much at once, per preset and breakpoint | Any layout question. §2 page skeleton · §3 density · §4 page-by-page |
| **[05 — Customization UX](05-CUSTOMIZATION-UX.md)** | The settings panel redesign, in-context quick controls, onboarding, preset composition | Building anything a learner uses to configure. §3 three tiers · §4 panel |
| **[06 — Interaction & AT](06-INTERACTION-AT-SPEC.md)** | Semantics, focus management, live regions, keyboard model, AT test matrix | Anything that changes what is on screen. §3 focus contract |
| **[07 — Assessment Policy](07-ASSESSMENT-POLICY.md)** | How quizzes and activities behave so they measure learning, not disability | Quiz or activity work. §3 timing · §7 activity keyboard models |
| **[08 — Data, Privacy & Migration](08-DATA-PRIVACY-MIGRATION.md)** | Schema, the intent/value split, cache rules, privacy of disability data, safe migration | Persistence or schema work. §4 migration · §6 privacy |
| **[09 — Measurement Plan](09-MEASUREMENT-PLAN.md)** | Instrumentation, metric definitions, baseline capture, learner research protocol | Phase 0 (baseline) and Phase 8 (evaluation). §4.4 anti-metrics |
| **[10 — Governance Runbook](10-GOVERNANCE-RUNBOOK.md)** | How to add/change/retire a setting, PR checklist, CI gates, ownership | Every PR. §3 runbook · §6 checklist · §10 anti-drift rules |
| **[Implementation Status](IMPLEMENTATION-STATUS.md)** | What's actually built (Phases 1–3), file:line, and a manual test script for each item | **Testing/QA.** §1 one-screen summary · §6 master smoke test · §7 known gaps |

**Deferred:** doc 11, the Content & Authoring Contract (educator-side) — planned
separately. Its learner-facing half, runtime resilience when content is unstructured,
lives in [00 §4 Phase 6](00-PROGRAM-PLAN.md).

## Relationship to `../Accessibility.md`

`docs/Accessibility.md` is the original **product specification** — intended behaviour,
written before implementation. It remains the statement of intent. This set is the
**evidence base, the audit of what shipped, and the plan to close the gap**. Where they
disagree: 01 wins on values, 02 wins on current behaviour, 03–07 win on target design.

## Quick answers

| Question | Go to |
|---|---|
| What should I fix first? | [00 §4 Phase 1](00-PROGRAM-PLAN.md) |
| What must we decide before writing code? | [00 §3](00-PROGRAM-PLAN.md) |
| Why does the Word Spacing slider do nothing? | [02 §2.4](02-SETTINGS-REFERENCE.md) |
| Why does guided mode not feel like it helps? | [02 §4.3](02-SETTINGS-REFERENCE.md) → [03 §7](03-PRESET-REDESIGN-PLAN.md) |
| Why does the Dyslexia preset feel like just a colour theme? | [03 §1](03-PRESET-REDESIGN-PLAN.md) → [03 §4](03-PRESET-REDESIGN-PLAN.md) |
| Why doesn't the ADHD checklist appear? | [02 §4.2](02-SETTINGS-REFERENCE.md) |
| How wide should content be? | [04 §3](04-DISPLAY-SPEC.md) |
| How much should be on one page? | [04 §3.1](04-DISPLAY-SPEC.md) |
| Where do settings controls belong? | [05 §3](05-CUSTOMIZATION-UX.md) |
| Where does focus go after X? | [06 §3](06-INTERACTION-AT-SPEC.md) |
| Can a learner use activities without a mouse? | [07 §7](07-ASSESSMENT-POLICY.md) — **not today** |
| Who can see a learner's disability data? | [08 §6](08-DATA-PRIVACY-MIGRATION.md) |
| How do we know any of this worked? | [09 §4](09-MEASUREMENT-PLAN.md) |
| How do I add a setting correctly? | [10 §3](10-GOVERNANCE-RUNBOOK.md) |
| What's actually shipped so far, and how do I test it? | [Implementation Status](IMPLEMENTATION-STATUS.md) |
