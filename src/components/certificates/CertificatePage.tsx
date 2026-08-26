'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Logo } from '../ui/Logo';
import {
  Award,
  Download,
  Share2,
  ArrowLeft,
  BookOpen,
  ShieldCheck,
  ShieldX,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/certificate-utils';
import type { FullCertificate } from '@/lib/learner-api';

interface CertificatePageProps {
  certificate: FullCertificate
  /** The URL this certificate's code resolves to on the current host. */
  verificationUrl: string
  onBack: () => void
  onDownload: () => Promise<void> | void
  onShare: () => Promise<void> | void
  onViewCourse?: (courseId: string) => void
}

/**
 * One certificate, presented as the record it is.
 *
 * WHAT CHANGED
 *
 * The previous version took five loose string props and rendered a decorative
 * card. Skills were passed in and never displayed. There was no verification
 * link, no way back to the course, no indication of whether the certificate
 * was still valid, and a revoked certificate looked exactly like a live one.
 * It also hard-coded its own colours — `bg-blue-50`, `text-gray-900` — which
 * vanish under the high-contrast theme.
 *
 * It now takes the whole record and shows every field it actually has,
 * omitting the ones it does not rather than inventing them.
 */
export function CertificatePage({
  certificate: cert,
  verificationUrl,
  onBack,
  onDownload,
  onShare,
  onViewCourse,
}: CertificatePageProps) {
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const revoked = cert.status === 'revoked';

  const run = async (kind: 'download' | 'share', fn: () => Promise<void> | void) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const facts: string[] = [];
  if (cert.course_category) facts.push(cert.course_category);
  if (cert.lesson_count > 0) {
    facts.push(`${cert.lesson_count} ${cert.lesson_count === 1 ? 'lesson' : 'lessons'}`);
  }
  if (cert.course_duration_hours > 0) {
    facts.push(
      `${cert.course_duration_hours} ${cert.course_duration_hours === 1 ? 'hour' : 'hours'} of learning`,
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 readable-content">
      <Button variant="ghost" onClick={onBack} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back to Achievements &amp; Certificates
      </Button>

      {revoked && (
        <div
          className="mb-6 rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-5 flex items-start gap-3"
          role="alert"
        >
          <ShieldX className="w-6 h-6 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-foreground">This certificate has been revoked</p>
            <p className="text-sm text-muted-foreground mt-1">
              {cert.revoke_reason
                ? cert.revoke_reason
                : 'It is no longer valid and will not verify.'}
              {cert.revoked_at && ` Revoked on ${formatDate(cert.revoked_at)}.`}
            </p>
          </div>
        </div>
      )}

      {/* ── The certificate ── */}
      <article
        aria-label={`Certificate of completion for ${cert.course_title}`}
        className={`bg-card text-card-foreground rounded-3xl border-4 border-double border-primary p-8 md:p-12 mb-8 ${
          revoked ? 'opacity-60' : ''
        }`}
      >
        <header className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 simplifiable"
            aria-hidden="true"
          >
            <Award className="w-8 h-8" />
          </div>
          <Logo size="lg" className="mx-auto" />
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mt-3">
            Certificate of Completion
          </p>
          <p className="text-base text-muted-foreground mt-1">{cert.institution_name}</p>
        </header>

        <div className="border-y-2 border-border py-10 text-center">
          <p className="text-lg text-muted-foreground mb-4">This is to certify that</p>
          <p className="text-4xl md:text-5xl font-bold text-foreground mb-8 break-words">
            {cert.learner_name}
          </p>
          <p className="text-lg text-muted-foreground mb-3">has successfully completed the course</p>
          <p className="text-2xl md:text-3xl font-bold text-primary mb-4 break-words">
            {cert.course_title}
          </p>
          {facts.length > 0 && (
            <p className="text-sm text-muted-foreground">{facts.join('  ·  ')}</p>
          )}
          {cert.skills_earned.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3 italic">
              Skills demonstrated: {cert.skills_earned.join(', ')}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 text-center sm:text-left">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completion date
            </dt>
            <dd className="text-base font-bold text-foreground mt-1">
              {formatDate(cert.completion_date) || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Certificate ID
            </dt>
            <dd className="text-base font-bold text-foreground font-mono mt-1 break-all">
              {cert.reference_code}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cert.educator_name ? cert.educator_role : 'Issued by'}
            </dt>
            <dd className="text-base font-bold text-foreground mt-1">
              {cert.educator_name || cert.institution_name}
            </dd>
          </div>
        </dl>
      </article>

      {/* ── Supporting information, deliberately outside the certificate ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
            {revoked ? (
              <ShieldX className="w-4 h-4 text-destructive" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
            )}
            Verification
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Anyone can check this certificate using its ID. The link below shows the course, your
            name and the completion date, without needing to sign in.
          </p>
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1.5 break-all"
          >
            {verificationUrl}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>
        </section>

        {cert.course_id && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
              The course
            </h2>
            {cert.course_description ? (
              <p
                className="text-sm text-muted-foreground mb-3 line-clamp-3"
                // Course descriptions are stored as sanitised HTML by the
                // editor; stripped to text here because this is a summary line.
              >
                {cert.course_description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">
                Revisit the lessons any time — completed courses stay open to you.
              </p>
            )}
            {onViewCourse && (
              <Button variant="outline" size="sm" onClick={() => onViewCourse(cert.course_id!)}>
                Go to course
              </Button>
            )}
          </section>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={busy !== null} onClick={() => run('download', onDownload)}>
          {busy === 'download' ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-5 h-5 mr-2" aria-hidden="true" />
          )}
          {busy === 'download' ? 'Preparing PDF…' : 'Download certificate'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy !== null}
          onClick={() => run('share', onShare)}
        >
          <Share2 className="w-5 h-5 mr-2" aria-hidden="true" />
          Share
        </Button>
      </div>
    </div>
  );
}
