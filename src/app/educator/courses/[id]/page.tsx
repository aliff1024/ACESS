'use client';

import { useParams, useRouter } from 'next/navigation';
import CourseWorkspace from '@/components/educator/CourseWorkspace';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  return <CourseWorkspace courseId={courseId} onBack={() => router.push('/educator/courses')} />;
}
