'use client';

import { useRouter } from 'next/navigation';
import { WelcomeSection } from '@/components/learner/WelcomeSection';
import { AdaptiveRecommendations } from '@/components/learner/AdaptiveRecommendations';
import { MyCoursesSection } from '@/components/learner/MyCoursesSection';
import { ProgressOverview } from '@/components/learner/ProgressOverview';
import { QuickActions } from '@/components/learner/QuickActions';

export default function LearnerDashboardPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <WelcomeSection />
      <AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} />
      <MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} />
      <ProgressOverview />
      <QuickActions onBrowseCourses={() => router.push('/learner/courses')} />
    </div>
  );
}
