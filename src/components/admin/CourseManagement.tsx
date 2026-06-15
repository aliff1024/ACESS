'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Eye, Loader2, Plus, BookOpen, Shield, Settings, Archive, Copy, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { ConfirmAction } from '../ui/ConfirmAction';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ApprovalModal from './ApprovalModal';
import RejectionModal from './RejectionModal';
import { useRouter } from 'next/navigation';
import { ADMIN_CREATE_SYSTEM_COURSE_PATH } from '@/lib/admin-routes';
import { fetchSystemCourses, fetchSystemCourseStats, archiveSystemCourse, duplicateSystemCourse } from '@/lib/admin-api';
import type { SystemCourseItem, SystemCourseStats } from '@/lib/admin-api';

type TabType = 'educator' | 'system';

interface CourseItem {
  id: string;
  title: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  thumbnail_url?: string | null;
  creator_name?: string;
  creator_email?: string;
}

export default function CourseManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('educator');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [systemCourses, setSystemCourses] = useState<SystemCourseItem[]>([]);
  const [systemStats, setSystemStats] = useState<SystemCourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, status, created_by, created_at, thumbnail_url, course_type')
        .eq('course_type', 'educator')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const creatorIds = [...new Set((coursesData || []).map(c => c.created_by).filter(Boolean))];

      const userMap = new Map<string, { name: string; email: string }>();
      if (creatorIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', creatorIds);

        for (const u of usersData || []) {
          userMap.set(u.id, { name: u.full_name || 'Unknown', email: u.email || '' });
        }
      }

      const enriched = (coursesData || []).map(c => ({
        ...c,
        creator_name: userMap.get(c.created_by)?.name || 'Unknown',
        creator_email: userMap.get(c.created_by)?.email || '',
      }));

      setCourses(enriched);
    } catch (err) {
      console.error('Failed to load courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemCourses = async () => {
    try {
      const [courses, stats] = await Promise.all([
        fetchSystemCourses(),
        fetchSystemCourseStats(),
      ]);
      setSystemCourses(courses);
      setSystemStats(stats);
    } catch {
      toast.error('Failed to load system courses');
    }
  };

  useEffect(() => {
    loadCourses();
    loadSystemCourses();
  }, []);

  const getFilteredCourses = () => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (course.creator_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredSystemCourses = () => {
    return systemCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (course.creator_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const handleApprove = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Course approved and published');
      setShowApprovalModal(false);
      setSelectedCourse(null);
      loadCourses();
    } catch (err) {
      toast.error('Failed to approve course');
      console.error(err);
    }
  };

  const handleReject = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'draft' })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Course rejected and returned to draft');
      setShowRejectionModal(false);
      setSelectedCourse(null);
      loadCourses();
    } catch (err) {
      toast.error('Failed to reject course');
      console.error(err);
    }
  };

  const handleArchiveSystem = async (courseId: string) => {
    try {
      await archiveSystemCourse(courseId);
      toast.success('Course archived');
      loadSystemCourses();
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleDuplicateSystem = async (courseId: string) => {
    try {
      const newId = await duplicateSystemCourse(courseId);
      toast.success('Course duplicated');
      loadSystemCourses();
      router.push(`/admin/courses/${newId}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handlePublishSystem = async (courseId: string) => {
    try {
      await supabase
        .from('courses')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', courseId);
      toast.success('Course published');
      loadSystemCourses();
    } catch {
      toast.error('Failed to publish');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'pending_review': return { color: 'bg-amber-100 text-amber-700', icon: Clock };
      case 'draft': return { color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
      case 'archived': return { color: 'bg-red-100 text-red-700', icon: XCircle };
      default: return { color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredCourses = getFilteredCourses();
  const filteredSystemCourses = getFilteredSystemCourses();
  const pendingCount = courses.filter(c => c.status === 'pending_review').length;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Management</h2>
            <p className="text-gray-600">Review and manage all courses on the platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(ADMIN_CREATE_SYSTEM_COURSE_PATH)}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Create System Course
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('educator')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'educator'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Educator Courses
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{courses.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'system'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-5 h-5" />
            Official System Courses
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{systemCourses.length}</span>
          </button>
        </div>

        {/* ── Pending Alert (Educator tab only) ── */}
        {activeTab === 'educator' && pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700" />
            <p className="text-amber-900">
              <strong>{pendingCount}</strong> course{pendingCount > 1 ? 's' : ''} pending review
            </p>
          </div>
        )}

        {/* ── System Course Stats ── */}
        {activeTab === 'system' && systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Total System Courses</p>
              <p className="text-3xl font-bold text-purple-600">{systemStats.totalSystemCourses}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Total Enrollments</p>
              <p className="text-3xl font-bold text-blue-600">{systemStats.totalEnrollments}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Active Learners</p>
              <p className="text-3xl font-bold text-green-600">{systemStats.activeLearners}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Most Enrolled</p>
              <p className="text-3xl font-bold text-amber-600">
                {systemStats.mostEnrolled[0]?.enrollments ?? 0}
              </p>
              <p className="text-xs text-gray-500 truncate">{systemStats.mostEnrolled[0]?.title ?? 'N/A'}</p>
            </div>
          </div>
        )}

        {/* ── Stats (Educator tab) ── */}
        {activeTab === 'educator' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Published</p>
              <p className="text-3xl font-bold text-green-600">
                {courses.filter(c => c.status === 'published').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Draft</p>
              <p className="text-3xl font-bold text-gray-600">
                {courses.filter(c => c.status === 'draft').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">Pending Review</p>
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by course title or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* ── Educator Courses Table ── */}
        {activeTab === 'educator' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thumbnail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCourses.map((course) => {
                  const badge = getStatusBadge(course.status);
                  const StatusIcon = badge.icon;

                  return (
                    <tr key={course.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/courses/${course.id}`)}>
                      <td className="px-6 py-4">
                        {course.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail_url} alt={course.title} className="w-16 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-16 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">N/A</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{course.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{course.description}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                          {course.creator_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {course.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(course.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${course.id}`); }}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {course.status === 'pending_review' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowApprovalModal(true); }}
                                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowRejectionModal(true); }}
                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── System Courses Table ── */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thumbnail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSystemCourses.map((course) => {
                  const badge = getStatusBadge(course.status);
                  const StatusIcon = badge.icon;

                  return (
                    <tr key={course.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/courses/${course.id}`)}>
                      <td className="px-6 py-4">
                        {course.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail_url} alt={course.title} className="w-16 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-16 h-10 rounded bg-purple-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{course.title}</p>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            System
                          </span>
                          {course.guided_learning_enabled && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              Guided
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-xs mt-1">{course.description}</p>
                        {course.recommended_age_group && (
                          <p className="text-xs text-gray-400 mt-1">Age: {course.recommended_age_group}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full w-fit">
                            Official Course
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full w-fit">
                            Built-in
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="w-3 h-3" />
                          {course.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {course.total_enrollments ?? 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(course.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${course.id}`); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {course.status !== 'published' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePublishSystem(course.id); }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Publish"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateSystem(course.id); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {course.status !== 'archived' && (
                            <span onClick={(e) => e.stopPropagation()}>
                              <ConfirmAction
                                title="Archive System Course"
                                description="Archive this system course? Learners will no longer see it."
                                confirmText="Archive"
                                confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                                icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                onConfirm={() => handleArchiveSystem(course.id)}
                              >
                                <button
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Archive"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              </ConfirmAction>
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${course.id}?tab=settings`); }}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Empty states ── */}
        {activeTab === 'educator' && filteredCourses.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}

        {activeTab === 'system' && filteredSystemCourses.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No system courses yet</h3>
            <p className="text-gray-600 mb-4">Create official built-in courses for the platform</p>
            <button
              onClick={() => router.push(ADMIN_CREATE_SYSTEM_COURSE_PATH)}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create System Course
            </button>
          </div>
        )}

        {/* ── System Course Most Enrolled Sidebar ── */}
        {activeTab === 'system' && systemStats && systemStats.mostEnrolled.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Most Enrolled System Courses
            </h3>
            <div className="space-y-3">
              {systemStats.mostEnrolled.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">{item.title}</span>
                  <span className="text-sm text-gray-600 flex items-center gap-1 ml-4">
                    <Users className="w-3.5 h-3.5" />
                    {item.enrollments}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showApprovalModal && selectedCourse && (
        <ApprovalModal
          course={selectedCourse}
          onClose={() => { setShowApprovalModal(false); setSelectedCourse(null); }}
          onApprove={handleApprove}
        />
      )}

      {showRejectionModal && selectedCourse && (
        <RejectionModal
          course={selectedCourse}
          onClose={() => { setShowRejectionModal(false); setSelectedCourse(null); }}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
