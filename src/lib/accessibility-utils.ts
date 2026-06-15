import type { AccessibilitySettingsData } from '@/lib/learner-api';

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
