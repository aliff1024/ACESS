'use client';

import { X, CheckCircle, Loader2 } from 'lucide-react';

interface ApprovalModalProps {
  course: { id: string; title: string; creator_name?: string };
  onClose: () => void;
  onApprove: (courseId: string) => void;
  loading?: boolean;
}

export default function ApprovalModal({ course, onClose, onApprove, loading = false }: ApprovalModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Approve Course</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">Are you sure you want to approve this course for publishing?</p>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">✓ Once approved, this course will be visible to all learners on the platform.</p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} disabled={loading} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onApprove(course.id)} disabled={loading} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {loading ? 'Approving...' : 'Approve Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
