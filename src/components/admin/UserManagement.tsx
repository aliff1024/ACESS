'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical, UserCog, Power, Trash2, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { ConfirmAction } from '../ui/ConfirmAction';
import { Button } from '../ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import RoleEditModal from './RoleEditModal';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const [sortField, setSortField] = useState<'name' | 'email' | 'role' | 'joined'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [showRoleModal, setShowRoleModal] = useState(false);
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
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
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
    setBulkActionLoading(true);
    try {
      if (action === 'activate') {
        await supabase.from('users').update({ role: 'learner', is_active: true }).in('id', Array.from(selectedUsers));
      } else if (action === 'deactivate') {
        await supabase.from('users').update({ role: 'disabled', is_active: false }).in('id', Array.from(selectedUsers));
      } else if (action === 'delete') {
        await supabase.from('users').update({ deleted_at: new Date().toISOString(), is_active: false }).in('id', Array.from(selectedUsers));
      }
      toast.success(`Bulk ${action} completed successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (err) {
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
        .select('id, full_name, email, role, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err instanceof Error ? err.message : JSON.stringify(err));
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers() }, []);

  useEffect(() => {
    if (!dropdownUserId) return;
    const handler = () => setDropdownUserId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownUserId]);

  const getFilteredUsers = () => {
    let result = users.filter(user => {
      const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
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
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (roleChangeLoading) return;
    setRoleChangeLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setShowRoleModal(false);
      setDropdownUserId(null);
      toast.success('User role updated successfully');
    } catch (err) {
      toast.error('Failed to update role');
      console.error(err);
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    if (toggleLoading) return;
    setToggleLoading(true);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const currentlyActive = user.role !== 'disabled';
    const action = currentlyActive ? 'deactivate' : 'activate';

    try {
      if (currentlyActive) {
        await supabase.from('users').update({ role: 'disabled', is_active: false }).eq('id', userId);
      } else {
        await supabase.from('users').update({ role: 'learner', is_active: true }).eq('id', userId);
      }
      toast.success(`User ${action}d successfully`);
      setConfirmToggleUserId(null);
      loadUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
      console.error(err);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      await supabase.from('users').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', userId);
      toast.success('User deleted');
      setConfirmDeleteUserId(null);
      loadUsers();
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'educator': return 'bg-blue-100 text-blue-700';
      case 'learner': return 'bg-green-100 text-green-700';
      case 'disabled': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">User Management</h2>
          <p className="text-gray-600">Manage user accounts and permissions across the platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Active Users</p>
            <p className="text-3xl font-bold text-green-600">
              {users.filter(u => u.role !== 'disabled').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Educators</p>
            <p className="text-3xl font-bold text-blue-600">
              {users.filter(u => u.role === 'educator').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Learners</p>
            <p className="text-3xl font-bold text-purple-600">
              {users.filter(u => u.role === 'learner').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="learner">Learners</option>
              <option value="educator">Educators</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 flex items-center justify-between">
            <span className="text-blue-700 font-medium">{selectedUsers.size} users selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleBulkAction('activate')} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {bulkActionLoading ? 'Processing...' : 'Activate Selected'}
              </Button>
              <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleBulkAction('deactivate')} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {bulkActionLoading ? 'Processing...' : 'Deactivate Selected'}
              </Button>
              <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleBulkAction('delete')} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {bulkActionLoading ? 'Processing...' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('email')}>
                    <div className="flex items-center gap-1">Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('role')}>
                    <div className="flex items-center gap-1">Role {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('joined')}>
                    <div className="flex items-center gap-1">Joined {sortField === 'joined' && (sortOrder === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedUsers.has(user.id) ? 'bg-blue-50/50' : ''}`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {(user.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{user.full_name || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDropdownUserId(dropdownUserId === user.id ? null : user.id); }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>

                      {dropdownUserId === user.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDropdownUserId(null); router.push(`/admin/users/${user.id}`); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Profile
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDropdownUserId(null); setShowRoleModal(true); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserCog className="w-4 h-4" />
                            Edit Role
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDropdownUserId(null); setConfirmToggleUserId(user.id); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Power className="w-4 h-4" />
                            {user.role === 'disabled' ? 'Activate' : 'Deactivate'}
                          </button>
                          <hr className="my-2" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setDropdownUserId(null); setConfirmDeleteUserId(user.id); }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Role Edit Modal */}
      {showRoleModal && dropdownUserId && (
        <RoleEditModal
          user={users.find(u => u.id === dropdownUserId)!}
          onClose={() => { if (!roleChangeLoading) { setShowRoleModal(false); setDropdownUserId(null); } }}
          onSave={handleRoleChange}
          loading={roleChangeLoading}
        />
      )}

      {/* Confirm Toggle Status */}
      {confirmToggleUserId && (() => {
        const u = users.find(u => u.id === confirmToggleUserId);
        if (!u) return null;
        const activating = u.role === 'disabled';
        return (
          <ConfirmAction
            title={activating ? 'Activate User' : 'Deactivate User'}
            description={`Are you sure you want to ${activating ? 'activate' : 'deactivate'} ${u.full_name || u.email}?`}
            confirmText={activating ? 'Activate' : 'Deactivate'}
            confirmClassName={activating ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            onConfirm={() => handleToggleStatus(confirmToggleUserId)}
            open={true}
            onOpenChange={(o) => { if (!o && !toggleLoading) setConfirmToggleUserId(null); }}
            loading={toggleLoading}
            loadingText={activating ? 'Activating...' : 'Deactivating...'}
          />
        );
      })()}

      {/* Confirm Delete User */}
      {confirmDeleteUserId && (() => {
        const u = users.find(u => u.id === confirmDeleteUserId);
        if (!u) return null;
        return (
          <ConfirmAction
            title="Delete User"
            description={`Are you sure you want to permanently delete ${u.full_name || u.email}? This action cannot be undone.`}
            confirmText="Delete"
            confirmClassName="bg-red-600 hover:bg-red-700 text-white"
            icon={<Trash2 className="w-5 h-5 text-red-600" />}
            onConfirm={() => handleDeleteUser(confirmDeleteUserId)}
            open={true}
            onOpenChange={(o) => { if (!o && !deleteLoading) setConfirmDeleteUserId(null); }}
            loading={deleteLoading}
            loadingText="Deleting..."
          />
        );
      })()}
    </div>
  );
}
