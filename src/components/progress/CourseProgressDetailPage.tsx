'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, PlayCircle, Lock, Trophy, TrendingUp, Loader2, ArrowLeft, Star, Clock, BookOpen } from 'lucide-react';
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-gray-500 font-medium text-lg">Course not found</p>
      </div>
    );
  }

  const completedLessons = course.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = course.lessons.length;
  const isCompleted = course.status === 'completed';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
        Back to Progress
      </button>

      {/* Celebratory Banner */}
      {isCompleted && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white shadow-xl p-8 md:p-10 border border-yellow-300 flex flex-col md:flex-row items-center justify-between gap-8 transform hover:scale-[1.01] transition-transform">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 rounded-full bg-white opacity-20 blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-6 z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center flex-shrink-0 shadow-inner border border-white/30">
              <Trophy className="w-10 h-10 text-yellow-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold tracking-wider uppercase mb-2 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-current" /> Course Completed
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight mb-1 drop-shadow-sm">
                Incredible Work!
              </h3>
              <p className="text-yellow-50 text-lg font-medium opacity-90">
                You've mastered this course. Claim your reward now.
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => onGenerateCertificate(course.id)}
            className="z-10 bg-white text-yellow-600 hover:bg-yellow-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all px-8 py-7 text-lg font-bold rounded-2xl w-full md:w-auto whitespace-nowrap border-0"
          >
            Generate Certificate
          </Button>
        </div>
      )}

      {/* Course Header & Main Stats */}
      <Card className="overflow-hidden rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 md:p-10 text-white relative">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <TrendingUp className="w-64 h-64 -mt-10 -mr-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 relative z-10">{course.title}</h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed relative z-10">{course.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50/50">
          <div className="p-8 flex items-center gap-5 hover:bg-white transition-colors">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Completion</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-gray-900">{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-1.5 mt-2 bg-gray-200 [&>div]:bg-blue-600" />
            </div>
          </div>

          <div className="p-8 flex items-center gap-5 hover:bg-white transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Lessons</p>
              <p className="text-3xl font-extrabold text-gray-900">
                {completedLessons}<span className="text-gray-400 text-xl font-medium">/{totalLessons}</span>
              </p>
            </div>
          </div>

          <div className="p-8 flex items-center gap-5 hover:bg-white transition-colors">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-3xl font-extrabold text-gray-900">{course.avg_score}%</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Lesson Timeline */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-500" /> Journey Map
        </h2>
        
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-7 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
          {course.lessons.map((lesson, index) => {
            const isCompleted = lesson.status === 'completed';
            const isInProgress = lesson.status === 'inProgress';
            const isLocked = lesson.status === 'locked';

            return (
              <div key={lesson.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Timeline Node */}
                <div className={`flex items-center justify-center w-14 h-14 rounded-full border-4 border-white shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-transform duration-300 group-hover:scale-110 z-10 ${
                  isCompleted ? 'bg-green-500 text-white' : 
                  isInProgress ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : 
                   isInProgress ? <PlayCircle className="w-6 h-6 ml-0.5" /> : 
                   <Lock className="w-5 h-5" />}
                </div>

                {/* Card */}
                <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border-0 shadow-sm ring-1 transition-all duration-300 ${
                  isCompleted ? 'ring-green-100 bg-white hover:shadow-md hover:ring-green-300' :
                  isInProgress ? 'ring-blue-200 bg-blue-50/50 hover:shadow-md hover:ring-blue-400' :
                  'ring-gray-100 bg-gray-50 opacity-75'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lesson {index + 1}</span>
                        {isInProgress && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                      </div>
                      <h3 className={`text-lg font-bold ${isLocked ? 'text-gray-500' : 'text-gray-900'} mb-2`}>{lesson.title}</h3>
                      {lesson.score !== undefined && lesson.score > 0 && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100 inline-flex">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Score: {lesson.score}%
                        </div>
                      )}
                    </div>
                    
                    {!isLocked && (
                      <Button
                        onClick={() => onStartLesson(lesson.id)}
                        className={`shrink-0 h-10 px-5 rounded-xl font-medium shadow-sm transition-all ${
                          isCompleted 
                            ? 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md hover:-translate-y-0.5'
                        }`}
                        variant={isCompleted ? 'outline' : 'default'}
                      >
                        {isCompleted ? 'Review' : 'Continue'}
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
