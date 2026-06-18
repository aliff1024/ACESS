'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CourseDetailPage } from '@/components/courses/CourseDetailPage';

export default function LearnerCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const courseId = params.id ?? '1';

  return (
    <CourseDetailPage
      courseId={courseId}
      isPreview={isPreview}
      onBack={() => router.push(isPreview ? `/educator/courses/${courseId}` : '/learner/courses')}
      onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}${isPreview ? '&preview=true' : ''}`)}
    />
  );
}
