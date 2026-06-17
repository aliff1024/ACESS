'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { fetchFullProfile, saveAccessibilitySettings, type AccessibilitySettingsData } from '@/lib/learner-api';
import { useAuth } from './AuthProvider';
import { applyReadingLevelDefaults } from '@/lib/accessibility-utils';
import { computeAdaptiveSettings, type EffectiveAccessibilitySettings } from '@/lib/adaptive-engine';

interface AccessibilityContextType {
  settings: AccessibilitySettingsData;
  adaptiveOverrides: EffectiveAccessibilitySettings;
  updateSettings: (data: AccessibilitySettingsData) => Promise<void>;
  loading: boolean;
}

const defaultSettings: AccessibilitySettingsData = {
  preferred_font_size: 'medium',
  preferred_theme: 'system',
  line_spacing: 'normal',
  tts_enabled: false,
  captions_enabled: false,
  screen_reader_optimized: false,
  keyboard_navigation_enabled: false,
  reduced_motion: false,
  simplified_ui: false,
  dyslexia_friendly_font: false,
  preferred_font: 'default',
  preferred_language: 'en',
  preferred_reading_level: 'standard',
  tts_rate: 1,
  tts_voice_uri: null,
};

function applySettings(settings: AccessibilitySettingsData) {
  const root = document.documentElement;
  const fontSize = settings.preferred_font_size || 'medium';
  const theme = settings.preferred_theme || 'light';
  const lineSpacing = settings.line_spacing || 'normal';
  const fontType = settings.preferred_font || (settings.dyslexia_friendly_font ? 'dyslexia' : 'default');

  root.setAttribute('data-font-size', fontSize);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-line-spacing', lineSpacing);
  root.setAttribute('data-font-type', fontType);
  root.setAttribute('data-reduced-motion', String(!!settings.reduced_motion));
  root.setAttribute('data-simplified-ui', String(!!settings.simplified_ui));
  root.setAttribute('data-screen-reader', String(!!settings.screen_reader_optimized));
  root.setAttribute('data-keyboard-nav', String(!!settings.keyboard_navigation_enabled));

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'high_contrast' || theme === 'light' || theme === 'soft') {
    root.classList.remove('dark');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

const defaultOverrides: EffectiveAccessibilitySettings = {
  ui: defaultSettings,
  lesson_modes: { focus_mode: false, chunked_content: false, guided_mode: false, checkpoints: false, simplified_summary: false },
  active_recommendation: null,
  active_disability: null,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: defaultSettings,
  adaptiveOverrides: defaultOverrides,
  updateSettings: async () => {},
  loading: true,
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccessibilitySettingsData>(defaultSettings);
  const [adaptiveOverrides, setAdaptiveOverrides] = useState<EffectiveAccessibilitySettings>({
    ui: defaultSettings,
    lesson_modes: { focus_mode: false, chunked_content: false, guided_mode: false, checkpoints: false, simplified_summary: false },
    active_recommendation: null,
    active_disability: null,
  });
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  const recomputeAdaptive = useCallback((s: AccessibilitySettingsData) => {
    const computed = computeAdaptiveSettings(s.disability_type, s);
    setAdaptiveOverrides(computed);
  }, []);

  useEffect(() => {
    if (!user) {
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    if (fetched.current) return;
    fetched.current = true;

    fetchFullProfile()
      .then((profile) => {
        if (profile.accessibility) {
          const s = applyReadingLevelDefaults(profile.accessibility);
          setSettings(s);
          applySettings(s);
          recomputeAdaptive(s);
        } else {
          applySettings(defaultSettings);
        }
      })
      .catch(() => {
        applySettings(defaultSettings);
      })
      .finally(() => setLoading(false));
  }, [user, recomputeAdaptive]);

  useEffect(() => {
    if (settings.preferred_theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.preferred_theme]);

  const updateSettings = useCallback(async (data: AccessibilitySettingsData) => {
    setSettings(data);
    applySettings(data);
    recomputeAdaptive(data);
    if (user) {
      await saveAccessibilitySettings(data).catch(console.error);
    }
  }, [user, recomputeAdaptive]);

  return (
    <AccessibilityContext.Provider value={{ settings, adaptiveOverrides, updateSettings, loading }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
