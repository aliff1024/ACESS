'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, BookOpen, TrendingUp, Award, Loader2, Target, Zap } from 'lucide-react';
import { fetchLearnerStats } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';

export function ProgressOverview() {
  const { t } = useTranslation();
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
      label: t('progress.coursesCompleted'),
      value: stats?.courses_completed ?? 0,
      icon: CheckCircle2,
      color: 'from-green-400 to-emerald-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: t('stats.lessonsMastered'),
      value: stats?.lessons_completed ?? 0,
      icon: BookOpen,
      color: 'from-blue-400 to-indigo-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: t('progress.avgScore'),
      value: `${stats?.avg_score ?? 0}%`,
      icon: Target,
      color: 'from-purple-400 to-fuchsia-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: t('certificates.earned'),
      value: stats?.certificates_count ?? 0,
      icon: Award,
      color: 'from-orange-400 to-rose-500',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" /> {t('stats.title')}
          </h2>
          <p className="text-gray-500 font-medium">{t('stats.description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="relative overflow-hidden p-6 rounded-3xl border-0 shadow-sm ring-1 ring-gray-100 bg-white hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
            >
              {/* Subtle top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stat.color} opacity-80`} />
              
              <div className="flex items-start justify-between mb-5">
                <div className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                  <Icon className={`w-7 h-7 ${stat.iconColor}`} />
                </div>
              </div>
              
              {loading ? (
                <div className="h-16 flex items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : (
                <div className="relative z-10">
                  <p className="text-4xl font-extrabold text-gray-900 mb-1 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              )}
              
              {/* Decorative background blur */}
              <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
