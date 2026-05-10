'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, EyeOff, FileText, Loader2,
  ChevronDown, ChevronUp, Play
} from 'lucide-react';
import { fetchCourseById, fetchLessonsWithQuizzes, fetchLessonAssets } from '@/lib/educator-api';
import type { LessonWithQuiz, LessonAsset } from '@/lib/educator-api';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export default function EducatorCoursePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params.id;

  const [course, setCourse] = useState<{
    id: string;
    title: string;
    description: string;
    difficulty_level: string;
    category: string | null;
    thumbnail_url: string | null;
  } | null>(null);
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [assets, setAssets] = useState<Record<string, LessonAsset[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      fetchCourseById(courseId),
      fetchLessonsWithQuizzes(courseId),
    ])
      .then(([c, l]) => {
        setCourse(c);
        setLessons(l);
        l.forEach((lesson) => {
          fetchLessonAssets(lesson.id)
            .then((a) => setAssets((prev) => ({ ...prev, [lesson.id]: a })))
            .catch(() => {});
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl mb-4 text-gray-600">Course not found</p>
        <Button onClick={() => router.push('/educator/courses')}>Back to Courses</Button>
      </div>
    );
  }

  const diffKey = course.difficulty_level?.toLowerCase() || 'beginner';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-center gap-3 text-sm font-medium flex-wrap">
        <EyeOff className="w-4 h-4" />
        Preview Mode — Viewing course as a learner
        <Button
          onClick={() => router.push(`/educator/courses/${courseId}`)}
          size="sm"
          className="bg-white text-amber-700 hover:bg-amber-50 font-semibold"
        >
          Back to Course Editor
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => router.push(`/educator/courses/${courseId}`)}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> Back to Course Editor
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-12 h-12 text-blue-600" />
              </div>
            )}

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
              <p className="text-lg text-gray-600 leading-relaxed">{course.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span>{lessons.length} lessons</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Lessons</h2>

          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No lessons yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const lessonAssets = assets[lesson.id] || [];
                const isExpanded = expandedLesson === lesson.id;
                return (
                  <Card
                    key={lesson.id}
                    className="p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-500">
                            Lesson {lesson.sequence_order}
                          </span>
                          {lesson.has_quiz && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Quiz</Badge>
                          )}
                          {lessonAssets.length > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              {lessonAssets.length} file{lessonAssets.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                      </div>
                      {lessonAssets.length > 0 && (
                        <button
                          onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      )}
                      <Badge className={lesson.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {lesson.status}
                      </Badge>
                    </div>

                    {isExpanded && lessonAssets.length > 0 && (
                      <div className="mt-4 pl-16 space-y-2">
                        {lessonAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg"
                          >
                            <FileText className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <span className="text-sm text-orange-800 truncate flex-1">
                              {asset.title || 'Untitled PDF'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(asset.url, '_blank')}
                              className="text-xs h-7"
                            >
                              View PDF
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
