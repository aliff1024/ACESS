'use client';

import { Volume2, TrendingUp, BarChart3, Award, Settings } from 'lucide-react';
import { Card } from '../ui/card';

export function Features() {
  const features = [
    {
      icon: Volume2,
      title: 'Text-to-Speech Learning',
      description: 'Listen to course content with natural-sounding voice narration',
      color: 'blue',
    },
    {
      icon: TrendingUp,
      title: 'Adaptive Difficulty',
      description: 'Content adjusts to your pace and learning style automatically',
      color: 'purple',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Visualize your learning journey with detailed analytics',
      color: 'green',
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Earn recognized certificates upon course completion',
      color: 'yellow',
    },
    {
      icon: Settings,
      title: 'Accessibility Settings',
      description: 'Customize font size, contrast, spacing, and more',
      color: 'pink',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    pink: 'bg-pink-100 text-pink-600',
  };

  return (
    <section className="py-20 px-6 bg-white" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Accessibility-First Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Designed with cognitive accessibility in mind, our platform adapts to your unique learning needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200"
              >
                <div
                  className={`w-16 h-16 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center mb-6`}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
