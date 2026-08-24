# Governance & Contribution Runbook

**How to add, change, and retire accessibility features without recreating the mess this documentation set was written to fix.**

- **Scope:** process, checklists, and CI gates.
- **Status:** write in Phase 0, follow from Phase 1, enforce from Phase 2.

> **Implementation status — [00 §4 Phase 9](00-PROGRAM-PLAN.md).** §2 invariant #1
> ("one catalog") is now real: `src/lib/accessibility-catalog.ts`, with a completeness
> check that runs (`npm run test:a11y-catalog`, §7's "Catalog completeness" gate as a
> standalone script). §6's PR checklist is now the actual `.github/pull_request_template.md`.
> §11's accessibility statement is published at `/accessibility-statement`. **Not
> landed:** the other nine §7 CI gates (all need a live browser to test against, which
> this session never had), a named §8 accessibility owner, and a scheduled quarterly
> audit — both real organisational decisions outside this session's authority. §9's
> decision records were backfilled retroactively in [00 §3.1](00-PROGRAM-PLAN.md) for
> the deviations made across Phases 1–9 (there was nothing to backfill before Phase 9,
> since this document itself wasn't being followed until now). See
> [00's Phase 9 status note](00-PROGRAM-PLAN.md) for the full reasoning.

---

## 1. What went wrong, stated as a process failure

The defects in [02](02-SETTINGS-REFERENCE.md) are not careless coding. They are the
predictable result of four missing rules:

| What happened | The missing rule |
|---|---|
| A slider exists that cannot reach its own standard's minimum | No rule that a setting must cite the standard it implements |
| A `!important` in preset CSS silently disabled a control | No rule that a setting has exactly one implementation path |
| Two components disagreed about whether guided mode was on | No rule that derived state is computed once |
| The ADHD preset hides its own supports | No rule that a preset must be tested as a whole, not as a list of flags |
| `structure_mode: 'checklist'` does nothing in three of four places | No rule that a value must be handled everywhere it is read |
| Docs described intent that was never built | No rule tying documentation to the PR that changes behaviour |

**The whole of this runbook is those six rules made enforceable.** Nothing here is
bureaucracy for its own sake; each item maps to a defect that actually shipped.

---

## 2. The five invariants

Violating one of these is a bug regardless of how the feature looks.

1. **One catalog.** No accessibility setting exists outside `SETTING_CATALOG`. If it is not in the catalog, it does not exist, and CI fails.
2. **One implementation path.** A setting is applied either by CSS variable *or* by component logic — never both. No preset CSS may use `!important` to override a learner-controllable value.
3. **One resolver.** Derived state (`sequencer`, effective measure, effective animation level) is computed once in `resolveSettings()` and read from there. No component re-derives it.
4. **One vocabulary.** Course › Lesson › Section › Step ([04 §7](04-DISPLAY-SPEC.md)). The same concept uses the same word in code, UI, and docs.
5. **Docs move with behaviour.** A PR that changes what a setting does updates the doc that describes it, in the same PR.

---

## 3. Runbook: adding an accessibility setting

Every step is required. A setting that skips step 2 or 7 is how inert controls happen.

**1. Justify it.** Cite the rule in [01](01-LEARNING-STANDARDS.md) it implements. If there
is no rule, either add one with a source or do not add the setting. *"It seemed useful"*
is not a justification, and is how `keyboard_navigation_enabled` came to exist and do
nothing.

**2. Catalog it.** Add a `SETTING_CATALOG` entry with every field: `label`, `group`,
`plain`, `why`, `source`, `helps`, `conflictsWith`, `requires`. `plain` and `why` are the
UI copy — write them here, not in the component.

**3. Declare conflicts.** List every setting it interacts with. If it writes a CSS
variable another setting writes, that is a conflict, not a coincidence. Add the
precedence rule to [02 §8](02-SETTINGS-REFERENCE.md).

**4. Add the resolver rule** and a unit test per conflict, asserting both the resolved
value and the notice the learner sees.

**5. Persist it.** Migration per [08 §3](08-DATA-PRIVACY-MIGRATION.md): real units, sensible
default, `settings_version` bump if the cache shape changes.

**6. Implement it once.** Pick CSS variable or component logic. Never `!important` over a
learner-controllable value.

**7. Handle every value, everywhere.** An enum with three values must be handled in every
place it is read, and represented in the settings UI. Add the "unhandled enum value"
lint. *This is the rule that `structure_mode` broke.*

**8. Wire the UI** using the standard row anatomy ([05 §4.3](05-CUSTOMIZATION-UX.md)):
name, plain effect, value as text, why, conflict, diff marker.

**9. Make it accessible** per [06 §6](06-INTERACTION-AT-SPEC.md): name, role, value, state
as text; keyboard operable; announced correctly.

**10. Instrument it.** `setting_changed` fires with `via`, per [09 §3.1](09-MEASUREMENT-PLAN.md).

**11. Localise it.** `en` and `ms`, in this PR. English-only is not done.

**12. Test the preset as a whole.** If a preset now includes it, walk the full preset —
dashboard, lesson, quiz, activity — and confirm nothing it enables is hidden by anything
else it enables. *This is the check that would have caught the ADHD supports bug.*

**13. Document it.** Update [02](02-SETTINGS-REFERENCE.md) row and conflict matrix; update
[01 §7](01-LEARNING-STANDARDS.md) if it changes a preset default.

---

## 4. Runbook: changing a preset default

Preset defaults are not ordinary config. Changing one changes real learners' interfaces.

1. Cite the evidence for the new value ([01](01-LEARNING-STANDARDS.md)).
2. Check it against the WCAG floors in [01 §7](01-LEARNING-STANDARDS.md).
3. Update the preset definition **and** the token table — both, or they drift.
4. **Never apply silently to existing learners.** Stage-2 consent flow, [08 §4.2](08-DATA-PRIVACY-MIGRATION.md). Learners with an `explicit_overrides` entry for that key are never touched.
5. Re-run the preset's acceptance checklist ([01 §10](01-LEARNING-STANDARDS.md)) in full.
6. Update the Preset Details dialog copy — it is generated from the catalog, so confirm the generated text still reads well.

---

## 5. Runbook: retiring a setting

Nothing is deleted in one step.

| Step | Action |
|---|---|
| 1 | Mark deprecated in the catalog with a reason and a replacement |
| 2 | Stop reading it; keep writing it. Ship. |
| 3 | Migrate existing values to the replacement ([08 §3.4](08-DATA-PRIVACY-MIGRATION.md)) |
| 4 | Remove from the settings UI. Ship. |
| 5 | Stop writing it. Ship. |
| 6 | Drop the column **one release later** |

**Never drop a column in the same release that stops reading it.** `low_contrast` and
`screen_reader_optimized` are both stuck mid-retirement today because this was not
followed.

---

## 6. PR checklist

Add to the PR template; required for any PR touching `src/providers/AccessibilityProvider.tsx`,
`src/lib/adaptive-engine.ts`, `src/lib/accessibility-catalog.ts`,
`src/components/accessibility/**`, `src/app/globals.css`, or any learner surface.

```
### Accessibility
- [ ] Every new/changed setting is in SETTING_CATALOG with plain + why + source
- [ ] Conflicts declared; resolver rule added; unit test per conflict
- [ ] Applied by exactly one mechanism (CSS var OR component logic)
- [ ] No new `!important` over a learner-controllable value
- [ ] Every enum value handled everywhere it is read
- [ ] Keyboard operable; focus behaviour follows 06 §3
- [ ] State conveyed as text, not colour/icon/position alone
- [ ] Contrast ≥ 4.5:1 and focus ring ≥ 3:1 under every tint × preset × muted combination
- [ ] Content stays within --content-measure in every mode
- [ ] Nothing pulses, flashes, autoplays, or moves without a press
- [ ] Strings added in both `en` and `ms`
- [ ] Instrumented per 09 §3
- [ ] Affected preset(s) walked end to end (dashboard → lesson → quiz → activity)
- [ ] Docs updated in this PR
```

**"Not applicable" must be written as a reason, not a blank.** An unticked box with no
explanation blocks merge.

---

## 7. CI gates

Merge-blocking from Phase 2.

| Gate | Tool | Fails on |
|---|---|---|
| Catalog completeness | custom script | A setting key in the type but not in the catalog, or a catalog entry missing a field |
| Resolver correctness | unit tests | Any conflict in [02 §7](02-SETTINGS-REFERENCE.md) resolving wrongly or silently |
| Static a11y | `eslint-plugin-jsx-a11y` (error) | Missing labels, roles, keyboard handlers |
| Runtime a11y | axe via Playwright, 8 key routes | Any serious or critical violation |
| **Contrast matrix** | custom | Any tint × preset × muted combination failing 4.5:1 body or 3:1 focus ring |
| Measure | Playwright assertion | Any text column > 80ch at any tested font size |
| Focus order | snapshot | Unexplained focus-order change |
| Motion | grep + test | New `animate-*` not gated on `animation_level` |
| i18n | script | A new `en` key with no `ms` counterpart |
| Performance | budget check | Bundle or LCP regression on the reference device |

The contrast matrix gate is the highest-value item on this list: it is the one that would
have caught the `muted_colors` filter desaturating focus rings and status colours, which
no human review noticed.

---

## 8. Ownership and cadence

| Role | Responsibility |
|---|---|
| **Accessibility owner** | Named person. Reviews every PR touching the paths in §6. Owns the catalog and this runbook |
| **Phase owner** | Runs the phase's acceptance checklist and reports the gate |
| **Everyone** | The PR checklist |

| Cadence | Activity |
|---|---|
| Per PR | Checklist + CI gates |
| Per phase gate | Full acceptance checklist ([01 §10](01-LEARNING-STANDARDS.md)) by someone who did not build it; conflict matrix regression; metric report |
| Quarterly | Full audit: all four presets end to end, AT matrix, contrast matrix, docs vs behaviour reconciliation |
| Annually | Re-check standards for updates (WCAG, COGA, BDA) and revise [01](01-LEARNING-STANDARDS.md) |

---

## 9. Decision records

Any decision that changes learner experience, deviates from [01](01-LEARNING-STANDARDS.md),
or trades one group's needs against another's gets a short record appended to
[00 §3](00-PROGRAM-PLAN.md): date, decision, options considered, rationale, who decided,
what would change our mind.

Deviating from a standard is allowed. Deviating **silently** is not — an undocumented
deviation becomes an unexplained bug six months later, which is exactly the state of the
0.1em letter-spacing rule in `globals.css` today.

---

## 10. The anti-drift rules

Short version, for the wall:

1. **If it is not in the catalog, it does not exist.**
2. **One setting, one mechanism.**
3. **Derived state is derived once.**
4. **Every enum value handled everywhere.**
5. **No `!important` over a learner's choice.**
6. **Test the preset, not the flag.**
7. **Docs ship with behaviour.**
8. **Nothing autoplays, pulses, or moves unasked.**
9. **Both languages, always.**
10. **Measure is sacred.**

---

## 11. Accessibility statement (publish at Phase 9)

A public page containing:

- The conformance target and level (D1 in [00 §3](00-PROGRAM-PLAN.md))
- What is supported: presets, keyboard, screen readers tested, TTS, languages
- **Known gaps, honestly listed** — a statement with no gaps is not credible
- How to report a barrier, with a committed response time
- Date of last review

The statement is not marketing. Its purpose is to let a learner decide whether this
product will work for them before they invest time in it — which is itself an
accessibility feature.

---

## 12. Acceptance criteria

- [x] A new contributor can add a setting correctly using §3 alone, with no tribal knowledge *(the catalog referenced throughout §3 now exists, and step 2's "add a SETTING_CATALOG entry" is concrete rather than aspirational — not proven with an actual new contributor)*
- [x] PR template includes the §6 checklist and blocks on unexplained blanks *(`.github/pull_request_template.md` has the exact checklist; "blocks" is a human-review convention stated in the template, not a bot-enforced check — no CI exists to enforce it mechanically)*
- [ ] All §7 gates run and block merge *(1 of 10 — catalog completeness — runs as a standalone script; not wired into a CI pipeline, and the other 9 weren't attempted, see the status note above)*
- [ ] The contrast matrix gate covers every tint × preset × muted combination *(not attempted — needs a live browser to compute rendered contrast against)*
- [ ] An accessibility owner is named *(not attempted — real organisational decision, left as a placeholder on the published statement page)*
- [ ] The quarterly audit is scheduled with an owner and a date *(not attempted — same reason)*
- [x] Decision records exist for every deviation from [01](01-LEARNING-STANDARDS.md) made **during this session** *([00 §3.1](00-PROGRAM-PLAN.md) — five records, backfilled this phase; "every deviation" is bounded to what this session actually changed, not an audit of the entire pre-existing codebase)*
- [x] The accessibility statement is published and dated *(`/accessibility-statement`, dated 23 August 2026 — not yet seen rendered live)*
