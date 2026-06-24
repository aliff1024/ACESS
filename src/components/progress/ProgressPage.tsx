'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Award, TrendingUp, Target, Loader2, ArrowRight, PlayCircle, Trophy, Sparkles } from 'lucide-react';
import { fetchLearnerStats, fetchEnrolledCourses } from '@/lib/learner-api';
import type { EnrolledCourse } from '@/lib/learner-api';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/useTranslation';

interface ProgressPageProps {
  onViewCourseProgress: (courseId: string) => void;
  onBrowseCourses: () => void;
}

export function ProgressPage({ onViewCourseProgress, onBrowseCourses }: ProgressPageProps) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [stats, setStats] = useState<{
    courses_completed: number;
    lessons_completed: number;
    avg_score: number;
    certificates_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchLearnerStats(),
      fetchEnrolledCourses(),
    ])
      .then(([s, c]) => {
        setStats(s);
        setCourses(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">{t('progress.loading')}</p>
      </div>
    );
  }

  const enrolledCourses = courses.length;
  const completedCourses = stats?.courses_completed ?? 0;
  const averageScore = stats?.avg_score ?? 0;

  const statCards = [
    {
      label: t('progress.enrolled'),
      value: enrolledCourses,
      badge: t('progress.badgeActive'),
      icon: BookOpen,
      color: 'from-blue-400 to-indigo-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: t('progress.coursesCompleted'),
      value: completedCourses,
      badge: t('progress.badgeFinished'),
      icon: Trophy,
      color: 'from-green-400 to-emerald-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: t('progress.avgScore'),
      value: `${averageScore}%`,
      badge: t('progress.badgePerformance'),
      icon: TrendingUp,
      color: 'from-purple-400 to-fuchsia-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-12 readable-content">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">{t('progress.title')}</h1>
        <p className="text-lg text-gray-500 font-medium">{t('progress.description')}</p>
      </div>

      {settings.chunked_content_mode ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex h-auto gap-2 p-1 bg-gray-100/50 rounded-xl w-full">
            <TabsTrigger value="overview" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">{t('progress.tabOverview')}</TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">{t('progress.tabCourses')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="m-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className="relative overflow-hidden p-6 rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stat.color} opacity-80`} />
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                        <Icon className={`w-7 h-7 ${stat.iconColor}`} />
                      </div>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-semibold shadow-sm">{stat.badge}</Badge>
                    </div>
                    <div className="relative z-10">
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                      <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
                    </div>
                    <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="courses" className="m-0">
            <div className="space-y-4">
              {courses.length === 0 ? (
                <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4 simplifiable" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('progress.emptyTitle')}</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">{t('progress.emptyDesc')}</p>
                  <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {t('progress.browseCatalog')}
                  </Button>
                </Card>
              ) : (
                courses.map((course) => (
                  <Card
                    key={course.id}
                    className="p-6 bg-white rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 hover:shadow-lg hover:ring-blue-300 transition-all duration-300 group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                          {course.enrollment_status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 shadow-sm">{t('course.completed')}</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 shadow-sm">{t('course.current')}</Badge>
                          )}
                          {course.system_course && (
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0 shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> {t('myCourses.featured')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            {t('progress.ofLessons', { completed: course.completed_lessons, total: course.total_lessons })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-semibold text-gray-600">{t('course.progress')}</span>
                          <span className="text-sm font-extrabold text-gray-900">{course.progress}%</span>
                        </div>
                        <Progress 
                          value={course.progress} 
                          className={`h-3 bg-gray-100 ${course.progress === 100 ? '[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-500' : '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500'}`} 
                        />
                      </div>
                      <div className="flex items-center">
                        <Button
                          onClick={() => onViewCourseProgress(course.id)}
                          className={`w-full lg:w-auto h-12 px-6 font-semibold shadow-md transition-all ${
                            course.progress === 100 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-900 hover:bg-blue-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                          }`}
                        >
                          {course.progress === 100 ? (
                            <>{t('progress.viewCertificate')} <Trophy className="w-4 h-4 ml-2" /></>
                          ) : (
                            <>{t('progress.continueLearning')} <PlayCircle className="w-4 h-4 ml-2" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="relative overflow-hidden p-6 rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${stat.color} opacity-80`} />
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 ${stat.bgColor} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                      <Icon className={`w-7 h-7 ${stat.iconColor}`} />
                    </div>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-semibold shadow-sm">{stat.badge}</Badge>
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
                  </div>
                  <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
                </Card>
              );
            })}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-500" /> {t('progress.activePaths')}
              </h2>
              <Button 
                onClick={onBrowseCourses} 
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold shadow-sm"
              >
                {t('progress.exploreMore')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-4">
              {courses.length === 0 ? (
                <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4 simplifiable" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('progress.emptyTitle')}</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">{t('progress.emptyDesc')}</p>
                  <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {t('progress.browseCatalog')}
                  </Button>
                </Card>
              ) : (
                courses.map((course) => (
                  <Card
                    key={course.id}
                    className="p-6 bg-white rounded-3xl border-0 shadow-sm ring-1 ring-gray-200 hover:shadow-lg hover:ring-blue-300 transition-all duration-300 group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                          {course.enrollment_status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 shadow-sm">{t('course.completed')}</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 shadow-sm">{t('course.current')}</Badge>
                          )}
                          {course.system_course && (
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0 shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> {t('myCourses.featured')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            {t('progress.ofLessons', { completed: course.completed_lessons, total: course.total_lessons })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-semibold text-gray-600">{t('course.progress')}</span>
                          <span className="text-sm font-extrabold text-gray-900">{course.progress}%</span>
                        </div>
                        <Progress 
                          value={course.progress} 
                          className={`h-3 bg-gray-100 ${course.progress === 100 ? '[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-500' : '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500'}`} 
                        />
                      </div>
                      <div className="flex items-center">
                        <Button
                          onClick={() => onViewCourseProgress(course.id)}
                          className={`w-full lg:w-auto h-12 px-6 font-semibold shadow-md transition-all ${
                            course.progress === 100 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-900 hover:bg-blue-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                          }`}
                        >
                          {course.progress === 100 ? (
                            <>{t('progress.viewCertificate')} <Trophy className="w-4 h-4 ml-2" /></>
                          ) : (
                            <>{t('progress.continueLearning')} <PlayCircle className="w-4 h-4 ml-2" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
