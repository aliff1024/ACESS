'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, BookOpen, Loader2, Shield, Award, Crown, Star, User, Clock, Users, BookMarked, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AllCourse {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  category: string | null;
  tags: string[];
  lesson_count: number;
  thumbnail_url: string | null;
  course_type: string;
  system_course: boolean;
  certificate_enabled?: boolean;
  creator_name?: string;
  created_by?: string;
  student_count?: number;
  updated_at?: string;
}

const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];

export function EducatorAllCoursesPage() {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<AllCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [authorType, setAuthorType] = useState<string>('All');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, title, description, difficulty_level, category, 
          thumbnail_url, course_type, system_course, certificate_enabled,
          updated_at, created_by
        `)
        .in('status', ['published'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const courseIds = (data || []).map((c) => c.id);
      const creatorIds = [...new Set((data || []).map((c) => c.created_by).filter(Boolean))];

      // Fetch lesson counts
      let lessonCounts = new Map<string, number>();
      let enrollmentCounts = new Map<string, number>();
      let creatorNames = new Map<string, string>();
      let tagsMap = new Map<string, string[]>();

      if (courseIds.length > 0) {
        const [{ data: lessons }, { data: enrollments }, { data: tags }] = await Promise.all([
          supabase.from('lessons').select('course_id').in('course_id', courseIds),
          supabase.from('enrollments').select('course_id').in('course_id', courseIds),
          supabase.from('course_tags').select('course_id, tag').in('course_id', courseIds),
        ]);

        if (lessons) {
          for (const l of lessons) lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1);
        }
        if (enrollments) {
          for (const e of enrollments) enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) || 0) + 1);
        }
        if (tags) {
          for (const t of tags) {
            const existing = tagsMap.get(t.course_id) || [];
            existing.push(t.tag);
            tagsMap.set(t.course_id, existing);
          }
        }
      }

      if (creatorIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', creatorIds);
        if (users) {
          for (const u of users) creatorNames.set(u.id, u.full_name || 'Unknown');
        }
      }

      const courses: AllCourse[] = (data || []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        difficulty_level: c.difficulty_level || 'beginner',
        category: c.category,
        tags: tagsMap.get(c.id) || [],
        lesson_count: lessonCounts.get(c.id) || 0,
        thumbnail_url: c.thumbnail_url,
        course_type: c.course_type,
        system_course: c.system_course || false,
        certificate_enabled: c.certificate_enabled || false,
        creator_name: creatorNames.get(c.created_by) || 'System',
        created_by: c.created_by,
        student_count: enrollmentCounts.get(c.id) || 0,
        updated_at: c.updated_at,
      }));

      setAllCourses(courses);
    } catch (err) {
      console.error('Failed to load courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesDifficulty = selectedDifficulty === 'All' ||
      course.difficulty_level?.toLowerCase() === selectedDifficulty.toLowerCase();
      
    const matchesAuthor = authorType === 'All' ||
      (authorType === 'Mine' && course.created_by === currentUserId) ||
      (authorType === 'Community' && !course.system_course && course.created_by !== currentUserId) ||
      (authorType === 'System' && course.system_course);

    return matchesSearch && matchesDifficulty && matchesAuthor;
  });

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">Loading all community courses...</p>
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">All Courses</h1>
        <p className="text-lg text-gray-500 font-medium">Explore the entire course catalog from all educators and system authors.</p>
      </div>

      {/* Premium Filter Command Center */}
      <Card className="p-6 bg-white rounded-3xl border-0 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-6">
          {/* Main Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <Input
              placeholder="Search courses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-gray-50/50 border-gray-200 rounded-2xl focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</Label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Levels</option>
                {difficultyLevels.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Author Type</Label>
              <select
                value={authorType}
                onChange={(e) => setAuthorType(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Authors</option>
                <option value="Mine">My Courses</option>
                <option value="Community">Other Educators</option>
                <option value="System">Featured / System</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
          <BookMarked className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            We couldn't find any courses matching your filters.
          </p>
          <Button 
            variant="outline" 
            onClick={() => { setSearchQuery(''); setSelectedDifficulty('All'); setAuthorType('All'); }}
          >
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course, index) => {
            const gradient = gradients[index % gradients.length];
            const diffLvl = course.difficulty_level || 'beginner';
            const isMine = course.created_by === currentUserId;

            return (
              <Card
                key={course.id}
                className="border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:ring-blue-300 transition-all group flex flex-col h-full"
              >
                {/* Course Banner */}
                <div 
                  className={`h-36 bg-cover bg-center relative ${!course.thumbnail_url ? `bg-gradient-to-r ${gradient}` : ''}`}
                  style={course.thumbnail_url ? { backgroundImage: `url(${course.thumbnail_url})` } : {}}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10 group-hover:from-black/70 transition-colors" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {course.system_course && (
                      <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white border-0 shadow-sm font-semibold flex items-center gap-1 px-2.5">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </Badge>
                    )}
                    {isMine && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 shadow-sm font-semibold flex items-center gap-1 px-2.5">
                        <User className="w-3 h-3" /> My Course
                      </Badge>
                    )}
                  </div>
                  
                  {/* Bottom Right Info */}
                  {course.certificate_enabled && (
                    <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md text-yellow-400 p-1.5 rounded-full shadow-sm">
                      <Award className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Difficulty Badge */}
                  <div className="mb-3">
                    <Badge variant="outline" className={`capitalize shadow-sm ${
                      diffLvl.toLowerCase() === 'beginner' ? 'border-green-200 text-green-700 bg-green-50' :
                      diffLvl.toLowerCase() === 'intermediate' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                      'border-red-200 text-red-700 bg-red-50'
                    }`}>
                      {diffLvl}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    {course.system_course ? (
                      <><Shield className="w-4 h-4 text-indigo-500" /> <span className="font-medium text-gray-700">ACESS System</span></>
                    ) : (
                      <><User className="w-4 h-4 text-blue-500" /> <span className="font-medium text-gray-700">{isMine ? 'You' : course.creator_name}</span></>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" /> {course.lesson_count} Lessons
                    </span>
                    <div className="w-px h-3 bg-gray-300" />
                    <span className="flex items-center gap-1.5 text-indigo-500">
                      <Users className="w-3.5 h-3.5" /> {course.student_count || 0} Students
                    </span>
                  </div>

                  <div className="mt-auto pt-2">
                    <Button
                      onClick={() => router.push(`/educator/courses/${course.id}`)}
                      className="w-full h-11 bg-gray-900 hover:bg-blue-600 text-white font-medium shadow-sm transition-all group-hover:shadow-lg group-hover:-translate-y-0.5"
                    >
                      View Details <ArrowRight className="w-4 h-4 ml-2" />
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