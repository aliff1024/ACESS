'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { fetchFullProfile, saveAccessibilitySettings, type AccessibilitySettingsData } from '@/lib/learner-api';
import { useAuth } from './AuthProvider';

interface AccessibilityContextType {
  settings: AccessibilitySettingsData;
  updateSettings: (data: AccessibilitySettingsData) => Promise<void>;
  loading: boolean;
}

const defaultSettings: AccessibilitySettingsData = {
  preferred_font_size: 'medium',
  preferred_theme: 'light',
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
};

function applySettings(settings: AccessibilitySettingsData) {
  const root = document.documentElement;
  const fontSize = settings.preferred_font_size || 'medium';
  const theme = settings.preferred_theme || 'light';
  const lineSpacing = settings.line_spacing || 'normal';
  const fontType = settings.preferred_font || 'default';

  root.setAttribute('data-font-size', fontSize);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-line-spacing', lineSpacing);
  root.setAttribute('data-font-type', fontType);
  root.setAttribute('data-reduced-motion', String(!!settings.reduced_motion));
  root.setAttribute('data-simplified-ui', String(!!settings.simplified_ui));

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'high_contrast' || theme === 'light' || theme === 'soft') {
    root.classList.remove('dark');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  loading: true,
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccessibilitySettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchFullProfile()
      .then((profile) => {
        if (profile.accessibility) {
          const s = profile.accessibility;
          setSettings(s);
          applySettings(s);
        } else {
          applySettings(defaultSettings);
        }
      })
      .catch(() => {
        applySettings(defaultSettings);
      })
      .finally(() => setLoading(false));
  }, [user]);

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
    if (user) {
      await saveAccessibilitySettings(data).catch(console.error);
    }
  }, [user]);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
