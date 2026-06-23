'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Eye, Loader2, Plus, BookOpen, Shield, Settings, Archive, Copy, Users, TrendingUp, AlertTriangle, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ConfirmAction } from '../ui/ConfirmAction';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ApprovalModal from './ApprovalModal';
import RejectionModal from './RejectionModal';
import { useRouter } from 'next/navigation';
import { ADMIN_CREATE_SYSTEM_COURSE_PATH } from '@/lib/admin-routes';
import { fetchAllAdminCourses, archiveSystemCourse, duplicateSystemCourse } from '@/lib/admin-api';
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
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAdminCourses();
      setCourses(data.educatorCourses || []);
      setSystemCourses(data.systemCourses || []);
      setSystemStats(data.systemStats || null);
    } catch (err) {
      console.error('Failed to load courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
    if (approving) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve course');
      }

      toast.success('Course approved and published');
      setShowApprovalModal(false);
      setSelectedCourse(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve course');
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (courseId: string, reason: string) => {
    if (rejecting) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', reason })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reject course');
      }

      toast.success('Course rejected and returned to draft');
      setShowRejectionModal(false);
      setSelectedCourse(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject course');
      console.error(err);
    } finally {
      setRejecting(false);
    }
  };

  const handleArchiveSystem = async (courseId: string) => {
    if (archiving) return;
    setArchiving(true);
    try {
      await archiveSystemCourse(courseId);
      toast.success('Course archived successfully');
      await loadData();
    } catch {
      toast.error('Failed to archive');
    } finally {
      setArchiving(false);
    }
  };

  const handleDuplicateSystem = async (courseId: string) => {
    if (duplicating) return;
    setDuplicating(courseId);
    try {
      const newId = await duplicateSystemCourse(courseId);
      toast.success('Course duplicated successfully');
      await loadData();
      router.push(`/admin/courses/${newId}`);
    } catch {
      toast.error('Failed to duplicate');
    } finally {
      setDuplicating(null);
    }
  };

  const handlePublishSystem = async (courseId: string) => {
    if (publishing) return;
    setPublishing(courseId);
    try {
      await supabase
        .from('courses')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', courseId);
      toast.success('Course published successfully');
      await loadData();
    } catch {
      toast.error('Failed to publish');
    } finally {
      setPublishing(null);
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
              <option value="pending_review">Pending Approval</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* ── Educator Courses Table ── */}
        {activeTab === 'educator' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
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
                        <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{course.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-xs">{course.description}</p>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}`)} className="cursor-pointer text-blue-600">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {course.status === 'pending_review' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedCourse(course); setShowApprovalModal(true); }} className="cursor-pointer text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedCourse(course); setShowRejectionModal(true); }} className="cursor-pointer text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
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
                          <p className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[200px]">{course.title}</p>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            System
                          </span>
                          {course.guided_learning_enabled && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              Guided
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-xs mt-1">{course.description}</p>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}`)} className="cursor-pointer text-blue-600">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}?tab=settings`)} className="cursor-pointer text-gray-700">
                              <Settings className="w-4 h-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {course.status !== 'published' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (publishing !== course.id) handlePublishSystem(course.id);
                                }} 
                                disabled={publishing === course.id}
                                className="cursor-pointer text-green-600"
                              >
                                {publishing === course.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                if (duplicating !== course.id) handleDuplicateSystem(course.id);
                              }} 
                              disabled={duplicating === course.id}
                              className="cursor-pointer text-blue-600"
                            >
                              {duplicating === course.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                              Duplicate
                            </DropdownMenuItem>
                            {course.status !== 'archived' && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <ConfirmAction
                                  title="Archive System Course"
                                  description="Archive this system course? Learners will no longer see it."
                                  confirmText="Archive"
                                  confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                                  icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                  onConfirm={() => handleArchiveSystem(course.id)}
                                  loading={archiving}
                                  loadingText="Archiving..."
                                >
                                  <div className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 text-red-600 rounded-sm w-full outline-none transition-colors">
                                    <Archive className="w-4 h-4 mr-2" />
                                    Archive
                                  </div>
                                </ConfirmAction>
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          onClose={() => { if (!approving) { setShowApprovalModal(false); setSelectedCourse(null); } }}
          onApprove={handleApprove}
          loading={approving}
        />
      )}

      {showRejectionModal && selectedCourse && (
        <RejectionModal
          course={selectedCourse}
          onClose={() => { if (!rejecting) { setShowRejectionModal(false); setSelectedCourse(null); } }}
          onReject={handleReject}
          loading={rejecting}
        />
      )}
    </div>
  );
}
