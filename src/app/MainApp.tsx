// app/MainApp.tsx
'use client';

import { useApp } from './providers/AppContext';
import { Navbar } from '@/components/figma/Navbar';
import { Hero } from '@/components/figma/Hero';
import { DemoRoleModal } from '@/components/figma/DemoRoleModal';
import { Features } from '@/components/figma/Features';
import { CoursesPreview } from '@/components/figma/CoursesPreview';
import { AccessibilityHighlight } from '@/components/figma/AccessibilityHighlight';
import { Footer } from '@/components/figma/Footer';
import { LearnerDashboard } from '@/components/learner/LearnerDashboard';
import { EducatorDashboard } from '@/components/educator/EducatorDashboard';

export default function MainApp() {
  const { 
    currentView, 
    setCurrentView, 
    isDemoModalOpen, 
    setIsDemoModalOpen 
  } = useApp();

  const handleSelectRole = (role: 'learner' | 'educator' | 'admin') => {
    console.log(`Selected role: ${role}`);
    setCurrentView(role);
    setIsDemoModalOpen(false);
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  // Show different dashboards based on view
  if (currentView === 'learner') {
    return <LearnerDashboard />;
  }

  if (currentView === 'educator') {
    return <EducatorDashboard />;
  }

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
          <p className="text-xl text-gray-600 mb-8">Coming soon...</p>
          <button
            onClick={handleBackToLanding}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Landing Page
          </button>
        </div>
      </div>
    );
  }

  // Show landing page
  return (
    <div className="min-h-screen bg-white">
      <Navbar onTryDemo={() => setIsDemoModalOpen(true)} />

      <main>
        <Hero onTryDemo={() => setIsDemoModalOpen(true)} />
        <Features />
        <CoursesPreview />
        <AccessibilityHighlight />
      </main>

      <Footer />

      <DemoRoleModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectRole={handleSelectRole}
      />
    </div>
  );
}