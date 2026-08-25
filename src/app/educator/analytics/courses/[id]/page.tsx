import { CourseAnalyticsDetailView } from '@/components/educator/CourseAnalyticsDetailView';

export default async function EducatorCourseAnalyticsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseAnalyticsDetailView courseId={id} />;
}
