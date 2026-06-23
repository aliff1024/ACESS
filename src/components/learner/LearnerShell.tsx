'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, EyeOff } from 'lucide-react';
import { useAuth, useRole } from '@/providers/AuthProvider';
import { useTranslation } from '@/lib/useTranslation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AccessibilitySettingsModal } from './AccessibilitySettingsModal';
import { EasyReadIndicator } from '@/components/accessibility/EasyReadIndicator';
import { Toaster } from '../ui/sonner';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Button } from '../ui/button';
import { Minimize2 } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import { LearnerOnboarding } from './LearnerOnboarding';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

function ShellInner({ children, onNavigate, showAccessibilitySettings, setShowAccessibilitySettings, isPreview }: {
  children: React.ReactNode;
  onNavigate: (view: string) => void;
  showAccessibilitySettings: boolean;
  setShowAccessibilitySettings: (v: boolean) => void;
  isPreview: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const activeView = (() => {
    if (pathname.startsWith('/learner/favorites')) return 'courses_favorites';
    if (pathname === '/learner/courses') {
      if (searchParams.get('filter') === 'enrolled') return 'courses_enrolled';
      return 'courses';
    }
    if (pathname.startsWith('/learner/courses')) return 'courses';
    if (pathname.startsWith('/learner/progress')) return 'progress';
    if (pathname.startsWith('/learner/certificates')) return 'certificates';
    if (pathname.startsWith('/learner/achievements')) return 'achievements';
    return 'dashboard';
  })();

  const { settings, updateSettings } = useAccessibility();
  const isDistractionFree = settings.distraction_free_mode;

  return (
    <>
      {/* Desktop Sidebar */}
      {!isDistractionFree && (
        <Sidebar activeView={activeView} onNavigate={onNavigate} onAccessibilityClick={() => setShowAccessibilitySettings(true)} className="hidden md:flex" />
      )}

      {/* Mobile Sidebar via Sheet */}
      {!isDistractionFree && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar activeView={activeView} onNavigate={onNavigate} onAccessibilityClick={() => { setShowAccessibilitySettings(true); setIsMobileMenuOpen(false); }} className="w-full h-full border-r-0 shadow-none" />
          </SheetContent>
        </Sheet>
      )}

      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isPreview ? 'mt-10' : ''}`}>
        {!isDistractionFree && <EasyReadIndicator dismissible />}
        {!isDistractionFree && <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />}
        <main id="main-content" className="flex-1 overflow-y-auto relative" tabIndex={-1}>
          {children}
          {isDistractionFree && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button 
                variant="outline" 
                className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
                onClick={() => updateSettings({ ...settings, distraction_free_mode: false, active_preset: 'custom' })}
              >
                <Minimize2 className="w-4 h-4" />
                Exit Distraction Free Mode
              </Button>
            </div>
          )}
        </main>
      </div>
      <AccessibilitySettingsModal isOpen={showAccessibilitySettings} onClose={() => setShowAccessibilitySettings(false)} />
      <LearnerOnboarding />
    </>
  );
}

export function LearnerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, isAuthenticated, preview, enterPreview, exitPreview } = useAuth();
  const role = useRole();
  const { t } = useTranslation();
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const { settings } = useAccessibility();

  const isContextPreview = preview.active && preview.role === 'learner';
  const isUrlPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    
    if (isUrlPreview && !isContextPreview) {
      enterPreview('learner');
      return;
    }

    if (role !== 'learner' && role !== 'admin' && !isContextPreview && !isUrlPreview) { 
      router.replace('/access-denied'); 
    }
  }, [isLoading, isAuthenticated, role, isUrlPreview, isContextPreview, router, enterPreview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600" suppressHydrationWarning>{t('dashboard.verifyAccess')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSidebarNavigate = (view: string) => {
    if (view === 'dashboard') router.push('/learner');
    if (view === 'courses') router.push('/learner/courses');
    if (view === 'courses_enrolled') router.push('/learner/courses?filter=enrolled');
    if (view === 'courses_favorites') router.push('/learner/favorites');
    if (view === 'progress') router.push('/learner/progress');
    if (view === 'certificates') router.push('/learner/certificates');
    if (view === 'achievements') router.push('/learner/achievements');
  };

  const reduceMotion = settings.reduced_motion || settings.animation_level === 'none';

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div className="flex h-screen bg-gray-50">
        {isContextPreview && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
            <EyeOff className="w-4 h-4" />
            {t('dashboard.preview')}
            <button
              onClick={() => { exitPreview(); router.push('/educator'); }}
              className="ml-4 px-3 py-1 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-xs font-semibold"
            >
              {t('dashboard.exitPreview')}
            </button>
          </div>
        )}

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        }>
          <ShellInner onNavigate={handleSidebarNavigate} showAccessibilitySettings={showAccessibilitySettings} setShowAccessibilitySettings={setShowAccessibilitySettings} isPreview={isContextPreview}>
            {children}
          </ShellInner>
        </Suspense>

        <Toaster />
      </div>
    </MotionConfig>
  );
}
