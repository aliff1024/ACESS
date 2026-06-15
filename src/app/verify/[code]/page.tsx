'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Award, CheckCircle, XCircle, Shield, Calendar, Hash, Loader2 } from 'lucide-react';
import { verifyCertificateByCode } from '@/lib/learner-api';
import type { VerificationData } from '@/lib/learner-api';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';

export default function VerifyCertificatePage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyCertificateByCode(code)
      .then(setData)
      .catch(() => setData({ valid: false, revoked: false }))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border-2 border-red-200 p-10 text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Certificate Not Found</h1>
          <p className="text-gray-600 mb-6">
            No certificate matches the code <strong className="font-mono">{code}</strong>.
            Please check the code and try again.
          </p>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm text-red-800 font-medium">Invalid verification code</p>
            <p className="text-xs text-red-600 mt-1">Certificate codes are 12-character alphanumeric codes (e.g., ABCD-EFGH-IJKL)</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.revoked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border-2 border-red-300 p-10 text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <Badge className="bg-red-100 text-red-700 border-red-200 text-sm px-4 py-1 mb-4">Certificate Revoked</Badge>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Certificate Revoked</h1>
          <p className="text-gray-600 mb-4">
            This certificate issued to <strong>{data.learner_name}</strong> for{' '}
            <strong>{data.course_title}</strong> has been revoked and is no longer valid.
          </p>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-xs text-red-700 font-mono">Code: {code}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Logo size="xl" className="mx-auto mb-4" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
          {/* Verified banner */}
          <div className="bg-green-600 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-white">
              <CheckCircle className="w-6 h-6" />
              <span className="text-lg font-bold">Verified Certificate</span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-2xl font-bold text-gray-900 mb-1">{data.learner_name}</p>
              <p className="text-gray-600">has successfully completed</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{data.course_title}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.issue_date && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Issue Date</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {new Date(data.issue_date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
              {data.educator_name && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Educator</p>
                    <p className="font-semibold text-gray-900 text-sm">{data.educator_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Hash className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">Certificate Code</p>
                  <p className="font-semibold text-gray-900 text-sm font-mono">{data.reference_code}</p>
                </div>
              </div>
              {data.institution_name && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Award className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Institution</p>
                    <p className="font-semibold text-gray-900 text-sm">{data.institution_name}</p>
                  </div>
                </div>
              )}
            </div>

            {data.skills_earned && data.skills_earned.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Skills Demonstrated</p>
                <div className="flex flex-wrap gap-2">
                  {data.skills_earned.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              This verification was performed on {new Date().toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Powered by ACESS Platform &mdash; Adaptive Cognitive & Educational Skill Support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
