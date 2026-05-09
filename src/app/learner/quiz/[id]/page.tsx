import QuizClientPage from './QuizClientPage';

export default async function LearnerQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuizClientPage lessonId={id} />;
}
