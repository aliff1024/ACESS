'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/figma/Navbar';
import { Hero } from '@/components/figma/Hero';
import { Features } from '@/components/figma/Features';
import { CoursesPreview } from '@/components/figma/CoursesPreview';
import { SystemCapabilities } from '@/components/figma/SystemCapabilities';
import { Footer } from '@/components/figma/Footer';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setChecking(false);
    }).catch(() => {
      setChecking(false);
    });
  }, []);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={{ scrollBehavior: 'smooth' }}>
      <Navbar />

      <main>
        <Hero />
        <Features />
        <CoursesPreview />
        <SystemCapabilities />
      </main>

      <Footer />
    </div>
  );
}
