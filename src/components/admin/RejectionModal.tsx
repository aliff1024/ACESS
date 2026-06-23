'use client';

import { X, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface RejectionModalProps {
  course: { id: string; title: string; creator_name?: string };
  onClose: () => void;
  onReject: (courseId: string, reason: string) => void;
  loading?: boolean;
}

export default function RejectionModal({ course, onClose, onReject, loading = false }: RejectionModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onReject(course.id, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reject Course</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Course</p>
            <p className="font-semibold text-gray-900">{course.title}</p>
            {course.creator_name && (
              <>
                <p className="text-sm text-gray-600 mt-2">Created by</p>
                <p className="font-medium text-gray-900">{course.creator_name}</p>
              </>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Reason for Rejection *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Please provide detailed feedback on why this course is being rejected..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">This feedback will be sent to the educator</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">⚠️ The educator will be notified and can resubmit after making changes.</p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} disabled={loading} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!reason.trim() || loading} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {loading ? 'Rejecting...' : 'Reject Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
