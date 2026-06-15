import { redirect } from 'next/navigation';

/** @deprecated Use /admin/courses/new — kept for old links */
export default function AdminCourseCreateRedirectPage() {
  redirect('/admin/courses/new');
}
