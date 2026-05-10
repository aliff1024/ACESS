'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Type, Eye, AlignLeft, Volume2, FileText, Sparkles, Globe } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';
import type { AccessibilitySettingsData } from '@/lib/learner-api';

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fontSizes = ['small', 'medium', 'large', 'xlarge'] as const;
const themes = ['light', 'soft', 'dark', 'high_contrast'] as const;
const lineSpacings = ['normal', 'relaxed', 'loose'] as const;
const fontTypes = ['default', 'serif', 'sans_serif', 'dyslexia'] as const;

export function AccessibilitySettingsModal({
  isOpen,
  onClose,
}: AccessibilitySettingsModalProps) {
  const { settings, updateSettings } = useAccessibility();
  const { t, locale, setLocale } = useTranslation();

  const [preferred_font_size, setPreferredFontSize] = useState<string>('medium');
  const [preferred_theme, setPreferredTheme] = useState<string>('light');
  const [line_spacing, setLineSpacing] = useState<string>('normal');
  const [tts_enabled, setTtsEnabled] = useState(false);
  const [preferred_font, setPreferredFont] = useState<string>('default');
  const [reduced_motion, setReducedMotion] = useState(false);
  const [preferred_language, setPreferredLanguage] = useState<string>('en');

  useEffect(() => {
    if (isOpen) {
      setPreferredFontSize(settings.preferred_font_size || 'medium');
      setPreferredTheme(settings.preferred_theme || 'light');
      setLineSpacing(settings.line_spacing || 'normal');
      setTtsEnabled(!!settings.tts_enabled);
      setPreferredFont(settings.preferred_font || 'default');
      setReducedMotion(!!settings.reduced_motion);
      setPreferredLanguage(settings.preferred_language || 'en');
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setLocale(preferred_language as 'en' | 'ms');
    await updateSettings({
      ...settings,
      preferred_font_size: preferred_font_size as AccessibilitySettingsData['preferred_font_size'],
      preferred_theme: preferred_theme as AccessibilitySettingsData['preferred_theme'],
      line_spacing: line_spacing as AccessibilitySettingsData['line_spacing'],
      tts_enabled,
      preferred_font: preferred_font as AccessibilitySettingsData['preferred_font'],
      preferred_language: preferred_language as AccessibilitySettingsData['preferred_language'],
      reduced_motion,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl">{t('accessibility.title')}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('accessibility.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[65vh] px-6 py-5 space-y-4">
          {/* Font Size */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Type className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.fontSize')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.fontSizeDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {fontSizes.map((size) => (
                <Button
                  key={size}
                  variant={preferred_font_size === size ? 'default' : 'outline'}
                  onClick={() => setPreferredFontSize(size)}
                  className="h-auto py-1.5 text-sm capitalize"
                >
                  {t(`accessibility.${size}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.theme')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.themeDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={preferred_theme === 'light' ? 'default' : 'outline'}
                onClick={() => setPreferredTheme('light')}
                className="h-auto py-2"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 bg-white border-2 border-gray-300 rounded shrink-0"></div>
                  <span className="text-xs">{t('accessibility.light')}</span>
                </div>
              </Button>
              <Button
                variant={preferred_theme === 'soft' ? 'default' : 'outline'}
                onClick={() => setPreferredTheme('soft')}
                className="h-auto py-2"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 bg-amber-50 border-2 border-amber-200 rounded shrink-0"></div>
                  <span className="text-xs">{t('accessibility.soft')}</span>
                </div>
              </Button>
              <Button
                variant={preferred_theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setPreferredTheme('dark')}
                className="h-auto py-2"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 bg-gray-900 border-2 border-gray-700 rounded shrink-0"></div>
                  <span className="text-xs">{t('accessibility.dark')}</span>
                </div>
              </Button>
              <Button
                variant={preferred_theme === 'high_contrast' ? 'default' : 'outline'}
                onClick={() => setPreferredTheme('high_contrast')}
                className="h-auto py-2"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 bg-black border-2 border-yellow-400 rounded shrink-0"></div>
                  <span className="text-xs">{t('accessibility.highContrast')}</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <AlignLeft className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.lineSpacing')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.lineSpacingDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {lineSpacings.map((spacing) => (
                <Button
                  key={spacing}
                  variant={line_spacing === spacing ? 'default' : 'outline'}
                  onClick={() => setLineSpacing(spacing)}
                  className="h-auto py-1.5 text-sm capitalize"
                >
                  {t(`accessibility.${spacing}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Font Type */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.fontType')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.fontTypeDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {fontTypes.map((ft) => (
                <Button
                  key={ft}
                  variant={preferred_font === ft ? 'default' : 'outline'}
                  onClick={() => setPreferredFont(ft)}
                  className="h-auto py-1.5 text-sm capitalize"
                >
                  {t(`accessibility.${ft}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.language')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.languageDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={preferred_language === 'en' ? 'default' : 'outline'}
                onClick={() => setPreferredLanguage('en')}
                className="h-auto py-2 text-sm"
              >
                English
              </Button>
              <Button
                variant={preferred_language === 'ms' ? 'default' : 'outline'}
                onClick={() => setPreferredLanguage('ms')}
                className="h-auto py-2 text-sm"
              >
                Bahasa Melayu
              </Button>
            </div>
          </div>

          {/* TTS */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{t('accessibility.tts')}</Label>
                  <p className="text-xs text-gray-500">{t('accessibility.ttsDesc')}</p>
                </div>
              </div>
              <Switch checked={tts_enabled} onCheckedChange={setTtsEnabled} />
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{t('accessibility.reducedMotion')}</Label>
                  <p className="text-xs text-gray-500">{t('accessibility.reducedMotionDesc')}</p>
                </div>
              </div>
              <Switch checked={reduced_motion} onCheckedChange={setReducedMotion} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            {t('accessibility.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
