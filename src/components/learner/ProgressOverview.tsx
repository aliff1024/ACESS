'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, BookOpen, Target, Award, Loader2 } from 'lucide-react';
import { fetchLearnerStats } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';

/**
 * Learning stats, as a compact strip rather than four full-height cards.
 *
 * This used to be the tallest thing on the Dashboard — four `p-6` cards with
 * 56px icon tiles and 4xl numbers, well below the fold on a typical laptop
 * screen, competing for attention with Continue Learning and Recommendations
 * above it. The Dashboard's job is "what should I do next"; these numbers
 * are useful confirmation, not the main event, so they're now one thin row.
 * The full picture with real dates and detail lives on
 * /learner/achievements, which this doesn't try to duplicate.
 */
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
      value: stats?.courses_completed ?? '--',
      icon: CheckCircle2,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: t('stats.lessonsMastered'),
      value: stats?.lessons_completed ?? '--',
      icon: BookOpen,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: t('progress.avgScore'),
      value: stats?.avg_score != null ? `${stats.avg_score}%` : '--',
      icon: Target,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
    {
      label: t('certificates.earned'),
      value: stats?.certificates_count ?? '--',
      icon: Award,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
  ];

  return (
    <Card className="p-4 border-border bg-card">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`flex items-center gap-3 px-3 first:pl-1 sm:first:pl-3`}>
              <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${stat.textColor}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
                ) : (
                  <p className="text-xl font-bold text-foreground leading-tight tabular-nums">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
