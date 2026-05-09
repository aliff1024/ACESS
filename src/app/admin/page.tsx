'use client';

import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <AdminDashboard
      onNavigate={(view) => {
        const paths: Record<string, string> = {
          users: '/admin/users',
          courses: '/admin/courses',
          certificates: '/admin/certificates',
          analytics: '/admin/analytics',
          reports: '/admin/reports',
        };
        router.push(paths[view] || '/admin');
      }}
    />
  );
}
