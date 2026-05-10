'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Award, Calendar, Hash, Eye, Download, Search, Loader2 } from 'lucide-react';
import { fetchCertificates } from '@/lib/learner-api';
import type { Certificate } from '@/lib/learner-api';

interface CertificateListPageProps {
  onViewCertificate: (certificateId: string) => void;
  onBrowseCourses: () => void;
  onDownload: (certificateId: string) => void;
}

export function CertificateListPage({
  onViewCertificate,
  onBrowseCourses,
  onDownload,
}: CertificateListPageProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates()
      .then(setCertificates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasCertificates = certificates.length > 0;

  if (!hasCertificates) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-12 rounded-2xl border-2 border-gray-200 text-center">
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-16 h-16 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No Certificates Yet</h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            You haven&apos;t earned any certificates yet. Complete courses to earn your first certificate and showcase
            your achievements!
          </p>
          <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
            <Search className="w-5 h-5 mr-2" />
            Browse Courses
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Certificates</h1>
          <p className="text-xl text-gray-600">View and download your earned certificates</p>
        </div>

        <div className="mb-6 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {certificates.length} Certificate{certificates.length !== 1 ? 's' : ''} Earned
              </h2>
              <p className="text-gray-700">Keep learning to earn more achievements!</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((certificate) => (
            <Card
              key={certificate.id}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{certificate.course_title}</h3>
                  <Badge className="bg-green-600 text-white">Completed</Badge>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Completed on</p>
                    <p className="font-semibold">{certificate.completion_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Certificate Code</p>
                    <p className="font-semibold font-mono text-sm">{certificate.certificate_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Award className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Final Score</p>
                    <p className="font-semibold">{certificate.score}%</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => onViewCertificate(certificate.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  View
                </Button>
                <Button
                  onClick={() => onDownload(certificate.id)}
                  variant="outline"
                  className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={onBrowseCourses} variant="outline" className="px-8 py-6 text-lg">
            Browse More Courses
          </Button>
        </div>
      </div>
    </div>
  );
}
