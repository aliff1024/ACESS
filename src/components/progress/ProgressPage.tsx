'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Award,
  TrendingUp,
  Target,
  Loader2,
  ArrowRight,
  PlayCircle,
  Trophy,
  Sparkles,
  Clock,
  CheckCircle2,
  RotateCcw,
  History,
  Calendar,
  Flame,
  FileText,
  Volume2,
  CheckCircle,
  AlertCircle,
  Compass,
  Search,
  Filter,
} from 'lucide-react';
import {
  fetchLearnerStats,
  fetchEnrolledCourses,
  fetchLearnerVisitHistory,
  fetchLearnerAllQuizAttempts,
  type EnrolledCourse,
  type LearnerStats,
  type LearnerVisitHistoryItem,
  type LearnerQuizAttemptItem,
} from '@/lib/learner-api';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/useTranslation';

interface ProgressPageProps {
  onViewCourseProgress: (courseId: string) => void;
  onBrowseCourses: () => void;
  onStartLesson?: (lessonId: string) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function ProgressPage({ onViewCourseProgress, onBrowseCourses, onStartLesson }: ProgressPageProps) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [visitHistory, setVisitHistory] = useState<LearnerVisitHistoryItem[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<LearnerQuizAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    Promise.all([
      fetchLearnerStats().catch(() => null),
      fetchEnrolledCourses().catch(() => [] as EnrolledCourse[]),
      fetchLearnerVisitHistory().catch(() => [] as LearnerVisitHistoryItem[]),
      fetchLearnerAllQuizAttempts().catch(() => [] as LearnerQuizAttemptItem[]),
    ])
      .then(([s, c, vh, qa]) => {
        setStats(s);
        setCourses(c || []);
        setVisitHistory(vh || []);
        setQuizAttempts(qa || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const isSensoryCalmMode =
    settings.background_tint === 'pale_blue' ||
    settings.animation_level === 'none' ||
    settings.muted_colors === true;

  const isADHDMode =
    settings.background_tint === 'grey' ||
    (settings.task_checklist_enabled && settings.structure_mode === 'minimal');

  const [showDetailedStats, setShowDetailedStats] = useState(!isSensoryCalmMode);

  useEffect(() => {
    if (isSensoryCalmMode) {
      setShowDetailedStats(false);
    } else {
      setShowDetailedStats(true);
    }
  }, [isSensoryCalmMode]);

  // Compute metrics
  const enrolledCourses = courses.length;
  const completedCourses = stats?.courses_completed ?? 0;
  const completedLessons = stats?.lessons_completed ?? 0;
  const averageScore = stats?.avg_score ?? 0;
  const totalStudyTimeSeconds = stats?.total_study_time_seconds ?? 0;
  const totalLessonViews = stats?.total_lesson_views ?? visitHistory.reduce((acc, curr) => acc + curr.view_count, 0);
  const streakDays = stats?.streak_days ?? 0;
  const totalXP = stats?.total_xp ?? 0;
  const passedQuizzesCount = quizAttempts.filter((q) => q.result === 'pass').length;

  // Next recommended action (most recent incomplete lesson or first incomplete lesson)
  const nextLessonAction = useMemo(() => {
    // Look at visit history for recent in-progress
    const inProgressVisit = visitHistory.find((v) => !v.is_completed);
    if (inProgressVisit) {
      return {
        lessonId: inProgressVisit.lesson_id,
        lessonTitle: inProgressVisit.lesson_title,
        courseId: inProgressVisit.course_id,
        courseTitle: inProgressVisit.course_title,
        status: 'In Progress',
      };
    }
    // Fallback to first course with progress < 100
    const activeCourse = courses.find((c) => c.progress < 100);
    if (activeCourse) {
      return {
        courseId: activeCourse.id,
        courseTitle: activeCourse.title,
        lessonTitle: 'Next uncompleted lesson',
        status: 'Continue Course',
      };
    }
    return null;
  }, [visitHistory, courses]);

  // Read aloud summary for TTS
  const handleReadSummary = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const text = `Learning Progress Summary. You are enrolled in ${enrolledCourses} courses, with ${completedCourses} fully completed. You have completed ${completedLessons} lessons, with a total of ${totalLessonViews} lesson visits, and spent ${formatDuration(
      totalStudyTimeSeconds
    )} learning. Your average quiz score is ${averageScore} percent across ${quizAttempts.length} total attempts.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">{t('progress.loading')}</p>
      </div>
    );
  }

  // Filtered visit history
  const filteredVisits = historyFilter === 'all'
    ? visitHistory
    : historyFilter === 'completed'
    ? visitHistory.filter((v) => v.is_completed)
    : visitHistory.filter((v) => !v.is_completed);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-7 readable-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            {t('progress.title') || 'Learning Progress'}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-medium max-w-2xl">
            {t('progress.description') || 'Track your course completions, session visit history, and assessment performance.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleReadSummary}
            variant="outline"
            className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm text-xs font-semibold"
          >
            <Volume2 className="w-4 h-4 text-indigo-600" /> Listen to Summary
          </Button>
          <Button
            onClick={onBrowseCourses}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 text-xs font-semibold"
          >
            <Compass className="w-4 h-4" /> Browse Catalog
          </Button>
        </div>
      </div>

      {/* For ADHD Mode: Action-First Priority Banner at top */}
      {isADHDMode && nextLessonAction && (
        <Card className="p-5 rounded-2xl border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Focus Action: Resume Where You Left Off</p>
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900">{nextLessonAction.lessonTitle}</h3>
              <p className="text-xs text-gray-600">{nextLessonAction.courseTitle}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (nextLessonAction.lessonId && onStartLesson) {
                onStartLesson(nextLessonAction.lessonId);
              } else if (nextLessonAction.courseId) {
                onViewCourseProgress(nextLessonAction.courseId);
              }
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md px-6 py-5 text-sm"
          >
            Resume Learning <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      {/* Plain Language Summary Card (Calm & Predictable for Autism & Sensory) */}
      <Card className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-indigo-950 leading-relaxed">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-indigo-900">Learning Summary</p>
              {isSensoryCalmMode && (
                <button
                  type="button"
                  onClick={() => setShowDetailedStats(!showDetailedStats)}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                >
                  {showDetailedStats ? '▲ Hide numeric cards' : '📊 Show detailed numeric cards'}
                </button>
              )}
            </div>
            <p>
              You are enrolled in <strong>{enrolledCourses} courses</strong> and have completed{' '}
              <strong>{completedLessons} lessons</strong> across all subjects. You have spent a total of{' '}
              <strong>{formatDuration(totalStudyTimeSeconds)}</strong> actively studying, recording{' '}
              <strong>{totalLessonViews} lesson visits</strong>. Your quiz performance is{' '}
              <strong>{averageScore}%</strong> with <strong>{passedQuizzesCount} passed knowledge checks</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Top 5 Granular Stat Cards (Toggled/Shown) */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Study Time */}
          <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-medium text-[11px]">
                Active Time
              </Badge>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Study Time</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatDuration(totalStudyTimeSeconds)}</p>
          </Card>

          {/* Enrolled Courses */}
          <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-medium text-[11px]">
                {completedCourses} Finished
              </Badge>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Courses</p>
            <p className="text-2xl font-extrabold text-gray-900">
              {enrolledCourses} <span className="text-xs text-gray-400 font-normal">enrolled</span>
            </p>
          </Card>

          {/* Lessons Completed & Visits */}
          <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                {totalLessonViews} Visits
              </Badge>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Lessons Done</p>
            <p className="text-2xl font-extrabold text-gray-900">{completedLessons}</p>
          </Card>

          {/* Average Quiz Mastery */}
          <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 font-medium text-[11px]">
                {passedQuizzesCount} Passed
              </Badge>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quiz Mastery</p>
            <p className="text-2xl font-extrabold text-gray-900">{averageScore}%</p>
          </Card>

          {/* Learning Streak & XP */}
          <Card className="p-5 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 font-medium text-[11px]">
                {totalXP} XP
              </Badge>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Daily Streak</p>
            <p className="text-2xl font-extrabold text-gray-900">
              {streakDays} <span className="text-xs text-gray-400 font-normal">days</span>
            </p>
          </Card>
        </div>
      )}

      {/* For Standard / non-ADHD mode: Recommended Step Banner below stats */}
      {!isADHDMode && nextLessonAction && (
        <Card className="p-5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Next Recommended Step</p>
              <h3 className="text-base font-bold text-gray-900">{nextLessonAction.lessonTitle}</h3>
              <p className="text-xs text-gray-500">{nextLessonAction.courseTitle}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (nextLessonAction.lessonId && onStartLesson) {
                onStartLesson(nextLessonAction.lessonId);
              } else if (nextLessonAction.courseId) {
                onViewCourseProgress(nextLessonAction.courseId);
              }
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            Resume Learning <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 p-1.5 bg-gray-100/70 rounded-2xl w-full">
          <TabsTrigger
            value="overview"
            className="flex-1 min-w-[120px] text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl font-semibold transition-all"
          >
            <Compass className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="courses"
            className="flex-1 min-w-[120px] text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4 mr-2" /> Courses ({courses.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 min-w-[120px] text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl font-semibold transition-all"
          >
            <History className="w-4 h-4 mr-2" /> Visit History ({visitHistory.length})
          </TabsTrigger>
          <TabsTrigger
            value="quizzes"
            className="flex-1 min-w-[120px] text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl font-semibold transition-all"
          >
            <Trophy className="w-4 h-4 mr-2" /> Quiz Tries ({quizAttempts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-8 m-0">
          {/* Active Courses Summary */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Active Course Tracks
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('courses')}
                className="text-blue-600 hover:text-blue-700"
              >
                View all courses <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.slice(0, 4).map((course) => (
                <Card
                  key={course.id}
                  className="p-5 bg-white rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-900">{course.title}</h3>
                      {course.progress === 100 ? (
                        <Badge className="bg-green-100 text-green-700 border-0 shrink-0">Completed</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-0 shrink-0">{course.progress}%</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {course.completed_lessons} of {course.total_lessons} lessons completed
                    </p>
                    <Progress value={course.progress} className="h-2 mb-4 bg-gray-100 [&>div]:bg-blue-600" />
                  </div>
                  <Button
                    onClick={() => onViewCourseProgress(course.id)}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold justify-between"
                  >
                    <span>View Course Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Previews: Recent Visits & Recent Quizzes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Visit Activity */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" /> Recent Visits
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-indigo-600"
                >
                  See all ({visitHistory.length})
                </Button>
              </div>

              {visitHistory.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No lesson visit history recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {visitHistory.slice(0, 4).map((visit) => (
                    <div
                      key={visit.id}
                      className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{visit.lesson_title}</p>
                        <p className="text-gray-500 text-[11px] truncate">{visit.course_title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="bg-white text-[10px] text-gray-600">
                          {visit.view_count}× visited
                        </Badge>
                        <span className="text-[11px] text-gray-400">{formatRelativeTime(visit.last_viewed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Quiz Attempts */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-600" /> Recent Quiz Tries
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('quizzes')}
                  className="text-xs text-purple-600"
                >
                  See all ({quizAttempts.length})
                </Button>
              </div>

              {quizAttempts.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No quiz attempts submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {quizAttempts.slice(0, 4).map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{att.quiz_title}</p>
                        <p className="text-gray-500 text-[11px] truncate">Try #{att.attempt_number} &bull; {att.course_title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={
                            att.result === 'pass'
                              ? 'bg-green-100 text-green-800 border-0 text-[11px]'
                              : 'bg-rose-100 text-rose-800 border-0 text-[11px]'
                          }
                        >
                          {att.score_pct}% {att.result === 'pass' ? '✓ Pass' : 'Review'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: COURSES & MODULES */}
        <TabsContent value="courses" className="space-y-4 m-0">
          {courses.length === 0 ? (
            <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No active courses</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">Explore our catalog and enroll in your first accessible course.</p>
              <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white">
                Browse Courses
              </Button>
            </Card>
          ) : (
            courses.map((course) => (
              <Card
                key={course.id}
                className="p-6 bg-white rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-blue-300 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                      {course.progress === 100 ? (
                        <Badge className="bg-green-100 text-green-700 border-0">Completed</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-0">{course.progress}% Active</Badge>
                      )}
                      {course.system_course && (
                        <Badge className="bg-indigo-100 text-indigo-700 border-0 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        {course.completed_lessons} of {course.total_lessons} lessons completed
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-semibold text-gray-600">Course Mastery</span>
                      <span className="text-xs font-extrabold text-gray-900">{course.progress}%</span>
                    </div>
                    <Progress
                      value={course.progress}
                      className={`h-2.5 bg-gray-100 ${
                        course.progress === 100
                          ? '[&>div]:bg-green-500'
                          : '[&>div]:bg-blue-600'
                      }`}
                    />
                  </div>

                  <div className="flex items-center">
                    <Button
                      onClick={() => onViewCourseProgress(course.id)}
                      className={`w-full lg:w-auto px-5 font-semibold shadow-sm ${
                        course.progress === 100
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-900 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {course.progress === 100 ? (
                        <>View Details <Trophy className="w-4 h-4 ml-2" /></>
                      ) : (
                        <>Continue Track <PlayCircle className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB 3: VISIT HISTORY */}
        <TabsContent value="history" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Lesson Visit History & Repetition Log</h2>
              <p className="text-xs text-gray-500">
                Detailed record of lessons viewed, time spent per session, and repetition frequency.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={historyFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('all')}
                className="text-xs"
              >
                All ({visitHistory.length})
              </Button>
              <Button
                variant={historyFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('completed')}
                className="text-xs"
              >
                Completed
              </Button>
              <Button
                variant={historyFilter === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('in_progress')}
                className="text-xs"
              >
                In Progress
              </Button>
            </div>
          </div>

          {filteredVisits.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed bg-gray-50/50">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">No visits matching filter</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredVisits.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:ring-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.is_completed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {item.is_completed ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{item.lesson_title}</h4>
                        {item.is_completed ? (
                          <Badge className="bg-green-100 text-green-800 border-0 text-[10px]">Completed</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">In Progress</Badge>
                        )}
                        {item.summary_completed && (
                          <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px]">Summary Saved</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{item.course_title}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs shrink-0 sm:justify-end">
                    <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold">{item.view_count}</span> visits
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{formatDuration(item.time_spent_seconds)} spent</span>
                    </div>

                    <span className="text-gray-400 text-[11px] min-w-[70px] text-right">
                      {formatRelativeTime(item.last_viewed_at)}
                    </span>

                    {onStartLesson && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartLesson(item.lesson_id)}
                        className="h-8 text-xs font-semibold"
                      >
                        Open
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: QUIZ TRIES */}
        <TabsContent value="quizzes" className="space-y-4 m-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Quiz & Assessment Attempt Logs</h2>
            <p className="text-xs text-gray-500">
              History of all quiz tries, score outcomes, and pass threshold achievements.
            </p>
          </div>

          {quizAttempts.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed bg-gray-50/50">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">No quiz attempts recorded</p>
              <p className="text-xs text-gray-400 mt-1">Complete lesson quizzes to test your knowledge.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {quizAttempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  className="p-4 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:ring-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        attempt.result === 'pass'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {attempt.result === 'pass' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{attempt.quiz_title}</h4>
                        <Badge variant="outline" className="text-[10px] bg-gray-50">
                          Try #{attempt.attempt_number}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {attempt.lesson_title} &bull; {attempt.course_title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 sm:justify-end">
                    <Badge
                      className={`text-xs px-3 py-1 font-bold ${
                        attempt.result === 'pass'
                          ? 'bg-green-100 text-green-800 border-0'
                          : 'bg-rose-100 text-rose-800 border-0'
                      }`}
                    >
                      {attempt.score_pct}% &mdash; {attempt.result === 'pass' ? 'Passed' : 'Needs Review'}
                    </Badge>

                    <span className="text-gray-400 text-[11px] min-w-[70px] text-right">
                      {formatRelativeTime(attempt.submitted_at)}
                    </span>

                    {onStartLesson && attempt.lesson_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartLesson(attempt.lesson_id)}
                        className="h-8 text-xs font-semibold"
                      >
                        {attempt.result === 'pass' ? 'Review' : 'Retake'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
