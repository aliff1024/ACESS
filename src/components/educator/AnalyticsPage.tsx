'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Users, Activity, AlertTriangle, Award, Target, Clock,
  BarChart3, ArrowUpRight, BookOpen, Loader2, RefreshCw,
  Search, TrendingUp, ChevronRight, CheckCircle, Flame, Shield,
  Layers, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchCourseDeepAnalytics, CourseDeepAnalytics } from '@/lib/educator-analytics-api';

export function AnalyticsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseDeepAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'overview'>('courses');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const data = await fetchCourseDeepAnalytics(user.user.id);
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute aggregated overview metrics across educator's courses
  const overview = useMemo(() => {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const totalEnrollments = courses.reduce((acc, c) => acc + c.stats.totalEnrollments, 0);
    const totalActive = courses.reduce((acc, c) => acc + c.stats.activeLearners, 0);
    const totalAtRisk = courses.reduce((acc, c) => acc + c.stats.atRiskLearners, 0);
    const totalCompleted = courses.reduce((acc, c) => acc + c.stats.completedLearners, 0);
    const newEnrollmentsThisMonth = courses.reduce((acc, c) => acc + c.stats.newEnrollmentsThisMonth, 0);

    const avgCompletionRate = totalCourses > 0
      ? Math.round(courses.reduce((acc, c) => acc + c.stats.avgCompletionRate, 0) / totalCourses)
      : 0;

    const avgProgress = totalCourses > 0
      ? Math.round(courses.reduce((acc, c) => acc + c.stats.avgProgress, 0) / totalCourses)
      : 0;

    const validQuizScores = courses.map(c => c.stats.avgQuizScore).filter(s => s > 0);
    const avgQuizScore = validQuizScores.length > 0
      ? Math.round(validQuizScores.reduce((acc, s) => acc + s, 0) / validQuizScores.length)
      : 0;

    const validLearningTimes = courses.map(c => c.stats.avgLearningTimeSeconds).filter(t => t > 0);
    const avgLearningTimeSeconds = validLearningTimes.length > 0
      ? Math.round(validLearningTimes.reduce((acc, t) => acc + t, 0) / validLearningTimes.length)
      : 0;

    // Most and least engaged courses
    const sortedByCompletion = [...courses].sort((a, b) => b.stats.avgCompletionRate - a.stats.avgCompletionRate);
    const mostEngaged = sortedByCompletion.length > 0 ? sortedByCompletion[0] : null;
    const leastEngaged = sortedByCompletion.length > 1 ? sortedByCompletion[sortedByCompletion.length - 1] : null;

    return {
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalActive,
      totalAtRisk,
      totalCompleted,
      newEnrollmentsThisMonth,
      avgCompletionRate,
      avgProgress,
      avgQuizScore,
      avgLearningTimeSeconds,
      mostEngaged,
      leastEngaged
    };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchFilter = selectedCourseFilter === 'all' || c.courseId === selectedCourseFilter;
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [courses, selectedCourseFilter, searchQuery]);

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
        <p className="text-gray-500 font-medium animate-pulse">Analyzing learning analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Teaching & Course Analytics</h1>
          <p className="text-gray-500 mt-1">
            Track student performance, explore course health, and drill down into detailed learning insights.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2 border-gray-300 w-fit">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'courses'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          Course Performance & Drill-Down ({courses.length})
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
          Overall Analytics & Insights
        </button>
      </div>

      {/* TAB 1: COURSE PERFORMANCE & DRILL-DOWN */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Compact Top Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Total Courses</span>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{overview.totalCourses}</p>
              <span className="text-[11px] text-gray-500">{overview.publishedCourses} published</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Total Learners</span>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{overview.totalEnrollments}</p>
              <span className="text-[11px] text-green-600 font-medium">+{overview.newEnrollmentsThisMonth} this month</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-400 uppercase">Avg Course Progress</span>
              <p className="text-2xl font-bold text-indigo-700 mt-0.5">{overview.avgProgress}%</p>
              <span className="text-[11px] text-gray-500">Across all students</span>
            </Card>

            <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
              <span className="text-xs font-semibold text-purple-900 uppercase">Avg Completion Rate</span>
              <p className="text-2xl font-bold text-purple-800 mt-0.5">{overview.avgCompletionRate}%</p>
              <span className="text-[11px] text-purple-700">{overview.totalCompleted} finished</span>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 hidden sm:inline">Filter:</span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Courses ({courses.length})</option>
                {courses.map(c => (
                  <option key={c.courseId} value={c.courseId}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Course Cards List */}
          {filteredCourses.length === 0 ? (
            <Card className="p-12 text-center border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses found</h3>
              <p className="text-sm text-gray-500">No courses match your filter or search criteria.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCourses.map((course) => (
                <Card
                  key={course.courseId}
                  className="p-6 border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl bg-white hover:ring-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Course Info & Metrics */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{course.title}</h3>
                        <Badge className={course.status === 'published' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}>
                          {course.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
                        <div>
                          <span className="block text-xs font-semibold text-gray-400 uppercase">Enrolled</span>
                          <span className="text-lg font-bold text-gray-900">{course.stats.totalEnrollments}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-400 uppercase text-green-700">Active</span>
                          <span className="text-lg font-bold text-green-700">{course.stats.activeLearners}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-400 uppercase text-orange-700">At Risk</span>
                          <span className="text-lg font-bold text-orange-700">{course.stats.atRiskLearners}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-400 uppercase">Avg Progress</span>
                          <span className="text-lg font-bold text-indigo-700">{course.stats.avgProgress}%</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-400 uppercase">Completion Rate</span>
                          <span className="text-lg font-bold text-purple-700">{course.stats.avgCompletionRate}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 w-full">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Course Completion Rate</span>
                          <span className="font-semibold">{course.stats.avgCompletionRate}%</span>
                        </div>
                        <Progress value={course.stats.avgCompletionRate} className="h-2 bg-gray-100" />
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-400 uppercase font-semibold">Avg Quiz Score</div>
                        <div className="text-base font-bold text-gray-800">
                          {course.stats.avgQuizScore > 0 ? `${course.stats.avgQuizScore}%` : 'No quizzes'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Time: {formatSeconds(course.stats.avgLearningTimeSeconds)}</div>
                      </div>

                      <Button
                        onClick={() => router.push(`/educator/analytics/courses/${course.courseId}`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm text-sm font-semibold w-full sm:w-auto"
                      >
                        View Detailed Analytics <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEACHING OVERVIEW & INSIGHTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">Total Learners</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{overview.totalEnrollments}</p>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-2">
                <TrendingUp className="w-3.5 h-3.5" /> +{overview.newEnrollmentsThisMonth} new this month
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">Active Learners</span>
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-700">{overview.totalActive}</p>
              <p className="text-xs text-gray-500 mt-2">Active in last 14 days</p>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-orange-900">At-Risk Learners</span>
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-800">{overview.totalAtRisk}</p>
              <p className="text-xs text-orange-700 mt-2">Requires educator attention</p>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-purple-900">Avg Completion Rate</span>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-800">{overview.avgCompletionRate}%</p>
              <div className="w-full mt-2">
                <Progress value={overview.avgCompletionRate} className="h-1.5 bg-purple-200" />
              </div>
            </Card>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Course Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{overview.avgProgress}%</p>
                <p className="text-xs text-gray-500">Across all enrolled learners</p>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Learning Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatSeconds(overview.avgLearningTimeSeconds)}</p>
                <p className="text-xs text-gray-500">Real engaged time in lessons</p>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Quiz Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {overview.avgQuizScore > 0 ? `${overview.avgQuizScore}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Overall assessment accuracy</p>
              </div>
            </Card>
          </div>

          {/* Highlights: Most & Least Engaged Courses */}
          {overview.totalCourses > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overview.mostEngaged && (
                <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/30 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-green-800">Highest Engagement Course</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{overview.mostEngaged.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {overview.mostEngaged.stats.avgCompletionRate}% completion • {overview.mostEngaged.stats.activeLearners} active learners
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/educator/analytics/courses/${overview.mostEngaged?.courseId}`)}
                    className="text-green-700 hover:text-green-800 hover:bg-green-100/50"
                  >
                    Inspect <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              )}

              {overview.leastEngaged && (
                <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/30 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Opportunity for Improvement</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{overview.leastEngaged.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {overview.leastEngaged.stats.avgCompletionRate}% completion • {overview.leastEngaged.stats.atRiskLearners} at-risk learners
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/educator/analytics/courses/${overview.leastEngaged?.courseId}`)}
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-100/50"
                  >
                    Inspect <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Aggregate Course Benchmarking Table */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Course Engagement Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">At Risk</th>
                    <th className="px-4 py-3">Completion Rate</th>
                    <th className="px-4 py-3">Avg Progress</th>
                    <th className="px-4 py-3 text-right">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                  {courses.map((course) => (
                    <tr key={course.courseId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{course.title}</td>
                      <td className="px-4 py-3 text-gray-600">{course.stats.totalEnrollments}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{course.stats.activeLearners}</td>
                      <td className="px-4 py-3">
                        {course.stats.atRiskLearners > 0 ? (
                          <span className="font-semibold text-orange-700">{course.stats.atRiskLearners}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-purple-700">{course.stats.avgCompletionRate}%</td>
                      <td className="px-4 py-3">{course.stats.avgProgress}%</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/educator/analytics/courses/${course.courseId}`)}
                          className="text-xs text-purple-700 hover:text-purple-900"
                        >
                          Inspect <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
