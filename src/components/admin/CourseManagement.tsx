'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Eye, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ApprovalModal from './ApprovalModal';
import RejectionModal from './RejectionModal';
import { useRouter } from 'next/navigation';

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
  const [courses, setCourses] = useState<CourseItem[]>([]);
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
        .select('id, title, description, status, created_by, created_at, thumbnail_url')
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

  useEffect(() => { loadCourses() }, []);

  const getFilteredCourses = () => {
    return courses.filter(course => {
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

  const handleReject = async (courseId: string, reason: string) => {
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
  const pendingCount = courses.filter(c => c.status === 'pending_review').length;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Management</h2>
            <p className="text-gray-600">Review and manage all courses on the platform</p>
          </div>
          <button
            onClick={() => router.push('/admin/courses/create')}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700" />
            <p className="text-amber-900">
              <strong>{pendingCount}</strong> course{pendingCount > 1 ? 's' : ''} pending review
            </p>
          </div>
        )}

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
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt="" className="w-16 h-10 rounded object-cover" />
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {course.creator_name}
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
                          onClick={() => router.push(`/admin/courses/${course.id}`)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {course.status === 'pending_review' && (
                          <>
                            <button
                              onClick={() => { setSelectedCourse(course); setShowApprovalModal(true); }}
                              className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => { setSelectedCourse(course); setShowRejectionModal(true); }}
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

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
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
