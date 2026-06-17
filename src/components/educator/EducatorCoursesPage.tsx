'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Users, BookOpen, Loader2, Edit2, Trash2, Globe, EyeOff, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchCourses, deleteCourse, updateCourseStatus } from '@/lib/educator-api';
import type { CourseSummary, CourseStatus } from '@/lib/educator-api';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function EducatorCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'enrollments' | 'alphabetical'>('latest');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const data = await fetchCourses(user.user.id);
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses() }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCourse(deleteId);
      toast.success('Course deleted');
      setCourses((prev) => prev.filter((c) => c.id !== deleteId));
    } catch (err) {
      toast.error('Failed to delete course');
      console.error(err);
    } finally {
      setDeleteId(null);
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updateCourseStatus(courseId, newStatus as CourseStatus);
      toast.success(newStatus === 'published' ? 'Course published!' : 'Course unpublished');
      loadCourses();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const getFilteredCourses = () => {
    let filtered = [...courses];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'latest':
        filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'enrollments':
        filtered.sort((a, b) => b.students - a.students);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-500 animate-pulse">Loading courses...</p>
      </div>
    );
  }

  const filteredCourses = getFilteredCourses();

  // Gradients for visually distinct course banners
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Courses</h1>
          <p className="text-gray-500 mt-1">Design, manage, and monitor your educational content</p>
        </div>
        <Button
          onClick={() => router.push('/educator/courses/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Filters and Search Area */}
      <Card className="p-4 border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            >
              <option value="latest">Last Updated</option>
              <option value="enrollments">Most Students</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-16 border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-3xl text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {courses.length === 0 
              ? "You haven't created any courses yet. Get started by building your first curriculum."
              : "We couldn't find any courses matching your current filters."}
          </p>
          {courses.length === 0 ? (
            <Button onClick={() => router.push('/educator/courses/create')} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create First Course
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => {
            const gradient = gradients[index % gradients.length];
            return (
              <Card key={course.id} className="border-0 shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden hover:shadow-xl hover:ring-blue-300 transition-all group flex flex-col h-full">
                {/* Course Banner */}
                <div className={`h-24 bg-gradient-to-r ${gradient} relative`}>
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className={`shadow-sm backdrop-blur-md bg-white/90 ${course.status === 'published' ? 'text-green-700' : 'text-yellow-700'}`}>
                      {course.status === 'published' ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1" title={course.title}>
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    {course.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium text-gray-600 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="flex items-center gap-1.5" title="Students Enrolled">
                      <Users className="w-4 h-4 text-blue-500" /> {course.students}
                    </span>
                    <div className="w-px h-4 bg-gray-300" />
                    <span className="flex items-center gap-1.5" title="Total Lessons">
                      <BookOpen className="w-4 h-4 text-purple-500" /> {course.lessons}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-gray-400 mb-4">
                    <Clock className="w-3 h-3 mr-1" /> Updated {formatDate(course.lastUpdated)}
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button 
                      variant="outline" 
                      className="border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      onClick={() => router.push(`/educator/courses/${course.id}`)}
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                    </Button>

                    <Button 
                      variant="outline" 
                      className={`border-gray-200 ${course.status === 'published' ? 'text-orange-600 hover:bg-orange-50 hover:border-orange-200' : 'text-green-600 hover:bg-green-50 hover:border-green-200'}`}
                      onClick={() => handleTogglePublish(course.id, course.status)}
                    >
                      {course.status === 'published' ? (
                        <><EyeOff className="w-4 h-4 mr-1.5" /> Unpublish</>
                      ) : (
                        <><Globe className="w-4 h-4 mr-1.5" /> Publish</>
                      )}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="col-span-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8">
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Course
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Course</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{course.title}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => {
                              setDeleteId(course.id);
                              // We use a small timeout to allow the modal to close before state update triggers re-render 
                              // which sometimes interrupts the animation
                              setTimeout(handleDelete, 10);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                          >
                            Yes, delete course
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
