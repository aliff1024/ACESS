'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { Sun, Moon, Menu, X, LogOut, User } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '@/providers/AuthProvider';
import { getDashboardForRole } from '@/lib/auth-types';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';

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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      router.push('/' + href);
    }
    setMobileMenuOpen(false);
  };

  const navLinks = isLandingPage
    ? [
        { href: '/', label: 'Home' },
        { href: '#courses', label: 'Courses' },
        { href: '#about', label: 'About' },
        { href: '#accessibility', label: 'Accessibility' },
        { href: '/become-instructor', label: 'Become Instructor' },
        { href: '/contact', label: 'Contact' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/become-instructor', label: 'Become Instructor' },
        { href: '/contact', label: 'Contact' },
      ];

  const renderNavLink = (link: { href: string; label: string }, mobile = false) => {
    const classes = mobile
      ? 'block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';

    return (
      <Link key={link.href} href={link.href} onClick={() => mobile && setMobileMenuOpen(false)} className={classes}>
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo href="/" size="md" />
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => renderNavLink(link))}
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

            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  onClick={() => router.push(getDashboardForRole(user.role))}
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[120px] truncate">{user.fullName}</span>
                </Button>
                <LogoutButton asChild redirectTo="/">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </LogoutButton>
              </div>
            ) : (
              <>
                {!isLoginPage && (
                  <Button asChild variant="ghost" className="hidden md:inline-flex">
                    <Link href="/login">Login</Link>
                  </Button>
                )}
                {!isSignupPage && (
                  <Button asChild variant="outline" className="hidden md:inline-flex">
                    <Link href="/signup">Register</Link>
                  </Button>
                )}
              </>
            )}


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
            {navLinks.map((link) => renderNavLink(link, true))}
            <hr className="border-gray-200 dark:border-gray-700 my-2" />
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => { router.push(getDashboardForRole(user.role)); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Dashboard
                </button>
                <LogoutButton asChild redirectTo="/">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 rounded-lg text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Logout
                  </button>
                </LogoutButton>
              </>
            ) : (
              <>
                {!isLoginPage && (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Login
                  </Link>
                )}
                {!isSignupPage && (
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    Register
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
