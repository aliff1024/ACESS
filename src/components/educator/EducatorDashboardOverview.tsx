'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BookOpen, Users, TrendingUp, AlertTriangle, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchDashboardStats, fetchRecentActivity, fetchAtRiskStudents, fetchCourses } from '@/lib/educator-api';
import type { CourseSummary, ActivityItem, AtRiskStudent } from '@/lib/educator-api';

interface EducatorDashboardOverviewProps {
  onCreateCourse: () => void;
  onViewCourses: () => void;
  onViewStudents: () => void;
}

export function EducatorDashboardOverview({
  onCreateCourse,
  onViewCourses,
  onViewStudents,
}: EducatorDashboardOverviewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [stats, setStats] = useState({ totalCourses: 0, totalStudents: 0, avgCompletion: 0, atRiskCount: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        const educatorId = user.user.id;

        const [profileData, statsData, activityData, atRiskData, coursesData] = await Promise.all([
          supabase.from('users').select('full_name').eq('id', educatorId).single().then((r) => r.data),
          fetchDashboardStats(educatorId),
          fetchRecentActivity(educatorId),
          fetchAtRiskStudents(educatorId),
          fetchCourses(educatorId),
        ]);

        if (profileData) setProfile(profileData);
        setStats(statsData);
        setActivity(activityData);
        setAtRisk(atRiskData);
        setCourses(coursesData.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.full_name || 'Educator'}!</h2>
          <p className="text-gray-600 mt-1">Here&apos;s what&apos;s happening with your courses today</p>
        </div>
        <Button onClick={onCreateCourse} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 text-lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Students Enrolled</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">{stats.avgCompletion}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">At-Risk Learners</p>
              <p className="text-3xl font-bold text-gray-900">{stats.atRiskCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {activity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              activity.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === 'enrollment'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {item.type === 'enrollment' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{item.student}</span>{' '}
                      {item.type === 'enrollment' ? 'enrolled in' : 'completed'}{' '}
                      <span className="text-purple-600">{item.course}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">At-Risk Learners</h3>
            </div>
            <Button onClick={onViewStudents} variant="ghost" className="text-orange-600 hover:text-orange-700">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Students who haven&apos;t been active recently or are struggling with progress
          </p>
          <div className="space-y-3">
            {atRisk.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No at-risk learners</p>
            ) : (
              atRisk.map((student, index) => (
                <div key={index} className="p-4 bg-white border-2 border-orange-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                      {student.progress}% Complete
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{student.course}</p>
                  <p className="text-xs text-gray-500">Last active: {student.lastActive}</p>
                </div>
              ))
            )}
          </div>
          <Button onClick={onViewStudents} className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white">
            Reach Out to Students
          </Button>
        </Card>
      </div>

      <Card className="p-6 rounded-2xl border-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Your Courses</h3>
          <Button onClick={onViewCourses} variant="ghost" className="text-purple-600 hover:text-purple-700">
            View All Courses <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-500">No courses yet</div>
          ) : (
            courses.map((course, index) => (
              <div key={course.id || index} className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-colors cursor-pointer" onClick={() => router.push(`/educator/courses/${course.id}`)}>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      course.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {course.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">{course.title}</h4>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{course.students} students</span>
                  <span>{course.lessons} lessons</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

