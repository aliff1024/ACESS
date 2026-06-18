'use client';

import { useState } from 'react';
import { LayoutDashboard, BookOpen, BookMarked, Heart, TrendingUp, Award, Settings, LogOut, ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useTranslation } from '@/lib/useTranslation';
import { Logo } from '@/components/ui/Logo';

interface SubItem {
  id: string;
  key: string;
  icon: typeof BookOpen;
}

interface MenuItem {
  id: string;
  key: string;
  icon: typeof BookOpen;
  subItems?: SubItem[];
}

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onAccessibilityClick: () => void;
}

function isCoursesView(view: string): boolean {
  return view === 'courses' || view === 'courses_enrolled' || view === 'courses_favorites';
}

export function Sidebar({ activeView, onNavigate, onAccessibilityClick }: SidebarProps) {
  const { t } = useTranslation();
  const [coursesOpen, setCoursesOpen] = useState(isCoursesView(activeView));

  const menuItems: MenuItem[] = [
    { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
    {
      id: 'courses',
      key: 'nav.myCourses',
      icon: BookOpen,
      subItems: [
        { id: 'courses', key: 'nav.allCourses', icon: BookOpen },
        { id: 'courses_enrolled', key: 'nav.enrolled', icon: BookMarked },
        { id: 'courses_favorites', key: 'nav.favourites', icon: Heart },
      ],
    },
    { id: 'progress', key: 'nav.progress', icon: TrendingUp },
    { id: 'certificates', key: 'nav.achievements', icon: Trophy },
    { id: 'accessibility', key: 'nav.accessibility', icon: Settings },
  ];

  const handleClick = (item: MenuItem) => {
    if (item.id === 'accessibility') {
      onAccessibilityClick();
    } else if (item.subItems) {
      setCoursesOpen(!coursesOpen);
    } else {
      onNavigate(item.id);
    }
  };

  const isActive = (id: string) => activeView === id;
  const isCoursesActive = isCoursesView(activeView);

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 shadow-xl z-20">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-gray-800 dark">
        <Logo href="/learner" size="md" showSubtitle subtitle="Learner Portal" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSub = !!item.subItems;
          const isParentActive = isCoursesActive && hasSub;
          const isItemActive = isActive(item.id) && !hasSub;

          return (
            <div key={item.id}>
              <button
                onClick={() => handleClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group font-medium ${
                  isParentActive
                    ? 'bg-gray-800 text-white ring-1 ring-white/10'
                    : isItemActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 hover:ring-1 hover:ring-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{t(item.key)}</span>
                {hasSub && (
                  <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
                    {coursesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                )}
              </button>

              {/* Sub-menu */}
              {hasSub && coursesOpen && (
                <div className="ml-4 mt-2 space-y-1.5 pl-4 border-l-2 border-gray-700">
                  {item.subItems!.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = isActive(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate(sub.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium ${
                          isSubActive
                            ? 'bg-gray-800 text-blue-400 ring-1 ring-blue-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }`}
                      >
                        <SubIcon className="w-4 h-4 shrink-0" />
                        <span>{t(sub.key)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <LogoutButton asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:ring-1 hover:ring-red-500/20 transition-all duration-300 font-medium text-sm">
            <LogOut className="w-5 h-5" />
            <span>{t('topbar.logout')}</span>
          </button>
        </LogoutButton>
      </div>
    </aside>
  );
}
