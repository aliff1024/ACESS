'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, MoreVertical, UserCog, Power, Trash2, Loader2,
  AlertTriangle, Eye, Users, UserCheck, UserX, Shield,
  GraduationCap, BookOpen, RefreshCw
} from 'lucide-react';
import { ConfirmAction } from '../ui/ConfirmAction';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import RoleEditModal from './RoleEditModal';
import { useAuth } from '@/providers/AuthProvider';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sortField, setSortField] = useState<'name' | 'email' | 'role' | 'joined'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [roleModalUserId, setRoleModalUserId] = useState<string | null>(null);
  const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);
  const [confirmToggleUserId, setConfirmToggleUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const toggleSort = (field: 'name' | 'email' | 'role' | 'joined') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.size === 0 || bulkActionLoading) return;

    let targets = Array.from(selectedUsers);
    if (action !== 'activate' && currentUser && targets.includes(currentUser.id)) {
      targets = targets.filter((id) => id !== currentUser.id);
      toast.info('Your own account was excluded from this action.');
      if (targets.length === 0) return;
    }

    setBulkActionLoading(true);
    try {
      if (action === 'activate') {
        await Promise.all(
          targets.map((id) =>
            fetch(`/api/admin/users/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_active: true }),
            })
          )
        );
      } else if (action === 'deactivate') {
        await Promise.all(
          targets.map((id) =>
            fetch(`/api/admin/users/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_active: false }),
            })
          )
        );
      } else if (action === 'delete') {
        await Promise.all(
          targets.map((id) =>
            fetch(`/api/admin/users/${id}`, {
              method: 'DELETE',
            })
          )
        );
      }
      toast.success(`Bulk ${action} completed successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to perform bulk ${action}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!dropdownUserId) return;
    const handler = () => setDropdownUserId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownUserId]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (roleChangeLoading) return;
    setRoleChangeLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setRoleModalUserId(null);
      toast.success('User role updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
      console.error(err);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    if (toggleLoading) return;
    setToggleLoading(true);
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const currentlyActive = user.is_active;
    const action = currentlyActive ? 'deactivate' : 'activate';

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentlyActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user`);

      toast.success(`User ${action}d successfully`);
      setConfirmToggleUserId(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} user`);
      console.error(err);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      toast.success('User deleted successfully');
      setConfirmDeleteUserId(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter((user) => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = user.is_active;
      else if (statusFilter === 'disabled') matchesStatus = !user.is_active;

      return matchesSearch && matchesRole && matchesStatus;
    });

    result = result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'name':
          valA = a.full_name?.toLowerCase() || '';
          valB = b.full_name?.toLowerCase() || '';
          break;
        case 'email':
          valA = a.email?.toLowerCase() || '';
          valB = b.email?.toLowerCase() || '';
          break;
        case 'role':
          valA = a.role || '';
          valB = b.role || '';
          break;
        case 'joined':
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortOrder]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      disabled: users.filter((u) => !u.is_active).length,
      learners: users.filter((u) => u.role === 'learner').length,
      educators: users.filter((u) => u.role === 'educator').length,
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [users]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'educator':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'learner':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-xs text-gray-500 font-medium">Loading user directory...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Directory and administrative control center for all platform accounts.
          </p>
        </div>
        <Button variant="outline" onClick={loadUsers} className="gap-2 border-gray-300 w-fit">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <span className="text-xs font-semibold text-gray-400 uppercase">Total Users</span>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{summary.total}</p>
          <span className="text-[11px] text-gray-500">Platform roster</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-green-200 bg-green-50/40">
          <span className="text-xs font-semibold text-green-800 uppercase">Active Accounts</span>
          <p className="text-2xl font-bold text-green-700 mt-0.5">{summary.active}</p>
          <span className="text-[11px] text-green-800">Enabled access</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-red-200 bg-red-50/40">
          <span className="text-xs font-semibold text-red-800 uppercase">Suspended</span>
          <p className="text-2xl font-bold text-red-700 mt-0.5">{summary.disabled}</p>
          <span className="text-[11px] text-red-800">Access disabled</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/40">
          <span className="text-xs font-semibold text-blue-800 uppercase">Learners</span>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{summary.learners}</p>
          <span className="text-[11px] text-blue-800">Enrolled students</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-teal-200 bg-teal-50/40">
          <span className="text-xs font-semibold text-teal-800 uppercase">Educators</span>
          <p className="text-2xl font-bold text-teal-700 mt-0.5">{summary.educators}</p>
          <span className="text-[11px] text-teal-800">Course instructors</span>
        </Card>

        <Card className="p-4 rounded-xl border-0 shadow-sm ring-1 ring-purple-200 bg-purple-50/40">
          <span className="text-xs font-semibold text-purple-800 uppercase">Admins</span>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{summary.admins}</p>
          <span className="text-[11px] text-purple-800">System managers</span>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="learner">Learners</option>
            <option value="educator">Educators</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Enabled)</option>
            <option value="disabled">Suspended (Disabled)</option>
          </select>
        </div>
      </Card>

      {/* Bulk Action Strip */}
      {selectedUsers.size > 0 && (
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-purple-900 font-semibold">{selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50 text-xs h-8"
              onClick={() => handleBulkAction('activate')}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Activate Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs h-8"
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Deactivate Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50 text-xs h-8"
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">User {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('role')}>
                  <div className="flex items-center gap-1">Role {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('joined')}>
                  <div className="flex items-center gap-1">Joined {sortField === 'joined' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
              {filteredUsers.map((user) => {
                const initials = (user.full_name || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50/60 cursor-pointer transition-colors group ${
                      selectedUsers.has(user.id) ? 'bg-purple-50/40' : ''
                    }`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {user.full_name || 'Unknown Name'}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={`border text-xs capitalize ${getRoleBadgeStyle(user.role)}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {user.is_active ? (
                        <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                          Suspended
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDropdownUserId(dropdownUserId === user.id ? null : user.id)}
                          aria-label="User actions"
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownUserId === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-20 text-xs animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => {
                                setDropdownUserId(null);
                                router.push(`/admin/users/${user.id}`);
                              }}
                              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Detailed Profile
                            </button>
                            <button
                              onClick={() => {
                                setDropdownUserId(null);
                                setRoleModalUserId(user.id);
                              }}
                              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 font-medium"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                              Change Role
                            </button>

                            {user.id !== currentUser?.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    setDropdownUserId(null);
                                    setConfirmToggleUserId(user.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 font-medium"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                  {user.is_active ? 'Suspend Account' : 'Activate Account'}
                                </button>
                                <hr className="my-1 border-gray-100" />
                                <button
                                  onClick={() => {
                                    setDropdownUserId(null);
                                    setConfirmDeleteUserId(user.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete User
                                </button>
                              </>
                            ) : (
                              <p className="px-4 py-2 text-[11px] text-gray-400 italic">Current logged-in user</p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-gray-900">No users match your criteria</h3>
            <p className="text-xs text-gray-500 mt-0.5">Try clearing or broadening your search and filter parameters.</p>
          </div>
        )}
      </Card>

      {/* Role Edit Modal */}
      {roleModalUserId && (() => {
        const u = users.find((u) => u.id === roleModalUserId);
        if (!u) return null;
        return (
          <RoleEditModal
            user={u}
            onClose={() => {
              if (!roleChangeLoading) setRoleModalUserId(null);
            }}
            onSave={handleRoleChange}
            loading={roleChangeLoading}
          />
        );
      })()}

      {/* Confirm Toggle Status */}
      {confirmToggleUserId && (() => {
        const u = users.find((u) => u.id === confirmToggleUserId);
        if (!u) return null;
        const activating = !u.is_active;
        return (
          <ConfirmAction
            title={activating ? 'Activate User Account' : 'Suspend User Account'}
            description={
              activating
                ? `Are you sure you want to restore access for ${u.full_name || u.email}?`
                : `Are you sure you want to suspend ${u.full_name || u.email}? They will be immediately blocked from signing in.`
            }
            confirmText={activating ? 'Activate' : 'Suspend Account'}
            confirmClassName={
              activating
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            onConfirm={() => handleToggleStatus(confirmToggleUserId)}
            open={true}
            onOpenChange={(o) => {
              if (!o && !toggleLoading) setConfirmToggleUserId(null);
            }}
            loading={toggleLoading}
            loadingText={activating ? 'Activating...' : 'Suspending...'}
          />
        );
      })()}

      {/* Confirm Delete User */}
      {confirmDeleteUserId && (() => {
        const u = users.find((u) => u.id === confirmDeleteUserId);
        if (!u) return null;
        return (
          <ConfirmAction
            title="Delete User Account"
            description={`Are you sure you want to permanently delete ${u.full_name || u.email}? All account access will be revoked.`}
            confirmText="Delete Account"
            confirmClassName="bg-red-600 hover:bg-red-700 text-white"
            icon={<Trash2 className="w-5 h-5 text-red-600" />}
            onConfirm={() => handleDeleteUser(confirmDeleteUserId)}
            open={true}
            onOpenChange={(o) => {
              if (!o && !deleteLoading) setConfirmDeleteUserId(null);
            }}
            loading={deleteLoading}
            loadingText="Deleting..."
          />
        );
      })()}
    </div>
  );
}
