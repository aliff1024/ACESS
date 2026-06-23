'use client';

import { useParams } from 'next/navigation';
import { AdminUserProfile } from '@/components/admin/AdminUserProfile';

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  if (!userId) {
    return <div>User ID is missing</div>;
  }

  return <AdminUserProfile userId={userId} />;
}
