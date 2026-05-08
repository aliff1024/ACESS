'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/figma/Navbar';
import { Hero } from '@/components/figma/Hero';
import { DemoRoleModal } from '@/components/figma/DemoRoleModal';
import { Features } from '@/components/figma/Features';
import { CoursesPreview } from '@/components/figma/CoursesPreview';
import { AccessibilityHighlight } from '@/components/figma/AccessibilityHighlight';
import { Footer } from '@/components/figma/Footer';

export default function LandingPage() {
  const router = useRouter();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleSelectRole = (role: 'learner' | 'educator' | 'admin') => {
    router.push(`/${role}`);
    setIsDemoModalOpen(false);
  };

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
