import type { AccessibilitySettingsData } from './learner-api';

/**
 * The single place accessibility setting conflicts are resolved and
 * explained, per docs/accessibility/02 §8 and docs/accessibility/10's
 * "one resolver" invariant. Every conflict row in docs/accessibility/02 §7
 * should eventually route through here rather than being re-derived
 * ad hoc in whichever component happens to read the two settings — that
 * duplication (e.g. LessonViewPage and CourseListPage each independently
 * checking `chunked_content_mode || layout_mode === 'chunked'`) is exactly
 * how the layout_mode/chunked_content_mode split went out of sync.
 *
 * `resolveSettings` is pure and side-effect free so it can be unit tested
 * in isolation (see scripts/test-accessibility-resolver.ts) and reused
 * anywhere a normalized, conflict-checked settings object is needed.
 */

export interface SettingConflict {
  /** The settings key this conflict is about, for scoping a UI notice to
   *  the row that caused it (docs/accessibility/05 §4.3's "conflict" row). */
  key: string;
  /** Plain-language, learner-facing explanation of what will actually
   *  happen — never the internal rule name. */
  message: string;
}

export interface ResolvedSettings {
  /** `raw` with every precedence rule below applied. Safe to feed into
   *  computeAdaptiveSettings / applySettingsToDOM in place of the raw
   *  settings object. */
  effective: AccessibilitySettingsData;
  /** Human-readable explanations of any precedence rule that actually
   *  fired for this settings object, for surfacing inline in the
   *  settings UI (docs/accessibility/05 §4.3) — empty when nothing
   *  conflicts. */
  conflicts: SettingConflict[];
}

/** The preset a learner is "on", per docs/accessibility/02 §7's
 * `active_preset` vs `base_preset` rule: `active_preset` flips to
 * 'custom' the instant any individual switch is touched, so anything
 * that needs to know which preset's *behavior* (not just which preset
 * name to display) should still apply must read `base_preset` first. */
function effectivePresetOf(s: Partial<AccessibilitySettingsData>): string {
  return s.base_preset || s.active_preset || 'none';
}

export function resolveSettings(raw: AccessibilitySettingsData): ResolvedSettings {
  const conflicts: SettingConflict[] = [];
  const effective: AccessibilitySettingsData = { ...raw };
  const preset = effectivePresetOf(effective);

  // ─── Rule: one layout axis ───────────────────────────────────────────
  // layout_mode ('scroll' | 'slide' | 'chunked') is the single source of
  // truth; chunked_content_mode is derived from it, never read
  // independently. This also repairs legacy/out-of-sync rows — e.g. a
  // row saved before the 'chunked' layout_mode value existed, which may
  // have chunked_content_mode: true with layout_mode left at 'scroll' —
  // so every consumer sees one consistent answer instead of each
  // re-deriving its own via `chunked_content_mode || layout_mode ===
  // 'chunked'` (which is what LessonViewPage, CourseListPage, and
  // CourseDetailPage were each doing separately).
  if (effective.chunked_content_mode && effective.layout_mode !== 'chunked') {
    effective.layout_mode = 'chunked';
  }
  effective.chunked_content_mode = effective.layout_mode === 'chunked';

  // ─── Rule: slide is unavailable under ADHD and Autism ────────────────
  // LessonViewPage forces isSlideMode off for these two presets
  // regardless of layout_mode (they always render chunked/scroll
  // instead) — surfaced here as a conflict so a learner who explicitly
  // chose Slide view is told why it isn't what they're seeing, rather
  // than the choice being silently overridden with no explanation.
  if (effective.layout_mode === 'slide' && (preset === 'adhd' || preset === 'autism')) {
    conflicts.push({
      key: 'layout_mode',
      message: `Slide view isn't available with the ${preset === 'adhd' ? 'ADHD' : 'Autism'} preset — lessons show one section at a time instead, so the whole path stays visible.`,
    });
  }

  // ─── Rule: ground colour precedence ───────────────────────────────────
  // background_tint owns --background/--card/--popover; Soft Backgrounds
  // (low_contrast) only touches secondary surfaces (globals.css scopes
  // it that way now — see docs/accessibility/02 §5.2). Turning both on
  // together is not a bug any more, but it is still worth explaining so
  // a learner who expected Soft Backgrounds to change their tint isn't
  // left wondering why it didn't.
  if (effective.low_contrast && effective.background_tint && effective.background_tint !== 'white') {
    conflicts.push({
      key: 'low_contrast',
      message: 'Soft Backgrounds softens borders and panel edges only — your background colour stays as you set it.',
    });
  }

  // ─── Rule: preset customization is additive, not silent replacement ──
  // Surfaced as an informational (not warning) conflict so a settings UI
  // can show it without re-deriving the same base_preset/active_preset
  // logic itself.
  if (effective.active_preset === 'custom' && preset !== 'none') {
    conflicts.push({
      key: 'active_preset',
      message: `Customized from the ${preset.charAt(0).toUpperCase()}${preset.slice(1)} preset — its layout and behavior still apply alongside your changes.`,
    });
  }

  return { effective, conflicts };
}
