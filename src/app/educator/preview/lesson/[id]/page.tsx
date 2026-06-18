import LessonPreviewClientPage from './LessonPreviewClientPage';

export default async function EducatorPreviewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonPreviewClientPage lessonId={id} />;
}
