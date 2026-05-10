'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface EnrolledStudent {
  id: string;
  status: string;
  created_at: string;
  user_id: string;
  users: { full_name: string; email: string } | null;
}

interface StudentProgressViewProps {
  courseId: string;
  courseTitle: string;
}

export default function StudentProgressView({ courseId, courseTitle }: StudentProgressViewProps) {
  const [enrollments, setEnrollments] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('enrollments')
          .select('*, users!left(*)')
          .eq('course_id', courseId);
        setEnrollments(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEnrollments();
  }, [courseId]);

  const filtered = enrollments.filter((e) => {
    const name = (e.users?.full_name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Progress</h2>
        <p className="text-sm text-gray-600">{courseTitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Enrolled</p>
          <p className="text-3xl font-bold text-gray-900">{enrollments.length}</p>
        </Card>
        <Card className="p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Course ID</p>
          <p className="text-sm font-mono text-gray-700 break-all">{courseId}</p>
        </Card>
        <Card className="p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="text-3xl font-bold text-gray-900">Active</p>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search students by name..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((enrollment: EnrolledStudent) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {(enrollment.users?.full_name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{enrollment.users?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{enrollment.users?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {enrollment.created_at ? new Date(enrollment.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(enrollment)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="p-12 border-2 border-dashed border-gray-300 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No enrolled students yet</h3>
          <p className="text-gray-500">Students will appear here once they enroll in your course.</p>
        </Card>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {(selectedStudent.users?.full_name || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedStudent.users?.full_name || 'Unknown'}</h3>
                <p className="text-gray-600">{selectedStudent.users?.email || ''}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div><strong>Joined:</strong> {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : '-'}</div>
              <div><strong>Enrollment ID:</strong> <span className="font-mono">{selectedStudent.id}</span></div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end">
              <Button onClick={() => setSelectedStudent(null)} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
