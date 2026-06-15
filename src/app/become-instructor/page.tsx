'use client';

import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/figma/Navbar';
import { Footer } from '@/components/figma/Footer';
import { Button } from '@/components/ui/button';
import {
  School, GraduationCap, Users, Globe, BookOpen, Award,
  BarChart3, Shield, ArrowRight, CheckCircle, Star, Sparkles
} from 'lucide-react';

const benefits = [
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Share your knowledge with learners from around the world on our accessible platform.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Users,
    title: 'Engage Students',
    description: 'Interactive tools, quizzes, and multimedia content to create engaging learning experiences.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'Comprehensive analytics to monitor student progress and improve your courses.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Award,
    title: 'Certificates',
    description: 'Issue verified certificates to students upon course completion.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Shield,
    title: 'Full Control',
    description: 'Customize lesson layouts, accessibility settings, and content delivery methods.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: Star,
    title: 'Build Reputation',
    description: 'Establish yourself as an expert educator with student reviews and ratings.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

const steps = [
  { number: '1', title: 'Submit Application', description: 'Fill out a simple form with your qualifications and teaching experience.' },
  { number: '2', title: 'Admin Review', description: 'Our team reviews your application to ensure quality education standards.' },
  { number: '3', title: 'Get Approved', description: 'Once approved, you gain immediate access to the educator dashboard.' },
  { number: '4', title: 'Start Teaching', description: 'Create courses, upload content, and start impacting learners worldwide.' },
];

const features = [
  { icon: BookOpen, text: 'Rich text editor with multimedia support' },
  { icon: BookOpen, text: 'Quiz builder with automated grading' },
  { icon: BookOpen, text: 'Video and PDF lesson support' },
  { icon: BookOpen, text: 'Student progress tracking dashboard' },
  { icon: BookOpen, text: 'Accessibility settings for diverse learners' },
  { icon: BookOpen, text: 'Certificate generation for course completion' },
];

export default function BecomeInstructorLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar onTryDemo={() => router.push('/login')} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Educator Program
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Share Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Knowledge</span>
                <br />
                with the World
              </h1>
              <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Become an educator on ACESS and create accessible, engaging learning experiences.
                Reach thousands of learners and make a real impact in education.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => router.push('/become-instructor/apply')}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-base"
                >
                  Apply to Become an Educator
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-base"
                >
                  Sign In
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Free to apply
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Quick approval
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-500" /> No commitment
                </span>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-96 h-96 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full opacity-10 blur-3xl absolute -top-12 -right-12" />
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                  <School className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Educator Dashboard</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
                    Your hub for creating and managing courses
                  </p>
                  <div className="space-y-3">
                    {features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Become an Educator?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to create impactful learning experiences
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                  <div className={`w-12 h-12 ${benefit.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${benefit.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get started in 4 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Powerful Tools for
                <span className="text-indigo-600"> Modern Education</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Our platform provides everything you need to create, manage, and deliver
                high-quality educational content to learners of all abilities.
              </p>
              <div className="space-y-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{f.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button
                  onClick={() => router.push('/become-instructor/apply')}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                >
                  Start Your Application
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl p-8 text-white">
                <GraduationCap className="w-12 h-12 mb-4 opacity-80" />
                <h3 className="text-2xl font-bold mb-3">Accessibility-First Platform</h3>
                <p className="text-indigo-100 mb-6">
                  Our platform is built for inclusivity. Reach more learners with built-in
                  accessibility features:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-200" />
                    <span>Text-to-speech support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-200" />
                    <span>Multiple language options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-200" />
                    <span>Dyslexia-friendly fonts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-200" />
                    <span>High contrast & simplified modes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join our community of educators and start creating accessible learning
            experiences today. Your knowledge can change lives.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => router.push('/become-instructor/apply')}
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-6 text-base"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => router.push('/contact')}
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base"
            >
              Contact Us
            </Button>
          </div>
          <p className="text-indigo-200 text-sm mt-6">
            Already applied? <a href="/become-instructor/apply" className="text-white underline hover:text-indigo-100">Check your application status</a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}