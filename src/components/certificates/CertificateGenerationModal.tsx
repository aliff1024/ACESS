'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Eye, Award, Loader2 } from 'lucide-react';
import { Logo } from '../ui/Logo';
import {
  claimCertificate,
  fetchCertificateDetail,
  certificateVerificationUrl,
  type FullCertificate,
} from '@/lib/learner-api';
import { buildCertificateRenderData, generatePDFCertificate, formatDate } from '@/lib/certificate-utils';
import { toast } from 'sonner';

interface CertificateGenerationModalProps {
  isOpen: boolean;
  courseId: string;
  onClose: () => void;
  onViewCertificate: (certificateId: string) => void;
}

/**
 * Claims a certificate and shows the learner what they just earned.
 *
 * WHAT WAS WRONG
 *
 * This took `courseTitle` and `learnerName` as props, and its only live caller
 * passed the literal strings `"Course"` and `"Learner"`. So the moment of
 * earning a certificate — the one screen that should feel like something —
 * read "This certifies that **Learner** has successfully completed **Course**".
 * Its Download button was wired to a handler that raised a success toast
 * without producing a file.
 *
 * It now reads the certificate back from the database after claiming it, so
 * every value on screen is the value that was actually recorded, and the
 * download produces the same PDF as the detail page.
 */
export function CertificateGenerationModal({
  isOpen,
  courseId,
  onClose,
  onViewCertificate,
}: CertificateGenerationModalProps) {
  const [generating, setGenerating] = useState(false);
  const [cert, setCert] = useState<FullCertificate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setGenerating(true);
    setError(null);
    setCert(null);

    claimCertificate(courseId)
      .then(async (result) => {
        if (!result || cancelled) return;
        // Read back rather than assume: the endpoint is what decides the
        // reference code, the completion date and the snapshot fields.
        const detail = await fetchCertificateDetail(result.id);
        if (!cancelled) setCert(detail);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Could not issue your certificate';
        console.error('Certificate generation error:', msg, err);
        if (!cancelled) setError(msg);
      })
      .finally(() => { if (!cancelled) setGenerating(false); });

    return () => { cancelled = true; };
  }, [isOpen, courseId]);

  const handleDownload = async () => {
    if (!cert) return;
    setDownloading(true);
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
        verification_url: certificateVerificationUrl(cert),
        skills_earned: cert.skills_earned,
        course_duration_hours: cert.course_duration_hours,
        lesson_count: cert.lesson_count,
      });
      await generatePDFCertificate(data, 'download');
      toast.success('Certificate downloaded');
    } catch (err) {
      console.error('Certificate PDF failed:', err);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center flex items-center justify-center gap-3">
            <Award className="w-7 h-7 text-primary shrink-0 simplifiable" aria-hidden="true" />
            {generating
              ? 'Issuing your certificate…'
              : error
                ? 'Certificate not issued'
                : 'Your certificate is ready'}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {generating
              ? 'Checking your completion and recording the certificate.'
              : error || 'Congratulations on completing the course.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" aria-hidden="true" />
              <p className="text-muted-foreground" role="status">One moment…</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <Button onClick={onClose} variant="outline">Close</Button>
            </div>
          ) : cert ? (
            <>
              <div className="bg-card rounded-2xl border-4 border-double border-primary p-8 mb-6">
                <div className="text-center">
                  <Logo size="md" className="mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
                    Certificate of Completion
                  </p>

                  <div className="border-y-2 border-border py-6">
                    <p className="text-muted-foreground mb-3">This is to certify that</p>
                    <p className="text-2xl font-bold text-foreground mb-4 break-words">
                      {cert.learner_name}
                    </p>
                    <p className="text-muted-foreground mb-2">has successfully completed</p>
                    <p className="text-xl font-semibold text-primary break-words">
                      {cert.course_title}
                    </p>
                  </div>

                  <dl className="flex justify-between items-start gap-4 mt-6 text-sm text-left">
                    <div>
                      <dt className="font-semibold text-foreground">Completion date</dt>
                      <dd className="text-muted-foreground">{formatDate(cert.completion_date)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="font-semibold text-foreground">Certificate ID</dt>
                      <dd className="text-muted-foreground font-mono break-all">
                        {cert.reference_code}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  {downloading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
                <Button variant="outline" onClick={() => onViewCertificate(cert.id)}>
                  <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                  View certificate
                </Button>
              </div>
            </>
          ) : null}
        </div>

        <div className="text-center pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
