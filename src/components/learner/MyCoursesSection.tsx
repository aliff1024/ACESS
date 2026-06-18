'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Loader2, PlayCircle, Star, Sparkles } from 'lucide-react';
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

  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-rose-500',
    'from-cyan-400 to-blue-500'
  ];

  if (loading) {
    return (
      <div className="py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('myCourses.title')}</h2>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" /> {t('myCourses.title')}
          </h2>
          <p className="text-gray-500 font-medium">Jump right back into your active learning paths.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.length === 0 ? (
          <Card className="col-span-full p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('myCourses.empty')}</h3>
            <p className="text-gray-500">{t('myCourses.emptyDesc')}</p>
          </Card>
        ) : (
          courses.map((course, index) => {
            const isSys = course.system_course;
            const gradient = gradients[index % gradients.length];
            
            return (
              <Card
                key={course.id}
                className="border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:ring-blue-300 transition-all group flex flex-col h-full"
              >
                {/* Course Banner */}
                <div 
                  className={`h-32 bg-cover bg-center relative ${!course.thumbnail_url ? `bg-gradient-to-r ${gradient}` : ''}`}
                  style={course.thumbnail_url ? { backgroundImage: `url(${course.thumbnail_url})` } : {}}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {isSys && (
                      <Badge className="bg-white/90 text-indigo-700 backdrop-blur-md border-0 shadow-sm font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-indigo-700" /> Featured
                      </Badge>
                    )}
                    {isSys && course.guided_learning_enabled && (
                      <Badge className="bg-amber-100 text-amber-800 border-0 shadow-sm font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Guided
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" /> {course.completed_lessons}/{course.total_lessons} Done
                    </span>
                    {course.total_lessons > 0 && course.completed_lessons < course.total_lessons && (
                      <>
                        <div className="w-px h-3 bg-gray-300" />
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-orange-500" /> {course.total_lessons - course.completed_lessons} Left
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{course.progress}%</span>
                    </div>
                    <Progress
                      value={course.progress}
                      className="h-2.5 bg-gray-100 mb-5 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500"
                    />

                    <Button
                      onClick={() => onContinue(course.id)}
                      className="w-full h-11 bg-gray-900 hover:bg-blue-600 text-white font-medium shadow-md hover:shadow-lg transition-all group-hover:-translate-y-0.5"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {course.progress === 100 ? 'Review Course' : 'Continue Learning'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
