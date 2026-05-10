import { useContext } from 'react';
import { LanguageContext } from '@/providers/LanguageProvider';

export function useTranslation() {
  const { t, locale, setLocale } = useContext(LanguageContext);
  return { t, locale, setLocale };
}
