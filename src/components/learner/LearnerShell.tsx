'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, EyeOff } from 'lucide-react';
import { useAuth, useRole } from '@/providers/AuthProvider';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AccessibilitySettingsModal } from './AccessibilitySettingsModal';
import { Toaster } from '../ui/sonner';

const pathToView = (pathname: string): string => {
  if (pathname.startsWith('/learner/courses')) return 'courses';
  if (pathname.startsWith('/learner/progress')) return 'progress';
  if (pathname.startsWith('/learner/certificates')) return 'certificates';
  return 'dashboard';
};

export function LearnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated, user, preview, exitPreview } = useAuth();
  const role = useRole();
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

  const isPreview = preview.active && preview.role === 'learner';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    // Non-learner/non-admin roles cannot access learner routes (unless preview)
    if (role !== 'learner' && role !== 'admin' && !isPreview) { router.replace('/access-denied'); }
  }, [isLoading, isAuthenticated, role, isPreview, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSidebarNavigate = (view: string) => {
    if (view === 'dashboard') router.push('/learner');
    if (view === 'courses') router.push('/learner/courses');
    if (view === 'progress') router.push('/learner/progress');
    if (view === 'certificates') router.push('/learner/certificates');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Preview banner for educators previewing learner UI */}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
          <EyeOff className="w-4 h-4" />
          Preview Mode — You are viewing the learner experience
          <button
            onClick={() => { exitPreview(); router.push('/educator'); }}
            className="ml-4 px-3 py-1 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-xs font-semibold"
          >
            Exit Preview
          </button>
        </div>
      )}

      <Sidebar
        activeView={pathToView(pathname)}
        onNavigate={handleSidebarNavigate}
        onAccessibilityClick={() => setShowAccessibilitySettings(true)}
      />

      <div className={`flex-1 flex flex-col overflow-hidden ${isPreview ? 'mt-10' : ''}`}>
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <AccessibilitySettingsModal
        isOpen={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />
      <Toaster />
    </div>
  );
}
