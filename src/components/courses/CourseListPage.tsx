
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Filter, BookOpen, Loader2, Heart, Shield, Crown, Star, User, Clock, Users, ArrowLeft, PlayCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { fetchAvailableCourses, fetchEnrolledCourses, toggleFavorite, fetchFavoriteCourseIds } from '@/lib/learner-api';
import type { AvailableCourse, EnrolledCourse } from '@/lib/learner-api';
import { useTranslation } from '@/lib/useTranslation';
import { toast } from 'sonner';

interface CourseListPageProps {
  onViewCourse: (courseId: string) => void;
  onBack: () => void;
}

const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];
const categories = ['All', 'Programming', 'Business', 'Design', 'Marketing', 'Science', 'Math', 'Language'];

// Helper to debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function CourseListPage({ onViewCourse, onBack }: CourseListPageProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  
  const [allCourses, setAllCourses] = useState<(AvailableCourse | EnrolledCourse)[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>(filterParam === 'enrolled' ? 'Enrolled' : 'All');
  const [courseType, setCourseType] = useState<string>('All');
  const [requireGuided, setRequireGuided] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [durationFilter, setDurationFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Favorites state
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
        ];
        
        // Remove duplicates by ID, prioritizing enrolled ones
        const uniqueCourses = Array.from(new Map(combined.map(item => [item.id, item])).values());
        
        setAllCourses(uniqueCourses);
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
      toast.success(nowFav ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorites');
    } finally {
      setToggling(null);
    }
  };

  const processedCourses = useMemo(() => {
    let result = allCourses.filter((course) => {
      const isEnrolled = 'isEnrolled' in course && course.isEnrolled;
      const lessonCount = isEnrolled ? (course as EnrolledCourse).total_lessons : (course as AvailableCourse).lesson_count;
      
      // Search Filter
      const tags = (course as any).tags as string[] | undefined;
      const matchesSearch = course.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        course.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tags && tags.some(t => t.toLowerCase().includes(debouncedSearch.toLowerCase())));
        
      // Difficulty Filter
      const matchesDifficulty = selectedDifficulty === 'All' ||
        course.difficulty_level?.toLowerCase() === selectedDifficulty.toLowerCase();
        
      // Enrollment Filter
      const matchesEnrollment = enrollmentStatus === 'All' || 
        (enrollmentStatus === 'Enrolled' && isEnrolled) || 
        (enrollmentStatus === 'Not Enrolled' && !isEnrolled);

      // Course Type Filter
      const matchesType = courseType === 'All' || 
        (courseType === 'Featured' && course.system_course) || 
        (courseType === 'Community' && !course.system_course);

      // Accessibility Filter
      const matchesGuided = !requireGuided || (course as any).guided_learning_enabled;
      
      // Category Filter (Mock mapping if category is null)
      const courseCat = course.category || 'Programming'; // fallback
      const matchesCategory = selectedCategory === 'All' || courseCat.toLowerCase() === selectedCategory.toLowerCase();

      // Favorites Filter
      const matchesFavorites = !showFavoritesOnly || favoriteIds.has(course.id);
      
      // Duration Filter (Assuming 20 mins per lesson)
      const estMinutes = lessonCount * 20;
      let matchesDuration = true;
      if (durationFilter === '<1h') matchesDuration = estMinutes < 60;
      if (durationFilter === '1-3h') matchesDuration = estMinutes >= 60 && estMinutes <= 180;
      if (durationFilter === '>3h') matchesDuration = estMinutes > 180;

      return matchesSearch && matchesDifficulty && matchesEnrollment && matchesType && matchesGuided && matchesCategory && matchesFavorites && matchesDuration;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'oldest') {
        return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
      } else {
        // newest (default)
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

    return result;
  }, [allCourses, debouncedSearch, selectedDifficulty, enrollmentStatus, courseType, requireGuided, selectedCategory, showFavoritesOnly, durationFilter, sortBy, favoriteIds]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">Loading course catalog...</p>
      </div>
    );
  }

  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-400 to-teal-500',
    'from-orange-400 to-rose-500',
    'from-cyan-400 to-blue-500'
  ];
  
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('All');
    setEnrollmentStatus('All');
    setCourseType('All');
    setRequireGuided(false);
    setSelectedCategory('All');
    setShowFavoritesOnly(false);
    setDurationFilter('All');
    setSortBy('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
          Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Browse Courses</h1>
            <p className="text-lg text-gray-500 font-medium">Discover new skills and add them to your learning path.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`rounded-full transition-colors ${showFavoritesOnly ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} /> 
              {showFavoritesOnly ? 'Favorites Only' : 'Show Favorites'}
            </Button>
          </div>
        </div>
      </div>

      {/* Categories Pill Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              selectedCategory === cat 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Premium Filter Command Center */}
      <Card className="p-6 bg-white rounded-3xl border-0 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-4">
          {/* Main Search Bar & Quick Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search courses by title or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-gray-50/50 border-gray-200 rounded-xl focus-visible:ring-blue-500 focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="alphabetical">Sort by: A-Z</option>
              </select>
              <Button 
                variant="outline" 
                className="h-12 px-4 rounded-xl border-gray-200"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                Advanced Filters
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-2 text-gray-400" /> : <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />}
              </Button>
            </div>
          </div>

          {/* Collapsible Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</Label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Levels</option>
                  {difficultyLevels.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</Label>
                <select
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Enrolled">Enrolled Only</option>
                  <option value="Not Enrolled">Not Enrolled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</Label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Course Types</option>
                  <option value="Featured">Featured / System</option>
                  <option value="Community">Community / Educator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</Label>
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">Any Duration</option>
                  <option value="<1h">Under 1 Hour</option>
                  <option value="1-3h">1 - 3 Hours</option>
                  <option value=">3h">Over 3 Hours</option>
                </select>
              </div>

              <div className="lg:col-span-4 flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <div>
                    <Label className="text-sm font-semibold text-indigo-900 cursor-pointer block" onClick={() => setRequireGuided(!requireGuided)}>Guided Learning Only</Label>
                    <span className="text-xs text-indigo-700/70">Show courses that support guided checkpoints and accessibility modes</span>
                  </div>
                </div>
                <Switch checked={requireGuided} onCheckedChange={setRequireGuided} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Course Grid */}
      {processedCourses.length === 0 ? (
        <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
          <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No courses match your filters</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            We couldn't find any courses matching your specific combination of search terms and filters.
          </p>
          <Button variant="outline" onClick={resetFilters}>
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {processedCourses.map((course, index) => {
            const isEnrolled = 'isEnrolled' in course && course.isEnrolled;
            const progress = isEnrolled ? (course as EnrolledCourse).progress : undefined;
            const lessonCount = isEnrolled ? (course as EnrolledCourse).total_lessons : (course as AvailableCourse).lesson_count;
            const isFav = favoriteIds.has(course.id);
            const isSys = course.system_course;
            const gradient = gradients[index % gradients.length];
            const diffLvl = course.difficulty_level || 'beginner';
            const courseCategory = course.category || 'Programming';

            return (
              <Card
                key={course.id}
                className="border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:ring-blue-300 transition-all group flex flex-col h-full"
              >
                {/* Course Banner */}
                <div 
                  className={`h-36 bg-cover bg-center relative ${!course.thumbnail_url ? 'bg-gradient-to-r ' + gradient : ''}`}
                  style={course.thumbnail_url ? { backgroundImage: `url(${course.thumbnail_url})` } : {}}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10 group-hover:from-black/70 transition-colors" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {isEnrolled && (
                      <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 shadow-sm font-semibold px-2.5">
                        Enrolled
                      </Badge>
                    )}
                    {isSys && (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white border-0 shadow-sm font-semibold flex items-center gap-1 px-2.5">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </Badge>
                    )}
                  </div>
                  
                  {/* Favorite Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(course.id); }}
                    disabled={toggling === course.id}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md shadow-sm transition-transform hover:scale-110 ${
                      isFav ? 'bg-red-50 text-red-500' : 'bg-white/20 text-white hover:bg-white/40'
                    }`}
                  >
                    {toggling === course.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Category & Difficulty Badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="outline" className={`capitalize shadow-sm ${
                      diffLvl.toLowerCase() === 'beginner' ? 'border-green-200 text-green-700 bg-green-50' :
                      diffLvl.toLowerCase() === 'intermediate' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                      'border-red-200 text-red-700 bg-red-50'
                    }`}>
                      {diffLvl}
                    </Badge>
                    <span className="text-xs font-semibold text-gray-400">{courseCategory}</span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    {isSys ? (
                      <><Shield className="w-4 h-4 text-indigo-500" /> <span className="font-medium text-gray-700">ACESS System</span></>
                    ) : (
                      <><User className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-700">{(course as any).educator_name || 'Community'}</span></>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-5 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" /> {lessonCount} Lessons
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" /> {lessonCount * 20} min
                    </span>
                    {(course as any).guided_learning_enabled && (
                      <>
                        <div className="w-px h-3 bg-gray-300" />
                        <span className="flex items-center gap-1.5 text-indigo-600">
                          <Sparkles className="w-3.5 h-3.5" /> Guided
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto space-y-4">
                    {isEnrolled && progress !== undefined && (
                      <div>
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                          <span className="text-sm font-extrabold text-gray-900">{progress}%</span>
                        </div>
                        <Progress 
                          value={progress} 
                          className="h-2 bg-gray-100" 
                        />
                      </div>
                    )}
                    
                    <Button 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-sm h-11"
                      onClick={() => onViewCourse(course.id)}
                    >
                      {isEnrolled ? (
                        progress === 100 ? 'Review Course' : 'Resume Learning'
                      ) : (
                        'View Details'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
