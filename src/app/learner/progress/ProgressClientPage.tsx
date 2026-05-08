'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressPage } from '@/components/progress/ProgressPage';
import { CourseProgressDetailPage } from '@/components/progress/CourseProgressDetailPage';
import { CertificateGenerationModal } from '@/components/certificates/CertificateGenerationModal';

export default function ProgressClientPage({ selectedCourse }: { selectedCourse?: string }) {
  const router = useRouter();
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  if (selectedCourse) {
    return (
      <>
        <CourseProgressDetailPage
          courseId={selectedCourse}
          onBack={() => router.push('/learner/progress')}
          onGenerateCertificate={() => setShowCertificateModal(true)}
          onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}?courseId=${selectedCourse}`)}
        />

        <CertificateGenerationModal
          isOpen={showCertificateModal}
          courseTitle="Introduction to Web Accessibility"
          learnerName="Learner"
          completionDate="March 15, 2026"
          certificateCode="ACESS-2026-00123"
          onClose={() => setShowCertificateModal(false)}
          onViewCertificate={() => {
            setShowCertificateModal(false);
            router.push('/learner/certificates');
          }}
          onDownload={() => setShowCertificateModal(false)}
        />
      </>
    );
  }

  return (
    <ProgressPage
      onViewCourseProgress={(courseId) => router.push(`/learner/progress?courseId=${courseId}`)}
      onBrowseCourses={() => router.push('/learner/courses')}
    />
  );
}
