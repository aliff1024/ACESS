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
      <AdaptiveRecommendations onStartLesson={() => router.push('/learner/courses/1')} />
      <MyCoursesSection onContinue={() => router.push('/learner/courses/1')} />
      <ProgressOverview />
      <QuickActions onBrowseCourses={() => router.push('/learner/courses')} />
    </div>
  );
}
