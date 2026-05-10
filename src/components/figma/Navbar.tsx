'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Sun, Moon } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface NavbarProps {
  onTryDemo: () => void;
}

export function Navbar({ onTryDemo }: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('landing_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (mounted) {
      const stored = localStorage.getItem('landing_theme') as 'light' | 'dark' | null;
      if (stored === 'dark') setTheme('dark');
    }
  }, [mounted]);

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo href="/" size="md" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Home
              </a>
              <a href="#courses" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Courses
              </a>
              <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                About
              </a>
              <a href="#accessibility" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Accessibility
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {mounted ? (theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />) : <div className="w-5 h-5" />}
            </button>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" className="hidden md:inline-flex">
              <Link href="/signup">Register</Link>
            </Button>
            <Button onClick={onTryDemo} className="bg-blue-600 hover:bg-blue-700 text-white">
              Try Demo
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
