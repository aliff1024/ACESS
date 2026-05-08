'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { EducatorSidebar } from './EducatorSidebar';
import { EducatorTopBar } from './EducatorTopBar';
import { CreateCourseModal } from './CreateCourseModal';
import { AddLessonModal } from './AddLessonModal';
import { QuizBuilderModal } from './QuizBuilderModal';

const viewMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your teaching activity' },
  courses: { title: 'My Courses', subtitle: 'Manage your course content' },
  students: { title: 'Students Progress', subtitle: 'Monitor student progress' },
  analytics: { title: 'Analytics', subtitle: 'Track performance metrics' },
};

const pathnameToView = (pathname: string): keyof typeof viewMeta => {
  if (pathname.startsWith('/educator/courses')) return 'courses';
  if (pathname.startsWith('/educator/students')) return 'students';
  if (pathname.startsWith('/educator/analytics')) return 'analytics';
  return 'dashboard';
};

export function EducatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isQuizBuilderModalOpen, setIsQuizBuilderModalOpen] = useState(false);
  const view = pathnameToView(pathname);

  const handleNavigate = (nextView: string) => {
    if (nextView === 'create') {
      setIsCreateCourseModalOpen(true);
      return;
    }

    if (nextView === 'courses') router.push('/educator/courses');
    if (nextView === 'students') router.push('/educator/students');
    if (nextView === 'analytics') router.push('/educator/analytics');
    if (nextView === 'dashboard') router.push('/educator');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" richColors />
      <EducatorSidebar activeView={view} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col">
        <EducatorTopBar title={viewMeta[view].title} subtitle={viewMeta[view].subtitle} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onPublish={() => {
          toast.success('Course published successfully!', {
            description: 'Students can now enroll in your course',
          });
          setIsCreateCourseModalOpen(false);
        }}
        onAddLesson={() => {
          setIsCreateCourseModalOpen(false);
          setIsAddLessonModalOpen(true);
        }}
        onAddQuiz={() => {
          setIsCreateCourseModalOpen(false);
          setIsQuizBuilderModalOpen(true);
        }}
      />

      <AddLessonModal
        isOpen={isAddLessonModalOpen}
        onClose={() => setIsAddLessonModalOpen(false)}
        onSave={() => {
          toast.success('Lesson added successfully!');
          setIsAddLessonModalOpen(false);
        }}
      />

      <QuizBuilderModal
        isOpen={isQuizBuilderModalOpen}
        onClose={() => setIsQuizBuilderModalOpen(false)}
        onSave={() => {
          toast.success('Quiz created successfully!');
          setIsQuizBuilderModalOpen(false);
        }}
      />
    </div>
  );
}
