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
import { useAuth } from '@/providers/AuthProvider';
import { getDashboardForRole } from '@/lib/auth-types';
import type { Role } from '@/lib/auth-types';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, enterPreview } = useAuth();
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
    }).catch(() => {
      setChecking(false);
    });
  }, [router]);

  const handleSelectRole = (selectedRole: 'learner' | 'educator' | 'admin') => {
    setIsDemoModalOpen(false);
    if (isAuthenticated) {
      enterPreview(selectedRole);
      router.push(getDashboardForRole(selectedRole));
    } else {
      router.push('/login');
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={{ scrollBehavior: 'smooth' }}>
      <Navbar onTryDemo={() => setIsDemoModalOpen(true)} />

      <main>
        <Hero />
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
