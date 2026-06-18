'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Book, TrendingUp, Loader2, Sparkles, PlayCircle } from 'lucide-react';
import { fetchRecommendations } from '@/lib/learner-api';
import type { Recommendation } from '@/lib/learner-api';

interface AdaptiveRecommendationsProps {
  onStartLesson: (lessonId: string, courseId?: string) => void;
}

const tierConfig: Record<string, { label: string; color: string; badgeColor: string; icon: typeof Book }> = {
  revision: {
    label: 'Needs Review',
    color: 'from-orange-400 to-rose-500',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: RotateCcw,
  },
  standard: {
    label: 'Up Next',
    color: 'from-blue-400 to-indigo-600',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Book,
  },
  advanced: {
    label: 'Challenge',
    color: 'from-purple-400 to-fuchsia-600',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: TrendingUp,
  },
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
    <div className="py-2">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" /> AI Recommendations
        </h2>
        <p className="text-gray-500 font-medium">
          Personalized paths based on your learning progress and quiz performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => {
          const config = tierConfig[rec.difficulty_tier] || tierConfig.standard;
          const Icon = config.icon;
          return (
            <Card
              key={`${rec.lesson_id || 'rec'}-${index}`}
              className="relative overflow-hidden p-6 rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-xl hover:ring-purple-300 transition-all duration-300 group flex flex-col h-full"
            >
              {/* Subtle top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${config.color}`} />
              
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${config.color} text-white shadow-md transition-transform group-hover:scale-110 duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <Badge className={`${config.badgeColor} border font-semibold shadow-sm px-3 py-1`}>
                  {config.label}
                </Badge>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
                {rec.lesson_title}
              </h3>

              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6 flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Why this?</span>
                {rec.trigger_reason}
              </p>

              <Button
                onClick={() => onStartLesson(rec.lesson_id, rec.course_id)}
                className="w-full h-11 bg-gray-900 hover:bg-purple-600 text-white font-medium shadow-md hover:shadow-lg transition-all group-hover:-translate-y-0.5"
              >
                <PlayCircle className="w-4 h-4 mr-2" /> Start Lesson
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
