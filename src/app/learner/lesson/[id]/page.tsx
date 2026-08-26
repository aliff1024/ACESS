import { Suspense } from 'react';
import LessonClientPage from './LessonClientPage';
import { Loader2 } from 'lucide-react';

export default async function LearnerLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <LessonClientPage lessonId={id} />
    </Suspense>
  );
}
