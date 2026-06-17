'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  BookOpen, Users, TrendingUp, AlertTriangle, Plus, 
  ArrowRight, Loader2, Award, Mail, Clock, ShieldAlert,
  GraduationCap, Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchCourses, fetchEducatorCertStats, fetchRecentActivity } from '@/lib/educator-api';
import { fetchStudentsDeepProgress, DetailedStudentProgress } from '@/lib/educator-analytics-api';
import type { CourseSummary, ActivityItem } from '@/lib/educator-api';

interface EducatorDashboardOverviewProps {
  onCreateCourse: () => void;
  onViewCourses: () => void;
  onViewStudents: () => void;
  onViewCertificates?: () => void;
}

export function EducatorDashboardOverview({
  onCreateCourse,
  onViewCourses,
  onViewStudents,
  onViewCertificates
}: EducatorDashboardOverviewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [students, setStudents] = useState<DetailedStudentProgress[]>([]);
  const [certStats, setCertStats] = useState({ totalIssued: 0, thisMonth: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        const educatorId = user.user.id;

        const [profileData, coursesData, studentsData, certData, activityData] = await Promise.all([
          supabase.from('users').select('full_name').eq('id', educatorId).single().then((r) => r.data),
          fetchCourses(educatorId),
          fetchStudentsDeepProgress(educatorId),
          fetchEducatorCertStats(educatorId),
          fetchRecentActivity(educatorId)
        ]);

        if (profileData) setProfile(profileData);
        setCourses(coursesData);
        setStudents(studentsData);
        setCertStats(certData);
        setActivity(activityData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 animate-pulse">Loading command center...</p>
      </div>
    );
  }

  // Aggregate Stats
  const activeStudents = students.filter(s => s.status === 'active' || s.status === 'on-track').length;
  const needsAttentionStudents = students.filter(s => s.status === 'at-risk' || s.status === 'inactive');
  const avgCompletion = students.length > 0 
    ? Math.round(students.reduce((acc, s) => acc + s.totalProgress, 0) / students.length)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back, {profile?.full_name || 'Educator'}!</h2>
          <p className="text-gray-500 mt-1">Here is the latest pulse on your courses and learners.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button onClick={onCreateCourse} className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> New Course
          </Button>
          <Button onClick={onViewStudents} variant="outline" className="border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:scale-105">
            <Mail className="w-4 h-4 mr-2 text-blue-600" /> Message Learners
          </Button>
          {onViewCertificates && (
            <Button onClick={onViewCertificates} variant="outline" className="border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:scale-105">
              <Award className="w-4 h-4 mr-2 text-yellow-600" /> Manage Certificates
            </Button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={onViewCourses}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:bg-purple-100 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Courses</p>
              <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={onViewStudents}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:bg-blue-100 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Enrolled</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
          <div className="flex items-center text-sm font-medium text-green-600">
            <Activity className="w-4 h-4 mr-1" /> {activeStudents} Active Currently
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={onViewStudents}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10 group-hover:bg-green-100 transition-colors" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">{avgCompletion}%</p>
            </div>
          </div>
          <Progress value={avgCompletion} className="h-1.5" />
        </Card>

        {onViewCertificates && (
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={onViewCertificates}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -z-10 group-hover:bg-yellow-100 transition-colors" />
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Certificates</p>
                <p className="text-3xl font-bold text-gray-900">{certStats.totalIssued}</p>
              </div>
            </div>
            <div className="flex items-center text-sm font-medium text-yellow-700">
              <Award className="w-4 h-4 mr-1" /> {certStats.thisMonth} Issued This Month
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Needs Attention (At Risk / Inactive) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Needs Attention
            </h3>
            <Button onClick={onViewStudents} variant="ghost" className="text-purple-600 hover:text-purple-700 text-sm">
              View All Students <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
            {needsAttentionStudents.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="text-lg font-medium text-gray-900">All clear!</h4>
                <p className="text-gray-500 text-sm">No students are currently marked as At-Risk or Inactive.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {needsAttentionStudents.map(student => (
                  <div key={student.id} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-white shadow-sm ${student.status === 'inactive' ? 'bg-red-500' : 'bg-orange-500'}`}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> Last active: {student.lastActive ? 'several days ago' : 'Never'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      {student.status === 'inactive' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap">Inactive &gt; 14 Days</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">At Risk</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/educator/students/${student.id}`)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        Reach Out <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity Card */}
          <div className="flex items-center justify-between pt-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" /> Recent Activity
            </h3>
          </div>
          
          <Card className="p-2 sm:p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                activity.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
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
                        <span className="font-medium text-purple-600">{item.course}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Your Courses */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> Recent Courses
            </h3>
            <Button onClick={onViewCourses} variant="ghost" className="text-purple-600 hover:text-purple-700 text-sm">
              Manage <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {courses.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 border-gray-200 bg-gray-50 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm mb-4">You haven't created any courses yet.</p>
                <Button onClick={onCreateCourse} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">Create Course</Button>
              </Card>
            ) : (
              courses.slice(0, 4).map((course, index) => (
                <Card 
                  key={course.id || index} 
                  className="p-5 border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl hover:ring-purple-300 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/educator/courses/${course.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-1">{course.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {course.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mt-3">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.students} Learners</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.lessons} Lessons</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
