'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { CheckCircle2, BookOpen, TrendingUp, Award, Loader2 } from 'lucide-react';
import { fetchLearnerStats } from '@/lib/learner-api';

export function ProgressOverview() {
  const [stats, setStats] = useState<{
    courses_completed: number;
    lessons_completed: number;
    avg_score: number;
    certificates_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearnerStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Courses Completed',
      value: stats?.courses_completed ?? 0,
      icon: CheckCircle2,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Lessons Completed',
      value: stats?.lessons_completed ?? 0,
      icon: BookOpen,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Average Score',
      value: `${stats?.avg_score ?? 0}%`,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Certificates Earned',
      value: stats?.certificates_count ?? 0,
      icon: Award,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Overview</h2>
        <p className="text-gray-600">Track your learning achievements and milestones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                  <p className="text-gray-600">{stat.label}</p>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
