'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Loader2, Save, Camera, Palette, Trash2, CheckCircle2 } from 'lucide-react';
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

  // Form fields - Account
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Accessibility & Appearance
  const [disabilityType, setDisabilityType] = useState('');
  const [preferredFontSize, setPreferredFontSize] = useState('medium');
  const [preferredTheme, setPreferredTheme] = useState('system');
  const [lineSpacing, setLineSpacing] = useState('normal');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState(false);
  const [simplifiedUi, setSimplifiedUi] = useState(false);
  const [dyslexiaFriendlyFont, setDyslexiaFriendlyFont] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsVoiceUri, setTtsVoiceUri] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredReadingLevel, setPreferredReadingLevel] = useState('');
  const [preferredContentFormat, setPreferredContentFormat] = useState('');

  // Notifications
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [certificateNotifications, setCertificateNotifications] = useState(true);
  const [achievementNotifications, setAchievementNotifications] = useState(true);
  const [feedbackNotifications, setFeedbackNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchFullProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || '');
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
          setDisabilityType(a.disability_type || 'none');
          setPreferredFontSize(a.preferred_font_size || 'medium');
          setPreferredTheme(a.preferred_theme || 'system');
          setLineSpacing(a.line_spacing || 'normal');
          setTtsEnabled(a.tts_enabled ?? false);
          setCaptionsEnabled(a.captions_enabled ?? false);
          setKeyboardNavigationEnabled(a.keyboard_navigation_enabled ?? false);
          setSimplifiedUi(a.simplified_ui ?? false);
          setDyslexiaFriendlyFont(a.dyslexia_friendly_font ?? false);
          setTtsRate(a.tts_rate ?? 1);
          setTtsVoiceUri(a.tts_voice_uri || '');
          setPreferredReadingLevel(a.preferred_reading_level || '');
          setPreferredContentFormat(a.preferred_content_format || '');
        }
        const n = data.notifications;
        if (n) {
          setInAppNotifications(n.in_app_notifications ?? true);
          setEmailNotifications(n.email_notifications ?? true);
          setPushNotifications(n.push_notifications ?? true);
          setCourseUpdates(n.course_updates ?? true);
          setCertificateNotifications(n.certificate_notifications ?? true);
          setAchievementNotifications(n.achievement_notifications ?? true);
          setFeedbackNotifications(n.feedback_notifications ?? true);
          setMarketingNotifications(n.marketing_notifications ?? false);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        toast.error('Unable to load profile data');
      })
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
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // Fallback: If avatars bucket is not public/configured, store data URL
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setAvatarUrl(base64data);
          await saveUserProfile({ avatar_url: base64data });
          toast.success('Avatar updated successfully');
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl;
      setAvatarUrl(url);
      await saveUserProfile({ avatar_url: url });
      toast.success('Avatar updated successfully');
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Failed to upload avatar image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarUrl('');
      await saveUserProfile({ avatar_url: null });
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
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
      await saveUserProfile(data, fullName);
      toast.success('Account profile updated successfully');
    } catch (err) {
      console.error('Account save error:', err);
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
        keyboard_navigation_enabled: keyboardNavigationEnabled,
        simplified_ui: simplifiedUi,
        dyslexia_friendly_font: dyslexiaFriendlyFont,
        preferred_font: dyslexiaFriendlyFont
          ? 'dyslexia'
          : profile?.accessibility?.preferred_font || 'default',
        preferred_reading_level: preferredReadingLevel || null,
        preferred_content_format: preferredContentFormat || null,
      };
      await saveAccessibilitySettings(data);
      await updateSettings(data);
      toast.success('Accessibility & appearance settings saved');
    } catch (err) {
      console.error('Accessibility save error:', err);
      toast.error('Failed to save accessibility settings');
    } finally {
      setSaving(null);
    }
  };

  const saveNotifications = async () => {
    setSaving('notifications');
    try {
      const data: NotificationSettingsData = {
        in_app_notifications: inAppNotifications,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        course_updates: courseUpdates,
        certificate_notifications: certificateNotifications,
        achievement_notifications: achievementNotifications,
        feedback_notifications: feedbackNotifications,
        marketing_notifications: marketingNotifications,
      };
      await saveNotificationSettings(data);
      toast.success('Notification preferences saved');
    } catch (err) {
      console.error('Notifications save error:', err);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(null);
    }
  };

  const initials =
    fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-purple-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Profile & Account Settings</DialogTitle>
            <DialogDescription className="text-gray-300 text-xs mt-1">
              Manage your personal information, notification channels, and accessibility preferences.
            </DialogDescription>
          </DialogHeader>

          {/* User Header Strip */}
          {!loading && profile && (
            <div className="flex items-center gap-4 mt-5 p-3.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <div className="relative group flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden shadow-inner ring-2 ring-white/20">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base truncate">{fullName || profile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-300 truncate">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {profile?.role}
                  </span>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-[11px] text-red-300 hover:text-red-100 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 bg-white space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-xs text-gray-500 font-medium">Loading account settings...</p>
            </div>
          ) : (
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6 bg-gray-100/80 p-1 rounded-xl">
                <TabsTrigger value="account" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-900 data-[state=active]:shadow-xs">
                  <User className="w-3.5 h-3.5" /> Account Profile
                </TabsTrigger>

                <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-900 data-[state=active]:shadow-xs">
                  <Bell className="w-3.5 h-3.5" /> Notifications
                </TabsTrigger>

                <TabsTrigger value="appearance" className="flex items-center gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-900 data-[state=active]:shadow-xs">
                  <Palette className="w-3.5 h-3.5" /> Accessibility
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: ACCOUNT PROFILE */}
              <TabsContent value="account">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-fullName" className="text-xs font-semibold text-gray-700">Full Name</Label>
                      <Input
                        id="dlg-fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-email" className="text-xs font-semibold text-gray-700">Email Address (Read-only)</Label>
                      <Input
                        id="dlg-email"
                        value={profile?.email || ''}
                        disabled
                        className="bg-gray-50 text-gray-500 rounded-xl text-sm border-gray-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-username" className="text-xs font-semibold text-gray-700">Username</Label>
                      <Input
                        id="dlg-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-phone" className="text-xs font-semibold text-gray-700">Phone Number</Label>
                      <Input
                        id="dlg-phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-birthDate" className="text-xs font-semibold text-gray-700">Date of Birth</Label>
                      <Input
                        id="dlg-birthDate"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-country" className="text-xs font-semibold text-gray-700">Country / Region</Label>
                      <Input
                        id="dlg-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Your country"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-language" className="text-xs font-semibold text-gray-700">Preferred Language</Label>
                      <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                        <SelectTrigger id="dlg-language" className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ms">Bahasa Melayu</SelectItem>
                          <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                          <SelectItem value="ta">Tamil</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Account Role</Label>
                      <Input
                        value={profile?.role || ''}
                        disabled
                        className="bg-gray-50 text-gray-500 capitalize rounded-xl text-sm border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dlg-bio" className="text-xs font-semibold text-gray-700">Bio / About</Label>
                    <Textarea
                      id="dlg-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share a short bio or educational background..."
                      rows={3}
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={saveAccount}
                      disabled={saving === 'account'}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm px-5"
                    >
                      {saving === 'account' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Profile Details
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: NOTIFICATION PREFERENCES */}
              <TabsContent value="notifications">
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                    <span className="font-semibold text-purple-900">Customized Notification Delivery:</span> Choose which channels and updates you want to receive. Critical system and action-required notifications will always remain visible to ensure smooth workflows.
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
                    {/* In-App Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">In-App Notifications</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Show notifications and alerts in the top-bar notification bell dropdown.</p>
                      </div>
                      <Switch checked={inAppNotifications} onCheckedChange={setInAppNotifications} />
                    </div>

                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Email Notifications</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Receive email summaries for critical activity and course announcements.</p>
                      </div>
                      <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                    </div>

                    {/* Browser Push Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Push Notifications</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Receive browser desktop notifications when ACESS is open.</p>
                      </div>
                      <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                    </div>

                    {/* Course Updates */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Course & Lesson Updates</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Alerts when new lessons, chapters, or published course content are added.</p>
                      </div>
                      <Switch checked={courseUpdates} onCheckedChange={setCourseUpdates} />
                    </div>

                    {/* Certificate Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Certificate Notifications</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Notifies you when certificates are earned, ready to claim, or awaiting issuance.</p>
                      </div>
                      <Switch checked={certificateNotifications} onCheckedChange={setCertificateNotifications} />
                    </div>

                    {/* Achievement Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Achievements & Badges</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Alerts when you unlock milestone badges, streaks, and learning achievements.</p>
                      </div>
                      <Switch checked={achievementNotifications} onCheckedChange={setAchievementNotifications} />
                    </div>

                    {/* Feedback & Educator Messages */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Educator & Feedback Messages</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Direct messages from educators, quiz feedback, and assistance responses.</p>
                      </div>
                      <Switch checked={feedbackNotifications} onCheckedChange={setFeedbackNotifications} />
                    </div>

                    {/* Marketing & Newsletter */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Platform Announcements & Newsletter</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Occasional news about new ACESS features and accessibility tips.</p>
                      </div>
                      <Switch checked={marketingNotifications} onCheckedChange={setMarketingNotifications} />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={saveNotifications}
                      disabled={saving === 'notifications'}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm px-5"
                    >
                      {saving === 'notifications' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Notification Settings
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: ACCESSIBILITY & APPEARANCE */}
              <TabsContent value="appearance">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-disability" className="text-xs font-semibold text-gray-700">
                        Disability / Learning Need Profile
                      </Label>
                      <Select value={disabilityType} onValueChange={setDisabilityType}>
                        <SelectTrigger id="dlg-disability" className="rounded-xl text-sm">
                          <SelectValue placeholder="Select a learning need profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Standard / None</SelectItem>
                          <SelectItem value="dyslexia">Dyslexia / Reading Difficulty</SelectItem>
                          <SelectItem value="adhd">ADHD / Focus Challenge</SelectItem>
                          <SelectItem value="autism">Autism / Sensory Sensitivity</SelectItem>
                          <SelectItem value="vision">Vision Impairment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-theme" className="text-xs font-semibold text-gray-700">Theme</Label>
                      <Select value={preferredTheme} onValueChange={setPreferredTheme}>
                        <SelectTrigger id="dlg-theme" className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System Default</SelectItem>
                          <SelectItem value="high_contrast">High Contrast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-fontSize" className="text-xs font-semibold text-gray-700">Font Size</Label>
                      <Select value={preferredFontSize} onValueChange={setPreferredFontSize}>
                        <SelectTrigger id="dlg-fontSize" className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="x-large">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dlg-lineSpacing" className="text-xs font-semibold text-gray-700">Line Spacing</Label>
                      <Select value={lineSpacing} onValueChange={setLineSpacing}>
                        <SelectTrigger id="dlg-lineSpacing" className="rounded-xl text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="relaxed">Relaxed</SelectItem>
                          <SelectItem value="loose">Loose</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white mt-2">
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Dyslexia-Friendly Font</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Use OpenDyslexic typeface for easier letter distinction.</p>
                      </div>
                      <Switch checked={dyslexiaFriendlyFont} onCheckedChange={setDyslexiaFriendlyFont} />
                    </div>

                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Text-to-Speech (TTS)</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Enable audio reading assistance on lesson content.</p>
                      </div>
                      <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
                    </div>

                    <div className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="pr-4">
                        <Label className="font-semibold text-sm text-gray-900">Captions & Subtitles</Label>
                        <p className="text-xs text-gray-500 mt-0.5">Automatically show captions on videos and audio clips.</p>
                      </div>
                      <Switch checked={captionsEnabled} onCheckedChange={setCaptionsEnabled} />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={saveAccessibility}
                      disabled={saving === 'accessibility'}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm px-5"
                    >
                      {saving === 'accessibility' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Accessibility Preferences
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
