import LessonClientPage from './LessonClientPage';

export default async function LearnerLessonPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  return <LessonClientPage lessonId={params.id ?? 'l6'} courseId={courseId ?? '1'} />;
}
