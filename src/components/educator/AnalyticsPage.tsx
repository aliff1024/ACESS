'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { TrendingUp, Users, BookOpen, Award, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchCourseAnalytics } from '@/lib/educator-api';

interface CourseAnalytics {
  title: string;
  status: string;
  enrolled: number;
  completed: number;
  avgCompletion: number;
}

interface AggStats {
  totalEnrollments: number;
  completions: number;
  avgCompletion: number;
}

export function AnalyticsPage() {
  const [courses, setCourses] = useState<CourseAnalytics[]>([]);
  const [stats, setStats] = useState<AggStats>({ totalEnrollments: 0, completions: 0, avgCompletion: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const data = await fetchCourseAnalytics(user.user.id);
          setCourses(data.courses);
          setStats(data.stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600 mt-1">Track performance and engagement across your courses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Enrollments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEnrollments}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">Live from database</p>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">Total completions</p>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">{stats.avgCompletion}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8 rounded-2xl border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h3>
        {courses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No course data available yet</p>
        ) : (
          <div className="space-y-6">
            {courses.map((course, index) => (
              <div key={index} className="p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h4>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Enrolled</p>
                        <p className="text-xl font-bold text-gray-900">{course.enrolled}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-xl font-bold text-gray-900">{course.completed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                        <p className="text-xl font-bold text-gray-900">
                          {course.avgCompletion}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-semibold">{course.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-600">Average Completion</p>
                      <p className="text-lg font-bold text-gray-900">{course.avgCompletion}%</p>
                    </div>
                    <Progress value={course.avgCompletion} className="h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 rounded-2xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Performing Lessons</h3>
          <div className="space-y-4">
            {[
              { lesson: 'What is Web Accessibility?', avgScore: 90, completionRate: 98 },
              { lesson: 'WCAG Guidelines Overview', avgScore: 85, completionRate: 95 },
              { lesson: 'Semantic HTML Basics', avgScore: 88, completionRate: 92 },
              { lesson: 'ARIA Attributes', avgScore: 82, completionRate: 89 },
              { lesson: 'Screen Reader Compatibility', avgScore: 80, completionRate: 86 },
            ].map((lesson, index) => (
              <div key={index} className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="font-semibold text-gray-900 flex-1">{lesson.lesson}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-green-700">{lesson.avgScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-700">{lesson.completionRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 rounded-2xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Engagement Insights</h3>
          <div className="space-y-4">
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Peak Activity Time</p>
                  <p className="text-xl font-bold text-gray-900">6 PM - 9 PM</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Most students are active in the evening hours</p>
            </div>

            <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Time per Lesson</p>
                  <p className="text-xl font-bold text-gray-900">28 minutes</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Students spend adequate time on content</p>
            </div>

            <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quiz Retry Rate</p>
                  <p className="text-xl font-bold text-gray-900">32%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Students are motivated to improve their scores</p>
            </div>

            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Certificate Downloads</p>
                  <p className="text-xl font-bold text-gray-900">94%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">High engagement with completion rewards</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
