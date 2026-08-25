'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Users, Activity, AlertTriangle, UserX, CheckCircle2,
  Clock, Search, Loader2, RefreshCw, ChevronRight, BookOpen,
  ArrowRight, ShieldAlert, Target, BarChart3, AlertCircle, Filter,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Input } from '../ui/input';
import { supabase } from '@/lib/supabase';
import { fetchStudentsDeepProgress, DetailedStudentProgress } from '@/lib/educator-analytics-api';
import type { StudentRiskStatus } from '@/lib/student-risk';
import { formatDistanceToNow } from 'date-fns';

interface CourseEnrollmentRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  lastActive: string;
  status: StudentRiskStatus;
  avgQuizScore: number;
  timeSpentSeconds: number;
  accessibilityPreset?: string;
}

export function StudentsProgressPage() {
  const router = useRouter();
  const [students, setStudents] = useState<DetailedStudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'overview'>('roster');

  // Filter States for Student Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [progressRangeFilter, setProgressRangeFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const data = await fetchStudentsDeepProgress(user.user.id);
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to load students progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Overview metrics across all students
  const overview = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const atRiskStudents = students.filter(s => s.status === 'at-risk').length;
    const inactiveStudents = students.filter(s => s.status === 'inactive').length;
    const completedStudents = students.filter(s => s.status === 'completed').length;

    const avgProgress = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.totalProgress, 0) / totalStudents)
      : 0;

    let completedCoursesCount = 0;
    let inProgressCoursesCount = 0;

    students.forEach(s => {
      s.courses.forEach(c => {
        if (c.progress === 100 || c.status === 'completed') {
          completedCoursesCount++;
        } else if (c.progress > 0 && c.status !== 'dropped') {
          inProgressCoursesCount++;
        }
      });
    });

    // Progress Distribution Histogram
    const buckets = [
      { bucket: '0–20%', count: 0 },
      { bucket: '21–40%', count: 0 },
      { bucket: '41–60%', count: 0 },
      { bucket: '61–80%', count: 0 },
      { bucket: '81–99%', count: 0 },
      { bucket: '100%', count: 0 },
    ];

    students.forEach(s => {
      const p = s.totalProgress;
      if (p <= 20) buckets[0].count++;
      else if (p <= 40) buckets[1].count++;
      else if (p <= 60) buckets[2].count++;
      else if (p <= 80) buckets[3].count++;
      else if (p < 100) buckets[4].count++;
      else buckets[5].count++;
    });

    // Course Progress Comparison
    const courseStatsMap = new Map<string, { title: string; totalProgress: number; count: number; completed: number }>();
    students.forEach(s => {
      s.courses.forEach(c => {
        if (!courseStatsMap.has(c.id)) {
          courseStatsMap.set(c.id, { title: c.title, totalProgress: 0, count: 0, completed: 0 });
        }
        const cs = courseStatsMap.get(c.id)!;
        cs.totalProgress += c.progress;
        cs.count++;
        if (c.progress === 100 || c.status === 'completed') cs.completed++;
      });
    });

    const courseProgressList = Array.from(courseStatsMap.values()).map(cs => ({
      title: cs.title,
      avgProgress: cs.count > 0 ? Math.round(cs.totalProgress / cs.count) : 0,
      learnersCount: cs.count,
      completedCount: cs.completed
    })).sort((a, b) => b.avgProgress - a.avgProgress);

    // Needs Attention List (at-risk & inactive learners)
    const needsAttentionList = students
      .filter(s => s.status === 'at-risk' || s.status === 'inactive')
      .map(s => {
        const daysInactive = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / (1000 * 60 * 60 * 24));
        let reason = 'Requires check-in';
        if (daysInactive > 14) {
          reason = `Inactive for ${daysInactive} days`;
        } else if (daysInactive > 7) {
          reason = `No activity for ${daysInactive} days`;
        } else if (s.courses.some(c => c.status === 'at-risk')) {
          reason = 'Stalled progress or failed quiz';
        }

        const primaryCourse = s.courses.length > 0 ? s.courses[0].title : 'General Course';

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          totalProgress: s.totalProgress,
          lastActive: s.lastActive,
          daysInactive,
          reason,
          status: s.status,
          primaryCourse
        };
      })
      .sort((a, b) => b.daysInactive - a.daysInactive);

    return {
      totalStudents,
      activeStudents,
      atRiskStudents,
      inactiveStudents,
      completedStudents,
      avgProgress,
      completedCoursesCount,
      inProgressCoursesCount,
      progressDistribution: buckets,
      courseProgressList,
      needsAttentionList
    };
  }, [students]);

  // Flattened enrollments for the detailed roster table
  const enrollments: CourseEnrollmentRow[] = useMemo(() => {
    const rows: CourseEnrollmentRow[] = [];
    students.forEach(student => {
      const presetKey = (student.accessibility_prefs?.active_preset as string) || (student.accessibility_prefs?.base_preset as string);
      student.courses.forEach(course => {
        rows.push({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          courseId: course.id,
          courseTitle: course.title,
          progress: course.progress,
          lastActive: course.lastActive,
          status: course.status,
          avgQuizScore: course.avgScore,
          timeSpentSeconds: course.timeSpentSeconds,
          accessibilityPreset: presetKey && presetKey !== 'none' ? presetKey : undefined
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
        row.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || row.courseTitle === courseFilter;

      let matchesProgress = true;
      if (progressRangeFilter === '0-25') matchesProgress = row.progress <= 25;
      else if (progressRangeFilter === '26-50') matchesProgress = row.progress > 25 && row.progress <= 50;
      else if (progressRangeFilter === '51-75') matchesProgress = row.progress > 50 && row.progress <= 75;
      else if (progressRangeFilter === '76-100') matchesProgress = row.progress > 75;

      return matchesSearch && matchesStatus && matchesCourse && matchesProgress;
    });
  }, [enrollments, searchQuery, statusFilter, courseFilter, progressRangeFilter]);

  const formatSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0 min';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 font-medium animate-pulse">Loading student performance overview...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Progress & Engagement</h1>
          <p className="text-gray-500 mt-1">
            Monitor student completion, identify learners needing intervention, and inspect individual learning paths.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2 border-gray-300 w-fit">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'roster'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          Enrolled Student Roster ({enrollments.length})
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Progress Overview & Visualizations
          {overview.needsAttentionList.length > 0 && (
            <Badge className="ml-1 bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-0.5">
              {overview.needsAttentionList.length} alert{overview.needsAttentionList.length > 1 ? 's' : ''}
            </Badge>
          )}
        </button>
      </div>

      {/* TAB 1: ENROLLED STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Total Students</span>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{overview.totalStudents}</p>
              <span className="text-[11px] text-gray-500">{enrollments.length} active enrollments</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/40">
              <span className="text-xs font-semibold text-green-800 uppercase">Active Students</span>
              <p className="text-2xl font-bold text-green-700 mt-0.5">{overview.activeStudents}</p>
              <span className="text-[11px] text-green-800">Engaged past 14 days</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/40">
              <span className="text-xs font-semibold text-orange-800 uppercase">Needs Attention</span>
              <p className="text-2xl font-bold text-orange-700 mt-0.5">{overview.needsAttentionList.length}</p>
              <span className="text-[11px] text-orange-800">At-risk or inactive</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Avg Progress</span>
              <p className="text-2xl font-bold text-indigo-700 mt-0.5">{overview.avgProgress}%</p>
              <span className="text-[11px] text-gray-500">{overview.completedCoursesCount} courses completed</span>
            </Card>
          </div>

          {/* Quick Alert Bar if there are at-risk students */}
          {overview.needsAttentionList.length > 0 && (
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-orange-950">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>
                  <strong>{overview.needsAttentionList.length} student{overview.needsAttentionList.length > 1 ? 's' : ''}</strong> require educator attention due to stalled progress, inactivity, or failed quizzes.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'at-risk' ? 'all' : 'at-risk')}
                  className="px-2.5 py-1 bg-white border border-orange-300 rounded-lg font-semibold text-orange-800 hover:bg-orange-100 transition-colors"
                >
                  {statusFilter === 'at-risk' ? 'Show All Students' : 'Filter to At-Risk'}
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-2.5 py-1 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Review Risk Details →
                </button>
              </div>
            </div>
          )}

          {/* Main Student Roster Table */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-6 border-b border-gray-100 flex flex-col gap-4 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Enrolled Student Roster</h2>
                  <p className="text-xs text-gray-500">Filter by course, engagement status, or progress range.</p>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  Showing {filteredEnrollments.length} of {enrollments.length} enrollments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search student or course..."
                    className="pl-9 bg-white border-gray-200 rounded-xl text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Course Filter */}
                <select
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (On Track)</option>
                  <option value="at-risk">At Risk</option>
                  <option value="inactive">Inactive (&gt; 14 days)</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Progress Range Filter */}
                <select
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={progressRangeFilter}
                  onChange={(e) => setProgressRangeFilter(e.target.value)}
                >
                  <option value="all">All Progress Tiers</option>
                  <option value="0-25">0% – 25% Progress</option>
                  <option value="26-50">26% – 50% Progress</option>
                  <option value="51-75">51% – 75% Progress</option>
                  <option value="76-100">76% – 100% Progress</option>
                </select>
              </div>
            </div>

            {filteredEnrollments.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">No matching students found</h3>
                <p className="text-xs text-gray-500">Try clearing or adjusting your search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Progress</th>
                      <th className="px-6 py-4">Avg Quiz</th>
                      <th className="px-6 py-4">Time Spent</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                    {filteredEnrollments.map((row, idx) => (
                      <tr key={`${row.studentId}-${row.courseId}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-xs">
                              {row.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 truncate max-w-[180px]">{row.studentName}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">{row.courseTitle}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 w-9">{row.progress}%</span>
                            <div className="w-16 hidden sm:block">
                              <Progress value={row.progress} className="h-1.5" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                          {row.avgQuizScore > 0 ? `${row.avgQuizScore}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {formatSeconds(row.timeSpentSeconds)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {row.lastActive ? `${formatDistanceToNow(new Date(row.lastActive))} ago` : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={
                            row.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                            row.status === 'at-risk' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            row.status === 'completed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }>
                            {row.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/educator/students/${row.studentId}`)}
                            className="text-xs border-gray-300 group-hover:border-purple-500 group-hover:text-purple-700"
                          >
                            View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: PROGRESS OVERVIEW & VISUALIZATIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Detailed Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Total Students</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.totalStudents}</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Roster size</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/40">
              <span className="text-xs font-semibold text-green-800 uppercase">Active</span>
              <p className="text-2xl font-bold text-green-700 mt-1">{overview.activeStudents}</p>
              <span className="text-[11px] text-green-800/80 mt-1 block">Past 14 days</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/40">
              <span className="text-xs font-semibold text-orange-800 uppercase">At Risk</span>
              <p className="text-2xl font-bold text-orange-700 mt-1">{overview.atRiskStudents}</p>
              <span className="text-[11px] text-orange-800/80 mt-1 block">Needs support</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-red-200 bg-red-50/40">
              <span className="text-xs font-semibold text-red-800 uppercase">Inactive</span>
              <p className="text-2xl font-bold text-red-700 mt-1">{overview.inactiveStudents}</p>
              <span className="text-[11px] text-red-800/80 mt-1 block">&gt; 14 days idle</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Avg Progress</span>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{overview.avgProgress}%</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Across roster</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
              <span className="text-xs font-semibold text-purple-800 uppercase">Completed</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{overview.completedCoursesCount}</p>
              <span className="text-[11px] text-purple-800/80 mt-1 block">Courses finished</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">In Progress</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overview.inProgressCoursesCount}</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Active courses</span>
            </Card>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Distribution Histogram */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" /> Student Progress Distribution
                  </h3>
                  <p className="text-xs text-gray-500">Number of learners across overall completion tiers</p>
                </div>
              </div>

              {overview.totalStudents === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                  Not enough data available
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.progressDistribution} margin={{ top: 10, right: 15, left: 15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="bucket"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Progress Tier (%)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Students Count', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${value} student${value === 1 ? '' : 's'}`, 'Count']}
                        contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Course Progress Comparison */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" /> Course Progress Comparison
                  </h3>
                  <p className="text-xs text-gray-500">Average student progress across courses</p>
                </div>
              </div>

              {overview.courseProgressList.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                  Not enough data available
                </div>
              ) : (
                <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                  {overview.courseProgressList.map((c) => (
                    <div key={c.title} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-800 truncate max-w-xs">{c.title}</span>
                        <span className="font-bold text-purple-700">{c.avgProgress}% avg ({c.learnersCount} students)</span>
                      </div>
                      <Progress value={c.avgProgress} className="h-2 bg-gray-100" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* 🚨 "NEEDS ATTENTION" SECTION */}
          {overview.needsAttentionList.length > 0 && (
            <Card className="p-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/60 to-amber-50/40 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-orange-950">Needs Attention ({overview.needsAttentionList.length} Students)</h2>
                    <p className="text-xs text-orange-800">Learners who have stalled, failed assessments, or have been inactive over 7 days.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {overview.needsAttentionList.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 rounded-xl bg-white border border-orange-200 shadow-xs flex flex-col justify-between hover:border-orange-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-bold text-gray-900 text-sm truncate">{student.name}</div>
                        <Badge className={student.status === 'at-risk' ? 'bg-orange-100 text-orange-800 text-[10px] border-0 shrink-0' : 'bg-red-100 text-red-800 text-[10px] border-0 shrink-0'}>
                          {student.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 mb-3">
                        <div className="flex items-center gap-1 text-orange-800 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                          <span>{student.reason}</span>
                        </div>
                        <div className="text-gray-500 truncate">Course: <strong className="text-gray-700">{student.primaryCourse}</strong></div>
                        <div className="text-gray-500">Progress: <strong>{student.totalProgress}%</strong> • Last active: <strong>{formatDistanceToNow(new Date(student.lastActive))} ago</strong></div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => router.push(`/educator/students/${student.id}`)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold h-8 mt-1 shadow-xs"
                    >
                      View Student Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
