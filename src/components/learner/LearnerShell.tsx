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

function ShellInner({ children, onNavigate, showAccessibilitySettings, setShowAccessibilitySettings, isPreview }: {
  children: React.ReactNode;
  onNavigate: (view: string) => void;
  showAccessibilitySettings: boolean;
  setShowAccessibilitySettings: (v: boolean) => void;
  isPreview: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeView = (() => {
    if (pathname.startsWith('/learner/favorites')) return 'courses_favorites';
    if (pathname === '/learner/courses') {
      if (searchParams.get('filter') === 'enrolled') return 'courses_enrolled';
      return 'courses';
    }
    if (pathname.startsWith('/learner/courses')) return 'courses';
    if (pathname.startsWith('/learner/progress')) return 'progress';
    if (pathname.startsWith('/learner/certificates')) return 'certificates';
    return 'dashboard';
  })();

  return (
    <>
      <Sidebar activeView={activeView} onNavigate={onNavigate} onAccessibilityClick={() => setShowAccessibilitySettings(true)} />
      <div className={`flex-1 flex flex-col overflow-hidden ${isPreview ? 'mt-10' : ''}`}>
        <EasyReadIndicator dismissible />
        <TopBar />
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>{children}</main>
      </div>
      <AccessibilitySettingsModal isOpen={showAccessibilitySettings} onClose={() => setShowAccessibilitySettings(false)} />
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
  };

  return (
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
  );
}
