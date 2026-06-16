'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BookOpen, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PublicCourse {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  category: string | null;
  thumbnail_url: string | null;
  lesson_count: number;
  student_count: number;
  creator_name: string;
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-green-100 text-green-700 border-green-200' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  advanced: { label: 'Advanced', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export function CoursesPreview() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const { data: coursesData, error } = await supabase
          .from('courses')
          .select(`
            id, title, description, difficulty_level, category, thumbnail_url, created_by, updated_at,
            lessons:lessons(count)
          `)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(4);

        if (error || !coursesData) {
          setCourses([]);
          return;
        }

        const creatorIds = [...new Set(coursesData.map((c) => c.created_by).filter(Boolean))];
        const creatorMap = new Map<string, string>();

        if (creatorIds.length > 0) {
          const { data: creators } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', creatorIds);
          for (const u of creators || []) {
            creatorMap.set(u.id, u.full_name || 'Educator');
          }
        }

        const courseIds = coursesData.map((c) => c.id);
        const enrollCountMap = new Map<string, number>();
        if (courseIds.length > 0) {
          const { data: allEnrolls } = await supabase
            .from('enrollments')
            .select('course_id')
            .in('course_id', courseIds);
          for (const en of allEnrolls || []) {
            enrollCountMap.set(en.course_id, (enrollCountMap.get(en.course_id) || 0) + 1);
          }
        }

        setCourses(
          coursesData.map((c: Record<string, unknown>) => {
            const lessonsArr = c.lessons as { count: number }[] | undefined;
            return {
              id: c.id as string,
              title: c.title as string,
              description: c.description as string,
              difficulty_level: c.difficulty_level as string,
              category: c.category as string | null,
              thumbnail_url: c.thumbnail_url as string | null,
              lesson_count: lessonsArr?.[0]?.count ?? 0,
              student_count: enrollCountMap.get(c.id as string) || 0,
              creator_name: creatorMap.get(c.created_by as string) || 'Educator',
            };
          })
        );
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  return (
    <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900" id="courses">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Popular Courses
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our accessible learning courses designed for diverse learning needs
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No courses available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => {
              const diff = difficultyConfig[course.difficulty_level] || difficultyConfig.beginner;
              return (
                <Card
                  key={course.id}
                  className="p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  {course.thumbnail_url && (
                    <div className="mb-4 -mx-6 -mt-6 rounded-t-2xl overflow-hidden h-32 bg-gray-100">
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="mb-4">
                    <Badge className={`${diff.color} border mb-3`}>{diff.label}</Badge>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{course.student_count} enrolled</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <p className="text-xs text-gray-400 mb-3">by {course.creator_name}</p>
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <Link href={`/login?redirect=/learner/courses/${course.id}`}>View Course</Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Button asChild size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
            <Link href="/login">Browse All Courses</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
