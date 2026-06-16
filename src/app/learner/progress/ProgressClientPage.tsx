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
          courseId={selectedCourse}
          courseTitle="Course"
          learnerName="Learner"
          onClose={() => setShowCertificateModal(false)}
          onViewCertificate={(certId) => {
            setShowCertificateModal(false);
            router.push(`/learner/certificates?id=${certId}`);
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
