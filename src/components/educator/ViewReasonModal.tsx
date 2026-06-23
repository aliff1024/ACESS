'use client';

import { X, Info } from 'lucide-react';
import type { EducatorCertificate } from '@/lib/educator-api';

interface ViewReasonModalProps {
  cert: EducatorCertificate;
  onClose: () => void;
}

export default function ViewReasonModal({ cert, onClose }: ViewReasonModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Revocation Details</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Learner</p>
            <p className="font-semibold text-gray-900">{cert.learner_name}</p>
            <p className="text-sm text-gray-600 mt-2">Course</p>
            <p className="font-medium text-gray-900">{cert.course_title}</p>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Revocation</label>
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-sm whitespace-pre-wrap">
              {cert.revoke_reason || 'No reason was provided.'}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
