'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { fetchFullProfile, saveUserProfile, saveAccessibilitySettings } from '@/lib/learner-api';
import type { AccessibilitySettingsData } from '@/lib/learner-api';
import { mergeEasyReadSettings, shouldAutoEnableEasyRead } from '@/lib/accessibility-utils';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState(false);

  // Form fields
  const [disabilityType, setDisabilityType] = useState('');
  const [preferredFontSize, setPreferredFontSize] = useState('medium');
  const [preferredTheme, setPreferredTheme] = useState('light');
  const [lineSpacing, setLineSpacing] = useState('normal');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [easyReadEnabled, setEasyReadEnabled] = useState(false);
  const [dyslexiaFriendlyFont, setDyslexiaFriendlyFont] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [preferredReadingLevel, setPreferredReadingLevel] = useState('');
  const [preferredContentFormat, setPreferredContentFormat] = useState('');

  useEffect(() => {
    fetchFullProfile()
      .then((profile) => {
        if (profile.accessibility) {
          const a = profile.accessibility;
          setDisabilityType(a.disability_type || '');
          setPreferredFontSize(a.preferred_font_size || 'medium');
          setPreferredTheme(a.preferred_theme || 'light');
          setLineSpacing(a.line_spacing || 'normal');
          setTtsEnabled(a.tts_enabled ?? false);
          setEasyReadEnabled(a.simplified_ui ?? false);
          setDyslexiaFriendlyFont(a.dyslexia_friendly_font ?? false);
          setReducedMotion(a.reduced_motion ?? false);
          setPreferredReadingLevel(a.preferred_reading_level || '');
          setPreferredContentFormat(a.preferred_content_format || '');
          if (a.disability_type || a.preferred_font_size) {
            setExistingProfile(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserProfile({ bio: `Learning preferences: ${disabilityType || 'none'}` });
      let data: AccessibilitySettingsData = {
        disability_type: disabilityType || null,
        preferred_font_size: preferredFontSize,
        preferred_theme: preferredTheme,
        line_spacing: lineSpacing,
        tts_enabled: ttsEnabled,
        dyslexia_friendly_font: dyslexiaFriendlyFont,
        reduced_motion: reducedMotion,
        preferred_reading_level: preferredReadingLevel || null,
        preferred_content_format: preferredContentFormat || null,
        simplified_ui: easyReadEnabled || shouldAutoEnableEasyRead(preferredReadingLevel),
      };
      if (data.simplified_ui) {
        data = mergeEasyReadSettings(data, true);
      }
      await saveAccessibilitySettings(data);
      toast.success('Your preferences have been saved!');
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
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {existingProfile ? 'Update Your Preferences' : 'Welcome to ACESS!'}
          </h1>
          <p className="text-lg text-gray-600">
            {existingProfile
              ? 'Review and update your accessibility and learning preferences.'
              : 'Set up your learning experience by telling us about your preferences.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className="w-12 h-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          <div className="w-12 h-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm">
          {/* Step 1: Disability & Learning Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Learning Profile</h2>
                <p className="text-sm text-gray-600">Help us personalize your learning experience</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disability">Do you have any of the following?</Label>
                <Select value={disabilityType} onValueChange={setDisabilityType}>
                  <SelectTrigger id="disability"><SelectValue placeholder="Select if applicable" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None specified</SelectItem>
                    <SelectItem value="dyslexia">Dyslexia</SelectItem>
                    <SelectItem value="adhd">ADHD</SelectItem>
                    <SelectItem value="mild_cognitive_impairment">Mild Cognitive Impairment</SelectItem>
                    <SelectItem value="visual_impairment">Visual Impairment</SelectItem>
                    <SelectItem value="hearing_impairment">Hearing Impairment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="readingLevel">Preferred Reading Level</Label>
                <Select value={preferredReadingLevel} onValueChange={setPreferredReadingLevel}>
                  <SelectTrigger id="readingLevel"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic — simpler language and shorter sentences</SelectItem>
                    <SelectItem value="standard">Standard — balanced difficulty</SelectItem>
                    <SelectItem value="advanced">Advanced — more detailed content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentFormat">Preferred Content Format</Label>
                <Select value={preferredContentFormat} onValueChange={setPreferredContentFormat}>
                  <SelectTrigger id="contentFormat"><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text — read at my own pace</SelectItem>
                    <SelectItem value="video">Video — watch and learn</SelectItem>
                    <SelectItem value="audio">Audio — listen to content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Display Preferences */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Display Preferences</h2>
                <p className="text-sm text-gray-600">Customize how content looks on your screen</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={preferredFontSize} onValueChange={setPreferredFontSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={preferredTheme} onValueChange={setPreferredTheme}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="high_contrast">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Line Spacing</Label>
                  <Select value={lineSpacing} onValueChange={setLineSpacing}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="relaxed">Relaxed</SelectItem>
                      <SelectItem value="loose">Loose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                  <Label className="font-medium">Easy Read Mode</Label>
                  <p className="text-sm text-gray-600">Large text, high contrast, simplified layout — saved for every visit</p>
                </div>
                <Switch checked={easyReadEnabled} onCheckedChange={setEasyReadEnabled} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-medium">Dyslexia-Friendly Font</Label>
                  <p className="text-sm text-gray-600">Use a font designed for easier reading</p>
                </div>
                <Switch checked={dyslexiaFriendlyFont} onCheckedChange={setDyslexiaFriendlyFont} />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-medium">Reduced Motion</Label>
                  <p className="text-sm text-gray-600">Minimize animations and transitions</p>
                </div>
                <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Assistive Technology & Done */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Assistive Technology</h2>
                <p className="text-sm text-gray-600">Enable tools that make learning easier for you</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-medium">Text-to-Speech</Label>
                  <p className="text-sm text-gray-600">Read lesson content aloud</p>
                </div>
                <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  {existingProfile ? 'Ready to update?' : 'You\'re all set!'}
                </h3>
                <p className="text-sm text-blue-700">
                  {existingProfile
                    ? 'Your existing preferences will be updated with any changes.'
                    : 'Your preferences have been saved and can be changed anytime from the Accessibility Settings.'}
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {saving ? 'Saving...' : existingProfile ? 'Update Preferences' : 'Start Learning'}
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
