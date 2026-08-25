'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CertificateListPage } from '@/components/certificates/CertificateListPage';
import { CertificatePage } from '@/components/certificates/CertificatePage';
import { fetchCertificateDetail } from '@/lib/learner-api';
import type { FullCertificate } from '@/lib/learner-api';
import { generatePDFCertificate } from '@/lib/certificate-utils';

export default function CertificatesClientPage({ certificateId }: { certificateId?: string }) {
  const router = useRouter();
  const [certData, setCertData] = useState<FullCertificate | null>(null);
  const [loading, setLoading] = useState(!!certificateId);

  useEffect(() => {
    if (!certificateId) return;
    setLoading(true);
    fetchCertificateDetail(certificateId)
      .then(setCertData)
      .catch(() => toast.error('Failed to load certificate'))
      .finally(() => setLoading(false));
  }, [certificateId]);

  const handleDownloadCertificate = async () => {
    if (!certData) return;
    try {
      await generatePDFCertificate({
        learnerName: certData.learner_name,
        courseTitle: certData.course_title,
        educatorName: certData.educator_name || 'Course Educator',
        institutionName: certData.institution_name || 'ACESS Platform',
        completionDate: certData.completion_date,
        certificateCode: certData.reference_code,
        verificationUrl: certData.verification_url || '',
        skills: certData.skills_earned || [],
        courseDurationHours: certData.course_duration_hours || 0,
      }, 'download');
      toast.success('Certificate downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF certificate');
    }
  };

  const handleShareCertificate = () => {
    toast.success('Share link copied!', {
      description: 'Certificate link has been copied to your clipboard.',
      duration: 3000,
    });
  };

  if (certificateId && loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (certificateId && certData) {
    return (
      <CertificatePage
        courseTitle={certData.course_title}
        learnerName={certData.learner_name}
        completionDate={new Date(certData.completion_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
        certificateCode={certData.reference_code}
        onBack={() => router.push('/learner/certificates')}
        onDownload={handleDownloadCertificate}
        onShare={handleShareCertificate}
        educatorName={certData.educator_name}
        institutionName={certData.institution_name}
        skills={certData.skills_earned}
        courseDurationHours={certData.course_duration_hours}
        educatorRole={certData.metadata?.educator_role || 'Course Educator'}
      />
    );
  }

  if (certificateId && !certData && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Certificate not found</p>
      </div>
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
