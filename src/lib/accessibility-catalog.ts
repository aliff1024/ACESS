import type { AccessibilitySettingsData } from '@/lib/learner-api'

// docs/accessibility/03 §8.3 / 10 §2 invariant #1: "No accessibility setting
// exists outside SETTING_CATALOG. If it is not in the catalog, it does not
// exist." This is that catalog — the single foundational piece every later
// Phase 9 item (the completeness CI gate, the Preset Details dialog's
// labels, a future settings-panel redesign, the PR checklist's first line
// item) depends on, and the reason docs/accessibility/02 §9's "Copy rules
// for setting descriptions" table existed without a home until now.
//
// docs/accessibility/00 §4 Phase 9 status note has the full reasoning for
// what shipped and what didn't this phase. In short: the catalog itself is
// built and wired into one real consumer (PresetDetailsDialog.tsx), plus a
// standalone completeness check (scripts/check-setting-catalog.ts) that
// actually runs and passes — but a full settings-panel redesign consuming
// every field (docs/accessibility/05 §4) was not attempted; that's a much
// larger UI change needing live verification this session doesn't have.
//
// Group taxonomy follows docs/accessibility/05 §4.4, not the narrower
// 4-value union first sketched in docs/accessibility/03 §8.3 — 05 postdates
// and refines it, splitting "Listening" out of "Reading" (it's a distinct
// modality with its own controls) and adding "Language". Using the more
// complete, later taxonomy here avoids building a catalog that would need
// its group field widened again the moment 05's settings panel is built.
//
// Fields deliberately not catalogued (legacy mirrors, derived values,
// profile bookkeeping) are listed with their reasons in
// CATALOG_EXCLUDED_KEYS below, not just in prose here — that's what
// scripts/check-setting-catalog.ts actually checks against, so the
// exclusion list can't silently drift from what's enforced.

export interface SettingMeta {
  key: keyof AccessibilitySettingsData
  /** 1–3 words, the learner's vocabulary — docs/accessibility/05 §8 */
  label: string
  group: 'reading' | 'focus' | 'sensory' | 'supports' | 'listening' | 'language'
  /** One sentence: what *you* will notice. Second person, present tense —
   *  docs/accessibility/02 §9 / 05 §8. Must describe current behaviour,
   *  never aspirational behaviour — a catalog entry that oversells a known
   *  gap (see `muted_colors`, `keyboard_navigation_enabled` below) is the
   *  exact failure this whole program's Phase 1 existed to remove. */
  plain: string
  /** Why this helps, sourced from doc 01. */
  why: string
  /** The standard or guide this cites, if any — docs/accessibility/10 §3 step 1
   *  ("justify it... cite the rule it implements"). */
  source?: string
  helps: ('dyslexia' | 'adhd' | 'autism')[]
  conflictsWith?: (keyof AccessibilitySettingsData)[]
  requires?: (keyof AccessibilitySettingsData)[]
  /** Set only for a setting whose current implementation doesn't match its
   *  label — docs/accessibility/10 §5 "retiring a setting" applies once a
   *  fix or removal decision is made. Surfaced here rather than silently
   *  catalogued as if it worked, per the same truthfulness principle as
   *  `plain`. */
  knownGap?: string
}

// Fields on AccessibilitySettingsData that are deliberately not in
// SETTING_CATALOG, with a one-line reason each — consumed by
// scripts/check-setting-catalog.ts so invariant #1 ("if it is not in the
// catalog, it does not exist") stays enforceable without breaking on the
// legacy/derived/profile fields that were never really learner-facing
// settings. Adding a new field to AccessibilitySettingsData without
// either cataloguing it or adding it here with a reason fails that check.
export const CATALOG_EXCLUDED_KEYS: Record<string, string> = {
  disability_type: 'profile/onboarding field, not a settings-row control',
  custom_notes: 'profile/onboarding field, not a settings-row control',
  active_preset: 'preset bookkeeping, not an independent setting a learner picks from a row',
  base_preset: 'preset bookkeeping, not an independent setting a learner picks from a row',
  preferred_font_size: 'legacy write-only mirror of font_size_px — never read for layout since Phase 1 (docs/accessibility/02 §2.2)',
  line_spacing: 'legacy write-only mirror of line_spacing_multiplier — never read for layout since Phase 1 (docs/accessibility/02 §2.3)',
  preferred_font: 'legacy write-only mirror of font_family',
  dyslexia_friendly_font: 'legacy write-only mirror of font_family',
  preferred_content_format: 'unused legacy field, no reader anywhere in the codebase',
  preferred_reading_level: 'feeds Easy-Read heuristics, not a directly rendered settings-row control today',
  tts_voice_uri: 'no UI writes this any more — voice is auto-assigned by preferred_language (AccessibilitySettingsModal.tsx)',
  high_contrast: 'derived from preferred_theme === "high_contrast" wherever it is set, not an independent control',
  chunked_content_mode: 'derived from layout_mode everywhere it is saved since the Phase 2 fix (docs/accessibility/02 §3.1)',
  screen_reader_optimized: '@deprecated in learner-api.ts already — retiring a field means cataloguing its replacement, not the field itself (docs/accessibility/10 §5)',
}

export const SETTING_CATALOG: Record<string, SettingMeta> = {
  font_family: {
    key: 'font_family',
    label: 'Font',
    group: 'reading',
    plain: 'Changes the typeface used for lesson text.',
    why: 'Atkinson Hyperlegible and OpenDyslexic use distinct letterforms (b/d, I/l/1) that are easier to tell apart than a default sans-serif.',
    source: 'docs/accessibility/01 §3.3',
    helps: ['dyslexia'],
  },
  font_size_px: {
    key: 'font_size_px',
    label: 'Font size',
    group: 'reading',
    plain: 'Makes lesson text larger or smaller. The reading column narrows to match, so lines never get too long to track.',
    why: 'Larger text reduces visual crowding; the column narrowing with it keeps every line within the WCAG 1.4.8 80-character cap regardless of size.',
    source: 'WCAG 1.4.8, WCAG 1.4.4',
    helps: ['dyslexia'],
  },
  line_spacing_multiplier: {
    key: 'line_spacing_multiplier',
    label: 'Line spacing',
    group: 'reading',
    plain: 'Adds space between lines of text.',
    why: 'Wider line spacing reduces the chance of a reader’s eye jumping to the wrong line, a common source of re-reading.',
    source: 'WCAG 1.4.12',
    helps: ['dyslexia'],
  },
  word_spacing_pct: {
    key: 'word_spacing_pct',
    label: 'Word spacing',
    group: 'reading',
    plain: 'Adds space between words.',
    why: 'Wider word spacing reduces visual crowding between words, one of the most consistently evidenced dyslexia accommodations.',
    source: 'WCAG 1.4.12 (0.16em floor), BDA Style Guide 2023 (word spacing ≥ 3× letter spacing)',
    helps: ['dyslexia'],
  },
  background_tint: {
    key: 'background_tint',
    label: 'Background',
    group: 'reading',
    plain: 'Changes the page background colour behind lesson text.',
    why: 'A tinted background reduces glare compared to pure white, which some dyslexic and light-sensitive readers find easier on the eyes.',
    helps: ['dyslexia', 'autism'],
    conflictsWith: ['low_contrast', 'preferred_theme'],
  },
  layout_mode: {
    key: 'layout_mode',
    label: 'Layout',
    group: 'focus',
    plain: 'Controls how lesson content is divided: Scroll (one continuous page), Slide (full-screen sections), or One Section at a Time (a single section with Next/Back).',
    why: 'One-section-at-a-time reduces how much is visible at once for a learner who loses their place easily or is easily overwhelmed by a long page.',
    source: 'COGA Objective 3, "Help users avoid unnecessary cognitive load"',
    helps: ['dyslexia', 'adhd'],
    conflictsWith: ['step_by_step_enabled'],
  },
  reading_spotlight: {
    key: 'reading_spotlight',
    label: 'Reading spotlight',
    group: 'focus',
    plain: 'Fades everything except the paragraph you are reading, so you do not lose your place.',
    why: 'Dimming surrounding text is a lighter-weight alternative to a physical reading ruler, reducing the chance of losing your position in a long page.',
    helps: ['dyslexia', 'adhd'],
  },
  distraction_free_mode: {
    key: 'distraction_free_mode',
    label: 'Distraction-free mode',
    group: 'focus',
    plain: 'Hides the sidebar and notifications. Your reading width stays the same.',
    why: 'Removing navigation chrome reduces the number of things competing for attention while reading, without sacrificing line length.',
    source: 'docs/accessibility/03 §3.1',
    helps: ['adhd', 'autism'],
  },
  simplified_ui: {
    key: 'simplified_ui',
    label: 'Simplified UI',
    group: 'focus',
    plain: 'Removes decorative elements and secondary navigation from the lesson page.',
    why: 'Fewer non-essential visual elements reduces the amount a learner has to filter out to find the content that matters.',
    helps: ['adhd', 'autism'],
  },
  animation_level: {
    key: 'animation_level',
    label: 'Animation',
    group: 'sensory',
    plain: 'Reduces or removes motion and transition effects across the site.',
    why: 'Motion can be a genuine barrier — distracting, nauseating, or simply too much sensory input — for some learners, and carries no learning value on its own.',
    source: 'WCAG 2.3.3',
    helps: ['autism', 'adhd'],
  },
  muted_colors: {
    key: 'muted_colors',
    label: 'Muted colors',
    group: 'sensory',
    plain: 'Reduces the saturation of colours across the site, including status colours like error red and success green.',
    why: 'Bright, saturated colour can be overstimulating for some autistic learners; softer colours reduce that without removing colour entirely.',
    helps: ['autism'],
    knownGap: 'Currently a global CSS filter (`filter: saturate(0.6)` on `<html>`) that desaturates warning/error/focus colours along with everything else — the opposite of the "stays clearly visible" claim a finished version of this setting should make. Deferred at Phase 1 item 8; tracked in docs/accessibility/02 §5.1 and IMPLEMENTATION-STATUS.md §7. The `plain` text above states the current behaviour, not the intended one.',
  },
  low_contrast: {
    key: 'low_contrast',
    label: 'Soft backgrounds',
    group: 'sensory',
    plain: 'Softens borders and panel edges. Your background colour choice is kept.',
    why: 'Hard borders and high-contrast panel edges add visual noise; softening them reduces that without touching text contrast, which stays at its required level.',
    source: 'docs/accessibility/02 §9',
    helps: ['autism', 'dyslexia'],
    conflictsWith: ['background_tint'],
  },
  preferred_theme: {
    key: 'preferred_theme',
    label: 'Theme',
    group: 'sensory',
    plain: 'Switches between a light and dark colour scheme for the whole site.',
    why: 'Some learners find a dark theme reduces eye strain, particularly for extended reading sessions.',
    helps: [],
    conflictsWith: ['background_tint'],
  },
  structure_mode: {
    key: 'structure_mode',
    label: 'Lesson structure',
    group: 'supports',
    plain: 'Controls how much structural scaffolding is shown: Full Schedule, Minimal Progress, or Checklist Mode (explicit expectations before every task).',
    why: 'Stating what a task is, how long it takes, and what counts as finished before it starts is COGA Objective 5 — "Provide Information So a User Can Complete and Prepare for a Task."',
    source: 'COGA Objective 5',
    helps: ['autism'],
  },
  task_checklist_enabled: {
    key: 'task_checklist_enabled',
    label: 'Task checklist',
    group: 'supports',
    plain: 'Shows a checklist of what is left to do in the current lesson.',
    why: 'An externalised task list reduces the working-memory burden of tracking what still needs doing, a common executive-function support for ADHD.',
    helps: ['adhd'],
  },
  visual_schedule_enabled: {
    key: 'visual_schedule_enabled',
    label: 'Visual schedule',
    group: 'supports',
    plain: 'Lists every part of the lesson before you start, with how long each part takes, and marks each one done as you finish it.',
    why: 'Seeing the whole path before taking the first step is COGA Objective 5, and is the specific promise the Autism preset is built around.',
    source: 'COGA Objective 5, docs/accessibility/03 §5.1',
    helps: ['autism'],
  },
  step_by_step_enabled: {
    key: 'step_by_step_enabled',
    label: 'Step-by-step guidance',
    group: 'supports',
    plain: 'Takes you through the lesson one phase at a time (video, content, activity, quiz), with a Next button and an explanation whenever it is disabled.',
    why: 'One clear next action, always visible, reduces the chance of a learner not knowing what to do next or feeling lost in a long page.',
    source: 'COGA Objective 4',
    helps: ['autism', 'adhd'],
    conflictsWith: ['layout_mode'],
  },
  auto_save_enabled: {
    key: 'auto_save_enabled',
    label: 'Auto-save indicator',
    group: 'supports',
    plain: 'Shows a save indicator. Your work is always saved automatically either way.',
    why: 'A visible save state removes the anxiety of not knowing whether progress would survive a crash, reload, or accidental navigation.',
    source: 'COGA "Avoid Data Loss", docs/accessibility/02 §9',
    helps: ['adhd', 'autism'],
  },
  progress_timeline_enabled: {
    key: 'progress_timeline_enabled',
    label: 'Progress timeline',
    group: 'supports',
    plain: 'Shows which modules you have finished and which one you are on.',
    why: 'An always-visible sense of position in a course reduces the disorientation of not knowing how much is left.',
    source: 'docs/accessibility/02 §9',
    helps: ['adhd', 'autism'],
  },
  tts_enabled: {
    key: 'tts_enabled',
    label: 'Listen (text-to-speech)',
    group: 'listening',
    plain: 'Shows reading controls that read lesson text aloud when you press Listen. It will not start on its own.',
    why: 'Bimodal text-plus-audio is one of the best-supported accommodations for dyslexia; hearing text while reading it reduces decoding load.',
    source: 'docs/accessibility/01 §3.4, WCAG 3.2.5',
    helps: ['dyslexia'],
  },
  tts_rate: {
    key: 'tts_rate',
    label: 'Speech speed',
    group: 'listening',
    plain: 'Changes how fast the Listen voice reads.',
    why: 'Processing speed for spoken language varies; a fixed rate makes TTS unusable for whoever it does not happen to suit by default.',
    helps: ['dyslexia'],
    requires: ['tts_enabled'],
  },
  captions_enabled: {
    key: 'captions_enabled',
    label: 'Captions',
    group: 'listening',
    plain: 'Shows captions on video content by default.',
    why: 'Captions support deaf and hard-of-hearing learners, and also help anyone processing spoken content more slowly than it plays.',
    source: 'WCAG 1.2.2',
    helps: [],
  },
  preferred_language: {
    key: 'preferred_language',
    label: 'Language',
    group: 'language',
    plain: 'Switches the interface language between English and Bahasa Melayu.',
    why: 'A learner reading in a second language carries extra cognitive load on top of any other barrier this program addresses.',
    helps: [],
  },
  keyboard_navigation_enabled: {
    key: 'keyboard_navigation_enabled',
    label: 'Keyboard navigation',
    group: 'sensory',
    plain: 'Intended to show visible focus indicators and enable a skip-to-content link.',
    why: 'Keyboard operability is WCAG 2.1.1, a Level A requirement — it should not be optional at all, let alone hidden behind a setting a learner has to find first.',
    source: 'WCAG 2.1.1, WCAG 2.4.7',
    helps: [],
    knownGap: 'Sets `data-keyboard-nav` and nothing reads it (docs/accessibility/02 §4.6). Keyboard operability must work unconditionally, not as an opt-in — this entry exists so the gap is visible in the catalog rather than silently absent, per docs/accessibility/10 §5’s retirement process: either implement what the label promises, or retire it and redefine it as something it can actually do (e.g. "show keyboard shortcut hints").',
  },
}

export function getSettingMeta(key: string): SettingMeta | undefined {
  return SETTING_CATALOG[key]
}

export function getSettingsByGroup(group: SettingMeta['group']): SettingMeta[] {
  return Object.values(SETTING_CATALOG).filter((s) => s.group === group)
}
