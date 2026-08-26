'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Calendar,
  Hash,
  Eye,
  Download,
  Search,
  ExternalLink,
  Loader2,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Certificate } from '@/lib/learner-api';
import { certificateVerificationUrl } from '@/lib/learner-api';
import { buildCertificateRenderData, generatePDFCertificate, formatDate } from '@/lib/certificate-utils';

interface CertificatesPanelProps {
  certificates: Certificate[];
  onViewCertificate: (id: string) => void;
  onBrowseCourses: () => void;
  /** Compact form for the Overview tab: latest few, no section split. */
  limit?: number;
}

export function CertificatesPanel({
  certificates,
  onViewCertificate,
  onBrowseCourses,
  limit,
}: CertificatesPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [certFilter, setCertFilter] = useState<'all' | 'system' | 'educator'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Certificate ID ${code} copied to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownload = async (cert: Certificate) => {
    if (cert.is_custom_upload && cert.pdf_url) {
      window.open(cert.pdf_url, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloading(cert.id);
    try {
      const data = await buildCertificateRenderData({
        learner_name: cert.learner_name,
        course_title: cert.course_title,
        course_category: cert.course_category,
        educator_name: cert.educator_name,
        institution_name: cert.institution_name,
        completion_date: cert.completion_date,
        certificate_code: cert.certificate_code,
        verification_url: certificateVerificationUrl(cert),
        skills_earned: cert.skills_earned,
        course_duration_hours: cert.course_duration_hours,
      });
      await generatePDFCertificate(data, 'download');
      toast.success('Certificate downloaded');
    } catch (err) {
      console.error('Certificate download failed:', err);
      toast.error('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (certificates.length === 0) {
    return (
      <Card className="max-w-xl mx-auto p-10 text-center border-dashed border-border bg-card">
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-sm simplifiable"
          aria-hidden="true"
        >
          <Award className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No certificates yet</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Complete a course to earn your first certificate. Certificates are the formal record of a
          course you have finished — you can view, download and share them from here.
        </p>
        <Button onClick={onBrowseCourses}>
          <Search className="w-4 h-4 mr-2" aria-hidden="true" />
          Browse courses
        </Button>
      </Card>
    );
  }

  if (limit) {
    const shown = certificates.slice(0, limit);
    return (
      <CertificateGrid
        certs={shown}
        onViewCertificate={onViewCertificate}
        downloading={downloading}
        onDownload={handleDownload}
        copiedCode={copiedCode}
        onCopyCode={handleCopyCode}
      />
    );
  }

  // System vs Educator classification
  const isCustomCert = (c: Certificate) =>
    c.is_custom_upload ||
    (c as any).metadata?.is_custom === true ||
    (c as any).template_id === 'custom';

  const system = certificates.filter((c) => !isCustomCert(c));
  const educator = certificates.filter((c) => isCustomCert(c));

  const filteredCerts =
    certFilter === 'system'
      ? system
      : certFilter === 'educator'
      ? educator
      : certificates;

  return (
    <div className="space-y-6">
      {/* Segment Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl w-fit text-xs border border-border">
          <button
            onClick={() => setCertFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              certFilter === 'all'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            All Certificates ({certificates.length})
          </button>

          <button
            onClick={() => setCertFilter('system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              certFilter === 'system'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            System Certificates ({system.length})
          </button>

          <button
            onClick={() => setCertFilter('educator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              certFilter === 'educator'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-green-600" />
            Educator Certificates ({educator.length})
          </button>
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          Showing {filteredCerts.length} of {certificates.length} certificate{certificates.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Render Filtered Sections */}
      {certFilter === 'all' ? (
        <div className="space-y-8">
          {system.length > 0 && (
            <CertificateSection
              title="System Certificates"
              subtitle="Official ACESS records for platform and standard certified courses."
              icon={<ShieldCheck className="w-5 h-5 text-white" aria-hidden="true" />}
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
              badgeClass="bg-blue-50 text-blue-700 border-blue-200"
              count={system.length}
              emptyLabel="No system certificates yet."
            >
              <CertificateGrid
                certs={system}
                onViewCertificate={onViewCertificate}
                downloading={downloading}
                onDownload={handleDownload}
                copiedCode={copiedCode}
                onCopyCode={handleCopyCode}
              />
            </CertificateSection>
          )}

          {educator.length > 0 && (
            <CertificateSection
              title="Educator Certificates"
              subtitle="Unique specialized credentials issued directly by your course educator."
              icon={<GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />}
              iconBg="bg-gradient-to-br from-green-500 to-emerald-600"
              badgeClass="bg-green-50 text-green-700 border-green-200"
              count={educator.length}
              emptyLabel="No educator certificates yet."
            >
              <CertificateGrid
                certs={educator}
                onViewCertificate={onViewCertificate}
                downloading={downloading}
                onDownload={handleDownload}
                copiedCode={copiedCode}
                onCopyCode={handleCopyCode}
              />
            </CertificateSection>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <CertificateGrid
            certs={filteredCerts}
            onViewCertificate={onViewCertificate}
            downloading={downloading}
            onDownload={handleDownload}
            copiedCode={copiedCode}
            onCopyCode={handleCopyCode}
          />
        </div>
      )}
    </div>
  );
}

function CertificateSection({
  title,
  subtitle,
  icon,
  iconBg,
  badgeClass,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeClass: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`cert-section-${title}`} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBg}`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 id={`cert-section-${title}`} className="text-base font-bold text-foreground">
              {title}
            </h2>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
              {count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      {count === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-11">{emptyLabel}</p>
      ) : (
        children
      )}
    </section>
  );
}

function CertificateGrid({
  certs,
  onViewCertificate,
  downloading,
  onDownload,
  copiedCode,
  onCopyCode,
}: {
  certs: Certificate[];
  onViewCertificate: (id: string) => void;
  downloading: string | null;
  onDownload: (cert: Certificate) => void;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
}) {
  const isCustomCert = (c: Certificate) =>
    c.is_custom_upload ||
    (c as any).metadata?.is_custom === true ||
    (c as any).template_id === 'custom';

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 list-none p-0 m-0">
      {certs.map((cert) => {
        const isCustom = isCustomCert(cert);

        return (
          <li key={cert.id} className="h-full">
            <Card className="h-full p-5 flex flex-col border-border bg-card hover:shadow-md transition-shadow rounded-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs bg-gradient-to-br ${
                    isCustom ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-indigo-600'
                  }`}
                  aria-hidden="true"
                >
                  {isCustom ? (
                    <GraduationCap className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Badge
                    className={`border text-[10px] uppercase font-semibold mb-1 ${
                      isCustom
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {isCustom ? 'Educator Certificate' : 'System Certificate'}
                  </Badge>
                  <h3 className="font-bold text-foreground text-sm leading-tight truncate">
                    {cert.course_title}
                  </h3>
                  {cert.educator_name && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      Instructor: {cert.educator_name}
                    </p>
                  )}
                </div>
              </div>

              <dl className="space-y-1.5 mb-4 flex-1 text-xs text-muted-foreground border-t border-border/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    Completed:
                  </span>
                  <strong className="text-foreground font-medium">
                    {formatDate(cert.completion_date) || 'Date unavailable'}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" aria-hidden="true" />
                    Ref Code:
                  </span>
                  <button
                    onClick={() => onCopyCode(cert.certificate_code)}
                    className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                    title="Click to copy ID"
                  >
                    {cert.certificate_code}
                    {copiedCode === cert.certificate_code ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                    )}
                  </button>
                </div>

                {cert.course_duration_hours ? (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      Duration:
                    </span>
                    <span className="text-foreground">{cert.course_duration_hours} hours</span>
                  </div>
                ) : null}
              </dl>

              <div className="flex gap-2 mt-auto pt-2">
                {cert.is_custom_upload && cert.pdf_url ? (
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                    onClick={() => window.open(cert.pdf_url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Open Custom Certificate
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
                      onClick={() => onViewCertificate(cert.id)}
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8 gap-1"
                      disabled={downloading === cert.id}
                      onClick={() => onDownload(cert)}
                    >
                      {downloading === cert.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {downloading === cert.id ? 'Preparing…' : 'Download'}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
