'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Award, Search, XCircle, Loader2,
  TrendingUp, Users, CheckCircle, ExternalLink,
  RefreshCw, Upload, FileText, MoreVertical, Info, AlertCircle, Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import RevocationModal from './RevocationModal';
import ViewReasonModal from './ViewReasonModal';
import {
  fetchEducatorCertificates,
  fetchEducatorCertStats,
  revokeEducatorCertificate,
  uploadEducatorCustomCertificate,
  fetchEducatorCoursesCertStatus,
  issueCertificate,
  type EducatorCertificate,
  type EducatorCourseCertStatus
} from '@/lib/educator-api';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EducatorCertificateDashboard() {
  const router = useRouter();
  
  // Tab states: unique_certs (My Unique Course Certificates), history ( Roster / History )
  const [activeDashboardTab, setActiveDashboardTab] = useState<'unique_certs' | 'history'>('unique_certs');

  const [coursesStatus, setCoursesStatus] = useState<EducatorCourseCertStatus[]>([]);
  const [certs, setCerts] = useState<EducatorCertificate[]>([]);
  const [stats, setStats] = useState({
    totalIssued: 0,
    valid: 0,
    revoked: 0,
    thisMonth: 0,
    completionRate: 0,
    totalEnrollments: 0,
    completions: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedRevokeCert, setSelectedRevokeCert] = useState<EducatorCertificate | null>(null);
  const [viewReasonCert, setViewReasonCert] = useState<EducatorCertificate | null>(null);
  
  // Issuance and dialog states
  const [issuingCert, setIssuingCert] = useState<{
    enrollmentId: string;
    courseId: string;
    studentName: string;
    courseTitle: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    quizScorePercent: number;
  } | null>(null);
  const [confirmingIssue, setConfirmingIssue] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    studentName: string;
    courseTitle: string;
    referenceCode: string;
  } | null>(null);

  // Modal to view eligible learners for a specific course
  const [viewEligibleCourse, setViewEligibleCourse] = useState<EducatorCourseCertStatus | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      const [certsData, statsData, coursesStatusData] = await Promise.all([
        fetchEducatorCertificates(user.user.id),
        fetchEducatorCertStats(user.user.id),
        fetchEducatorCoursesCertStatus(user.user.id)
      ]);
      
      setCerts(certsData);
      setStats(statsData);
      setCoursesStatus(coursesStatusData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const handleRevoke = async (certId: string, reason: string, scope: 'both' | 'system' | 'custom' = 'both') => {
    setRevokingId(certId);
    try {
      await revokeEducatorCertificate(certId, reason, scope);
      if (scope === 'custom') toast.success('Custom certificate removed');
      else if (scope === 'system') toast.success('System certificate revoked');
      else toast.success('Both certificates revoked');
      
      setSelectedRevokeCert(null);
      loadData();
    } catch {
      toast.error('Failed to revoke certificate');
    } finally {
      setRevokingId(null);
    }
  };

  const handleUpload = async (certId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingId(certId);
    try {
      await uploadEducatorCustomCertificate(certId, file);
      toast.success('Custom certificate uploaded successfully');
      loadData();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || 'Failed to upload custom certificate');
    } finally {
      setUploadingId(null);
      event.target.value = '';
    }
  };

  const handleIssueClick = (student: any, courseTitle: string, courseId: string) => {
    setIssuingCert({
      enrollmentId: student.enrollmentId,
      courseId,
      studentName: student.studentName,
      courseTitle,
      progressPercent: student.progressPercent,
      completedLessons: student.completedLessons,
      totalLessons: student.totalLessons,
      quizScorePercent: student.quizScorePercent,
    });
  };

  const confirmIssuance = async () => {
    if (!issuingCert) return;
    setConfirmingIssue(true);
    try {
      const result = await issueCertificate({
        enrollmentId: issuingCert.enrollmentId,
        courseId: issuingCert.courseId,
        userId: '', // handled server-side
        learnerName: issuingCert.studentName,
        courseTitle: issuingCert.courseTitle,
        educatorName: '', // handled server-side
        skills: [], // handled server-side
        courseDurationHours: 0 // handled server-side
      });
      
      toast.success(`Certificate issued successfully to ${issuingCert.studentName}`);
      
      // Close eligible list view modal if open
      setViewEligibleCourse(null);
      
      // Save result for the success confirmation modal
      setIssuedResult({
        studentName: issuingCert.studentName,
        courseTitle: issuingCert.courseTitle,
        referenceCode: result.referenceCode,
      });

      setIssuingCert(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue certificate');
    } finally {
      setConfirmingIssue(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const uniqueCourses = Array.from(new Set(certs.map(c => c.course_title))).filter(Boolean).sort();

  const filteredCerts = certs.filter(c => {
    const matchSearch =
      c.learner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchCourse = courseFilter === 'all' || c.course_title === courseFilter;
    return matchSearch && matchStatus && matchCourse;
  });

  // Extract all pending/eligible learners awaiting certificate issuance
  const pendingIssuances = coursesStatus.flatMap(c => {
    return c.eligibleStudents
      .filter(s => s.certificateStatus === 'eligible')
      .map(s => ({
        ...s,
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        certificateSettings: c.certificateSettings,
        certificateEnabled: c.certificateEnabled
      }));
  }).sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Certificate Management</h2>
            <p className="text-gray-600 mt-1">Manage and issue unique course certificates for your learners</p>
          </div>
          <Button variant="outline" onClick={loadData} className="gap-2 border-gray-300">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Unique Courses</p>
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {coursesStatus.filter(c => c.certificateEnabled).length}
              <span className="text-sm font-normal text-gray-500">/{coursesStatus.length}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Unique certs enabled</p>
          </div>

          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800 uppercase">Eligible to Issue</p>
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-700">{pendingIssuances.length}</p>
            <p className="text-xs text-amber-800 mt-1">Awaiting your approval</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Issued</p>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalIssued}</p>
            <p className="text-xs text-gray-500 mt-1">+{stats.thisMonth} this month</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Valid & Active</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.valid}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.revoked} revoked</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Completion Rate</p>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-indigo-700">{stats.completionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completions}/{stats.totalEnrollments} finished</p>
          </div>
        </div>

        {/* 🔔 ACTION REQUIRED: Certificates Awaiting Issuance Alert */}
        {pendingIssuances.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-1">🔔 Action Required: Certificates Awaiting Issuance</h3>
                <p className="text-amber-800 text-sm mb-4">
                  {pendingIssuances.length} learner{pendingIssuances.length > 1 ? 's have' : ' has'} completed course requirements and {pendingIssuances.length > 1 ? 'are' : 'is'} eligible for your Unique Certificate.
                </p>
                <div className="bg-white rounded-lg border border-amber-200 divide-y divide-gray-100 overflow-hidden">
                  {pendingIssuances.map((student) => (
                    <div key={student.enrollmentId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 hover:bg-gray-50/50">
                      <div>
                        <div className="font-semibold text-gray-900">{student.studentName}</div>
                        <div className="text-xs text-gray-500">{student.studentEmail}</div>
                        <div className="text-xs text-gray-700 mt-1">
                          Course: <strong className="text-gray-900">{student.courseTitle}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <div className="text-xs text-gray-500">Progress: 100% ({student.completedLessons}/{student.totalLessons} lessons)</div>
                          {student.quizScorePercent !== undefined && (
                            <div className="text-xs text-gray-500">Quiz Average: {student.quizScorePercent}%</div>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleIssueClick(student, student.courseTitle, student.courseId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold rounded-lg text-xs py-2 px-4 h-auto"
                        >
                          Issue Certificate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6 flex gap-6">
          <button
            onClick={() => setActiveDashboardTab('unique_certs')}
            className={`pb-3 font-bold text-sm border-b-2 transition-all ${
              activeDashboardTab === 'unique_certs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Course Certificates ({coursesStatus.length})
          </button>
          <button
            onClick={() => setActiveDashboardTab('history')}
            className={`pb-3 font-bold text-sm border-b-2 transition-all ${
              activeDashboardTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Recently Issued & Roster
          </button>
        </div>

        {/* TAB 1: UNIQUE COURSE CERTIFICATES */}
        {activeDashboardTab === 'unique_certs' && (
          <div className="grid grid-cols-1 gap-6">
            {coursesStatus.map((course) => (
              <Card key={course.courseId} className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{course.courseTitle}</h3>
                      <Badge className={course.certificateEnabled ? 'bg-green-50 text-green-700 border-green-200 border' : 'bg-gray-100 text-gray-600 border border-gray-200'}>
                        {course.certificateEnabled ? 'Unique Certificate Enabled' : 'System Certificate (Auto-Issued)'}
                      </Badge>
                    </div>

                    {!course.certificateEnabled ? (
                      <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200/80 flex items-center justify-between">
                        <span>Standard platform certificate is active for this course. Eligible learners claim it automatically upon completion.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm text-gray-600">
                        <div>
                          <span className="block text-xs text-gray-400 font-medium uppercase">Total Enrolled</span>
                          <span className="text-lg font-bold text-gray-800">{course.totalEnrolled}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-medium uppercase">Total Eligible</span>
                          <span className="text-lg font-bold text-gray-800">{course.eligibleCount}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-medium uppercase text-amber-600">Awaiting Issuance</span>
                          <span className="text-lg font-bold text-amber-600">{course.awaitingCount}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-medium uppercase text-green-600">Issued</span>
                          <span className="text-lg font-bold text-green-600">{course.issuedCount}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/educator/courses/${course.courseId}?tab=certificates`)}
                      className="gap-2 border-gray-300 text-gray-700 rounded-lg text-sm"
                    >
                      <Settings className="w-4 h-4" /> {course.certificateEnabled ? 'Manage Certificate' : 'Enable Unique Cert'}
                    </Button>
                    {course.certificateEnabled && (
                      <Button 
                        onClick={() => setViewEligibleCourse(course)}
                        disabled={course.eligibleCount === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow-sm"
                      >
                        View Eligible Learners
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {coursesStatus.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses found</h3>
                <p className="text-sm text-gray-600">Create a course in your workspace to get started with certificate management.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECENTLY ISSUED & ROSTER */}
        {activeDashboardTab === 'history' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by learner, course, or certificate code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm md:w-64"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="issued">Valid</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>

            {/* Certificates Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Learner</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Certificate ID</th>
                    <th className="px-6 py-4">Issued Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                  {filteredCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {cert.learner_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                          </div>
                          <span className="font-semibold">{cert.learner_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cert.course_title}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {cert.certificate_code}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(cert.issued_at)}
                        {cert.revoked_at && <p className="text-xs text-red-600 mt-0.5">Revoked: {formatDate(cert.revoked_at)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cert.status === 'issued' ? 'bg-green-50 text-green-700 border-green-200 border' : 'bg-red-50 text-red-700 border-red-200 border'}>
                          {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {cert.pdf_url && (
                              <DropdownMenuItem onClick={() => window.open(cert.pdf_url, '_blank')} className="cursor-pointer">
                                <FileText className="w-4 h-4 mr-2" /> View Custom PDF
                              </DropdownMenuItem>
                            )}
                            
                            {cert.status === 'issued' && (
                              <>
                                <DropdownMenuItem asChild>
                                  <label className="cursor-pointer flex items-center w-full">
                                    {uploadingId === cert.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-500" />
                                    ) : (
                                      <Upload className="w-4 h-4 mr-2 text-gray-500" />
                                    )}
                                    {cert.pdf_url ? 'Replace Custom PDF' : 'Upload Custom PDF'}
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      className="hidden"
                                      onChange={(e) => handleUpload(cert.id, e)}
                                      disabled={uploadingId === cert.id}
                                    />
                                  </label>
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => window.open(`/verify/${cert.certificate_code}`, '_blank')} className="cursor-pointer">
                                  <ExternalLink className="w-4 h-4 mr-2" /> Verify Authenticity
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem 
                                  onClick={() => setSelectedRevokeCert(cert)}
                                  disabled={revokingId === cert.id}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                >
                                  {revokingId === cert.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                  )}
                                  Revoke Certificate
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {cert.status === 'revoked' && (
                              <DropdownMenuItem onClick={() => setViewReasonCert(cert)} className="cursor-pointer">
                                <Info className="w-4 h-4 mr-2" /> View Reason
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCerts.length === 0 && (
                <div className="p-12 text-center">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No certificates found</h3>
                  <p className="text-sm text-gray-600">Try adjusting your search query or filters</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* CONFIRMATION BEFORE ISSUING */}
      <Dialog open={issuingCert !== null} onOpenChange={(open) => { if (!open) setIssuingCert(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Issue Unique Certificate?</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Award this unique certificate to the learner for course completion.
            </DialogDescription>
          </DialogHeader>
          {issuingCert && (
            <div className="py-4">
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Learner</span>
                  <span className="font-semibold text-gray-900">{issuingCert.studentName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Course</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[250px] truncate">{issuingCert.courseTitle}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Completion Progress</span>
                  <span className="font-semibold text-green-600">100% ({issuingCert.completedLessons}/{issuingCert.totalLessons} lessons)</span>
                </div>
                {issuingCert.quizScorePercent !== undefined && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Quiz Average Score</span>
                    <span className="font-semibold text-gray-900">{issuingCert.quizScorePercent}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Certificate Type</span>
                  <span className="font-semibold text-blue-600">Unique Course Certificate</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                Confirming will insert the certificate record, notify the learner, and mark their enrollment status as completed.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIssuingCert(null)} className="rounded-lg text-sm border-gray-300">
              Cancel
            </Button>
            <Button 
              onClick={confirmIssuance} 
              disabled={confirmingIssue} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow-sm"
            >
              {confirmingIssue ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" /> : null}
              Issue Certificate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AFTER ISSUANCE SUCCESS MODAL */}
      <Dialog open={issuedResult !== null} onOpenChange={(open) => { if (!open) setIssuedResult(null); }}>
        <DialogContent className="sm:max-w-md text-center py-6">
          <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 text-center">✓ Certificate Issued</DialogTitle>
            <DialogDescription className="text-center mt-2 text-sm text-gray-600 leading-relaxed">
              <strong>{issuedResult?.studentName}</strong> has been awarded the <span className="text-blue-700 font-semibold">{issuedResult?.courseTitle}</span> certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl my-4 text-sm text-center">
            <span className="block text-xs text-gray-400 font-medium mb-1 uppercase">Certificate ID</span>
            <code className="font-mono text-base font-bold text-gray-800">{issuedResult?.referenceCode}</code>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={() => setIssuedResult(null)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 text-sm">
              Close
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                window.open(`/verify/${issuedResult?.referenceCode}`, '_blank');
                setIssuedResult(null);
              }}
              className="border-gray-300 text-gray-700 rounded-lg text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" /> View Certificate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW ELIGIBLE LEARNERS MODAL */}
      <Dialog open={viewEligibleCourse !== null} onOpenChange={(open) => { if (!open) setViewEligibleCourse(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Eligible Learners - {viewEligibleCourse?.courseTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Review completions and issue unique certificates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="bg-white border rounded-xl overflow-hidden divide-y divide-gray-200">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                <div className="col-span-5">Student</div>
                <div className="col-span-4">Progress / Score</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              
              {viewEligibleCourse?.eligibleStudents.map((student) => (
                <div key={student.enrollmentId} className="grid grid-cols-12 items-center px-4 py-4 hover:bg-gray-50/50">
                  <div className="col-span-5">
                    <div className="font-semibold text-gray-900">{student.studentName}</div>
                    <div className="text-xs text-gray-500">{student.studentEmail}</div>
                  </div>
                  
                  <div className="col-span-4 text-xs text-gray-600">
                    <div className="font-semibold text-green-600">Lessons: 100% ({student.completedLessons}/{student.totalLessons})</div>
                    {student.quizScorePercent !== undefined && (
                      <div className="mt-0.5">Quizzes: {student.quizScorePercent}%</div>
                    )}
                  </div>
                  
                  <div className="col-span-3 text-right">
                    {student.certificateStatus === 'issued' ? (
                      <div className="flex items-center justify-end gap-1.5 text-xs text-green-700 font-semibold pr-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Issued
                      </div>
                    ) : (
                      <Button 
                        onClick={() => handleIssueClick(student, viewEligibleCourse.courseTitle, viewEligibleCourse.courseId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs py-1.5 px-3 h-auto shadow-sm"
                      >
                        Issue
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {viewEligibleCourse?.eligibleStudents.length === 0 && (
                <p className="p-8 text-center text-sm text-gray-500">No students are eligible for unique certificates yet.</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setViewEligibleCourse(null)} className="rounded-lg text-sm border-gray-300">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revocation Modal */}
      {selectedRevokeCert && (
        <RevocationModal
          cert={selectedRevokeCert}
          onClose={() => {
            if (!revokingId) setSelectedRevokeCert(null);
          }}
          onRevoke={handleRevoke}
          loading={revokingId !== null}
        />
      )}

      {/* View Revocation Reason Modal */}
      {viewReasonCert && (
        <ViewReasonModal
          cert={viewReasonCert}
          onClose={() => setViewReasonCert(null)}
        />
      )}
    </div>
  );
}
