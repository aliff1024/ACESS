import LessonClientPage from './LessonClientPage';

export default async function LearnerLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonClientPage lessonId={id} />;
}
