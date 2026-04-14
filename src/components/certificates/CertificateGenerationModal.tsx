'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Eye, Award } from 'lucide-react';

interface CertificateGenerationModalProps {
  isOpen: boolean;
  courseTitle: string;
  learnerName: string;
  completionDate: string;
  certificateCode: string;
  onClose: () => void;
  onViewCertificate: () => void;
  onDownload: () => void;
}

export function CertificateGenerationModal({
  isOpen,
  courseTitle,
  learnerName,
  completionDate,
  certificateCode,
  onClose,
  onViewCertificate,
  onDownload,
}: CertificateGenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center mb-2 flex items-center justify-center gap-3">
            <Award className="w-8 h-8 text-green-600" />
            Your Certificate is Ready!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-lg">
            Congratulations on completing the course
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl border-2 border-blue-200 mb-6">
            <div className="bg-white p-8 rounded-xl border-4 border-double border-blue-600 shadow-lg">
              <div className="text-center">
                <div className="mb-6">
                  <h3 className="text-3xl font-bold text-blue-900 mb-2">ACESS</h3>
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
                    <p className="font-mono">{certificateCode}</p>
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
              onClick={onViewCertificate}
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
            >
              <Eye className="w-5 h-5 mr-2" />
              View Certificate
            </Button>
          </div>
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
