'use client';

import { useState, useEffect } from 'react';
import { Search, MoreVertical, UserCog, Power, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { ConfirmAction } from '../ui/ConfirmAction';
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);
  const [confirmToggleUserId, setConfirmToggleUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

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
    return users.filter(user => {
      const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
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
    }
  };

  const handleToggleStatus = async (userId: string) => {
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
      loadUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await supabase.from('users').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', userId);
      toast.success('User deleted');
      loadUsers();
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
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

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
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
                            onClick={() => { setDropdownUserId(null); setShowRoleModal(true); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserCog className="w-4 h-4" />
                            Edit Role
                          </button>
                          <button
                            onClick={() => { setDropdownUserId(null); setConfirmToggleUserId(user.id); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Power className="w-4 h-4" />
                            {user.role === 'disabled' ? 'Activate' : 'Deactivate'}
                          </button>
                          <hr className="my-2" />
                          <button
                            onClick={() => { setDropdownUserId(null); setConfirmDeleteUserId(user.id); }}
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
          onClose={() => { setShowRoleModal(false); setDropdownUserId(null); }}
          onSave={handleRoleChange}
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
            onConfirm={() => { handleToggleStatus(confirmToggleUserId); setConfirmToggleUserId(null); }}
            open={true}
            onOpenChange={(o) => { if (!o) setConfirmToggleUserId(null); }}
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
            onConfirm={() => { handleDeleteUser(confirmDeleteUserId); setConfirmDeleteUserId(null); }}
            open={true}
            onOpenChange={(o) => { if (!o) setConfirmDeleteUserId(null); }}
          />
        );
      })()}
    </div>
  );
}
