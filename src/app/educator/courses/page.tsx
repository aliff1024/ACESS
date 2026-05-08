'use client';

import { toast } from 'sonner';
import { EducatorCoursesPage } from '@/components/educator/EducatorCoursesPage';

export default function EducatorCoursesRoutePage() {
  return (
    <EducatorCoursesPage
      onCreateCourse={() => toast.info('Use "Create Course" in the sidebar.')}
      onEditCourse={() => toast.info('Opening course editor...')}
      onViewCourse={() => toast.info('Opening learner preview...')}
    />
  );
}
