'use client';

import { useEffect } from 'react';
import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CourseWorkspace from '@/components/educator/CourseWorkspace';
import { Loader2 } from 'lucide-react';

function AdminCourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id === 'create' || id === 'new') {
      router.replace('/admin/courses/new');
    }
  }, [id, router]);

  if (id === 'create' || id === 'new') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return <CourseWorkspace courseId={id} onBack={() => router.push('/admin/courses')} mode="admin" />;
}

export default function AdminCourseDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <AdminCourseDetailContent />
    </Suspense>
  );
}
