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

        {/* The modal reads the issued certificate back from the database. It
            used to be handed the literal strings "Course" and "Learner",
            which is what the learner then saw printed on their certificate. */}
        <CertificateGenerationModal
          isOpen={showCertificateModal}
          courseId={selectedCourse}
          onClose={() => setShowCertificateModal(false)}
          onViewCertificate={(certId) => {
            setShowCertificateModal(false);
            router.push(`/learner/certificates?id=${certId}`);
          }}
        />
      </>
    );
  }

  return (
    <ProgressPage
      onViewCourseProgress={(courseId) => router.push(`/learner/progress?courseId=${courseId}`)}
      onBrowseCourses={() => router.push('/learner/courses')}
      onStartLesson={(lessonId) => router.push(`/learner/lesson/${lessonId}`)}
    />
  );
}
