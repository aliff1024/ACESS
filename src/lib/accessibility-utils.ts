import type { AccessibilitySettingsData } from '@/lib/learner-api';

// ─── Font Families ─────────────────────────────────────────────────────

export const FONT_FAMILIES = [
  { value: 'arial', label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { value: 'verdana', label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { value: 'calibri', label: 'Calibri', css: "Calibri, 'Gill Sans', sans-serif" },
  { value: 'atkinson_hyperlegible', label: 'Atkinson Hyperlegible', css: "'Atkinson Hyperlegible', sans-serif" },
  { value: 'opendyslexic', label: 'OpenDyslexic', css: "'OpenDyslexic', sans-serif" },
] as const;

export function getFontFamilyCss(fontFamily: string): string {
  return FONT_FAMILIES.find((f) => f.value === fontFamily)?.css ?? 'Arial, Helvetica, sans-serif';
}

// ─── Background Tints ──────────────────────────────────────────────────

export const BACKGROUND_TINTS = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'cream', label: 'Cream', hex: '#FDF6E2' },
  { value: 'pale_blue', label: 'Pale Blue', hex: '#EBF4FA' },
  { value: 'soft_green', label: 'Soft Green', hex: '#F0F7F0' },
  { value: 'grey', label: 'Grey', hex: '#F0F0F0' },
] as const;

export function getBackgroundTintHex(tint: string): string {
  return BACKGROUND_TINTS.find((t) => t.value === tint)?.hex ?? '#FFFFFF';
}

// ─── Animation Levels ──────────────────────────────────────────────────

export const ANIMATION_LEVELS = [
  { value: 'none', label: 'None', description: 'No animations or transitions' },
  { value: 'low', label: 'Low', description: 'Subtle 100ms transitions only' },
  { value: 'normal', label: 'Normal', description: 'Standard UI animations' },
] as const;

// ─── Easy Read Presets (legacy, still functional) ──────────────────────

export const EASY_READ_PRESETS: Pick<
  AccessibilitySettingsData,
  'preferred_font_size' | 'preferred_theme' | 'line_spacing' | 'preferred_font' | 'reduced_motion' | 'simplified_ui'
> = {
  preferred_font_size: 'xlarge',
  preferred_theme: 'high_contrast',
  line_spacing: 'loose',
  preferred_font: 'dyslexia',
  reduced_motion: true,
  simplified_ui: true,
};

export function shouldAutoEnableEasyRead(readingLevel?: string | null): boolean {
  return readingLevel === 'basic' || readingLevel === 'simplified';
}

export function mergeEasyReadSettings(
  current: AccessibilitySettingsData,
  enabled: boolean,
): AccessibilitySettingsData {
  if (!enabled) {
    return { ...current, simplified_ui: false };
  }
  return { ...current, ...EASY_READ_PRESETS };
}

export function applyReadingLevelDefaults(
  settings: AccessibilitySettingsData,
): AccessibilitySettingsData {
  if (!shouldAutoEnableEasyRead(settings.preferred_reading_level)) {
    return settings;
  }
  if (settings.simplified_ui) {
    return settings;
  }
  return mergeEasyReadSettings(settings, true);
}

// ─── TTS Utilities ─────────────────────────────────────────────────────

export const TTS_SPEED_OPTIONS = [
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5, label: '1.5×' },
] as const;

/** Browsers (especially on Windows) may return duplicate voices with the same voiceURI. */
export function dedupeSpeechVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const seen = new Set<string>();
  return voices.filter((voice) => {
    if (seen.has(voice.voiceURI)) return false;
    seen.add(voice.voiceURI);
    return true;
  });
}

// ─── Preset-related Utilities ──────────────────────────────────────────

/** Convert legacy enum font size to pixel value */
export function fontSizeEnumToPx(enumVal: string | null | undefined): number {
  switch (enumVal) {
    case 'small': return 14;
    case 'medium': return 16;
    case 'large': return 18;
    case 'xlarge': return 20;
    default: return 16;
  }
}

/** Convert pixel font size to legacy enum */
export function fontSizePxToEnum(px: number): string {
  if (px <= 14) return 'small';
  if (px <= 16) return 'medium';
  if (px <= 18) return 'large';
  return 'xlarge';
}

/** Convert legacy enum line spacing to multiplier */
export function lineSpacingEnumToMultiplier(enumVal: string | null | undefined): number {
  switch (enumVal) {
    case 'normal': return 1.5;
    case 'relaxed': return 1.8;
    case 'loose': return 2.0;
    default: return 1.5;
  }
}

/** Convert line spacing multiplier to legacy enum */
export function lineSpacingMultiplierToEnum(multiplier: number): string {
  if (multiplier <= 1.4) return 'normal';
  if (multiplier <= 1.7) return 'relaxed';
  return 'loose';
}

/** Convert legacy font type to font family */
export function fontTypeToFamily(fontType: string | null | undefined): string {
  switch (fontType) {
    case 'dyslexia': return 'opendyslexic';
    case 'sans_serif': return 'arial';
    case 'serif': return 'arial';
    default: return 'arial';
  }
}
