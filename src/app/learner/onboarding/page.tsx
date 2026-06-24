'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, BookOpen, Target, Zap, Calculator, Check } from 'lucide-react';
import { fetchFullProfile, saveUserProfile, saveAccessibilitySettings } from '@/lib/learner-api';
import type { AccessibilitySettingsData } from '@/lib/learner-api';
import { PresetCard } from '@/components/accessibility/PresetCard';
import { SliderSetting } from '@/components/accessibility/SliderSetting';
import { TintPicker } from '@/components/accessibility/TintPicker';
import { SettingsPreview } from '@/components/accessibility/SettingsPreview';
import { ACCESSIBILITY_PRESETS, DEFAULT_PRESET_SETTINGS, applyPreset as buildPresetSettings } from '@/lib/adaptive-engine';
import { FONT_FAMILIES, ANIMATION_LEVELS, fontSizePxToEnum, lineSpacingMultiplierToEnum } from '@/lib/accessibility-utils';
import { toast } from 'sonner';

const PRESET_ICONS: Record<string, React.ReactNode> = {
  dyslexia: <BookOpen className="w-5 h-5" />,
  adhd: <Target className="w-5 h-5" />,
  autism: <Zap className="w-5 h-5" />,
  dyscalculia: <Calculator className="w-5 h-5" />,
};

const STEP_LABELS = [
  'Choose Preset',
  'Reading',
  'Focus & Sensory',
  'Review',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState(false);

  // ─── Profile ─────────────────────────────────────────────────────
  const [age, setAge] = useState('');

  // ─── Preset selection ──────────────────────────────────────────────
  const [activePreset, setActivePreset] = useState('none');

  // ─── Reading Preferences ──────────────────────────────────────────
  const [fontFamily, setFontFamily] = useState('arial');
  const [fontSizePx, setFontSizePx] = useState(16);
  const [lineSpacingMultiplier, setLineSpacingMultiplier] = useState(1.5);
  const [wordSpacingPct, setWordSpacingPct] = useState(0);
  const [backgroundTint, setBackgroundTint] = useState('white');

  // ─── Focus Preferences ────────────────────────────────────────────
  const [readingSpotlight, setReadingSpotlight] = useState(false);
  const [distractionFreeMode, setDistractionFreeMode] = useState(false);
  const [chunkedContentMode, setChunkedContentMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // ─── Sensory Preferences ──────────────────────────────────────────
  const [preferredTheme, setPreferredTheme] = useState('light');
  const [animationLevel, setAnimationLevel] = useState('normal');
  const [mutedColors, setMutedColors] = useState(false);

  // ─── Assistive Technology ─────────────────────────────────────────
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // ─── Load existing profile ────────────────────────────────────────
  useEffect(() => {
    fetchFullProfile()
      .then((profile) => {
        if (profile.accessibility) {
          const a = profile.accessibility;
          setActivePreset(a.active_preset || 'none');
          setFontFamily(a.font_family || 'arial');
          setFontSizePx(a.font_size_px ?? 16);
          setLineSpacingMultiplier(a.line_spacing_multiplier ?? 1.5);
          setWordSpacingPct(a.word_spacing_pct ?? 0);
          setBackgroundTint(a.background_tint || 'white');
          setReadingSpotlight(a.reading_spotlight ?? false);
          setDistractionFreeMode(a.distraction_free_mode ?? false);
          setChunkedContentMode(a.chunked_content_mode ?? false);
          setReducedMotion(a.reduced_motion ?? false);
          setPreferredTheme(a.preferred_theme || 'light');
          setAnimationLevel(a.animation_level || 'normal');
          setMutedColors(a.muted_colors ?? false);
          setTtsEnabled(a.tts_enabled ?? false);
          if (a.active_preset || a.font_family) {
            setExistingProfile(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Preset selection handler ─────────────────────────────────────
  const handlePresetSelect = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId === 'none') {
      // Reset to defaults
      const d = DEFAULT_PRESET_SETTINGS;
      setFontFamily(d.font_family);
      setFontSizePx(d.font_size_px);
      setLineSpacingMultiplier(d.line_spacing_multiplier);
      setWordSpacingPct(d.word_spacing_pct);
      setBackgroundTint(d.background_tint);
      setReadingSpotlight(d.reading_spotlight);
      setDistractionFreeMode(d.distraction_free_mode);
      setChunkedContentMode(d.chunked_content_mode);
      setReducedMotion(d.reduced_motion);
      setAnimationLevel(d.animation_level);
      setMutedColors(d.muted_colors);
      setTtsEnabled(d.tts_enabled);
      setPreferredTheme(d.preferred_theme);
    } else {
      const preset = ACCESSIBILITY_PRESETS[presetId];
      if (preset) {
        const s = preset.settings;
        setFontFamily(s.font_family);
        setFontSizePx(s.font_size_px);
        setLineSpacingMultiplier(s.line_spacing_multiplier);
        setWordSpacingPct(s.word_spacing_pct);
        setBackgroundTint(s.background_tint);
        setReadingSpotlight(s.reading_spotlight);
        setDistractionFreeMode(s.distraction_free_mode);
        setChunkedContentMode(s.chunked_content_mode);
        setReducedMotion(s.reduced_motion);
        setAnimationLevel(s.animation_level);
        setMutedColors(s.muted_colors);
        setTtsEnabled(s.tts_enabled);
        setPreferredTheme(s.preferred_theme);
      }
    }
  };

  // ─── Save handler ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const numAge = parseInt(age, 10);
      const birthDateStr = !isNaN(numAge)
        ? `${new Date().getFullYear() - numAge}-01-01`
        : '2000-01-01';
      await saveUserProfile({ bio: `Accessibility preset: ${activePreset}`, birth_date: birthDateStr });

      const data: AccessibilitySettingsData = {
        active_preset: activePreset,
        // Granular settings
        font_family: fontFamily,
        font_size_px: fontSizePx,
        line_spacing_multiplier: lineSpacingMultiplier,
        word_spacing_pct: wordSpacingPct,
        background_tint: backgroundTint,
        reading_spotlight: readingSpotlight,
        distraction_free_mode: distractionFreeMode,
        chunked_content_mode: chunkedContentMode,
        reduced_motion: reducedMotion,
        animation_level: animationLevel,
        muted_colors: mutedColors,
        tts_enabled: ttsEnabled,
        preferred_theme: preferredTheme,
        // Legacy field mappings for backward compatibility
        preferred_font_size: fontSizePxToEnum(fontSizePx),
        line_spacing: lineSpacingMultiplierToEnum(lineSpacingMultiplier),
        preferred_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible' ? 'dyslexia' : 'default',
        dyslexia_friendly_font: fontFamily === 'opendyslexic' || fontFamily === 'atkinson_hyperlegible',
        high_contrast: preferredTheme === 'high_contrast',
        simplified_ui: false,
        // Executive function defaults
        task_checklist_enabled: ACCESSIBILITY_PRESETS[activePreset]?.settings.task_checklist_enabled ?? false,
        visual_schedule_enabled: ACCESSIBILITY_PRESETS[activePreset]?.settings.visual_schedule_enabled ?? false,
        step_by_step_enabled: ACCESSIBILITY_PRESETS[activePreset]?.settings.step_by_step_enabled ?? false,
        auto_save_enabled: true,
        progress_timeline_enabled: ACCESSIBILITY_PRESETS[activePreset]?.settings.progress_timeline_enabled ?? false,
      };

      await saveAccessibilitySettings(data);
      toast.success('Your accessibility preferences have been saved!');
      router.push('/learner');
    } catch {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {existingProfile ? 'Update Your Preferences' : 'Welcome to ACESS!'}
          </h1>
          <p className="text-lg text-gray-600">
            {existingProfile
              ? 'Review and update your accessibility preferences.'
              : 'Customize your learning experience with accessibility presets.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={`w-8 h-0.5 rounded-full ${isCompleted || isActive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isCompleted ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm">

          {/* ═══ Step 1: Choose Preset ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Choose an Accessibility Preset</h2>
                <p className="text-sm text-gray-600">
                  Select a preset to get started quickly. You can customize every setting in the next steps.
                </p>
              </div>

              {/* Age Input */}
              <div className="border border-gray-200 rounded-xl p-4">
                <Label htmlFor="age" className="text-sm font-semibold mb-2 block">How old are you?</Label>
                <p className="text-xs text-gray-500 mb-3">We use this to tailor content to your age group.</p>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 15"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>

              {/* Preset cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PresetCard
                  id="none"
                  label="Start from Default"
                  goal="Standard settings with no accessibility adjustments"
                  icon={<Sparkles className="w-5 h-5" />}
                  features={['Default fonts', 'Standard spacing', 'All animations']}
                  isSelected={activePreset === 'none'}
                  onSelect={handlePresetSelect}
                />
                {Object.entries(ACCESSIBILITY_PRESETS).map(([id, preset]) => (
                  <PresetCard
                    key={id}
                    id={id}
                    label={preset.label}
                    goal={preset.goal}
                    icon={PRESET_ICONS[id] || <Sparkles className="w-5 h-5" />}
                    features={preset.additional_features.slice(0, 3)}
                    isSelected={activePreset === id}
                    onSelect={handlePresetSelect}
                  />
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!age} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Step 2: Reading Preferences ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Reading Preferences</h2>
                <p className="text-sm text-gray-600">Adjust how text appears on your screen</p>
              </div>

              {/* Font Family */}
              <div className="border border-gray-200 rounded-xl p-4">
                <Label className="text-sm font-semibold mb-2 block">Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size Slider */}
              <SliderSetting
                label="Text Size"
                description="Adjust the size of all text"
                value={fontSizePx}
                min={12}
                max={24}
                step={1}
                unit="px"
                onChange={setFontSizePx}
              />

              {/* Line Spacing Slider */}
              <SliderSetting
                label="Line Spacing"
                description="Space between lines of text"
                value={lineSpacingMultiplier}
                min={1.0}
                max={2.0}
                step={0.1}
                unit="x"
                onChange={(v) => setLineSpacingMultiplier(Math.round(v * 10) / 10)}
              />

              {/* Word Spacing Slider */}
              <SliderSetting
                label="Word Spacing"
                description="Extra space between words"
                value={wordSpacingPct}
                min={0}
                max={50}
                step={5}
                unit="%"
                onChange={setWordSpacingPct}
              />

              {/* Background Tint */}
              <TintPicker value={backgroundTint} onChange={setBackgroundTint} />

              {/* TTS toggle */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Text-to-Speech</Label>
                    <p className="text-xs text-gray-500">Read lesson content aloud</p>
                  </div>
                  <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
                </div>
              </div>

              {/* Live Preview */}
              <SettingsPreview
                fontFamily={fontFamily}
                fontSizePx={fontSizePx}
                lineSpacingMultiplier={lineSpacingMultiplier}
                wordSpacingPct={wordSpacingPct}
                backgroundTint={backgroundTint}
              />

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Step 3: Focus & Sensory ═══ */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Focus & Sensory Preferences</h2>
                <p className="text-sm text-gray-600">Reduce distractions and adjust visual comfort</p>
              </div>

              {/* Focus toggles */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Focus</h3>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Reading Spotlight</Label>
                      <p className="text-xs text-gray-500">Dim surrounding content to highlight what you&apos;re reading</p>
                    </div>
                    <Switch checked={readingSpotlight} onCheckedChange={setReadingSpotlight} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Distraction-Free Mode</Label>
                      <p className="text-xs text-gray-500">Hide sidebar, widgets, and notifications</p>
                    </div>
                    <Switch checked={distractionFreeMode} onCheckedChange={setDistractionFreeMode} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Chunked Content</Label>
                      <p className="text-xs text-gray-500">Show one section at a time instead of all at once</p>
                    </div>
                    <Switch checked={chunkedContentMode} onCheckedChange={setChunkedContentMode} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Reduced Motion</Label>
                      <p className="text-xs text-gray-500">Minimize all animations and transitions</p>
                    </div>
                    <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                  </div>
                </div>
              </div>

              {/* Sensory */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Sensory</h3>

                {/* Theme selector */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <Label className="text-sm font-semibold mb-3 block">Theme</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'light', label: 'Light', color: 'bg-white border-gray-300' },
                      { value: 'soft', label: 'Soft', color: 'bg-amber-50 border-amber-200' },
                      { value: 'dark', label: 'Dark', color: 'bg-gray-900 border-gray-700' },
                      { value: 'high_contrast', label: 'High Contrast', color: 'bg-black border-yellow-400' },
                    ].map((theme) => (
                      <Button
                        key={theme.value}
                        variant={preferredTheme === theme.value ? 'default' : 'outline'}
                        onClick={() => setPreferredTheme(theme.value)}
                        className="h-auto py-2"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-7 h-7 ${theme.color} border-2 rounded shrink-0`}></div>
                          <span className="text-xs">{theme.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Animation Level */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <Label className="text-sm font-semibold mb-3 block">Animation Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ANIMATION_LEVELS.map((level) => (
                      <Button
                        key={level.value}
                        variant={animationLevel === level.value ? 'default' : 'outline'}
                        onClick={() => setAnimationLevel(level.value)}
                        className="h-auto py-2 text-sm"
                      >
                        {level.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Muted Colors */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Muted Colors</Label>
                      <p className="text-xs text-gray-500">Use calm, desaturated colors throughout</p>
                    </div>
                    <Switch checked={mutedColors} onCheckedChange={setMutedColors} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Review & Save ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Settings</h2>
                <p className="text-sm text-gray-600">Here&apos;s a summary of your accessibility preferences</p>
              </div>

              {/* Active Preset Badge */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  {activePreset !== 'none' && PRESET_ICONS[activePreset]
                    ? PRESET_ICONS[activePreset]
                    : <Sparkles className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <p className="font-semibold text-blue-900">
                    {activePreset === 'none' ? 'Default Settings' : ACCESSIBILITY_PRESETS[activePreset]?.label ?? 'Custom'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {activePreset === 'none'
                      ? 'Using standard accessibility settings'
                      : ACCESSIBILITY_PRESETS[activePreset]?.goal ?? 'Customized settings'}
                  </p>
                </div>
              </div>

              {/* Settings summary grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Font</p>
                  <p className="text-sm font-medium">{FONT_FAMILIES.find(f => f.value === fontFamily)?.label ?? fontFamily}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Text Size</p>
                  <p className="text-sm font-medium">{fontSizePx}px</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Line Spacing</p>
                  <p className="text-sm font-medium">{lineSpacingMultiplier}x</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Word Spacing</p>
                  <p className="text-sm font-medium">{wordSpacingPct}%</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Background</p>
                  <p className="text-sm font-medium capitalize">{backgroundTint.replace('_', ' ')}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Theme</p>
                  <p className="text-sm font-medium capitalize">{preferredTheme.replace('_', ' ')}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Animation</p>
                  <p className="text-sm font-medium capitalize">{animationLevel}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Text-to-Speech</p>
                  <p className="text-sm font-medium">{ttsEnabled ? 'On' : 'Off'}</p>
                </div>
              </div>

              {/* Active features */}
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold mb-2">Active Features</p>
                <div className="flex flex-wrap gap-2">
                  {readingSpotlight && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Reading Spotlight</span>}
                  {distractionFreeMode && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Distraction-Free</span>}
                  {chunkedContentMode && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Chunked Content</span>}
                  {reducedMotion && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Reduced Motion</span>}
                  {mutedColors && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Muted Colors</span>}
                  {ttsEnabled && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Text-to-Speech</span>}
                  {!readingSpotlight && !distractionFreeMode && !chunkedContentMode && !reducedMotion && !mutedColors && !ttsEnabled && (
                    <span className="text-xs text-gray-400">No additional features enabled</span>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <SettingsPreview
                fontFamily={fontFamily}
                fontSizePx={fontSizePx}
                lineSpacingMultiplier={lineSpacingMultiplier}
                wordSpacingPct={wordSpacingPct}
                backgroundTint={backgroundTint}
              />

              {/* Call to action */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  {existingProfile ? 'Ready to update?' : 'You\'re all set!'}
                </h3>
                <p className="text-sm text-blue-700">
                  {existingProfile
                    ? 'Your existing preferences will be updated with these changes.'
                    : 'You can change these settings anytime from the Accessibility panel in the sidebar.'}
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {saving ? 'Saving...' : existingProfile ? 'Update Preferences' : 'Save & Start Learning'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!existingProfile && (
          <p className="text-center text-sm text-gray-500 mt-6">
            You can change these settings anytime from the Accessibility panel in the sidebar.
          </p>
        )}
      </div>
    </div>
  );
}
