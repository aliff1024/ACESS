'use client';

import { useRouter } from 'next/navigation';
import { WelcomeSection } from '@/components/learner/WelcomeSection';
import { AdaptiveRecommendations } from '@/components/learner/AdaptiveRecommendations';
import { MyCoursesSection } from '@/components/learner/MyCoursesSection';
import { ProgressOverview } from '@/components/learner/ProgressOverview';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { settings } = useAccessibility();
  const activePreset = settings?.active_preset || 'none';

  // --- ADHD Dashboard ---
  // Hyper-focused on Next Steps. Progress charts hidden to reduce anxiety/distraction.
  if (activePreset === 'adhd') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8">
        <section>
          <WelcomeSection />
        </section>
        {/* Next step is immediately below welcome */}
        <section className="ring-2 ring-primary rounded-2xl p-1 bg-primary/10">
          <h2 className="px-4 pt-4 text-sm font-bold tracking-wider text-primary uppercase">Focus Area</h2>
          <AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} />
        </section>
        <section>
          <MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} />
        </section>
      </div>
    );
  }

  // --- Autism Dashboard ---
  // Explicitly numbered sections to provide a predictable visual schedule.
  if (activePreset === 'autism') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12">
        <section>
          <WelcomeSection />
        </section>
        <div className="bg-card rounded-2xl p-6 border border-border space-y-10">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Today's Schedule
            </h2>
            <AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              All Active Courses
            </h2>
            <MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-muted text-muted-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              My Progress
            </h2>
            <ProgressOverview />
          </section>
        </div>
      </div>
    );
  }

  // --- Dyscalculia Dashboard ---
  // Show progress, but potentially wrap it in a simplified container.
  // Ideally, ProgressOverview should accept a `simplifiedGraphics={true}` prop, but for now we wrap it.
  if (activePreset === 'dyscalculia') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12">
        <section>
          <WelcomeSection />
        </section>
        <section className="bg-card p-6 rounded-2xl border border-border">
          <h2 className="text-xl font-semibold mb-2">You are doing great!</h2>
          <p className="text-muted-foreground mb-4">You have completed several lessons recently. Keep up the good work!</p>
          {/* We still show progress overview, but wrapped in affirming text instead of cold numbers */}
          <ProgressOverview />
        </section>
        <section>
          <AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} />
        </section>
        <section>
          <MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} />
        </section>
      </div>
    );
  }

  // --- Dyslexia / Default Dashboard ---
  // Dyslexia largely relies on the CSS variables for font size, spacing, etc., 
  // which apply naturally to the default structure.
  
  if (settings.chunked_content_mode) {
    return (
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 ${activePreset === 'dyslexia' ? 'space-y-16' : ''}`}>
        <Tabs defaultValue="welcome" className="space-y-8">
          <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-gray-100/50 rounded-xl w-full">
            <TabsTrigger value="welcome" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">Welcome</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">Progress</TabsTrigger>
            <TabsTrigger value="recommendations" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">Next Steps</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">Active Courses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="welcome" className="m-0 mt-6"><WelcomeSection /></TabsContent>
          <TabsContent value="progress" className="m-0 mt-6"><ProgressOverview /></TabsContent>
          <TabsContent value="recommendations" className="m-0 mt-6"><AdaptiveRecommendations onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=`)} /></TabsContent>
          <TabsContent value="courses" className="m-0 mt-6"><MyCoursesSection onContinue={(courseId) => router.push(`/learner/courses/${courseId}`)} /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12 ${activePreset === 'dyslexia' ? 'space-y-16' : ''}`}>
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
