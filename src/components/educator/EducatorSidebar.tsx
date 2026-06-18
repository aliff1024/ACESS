'use client';

import { useState } from 'react';
import { LayoutDashboard, BookOpen, Plus, BarChart3, Users, LogOut, Award, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Logo } from '@/components/ui/Logo';

interface EducatorSidebarProps {
  activeView: string;
  activeSubView?: string;
  onNavigate: (view: string) => void;
}

export function EducatorSidebar({ activeView, activeSubView, onNavigate }: EducatorSidebarProps) {
  const [coursesExpanded, setCoursesExpanded] = useState(
    activeView === 'courses' || activeView === 'courses-all' || activeView === 'courses-create'
  );

  const isCoursesActive = activeView === 'courses' || activeView === 'courses-all' || activeView === 'courses-create';
  const isMyCoursesActive = activeView === 'courses';
  const isAllCoursesActive = activeView === 'courses-all';
  const isCreateActive = activeView === 'courses-create';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'courses',
      label: 'Courses',
      icon: BookOpen,
      expanded: coursesExpanded,
      onToggle: () => setCoursesExpanded(!coursesExpanded),
      subItems: [
        { id: 'courses-all', label: 'All Courses', icon: Globe },
        { id: 'courses', label: 'My Courses', icon: BookOpen },
        { id: 'courses-create', label: 'Add Course', icon: Plus },
      ],
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'students', label: 'Students Progress', icon: Users },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 shadow-xl z-20">
      <div className="p-6 border-b border-gray-800 dark">
        <Logo href="/educator" size="md" showSubtitle subtitle="Educator Portal" />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const hasSubItems = 'subItems' in item && item.subItems;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasSubItems) {
                    item.onToggle?.();
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                  isActive && !hasSubItems
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-900/50'
                    : isCoursesActive && hasSubItems
                    ? 'bg-gray-800 text-white ring-1 ring-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 hover:ring-1 hover:ring-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {hasSubItems && (
                  coursesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {hasSubItems && coursesExpanded && (
                <div className="ml-4 mt-2 space-y-1.5 pl-4 border-l-2 border-gray-700">
                  {item.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = sub.id === 'courses' ? isMyCoursesActive :
                                        sub.id === 'courses-all' ? isAllCoursesActive :
                                        sub.id === 'courses-create' ? isCreateActive : false;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate(sub.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium ${
                          isSubActive
                            ? 'bg-gray-800 text-purple-400 ring-1 ring-purple-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }`}
                      >
                        <SubIcon className="w-4 h-4 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <LogoutButton asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:ring-1 hover:ring-red-500/20 transition-all duration-300 font-medium">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </LogoutButton>
      </div>
    </aside>
  );
}