'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loader2, Type, Target, Eye, ListChecks, Volume2, Globe, FileText } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';
import { dedupeSpeechVoices, TTS_SPEED_OPTIONS, FONT_FAMILIES, ANIMATION_LEVELS } from '@/lib/accessibility-utils';
import { ACCESSIBILITY_PRESETS, DEFAULT_PRESET_SETTINGS, getAllPresets } from '@/lib/adaptive-engine';
import { SliderSetting } from '@/components/accessibility/SliderSetting';
import { TintPicker } from '@/components/accessibility/TintPicker';

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySettingsModal({
  isOpen,
  onClose,
}: AccessibilitySettingsModalProps) {
  const { settings, updateSettings, previewSettings, revertSettings } = useAccessibility();
  const { t, setLocale } = useTranslation();

  const [activePreset, setActivePreset] = useState<string>(() => settings.active_preset || 'none');
  
  // Reading
  const [fontFamily, setFontFamily] = useState<string>(() => settings.font_family || 'arial');
  const [fontSizePx, setFontSizePx] = useState<number>(() => settings.font_size_px ?? 16);
  const [lineSpacingMultiplier, setLineSpacingMultiplier] = useState<number>(() => settings.line_spacing_multiplier ?? 1.5);
  const [wordSpacingPct, setWordSpacingPct] = useState<number>(() => settings.word_spacing_pct ?? 0);
  const [backgroundTint, setBackgroundTint] = useState<string>(() => settings.background_tint || 'white');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => !!settings.tts_enabled);
  const [ttsRate, setTtsRate] = useState<number>(() => settings.tts_rate ?? 1);
  const [ttsVoiceUri, setTtsVoiceUri] = useState<string>(() => settings.tts_voice_uri || '');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(() => settings.preferred_language || 'en');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saving, setSaving] = useState(false);

  // Focus
  const [layoutMode, setLayoutMode] = useState<'scroll'|'slide'|'chunked'>(() => settings.layout_mode || 'slide');
  const [structureMode, setStructureMode] = useState<'full'|'minimal'|'checklist'>(() => settings.structure_mode || 'full');
  const [readingSpotlight, setReadingSpotlight] = useState<boolean>(() => !!settings.reading_spotlight);
  const [distractionFreeMode, setDistractionFreeMode] = useState<boolean>(() => !!settings.distraction_free_mode);
  const [chunkedContentMode, setChunkedContentMode] = useState<boolean>(() => !!settings.chunked_content_mode);
  const [simplifiedUi, setSimplifiedUi] = useState<boolean>(() => !!settings.simplified_ui);

  // Sensory
  const [preferredTheme, setPreferredTheme] = useState<string>(() => settings.preferred_theme || 'light');
  const [animationLevel, setAnimationLevel] = useState<string>(() => settings.animation_level || 'normal');
  const [mutedColors, setMutedColors] = useState<boolean>(() => !!settings.muted_colors);
  const [lowContrast, setLowContrast] = useState<boolean>(() => !!settings.low_contrast);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(() => !!settings.captions_enabled);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState<boolean>(() => !!settings.keyboard_navigation_enabled);

  // Supports
  const [taskChecklistEnabled, setTaskChecklistEnabled] = useState<boolean>(() => !!settings.task_checklist_enabled);
  const [visualScheduleEnabled, setVisualScheduleEnabled] = useState<boolean>(() => !!settings.visual_schedule_enabled);
  const [stepByStepEnabled, setStepByStepEnabled] = useState<boolean>(() => !!settings.step_by_step_enabled);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => settings.auto_save_enabled ?? true);
  const [progressTimelineEnabled, setProgressTimelineEnabled] = useState<boolean>(() => !!settings.progress_timeline_enabled);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => setAvailableVoices(dedupeSpeechVoices(window.speechSynthesis.getVoices()));
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setActivePreset(settings.active_preset || 'none');
    setFontFamily(settings.font_family || 'arial');
    setFontSizePx(settings.font_size_px ?? 16);
    setLineSpacingMultiplier(settings.line_spacing_multiplier ?? 1.5);
    setWordSpacingPct(settings.word_spacing_pct ?? 0);
    setBackgroundTint(settings.background_tint || 'white');
    setTtsEnabled(!!settings.tts_enabled);
    setTtsRate(settings.tts_rate ?? 1);
    setTtsVoiceUri(settings.tts_voice_uri || '');
    setPreferredLanguage(settings.preferred_language || 'en');
    setReadingSpotlight(!!settings.reading_spotlight);
    setDistractionFreeMode(!!settings.distraction_free_mode);
    setChunkedContentMode(!!settings.chunked_content_mode);
    setLayoutMode(settings.layout_mode || 'slide');
    setStructureMode(settings.structure_mode || 'full');
    setSimplifiedUi(!!settings.simplified_ui);
    setPreferredTheme(settings.preferred_theme || 'light');
    setAnimationLevel(settings.animation_level || 'normal');
    setMutedColors(!!settings.muted_colors);
    setLowContrast(!!settings.low_contrast);
    setCaptionsEnabled(!!settings.captions_enabled);
    setKeyboardNavigationEnabled(!!settings.keyboard_navigation_enabled);
    setTaskChecklistEnabled(!!settings.task_checklist_enabled);
    setVisualScheduleEnabled(!!settings.visual_schedule_enabled);
    setStepByStepEnabled(!!settings.step_by_step_enabled);
    setAutoSaveEnabled(settings.auto_save_enabled ?? true);
    setProgressTimelineEnabled(!!settings.progress_timeline_enabled);
  }, [isOpen]); // Only sync when modal opens

  // Push preview to context when local states change
  useEffect(() => {
    if (!isOpen) return;
    previewSettings({
      ...settings,
      active_preset: activePreset,
      font_family: fontFamily,
      font_size_px: fontSizePx,
      line_spacing_multiplier: lineSpacingMultiplier,
      word_spacing_pct: wordSpacingPct,
      background_tint: backgroundTint,
      tts_enabled: ttsEnabled,
      tts_rate: ttsRate,
      tts_voice_uri: ttsVoiceUri || null,
      preferred_language: preferredLanguage,
      reading_spotlight: readingSpotlight,
      distraction_free_mode: distractionFreeMode,
      chunked_content_mode: chunkedContentMode,
      layout_mode: layoutMode,
      structure_mode: structureMode,
      simplified_ui: simplifiedUi,
      preferred_theme: preferredTheme,
      animation_level: animationLevel,
      muted_colors: mutedColors,
      low_contrast: lowContrast,
      captions_enabled: captionsEnabled,
      keyboard_navigation_enabled: keyboardNavigationEnabled,
      task_checklist_enabled: taskChecklistEnabled,
      visual_schedule_enabled: visualScheduleEnabled,
      step_by_step_enabled: stepByStepEnabled,
      auto_save_enabled: autoSaveEnabled,
      progress_timeline_enabled: progressTimelineEnabled,
      // Update legacy mappings
      preferred_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible' ? 'dyslexia' : 'default',
      dyslexia_friendly_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible',
      high_contrast: preferredTheme === 'high_contrast',
    });
  }, [
    isOpen, activePreset, fontFamily, fontSizePx, lineSpacingMultiplier, wordSpacingPct, backgroundTint, ttsEnabled,
    ttsRate, ttsVoiceUri, preferredLanguage, readingSpotlight, distractionFreeMode, chunkedContentMode, layoutMode, structureMode, simplifiedUi,
    preferredTheme, animationLevel, mutedColors, lowContrast, captionsEnabled, keyboardNavigationEnabled,
    taskChecklistEnabled, visualScheduleEnabled, stepByStepEnabled, autoSaveEnabled, progressTimelineEnabled, previewSettings
  ]);

  const setCustom = () => {
    setActivePreset('custom');
  };

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    let s;
    if (presetId === 'none') {
      s = DEFAULT_PRESET_SETTINGS;
    } else {
      s = ACCESSIBILITY_PRESETS[presetId]?.settings;
    }
    if (s) {
      setFontFamily(s.font_family);
      setFontSizePx(s.font_size_px);
      setLineSpacingMultiplier(s.line_spacing_multiplier);
      setWordSpacingPct(s.word_spacing_pct);
      setBackgroundTint(s.background_tint);
      setTtsEnabled(s.tts_enabled);
      setReadingSpotlight(s.reading_spotlight);
      setDistractionFreeMode(s.distraction_free_mode);
      setChunkedContentMode(s.chunked_content_mode);
      setSimplifiedUi(s.simplified_ui);
      setLayoutMode(s.layout_mode || 'slide');
      setStructureMode(s.structure_mode || 'full');
      setAnimationLevel(s.animation_level);
      setMutedColors(s.muted_colors);
      setLowContrast(s.low_contrast);
      setPreferredTheme(s.preferred_theme);
      setTaskChecklistEnabled(s.task_checklist_enabled);
      setVisualScheduleEnabled(s.visual_schedule_enabled);
      setStepByStepEnabled(s.step_by_step_enabled);
      setAutoSaveEnabled(s.auto_save_enabled);
      setProgressTimelineEnabled(s.progress_timeline_enabled);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setLocale(preferredLanguage as 'en' | 'ms');
      await updateSettings({
        ...settings,
        active_preset: activePreset,
        font_family: fontFamily,
        font_size_px: fontSizePx,
        line_spacing_multiplier: lineSpacingMultiplier,
        word_spacing_pct: wordSpacingPct,
        background_tint: backgroundTint,
        tts_enabled: ttsEnabled,
        tts_rate: ttsRate,
        tts_voice_uri: ttsVoiceUri || null,
        preferred_language: preferredLanguage,
        reading_spotlight: readingSpotlight,
        distraction_free_mode: distractionFreeMode,
        chunked_content_mode: chunkedContentMode,
        layout_mode: layoutMode,
        structure_mode: structureMode,
        simplified_ui: simplifiedUi,
        preferred_theme: preferredTheme,
        animation_level: animationLevel,
        muted_colors: mutedColors,
        low_contrast: lowContrast,
        captions_enabled: captionsEnabled,
        keyboard_navigation_enabled: keyboardNavigationEnabled,
        task_checklist_enabled: taskChecklistEnabled,
        visual_schedule_enabled: visualScheduleEnabled,
        step_by_step_enabled: stepByStepEnabled,
        auto_save_enabled: autoSaveEnabled,
        progress_timeline_enabled: progressTimelineEnabled,
        // Update legacy mappings
        preferred_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible' ? 'dyslexia' : 'default',
        dyslexia_friendly_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible',
        high_contrast: preferredTheme === 'high_contrast',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    revertSettings();
    onClose();
  };

  return (
    <Dialog key={isOpen ? 'open' : 'closed'} open={isOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden h-[85vh] max-h-[800px] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-2xl">{t('accessibility.title')}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('accessibility.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Quick Apply Preset</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activePreset === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleApplyPreset('none')}
              className={activePreset === 'none' ? 'bg-blue-600 text-white' : ''}
            >
              Default
            </Button>
            {getAllPresets().map((preset) => (
              <Button
                key={preset.id}
                variant={activePreset === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleApplyPreset(preset.id)}
                className={activePreset === preset.id ? 'bg-blue-600 text-white' : ''}
              >
                {preset.label.replace(' Preset', '')}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="reading" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-2 border-b border-gray-100 shrink-0">
            <TabsList className="bg-transparent space-x-2">
              <TabsTrigger value="reading" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none rounded-md px-3 py-1.5 flex items-center gap-2">
                <Type className="w-4 h-4" /> Reading
              </TabsTrigger>
              <TabsTrigger value="focus" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none rounded-md px-3 py-1.5 flex items-center gap-2">
                <Target className="w-4 h-4" /> Focus
              </TabsTrigger>
              <TabsTrigger value="sensory" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none rounded-md px-3 py-1.5 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Sensory
              </TabsTrigger>
              <TabsTrigger value="supports" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none rounded-md px-3 py-1.5 flex items-center gap-2">
                <ListChecks className="w-4 h-4" /> Supports
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 min-h-0">
            {/* Reading Tab */}
            <TabsContent value="reading" className="space-y-4 m-0">
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-2 block">Font Family</Label>
                <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); setCustom(); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SliderSetting
                label="Font Size"
                value={fontSizePx}
                min={12}
                max={24}
                step={1}
                unit="px"
                onChange={(v) => { setFontSizePx(v); setCustom(); }}
              />

              <SliderSetting
                label="Line Spacing"
                value={lineSpacingMultiplier}
                min={1.0}
                max={3.0}
                step={0.1}
                unit="x"
                onChange={(v) => { setLineSpacingMultiplier(Math.round(v * 10) / 10); setCustom(); }}
              />

              <SliderSetting
                label="Word Spacing"
                value={wordSpacingPct}
                min={0}
                max={50}
                step={5}
                unit="%"
                onChange={(v) => { setWordSpacingPct(v); setCustom(); }}
              />

              <TintPicker value={backgroundTint} onChange={(v) => { setBackgroundTint(v); setCustom(); }} />

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
                    variant={preferredLanguage === 'en' ? 'default' : 'outline'}
                    onClick={() => { setPreferredLanguage('en'); setCustom(); }}
                    className="h-auto py-2 text-sm"
                  >
                    English
                  </Button>
                  <Button
                    variant={preferredLanguage === 'ms' ? 'default' : 'outline'}
                    onClick={() => { setPreferredLanguage('ms'); setCustom(); }}
                    className="h-auto py-2 text-sm"
                  >
                    Bahasa Melayu
                  </Button>
                </div>
              </div>

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
                  <Switch checked={ttsEnabled} onCheckedChange={(v) => { setTtsEnabled(v); setCustom(); }} />
                </div>
                {ttsEnabled && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
                    <div>
                      <Label className="text-xs text-gray-600 mb-2 block">{t('accessibility.ttsSpeed')}</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {TTS_SPEED_OPTIONS.map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            variant={ttsRate === opt.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setTtsRate(opt.value); setCustom(); }}
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
                          value={ttsVoiceUri}
                          onChange={(e) => { setTtsVoiceUri(e.target.value); setCustom(); }}
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
            </TabsContent>

            {/* Focus Tab */}
            <TabsContent value="focus" className="space-y-4 m-0">
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-3 block">Layout Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant={layoutMode === 'scroll' ? 'default' : 'outline'} onClick={() => { setLayoutMode('scroll'); setCustom(); }} className="h-auto py-2"><span className="text-xs">Scroll View</span></Button>
                  <Button variant={layoutMode === 'slide' ? 'default' : 'outline'} onClick={() => { setLayoutMode('slide'); setCustom(); }} className="h-auto py-2"><span className="text-xs">Slide View</span></Button>
                  <Button variant={layoutMode === 'chunked' ? 'default' : 'outline'} onClick={() => { setLayoutMode('chunked'); setCustom(); }} className="h-auto py-2"><span className="text-xs">Chunked View</span></Button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Reading Spotlight</Label>
                  <p className="text-xs text-gray-500">Dim surrounding content to highlight current paragraph</p>
                </div>
                <Switch checked={readingSpotlight} onCheckedChange={(v) => { setReadingSpotlight(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Distraction-Free Mode</Label>
                  <p className="text-xs text-gray-500">Hide sidebar, widgets, and notifications</p>
                </div>
                <Switch checked={distractionFreeMode} onCheckedChange={(v) => { setDistractionFreeMode(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Chunked Content</Label>
                  <p className="text-xs text-gray-500">Show one section at a time</p>
                </div>
                <Switch checked={chunkedContentMode} onCheckedChange={(v) => { setChunkedContentMode(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Simplified UI</Label>
                  <p className="text-xs text-gray-500">Remove decorative elements, timers, and secondary navigation</p>
                </div>
                <Switch checked={simplifiedUi} onCheckedChange={(v) => { setSimplifiedUi(v); setCustom(); }} />
              </div>
            </TabsContent>

            {/* Sensory Tab */}
            <TabsContent value="sensory" className="space-y-4 m-0">
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-3 block">Theme</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant={preferredTheme === 'light' ? 'default' : 'outline'} onClick={() => { setPreferredTheme('light'); setCustom(); }} className="h-auto py-2">
                    <div className="flex flex-col items-center gap-1.5"><div className="w-7 h-7 bg-white border-2 border-gray-300 rounded shrink-0"></div><span className="text-xs">Light</span></div>
                  </Button>
                  <Button variant={preferredTheme === 'soft' ? 'default' : 'outline'} onClick={() => { setPreferredTheme('soft'); setCustom(); }} className="h-auto py-2">
                    <div className="flex flex-col items-center gap-1.5"><div className="w-7 h-7 bg-amber-50 border-2 border-amber-200 rounded shrink-0"></div><span className="text-xs">Soft</span></div>
                  </Button>
                  <Button variant={preferredTheme === 'dark' ? 'default' : 'outline'} onClick={() => { setPreferredTheme('dark'); setCustom(); }} className="h-auto py-2">
                    <div className="flex flex-col items-center gap-1.5"><div className="w-7 h-7 bg-gray-900 border-2 border-gray-700 rounded shrink-0"></div><span className="text-xs">Dark</span></div>
                  </Button>
                  <Button variant={preferredTheme === 'high_contrast' ? 'default' : 'outline'} onClick={() => { setPreferredTheme('high_contrast'); setCustom(); }} className="h-auto py-2">
                    <div className="flex flex-col items-center gap-1.5"><div className="w-7 h-7 bg-black border-2 border-yellow-400 rounded shrink-0"></div><span className="text-xs">High Contrast</span></div>
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-3 block">Animation Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ANIMATION_LEVELS.map((level) => (
                    <Button key={level.value} variant={animationLevel === level.value ? 'default' : 'outline'} onClick={() => { setAnimationLevel(level.value); setCustom(); }} className="h-auto py-2 text-sm">
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Muted Colors</Label>
                  <p className="text-xs text-gray-500">Use calm, desaturated colors</p>
                </div>
                <Switch checked={mutedColors} onCheckedChange={(v) => { setMutedColors(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Soft Backgrounds</Label>
                  <p className="text-xs text-gray-500">Softer backgrounds and borders, keeps text readable</p>
                </div>
                <Switch checked={lowContrast} onCheckedChange={(v) => { setLowContrast(v); setCustom(); }} />
              </div>

              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <Type className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-semibold">{t('accessibility.keyboardNav')}</Label>
                    <p className="text-xs text-gray-500">{t('accessibility.keyboardNavDesc')}</p>
                  </div>
                </div>
                <Switch checked={keyboardNavigationEnabled} onCheckedChange={(v) => { setKeyboardNavigationEnabled(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-semibold">{t('accessibility.captions')}</Label>
                    <p className="text-xs text-gray-500">{t('accessibility.captionsDesc')}</p>
                  </div>
                </div>
                <Switch checked={captionsEnabled} onCheckedChange={(v) => { setCaptionsEnabled(v); setCustom(); }} />
              </div>
            </TabsContent>

            {/* Supports Tab */}
            <TabsContent value="supports" className="space-y-4 m-0">
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-3 block">Lesson Structure</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant={structureMode === 'full' ? 'default' : 'outline'} onClick={() => { setStructureMode('full'); setCustom(); }} className="h-auto py-2"><span className="text-xs text-center">Full Schedule</span></Button>
                  <Button variant={structureMode === 'minimal' ? 'default' : 'outline'} onClick={() => { setStructureMode('minimal'); setCustom(); }} className="h-auto py-2"><span className="text-xs text-center">Minimal Progress</span></Button>
                  <Button variant={structureMode === 'checklist' ? 'default' : 'outline'} onClick={() => { setStructureMode('checklist'); setCustom(); }} className="h-auto py-2"><span className="text-xs text-center">Checklist Mode</span></Button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Task Checklist</Label>
                  <p className="text-xs text-gray-500">Show today&apos;s tasks as a checklist</p>
                </div>
                <Switch checked={taskChecklistEnabled} onCheckedChange={(v) => { setTaskChecklistEnabled(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Visual Schedule</Label>
                  <p className="text-xs text-gray-500">Display upcoming work in a visual timeline</p>
                </div>
                <Switch checked={visualScheduleEnabled} onCheckedChange={(v) => { setVisualScheduleEnabled(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Step-by-Step Guidance</Label>
                  <p className="text-xs text-gray-500">Break activities into guided steps</p>
                </div>
                <Switch checked={stepByStepEnabled} onCheckedChange={(v) => { setStepByStepEnabled(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Auto-Save Drafts</Label>
                  <p className="text-xs text-gray-500">Automatically save your progress</p>
                </div>
                <Switch checked={autoSaveEnabled} onCheckedChange={(v) => { setAutoSaveEnabled(v); setCustom(); }} />
              </div>
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Progress Timeline</Label>
                  <p className="text-xs text-gray-500">Show your learning journey</p>
                </div>
                <Switch checked={progressTimelineEnabled} onCheckedChange={(v) => { setProgressTimelineEnabled(v); setCustom(); }} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
