'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Book, TrendingUp, Loader2, Sparkles, PlayCircle } from 'lucide-react';
import { fetchRecommendations, fetchAvailableCourses } from '@/lib/learner-api';
import type { Recommendation, AvailableCourse } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';
import { useAccessibility } from '@/providers/AccessibilityProvider';

interface AdaptiveRecommendationsProps {
  onStartLesson: (lessonId: string, courseId?: string) => void;
  onViewCourse?: (courseId: string) => void;
}

const tierConfig: Record<string, { labelKey: string; color: string; badgeColor: string; icon: typeof Book }> = {
  revision: {
    labelKey: 'recommendations.needsReview',
    color: 'from-orange-400 to-rose-500',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: RotateCcw,
  },
  standard: {
    labelKey: 'recommendations.upNext',
    color: 'from-blue-400 to-indigo-600',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Book,
  },
  advanced: {
    labelKey: 'recommendations.challenge',
    color: 'from-purple-400 to-fuchsia-600',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: TrendingUp,
  },
};

export function AdaptiveRecommendations({ onStartLesson, onViewCourse }: AdaptiveRecommendationsProps) {
  const { t } = useTranslation();
  const { settings, userAgeGroup } = useAccessibility();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [courseRecs, setCourseRecs] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchRecommendations(),
      fetchAvailableCourses()
    ])
      .then(([recs, courses]) => {
        setRecommendations(recs);
        if (recs.length === 0) {
          // If no lesson recommendations, filter available courses by age and preset
          const preset = settings.active_preset || 'none';
          
          let filtered = courses.filter(c => {
            const ageMatch = c.recommended_age_group === userAgeGroup || c.recommended_age_group === null;
            const presetMatch = preset === 'none' || c.primary_disability_focus === preset || (c.secondary_disability_focuses || []).includes(preset);
            return ageMatch && presetMatch;
          });

          // Fallback if no strict match: try just age, then just anything
          if (filtered.length === 0) {
            filtered = courses.filter(c => c.recommended_age_group === userAgeGroup || c.recommended_age_group === null);
          }
          if (filtered.length === 0) {
            filtered = courses;
          }

          setCourseRecs(filtered.slice(0, 3));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [settings.active_preset, userAgeGroup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (recommendations.length === 0 && courseRecs.length === 0) return null;

  if (recommendations.length === 0 && courseRecs.length > 0) {
    return (
      <div className="py-2">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" /> Recommended Courses
          </h2>
          <p className="text-gray-500 font-medium">
            Based on your profile, here are some courses you might like to start with.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courseRecs.map((course, index) => {
            return (
              <Card
                key={`course-rec-${course.id}-${index}`}
                className="relative overflow-hidden p-6 rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-xl hover:ring-purple-300 transition-all duration-300 group flex flex-col h-full"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-600" />
                
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-md transition-transform group-hover:scale-110 duration-300">
                    <Book className="w-6 h-6" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 border font-semibold shadow-sm px-3 py-1">
                    {course.category || 'New Course'}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
                  {course.title}
                </h3>

                <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6 flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('recommendations.whyThis')}</span>
                  {(() => {
                    const presetMap: Record<string, string> = {
                      adhd: 'ADHD',
                      autism: 'Autism',
                      dyslexia: 'Dyslexia',
                      visual: 'Visual Support',
                      hearing: 'Hearing Support',
                      cognitive: 'Cognitive Support'
                    };
                    const presetName = presetMap[settings.active_preset || ''] || settings.active_preset;
                    const isAgeMatch = course.recommended_age_group === userAgeGroup;
                    const isPresetMatch = settings.active_preset !== 'none' && (course.primary_disability_focus === settings.active_preset || (course.secondary_disability_focuses || []).includes(settings.active_preset || ''));
                    
                    if (isAgeMatch && isPresetMatch) {
                      return `Perfectly matched for your age (${userAgeGroup} years) and personalized for your ${presetName} learning preferences.`;
                    } else if (isAgeMatch) {
                      return `Carefully selected because it's tailored specifically for learners your age (${userAgeGroup} years).`;
                    } else if (isPresetMatch) {
                      return `Hand-picked because its design and pacing support your ${presetName} learning style.`;
                    }
                    return `Recommended as a great starting point based on overall popularity.`;
                  })()}
                </p>

                <Button
                  onClick={() => onViewCourse?.(course.id)}
                  className="w-full h-11 bg-gray-900 hover:bg-purple-600 text-white font-medium shadow-md hover:shadow-lg transition-all group-hover:-translate-y-0.5"
                >
                  <Book className="w-4 h-4 mr-2" /> View Course
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="mb-8">
<h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
  <Sparkles className="w-6 h-6 text-purple-500" /> {t('recommendations.title')}
</h2>
        <p className="text-gray-500 font-medium">
          {t('recommendations.description')}
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
                  {t(config.labelKey)}
                </Badge>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
                {rec.lesson_title}
              </h3>

              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6 flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('recommendations.whyThis')}</span>
                {rec.trigger_reason}
              </p>

              <Button
                onClick={() => onStartLesson(rec.lesson_id, rec.course_id)}
                className="w-full h-11 bg-gray-900 hover:bg-purple-600 text-white font-medium shadow-md hover:shadow-lg transition-all group-hover:-translate-y-0.5"
              >
                <PlayCircle className="w-4 h-4 mr-2" /> {t('recommendations.startLesson')}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
