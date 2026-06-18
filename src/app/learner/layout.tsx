import { Suspense } from 'react';
import { LearnerShell } from '@/components/learner/LearnerShell';

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <LearnerShell>{children}</LearnerShell>
    </Suspense>
  );
}
