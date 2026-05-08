'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CertificateListPage } from '@/components/certificates/CertificateListPage';
import { CertificatePage } from '@/components/certificates/CertificatePage';

export default function CertificatesClientPage({ certificateId }: { certificateId?: string }) {
  const router = useRouter();

  const handleDownloadCertificate = () => {
    toast.success('Certificate downloaded successfully!', {
      description: 'Your certificate has been saved to your downloads folder.',
      duration: 3000,
    });
  };

  const handleShareCertificate = () => {
    toast.success('Share link copied!', {
      description: 'Certificate link has been copied to your clipboard.',
      duration: 3000,
    });
  };

  if (certificateId) {
    return (
      <CertificatePage
        courseTitle="Introduction to Web Accessibility"
        learnerName="Learner"
        completionDate="March 15, 2026"
        certificateCode="ACESS-2026-00123"
        onBack={() => router.push('/learner/certificates')}
        onDownload={handleDownloadCertificate}
        onShare={handleShareCertificate}
      />
    );
  }

  return (
    <CertificateListPage
      onViewCertificate={(id) => router.push(`/learner/certificates?id=${id}`)}
      onBrowseCourses={() => router.push('/learner/courses')}
      onDownload={handleDownloadCertificate}
    />
  );
}
