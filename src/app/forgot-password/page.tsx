'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/AuthShell';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
    >
      {sent ? (
        <div className="space-y-6">
          <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 mb-1">Check your email</p>
              <p className="text-sm text-green-700">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">
              Didn&apos;t receive the email? Check your spam folder or{' '}
            <button onClick={() => setSent(false)} className="text-blue-600 hover:text-blue-700 font-semibold">
              try again
            </button>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
