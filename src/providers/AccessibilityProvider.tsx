'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { fetchFullProfile, saveAccessibilitySettings, type AccessibilitySettingsData } from '@/lib/learner-api';
import { useAuth } from './AuthProvider';
import { applyReadingLevelDefaults } from '@/lib/accessibility-utils';
import { computeAdaptiveSettings, applyPreset as applyPresetSettings, type EffectiveAccessibilitySettings } from '@/lib/adaptive-engine';
import { resolveSettings, type SettingConflict } from '@/lib/accessibility-resolver';

interface AccessibilityContextType {
  settings: AccessibilitySettingsData;
  adaptiveOverrides: EffectiveAccessibilitySettings;
  userAgeGroup: '6-12' | '13-17' | '18+';
  updateSettings: (data: AccessibilitySettingsData) => Promise<void>;
  previewSettings: (data: AccessibilitySettingsData) => void;
  revertSettings: () => void;
  applyPreset: (presetName: string) => Promise<void>;
  loading: boolean;
  distractionFreeOverride: boolean | null;
  setDistractionFreeOverride: (val: boolean | null) => void;
  /** Plain-language explanations from resolveSettings() for whichever
   *  precedence rules fired against the current settings — e.g. "Slide
   *  view isn't available with the ADHD preset". Additive: nothing reads
   *  this yet, but it's live and correct now so the settings-panel work
   *  in docs/accessibility/05 (inline conflict notices per row) has a
   *  real source instead of needing to re-derive these rules itself. */
  settingsConflicts: SettingConflict[];
}

const defaultSettings: AccessibilitySettingsData = {
  preferred_font_size: 'medium',
  preferred_theme: 'light',
  line_spacing: 'normal',
  tts_enabled: false,
  captions_enabled: false,
  keyboard_navigation_enabled: false,
  simplified_ui: false,
  dyslexia_friendly_font: false,
  preferred_font: 'default',
  preferred_language: 'en',
  preferred_reading_level: 'standard',
  tts_rate: 1,
  tts_voice_uri: null,
  // Preset fields
  active_preset: 'none',
  base_preset: 'none',
  font_family: 'arial',
  font_size_px: 16,
  line_spacing_multiplier: 1.5,
  word_spacing_pct: 0,
  background_tint: 'white',
  reading_spotlight: false,
  distraction_free_mode: false,
  chunked_content_mode: false,
  layout_mode: 'slide',
  structure_mode: 'full',
  animation_level: 'normal',
  high_contrast: false,
  low_contrast: false,
  muted_colors: false,
  task_checklist_enabled: false,
  visual_schedule_enabled: false,
  step_by_step_enabled: false,
  // Unlike the other executive-function supports above, this used to default
  // to true for every learner — which would surface the AutoSaveIndicator
  // pill on the default (no-preset) page the moment it's mounted anywhere,
  // even though the indicator is meant as an ADHD/Dyslexia/Autism support.
  // Lessons already autosave regardless of this flag; it only gates the
  // visual indicator, so defaulting it off keeps the default page clean.
  auto_save_enabled: false,
  progress_timeline_enabled: false,
  ai_assistant_enabled: true,
};

function applySettingsToDOM(settings: Partial<AccessibilitySettingsData>, distractionFreeOverride: boolean | null = null) {
  const root = document.documentElement;

  // ─── Legacy data-* attributes (backward compatibility) ─────────────
  const fontSize = settings.preferred_font_size || 'medium';
  const theme = settings.preferred_theme || 'light';
  const lineSpacing = settings.line_spacing || 'normal';
  const fontType = settings.preferred_font || (settings.dyslexia_friendly_font ? 'dyslexia' : 'default');

  root.setAttribute('data-font-size', fontSize);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-line-spacing', lineSpacing);
  root.setAttribute('data-font-type', fontType);
  root.setAttribute('data-simplified-ui', String(!!settings.simplified_ui));
  root.setAttribute('data-keyboard-nav', String(!!settings.keyboard_navigation_enabled));

  // ─── New preset data-* attributes ─────────────────────────────────
  const fontFamily = settings.font_family || 'arial';
  const fontSizePx = settings.font_size_px ?? 16;
  const lineSpacingMultiplier = settings.line_spacing_multiplier ?? 1.5;
  const wordSpacingPct = settings.word_spacing_pct ?? 0;
  const backgroundTint = settings.background_tint || 'white';
  const animationLevel = settings.animation_level || 'normal';

  // Use base_preset (survives individual setting tweaks) rather than
  // active_preset (resets to 'custom' the moment anything is manually
  // changed) so the preset's color palette and preset-gated behavior
  // don't silently disappear after one small adjustment.
  const activePreset = settings.base_preset || settings.active_preset || 'none';

  root.setAttribute('data-preset', activePreset);
  root.setAttribute('data-font-family', fontFamily);
  root.setAttribute('data-bg-tint', backgroundTint);
  root.setAttribute('data-reading-spotlight', String(!!settings.reading_spotlight));
  const isDistractionFree = distractionFreeOverride ?? settings.distraction_free_mode;
  root.setAttribute('data-distraction-free', String(!!isDistractionFree));
  root.setAttribute('data-chunked', String(!!settings.chunked_content_mode));
  root.setAttribute('data-layout-mode', settings.layout_mode || 'slide');
  root.setAttribute('data-structure-mode', settings.structure_mode || 'full');
  root.setAttribute('data-animation-level', animationLevel);
  root.setAttribute('data-soft-bg', String(!!settings.low_contrast));
  // data-low-contrast intentionally no longer emitted: it drove a deprecated
  // `filter: contrast(0.85)` rule that *reduced* text contrast — the
  // opposite of what an accessibility setting should do. See globals.css.
  root.setAttribute('data-muted-colors', String(!!settings.muted_colors));

  // ─── CSS custom properties for continuous values ──────────────────
  root.style.setProperty('--user-font-size', `${fontSizePx}px`);
  root.style.setProperty('--user-line-spacing', String(lineSpacingMultiplier));
  // ×0.4em (not the old ×0.3em) so the slider's own maximum, 50%, reaches
  // 0.2em — comfortably past the WCAG 1.4.12 floor of 0.16em, which now
  // sits at 40% instead of being unreachable at any slider position.
  root.style.setProperty('--user-word-spacing', `${(wordSpacingPct / 100) * 0.4}em`);

  // ─── Theme class management ───────────────────────────────────────
  const isDarkPreset = backgroundTint.startsWith('dark_');
  if (theme === 'dark' || isDarkPreset) {
    root.classList.add('dark');
  } else if (theme === 'high_contrast' || theme === 'light' || theme === 'soft') {
    root.classList.remove('dark');
  }
}

const defaultOverrides: EffectiveAccessibilitySettings = {
  ui: defaultSettings,
  lesson_modes: { focus_mode: false, chunked_content: false, checkpoints: false, simplified_summary: false, guided_mode: false },
  active_recommendation: null,
  active_disability: null,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: defaultSettings,
  adaptiveOverrides: defaultOverrides,
  userAgeGroup: '18+',
  updateSettings: async () => {},
  previewSettings: () => {},
  revertSettings: () => {},
  applyPreset: async () => {},
  loading: true,
  distractionFreeOverride: null,
  setDistractionFreeOverride: () => {},
  settingsConflicts: [],
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const getInitialSettings = (): AccessibilitySettingsData => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('acess_accessibility_settings');
        if (stored) {
          return JSON.parse(stored) as AccessibilitySettingsData;
        }
      } catch (e) {}
    }
    return defaultSettings;
  };

  const [settings, setSettings] = useState<AccessibilitySettingsData>(getInitialSettings);
  const [adaptiveOverrides, setAdaptiveOverrides] = useState<EffectiveAccessibilitySettings>({
    ui: defaultSettings,
    lesson_modes: { focus_mode: false, chunked_content: false, checkpoints: false, simplified_summary: false, guided_mode: false },
    active_recommendation: null,
    active_disability: null,
  });
  const [persistedSettings, setPersistedSettings] = useState<AccessibilitySettingsData>(getInitialSettings);
  const [userAgeGroup, setUserAgeGroup] = useState<'6-12' | '13-17' | '18+'>('18+');
  const [loading, setLoading] = useState(true);
  const [distractionFreeOverride, setDistractionFreeOverride] = useState<boolean | null>(null);
  const [settingsConflicts, setSettingsConflicts] = useState<SettingConflict[]>([]);
  const fetched = useRef(false);

  const recomputeAdaptive = useCallback((s: AccessibilitySettingsData) => {
    // resolveSettings normalizes the layout_mode/chunked_content_mode
    // split (and any other precedence rule that applies) before it ever
    // reaches computeAdaptiveSettings or the DOM — see
    // src/lib/accessibility-resolver.ts. Every consumer downstream of
    // adaptiveOverrides.ui now sees one consistent, already-resolved
    // settings object instead of re-deriving the same rules itself.
    const { effective, conflicts } = resolveSettings(s);
    const computed = computeAdaptiveSettings(effective.disability_type, effective);
    setAdaptiveOverrides(computed);
    setSettingsConflicts(conflicts);
  }, []);

  // Effect to apply the distraction free override to the DOM without requiring a full save.
  // Applies adaptiveOverrides.ui (settings merged with the disability_type-driven
  // recommendation, user settings always winning) rather than raw `settings` —
  // otherwise a learner's declared disability type never visibly changes anything,
  // since only .lesson_modes was previously read from the recommendation.
  useEffect(() => {
    applySettingsToDOM(adaptiveOverrides.ui, distractionFreeOverride);
  }, [distractionFreeOverride, adaptiveOverrides]);

  useEffect(() => {
    if (!user) {
      applySettingsToDOM(defaultSettings);
      setSettings(defaultSettings);
      setPersistedSettings(defaultSettings);
      localStorage.removeItem('acess_accessibility_settings');
      fetched.current = false;
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    if (fetched.current) return;
    fetched.current = true;

    fetchFullProfile()
      .then((profile) => {
        // Calculate Age Group
        let computedAgeGroup: '6-12' | '13-17' | '18+' = '18+';
        if (profile.profile?.birth_date) {
          const birthDate = new Date(profile.profile.birth_date);
          const ageDifMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDifMs);
          const age = Math.abs(ageDate.getUTCFullYear() - 1970);
          if (age <= 12) computedAgeGroup = '6-12';
          else if (age <= 17) computedAgeGroup = '13-17';
        }
        setUserAgeGroup(computedAgeGroup);

        if (profile.accessibility) {
          const s = applyReadingLevelDefaults(profile.accessibility);
          setSettings(s);
          setPersistedSettings(s);
          applySettingsToDOM(s);
          recomputeAdaptive(s);
          if (typeof window !== 'undefined') {
            localStorage.setItem('acess_accessibility_settings', JSON.stringify(s));
          }
        } else {
          applySettingsToDOM(defaultSettings);
          if (typeof window !== 'undefined') {
            localStorage.setItem('acess_accessibility_settings', JSON.stringify(defaultSettings));
          }
        }
      })
      .catch(() => {
        applySettingsToDOM(defaultSettings);
      })
      .finally(() => setLoading(false));
  }, [user, recomputeAdaptive]);

  const updateSettings = useCallback(async (data: AccessibilitySettingsData) => {
    setSettings(data);
    setPersistedSettings(data);
    applySettingsToDOM(data);
    recomputeAdaptive(data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acess_accessibility_settings', JSON.stringify(data));
    }
    if (user) {
      await saveAccessibilitySettings(data).catch(console.error);
    }
  }, [user, recomputeAdaptive]);

  const previewSettings = useCallback((data: AccessibilitySettingsData) => {
    setSettings(data);
    applySettingsToDOM(data);
    recomputeAdaptive(data);
  }, [recomputeAdaptive]);

  const revertSettings = useCallback(() => {
    setSettings(persistedSettings);
    applySettingsToDOM(persistedSettings);
    recomputeAdaptive(persistedSettings);
  }, [persistedSettings, recomputeAdaptive]);

  const applyPreset = useCallback(async (presetName: string) => {
    const newSettings = applyPresetSettings(presetName, settings);
    setSettings(newSettings);
    applySettingsToDOM(newSettings);
    recomputeAdaptive(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acess_accessibility_settings', JSON.stringify(newSettings));
    }
    if (user) {
      await saveAccessibilitySettings(newSettings).catch(console.error);
    }
  }, [user, settings, recomputeAdaptive]);

  return (
    <AccessibilityContext.Provider value={{
      settings, adaptiveOverrides, userAgeGroup,
      updateSettings, previewSettings, revertSettings, applyPreset, loading,
      distractionFreeOverride, setDistractionFreeOverride, settingsConflicts
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
