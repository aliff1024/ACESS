'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, GraduationCap, School } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'learner',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Please enter a valid email');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError('Signup failed. Please try again.');
        return;
      }

      const dashboard = formData.role === 'educator' ? '/educator' : '/learner';
      if (data.session) {
        toast.success(`Account created! Welcome to your ${formData.role} dashboard.`);
        setTimeout(() => router.push(dashboard), 800);
      } else {
        toast.success('Account created! Check your email to confirm your account.', {
          duration: 5000,
        });
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

return (
  <AuthShell
    title="Create Account"
    subtitle="Register to access personalized learning, accessible content, and progress tracking."
  >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Signup Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              className="pl-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            I want to join as
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'learner' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                formData.role === 'learner'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.role === 'learner' ? 'bg-blue-600' : 'bg-gray-100'
              }`}>
                <GraduationCap className={`w-5 h-5 ${
                  formData.role === 'learner' ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${
                  formData.role === 'learner' ? 'text-blue-700' : 'text-gray-900'
                }`}>Learner</p>
                <p className="text-xs text-gray-500">Take courses & learn</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'educator' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                formData.role === 'educator'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.role === 'educator' ? 'bg-purple-600' : 'bg-gray-100'
              }`}>
                <School className={`w-5 h-5 ${
                  formData.role === 'educator' ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              <div className="text-left">
                <p className={`font-semibold text-sm ${
                  formData.role === 'educator' ? 'text-purple-700' : 'text-gray-900'
                }`}>Educator</p>
                <p className="text-xs text-gray-500">Create & manage courses</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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
          <p className="text-xs text-gray-500 mt-2">At least 8 characters</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="pl-10 pr-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-2 border-gray-300 mt-0.5"
            required
          />
          <span>
            I agree to the{' '}
            <Link href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
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
        <Link href="/learner">Start Learner Demo</Link>
      </Button>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
