'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/figma/Navbar';
import { Hero } from '@/components/figma/Hero';
import { DemoRoleModal } from '@/components/figma/DemoRoleModal';
import { Features } from '@/components/figma/Features';
import { CoursesPreview } from '@/components/figma/CoursesPreview';
import { AccessibilityHighlight } from '@/components/figma/AccessibilityHighlight';
import { Footer } from '@/components/figma/Footer';
import { supabase } from '@/lib/supabase';
import { getDashboardForRole } from '@/lib/auth-types';
import type { Role } from '@/lib/auth-types';

export default function LandingPage() {
  const router = useRouter();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const role = (data.user.user_metadata?.role as Role) || 'learner';
        const dashboard = getDashboardForRole(role);
        router.replace(dashboard);
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleSelectRole = (_role: 'learner' | 'educator' | 'admin') => {
    router.push('/login');
    setIsDemoModalOpen(false);
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar onTryDemo={() => setIsDemoModalOpen(true)} />

      <main>
        <Hero onTryDemo={() => setIsDemoModalOpen(true)} />
        <Features />
        <CoursesPreview />
        <AccessibilityHighlight />
      </main>

      <Footer />

      <DemoRoleModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectRole={handleSelectRole}
      />
    </div>
  );
}
