'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Filter, BookOpen, Loader2, Heart, Shield, Award, Crown, Star, User, Clock, Users } from 'lucide-react';
import { Progress } from '../ui/progress';
import { fetchAvailableCourses, fetchEnrolledCourses, toggleFavorite, fetchFavoriteCourseIds } from '@/lib/learner-api';
import type { AvailableCourse, EnrolledCourse } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';
import { toast } from 'sonner';

interface CourseListPageProps {
  onViewCourse: (courseId: string) => void;
  onBack: () => void;
}

const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];
const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export function CourseListPage({ onViewCourse, onBack }: CourseListPageProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [allCourses, setAllCourses] = useState<(AvailableCourse | EnrolledCourse)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAvailableCourses(),
      fetchEnrolledCourses(),
      fetchFavoriteCourseIds(),
    ])
      .then(([available, enrolled, ids]) => {
        const combined = [
          ...enrolled.map((e) => ({ ...e, isEnrolled: true as const })),
          ...available,
        ]
        setAllCourses(combined);
        setFavoriteIds(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFavorite = async (courseId: string) => {
    setToggling(courseId);
    try {
      const nowFav = await toggleFavorite(courseId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nowFav) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
      toast.success(nowFav ? 'Added to favourites' : 'Removed from favourites');
    } catch {
      toast.error('Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'All' ||
      course.difficulty_level?.toLowerCase() === selectedDifficulty.toLowerCase();
    const matchesEnrolled = filterParam !== 'enrolled' || ('isEnrolled' in course && course.isEnrolled);
    return matchesSearch && matchesDifficulty && matchesEnrolled;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            &larr; {t('course.backToDashboard')}
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('course.browse')}</h1>
          <p className="text-xl text-gray-600">{t('course.browse')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder={t('course.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="h-12 px-4 rounded-lg border border-gray-300 text-gray-900 bg-white"
                >
                  <option value="All">{t('course.allLevels')}</option>
                  {difficultyLevels.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isEnrolled = 'isEnrolled' in course && course.isEnrolled;
            const progress = isEnrolled ? (course as EnrolledCourse).progress : undefined;
            const lessonCount = isEnrolled
              ? (course as EnrolledCourse).total_lessons
              : (course as AvailableCourse).lesson_count;
            const diffKey = course.difficulty_level?.toLowerCase() || 'beginner';
            const isFav = favoriteIds.has(course.id);
            const isSys = course.system_course;
            const hasCert = course.certificate_enabled;
            const earnedCert = isEnrolled && (course as EnrolledCourse).has_certificate;

            return (
              <Card
                key={course.id}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col relative overflow-hidden ${
                  isSys
                    ? 'border-indigo-300 hover:border-indigo-400 hover:shadow-xl bg-gradient-to-br from-white to-indigo-50/40'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                }`}
              >
                {isSys && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(course.id); }}
                  disabled={toggling === course.id}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all"
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
                </button>

                {'thumbnail_url' in course && course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                ) : (
                  <div className={`w-full h-40 rounded-lg mb-4 flex items-center justify-center ${
                    isSys ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-blue-100'
                  }`}>
                    {isSys ? <Crown className="w-16 h-16 text-indigo-600" /> : <BookOpen className="w-16 h-16 text-blue-600" />}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge className={`${difficultyColors[diffKey] || difficultyColors.beginner} border`}>
                    {course.difficulty_level || 'Beginner'}
                  </Badge>
                  {course.category && (
                    <Badge variant="outline" className="text-gray-600">
                      {course.category}
                    </Badge>
                  )}
                  {isEnrolled && (
                    <Badge className="bg-blue-600 text-white">{t('course.enrolled')}</Badge>
                  )}
                  {isSys && (
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  {hasCert && !earnedCert && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Earn Certificate
                    </Badge>
                  )}
                  {earnedCert && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Certified
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-snug">
                  {course.title}
                </h3>

                <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{lessonCount} {t('course.lessons')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{course.creator_name || 'Educator'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.student_count ?? 0} enrolled</span>
                  </div>
                  {course.updated_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Updated {new Date(course.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {'tags' in course && course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {course.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {course.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{course.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('course.progress')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {hasCert && !earnedCert && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Award className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-amber-600 font-medium">
                          {progress >= 100 ? 'Ready to claim certificate' : 'Certificate at 100% completion'}
                        </span>
                      </div>
                    )}
                    {earnedCert && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Award className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] text-green-600 font-medium">Certificate earned</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto">
                  <Button
                    onClick={() => onViewCourse(course.id)}
                    className={`w-full text-white ${
                      isSys
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isEnrolled ? (isSys ? 'Continue' : t('course.continueCourse')) : (isSys ? 'View Course' : t('course.viewCourse'))}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('course.noCourses')}</h3>
            <p className="text-gray-600">{t('course.adjustFilters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
