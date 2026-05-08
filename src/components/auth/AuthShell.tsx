'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Footer } from '@/components/figma/Footer';
import { Navbar } from '@/components/figma/Navbar';
import { Toaster } from '@/components/ui/sonner';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Toaster position="top-right" richColors />
      <Navbar onTryDemo={() => router.push('/learner')} />

      <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/80 bg-white/95 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl sm:p-10">
            <div className="mb-8 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-600">
                ACESS
              </p>
              <h1 className="text-4xl font-bold text-slate-950 sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                {subtitle}
              </p>
            </div>

            {children}
          </section>

          <aside className="hidden rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl shadow-slate-300/10 lg:block">
            <div className="space-y-8">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">
                  Welcome to ACESS
                </p>
                <h2 className="mt-4 text-3xl font-bold">Designed for accessible learning</h2>
              </div>

              <div className="space-y-6 text-sm leading-7 text-slate-300">
                <p>
                  Sign in or register to unlock adaptive learning paths, real-time progress tracking, and accessibility-first course content.
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                      ✓
                    </span>
                    <span>Accessible course material for diverse learners</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                      ✓
                    </span>
                    <span>Personalized recommendations and progress snapshots</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                      ✓
                    </span>
                    <span>Built-in accommodations for focus and comprehension</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
