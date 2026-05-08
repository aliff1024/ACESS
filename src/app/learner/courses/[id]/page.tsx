'use client';

import { useParams, useRouter } from 'next/navigation';
import { CourseDetailPage } from '@/components/courses/CourseDetailPage';

export default function LearnerCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params.id ?? '1';

  return (
    <CourseDetailPage
      courseId={courseId}
      onBack={() => router.push('/learner/courses')}
      onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=${courseId}`)}
    />
  );
}
