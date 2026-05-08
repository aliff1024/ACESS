import QuizClientPage from './QuizClientPage';

export default async function LearnerQuizPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  return <QuizClientPage lessonId={params.id ?? 'l6'} courseId={courseId ?? '1'} />;
}
