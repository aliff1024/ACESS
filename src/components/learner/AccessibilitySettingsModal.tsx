'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Type, Eye, AlignLeft, Volume2, FileText, Sparkles, Globe, BookOpen } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';
import type { AccessibilitySettingsData } from '@/lib/learner-api';
import { dedupeSpeechVoices, mergeEasyReadSettings, shouldAutoEnableEasyRead, TTS_SPEED_OPTIONS } from '@/lib/accessibility-utils';

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fontSizes = ['small', 'medium', 'large', 'xlarge'] as const;

const lineSpacings = ['normal', 'relaxed', 'loose'] as const;
const fontTypes = ['default', 'serif', 'sans_serif', 'dyslexia'] as const;

export function AccessibilitySettingsModal({
  isOpen,
  onClose,
}: AccessibilitySettingsModalProps) {
  const { settings, updateSettings } = useAccessibility();
  const { t, setLocale } = useTranslation();

  const [preferred_font_size, setPreferredFontSize] = useState<string>(() => settings.preferred_font_size || 'medium');
  const [preferred_theme, setPreferredTheme] = useState<string>(() => settings.preferred_theme || 'light');
  const [line_spacing, setLineSpacing] = useState<string>(() => settings.line_spacing || 'normal');
  const [tts_enabled, setTtsEnabled] = useState<boolean>(() => !!settings.tts_enabled);
  const [preferred_font, setPreferredFont] = useState<string>(() => settings.preferred_font || 'default');
  const [reduced_motion, setReducedMotion] = useState<boolean>(() => !!settings.reduced_motion);
  const [preferred_language, setPreferredLanguage] = useState<string>(() => settings.preferred_language || 'en');
  const [captions_enabled, setCaptionsEnabled] = useState<boolean>(() => !!settings.captions_enabled);
  const [screen_reader_optimized, setScreenReaderOptimized] = useState<boolean>(() => !!settings.screen_reader_optimized);
  const [keyboard_navigation_enabled, setKeyboardNavigationEnabled] = useState<boolean>(() => !!settings.keyboard_navigation_enabled);
  const [simplified_ui, setSimplifiedUi] = useState<boolean>(() => !!settings.simplified_ui);
  const [preferred_reading_level, setPreferredReadingLevel] = useState<string>(() => settings.preferred_reading_level || 'standard');
  const [tts_rate, setTtsRate] = useState<number>(() => settings.tts_rate ?? 1);
  const [tts_voice_uri, setTtsVoiceUri] = useState<string>(() => settings.tts_voice_uri || '');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => setAvailableVoices(dedupeSpeechVoices(window.speechSynthesis.getVoices()));
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [isOpen]);

  const handleEasyReadToggle = (enabled: boolean) => {
    if (enabled) {
      const merged = mergeEasyReadSettings(
        {
          ...settings,
          preferred_font_size: preferred_font_size as AccessibilitySettingsData['preferred_font_size'],
          preferred_theme: preferred_theme as AccessibilitySettingsData['preferred_theme'],
          line_spacing: line_spacing as AccessibilitySettingsData['line_spacing'],
          preferred_font: preferred_font as AccessibilitySettingsData['preferred_font'],
          reduced_motion,
          simplified_ui,
        },
        true,
      );
      setSimplifiedUi(true);
      setPreferredFontSize(merged.preferred_font_size || 'xlarge');
      setPreferredTheme(merged.preferred_theme || 'high_contrast');
      setLineSpacing(merged.line_spacing || 'loose');
      setPreferredFont(merged.preferred_font || 'dyslexia');
      setReducedMotion(true);
    } else {
      setSimplifiedUi(false);
    }
  };

  const handleReadingLevelChange = (level: string) => {
    setPreferredReadingLevel(level);
    if (shouldAutoEnableEasyRead(level)) {
      handleEasyReadToggle(true);
    }
  };

  const handleSave = async () => {
    setLocale(preferred_language as 'en' | 'ms');
    await updateSettings({
      ...settings,
      preferred_font_size: preferred_font_size as AccessibilitySettingsData['preferred_font_size'],
      preferred_theme: preferred_theme as AccessibilitySettingsData['preferred_theme'],
      line_spacing: line_spacing as AccessibilitySettingsData['line_spacing'],
      tts_enabled,
      captions_enabled,
      screen_reader_optimized,
      keyboard_navigation_enabled,
      preferred_font: preferred_font as AccessibilitySettingsData['preferred_font'],
      preferred_language: preferred_language as AccessibilitySettingsData['preferred_language'],
      reduced_motion,
      simplified_ui,
      preferred_reading_level: preferred_reading_level || null,
      tts_rate,
      tts_voice_uri: tts_voice_uri || null,
    });
    onClose();
  };

  return (
    <Dialog key={isOpen ? 'open' : 'closed'} open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-2xl">{t('accessibility.title')}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('accessibility.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[65vh] px-6 py-5 space-y-4">
          {/* Easy Read Mode */}
          <div className="border-2 border-yellow-400 bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-yellow-200 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-yellow-700" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-bold text-yellow-900">Easy Read Mode</Label>
                  <p className="text-xs text-yellow-700">
                    One tap to enable all cognitive support features: large text, high contrast, dyslexia font, wide spacing, simplified UI, and reduced motion
                  </p>
                </div>
              </div>
              <Switch checked={simplified_ui} onCheckedChange={handleEasyReadToggle} />
            </div>
          </div>

          {/* Reading Level */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <Label className="text-sm font-semibold">{t('accessibility.readingLevel')}</Label>
                <p className="text-xs text-gray-500">{t('accessibility.readingLevelDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['basic', 'standard', 'advanced'] as const).map((level) => (
                <Button
                  key={level}
                  variant={preferred_reading_level === level ? 'default' : 'outline'}
                  onClick={() => handleReadingLevelChange(level)}
                  className="h-auto py-1.5 text-sm capitalize"
                >
                  {level === 'basic' ? t('accessibility.readingBasic') : level === 'standard' ? t('accessibility.readingStandard') : t('accessibility.readingAdvanced')}
                </Button>
              ))}
            </div>
          </div>

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
            {tts_enabled && (
              <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">{t('accessibility.ttsSpeed')}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {TTS_SPEED_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={tts_rate === opt.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTtsRate(opt.value)}
                        className="h-auto py-1 text-xs"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {availableVoices.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">{t('accessibility.ttsVoice')}</Label>
                    <select
                      value={tts_voice_uri}
                      onChange={(e) => setTtsVoiceUri(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">System default</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
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

          {/* Captions */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{t('accessibility.captions')}</Label>
                  <p className="text-xs text-gray-500">{t('accessibility.captionsDesc')}</p>
                </div>
              </div>
              <Switch checked={captions_enabled} onCheckedChange={setCaptionsEnabled} />
            </div>
          </div>

          {/* Screen Reader Optimized */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{t('accessibility.screenReader')}</Label>
                  <p className="text-xs text-gray-500">{t('accessibility.screenReaderDesc')}</p>
                </div>
              </div>
              <Switch checked={screen_reader_optimized} onCheckedChange={setScreenReaderOptimized} />
            </div>
          </div>

          {/* Keyboard Navigation */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <Type className="w-4 h-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">{t('accessibility.keyboardNav')}</Label>
                  <p className="text-xs text-gray-500">{t('accessibility.keyboardNavDesc')}</p>
                </div>
              </div>
              <Switch checked={keyboard_navigation_enabled} onCheckedChange={setKeyboardNavigationEnabled} />
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
