'use client';

import { useState } from 'react';
import { EducatorSidebar } from './EducatorSidebar';
import { EducatorTopBar } from './EducatorTopBar';
import { EducatorDashboardOverview } from './EducatorDashboardOverview';
import { EducatorCoursesPage } from './EducatorCoursesPage';
import { StudentsProgressPage } from './StudentsProgressPage';
import { AnalyticsPage } from './AnalyticsPage';
import { CreateCourseModal } from './CreateCourseModal';
import { AddLessonModal } from './AddLessonModal';
import { QuizBuilderModal } from './QuizBuilderModal';
import { toast, Toaster } from 'sonner';

type View = 'dashboard' | 'courses' | 'create' | 'analytics' | 'students';

export function EducatorDashboard() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isQuizBuilderModalOpen, setIsQuizBuilderModalOpen] = useState(false);

  const handleNavigate = (view: string) => {
    if (view === 'create') {
      setIsCreateCourseModalOpen(true);
    } else {
      setCurrentView(view as View);
    }
  };

  const handlePublishCourse = () => {
    toast.success('Course published successfully!', {
      description: 'Students can now enroll in your course',
    });
    setIsCreateCourseModalOpen(false);
  };

  const handleSaveLesson = () => {
    toast.success('Lesson added successfully!');
    setIsAddLessonModalOpen(false);
  };

  const handleSaveQuiz = () => {
    toast.success('Quiz created successfully!');
    setIsQuizBuilderModalOpen(false);
  };

  const handleEditCourse = (courseId: string) => {
    toast.info('Opening course editor...');
  };

  const handleViewCourse = (courseId: string) => {
    toast.info('Opening learner preview...');
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'courses':
        return 'My Courses';
      case 'analytics':
        return 'Analytics';
      case 'students':
        return 'Students Progress';
      default:
        return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Overview of your teaching activity';
      case 'courses':
        return 'Manage your course content';
      case 'analytics':
        return 'Track performance metrics';
      case 'students':
        return 'Monitor student progress';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" richColors />

      <EducatorSidebar activeView={currentView} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col">
        <EducatorTopBar title={getPageTitle()} subtitle={getPageSubtitle()} />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <EducatorDashboardOverview
              onCreateCourse={() => setIsCreateCourseModalOpen(true)}
              onViewCourses={() => setCurrentView('courses')}
              onViewStudents={() => setCurrentView('students')}
            />
          )}

          {currentView === 'courses' && (
            <EducatorCoursesPage
              onCreateCourse={() => setIsCreateCourseModalOpen(true)}
              onEditCourse={handleEditCourse}
              onViewCourse={handleViewCourse}
            />
          )}

          {currentView === 'students' && <StudentsProgressPage />}

          {currentView === 'analytics' && <AnalyticsPage />}
        </main>
      </div>

      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onPublish={handlePublishCourse}
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
        onSave={handleSaveLesson}
      />

      <QuizBuilderModal
        isOpen={isQuizBuilderModalOpen}
        onClose={() => setIsQuizBuilderModalOpen(false)}
        onSave={handleSaveQuiz}
      />
    </div>
  );
}
