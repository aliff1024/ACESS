'use client';

import Link from 'next/link';
import { Button } from '../ui/button';

interface NavbarProps {
  onTryDemo: () => void;
}

export function Navbar({ onTryDemo }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
              ACESS
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">
                Home
              </a>
              <a href="#courses" className="text-gray-700 hover:text-blue-600 transition-colors">
                Courses
              </a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">
                About
              </a>
              <a href="#accessibility" className="text-gray-700 hover:text-blue-600 transition-colors">
                Accessibility
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
