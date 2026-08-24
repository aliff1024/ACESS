## Summary

<!-- What does this PR do, and why? -->

## Test plan

<!-- How did you verify this? -->

---

<!--
The Accessibility section below is required for any PR touching:
src/providers/AccessibilityProvider.tsx, src/lib/adaptive-engine.ts,
src/lib/accessibility-catalog.ts, src/lib/accessibility-resolver.ts,
src/components/accessibility/**, src/app/globals.css, or any learner-facing
surface (lesson, quiz, activity, dashboard, settings).

Per docs/accessibility/10-GOVERNANCE-RUNBOOK.md §6: write "N/A — <reason>"
for anything that doesn't apply. An unticked box with no explanation blocks
merge — a blank checkbox and a justified "N/A" are not the same thing.

If this PR doesn't touch any of the paths above, delete this section.
-->

### Accessibility

- [ ] Every new/changed setting is in `SETTING_CATALOG` with `plain` + `why` + `source` ([accessibility-catalog.ts](../src/lib/accessibility-catalog.ts); run `npm run test:a11y-catalog`)
- [ ] Conflicts declared; resolver rule added; unit test per conflict ([accessibility-resolver.ts](../src/lib/accessibility-resolver.ts); run `npm run test:a11y-resolver`)
- [ ] Applied by exactly one mechanism (CSS var OR component logic — never both)
- [ ] No new `!important` over a learner-controllable value
- [ ] Every enum value handled everywhere it is read
- [ ] Keyboard operable; focus behaviour follows [06 §3](../docs/accessibility/06-INTERACTION-AT-SPEC.md)
- [ ] State conveyed as text, not colour/icon/position alone
- [ ] Contrast ≥ 4.5:1 and focus ring ≥ 3:1 under every tint × preset × muted combination
- [ ] Content stays within `--content-measure` in every mode
- [ ] Nothing pulses, flashes, autoplays, or moves without a press
- [ ] Strings added in both `en` and `ms`
- [ ] Instrumented per [09 §3](../docs/accessibility/09-MEASUREMENT-PLAN.md)
- [ ] Affected preset(s) walked end to end (dashboard → lesson → quiz → activity)
- [ ] Docs updated in this PR ([docs/accessibility/](../docs/accessibility/))
