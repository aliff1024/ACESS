'use client';

import { Button } from '../ui/button';
import { BookOpen, Users, TrendingUp } from 'lucide-react';

interface HeroProps {
  onTryDemo: () => void;
}

export function Hero({ onTryDemo }: HeroProps) {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Accessible Learning for Everyone
          </h1>
          <p className="text-xl text-gray-700 mb-10 leading-relaxed">
            Supporting learners with dyslexia, ADHD, and cognitive challenges through
            adaptive technology, personalized learning paths, and accessible design.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6"
            >
              Explore Courses
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onTryDemo}
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-lg px-8 py-6"
            >
              Try Demo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">200+ Courses</h3>
              <p className="text-gray-600">Accessible learning content</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">10,000+ Learners</h3>
              <p className="text-gray-600">Active community members</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">95% Success Rate</h3>
              <p className="text-gray-600">Course completion average</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
