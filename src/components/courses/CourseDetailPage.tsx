'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Clock, Check, Lock, Play, Loader2 } from 'lucide-react';
import { fetchCourseDetail, enrollInCourse } from '@/lib/learner-api';
import type { CourseDetail } from '@/lib/learner-api';
import { toast } from 'sonner';

interface CourseDetailPageProps {
  courseId: string;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export function CourseDetailPage({ courseId, onBack, onStartLesson }: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourseDetail(courseId)
      .then(setCourse)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await enrollInCourse(courseId);
      toast.success('Enrolled successfully!');
      const updated = await fetchCourseDetail(courseId);
      setCourse(updated);
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const getLessonIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'current':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getLessonButtonText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Review';
      case 'current':
        return 'Continue';
      case 'locked':
        return 'Locked';
      default:
        return 'Start';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
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

  const diffKey = course.difficulty_level?.toLowerCase() || 'beginner';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          &larr; Back to Courses
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-12 h-12 text-blue-600" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${difficultyColors[diffKey] || difficultyColors.beginner} border`}>
                  {course.difficulty_level || 'Beginner'}
                </Badge>
                {course.category && (
                  <Badge variant="outline" className="text-gray-600">
                    {course.category}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-4">{course.description}</p>

              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{course.total_lessons} lessons</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {course.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>

          {course.enrollment_id ? (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-900">Your Progress</span>
                <span className="text-lg font-bold text-blue-600">{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-3 mb-2" />
              <p className="text-sm text-gray-600">
                {course.completed_lessons} of {course.total_lessons} lessons completed
              </p>
            </div>
          ) : (
            <Button
              onClick={handleEnroll}
              disabled={enrolling}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              {enrolling ? 'Enrolling...' : 'Enroll in Course'}
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Lessons</h2>

          <div className="space-y-3">
            {course.lessons.map((lesson, index) => (
              <Card
                key={lesson.id}
                className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                  lesson.status === 'current'
                    ? 'border-blue-400 bg-blue-50'
                    : lesson.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lesson.status === 'completed'
                        ? 'bg-green-100'
                        : lesson.status === 'current'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {getLessonIcon(lesson.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-500">
                        Lesson {lesson.sequence_order}
                      </span>
                      {lesson.status === 'current' && (
                        <Badge className="bg-blue-600 text-white text-xs">In Progress</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{lesson.title}</h3>
                  </div>

                  {course.enrollment_id && (
                    <Button
                      onClick={() => onStartLesson(lesson.id)}
                      disabled={lesson.status === 'locked'}
                      className={`${
                        lesson.status === 'current'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : lesson.status === 'completed'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } px-8`}
                    >
                      {getLessonButtonText(lesson.status)}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
