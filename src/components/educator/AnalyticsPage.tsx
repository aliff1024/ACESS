'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { TrendingUp, Users, BookOpen, Award, Target, Loader2, ArrowUpRight, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchCourseDeepAnalytics, CourseDeepAnalytics } from '@/lib/educator-analytics-api';

export function AnalyticsPage() {
  const [courses, setCourses] = useState<CourseDeepAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const data = await fetchCourseDeepAnalytics(user.user.id);
          setCourses(data);
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
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 animate-pulse">Analyzing course engagement...</p>
      </div>
    );
  }

  const totalEnrollments = courses.reduce((acc, c) => acc + c.stats.totalEnrollments, 0);
  const totalActive = courses.reduce((acc, c) => acc + c.stats.activeLearners, 0);
  const avgCompletionRate = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + c.stats.avgCompletionRate, 0) / courses.length) 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Course Engagement Analytics</h2>
        <p className="text-gray-500 mt-1">Deep insights into how learners interact with your courses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Enrollments</p>
              <p className="text-3xl font-bold text-gray-900">{totalEnrollments}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center text-green-600 font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +{courses.reduce((acc, c) => acc + c.stats.newEnrollmentsThisMonth, 0)} this month
            </span>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shadow-sm">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Learners</p>
              <p className="text-3xl font-bold text-gray-900">{totalActive}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">
              Across {courses.length} active courses
            </span>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{avgCompletionRate}%</p>
            </div>
          </div>
          <div className="w-full">
            <Progress value={avgCompletionRate} className="h-2" />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" /> Course Insights
        </h3>
        
        {courses.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-2xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No courses found to analyze.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Card key={course.courseId} className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{course.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">Deep engagement breakdown</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Completion:</span>
                    <span className="text-base font-bold text-purple-700">{course.stats.avgCompletionRate}%</span>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Basic Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Enrolled</p>
                      <p className="text-2xl font-bold text-gray-900">{course.stats.totalEnrollments}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Active</p>
                      <p className="text-2xl font-bold text-green-900">{course.stats.activeLearners}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-center">
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Inactive</p>
                      <p className="text-2xl font-bold text-orange-900">{course.stats.inactiveLearners}</p>
                    </div>
                  </div>

                  {/* Behavioral Insights */}
                  <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" /> Behavioral Insights
                  </h5>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Most Completed Lesson</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{course.insights.mostCompletedLesson}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Most Skipped Lesson</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{course.insights.mostSkippedLesson}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Most Difficult Content</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{course.insights.mostDifficultLesson}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Target className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Avg Quiz Score</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{course.stats.avgQuizScore}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
