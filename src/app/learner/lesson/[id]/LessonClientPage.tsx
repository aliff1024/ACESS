'use client';

import { useRouter } from 'next/navigation';
import { LessonViewPage } from '@/components/courses/LessonViewPage';

export default function LessonClientPage({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter();

  return (
    <LessonViewPage
      lessonId={lessonId}
      onBack={() => router.push(`/learner/courses/${courseId}`)}
      onTakeQuiz={() => router.push(`/learner/quiz/${lessonId}?courseId=${courseId}`)}
      onNextLesson={() => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}`)}
      onPreviousLesson={() => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}`)}
    />
  );
}
