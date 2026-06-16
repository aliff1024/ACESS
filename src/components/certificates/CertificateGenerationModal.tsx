'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Eye, Award, Loader2 } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { claimCertificate } from '@/lib/learner-api';
import { toast } from 'sonner';

interface CertificateGenerationModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  learnerName: string;
  onClose: () => void;
  onViewCertificate: (certificateId: string) => void;
  onDownload: () => void;
}

export function CertificateGenerationModal({
  isOpen,
  courseId,
  courseTitle,
  learnerName,
  onClose,
  onViewCertificate,
  onDownload,
}: CertificateGenerationModalProps) {
  const [generating, setGenerating] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [completionDate, setCompletionDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setGenerating(true);
    setError(null);
    claimCertificate(courseId)
      .then((result) => {
        if (result) {
          setCertificateId(result.id);
          setReferenceCode(result.referenceCode);
          setCompletionDate(new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }));
          toast.success('Certificate issued!');
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to generate certificate';
        console.error('Certificate generation error:', msg, err);
        setError(msg);
      })
      .finally(() => setGenerating(false));
  }, [isOpen, courseId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center mb-2 flex items-center justify-center gap-3">
            <Award className="w-8 h-8 text-green-600" />
            {generating ? 'Generating Certificate...' : error ? 'Certificate Generation Failed' : 'Your Certificate is Ready!'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-lg">
            {generating ? 'Please wait while we generate your certificate' : error || 'Congratulations on completing the course'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Generating your certificate...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={onClose} variant="outline" className="px-6">Close</Button>
            </div>
          ) : (
            <>
              <div className="bg-white p-8 rounded-2xl border-2 border-blue-200 mb-6">
                <div className="bg-white p-8 rounded-xl border-4 border-double border-blue-600 shadow-lg">
                  <div className="text-center">
                    <div className="mb-6">
                      <Logo size="lg" className="mx-auto mb-2" />
                      <p className="text-sm text-gray-600 uppercase tracking-wider">
                        Certificate of Completion
                      </p>
                    </div>

                    <div className="border-t-2 border-b-2 border-blue-300 py-6 my-6">
                      <p className="text-gray-700 mb-4 text-lg">This certifies that</p>
                      <p className="text-3xl font-bold text-gray-900 mb-4">{learnerName}</p>
                      <p className="text-gray-700 mb-2">has successfully completed</p>
                      <p className="text-2xl font-semibold text-blue-700">{courseTitle}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        <p className="font-semibold text-gray-900">Completion Date</p>
                        <p>{completionDate}</p>
                      </div>
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Certificate Code</p>
                        <p className="font-mono">{referenceCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={onDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => certificateId && onViewCertificate(certificateId)}
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  View Certificate
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="text-center pt-4 border-t">
          <Button variant="ghost" onClick={onClose} className="text-gray-600">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
