'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Users, Loader2, Clock, AlertTriangle, UserX, Activity, Mail, Send, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { fetchCourseStudentsProgress, type CourseStudentProgress } from '@/lib/educator-api';
import { sendEducatorNotification } from '@/lib/educator-analytics-api';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface StudentProgressViewProps {
  courseId: string;
  courseTitle: string;
}

export default function StudentProgressView({ courseId, courseTitle }: StudentProgressViewProps) {
  const [enrollments, setEnrollments] = useState<CourseStudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Messaging state
  const [messageStudentId, setMessageStudentId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const data = await fetchCourseStudentsProgress(courseId);
        setEnrollments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEnrollments();
  }, [courseId]);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const name = (e.studentName || '').toLowerCase();
      const email = (e.studentEmail || '').toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [enrollments, searchQuery, statusFilter]);

  const formatTimeSpent = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messageStudentId) return;
    try {
      setIsSending(true);
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await sendEducatorNotification(messageStudentId, user.user.id, messageText, 'message');
        setMessageText('');
        setMessageStudentId(null);
        alert('Message sent to student successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Stats
  const activeCount = enrollments.filter(e => e.status === 'active' || e.status === 'on-track').length;
  const atRiskCount = enrollments.filter(e => e.status === 'at-risk').length;
  const inactiveCount = enrollments.filter(e => e.status === 'inactive').length;
  
  const avgProgress = enrollments.length > 0 
    ? Math.round(enrollments.reduce((acc, e) => acc + e.progressPercent, 0) / enrollments.length) 
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="w-[96%] max-w-[1500px] mx-auto py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Student Monitoring</h2>
        <p className="text-gray-500">Track progress, identify at-risk learners, and communicate directly within {courseTitle}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Enrolled</p>
              <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Progress</p>
              <p className="text-2xl font-bold text-gray-900">{avgProgress}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-800">At-Risk Students</p>
              <p className="text-2xl font-bold text-orange-900">{atRiskCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-red-200 bg-red-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Inactive &gt; 14 Days</p>
              <p className="text-2xl font-bold text-red-900">{inactiveCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Student List</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search students..." 
                className="pl-9 w-full sm:w-64 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="At-Risk">At Risk</option>
              <option value="Inactive">Inactive</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No enrollments found</h3>
            <p className="text-gray-500">No students match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time & Score</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0">
                          {row.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors truncate max-w-[150px]">{row.studentName}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[150px]">{row.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[100px]">
                          <Progress value={row.progressPercent} className="h-2" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{row.progressPercent}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{row.completedLessons} / {row.totalLessons} lessons</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{formatTimeSpent(row.timeSpentSeconds)}</div>
                      <div className="text-xs text-gray-500 mt-1">Avg Score: {row.avgScore}%</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="whitespace-nowrap">
                          {row.lastActive ? formatDistanceToNow(new Date(row.lastActive), { addSuffix: true }) : 'Never'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === 'at-risk' && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                        </Badge>
                      )}
                      {row.status === 'inactive' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <UserX className="w-3 h-3 mr-1" /> Inactive
                        </Badge>
                      )}
                      {(row.status === 'active' || row.status === 'on-track') && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Active
                        </Badge>
                      )}
                      {row.status === 'completed' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Completed
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {messageStudentId === row.studentId ? (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-200 p-3 rounded-lg flex items-center gap-2 w-72">
                            <Input 
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Type a message..."
                              className="h-8 text-sm"
                            />
                            <Button 
                              size="sm" 
                              onClick={handleSendMessage}
                              disabled={isSending || !messageText.trim()}
                              className="h-8 bg-purple-600 hover:bg-purple-700 shrink-0"
                            >
                              {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setMessageStudentId(null)}
                              className="h-8 text-gray-500"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                              onClick={() => setMessageStudentId(row.studentId)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Link href={`/educator/students/${row.studentId}`}>
                              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                Profile <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
