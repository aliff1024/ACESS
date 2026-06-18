'use client';

import { useParams, useRouter } from 'next/navigation';
import { CourseDetailPage } from '@/components/courses/CourseDetailPage';
import { EyeOff } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

export default function EducatorPreviewCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params.id ?? '1';
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full relative">
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shrink-0 shadow-sm z-50">
        <EyeOff className="w-4 h-4" />
        {t('dashboard.preview')}
        <button
          onClick={() => router.push(`/educator/courses/${courseId}`)}
          className="ml-4 px-3 py-1 bg-white text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-xs font-semibold"
        >
          {t('dashboard.exitPreview')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <CourseDetailPage
          courseId={courseId}
          isPreview={true}
          onBack={() => router.push(`/educator/courses/${courseId}`)}
          onStartLesson={(lessonId) => router.push(`/educator/preview/lesson/${lessonId}?courseId=${courseId}`)}
        />
      </div>
    </div>
  );
}
