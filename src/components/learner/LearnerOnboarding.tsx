'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Accessibility, User, Loader2 } from 'lucide-react';
import { fetchFullProfile, saveUserProfile, saveAccessibilitySettings } from '@/lib/learner-api';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { applyPreset } from '@/lib/adaptive-engine';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LearnerOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [age, setAge] = useState('');
  const [preset, setPreset] = useState('none');

  const { settings, updateSettings } = useAccessibility();

  useEffect(() => {
    async function checkProfile() {
      try {
        const fullProfile = await fetchFullProfile();
        if (!fullProfile.profile?.birth_date) {
          // No birth_date means they haven't completed onboarding
          setTimeout(() => setOpen(true), 1000);
        }
      } catch (error) {
        console.error('Error checking profile for onboarding:', error);
      } finally {
        setLoading(false);
      }
    }
    checkProfile();
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Calculate mock birth_date from age
      const numAge = parseInt(age, 10);
      let birthDateStr = null;
      if (!isNaN(numAge)) {
        const currentYear = new Date().getFullYear();
        birthDateStr = `${currentYear - numAge}-01-01`;
      } else {
         // fallback
         birthDateStr = '2000-01-01';
      }

      // 2. Save profile
      await saveUserProfile({ birth_date: birthDateStr });

      // 3. Apply preset and save
      const newSettings = applyPreset(preset, settings);
      await saveAccessibilitySettings(newSettings);
      
      // Update local context to reflect immediately
      updateSettings(newSettings);

      setOpen(false);
    } catch (error) {
      console.error('Failed to save onboarding preferences', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl" 
        onInteractOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Personalized Setup</DialogTitle>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
          
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
            {step === 1 && <User className="w-6 h-6 text-white" />}
            {step === 2 && <Accessibility className="w-6 h-6 text-white" />}
          </div>
          
          <div className="min-h-[220px]">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold mb-3">Welcome to ACESS!</h2>
                <p className="text-blue-100 leading-relaxed text-sm mb-6">
                  To provide you with the best learning experience, we need to know a little bit about you.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="age" className="text-white">How old are you?</Label>
                    <Input 
                      id="age"
                      type="number" 
                      placeholder="e.g., 15" 
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                <h2 className="text-2xl font-bold mb-3">Learning Needs</h2>
                <p className="text-blue-100 leading-relaxed text-sm mb-6">
                  Do you require any specific learning accommodations? We will automatically adjust your fonts, colors, and layout.
                </p>
                
                <div className="space-y-2">
                  <Label className="text-white">Select a profile (Optional)</Label>
                  <Select value={preset} onValueChange={setPreset}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select a learning profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Standard Setup</SelectItem>
                      <SelectItem value="dyslexia">Dyslexia Support</SelectItem>
                      <SelectItem value="adhd">ADHD Focus Mode</SelectItem>
                      <SelectItem value="autism">Autism Sensory Relief</SelectItem>
                      <SelectItem value="vision">Visual Impairment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 flex items-center justify-between">
          <div className="flex gap-1.5 ml-2">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button variant="ghost" className="text-gray-500 hover:text-gray-700" onClick={() => setStep(1)} disabled={saving}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!age} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                Next
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finish Setup'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
