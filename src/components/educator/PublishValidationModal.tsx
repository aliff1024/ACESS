'use client';

import { CheckCircle, XCircle, AlertCircle, BookOpen, FileText, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

interface PublishValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
  checks: ValidationCheck[];
}

export default function PublishValidationModal({ isOpen, onClose, onPublish, checks }: PublishValidationModalProps) {
  if (!isOpen) return null;

  const failedChecks = checks.filter(c => c.status === 'fail');
  const warningChecks = checks.filter(c => c.status === 'warning');
  const canPublish = failedChecks.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className={`p-8 rounded-t-xl ${canPublish ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${canPublish ? 'text-green-900' : 'text-red-900'}`}>
                {canPublish ? 'Ready to Publish!' : 'Cannot Publish Yet'}
              </h2>
              <p className={canPublish ? 'text-green-700' : 'text-red-700'}>
                {canPublish
                  ? 'Your course meets all requirements for publication'
                  : 'Please address the issues below before publishing'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
          </div>
        </div>

        <div className="p-8">
          <h3 className="font-semibold text-gray-900 mb-4">Publication Checklist</h3>
          <div className="space-y-3">
            {checks.map((check) => {
              const Icon = check.status === 'pass' ? CheckCircle : check.status === 'fail' ? XCircle : AlertCircle;
              const borderColor = check.status === 'pass' ? 'border-green-200 bg-green-50'
                : check.status === 'fail' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
              const textColor = check.status === 'pass' ? 'text-green-600'
                : check.status === 'fail' ? 'text-red-600' : 'text-amber-600';

              return (
                <div key={check.id} className={`flex items-start gap-4 p-4 rounded-lg border ${borderColor}`}>
                  <Icon className={`w-6 h-6 ${textColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${textColor} mb-1`}>{check.label}</p>
                    <p className="text-sm text-gray-700">{check.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> {checks.filter(c => c.status === 'pass').length} Passed</span>
                <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" /> {warningChecks.length} Warning(s)</span>
                <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600" /> {failedChecks.length} Failed</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
            <Button onClick={canPublish ? onPublish : undefined} disabled={!canPublish} className={`flex-1 ${canPublish ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {canPublish ? 'Publish Course' : 'Fix Issues First'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
