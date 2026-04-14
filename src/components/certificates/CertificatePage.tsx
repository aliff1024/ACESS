'use client';

import { Button } from '../ui/button';
import { Award, Download, Share2, Calendar, Hash } from 'lucide-react';

interface CertificatePageProps {
  courseTitle: string;
  learnerName: string;
  completionDate: string;
  certificateCode: string;
  onBack: () => void;
  onDownload: () => void;
  onShare: () => void;
}

export function CertificatePage({
  courseTitle,
  learnerName,
  completionDate,
  certificateCode,
  onBack,
  onDownload,
  onShare,
}: CertificatePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2">
          ← Back to Dashboard
        </button>

        <div className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-double border-blue-600 mb-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Award className="w-14 h-14 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-blue-900 mb-3">ACESS</h1>
              <p className="text-lg text-gray-600 uppercase tracking-widest">
                Adaptive Cognitive & Educational Skill Support Platform
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mt-4"></div>
            </div>

            <div className="border-4 border-double border-blue-300 rounded-2xl py-12 my-8 bg-gradient-to-br from-blue-50 to-purple-50">
              <p className="text-2xl text-gray-700 mb-6">This certificate is proudly awarded to</p>
              <p className="text-5xl font-bold text-gray-900 mb-8">{learnerName}</p>
              <p className="text-xl text-gray-700 mb-4">for successfully completing</p>
              <p className="text-3xl font-bold text-blue-700 mb-6">{courseTitle}</p>
              <p className="text-lg text-gray-600">
                Demonstrating commitment to accessible and adaptive learning
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm text-gray-600">Completion Date</p>
                  <p className="text-lg font-bold text-gray-900">{completionDate}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Hash className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm text-gray-600">Certificate Code</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{certificateCode}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-24 h-1 bg-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm font-semibold text-gray-900">Platform Director</p>
                </div>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <div className="w-24 h-1 bg-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm font-semibold text-gray-900">Education Lead</p>
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
            Download Certificate
          </Button>
          <Button
            onClick={onShare}
            variant="outline"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button onClick={onBack} variant="outline" className="px-8 py-6 text-lg">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
