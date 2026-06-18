'use client';

import { useRouter } from 'next/navigation';
import { WelcomeSection } from '@/components/learner/WelcomeSection';
import { AdaptiveRecommendations } from '@/components/learner/AdaptiveRecommendations';
import { MyCoursesSection } from '@/components/learner/MyCoursesSection';
import { ProgressOverview } from '@/components/learner/ProgressOverview';

export default function LearnerDashboardPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12">
      {/* Hero Section */}
      <section>
        <WelcomeSection />
      </section>

      {/* Progress & Stats */}
      <section>
        <ProgressOverview />
      </section>

      {/* Recommended Next Steps */}
      <section>
        <AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} />
      </section>

      {/* Active Learning Paths */}
      <section>
        <MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} />
      </section>
    </div>
  );
}
