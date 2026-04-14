import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { WelcomeSection } from './WelcomeSection';
import { AdaptiveRecommendations } from './AdaptiveRecommendations';
import { MyCoursesSection } from './MyCoursesSection';
import { ProgressOverview } from './ProgressOverview';
import { QuickActions } from './QuickActions';
import { AccessibilitySettingsModal } from './AccessibilitySettingsModal';
import { CourseListPage } from '../courses/CourseListPage';
import { CourseDetailPage } from '../courses/CourseDetailPage';
import { LessonViewPage } from '../courses/LessonViewPage';
import { QuizPage } from '../courses/QuizPage';
import { QuizResultModal } from '../courses/QuizResultModal';
import { ReviewAnswersPage } from '../courses/ReviewAnswersPage';
import { ProgressPage } from '../progress/ProgressPage';
import { CourseProgressDetailPage } from '../progress/CourseProgressDetailPage';
import { CertificateGenerationModal } from '../certificates/CertificateGenerationModal';
import { CertificatePage } from '../certificates/CertificatePage';
import { CertificateListPage } from '../certificates/CertificateListPage';
import { Toaster } from '../ui/sonner';
import { toast } from 'sonner';

type View =
  | 'dashboard'
  | 'courses'
  | 'courseList'
  | 'courseDetail'
  | 'lesson'
  | 'quiz'
  | 'reviewAnswers'
  | 'progress'
  | 'courseProgress'
  | 'certificates'
  | 'certificateView';

export function LearnerDashboard() {
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarView, setSidebarView] = useState<string>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: string; selectedAnswer: string }[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);

  const handleSidebarNavigate = (view: string) => {
    setSidebarView(view);
    if (view === 'dashboard') {
      setCurrentView('dashboard');
    } else if (view === 'courses') {
      setCurrentView('courseList');
    } else if (view === 'progress') {
      setCurrentView('progress');
    } else if (view === 'certificates') {
      setCurrentView('certificates');
    }
  };

  const handleBrowseCourses = () => {
    setCurrentView('courseList');
    setSidebarView('courses');
  };

  const handleViewCourse = (courseId: string) => {
    setSelectedCourse(courseId);
    setCurrentView('courseDetail');
  };

  const handleStartLesson = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setCurrentView('lesson');
  };

  const handleTakeQuiz = () => {
    setCurrentView('quiz');
  };

  const handleQuizSubmit = (score: number, answers: { questionId: string; selectedAnswer: string }[]) => {
    setQuizScore(score);
    setQuizAnswers(answers);
    setShowQuizResult(true);
  };

  const handleReviewAnswers = () => {
    setShowQuizResult(false);
    setCurrentView('reviewAnswers');
  };

  const handleRetryQuiz = () => {
    setShowQuizResult(false);
    setQuizAnswers([]);
    setCurrentView('quiz');
  };

  const handleContinueLearning = () => {
    setShowQuizResult(false);
    setCurrentView('courseDetail');
  };

  const handleViewCourseProgress = (courseId: string) => {
    setSelectedCourse(courseId);
    setCurrentView('courseProgress');
  };

  const handleGenerateCertificate = (courseId: string) => {
    setSelectedCourse(courseId);
    setShowCertificateModal(true);
  };

  const handleViewCertificate = (certificateId?: string) => {
    if (certificateId) {
      setSelectedCertificate(certificateId);
    }
    setShowCertificateModal(false);
    setCurrentView('certificateView');
  };

  const handleDownloadCertificate = () => {
    toast.success('Certificate downloaded successfully!', {
      description: 'Your certificate has been saved to your downloads folder.',
      duration: 3000,
    });
  };

  const handleShareCertificate = () => {
    toast.success('Share link copied!', {
      description: 'Certificate link has been copied to your clipboard.',
      duration: 3000,
    });
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSidebarView('dashboard');
    setSelectedCourse(null);
    setSelectedLesson(null);
  };

  const handleBackToCourseList = () => {
    setCurrentView('courseList');
    setSelectedCourse(null);
  };

  const handleBackToCourseDetail = () => {
    setCurrentView('courseDetail');
    setSelectedLesson(null);
  };

  const handleBackToLesson = () => {
    setCurrentView('lesson');
  };

  const handleBackToResults = () => {
    setShowQuizResult(true);
    setCurrentView('lesson');
  };

  const handleBackToProgress = () => {
    setCurrentView('progress');
  };

  const handleNextLesson = () => {
    console.log('Next lesson');
  };

  const handlePreviousLesson = () => {
    console.log('Previous lesson');
  };

  if (currentView === 'courseList') {
    return <CourseListPage onViewCourse={handleViewCourse} onBack={handleBackToDashboard} />;
  }

  if (currentView === 'courseDetail') {
    return (
      <CourseDetailPage
        courseId={selectedCourse || '1'}
        onBack={handleBackToCourseList}
        onStartLesson={handleStartLesson}
      />
    );
  }

  if (currentView === 'lesson') {
    return (
      <LessonViewPage
        lessonId={selectedLesson || 'l6'}
        onBack={handleBackToCourseDetail}
        onTakeQuiz={handleTakeQuiz}
        onNextLesson={handleNextLesson}
        onPreviousLesson={handlePreviousLesson}
      />
    );
  }

  if (currentView === 'quiz') {
    return <QuizPage onBack={handleBackToLesson} onSubmit={handleQuizSubmit} />;
  }

  if (currentView === 'reviewAnswers') {
    return (
      <ReviewAnswersPage
        answers={quizAnswers}
        onBack={handleBackToResults}
        onRetryQuiz={handleRetryQuiz}
      />
    );
  }

  if (currentView === 'progress') {
    return (
      <ProgressPage
        onViewCourseProgress={handleViewCourseProgress}
        onBrowseCourses={handleBrowseCourses}
      />
    );
  }

  if (currentView === 'courseProgress') {
    return (
      <CourseProgressDetailPage
        courseId={selectedCourse || '1'}
        onBack={handleBackToProgress}
        onGenerateCertificate={handleGenerateCertificate}
        onStartLesson={handleStartLesson}
      />
    );
  }

  if (currentView === 'certificates') {
    return (
      <CertificateListPage
        onViewCertificate={handleViewCertificate}
        onBrowseCourses={handleBrowseCourses}
        onDownload={handleDownloadCertificate}
      />
    );
  }

  if (currentView === 'certificateView') {
    return (
      <CertificatePage
        courseTitle="Introduction to Web Accessibility"
        learnerName="Learner"
        completionDate="March 15, 2026"
        certificateCode="ACESS-2026-00123"
        onBack={handleBackToDashboard}
        onDownload={handleDownloadCertificate}
        onShare={handleShareCertificate}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeView={sidebarView}
        onNavigate={handleSidebarNavigate}
        onAccessibilityClick={() => setShowAccessibilitySettings(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <WelcomeSection />
            <AdaptiveRecommendations onStartLesson={() => handleViewCourse('1')} />
            <MyCoursesSection onContinue={(courseTitle) => handleViewCourse('1')} />
            <ProgressOverview />
            <QuickActions onBrowseCourses={handleBrowseCourses} />
          </div>
        </main>
      </div>

      <AccessibilitySettingsModal
        isOpen={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />

      <QuizResultModal
        isOpen={showQuizResult}
        score={quizScore}
        onClose={() => setShowQuizResult(false)}
        onReviewAnswers={handleReviewAnswers}
        onRetryQuiz={handleRetryQuiz}
        onContinueLearning={handleContinueLearning}
      />

      <CertificateGenerationModal
        isOpen={showCertificateModal}
        courseTitle="Introduction to Web Accessibility"
        learnerName="Learner"
        completionDate="March 15, 2026"
        certificateCode="ACESS-2026-00123"
        onClose={() => setShowCertificateModal(false)}
        onViewCertificate={() => handleViewCertificate()}
        onDownload={handleDownloadCertificate}
      />

      <Toaster />
    </div>
  );
}
