'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Users, Activity, AlertTriangle, Award, Target, Clock,
  BarChart3, ArrowLeft, Loader2, RefreshCw, BookOpen,
  CheckCircle, ChevronRight, HelpCircle, Shield, Accessibility,
  ExternalLink, TrendingUp, AlertCircle, FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { fetchDetailedCourseAnalytics, CourseDetailedAnalyticsData } from '@/lib/educator-analytics-api';
import { formatDistanceToNow } from 'date-fns';

interface CourseAnalyticsDetailViewProps {
  courseId: string;
}

export function CourseAnalyticsDetailView({ courseId }: CourseAnalyticsDetailViewProps) {
  const router = useRouter();
  const [data, setData] = useState<CourseDetailedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setError('Authentication required');
        return;
      }
      const courseAnalytics = await fetchDetailedCourseAnalytics(courseId, user.user.id);
      setData(courseAnalytics);
    } catch (err: any) {
      console.error('Failed to load detailed course analytics:', err);
      setError(err.message || 'Failed to load course analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const formatSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0 min';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const highestDropOffLesson = useMemo(() => {
    if (!data || data.lessonEngagement.length === 0) return null;
    const sorted = [...data.lessonEngagement]
      .filter(l => l.totalLearnersStarted > 0)
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
    return sorted.length > 0 && sorted[0].dropOffRate > 0 ? sorted[0] : null;
  }, [data]);

  const highestTimeLesson = useMemo(() => {
    if (!data || data.lessonEngagement.length === 0) return null;
    const sorted = [...data.lessonEngagement]
      .filter(l => l.avgTimeSpentSeconds > 0)
      .sort((a, b) => b.avgTimeSpentSeconds - a.avgTimeSpentSeconds);
    return sorted.length > 0 ? sorted[0] : null;
  }, [data]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        <p className="text-gray-500 font-medium animate-pulse">Analyzing learner interactions...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
          <h3 className="font-bold text-lg mb-1">Unable to Load Course Analytics</h3>
          <p className="text-sm">{error || 'The requested course analytics could not be retrieved.'}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/educator/analytics')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Analytics Overview
        </Button>
      </div>
    );
  }

  const hasActivityTimeline = data.timeline && data.timeline.length > 0;
  const hasEnrollments = data.summary.totalEnrolled > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button
              onClick={() => router.push('/educator/analytics')}
              className="hover:text-purple-600 transition-colors font-medium flex items-center gap-1"
            >
              Analytics
            </button>
            <span>/</span>
            <span className="text-gray-900 font-semibold truncate max-w-xs">{data.title}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{data.title}</h1>
            <Badge className={data.status === 'published' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}>
              {data.status.toUpperCase()}
            </Badge>
            {data.category && (
              <Badge variant="outline" className="text-gray-600">
                {data.category}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">Deep behavioral engagement, time spent, drop-off points, and learner profile metrics.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" onClick={loadData} className="gap-2 border-gray-300">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            onClick={() => router.push(`/educator/courses/${courseId}?tab=lessons`)}
            variant="outline"
            className="border-gray-300"
          >
            Manage Course Content
          </Button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Enrolled</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalEnrolled}</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Total learners</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/40">
          <span className="text-xs font-semibold text-green-800 uppercase">Active</span>
          <p className="text-2xl font-bold text-green-700 mt-1">{data.summary.activeLearners}</p>
          <span className="text-[11px] text-green-800/80 mt-1 block">Past 14 days</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
          <span className="text-xs font-semibold text-purple-800 uppercase">Completed</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{data.summary.completedLearners}</p>
          <span className="text-[11px] text-purple-800/80 mt-1 block">Finished course</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/40">
          <span className="text-xs font-semibold text-orange-800 uppercase">At-Risk</span>
          <p className="text-2xl font-bold text-orange-700 mt-1">{data.summary.atRiskLearners}</p>
          <span className="text-[11px] text-orange-800/80 mt-1 block">Stalled / Fails</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Avg Progress</span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{data.summary.avgProgress}%</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Course completion</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Completion Rate</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{data.summary.completionRate}%</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Finished / Enrolled</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Avg Time</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatSeconds(data.summary.avgLearningTimeSeconds)}</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Per student</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Avg Quiz</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {data.summary.avgQuizScore > 0 ? `${data.summary.avgQuizScore}%` : 'N/A'}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">Across {data.summary.totalQuizzes} quizzes</span>
        </Card>
      </div>

      {/* Meaningful Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Student Progress Distribution */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" /> Student Progress Distribution
              </h3>
              <p className="text-xs text-gray-500">How many learners fall into each completion percentage tier</p>
            </div>
          </div>

          {!hasEnrollments ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-sm">
              <BookOpen className="w-8 h-8 mb-2 opacity-40" />
              Not enough data available
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.progressDistribution} margin={{ top: 10, right: 15, left: 15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Progress Tier (%)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Learners Count', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value} learner${value === 1 ? '' : 's'}`, 'Count']}
                    contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Graph 2: Activity & Completion Trends */}
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" /> Learner Activity Over Time
              </h3>
              <p className="text-xs text-gray-500">Daily lesson views, completions, and quiz submissions</p>
            </div>
          </div>

          {!hasActivityTimeline ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-sm">
              <Activity className="w-8 h-8 mb-2 opacity-40" />
              Not enough data available
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 10, right: 15, left: 15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Date', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Event Count', angle: -90, position: 'insideLeft', offset: -5, fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="lessonViews" name="Lesson Views" stroke="#8b5cf6" fill="#ede9fe" />
                  <Area type="monotone" dataKey="completions" name="Completions" stroke="#10b981" fill="#d1fae5" />
                  <Area type="monotone" dataKey="quizAttempts" name="Quiz Attempts" stroke="#f59e0b" fill="#fef3c7" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* SECTION: WHERE DO STUDENTS SPEND THE MOST TIME & LESSON DROP-OFF */}
      <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> Where Do Students Spend the Most Time? (Lesson Engagement & Drop-off)
            </h2>
            <p className="text-sm text-gray-500">
              Analyzes real learning time per lesson and identifies where learners drop off before completing the course.
            </p>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highestTimeLesson && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Most Time-Consuming Content</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{highestTimeLesson.title}</p>
                <p className="text-xs text-gray-600 mt-1">Average time spent: <strong>{formatSeconds(highestTimeLesson.avgTimeSpentSeconds)}</strong></p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-60 shrink-0" />
            </div>
          )}

          {highestDropOffLesson && (
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-800">Highest Drop-Off Point</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{highestDropOffLesson.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>{highestDropOffLesson.dropOffRate}% drop-off</strong> ({highestDropOffLesson.dropOffCount} learners started but did not complete)
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-60 shrink-0" />
            </div>
          )}
        </div>

        {/* Lessons Breakdown Table */}
        {data.lessonEngagement.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No lessons found in this course.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Lesson Title</th>
                  <th className="px-4 py-3">Avg Time Spent</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Completion Rate</th>
                  <th className="px-4 py-3 text-right">Drop-off Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {data.lessonEngagement.map((lesson, idx) => (
                  <tr key={lesson.lessonId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{lesson.title}</td>
                    <td className="px-4 py-3 font-semibold text-amber-700">
                      {formatSeconds(lesson.avgTimeSpentSeconds)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lesson.totalLearnersStarted}</td>
                    <td className="px-4 py-3 text-gray-600">{lesson.totalLearnersCompleted}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 w-9">{lesson.completionRate}%</span>
                        <div className="w-20 hidden sm:block">
                          <Progress value={lesson.completionRate} className="h-1.5" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lesson.dropOffRate > 0 ? (
                        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                          lesson.dropOffRate > 40 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {lesson.dropOffRate}% ({lesson.dropOffCount})
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">0%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION: LEARNER PROFILE & ACCESSIBILITY PRESET USAGE */}
      <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-indigo-600" /> Learner Accessibility Profile & Preset Usage
            </h2>
            <p className="text-sm text-gray-500">
              Aggregates legitimate learner preferences stored in ACESS to help educators tailor inclusive learning materials.
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-gray-500 w-fit">
            Observational / Non-Causal
          </Badge>
        </div>

        {data.accessibilityUsage.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">Not enough learner profile data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.accessibilityUsage.map((item) => (
                <div key={item.preset} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{item.preset}</span>
                    <Badge className="bg-indigo-100 text-indigo-800 border-0 text-xs">{item.learnersCount} students</Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span>Avg Progress:</span>
                      <span className="font-semibold text-gray-900">{item.avgProgress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-semibold text-purple-700">{item.completionRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Learning Time:</span>
                      <span className="font-semibold text-gray-900">{formatSeconds(item.avgLearningTimeSeconds)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-900">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note on Interpretation:</strong> Statistics reflect observational engagement metrics across learners using each accessibility preset. These numbers demonstrate usage patterns and do not imply direct causation.
              </span>
            </div>
          </>
        )}
      </Card>

      {/* SECTION: QUIZ & ASSESSMENT PERFORMANCE */}
      <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" /> Assessment & Quiz Performance
            </h2>
            <p className="text-sm text-gray-500">Evaluation of quizzes and activities embedded in this course.</p>
          </div>
        </div>

        {data.lowestPerformingQuiz && (
          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-800">Lowest-Scoring Assessment</span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{data.lowestPerformingQuiz.title}</p>
              <p className="text-xs text-gray-600 mt-1">
                Average score: <strong>{data.lowestPerformingQuiz.avgScore}%</strong> • Pass rate: <strong>{data.lowestPerformingQuiz.passRate}%</strong>
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500 opacity-60 shrink-0" />
          </div>
        )}

        {data.quizAnalytics.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No quizzes or assessments found in this course.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Quiz Title</th>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Pass Rate</th>
                  <th className="px-4 py-3">Avg Score</th>
                  <th className="px-4 py-3 text-right">Score Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {data.quizAnalytics.map((quiz) => (
                  <tr key={quiz.quizId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{quiz.title}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{quiz.lessonTitle}</td>
                    <td className="px-4 py-3 text-gray-600">{quiz.attemptsCount}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                        quiz.passRate >= 80 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {quiz.passRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{quiz.avgScore}%</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {quiz.attemptsCount > 0 ? `${quiz.minScore}% – ${quiz.maxScore}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION: ENROLLED STUDENTS DRILL-DOWN */}
      <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Enrolled Learners ({data.students.length})
            </h2>
            <p className="text-sm text-gray-500">Click any student to inspect their comprehensive multi-course profile and learning timeline.</p>
          </div>
        </div>

        {data.students.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No learners are enrolled in this course yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Lessons Done</th>
                  <th className="px-4 py-3">Avg Quiz</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {data.students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 w-9">{student.progress}%</span>
                        <div className="w-16 hidden sm:block">
                          <Progress value={student.progress} className="h-1.5" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {student.completedLessons}/{student.totalLessons}
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs text-gray-800">
                      {student.avgQuizScore > 0 ? `${student.avgQuizScore}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {student.lastActive ? `${formatDistanceToNow(new Date(student.lastActive))} ago` : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        student.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                        student.status === 'at-risk' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        student.status === 'completed' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-gray-100 text-gray-600'
                      }>
                        {student.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/educator/students/${student.studentId}`)}
                        className="text-xs border-gray-300 group-hover:border-purple-500 group-hover:text-purple-700"
                      >
                        View Student Profile <ChevronRight className="w-3 h-3 ml-1" />
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
  );
}
