'use client';

import { LayoutDashboard, BookOpen, Plus, BarChart3, Users, LogOut, Award } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Logo } from '@/components/ui/Logo';

interface EducatorSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function EducatorSidebar({ activeView, onNavigate }: EducatorSidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'create', label: 'Create Course', icon: Plus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'students', label: 'Students Progress', icon: Users },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Logo href="/educator" size="md" showSubtitle subtitle="Educator Portal" />
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-purple-50 text-purple-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <LogoutButton asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </LogoutButton>
      </div>
    </aside>
  );
}
