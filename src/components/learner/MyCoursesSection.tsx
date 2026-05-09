'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { BookOpen, Clock, Loader2 } from 'lucide-react';
import { fetchEnrolledCourses } from '@/lib/learner-api';
import type { EnrolledCourse } from '@/lib/learner-api';
import { useState, useEffect } from 'react';

interface MyCoursesSectionProps {
  onContinue: (courseId: string) => void;
}

export function MyCoursesSection({ onContinue }: MyCoursesSectionProps) {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Courses in Progress</h2>
          <p className="text-gray-600">Continue where you left off</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Courses in Progress</h2>
          <p className="text-gray-600">Continue where you left off</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-semibold text-gray-700 mb-1">No courses yet</p>
            <p className="text-gray-500">Enroll in a course to get started</p>
          </div>
        ) : (
          courses.map((course) => (
            <Card
              key={course.id}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="mb-4">
                <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-blue-600" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">
                  {course.title}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <span>{course.completed_lessons}/{course.total_lessons} lessons</span>
                  {course.total_lessons > 0 && (
                    <>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {course.total_lessons - course.completed_lessons} remaining
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                <Button
                  onClick={() => onContinue(course.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
