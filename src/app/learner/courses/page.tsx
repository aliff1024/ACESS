'use client';

import { useRouter } from 'next/navigation';
import { CourseListPage } from '@/components/courses/CourseListPage';

export default function LearnerCoursesPage() {
  const router = useRouter();

  return (
    <CourseListPage
      onViewCourse={(courseId) => router.push(`/learner/courses/${courseId}`)}
      onBack={() => router.push('/learner')}
    />
  );
}
