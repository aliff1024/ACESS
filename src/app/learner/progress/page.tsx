import ProgressClientPage from './ProgressClientPage';

export default async function LearnerProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  return <ProgressClientPage selectedCourse={courseId} />;
}
