'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

      const role = data.user.user_metadata?.role || 'learner';
      const dashboard = role === 'educator' ? '/educator' : '/learner';
      toast.success(`Welcome back! Redirecting to ${role} dashboard...`);
      setTimeout(() => router.push(dashboard), 800);
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
          <Link href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
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

      <div className="my-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-600">Or try demo</span>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-6 text-lg font-semibold rounded-xl"
      >
        <Link href="/learner">Continue as Learner Demo</Link>
      </Button>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
