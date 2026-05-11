'use client';

import { useRouter } from 'next/navigation';
import { EducatorDashboardOverview } from '@/components/educator/EducatorDashboardOverview';

export default function EducatorDashboardPage() {
  const router = useRouter();

  return (
    <EducatorDashboardOverview
      onCreateCourse={() => router.push('/educator/courses/create')}
      onViewCourses={() => router.push('/educator/courses')}
      onViewStudents={() => router.push('/educator/students')}
      onViewCertificates={() => router.push('/educator/certificates')}
    />
  );
}
