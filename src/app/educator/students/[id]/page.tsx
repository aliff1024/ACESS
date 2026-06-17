import { StudentDetailDashboard } from '@/components/educator/StudentDetailDashboard';

export default async function EducatorStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailDashboard studentId={id} />;
}
