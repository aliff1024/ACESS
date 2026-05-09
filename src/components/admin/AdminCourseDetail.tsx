'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Clock, User, Tag, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  difficulty_level: string | null;
  category: string | null;
  created_at: string;
  published_at: string | null;
  thumbnail_url: string | null;
  creator_name: string;
  creator_email: string;
  tags: string[];
  lessons: { id: string; title: string; sequence_order: number; status: string }[];
  quizCount: number;
}

interface AdminCourseDetailProps {
  courseId: string;
  onBack: () => void;
}

export default function AdminCourseDetail({ courseId, onBack }: AdminCourseDetailProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: courseData, error: cError } = await supabase
          .from('courses')
          .select('id, title, description, status, difficulty_level, category, created_at, published_at, thumbnail_url, created_by, course_tags(tag), lessons(id, title, sequence_order, status)')
          .eq('id', courseId)
          .single();

        if (cError) throw cError;

        const { data: usersData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', courseData.created_by)
          .single();

        const { count: quizCount } = await supabase
          .from('quizzes')
          .select('id', { count: 'exact', head: true })
          .in('lesson_id', (courseData.lessons || []).map((l: { id: string }) => l.id));

        setCourse({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description || '',
          status: courseData.status,
          difficulty_level: courseData.difficulty_level,
          category: courseData.category,
          created_at: courseData.created_at,
          published_at: courseData.published_at,
          thumbnail_url: courseData.thumbnail_url,
          creator_name: usersData?.full_name || 'Unknown',
          creator_email: usersData?.email || '',
          tags: (courseData.course_tags || []).map((t: { tag: string }) => t.tag),
          lessons: (courseData.lessons || []).sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order),
          quizCount: quizCount ?? 0,
        });
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
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
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'pending_review': return 'bg-amber-100 text-amber-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'archived': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Course Management
        </button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {course.thumbnail_url && (
            <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
                <p className="text-gray-600">{course.description}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusBadge(course.status)}`}>
                {course.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Created by</p>
                  <p className="font-medium text-gray-900">{course.creator_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Lessons</p>
                  <p className="font-medium text-gray-900">{course.lessons.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <HelpCircle className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Quizzes</p>
                  <p className="font-medium text-gray-900">{course.quizCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">{new Date(course.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {course.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lessons</h3>
              <div className="space-y-3">
                {course.lessons.map((lesson, i) => (
                  <div key={lesson.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{lesson.title}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      lesson.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lesson.status}
                    </span>
                  </div>
                ))}
                {course.lessons.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No lessons in this course</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
