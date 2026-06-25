'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Check, Lock, Play, Loader2, Heart, LogOut, Shield, Trophy, Target, Zap, ChevronRight, ListChecks, AlertTriangle, Award, User, Clock, Users, Star, Medal, Footprints, GraduationCap, Flame } from 'lucide-react';
import { ConfirmAction } from '../ui/ConfirmAction';
import { fetchCourseDetail, enrollInCourse, unenrollFromCourse, toggleFavorite, checkIsFavorited, fetchSystemCourseProgress, checkCourseCertificateEligibility, claimCertificate, fetchCourseAccessibilityCategoriesForLearner } from '@/lib/learner-api';
import type { CourseDetail, SystemCourseProgress } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { toast } from 'sonner';

interface CourseDetailPageProps {
  courseId: string;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
  isPreview?: boolean;
}

const BADGE_ICONS = [
  { id: 'Trophy', icon: Trophy },
  { id: 'Award', icon: Award },
  { id: 'Star', icon: Star },
  { id: 'Medal', icon: Medal },
  { id: 'Target', icon: Target },
  { id: 'Shield', icon: Shield },
  { id: 'Zap', icon: Zap },
  { id: 'Footprints', icon: Footprints },
  { id: 'BookOpen', icon: BookOpen },
  { id: 'GraduationCap', icon: GraduationCap },
  { id: 'Flame', icon: Flame },
  { id: 'Heart', icon: Heart }
];

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export function CourseDetailPage({ courseId, onBack, onStartLesson, isPreview = false }: CourseDetailPageProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sysProgress, setSysProgress] = useState<SystemCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [certEligible, setCertEligible] = useState<{ eligible: boolean; reason?: string } | null>(null);
  const [claimingCert, setClaimingCert] = useState(false);
  const [certClaimed, setCertClaimed] = useState(false);
  const [accessibilityCategories, setAccessibilityCategories] = useState<string[]>([]);
  const [courseAchievements, setCourseAchievements] = useState<any[]>([]);
  const { settings } = useAccessibility();

  const isSystem = course?.system_course === true;
  const isGuided = isSystem && course?.guided_learning_enabled;

  useEffect(() => {
    Promise.all([
      fetchCourseDetail(courseId),
      checkIsFavorited(courseId),
    ])
      .then(async ([c, fav]) => {
        if (c && isPreview) {
          c.enrollment_id = 'preview-enrollment';
          c.lessons = c.lessons.map((l: any) => ({ ...l, status: 'current' }));
          c.progress = 0;
          c.completed_lessons = 0;
        }

        setCourse(c);
        setIsFav(fav);
        if (c?.enrollment_id && !isPreview) {
          if (c?.system_course) {
            fetchSystemCourseProgress(courseId).then(setSysProgress).catch(() => {});
          }
          // Check certificate eligibility
          try {
            const elig = await checkCourseCertificateEligibility(courseId);
            setCertEligible(elig);
          } catch {}
        }
        // Fetch accessibility categories
        try {
          const cats = await fetchCourseAccessibilityCategoriesForLearner(courseId);
          setAccessibilityCategories(cats);
        } catch {}

        // Fetch course achievements
        try {
          const { data: achData } = await supabase
            .from('course_achievements')
            .select('*')
            .eq('course_id', courseId);
          if (achData) setCourseAchievements(achData);
        } catch {}
      })
      .catch((err) => { console.error('CourseDetailPage load error:', err); })
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleClaimCertificate = async () => {
    setClaimingCert(true);
    try {
      const result = await claimCertificate(courseId);
      if (result) {
        setCertClaimed(true);
        toast.success('Certificate issued!');
      } else {
        toast.error('Not eligible for certificate yet');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to claim certificate';
      toast.error(msg);
    } finally {
      setClaimingCert(false);
    }
  };

  const handleEnroll = async () => {
    if (isPreview) {
      toast.info('Enrollment is simulated in Preview Mode');
      setCourse(prev => prev ? { ...prev, enrollment_id: 'preview-enrollment' } : null);
      if (course?.system_course) {
        setSysProgress({
          completed_lessons: 0,
          total_lessons: (course as any).lesson_count || 1
        } as any);
      }
      return;
    }
    setEnrolling(true);
    try {
      await enrollInCourse(courseId);
      toast.success('Enrolled successfully!');
      const updated = await fetchCourseDetail(courseId);
      setCourse(updated);
      if (updated?.system_course) {
        fetchSystemCourseProgress(courseId).then(setSysProgress).catch(() => {});
      }
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (isPreview) {
      toast.info('Unenrollment is simulated in Preview Mode');
      setCourse(prev => prev ? { ...prev, enrollment_id: null } : null);
      setSysProgress(null);
      return;
    }
    setUnenrolling(true);
    try {
      await unenrollFromCourse(courseId);
      toast.success('Unenrolled successfully');
      const updated = await fetchCourseDetail(courseId);
      setCourse(updated);
      setSysProgress(null);
    } catch {
      toast.error('Failed to unenroll');
    } finally {
      setUnenrolling(false);
    }
  };

  const handleToggleFav = async () => {
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      const nowFav = await toggleFavorite(courseId);
      setIsFav(nowFav);
      toast.success(nowFav ? 'Added to favourites' : 'Removed from favourites');
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingFav(false);
    }
  };

  const getLessonIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'current':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getLessonButtonText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Review';
      case 'current':
        return 'Continue';
      case 'locked':
        return 'Locked';
      default:
        return 'Start';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-600">{t('course.notFound')}</p>
      </div>
    );
  }

  const diffKey = course.difficulty_level?.toLowerCase() || 'beginner';

  // ─────────────────────────────────────────────────────────────────
  // Guided System Course View (for admin-created system courses only)
  // No gradients — solid colors, shadows, borders, spacing
  // ─────────────────────────────────────────────────────────────────
  const PreviewBanner = isPreview && (
    <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-center gap-3 text-sm font-medium z-50 sticky top-0">
      <AlertTriangle className="w-4 h-4" />
      Preview Mode — Viewing course as a learner. Progress will not be saved.
      <Button onClick={onBack} size="sm" className="bg-white text-amber-700 hover:bg-amber-50 font-semibold ml-4">
        Exit Preview
      </Button>
    </div>
  );

  if (isGuided) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {PreviewBanner}
        <div className="max-w-5xl mx-auto p-6 readable-content">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
          >
            &larr; {t('course.backToCourses')}
          </button>

          {/* ── Header Card — solid, shadow, border ── */}
          <div className="bg-white rounded-xl shadow-md border-l-4 border-purple-500 p-8 mb-6">
            <div className="flex items-start gap-6 mb-6">
              {course.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnail_url} alt={course.title} className="w-28 h-28 rounded-xl object-cover flex-shrink-0 shadow-sm border border-gray-200" />
              ) : (
                <div className="w-28 h-28 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-200 shadow-sm">
                  <Shield className="w-14 h-14 text-purple-600" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">Official Learning Path</Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">System Course</Badge>
                  {course.guided_learning_enabled && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">Guided Course</Badge>
                  )}
                  <Badge className={`${difficultyColors[diffKey] || difficultyColors.beginner} border`}>
                    {course.difficulty_level || 'Beginner'}
                  </Badge>
                  {course.recommended_age_group && (
                    <Badge variant="outline" className="text-gray-600 border-gray-300">
                      Ages {course.recommended_age_group}
                    </Badge>
                  )}
                  {course.certificate_enabled && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Certificate
                    </Badge>
                  )}
                  {accessibilityCategories.map((cat) => {
                    const labels: Record<string, string> = {
                      cognitive: 'Cognitive',
                      adhd: 'ADHD',
                      dyslexia: 'Dyslexia',
                      asd: 'ASD',
                      visual: 'Visual',
                      hearing: 'Hearing',
                      motor: 'Motor',
                    };
                    const colors: Record<string, string> = {
                      cognitive: 'bg-purple-100 text-purple-700 border-purple-200',
                      adhd: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                      dyslexia: 'bg-blue-100 text-blue-700 border-blue-200',
                      asd: 'bg-teal-100 text-teal-700 border-teal-200',
                      visual: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                      hearing: 'bg-rose-100 text-rose-700 border-rose-200',
                      motor: 'bg-orange-100 text-orange-700 border-orange-200',
                    };
                    return (
                      <Badge key={cat} className={`${colors[cat] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {labels[cat] || cat}
                      </Badge>
                    );
                  })}
                  {course.updated_at && (
                    <Badge variant="outline" className="text-gray-500 border-gray-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Updated {new Date(course.updated_at).toLocaleDateString()}
                    </Badge>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
                    <p className="text-lg text-gray-600 leading-relaxed mb-4">{course.description}</p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        <span>{course.total_lessons} {t('course.lessons')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        <span>{course.creator_name || 'Educator'}</span>
                      </div>
                      {course.total_duration && course.total_duration > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          <span>{course.total_duration >= 60 ? `${Math.round(course.total_duration / 60)}h` : `${course.total_duration}m`}</span>
                        </div>
                      )}
                      {sysProgress && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-500" />
                          <span className="text-amber-700 font-medium">{sysProgress.learning_streak} day streak</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleToggleFav}
                      disabled={togglingFav}
                      className="p-3 rounded-full hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {togglingFav ? <Loader2 className="w-7 h-7 animate-spin text-gray-400" /> : <Heart className={`w-7 h-7 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {course.enrollment_id ? (
              <div className="space-y-4">
                {/* ── Progress Bar — solid ── */}
                <div className="bg-white border-2 border-purple-100 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      {t('course.yourProgress')}
                    </span>
                    <span className="text-3xl font-bold text-purple-700">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress value={course.progress} className="h-4 mb-2 rounded-full bg-purple-100" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">
                      {course.completed_lessons} of {course.total_lessons} lessons completed
                    </span>
                    {sysProgress?.time_spent_minutes && (
                      <span className="text-gray-500">
                        ~{sysProgress.time_spent_minutes} min spent
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Continue Learning / Next Lesson — solid button ── */}
                {sysProgress?.next_lesson_id && (
                  <button
                    onClick={() => onStartLesson(sysProgress.next_lesson_id!)}
                    className="w-full bg-purple-700 text-white rounded-xl p-5 hover:bg-purple-800 transition-all shadow-md hover:shadow-lg flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-purple-200">Continue Learning</p>
                        <p className="text-lg font-bold">{sysProgress.next_lesson_title}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-purple-200 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* ── Milestones — solid cards ── */}
                {sysProgress && sysProgress.milestones.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-amber-500" />
                      Milestones
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {sysProgress.milestones.map((m, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl text-center border-2 transition-all ${
                            m.achieved
                              ? 'bg-green-50 border-green-300 shadow-sm'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                            m.achieved ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {m.achieved ? (
                              <Trophy className="w-5 h-5 text-green-600" />
                            ) : (
                              <Target className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <p className={`text-xs font-semibold ${m.achieved ? 'text-green-800' : 'text-gray-500'}`}>
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ConfirmAction
                  title="Unenroll from Course"
                  description="Are you sure you want to unenroll from this course? You can re-enroll anytime."
                  confirmText="Unenroll"
                  confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                  icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                  onConfirm={handleUnenroll}
                >
                  <Button
                    disabled={unenrolling}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {unenrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                    {t('course.unenroll')}
                  </Button>
                </ConfirmAction>
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={enrolling}
                className="bg-purple-700 hover:bg-purple-800 text-white px-10 py-6 text-lg rounded-xl shadow-md"
              >
                {enrolling ? t('course.enrolling') : t('course.enroll')}
              </Button>
            )}
          </div>

          {/* ── Lessons as Roadmap — solid ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-purple-600" />
              Learning Roadmap
            </h2>

            <div className="space-y-4">
              {course.lessons.map((lesson) => {
                // Chunked mode: Hide locked lessons to prevent overwhelm
                if ((settings.layout_mode === 'slide' || settings.chunked_content_mode) && lesson.status === 'locked') return null;
                
                return (
                <Card
                  key={lesson.id}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    lesson.status === 'current'
                      ? 'border-purple-400 bg-purple-50 shadow-md'
                      : lesson.status === 'completed'
                      ? 'border-green-200 bg-green-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    {/* Step number */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        lesson.status === 'completed'
                          ? 'bg-green-100 border-green-300'
                          : lesson.status === 'current'
                          ? 'bg-purple-100 border-purple-300'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      {getLessonIcon(lesson.status)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-500">
                          Step {lesson.sequence_order}
                        </span>
                        {lesson.status === 'current' && (
                          <Badge className="bg-purple-600 text-white text-xs">Current</Badge>
                        )}
                        {lesson.status === 'completed' && (
                          <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
                            <Check className="w-3 h-3" /> Done
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{lesson.title}</h3>
                      {!settings.simplified_ui && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Estimated time: {lesson.estimated_duration ? `${lesson.estimated_duration} mins` : 'N/A'}
                        </p>
                      )}
                    </div>

                    {course.enrollment_id && (
                      <Button
                        onClick={() => onStartLesson(lesson.id)}
                        disabled={lesson.status === 'locked'}
                        className={`rounded-xl px-8 py-6 text-base font-bold ${
                          lesson.status === 'current'
                            ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-md'
                            : lesson.status === 'completed'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {getLessonButtonText(lesson.status)}
                      </Button>
                    )}
                  </div>
                </Card>
              )})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Standard Course View (for educator courses, unchanged)
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {PreviewBanner}
      <div className="max-w-6xl mx-auto p-6 readable-content">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          &larr; {t('course.backToCourses')}
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnail_url} alt={course.title} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-12 h-12 text-blue-600" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${difficultyColors[diffKey] || difficultyColors.beginner} border`}>
                  {course.difficulty_level || 'Beginner'}
                </Badge>
                {course.category && (
                  <Badge variant="outline" className="text-gray-600">
                    {course.category}
                  </Badge>
                )}
                {course.certificate_enabled && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Certificate
                  </Badge>
                )}
                {course.updated_at && (
                  <Badge variant="outline" className="text-gray-500 border-gray-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Updated {new Date(course.updated_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
                  <p className="text-xl text-gray-600 leading-relaxed mb-4">{course.description}</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      <span>{course.total_lessons} {t('course.lessons')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      <span>{course.creator_name || 'Educator'}</span>
                    </div>
                    {course.total_duration && course.total_duration > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span>{course.total_duration >= 60 ? `${Math.round(course.total_duration / 60)}h` : `${course.total_duration}m`}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleToggleFav}
                  disabled={togglingFav}
                  className="p-3 rounded-full hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
                >
                  {togglingFav ? <Loader2 className="w-7 h-7 animate-spin text-gray-400" /> : <Heart className={`w-7 h-7 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />}
                </button>
              </div>
            </div>
          </div>

          {!settings.distraction_free_mode && (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {course.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>

              {courseAchievements.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" /> Earnable Badges
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {courseAchievements.map(ach => {
                      const badge = BADGE_ICONS.find(b => b.id === ach.icon_url) || { icon: Award };
                      const Icon = badge.icon;
                      return (
                      <div key={ach.id} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-yellow-100 min-w-[200px]">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{ach.name}</p>
                          <p className="text-xs text-gray-500">{ach.requirement_type} {ach.requirement_threshold}</p>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {course.enrollment_id ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-gray-900">{t('course.yourProgress')}</span>
                  <span className="text-lg font-bold text-blue-600">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-3 mb-2" />
                <p className="text-sm text-gray-600">
                  {course.completed_lessons} of {course.total_lessons} lessons completed
                </p>
              </div>

              {/* Certificate claim section */}
              {certEligible?.eligible && !certClaimed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Certificate Available</p>
                      <p className="text-sm text-gray-600 mt-1">You&apos;ve completed all requirements. Claim your certificate now!</p>
                      <Button
                        onClick={handleClaimCertificate}
                        disabled={claimingCert}
                        className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {claimingCert ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
                        Claim Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {certClaimed && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">Certificate Earned!</p>
                      <p className="text-sm text-green-700 mt-1">View and download your certificate from your profile.</p>
                      <Button
                        onClick={() => router.push('/learner/certificates')}
                        variant="outline"
                        className="mt-3 border-green-600 text-green-600"
                      >
                        <Award className="w-4 h-4 mr-2" /> View Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {certEligible && !certEligible.eligible && !certClaimed && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Certificate Progress</p>
                      <p className="text-xs text-blue-700 mt-0.5">{certEligible.reason}</p>
                    </div>
                  </div>
                </div>
              )}

              <ConfirmAction
                title="Unenroll from Course"
                description="Are you sure you want to unenroll from this course? You can re-enroll anytime."
                confirmText="Unenroll"
                confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                onConfirm={handleUnenroll}
              >
                <Button
                  disabled={unenrolling}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {unenrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                  {t('course.unenroll')}
                </Button>
              </ConfirmAction>
            </div>
          ) : (
            <Button
              onClick={handleEnroll}
              disabled={enrolling}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            >
              {enrolling ? t('course.enrolling') : t('course.enroll')}
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('course.lessonsLabel')}</h2>

          <div className="space-y-3">
            {course.lessons.map((lesson) => {
              if ((settings.layout_mode === 'slide' || settings.chunked_content_mode) && lesson.status === 'locked') return null;
              return (
              <Card
                key={lesson.id}
                className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                  lesson.status === 'current'
                    ? 'border-blue-400 bg-blue-50'
                    : lesson.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lesson.status === 'completed'
                        ? 'bg-green-100'
                        : lesson.status === 'current'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {getLessonIcon(lesson.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-500">
                        Lesson {lesson.sequence_order}
                      </span>
                      {lesson.status === 'current' && (
                        <Badge className="bg-blue-600 text-white text-xs">{t('course.current')}</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{lesson.title}</h3>
                  </div>

                  {course.enrollment_id && (
                    <Button
                      onClick={() => onStartLesson(lesson.id)}
                      disabled={lesson.status === 'locked'}
                      className={`${
                        lesson.status === 'current'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : lesson.status === 'completed'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } px-8`}
                    >
                      {getLessonButtonText(lesson.status)}
                    </Button>
                  )}
                </div>
              </Card>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
