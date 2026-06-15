'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';

interface NavbarProps {
  onTryDemo: () => void;
}

export function Navbar({ onTryDemo }: NavbarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '#courses', label: 'Courses' },
    { href: '#about', label: 'About' },
    { href: '#accessibility', label: 'Accessibility' },
    { href: '/become-instructor', label: 'Become Instructor' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo href="/" size="md" />
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                link.href.startsWith('#') ? (
                  <a key={link.href} href={link.href}
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href}
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
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
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {link.label}
                </Link>
              )
            ))}
            <hr className="border-gray-200 dark:border-gray-700 my-2" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Login
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
