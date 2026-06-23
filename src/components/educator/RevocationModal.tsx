'use client';

import { X, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { EducatorCertificate } from '@/lib/educator-api';

interface RevocationModalProps {
  cert: EducatorCertificate;
  onClose: () => void;
  onRevoke: (certId: string, reason: string, scope: 'both' | 'system' | 'custom') => void;
  loading?: boolean;
}

const SUGGESTED_REASONS = [
  'Academic Dishonesty',
  'Identity Verification Failed',
  'Erroneous Issuance',
  'Content Violation'
];

export default function RevocationModal({ cert, onClose, onRevoke, loading = false }: RevocationModalProps) {
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<'both' | 'system' | 'custom'>('both');

  const handleSubmit = () => {
    if (reason.trim()) {
      onRevoke(cert.id, reason, scope);
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
            <h2 className="text-xl font-bold text-gray-900">Revoke Certificate</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Learner</p>
              <p className="font-medium text-sm text-gray-900 truncate">{cert.learner_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Course</p>
              <p className="font-medium text-sm text-gray-900 truncate">{cert.course_title}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Reason for Revocation *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Provide a reason for revoking this certificate..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Suggested reasons:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_REASONS.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setReason(suggestion)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2.5 rounded-full transition-colors border border-gray-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {cert.pdf_url && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">What to Revoke</label>
              <div className="grid grid-cols-1 gap-2">
                <label className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${scope === 'both' ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="both"
                    checked={scope === 'both'}
                    onChange={() => setScope('both')}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-none mb-1">Revoke Both Certificates</p>
                    <p className="text-xs text-gray-500 leading-none">Invalidates system cert & removes custom PDF.</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${scope === 'system' ? 'border-orange-200 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="system"
                    checked={scope === 'system'}
                    onChange={() => setScope('system')}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-none mb-1">Revoke System Cert Only</p>
                    <p className="text-xs text-gray-500 leading-none">Invalidates system cert but keeps the PDF active.</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${scope === 'custom' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="custom"
                    checked={scope === 'custom'}
                    onChange={() => setScope('custom')}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-none mb-1">Remove Custom PDF Only</p>
                    <p className="text-xs text-gray-500 leading-none">Deletes the PDF but keeps the system cert issued.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 flex items-start gap-2">
              <span className="text-red-600 text-lg leading-none">⚠️</span>
              {scope === 'both' 
                ? 'This action cannot be undone. Both certificates will be invalidated.'
                : scope === 'system'
                  ? 'The system certificate will be invalidated, but the custom PDF will remain.'
                  : 'The custom PDF will be permanently deleted from this certificate.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} disabled={loading} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!reason.trim() || loading} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {loading ? 'Revoking...' : (scope === 'both' ? 'Revoke Both' : scope === 'system' ? 'Revoke System' : 'Remove PDF')}
          </button>
        </div>
      </div>
    </div>
  );
}
