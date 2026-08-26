'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, BookOpen, Search, Sparkles } from 'lucide-react';
import { fetchEnrolledCourses } from '@/lib/learner-api';
import type { EnrolledCourse } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';

interface ContinueLearningCardProps {
  onContinue: (courseId: string) => void
  onBrowseCourses: () => void
}

/**
 * The single strongest call to action on the Dashboard: pick up where you
 * left off.
 *
 * WHY THIS EXISTS SEPARATELY FROM "My Courses"
 *
 * Requested hierarchy for the Dashboard put "Continue Learning" ahead of
 * everything else — the one thing most learners want when they open the
 * portal is to get back into the course they were already working on, not
 * to survey their whole enrollment list. `MyCoursesSection` still shows every
 * enrolled course; this picks ONE of them out and gives it the visual weight
 * of a primary action.
 *
 * SELECTION, FROM REAL DATA
 *
 * The course chosen is the in-progress enrollment (0% < progress < 100%)
 * with the HIGHEST progress — the course the learner has invested the most
 * in and is closest to finishing, which is the strongest signal available of
 * "what was I doing" without a per-enrollment last-accessed timestamp in the
 * schema. Ties fall back to the most recently updated course. A learner with
 * no in-progress course but at least one not-yet-started enrollment is
 * offered that one instead ("Start"); a learner with none at all sees a
 * browse-courses prompt, never a fabricated recommendation.
 */
export function ContinueLearningCard({ onContinue, onBrowseCourses }: ContinueLearningCardProps) {
  const { t } = useTranslation();
  const [course, setCourse] = useState<EnrolledCourse | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchEnrolledCourses()
      .then((courses) => {
        if (cancelled) return;
        const inProgress = courses
          .filter((c) => c.progress > 0 && c.progress < 100)
          .sort((a, b) => b.progress - a.progress || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
        const notStarted = courses
          .filter((c) => c.progress === 0)
          .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
        setCourse(inProgress[0] ?? notStarted[0] ?? null);
      })
      .catch(() => setCourse(null));
    return () => { cancelled = true; };
  }, []);

  // Undefined = still loading; render nothing rather than a placeholder that
  // would flash and disappear.
  if (course === undefined) return null;

  if (course === null) {
    return (
      <Card className="p-6 md:p-8 border-blue-200 bg-blue-50 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm simplifiable"
            aria-hidden="true"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-700">{t('continueLearning.emptyTitle')}</h2>
            <p className="text-sm text-blue-700 mt-0.5">{t('continueLearning.emptyBody')}</p>
          </div>
        </div>
        <Button onClick={onBrowseCourses} size="lg" className="shrink-0">
          <Search className="w-5 h-5 mr-2" aria-hidden="true" />
          {t('continueLearning.browse')}
        </Button>
      </Card>
    );
  }

  const isStart = course.progress === 0;

  return (
    <Card className="p-6 md:p-8 border-blue-200 bg-blue-50 flex flex-col md:flex-row md:items-center gap-6">
      <div
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm simplifiable"
        aria-hidden="true"
      >
        <BookOpen className="w-7 h-7 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
          {isStart ? t('continueLearning.readyToStart') : t('continueLearning.pickUpWhereYouLeftOff')}
        </p>
        <h2 className="text-xl font-bold text-blue-700 truncate">{course.title}</h2>
        {!isStart && (
          <div className="mt-3 max-w-sm">
            <div className="flex justify-between text-xs font-medium text-blue-700 mb-1">
              <span>{t('continueLearning.progress')}</span>
              <span className="tabular-nums">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2 bg-blue-100 [&>div]:bg-blue-600" />
          </div>
        )}
      </div>

      <Button
        onClick={() => onContinue(course.id)}
        size="lg"
        className="shrink-0 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
      >
        <PlayCircle className="w-5 h-5 mr-2" aria-hidden="true" />
        {isStart ? t('continueLearning.start') : t('continueLearning.continue')}
      </Button>
    </Card>
  );
}
