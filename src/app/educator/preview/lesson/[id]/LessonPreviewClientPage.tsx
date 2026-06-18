'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LessonViewPage } from '@/components/courses/LessonViewPage';
import { fetchLessonIdsInCourse } from '@/lib/learner-api';
import { EyeOff } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

export default function LessonPreviewClientPage({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') || '';
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (courseId) {
      fetchLessonIdsInCourse(courseId).then(setLessonIds).catch(() => {});
    }
  }, [courseId]);

  const currentIndex = lessonIds.indexOf(lessonId);
  const prevLessonId = currentIndex > 0 ? lessonIds[currentIndex - 1] : null;
  const nextLessonId = currentIndex < lessonIds.length - 1 ? lessonIds[currentIndex + 1] : null;

  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shrink-0 shadow-sm z-50">
        <EyeOff className="w-4 h-4" />
        {t('dashboard.preview')}
        <button
          onClick={() => router.push(`/educator/courses/${courseId}`)}
          className="ml-4 px-3 py-1 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-xs font-semibold"
        >
          {t('dashboard.exitPreview')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <LessonViewPage
          lessonId={lessonId}
          courseId={courseId}
          isPreview={true}
          onBack={() => router.push(`/educator/preview/course/${courseId}`)}
          onNextLesson={nextLessonId ? () => router.push(`/educator/preview/lesson/${nextLessonId}?courseId=${courseId}`) : undefined}
          onPreviousLesson={prevLessonId ? () => router.push(`/educator/preview/lesson/${prevLessonId}?courseId=${courseId}`) : undefined}
        />
      </div>
    </div>
  );
}
