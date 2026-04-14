'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { GraduationCap, UserCheck, Shield } from 'lucide-react';

interface DemoRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'learner' | 'educator' | 'admin') => void;
}

export function DemoRoleModal({ isOpen, onClose, onSelectRole }: DemoRoleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center mb-2">Explore as:</DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-lg">
            Choose a role to explore the ACESS platform demo
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <button
            onClick={() => onSelectRole('learner')}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <GraduationCap className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Learner</h3>
            <p className="text-sm text-gray-600 text-center">
              Experience adaptive learning and accessible courses
            </p>
          </button>

          <button
            onClick={() => onSelectRole('educator')}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
          >
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <UserCheck className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Educator</h3>
            <p className="text-sm text-gray-600 text-center">
              Create and manage accessible course content
            </p>
          </button>

          <button
            onClick={() => onSelectRole('admin')}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <Shield className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin</h3>
            <p className="text-sm text-gray-600 text-center">
              Manage platform settings and user accounts
            </p>
          </button>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={onClose} className="text-gray-600">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
