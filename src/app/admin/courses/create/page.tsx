'use client';

import { useSearchParams } from 'next/navigation';
import AdminCourseCreate from '@/components/admin/AdminCourseCreate';

export default function AdminCourseCreatePage() {
  const searchParams = useSearchParams();
  const courseType = searchParams.get('type') || 'educator';
  return <AdminCourseCreate courseType={courseType as 'educator' | 'system'} />;
}
