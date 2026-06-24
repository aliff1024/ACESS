'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LessonViewPage } from '@/components/courses/LessonViewPage';
import { fetchLessonIdsInCourse } from '@/lib/learner-api';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function LessonClientPage({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState<string | null>(searchParams.get('courseId'));
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!searchParams.get('courseId'));

  useEffect(() => {
    if (!courseId) {
      // Fetch courseId from the lesson if not provided
      supabase.from('lessons').select('course_id').eq('id', lessonId).single()
        .then(({ data }) => {
          if (data && data.course_id) {
            setCourseId(data.course_id);
          }
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [lessonId, courseId]);

  useEffect(() => {
    if (courseId) {
      fetchLessonIdsInCourse(courseId).then(setLessonIds).catch(() => {});
    }
  }, [courseId]);

  if (loading || !courseId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const currentIndex = lessonIds.indexOf(lessonId);
  const prevLessonId = currentIndex > 0 ? lessonIds[currentIndex - 1] : null;
  const nextLessonId = currentIndex < lessonIds.length - 1 ? lessonIds[currentIndex + 1] : null;

  const isPreview = searchParams.get('preview') === 'true';
  const previewQuery = isPreview ? '&preview=true' : '';

  return (
    <LessonViewPage
      lessonId={lessonId}
      courseId={courseId}
      isPreview={isPreview}
      onBack={() => router.push(`/learner/courses/${courseId}${isPreview ? '?preview=true' : ''}`)}
      onNextLesson={nextLessonId ? () => router.push(`/learner/lesson/${nextLessonId}?courseId=${courseId}${previewQuery}`) : undefined}
      onPreviousLesson={prevLessonId ? () => router.push(`/learner/lesson/${prevLessonId}?courseId=${courseId}${previewQuery}`) : undefined}
    />
  );
}
