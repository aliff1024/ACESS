'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Clock, Loader2, ImageIcon, Shield } from 'lucide-react';
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
              className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                isSys
                  ? 'border-purple-200 hover:border-purple-400 hover:shadow-lg bg-white'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              <div className="mb-4">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />
                ) : (
                  <div className={`w-full h-32 rounded-lg mb-4 flex items-center justify-center ${
                    isSys ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {isSys ? <Shield className="w-12 h-12 text-purple-600" /> : <BookOpen className="w-12 h-12 text-blue-600" />}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug flex items-center gap-2 flex-wrap">
                  {course.title}
                  {isSys && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Official Course
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
                    <span className={`text-sm font-semibold ${isSys ? 'text-purple-700' : 'text-gray-900'}`}>
                      {course.progress}%
                    </span>
                  </div>
                  <Progress
                    value={course.progress}
                    className={`h-2 ${isSys ? 'bg-purple-100' : ''}`}
                  />
                </div>

                <Button
                  onClick={() => onContinue(course.id)}
                  className={`w-full text-white ${
                    isSys
                      ? 'bg-purple-700 hover:bg-purple-800'
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
