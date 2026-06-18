'use client';

import { useState, useEffect } from 'react';
import { User, Accessibility, Bell, Loader2, Save, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import {
  fetchFullProfile,
  saveUserProfile,
  saveAccessibilitySettings,
  saveNotificationSettings,
} from '@/lib/learner-api';
import type {
  FullProfile,
  UserProfileData,
  AccessibilitySettingsData,
  NotificationSettingsData,
} from '@/lib/learner-api';
import { toast } from 'sonner';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { dedupeSpeechVoices } from '@/lib/accessibility-utils';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { updateSettings } = useAccessibility();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Accessibility
  const [disabilityType, setDisabilityType] = useState('');
  const [preferredFontSize, setPreferredFontSize] = useState('medium');
  const [preferredTheme, setPreferredTheme] = useState('system');
  const [lineSpacing, setLineSpacing] = useState('normal');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [screenReaderOptimized, setScreenReaderOptimized] = useState(false);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [simplifiedUi, setSimplifiedUi] = useState(false);
  const [dyslexiaFriendlyFont, setDyslexiaFriendlyFont] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsVoiceUri, setTtsVoiceUri] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredReadingLevel, setPreferredReadingLevel] = useState('');
  const [preferredContentFormat, setPreferredContentFormat] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [certificateNotifications, setCertificateNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchFullProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name);
        const p = data.profile;
        if (p) {
          setUsername(p.username || '');
          setPhoneNumber(p.phone_number || '');
          setBirthDate(p.birth_date || '');
          setCountry(p.country || '');
          setBio(p.bio || '');
          setPreferredLanguage(p.preferred_language || 'en');
          setAvatarUrl(p.avatar_url || '');
        }
        const a = data.accessibility;
        if (a) {
          setDisabilityType(a.disability_type || '');
          setPreferredFontSize(a.preferred_font_size || 'medium');
          setPreferredTheme(a.preferred_theme || 'system');
          setLineSpacing(a.line_spacing || 'normal');
          setTtsEnabled(a.tts_enabled ?? false);
          setCaptionsEnabled(a.captions_enabled ?? false);
          setScreenReaderOptimized(a.screen_reader_optimized ?? false);
          setKeyboardNavigationEnabled(a.keyboard_navigation_enabled ?? false);
          setReducedMotion(a.reduced_motion ?? false);
          setSimplifiedUi(a.simplified_ui ?? false);
          setDyslexiaFriendlyFont(a.dyslexia_friendly_font ?? false);
          setTtsRate(a.tts_rate ?? 1);
          setTtsVoiceUri(a.tts_voice_uri || '');
          setPreferredReadingLevel(a.preferred_reading_level || '');
          setPreferredContentFormat(a.preferred_content_format || '');
        }
        const n = data.notifications;
        if (n) {
          setEmailNotifications(n.email_notifications ?? true);
          setPushNotifications(n.push_notifications ?? true);
          setCourseUpdates(n.course_updates ?? true);
          setCertificateNotifications(n.certificate_notifications ?? true);
          setMarketingNotifications(n.marketing_notifications ?? false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Load available speech voices for voice picker
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      setAvailableVoices(dedupeSpeechVoices(window.speechSynthesis.getVoices()));
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('course-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('course-assets').getPublicUrl(path);
      const url = urlData.publicUrl;
      setAvatarUrl(url);
      await saveUserProfile({ avatar_url: url });
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const saveAccount = async () => {
    setSaving('account');
    try {
      const data: UserProfileData = {
        username: username || null,
        phone_number: phoneNumber || null,
        birth_date: birthDate || null,
        country: country || null,
        bio: bio || null,
        preferred_language: preferredLanguage,
        avatar_url: avatarUrl || null,
      };
      await saveUserProfile(data);
      toast.success('Account settings saved');
    } catch {
      toast.error('Failed to save account settings');
    } finally {
      setSaving(null);
    }
  };

  const saveAccessibility = async () => {
    setSaving('accessibility');
    try {
      const data: AccessibilitySettingsData = {
        disability_type: disabilityType || null,
        preferred_font_size: preferredFontSize,
        preferred_theme: preferredTheme,
        line_spacing: lineSpacing,
        tts_enabled: ttsEnabled,
        tts_rate: ttsRate,
        tts_voice_uri: ttsVoiceUri || null,
        captions_enabled: captionsEnabled,
        screen_reader_optimized: screenReaderOptimized,
        keyboard_navigation_enabled: keyboardNavigationEnabled,
        reduced_motion: reducedMotion,
        simplified_ui: simplifiedUi,
        dyslexia_friendly_font: dyslexiaFriendlyFont,
        preferred_font: dyslexiaFriendlyFont ? 'dyslexia' : (profile?.accessibility?.preferred_font || 'default'),
        preferred_reading_level: preferredReadingLevel || null,
        preferred_content_format: preferredContentFormat || null,
      };
      await saveAccessibilitySettings(data);
      await updateSettings(data);
      toast.success('Accessibility settings saved');
    } catch {
      toast.error('Failed to save accessibility settings');
    } finally {
      setSaving(null);
    }
  };

  const saveNotifications = async () => {
    setSaving('notifications');
    try {
      const data: NotificationSettingsData = {
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        course_updates: courseUpdates,
        certificate_notifications: certificateNotifications,
        marketing_notifications: marketingNotifications,
      };
      await saveNotificationSettings(data);
      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(null);
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>Manage your account, accessibility, and notification preferences</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="relative group flex-shrink-0">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{profile?.full_name || 'User'}</p>
                <p className="text-sm text-gray-600">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                  {profile?.role}
                </span>
              </div>
            </div>

            <Tabs defaultValue="account" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="account" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Account
                </TabsTrigger>
                <TabsTrigger value="accessibility" className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4" /> Accessibility
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dlg-fullName">Full Name</Label>
                      <Input id="dlg-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-email">Email</Label>
                      <Input id="dlg-email" value={profile?.email || ''} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-username">Username</Label>
                      <Input id="dlg-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-phone">Phone Number</Label>
                      <Input id="dlg-phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-birthDate">Date of Birth</Label>
                      <Input id="dlg-birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-country">Country</Label>
                      <Input id="dlg-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Your country" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-language">Preferred Language</Label>
                      <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                        <SelectTrigger id="dlg-language"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={profile?.role || ''} disabled className="bg-gray-50 capitalize" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dlg-bio">Bio</Label>
                    <Textarea id="dlg-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" rows={3} />
                  </div>
                  <Button onClick={saveAccount} disabled={saving === 'account'} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {saving === 'account' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Account
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="accessibility">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-800">Disability & Impairment</h3>
                    <div className="space-y-2">
                      <Label htmlFor="dlg-disability">Disability / Impairment Type</Label>
                      <Select value={disabilityType} onValueChange={setDisabilityType}>
                        <SelectTrigger id="dlg-disability"><SelectValue placeholder="Select if applicable" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No accessibility support required</SelectItem>
                          <SelectItem value="cognitive_impairment">Cognitive Impairment</SelectItem>
                          <SelectItem value="adhd">ADHD</SelectItem>
                          <SelectItem value="dyslexia">Dyslexia</SelectItem>
                          <SelectItem value="asd">Autism Spectrum Disorder (ASD)</SelectItem>
                          <SelectItem value="visual_impairment">Visual Impairment</SelectItem>
                          <SelectItem value="hearing_impairment">Hearing Impairment</SelectItem>
                          <SelectItem value="motor_impairment">Motor Impairment</SelectItem>
                          <SelectItem value="multiple_disabilities">Multiple Disabilities</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4" />

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-800">Display Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dlg-fontSize">Font Size</Label>
                        <Select value={preferredFontSize} onValueChange={setPreferredFontSize}>
                          <SelectTrigger id="dlg-fontSize"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                            <SelectItem value="xlarge">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dlg-theme">Theme</Label>
                        <Select value={preferredTheme} onValueChange={setPreferredTheme}>
                          <SelectTrigger id="dlg-theme"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="high_contrast">High Contrast</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dlg-lineSpacing">Line Spacing</Label>
                        <Select value={lineSpacing} onValueChange={setLineSpacing}>
                          <SelectTrigger id="dlg-lineSpacing"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="relaxed">Relaxed</SelectItem>
                            <SelectItem value="loose">Loose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4" />

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-800">Assistive Technology</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div><Label className="font-semibold text-gray-900">Text-to-Speech</Label><p className="text-sm text-gray-500 mt-1">Read content aloud</p></div>
                        <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div><Label className="font-semibold text-gray-900">Reduced Motion</Label><p className="text-sm text-gray-500 mt-1">Minimize animations</p></div>
                        <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div><Label className="font-semibold text-gray-900">Simplified UI</Label><p className="text-sm text-gray-500 mt-1">Hide decorative elements</p></div>
                        <Switch checked={simplifiedUi} onCheckedChange={setSimplifiedUi} />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div><Label className="font-semibold text-gray-900">Dyslexia Font</Label><p className="text-sm text-gray-500 mt-1">Improve readability</p></div>
                        <Switch checked={dyslexiaFriendlyFont} onCheckedChange={setDyslexiaFriendlyFont} />
                      </div>
                    </div>
                    {ttsEnabled && (
                      <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                        <Label className="font-medium text-sm">TTS Speed</Label>
                        <div className="flex gap-1.5">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setTtsRate(speed)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                ttsRate === speed
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1 pt-2">
                          <Label className="font-medium text-sm">TTS Voice</Label>
                          <Select value={ttsVoiceUri} onValueChange={setTtsVoiceUri}>
                            <SelectTrigger><SelectValue placeholder="System default" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">System default</SelectItem>
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                                  {voice.name} ({voice.lang})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>



                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-800">Content Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dlg-readingLevel">Reading Level</Label>
                        <Select value={preferredReadingLevel} onValueChange={setPreferredReadingLevel}>
                          <SelectTrigger id="dlg-readingLevel"><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>

                  <Button onClick={saveAccessibility} disabled={saving === 'accessibility'} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {saving === 'accessibility' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Accessibility Settings
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="notifications">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><Label className="font-medium text-sm">Email Notifications</Label><p className="text-xs text-gray-600">Receive notifications via email</p></div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><Label className="font-medium text-sm">Push Notifications</Label><p className="text-xs text-gray-600">Browser push notifications</p></div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><Label className="font-medium text-sm">Course Updates</Label><p className="text-xs text-gray-600">New content and changes</p></div>
                    <Switch checked={courseUpdates} onCheckedChange={setCourseUpdates} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><Label className="font-medium text-sm">Certificate Notifications</Label><p className="text-xs text-gray-600">When certificates are issued</p></div>
                    <Switch checked={certificateNotifications} onCheckedChange={setCertificateNotifications} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><Label className="font-medium text-sm">Marketing</Label><p className="text-xs text-gray-600">Promotional offers and updates</p></div>
                    <Switch checked={marketingNotifications} onCheckedChange={setMarketingNotifications} />
                  </div>
                  <Button onClick={saveNotifications} disabled={saving === 'notifications'} className="bg-blue-600 hover:bg-blue-700 text-white mt-4">
                    {saving === 'notifications' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Notification Settings
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
