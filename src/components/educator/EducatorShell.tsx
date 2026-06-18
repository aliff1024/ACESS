'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth, useRole } from '@/providers/AuthProvider';
import { EducatorSidebar } from './EducatorSidebar';
import { EducatorTopBar } from './EducatorTopBar';

const viewMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your teaching activity' },
  courses: { title: 'My Courses', subtitle: 'Manage your course content' },
  'courses-all': { title: 'All Courses', subtitle: 'Browse all available courses' },
  'courses-create': { title: 'Create Course', subtitle: 'Design a new course' },
  students: { title: 'Students Progress', subtitle: 'Monitor student progress' },
  analytics: { title: 'Analytics', subtitle: 'Track performance metrics' },
  certificates: { title: 'Certificates', subtitle: 'Manage course completion certificates' },
};

const pathnameToView = (pathname: string): string => {
  if (pathname.startsWith('/educator/courses/create')) return 'courses-create';
  if (pathname.startsWith('/educator/courses/all')) return 'courses-all';
  if (pathname.startsWith('/educator/courses')) return 'courses';
  if (pathname.startsWith('/educator/students')) return 'students';
  if (pathname.startsWith('/educator/analytics')) return 'analytics';
  if (pathname.startsWith('/educator/certificates')) return 'certificates';
  return 'dashboard';
};

export function EducatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const role = useRole();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (role !== 'educator' && role !== 'admin') { router.replace('/access-denied'); }
  }, [isLoading, isAuthenticated, role, router]);

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

  if (!isAuthenticated || (role !== 'educator' && role !== 'admin')) {
    return null;
  }

  const view = pathnameToView(pathname);
  const meta = viewMeta[view] || viewMeta.dashboard;

  const handleNavigate = (nextView: string) => {
    if (nextView === 'courses-create') { router.push('/educator/courses/create'); return; }
    if (nextView === 'courses-all') { router.push('/educator/courses/all'); return; }
    if (nextView === 'courses') { router.push('/educator/courses'); return; }
    if (nextView === 'students') { router.push('/educator/students'); return; }
    if (nextView === 'analytics') { router.push('/educator/analytics'); return; }
    if (nextView === 'certificates') { router.push('/educator/certificates'); return; }
    if (nextView === 'dashboard') { router.push('/educator'); return; }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" richColors />
      <EducatorSidebar activeView={view} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col">
        <EducatorTopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}