'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LessonViewPage } from '@/components/courses/LessonViewPage';
import { fetchLessonIdsInCourse } from '@/lib/learner-api';

export default function LessonClientPage({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') || '';
  const [lessonIds, setLessonIds] = useState<string[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchLessonIdsInCourse(courseId).then(setLessonIds).catch(() => {});
    }
  }, [courseId]);

  const currentIndex = lessonIds.indexOf(lessonId);
  const prevLessonId = currentIndex > 0 ? lessonIds[currentIndex - 1] : null;
  const nextLessonId = currentIndex < lessonIds.length - 1 ? lessonIds[currentIndex + 1] : null;

  const isPreview = searchParams.get('preview') === 'true';
  const previewQuery = isPreview ? '&preview=true' : '';

  return (
    <LessonViewPage
      lessonId={lessonId}
      courseId={courseId}
      isPreview={isPreview}
      onBack={() => router.push(`/learner/courses/${courseId}${isPreview ? '?preview=true' : ''}`)}
      onNextLesson={nextLessonId ? () => router.push(`/learner/lesson/${nextLessonId}?courseId=${courseId}${previewQuery}`) : undefined}
      onPreviousLesson={prevLessonId ? () => router.push(`/learner/lesson/${prevLessonId}?courseId=${courseId}${previewQuery}`) : undefined}
    />
  );
}
