'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminCourseDetail from '@/components/admin/AdminCourseDetail';

export default function AdminCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  return <AdminCourseDetail courseId={params.id as string} onBack={() => router.push('/admin/courses')} />;
}
