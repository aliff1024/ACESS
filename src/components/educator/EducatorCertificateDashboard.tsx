'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Award, Search, XCircle, Loader2,
  TrendingUp, Users, CheckCircle, ExternalLink,
  RefreshCw, Upload, FileText, MoreVertical, Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import RevocationModal from './RevocationModal';
import ViewReasonModal from './ViewReasonModal';
import {
  fetchEducatorCertificates,
  fetchEducatorCertStats,
  revokeEducatorCertificate,
  uploadEducatorCustomCertificate
} from '@/lib/educator-api';
import { supabase } from '@/lib/supabase';
import type { EducatorCertificate } from '@/lib/educator-api';

export default function EducatorCertificateDashboard() {
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

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const [certsData, statsData] = await Promise.all([
        fetchEducatorCertificates(user.user.id),
        fetchEducatorCertStats(user.user.id),
      ]);
      setCerts(certsData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData() }, []);

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
    } catch (err: Record<string, unknown>) {
      toast.error(err.message || 'Failed to upload custom certificate');
    } finally {
      setUploadingId(null);
      // Reset input value so the same file can be selected again if needed
      event.target.value = '';
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const uniqueCourses = Array.from(new Set(certs.map(c => c.course_title))).filter(Boolean).sort();

  const filtered = certs.filter(c => {
    const matchSearch =
      c.learner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchCourse = courseFilter === 'all' || c.course_title === courseFilter;
    return matchSearch && matchStatus && matchCourse;
  });

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
            <p className="text-gray-600 mt-1">Manage certificates for your courses</p>
          </div>
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Issued</p>
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalIssued}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Valid</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.valid}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Revoked</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">This Month</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.thisMonth}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completion Rate</p>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.completionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completions}/{stats.totalEnrollments}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by learner, course, or certificate code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white md:w-64"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="issued">Valid</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {/* Certificates Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {cert.learner_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{cert.learner_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{cert.course_title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{cert.certificate_code}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(cert.issued_at)}
                    {cert.revoked_at && <p className="text-xs text-red-600 mt-0.5">Revoked: {formatDate(cert.revoked_at)}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={cert.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                    </Badge>
                  </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
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
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No certificates found</h3>
              <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
      
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

      {viewReasonCert && (
        <ViewReasonModal
          cert={viewReasonCert}
          onClose={() => setViewReasonCert(null)}
        />
      )}
    </div>
  );
}
