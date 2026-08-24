/**
 * Unit tests for src/lib/accessibility-resolver.ts.
 *
 * No test framework dependency — the repo has none configured yet
 * (docs/accessibility/00 §4 Phase 2 item 2.7 / doc 10 §7 flag this as a
 * gap), so this uses plain assertions and a process exit code, runnable
 * with the `tsx` devDependency already in package.json:
 *
 *   npx tsx scripts/test-accessibility-resolver.ts
 *
 * Each case corresponds to a specific row in docs/accessibility/02 §7
 * (the conflict matrix) that resolveSettings() is meant to fix or
 * explain. When Phase 2's CI gates (doc 10 §7) land, wire this in as
 * the resolver's merge-blocking check rather than replacing it with a
 * framework from scratch.
 */
import { resolveSettings } from '../src/lib/accessibility-resolver';
import type { AccessibilitySettingsData } from '../src/lib/learner-api';

let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       actual:   ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
  }
}

function s(partial: Partial<AccessibilitySettingsData>): AccessibilitySettingsData {
  return partial as AccessibilitySettingsData;
}

console.log('resolveSettings — one layout axis (docs/accessibility/02 §3.1, §3.4)');
{
  // Legacy row: chunked_content_mode true but layout_mode never updated
  // to match (rows saved before the 'chunked' layout_mode value existed).
  const { effective } = resolveSettings(s({ chunked_content_mode: true, layout_mode: 'scroll' }));
  assertEqual(effective.layout_mode, 'chunked', 'legacy chunked_content_mode=true normalizes layout_mode to chunked');
  assertEqual(effective.chunked_content_mode, true, 'chunked_content_mode stays true after normalization');
}
{
  // The opposite skew: layout_mode already 'chunked' but the boolean
  // mirror wasn't updated to match.
  const { effective } = resolveSettings(s({ chunked_content_mode: false, layout_mode: 'chunked' }));
  assertEqual(effective.chunked_content_mode, true, 'layout_mode=chunked forces chunked_content_mode to true');
}
{
  const { effective } = resolveSettings(s({ chunked_content_mode: false, layout_mode: 'scroll' }));
  assertEqual(effective.layout_mode, 'scroll', 'scroll stays scroll when nothing conflicts');
  assertEqual(effective.chunked_content_mode, false, 'chunked_content_mode stays false for scroll');
}
{
  const { effective } = resolveSettings(s({ layout_mode: 'slide' }));
  assertEqual(effective.chunked_content_mode, false, 'slide always derives chunked_content_mode=false');
}

console.log('\nresolveSettings — slide unavailable under ADHD/Autism (docs/accessibility/02 §7)');
{
  const { conflicts } = resolveSettings(s({ layout_mode: 'slide', base_preset: 'adhd' }));
  assert(conflicts.some((c) => c.key === 'layout_mode'), 'slide + ADHD preset produces a layout_mode conflict');
}
{
  const { conflicts } = resolveSettings(s({ layout_mode: 'slide', base_preset: 'autism' }));
  assert(conflicts.some((c) => c.key === 'layout_mode'), 'slide + Autism preset produces a layout_mode conflict');
}
{
  const { conflicts } = resolveSettings(s({ layout_mode: 'slide', base_preset: 'dyslexia' }));
  assert(!conflicts.some((c) => c.key === 'layout_mode'), 'slide + Dyslexia preset produces no layout_mode conflict');
}
{
  const { conflicts } = resolveSettings(s({ layout_mode: 'chunked', base_preset: 'adhd' }));
  assert(!conflicts.some((c) => c.key === 'layout_mode'), 'chunked + ADHD preset produces no layout_mode conflict');
}
{
  // base_preset takes precedence over active_preset for this check too —
  // the same rule Phase 1 fixed in computeAdaptiveSettings.
  const { conflicts } = resolveSettings(s({ layout_mode: 'slide', active_preset: 'custom', base_preset: 'autism' }));
  assert(conflicts.some((c) => c.key === 'layout_mode'), 'slide conflict reads base_preset, not active_preset');
}

console.log('\nresolveSettings — ground colour precedence (docs/accessibility/02 §5.2, §7)');
{
  const { conflicts } = resolveSettings(s({ low_contrast: true, background_tint: 'cream' }));
  assert(conflicts.some((c) => c.key === 'low_contrast'), 'Soft Backgrounds + a non-white tint produces a low_contrast conflict');
}
{
  const { conflicts } = resolveSettings(s({ low_contrast: true, background_tint: 'white' }));
  assert(!conflicts.some((c) => c.key === 'low_contrast'), 'Soft Backgrounds + white tint produces no conflict (nothing to protect)');
}
{
  const { conflicts } = resolveSettings(s({ low_contrast: false, background_tint: 'cream' }));
  assert(!conflicts.some((c) => c.key === 'low_contrast'), 'Cream tint alone (Soft Backgrounds off) produces no conflict');
}

console.log('\nresolveSettings — preset customization notice (docs/accessibility/02 §5)');
{
  const { conflicts } = resolveSettings(s({ active_preset: 'custom', base_preset: 'dyslexia' }));
  assert(conflicts.some((c) => c.key === 'active_preset'), 'active_preset=custom with a base_preset produces a notice');
}
{
  const { conflicts } = resolveSettings(s({ active_preset: 'custom', base_preset: 'none' }));
  assert(!conflicts.some((c) => c.key === 'active_preset'), 'active_preset=custom with base_preset=none produces no notice');
}
{
  const { conflicts } = resolveSettings(s({ active_preset: 'dyslexia', base_preset: 'dyslexia' }));
  assert(!conflicts.some((c) => c.key === 'active_preset'), 'an unmodified preset produces no customization notice');
}

console.log('\nresolveSettings — purity');
{
  const input = s({ chunked_content_mode: true, layout_mode: 'scroll', low_contrast: true, background_tint: 'cream' });
  const before = JSON.stringify(input);
  resolveSettings(input);
  assertEqual(JSON.stringify(input), before, 'resolveSettings does not mutate its input');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
