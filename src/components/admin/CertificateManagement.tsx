'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, XCircle, Award, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchAdminCertificates, revokeCertificate } from '@/lib/admin-api';
import type { AdminCertificate } from '@/lib/admin-api';

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
      toast.error('Failed to load certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCertificates() }, []);

  const handleRevoke = async (cert: AdminCertificate) => {
    const reason = prompt(`Enter reason for revoking certificate for ${cert.learner_name}:`);
    if (!reason) return;
    try {
      await revokeCertificate(cert.id, reason);
      toast.success('Certificate revoked');
      loadCertificates();
    } catch {
      toast.error('Failed to revoke certificate');
    }
  };

  const getFilteredCertificates = () => {
    return certificates.filter(cert => {
      const matchesSearch = cert.learner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            cert.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            cert.certificate_code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredCertificates = getFilteredCertificates();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Certificate Management</h2>
          <p className="text-gray-600">Manage and verify course completion certificates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Issued</p>
            <p className="text-3xl font-bold text-gray-900">{certificates.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Valid</p>
            <p className="text-3xl font-bold text-green-600">
              {certificates.filter(c => c.status === 'issued').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Revoked</p>
            <p className="text-3xl font-bold text-red-600">
              {certificates.filter(c => c.status === 'revoked').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-3xl font-bold text-blue-600">
              {certificates.filter(c => {
                const certDate = new Date(c.issued_at);
                const now = new Date();
                return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by learner, course, or certificate code..."
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
              <option value="issued">Valid</option>
              <option value="revoked">Revoked</option>
            </select>
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {cert.learner_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{cert.learner_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{cert.course_title}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{cert.certificate_code}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(cert.issued_at)}
                    {cert.revoked_at && (
                      <p className="text-xs text-red-600 mt-1">Revoked: {formatDate(cert.revoked_at)}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cert.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      {cert.status === 'issued' && (
                        <button
                          onClick={() => handleRevoke(cert)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCertificates.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No certificates found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
