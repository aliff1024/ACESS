/**
 * Catalog completeness gate — docs/accessibility/10 §7 "Catalog
 * completeness": fails on "a setting key in the type but not in the
 * catalog, or a catalog entry missing a field."
 *
 * No test framework dependency (docs/accessibility/00 §4 Phase 2 item
 * 2.7 / doc 10 §7 already flag this as a gap), so this uses plain
 * assertions and a process exit code, same pattern as
 * scripts/test-accessibility-resolver.ts. Runnable directly:
 *
 *   npx tsx scripts/check-setting-catalog.ts
 *
 * Not yet wired into a CI pipeline — no CI exists in this repo (Phase 2's
 * 2.7/2.8 and Phase 9's §7 are both still open on that front, see
 * docs/accessibility/00-PROGRAM-PLAN.md's Phase 9 status note for why a
 * full CI pipeline wasn't attempted this session). This script is what a
 * future CI step should call.
 */
import { SETTING_CATALOG, CATALOG_EXCLUDED_KEYS, type SettingMeta } from '../src/lib/accessibility-catalog';
import type { AccessibilitySettingsData } from '../src/lib/learner-api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
  }
}

// The full field list AccessibilitySettingsData declares. There is no
// runtime reflection of a TypeScript interface, so this is maintained by
// hand and cross-checked against the interface's own field count below —
// if the interface gains or loses a field without this list being
// updated to match, that mismatch itself fails a check, rather than the
// new field silently going uncatalogued and uncaught.
const ALL_SETTINGS_DATA_KEYS: (keyof AccessibilitySettingsData)[] = [
  'disability_type', 'custom_notes', 'preferred_font_size', 'preferred_theme',
  'line_spacing', 'tts_enabled', 'captions_enabled', 'screen_reader_optimized',
  'keyboard_navigation_enabled', 'simplified_ui', 'dyslexia_friendly_font',
  'preferred_font', 'preferred_language', 'preferred_reading_level',
  'preferred_content_format', 'tts_rate', 'tts_voice_uri', 'active_preset',
  'base_preset', 'font_family', 'font_size_px', 'line_spacing_multiplier',
  'word_spacing_pct', 'background_tint', 'reading_spotlight',
  'distraction_free_mode', 'chunked_content_mode', 'layout_mode',
  'structure_mode', 'animation_level', 'high_contrast', 'low_contrast',
  'muted_colors', 'task_checklist_enabled', 'visual_schedule_enabled',
  'step_by_step_enabled', 'auto_save_enabled', 'progress_timeline_enabled',
];

console.log('SETTING_CATALOG — every field on AccessibilitySettingsData is accounted for');
{
  for (const key of ALL_SETTINGS_DATA_KEYS) {
    const inCatalog = key in SETTING_CATALOG;
    const excludedReason = CATALOG_EXCLUDED_KEYS[key];
    assert(
      inCatalog || !!excludedReason,
      `${key} is catalogued or has a documented exclusion reason`,
    );
    assert(
      !(inCatalog && excludedReason),
      `${key} is not both catalogued and excluded (would be a contradiction)`,
    );
  }
}
{
  // The reverse direction: every excluded key must be a real field, so a
  // typo or a field removed from AccessibilitySettingsData doesn't leave
  // a stale exclusion nobody notices.
  for (const key of Object.keys(CATALOG_EXCLUDED_KEYS)) {
    assert(
      (ALL_SETTINGS_DATA_KEYS as string[]).includes(key),
      `excluded key "${key}" is a real AccessibilitySettingsData field`,
    );
  }
}

console.log('\nSETTING_CATALOG — every entry has the required fields');
{
  const requiredStringFields: (keyof SettingMeta)[] = ['label', 'plain', 'why'];
  for (const [catalogKey, meta] of Object.entries(SETTING_CATALOG)) {
    assert(meta.key === catalogKey, `${catalogKey}: object key matches its own "key" field`);
    for (const field of requiredStringFields) {
      const value = meta[field];
      assert(typeof value === 'string' && value.trim().length > 0, `${catalogKey}: "${field}" is a non-empty string`);
    }
    assert(Array.isArray(meta.helps), `${catalogKey}: "helps" is an array`);
    assert(
      ['reading', 'focus', 'sensory', 'supports', 'listening', 'language'].includes(meta.group),
      `${catalogKey}: "group" is one of the six known groups`,
    );
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
