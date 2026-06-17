'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Users, TrendingUp, AlertTriangle, Search, Loader2, Clock, Activity, ArrowRight, UserX, BookOpen } from 'lucide-react';
import { Input } from '../ui/input';
import { supabase } from '@/lib/supabase';
import { fetchStudentsDeepProgress, DetailedStudentProgress } from '@/lib/educator-analytics-api';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface CourseEnrollmentRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  lastActive: string;
  status: 'completed' | 'at-risk' | 'on-track' | 'active' | 'inactive';
}

export function StudentsProgressPage() {
  const [students, setStudents] = useState<DetailedStudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const data = await fetchStudentsDeepProgress(user.user.id);
          setStudents(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Flatten students into course enrollments so we can show "per course" progress
  const enrollments: CourseEnrollmentRow[] = useMemo(() => {
    const rows: CourseEnrollmentRow[] = [];
    students.forEach(student => {
      student.courses.forEach(course => {
        rows.push({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          courseId: course.id,
          courseTitle: course.title,
          progress: course.progress,
          lastActive: course.lastActive,
          status: course.status as 'completed' | 'at-risk' | 'on-track' | 'active' | 'inactive'
        });
      });
    });
    return rows;
  }, [students]);

  const uniqueCourses = useMemo(() => {
    const courses = new Set(enrollments.map(e => e.courseTitle));
    return Array.from(courses).sort();
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(row => {
      const matchesSearch = 
        row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        row.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter.toLowerCase();
      const matchesCourse = courseFilter === 'All' || row.courseTitle === courseFilter;
      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [enrollments, searchQuery, statusFilter, courseFilter]);

  // Aggregate stats based on students (not enrollments)
  const atRiskCount = students.filter((s) => s.status === 'at-risk').length;
  const inactiveCount = students.filter((s) => s.status === 'inactive').length;
  const activeCount = students.filter((s) => s.status === 'active').length;

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 animate-pulse">Loading learner analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Student Progress</h2>
          <p className="text-gray-500 mt-1">Monitor engagement, track learning behavior, and identify students needing support per course.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Enrolled</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Learners</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/50 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-800">At-Risk Students</p>
              <p className="text-2xl font-bold text-orange-900">{atRiskCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-red-200 bg-red-50/50 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Inactive &gt; 14 Days</p>
              <p className="text-2xl font-bold text-red-900">{inactiveCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Course Enrollments</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search students..." 
                className="pl-9 w-full sm:w-64 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="All">All Courses</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>

            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="On-track">On Track / Active</option>
              <option value="At-Risk">At Risk</option>
              <option value="Inactive">Inactive</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No enrollments found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEnrollments.map((row, idx) => (
                  <tr key={`${row.studentId}-${row.courseId}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0">
                          {row.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors truncate max-w-[150px] sm:max-w-[200px]">{row.studentName}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[150px] sm:max-w-[200px]">{row.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate max-w-[200px]">{row.courseTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[100px]">
                          <Progress value={row.progress} className="h-2" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{row.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="whitespace-nowrap">
                          {row.lastActive ? formatDistanceToNow(new Date(row.lastActive), { addSuffix: true }) : 'Never'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === 'at-risk' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                        </Badge>
                      )}
                      {row.status === 'inactive' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <UserX className="w-3 h-3 mr-1" /> Inactive
                        </Badge>
                      )}
                      {(row.status === 'active' || row.status === 'on-track') && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Active
                        </Badge>
                      )}
                      {row.status === 'completed' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Completed
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/educator/students/${row.studentId}`}>
                        <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                          View Student <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
