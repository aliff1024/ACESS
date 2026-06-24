'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Role } from '@/lib/auth-types';
import { getDashboardForRole } from '@/lib/auth-types';
import { fetchFullProfile } from '@/lib/learner-api';

export default function LoginPage() {
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get('redirect'));
  }, []);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email');
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError('Login failed. Please try again.');
        return;
      }

      const role = (data.user.user_metadata?.role as Role) || 'learner';

      if (role === 'learner' && !redirectTo) {
        try {
          const profile = await fetchFullProfile();
          if (!profile.profile?.birth_date) {
            toast.success('Welcome! Please set up your preferences.');
            setTimeout(() => router.push('/learner/onboarding'), 500);
            return;
          }
        } catch {
          // ignore fetch errors
        }
      }

      const target = redirectTo || getDashboardForRole(role);
      toast.success(`Welcome back! Redirecting to ${role} dashboard...`);
      setTimeout(() => router.push(target), 800);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <AuthShell
    title="Welcome Back"
    subtitle="Sign in to continue your learning journey with adaptive, accessible coursework."
  >
      {sessionExpired && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Session Expired</p>
            <p className="text-sm text-amber-700">Your session timed out due to inactivity. Please log in again.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Login Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-700">
            <input type="checkbox" className="w-4 h-4 rounded border-2 border-gray-300" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-semibold">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  );
}
