'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

interface RoleEditModalProps {
  user: { id: string; full_name: string; email: string; role: string };
  onClose: () => void;
  onSave: (userId: string, newRole: string) => void;
}

export default function RoleEditModal({ user, onClose, onSave }: RoleEditModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);

  const handleSave = () => {
    onSave(user.id, selectedRole);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit User Role</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-1">User</p>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Select Role</label>
            <div className="space-y-3">
              {(['learner', 'educator', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedRole === role ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900 capitalize mb-1">{role}</p>
                  <p className="text-sm text-gray-600">
                    {role === 'learner' && 'Can enroll in courses and earn certificates'}
                    {role === 'educator' && 'Can create and manage courses'}
                    {role === 'admin' && 'Full platform access and control'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {selectedRole === 'admin' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-medium">⚠️ Warning</p>
              <p className="text-sm text-red-800 mt-1">Admin role grants full system access. Use with caution.</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
