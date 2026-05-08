'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

  const handleSidebarNavigate = (view: string) => {
    if (view === 'dashboard') router.push('/learner');
    if (view === 'courses') router.push('/learner/courses');
    if (view === 'progress') router.push('/learner/progress');
    if (view === 'certificates') router.push('/learner/certificates');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeView={pathToView(pathname)}
        onNavigate={handleSidebarNavigate}
        onAccessibilityClick={() => setShowAccessibilitySettings(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
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
