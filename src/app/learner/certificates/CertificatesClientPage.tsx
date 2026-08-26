'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CertificatePage } from '@/components/certificates/CertificatePage';
import {
  fetchCertificateDetail,
  certificateVerificationUrl,
  type FullCertificate,
} from '@/lib/learner-api';
import {
  buildCertificateRenderData,
  generatePDFCertificate,
  shareCertificate,
} from '@/lib/certificate-utils';

/**
 * A single certificate, opened by `?id=`.
 *
 * The certificate *list* now lives on /learner/achievements; this route keeps
 * the detail view so every link ever shared or bookmarked as
 * `/learner/certificates?id=…` still resolves. Without an id it redirects to
 * the Certificates tab of the merged page.
 */
export default function CertificatesClientPage({ certificateId }: { certificateId?: string }) {
  const router = useRouter();
  const [cert, setCert] = useState<FullCertificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certificateId) {
      router.replace('/learner/achievements?tab=certificates');
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCertificateDetail(certificateId)
      .then((data) => { if (!cancelled) setCert(data); })
      .catch((err) => {
        console.error('Failed to load certificate:', err);
        if (!cancelled) toast.error('Could not load that certificate');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [certificateId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-muted-foreground" role="status">Loading certificate…</p>
      </div>
    );
  }

  if (!cert) {
    // Covers both "does not exist" and "belongs to someone else": RLS returns
    // no row in either case, and the page must not distinguish them — telling
    // a visitor that an id exists but is not theirs is itself a disclosure.
    return (
      <div className="max-w-lg mx-auto px-6 py-16 readable-content">
        <Card className="p-8 text-center border-border bg-card">
          <h1 className="text-xl font-bold text-foreground mb-2">Certificate not found</h1>
          <p className="text-muted-foreground mb-6">
            This certificate does not exist, or it is not one of yours.
          </p>
          <Button onClick={() => router.push('/learner/achievements?tab=certificates')}>
            Go to my certificates
          </Button>
        </Card>
      </div>
    );
  }

  const verificationUrl = certificateVerificationUrl(cert);

  const handleDownload = async () => {
    // An educator's uploaded PDF is the certificate itself.
    if (cert.is_custom_upload && cert.pdf_url) {
      window.open(cert.pdf_url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const data = await buildCertificateRenderData({
        learner_name: cert.learner_name,
        course_title: cert.course_title,
        course_category: cert.course_category,
        educator_name: cert.educator_name,
        educator_role: cert.educator_role,
        institution_name: cert.institution_name,
        completion_date: cert.completion_date,
        certificate_code: cert.reference_code,
        verification_url: verificationUrl,
        skills_earned: cert.skills_earned,
        course_duration_hours: cert.course_duration_hours,
        lesson_count: cert.lesson_count,
      });
      await generatePDFCertificate(data, 'download');
      toast.success('Certificate downloaded');
    } catch (err) {
      console.error('Certificate PDF failed:', err);
      toast.error('Could not generate the PDF. Please try again.');
    }
  };

  // The previous handler showed "Share link copied!" without copying anything.
  // This reports what actually happened.
  const handleShare = async () => {
    const result = await shareCertificate({
      certificateCode: cert.reference_code,
      verificationUrl,
      courseTitle: cert.course_title,
    });
    if (result === 'copied') {
      toast.success('Link copied', { description: 'The verification link is on your clipboard.' });
    } else if (result === 'failed') {
      toast.error('Could not share', { description: `Verify at ${verificationUrl}` });
    }
  };

  return (
    <CertificatePage
      certificate={cert}
      verificationUrl={verificationUrl}
      onBack={() => router.push('/learner/achievements?tab=certificates')}
      onDownload={handleDownload}
      onShare={handleShare}
      onViewCourse={(courseId) => router.push(`/learner/courses/${courseId}`)}
    />
  );
}
