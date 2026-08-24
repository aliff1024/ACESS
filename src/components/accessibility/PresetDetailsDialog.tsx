'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { ACCESSIBILITY_PRESETS, DEFAULT_PRESET_SETTINGS, getPresetDiff } from '@/lib/adaptive-engine';
import { FONT_FAMILIES, BACKGROUND_TINTS, ANIMATION_LEVELS } from '@/lib/accessibility-utils';
import { SETTING_CATALOG } from '@/lib/accessibility-catalog';
import type { AccessibilitySettingsData } from '@/lib/learner-api';

// docs/accessibility/03 §8 "The Preset Details dialog" / 05 §5 item 1:
// selecting a preset chip used to apply it immediately, with no
// description, no diff, no way to see what was about to change before it
// changed. This is the settings-modal half of that requirement (trigger
// point 1 of 3 in 03 §8.1) — the onboarding PresetCard trigger (point 2)
// is a separate flow with its own pre-existing bugs and wasn't touched
// this phase; see the Phase 7 status note.
//
// Reduced from the full spec, deliberately: no separate "Preview" step
// distinct from "Apply" — the modal already live-previews every local
// state change the instant it happens (see
// AccessibilitySettingsModal.tsx's previewSettings effect), so "Apply"
// here just sets that local state (visible immediately) and the whole
// modal's existing Cancel-reverts-everything behaviour is what makes the
// choice reversible, same as it already was for every other control in
// this panel.
//
// docs/accessibility/00 §4 Phase 9: field labels below now read from
// SETTING_CATALOG (accessibility-catalog.ts), built that phase — this
// dialog originally (Phase 7) had its own hardcoded label map because no
// catalog existed yet. A couple of fields getPresetDiff() can still
// surface aren't in the catalog by design (accessibility-catalog.ts's
// CATALOG_EXCLUDED_KEYS: chunked_content_mode is derived from layout_mode,
// high_contrast is derived from preferred_theme) — EXTRA_LABELS below
// covers just those two, so a diff entry never falls back to a raw field
// name.
const EXTRA_LABELS: Record<string, string> = {
  chunked_content_mode: 'One section at a time',
  high_contrast: 'High contrast',
};

const LAYOUT_LABELS: Record<string, string> = { scroll: 'Scroll', slide: 'Slide', chunked: 'One section at a time' };
const STRUCTURE_LABELS: Record<string, string> = { full: 'Full schedule', minimal: 'Minimal progress', checklist: 'Checklist mode' };

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (key === 'font_family') return FONT_FAMILIES.find((f) => f.value === value)?.label ?? String(value);
  if (key === 'font_size_px') return `${value}px`;
  if (key === 'line_spacing_multiplier') return `${value}x`;
  if (key === 'word_spacing_pct') return `${value}%`;
  if (key === 'background_tint') return BACKGROUND_TINTS.find((t) => t.value === value)?.label ?? String(value);
  if (key === 'animation_level') return ANIMATION_LEVELS.find((a) => a.value === value)?.label ?? String(value);
  if (key === 'layout_mode') return LAYOUT_LABELS[value as string] ?? String(value);
  if (key === 'structure_mode') return STRUCTURE_LABELS[value as string] ?? String(value);
  return String(value);
}

interface PresetDetailsDialogProps {
  /** 'none' means the Default preset — reverting every setting to its
   *  baseline, not one of the three named ACCESSIBILITY_PRESETS entries. */
  presetId: string;
  currentSettings: Partial<AccessibilitySettingsData>;
  onCancel: () => void;
  onApply: () => void;
}

export function PresetDetailsDialog({ presetId, currentSettings, onCancel, onApply }: PresetDetailsDialogProps) {
  const preset = presetId === 'none' ? null : ACCESSIBILITY_PRESETS[presetId];
  const label = preset ? preset.label.replace(' Preset', '') : 'Default';
  const goal = preset ? preset.goal : 'Remove every preset customization and return to the default experience.';

  // getPresetDiff() only knows named presets; for 'none' the diff is
  // against DEFAULT_PRESET_SETTINGS directly, computed the same way
  // getPresetDiff computes it internally.
  const diffs = presetId === 'none'
    ? Object.entries(DEFAULT_PRESET_SETTINGS)
        .filter(([key, value]) => (currentSettings as Record<string, unknown>)[key] !== value)
        .map(([key, value]) => ({ key, from: (currentSettings as Record<string, unknown>)[key], to: value }))
    : getPresetDiff(presetId, currentSettings);

  // Diagnosed at docs/accessibility/03 §6.1 / LessonViewPage.tsx (search
  // "isSlideMode"): ADHD and Autism force slide view off in the lesson
  // viewer regardless of the layout_mode setting. That's a real behaviour
  // change this preset causes, but it isn't reflected in the settings
  // diff above (it's enforced in code, not a stored value), so it's
  // stated separately rather than silently omitted.
  const disablesSlideView = presetId === 'adhd' || presetId === 'autism';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0 text-left">
          <DialogTitle className="text-xl">{label} preset</DialogTitle>
          <DialogDescription className="text-gray-600">{goal}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {preset && preset.additional_features.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">What this turns on</p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {preset.additional_features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {disablesSlideView && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Slide view becomes unavailable under this preset — lessons always show as a
              scrolling or one-section-at-a-time page instead, so how much is left always
              stays visible.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {diffs.length > 0 ? `Changes from your current settings (${diffs.length})` : 'No changes from your current settings'}
            </p>
            {diffs.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {diffs.map((d) => (
                  <div key={d.key} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">{SETTING_CATALOG[d.key]?.label ?? EXTRA_LABELS[d.key] ?? d.key}</span>
                      <span className="text-gray-900 font-medium text-right shrink-0">
                        {formatValue(d.key, d.from)} <span className="text-gray-400">→</span> {formatValue(d.key, d.to)}
                      </span>
                    </div>
                    {/* SETTING_CATALOG's `why` field (docs/accessibility/00
                        §4 Phase 9) already carries a specific, sourced
                        explanation for almost every field a preset diff
                        can touch — this is the "make a simple description
                        why each one being done" request, using text that
                        already existed rather than writing a second copy
                        of it. A couple of derived fields (chunked_content_mode,
                        high_contrast) aren't in the catalog and simply
                        don't get a line here. */}
                    {SETTING_CATALOG[d.key]?.why && (
                      <p className="text-xs text-gray-500 mt-1">{SETTING_CATALOG[d.key].why}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            You can change any of this afterwards, one setting at a time, from this same panel.
          </p>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={onApply}>
            Apply preset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
