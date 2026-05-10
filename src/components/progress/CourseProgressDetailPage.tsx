'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { CheckCircle, PlayCircle, Lock, Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { fetchCourseProgress } from '@/lib/learner-api';
import type { CourseProgress } from '@/lib/learner-api';

interface CourseProgressDetailPageProps {
  courseId: string;
  onBack: () => void;
  onGenerateCertificate: (courseId: string) => void;
  onStartLesson: (lessonId: string) => void;
}

export function CourseProgressDetailPage({
  courseId,
  onBack,
  onGenerateCertificate,
  onStartLesson,
}: CourseProgressDetailPageProps) {
  const [course, setCourse] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseProgress(courseId)
      .then(setCourse)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  const completedLessons = course.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = course.lessons.length;
  const isCompleted = course.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2">
          &larr; Back to Progress
        </button>

        {isCompleted && (
          <div className="mb-6 p-6 bg-white border-2 border-green-300 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Congratulations! You have completed this course.
                </h3>
                <p className="text-gray-700">You&apos;re now ready to receive your certificate of completion.</p>
              </div>
              <Button
                onClick={() => onGenerateCertificate(course.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              >
                Generate Certificate
              </Button>
            </div>
          </div>
        )}

        <Card className="p-8 rounded-2xl border-2 border-gray-200 mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-lg text-gray-600">{course.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-gray-900">{course.progress}%</p>
                </div>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lessons Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedLessons}/{totalLessons}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{course.avg_score}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson Breakdown</h2>
            <div className="space-y-3">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-xl border-2 flex items-center gap-4 ${
                    lesson.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : lesson.status === 'inProgress'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        lesson.status === 'completed'
                          ? 'bg-green-600'
                          : lesson.status === 'inProgress'
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}
                    >
                      {lesson.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : lesson.status === 'inProgress' ? (
                        <PlayCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-white" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Lesson {lesson.sequence_order}: {lesson.title}
                        </h3>
                        {lesson.status === 'completed' && (
                          <Badge className="bg-green-600 text-white">Completed</Badge>
                        )}
                        {lesson.status === 'inProgress' && (
                          <Badge className="bg-blue-600 text-white">In Progress</Badge>
                        )}
                        {lesson.status === 'locked' && (
                          <Badge className="bg-gray-400 text-white">Locked</Badge>
                        )}
                      </div>
                      {lesson.score !== null && (
                        <p className="text-sm text-gray-600">Quiz Score: {lesson.score}%</p>
                      )}
                    </div>

                    {lesson.status !== 'locked' && (
                      <Button
                        onClick={() => onStartLesson(lesson.id)}
                        variant={lesson.status === 'completed' ? 'outline' : 'default'}
                        className={
                          lesson.status === 'completed'
                            ? 'border-green-600 text-green-600'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }
                      >
                        {lesson.status === 'completed' ? 'Review' : 'Start'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
