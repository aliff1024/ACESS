'use client';

import { createContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { en } from '@/locales/en';
import { ms } from '@/locales/ms';
import { useAccessibility } from './AccessibilityProvider';

type Locale = 'en' | 'ms';

const translations: Record<Locale, Record<string, string>> = { en, ms };

export interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);
  const { settings, updateSettings } = useAccessibility();

  useEffect(() => {
    const stored = localStorage.getItem('preferred_language') as Locale | null;
    if (stored === 'en' || stored === 'ms') {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred_language', newLocale);
    if (settings) {
      updateSettings({ ...settings, preferred_language: newLocale }).catch(() => {});
    }
  }, [settings, updateSettings]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const lookup = translations[locale]?.[key];
    if (!lookup) return key;
    if (!params) return lookup;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(`{${k}}`, String(v)),
      lookup
    );
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LanguageContext value={value}>
      {children}
    </LanguageContext>
  );
}
