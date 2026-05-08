import { EducatorShell } from '@/components/educator/EducatorShell';

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  return <EducatorShell>{children}</EducatorShell>;
}
