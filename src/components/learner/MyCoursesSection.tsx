'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Clock, Loader2, Shield, Crown, Star } from 'lucide-react';
import { fetchEnrolledCourses } from '@/lib/learner-api';
import type { EnrolledCourse } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';
import { useState, useEffect } from 'react';

interface MyCoursesSectionProps {
  onContinue: (courseId: string) => void;
}

export function MyCoursesSection({ onContinue }: MyCoursesSectionProps) {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledCourses()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('myCourses.title')}</h2>
          <p className="text-gray-600">{t('myCourses.description')}</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('myCourses.title')}</h2>
          <p className="text-gray-600">{t('myCourses.description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-semibold text-gray-700 mb-1">{t('myCourses.empty')}</p>
            <p className="text-gray-500">{t('myCourses.emptyDesc')}</p>
          </div>
        ) : (
            courses.map((course) => {
            const isSys = course.system_course;
            return (
            <Card
              key={course.id}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col relative overflow-hidden ${
                isSys
                  ? 'border-indigo-300 hover:border-indigo-400 hover:shadow-xl bg-gradient-to-br from-white to-indigo-50/40'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              {isSys && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              )}
              <div className="mb-4">
                {course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />
                ) : (
                  <div className={`w-full h-32 rounded-lg mb-4 flex items-center justify-center ${
                    isSys ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-blue-100'
                  }`}>
                    {isSys ? <Crown className="w-12 h-12 text-indigo-600" /> : <BookOpen className="w-12 h-12 text-blue-600" />}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug flex items-center gap-2 flex-wrap">
                  {course.title}
                  {isSys && (
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  {isSys && course.guided_learning_enabled && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      Guided
                    </Badge>
                  )}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <span>{course.completed_lessons}/{course.total_lessons} {t('myCourses.lessons')}</span>
                  {course.total_lessons > 0 && (
                    <>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {course.total_lessons - course.completed_lessons} {t('myCourses.remaining')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t('course.progress')}</span>
                    <span className={`text-sm font-semibold ${isSys ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {course.progress}%
                    </span>
                  </div>
                  <Progress
                    value={course.progress}
                    className={`h-2 ${isSys ? 'bg-indigo-100' : ''}`}
                  />
                </div>

                <Button
                  onClick={() => onContinue(course.id)}
                  className={`w-full text-white ${
                    isSys
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSys ? 'Continue Learning' : t('course.continue')}
                </Button>
              </div>
            </Card>
          )})
        )}
      </div>
    </div>
  );
}
