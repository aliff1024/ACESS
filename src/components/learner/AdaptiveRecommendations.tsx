'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RotateCcw, Book, TrendingUp, Loader2 } from 'lucide-react';
import { fetchRecommendations } from '@/lib/learner-api';
import type { Recommendation } from '@/lib/learner-api';

interface AdaptiveRecommendationsProps {
  onStartLesson: (lessonId: string, courseId?: string) => void;
}

const tierConfig: Record<string, { label: string; color: string; badgeColor: string; icon: typeof Book }> = {
  revision: {
    label: 'Easy',
    color: 'orange',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
    icon: RotateCcw,
  },
  standard: {
    label: 'Medium',
    color: 'blue',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Book,
  },
  advanced: {
    label: 'Hard',
    color: 'purple',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: TrendingUp,
  },
};

const iconColorClasses: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function AdaptiveRecommendations({ onStartLesson }: AdaptiveRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations()
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recommended Next</h2>
        <p className="text-gray-600">
          Personalized lessons based on your learning progress and performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          const config = tierConfig[rec.difficulty_tier] || tierConfig.standard;
          const Icon = config.icon;
          return (
            <Card
              key={rec.lesson_id || index}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 ${iconColorClasses[config.color]} rounded-lg flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <Badge className={`${config.badgeColor} border`}>
                  {config.label}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {rec.lesson_title}
              </h3>

              <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                {rec.trigger_reason}
              </p>

              <Button
                onClick={() => onStartLesson(rec.lesson_id, rec.course_id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Lesson
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
