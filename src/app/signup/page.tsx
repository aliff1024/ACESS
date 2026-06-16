'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, GraduationCap, School, ArrowRight, CheckCircle, MessageSquare } from 'lucide-react';
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
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
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError('Signup failed. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.session) {
        toast.success('Account created! Let us set up your preferences.', { duration: 4000 });
        setTimeout(() => router.push('/learner/onboarding'), 800);
      } else {
        toast.success('Account created! Check your email to confirm your account.', { duration: 5000 });
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Join ACESS to access personalized learning and accessible educational content."
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Registration Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <Input
              type="text" name="fullName" placeholder="Enter your full name"
              value={formData.fullName} onChange={handleChange}
              className="pl-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">I want to join as</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'learner' })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                formData.role === 'learner'
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                formData.role === 'learner' ? 'bg-blue-600' : 'bg-gray-100'
              }`}>
                <GraduationCap className={`w-6 h-6 ${formData.role === 'learner' ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className={`font-semibold ${formData.role === 'learner' ? 'text-blue-700' : 'text-gray-900'}`}>Learner</p>
                <p className="text-xs text-gray-500">Take courses & track progress</p>
              </div>
              {formData.role === 'learner' && <CheckCircle className="w-5 h-5 text-blue-600 ml-auto shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => router.push('/become-instructor/apply')}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 group-hover:bg-purple-100 transition-colors">
                <School className="w-6 h-6 text-gray-500 group-hover:text-purple-600 transition-colors" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Instructor</p>
                <p className="text-xs text-gray-500">Apply to teach & create courses</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 ml-auto shrink-0 transition-colors" />
            </button>
          </div>
        </div>

        {formData.role === 'learner' ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  type="email" name="email" placeholder="your@email.com"
                  value={formData.email} onChange={handleChange}
                  className="pl-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'} name="password" placeholder="Create a strong password"
                  value={formData.password} onChange={handleChange}
                  className="pl-10 pr-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Must be at least 8 characters for security</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Re-enter your password"
                  value={formData.confirmPassword} onChange={handleChange}
                  className="pl-10 pr-10 py-6 text-lg border-2 border-gray-300 focus:border-blue-600 rounded-xl"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-2 border-gray-300 mt-0.5 accent-blue-600" required />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-semibold">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-semibold">Privacy Policy</Link>
              </span>
            </label>

            <Button type="submit" disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl transition-all">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </>
        ) : (
          <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl text-center">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <School className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-purple-900 mb-2">Become an Instructor</h3>
            <p className="text-sm text-purple-700 mb-4">
              Ready to share your knowledge? Submit your instructor application and start creating accessible courses.
            </p>
            <Button onClick={() => router.push('/become-instructor/apply')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              <School className="w-4 h-4 mr-2" /> Apply to Become an Instructor
            </Button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'learner' })}
              className="block mx-auto mt-3 text-xs text-purple-600 hover:text-purple-700 underline underline-offset-2"
            >
              I want to learn, not teach
            </button>
          </div>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Have questions?{' '}
          <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold">Contact support</Link>
        </p>
      </div>
    </AuthShell>
  );
}
