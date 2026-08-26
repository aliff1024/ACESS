'use client';

import { useRouter } from 'next/navigation';
import { WelcomeSection } from '@/components/learner/WelcomeSection';
import { ContinueLearningCard } from '@/components/learner/ContinueLearningCard';
import { AdaptiveRecommendations } from '@/components/learner/AdaptiveRecommendations';
import { MyCoursesSection } from '@/components/learner/MyCoursesSection';
import { ProgressOverview } from '@/components/learner/ProgressOverview';
import { AchievementsSummary } from '@/components/learner/AchievementsSummary';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/useTranslation';

/**
 * The Learner Dashboard.
 *
 * HIERARCHY
 *
 * Every preset below follows the same priority order, because the question
 * the Dashboard answers — "what should I do next" — doesn't change with the
 * preset, only how much is shown at once and how it's grouped:
 *
 *   1. Continue Learning  — the single strongest action: resume the course
 *      already in progress. Real data (highest-progress in-progress
 *      enrollment), never a placeholder.
 *   2. Recommended next   — genuinely personalized suggestions, computed
 *      server-side from tags/category/difficulty overlap, quiz performance
 *      and favourites (see recommendation-engine.ts).
 *   3. Active courses     — the learner's full enrollment list, for when
 *      they want something other than what's recommended.
 *   4. Achievements & certificates — a compact "where you stand" strip.
 *   5. Learning stats     — compact, secondary, last.
 *
 * Learning Stats used to be the tallest thing on the page and sit second;
 * it's now a single-row strip at the bottom, so the things a learner can
 * actually act on are the first things they see.
 */
export default function LearnerDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useAccessibility();
  const activePreset = settings?.base_preset || settings?.active_preset || 'none';

  const goToLesson = (lessonId: string, cId?: string) =>
    router.push(`/learner/lesson/${lessonId}?courseId=${cId || ''}`);
  const goToCourse = (courseId: string) => router.push(`/learner/courses/${courseId}`);
  const goToCourses = () => router.push('/learner/courses');

  // --- ADHD Dashboard ---
  // Hyper-focused on Next Steps. Progress charts hidden to reduce anxiety/distraction.
  if (activePreset === 'adhd') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 readable-content">
        <section>
          <WelcomeSection />
        </section>
        <section>
          <ContinueLearningCard onContinue={goToCourse} onBrowseCourses={goToCourses} />
        </section>
        {/* Next step is immediately below welcome */}
        <section className="ring-2 ring-primary rounded-2xl p-1 bg-primary/10">
          <h2 className="px-4 pt-4 text-sm font-bold tracking-wider text-primary uppercase">{t('dashboard.focusArea')}</h2>
          <AdaptiveRecommendations onStartLesson={goToLesson} onViewCourse={goToCourse} />
        </section>
        <section>
          <MyCoursesSection onContinue={goToCourse} />
        </section>
      </div>
    );
  }

  // --- Autism Dashboard ---
  // Explicitly numbered sections to provide a predictable visual schedule.
  if (activePreset === 'autism') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12 readable-content">
        <section>
          <WelcomeSection />
        </section>
        <div className="bg-card rounded-2xl p-6 border border-border space-y-10">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              {t('progress.continueLearning')}
            </h2>
            <ContinueLearningCard onContinue={goToCourse} onBrowseCourses={goToCourses} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              {t('dashboard.todaySchedule')}
            </h2>
            <AdaptiveRecommendations onStartLesson={goToLesson} onViewCourse={goToCourse} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              {t('dashboard.allActiveCourses')}
            </h2>
            <MyCoursesSection onContinue={goToCourse} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-muted text-muted-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              My Badges and Certificates
            </h2>
            <AchievementsSummary showHeading={false} />
          </section>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="bg-muted text-muted-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              {t('dashboard.myProgress')}
            </h2>
            <ProgressOverview />
          </section>
        </div>
      </div>
    );
  }



  // --- Dyslexia Dashboard ---
  // docs/accessibility/03 §4.4, docs/accessibility/04 §4.1: before this
  // branch existed, Dyslexia fell through to the same dashboard as every
  // other learner (just a wider sidebar and `space-y-16`) — colours and
  // spacing, no actual behavioural identity. This is one column, one
  // recommendation instead of a 3-card grid, no stat-tile grid, generous
  // vertical rhythm (space-y-16, matching the wider inter-block spacing
  // used elsewhere for this preset), and content kept within the
  // measure-driven .content-column rather than the full max-w-7xl shell.
  if (activePreset === 'dyslexia') {
    return (
      <div className="content-column mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-16 readable-content">
        <section>
          <WelcomeSection />
        </section>
        <section>
          <ContinueLearningCard onContinue={goToCourse} onBrowseCourses={goToCourses} />
        </section>
        <section>
          <h2 className="px-1 text-sm font-bold tracking-wider text-primary uppercase mb-4">Continue reading</h2>
          <AdaptiveRecommendations
            maxItems={1}
            singleColumn
            onStartLesson={goToLesson}
            onViewCourse={goToCourse}
          />
        </section>
        <section>
          <MyCoursesSection singleColumn onContinue={goToCourse} />
        </section>
      </div>
    );
  }

  // --- Default Dashboard ---
  if (settings.chunked_content_mode) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 readable-content">
        <Tabs defaultValue="welcome" className="space-y-8">
          <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-muted rounded-xl w-full">
            <TabsTrigger value="welcome" className="flex-1 text-sm md:text-base py-3 px-4 rounded-lg">{t('dashboard.tabWelcome')}</TabsTrigger>
            <TabsTrigger value="recommendations" className="flex-1 text-sm md:text-base py-3 px-4 rounded-lg">{t('dashboard.tabNextSteps')}</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 text-sm md:text-base py-3 px-4 rounded-lg">{t('dashboard.tabActiveCourses')}</TabsTrigger>
            <TabsTrigger value="achievements" className="flex-1 text-sm md:text-base py-3 px-4 rounded-lg">{t('dashboard.tabAchievements')}</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1 text-sm md:text-base py-3 px-4 rounded-lg">{t('dashboard.tabProgress')}</TabsTrigger>
          </TabsList>

          <TabsContent value="welcome" className="m-0 mt-6 space-y-6">
            <WelcomeSection />
            <ContinueLearningCard onContinue={goToCourse} onBrowseCourses={goToCourses} />
          </TabsContent>
          <TabsContent value="recommendations" className="m-0 mt-6"><AdaptiveRecommendations onStartLesson={goToLesson} onViewCourse={goToCourse} /></TabsContent>
          <TabsContent value="courses" className="m-0 mt-6"><MyCoursesSection onContinue={goToCourse} /></TabsContent>
          <TabsContent value="achievements" className="m-0 mt-6"><AchievementsSummary showHeading={false} /></TabsContent>
          <TabsContent value="progress" className="m-0 mt-6"><ProgressOverview /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10 readable-content">
      {/* Hero Section */}
      <section>
        <WelcomeSection />
      </section>

      {/* 1. Continue Learning — the strongest action on the page */}
      <section>
        <ContinueLearningCard onContinue={goToCourse} onBrowseCourses={goToCourses} />
      </section>

      {/* 2. Recommended next steps */}
      <section>
        <AdaptiveRecommendations onStartLesson={goToLesson} onViewCourse={goToCourse} />
      </section>

      {/* 3. Active courses */}
      <section>
        <MyCoursesSection onContinue={goToCourse} />
      </section>

      {/* 4. Achievements & certificates, in one line. The full picture lives
          on /learner/achievements — the Dashboard's job is "what next". */}
      <section>
        <AchievementsSummary />
      </section>

      {/* 5. Learning stats — compact, secondary, last */}
      <section>
        <ProgressOverview />
      </section>
    </div>
  );
}
