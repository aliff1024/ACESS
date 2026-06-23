'use client';

import { Card } from '../ui/card';
import { BookOpen, UserCheck, Settings, Wand2, BarChart3, ShieldCheck, PlayCircle, Trophy, LayoutDashboard } from 'lucide-react';

export function SystemCapabilities() {
  const capabilities = [
    {
      role: 'For Learners',
      description: 'A personalized, distraction-free environment that adapts to your unique cognitive needs.',
      icon: <UserCheck className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800',
      features: [
        { title: 'Focus Mode', desc: 'Read without distractions using adjustable fonts, colors, and layouts.', icon: <Settings className="w-4 h-4 text-blue-500" /> },
        { title: 'Cognitive Presets', desc: 'Tailored profiles to support Dyslexia, ADHD, and Visual Impairments.', icon: <UserCheck className="w-4 h-4 text-blue-500" /> },
        { title: 'Gamified Progress', desc: 'Earn badges and certificates as you conquer new milestones.', icon: <Trophy className="w-4 h-4 text-blue-500" /> }
      ]
    },
    {
      role: 'For Educators',
      description: 'Powerful tools to create engaging, accessible content without technical expertise.',
      icon: <BookOpen className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-100 dark:border-purple-800',
      features: [
        { title: 'Interactive Builder', desc: 'Embed flashcards, memory games, and quizzes directly into lessons.', icon: <PlayCircle className="w-4 h-4 text-purple-500" /> },
        { title: 'Analytics Dashboard', desc: 'Monitor where students struggle and adapt your teaching in real-time.', icon: <BarChart3 className="w-4 h-4 text-purple-500" /> },
        { title: 'Content Versioning', desc: 'Safe editing with auto-saves and rollback to previous versions.', icon: <ShieldCheck className="w-4 h-4 text-purple-500" /> }
      ]
    },
    {
      role: 'For Administrators',
      description: 'Comprehensive oversight to ensure platform quality and compliance.',
      icon: <LayoutDashboard className="w-6 h-6 text-green-600" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-100 dark:border-green-800',
      features: [
        { title: 'Impersonation Tool', desc: 'Log in as any user to reproduce and fix accessibility issues.', icon: <UserCheck className="w-4 h-4 text-green-500" /> },
        { title: 'System Audits', desc: 'Track platform usage, completion rates, and instructor applications.', icon: <BarChart3 className="w-4 h-4 text-green-500" /> },
        { title: 'Certificate Validation', desc: 'Cryptographically verify student certificates globally.', icon: <ShieldCheck className="w-4 h-4 text-green-500" /> }
      ]
    }
  ];

  return (
    <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900" id="capabilities">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            ACESS is built from the ground up to empower every user role with state-of-the-art tools and accessibility features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {capabilities.map((cap, idx) => (
            <Card key={idx} className={`p-8 rounded-2xl border ${cap.border} ${cap.bg} shadow-sm hover:shadow-md transition-shadow`}>
              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                {cap.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{cap.role}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">{cap.description}</p>
              
              <ul className="space-y-5">
                {cap.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{feature.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
