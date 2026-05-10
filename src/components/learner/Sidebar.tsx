'use client';

import { useState } from 'react';
import { LayoutDashboard, BookOpen, BookMarked, Heart, TrendingUp, Award, Settings, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
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
    { id: 'certificates', key: 'nav.certificates', icon: Award },
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-gray-100">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isParentActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : isItemActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                <div className="ml-4 mt-1 space-y-1 pl-4 border-l-2 border-blue-100">
                  {item.subItems!.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = isActive(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate(sub.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                          isSubActive
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
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
      <div className="p-3 border-t border-gray-100">
        <LogoutButton asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm">
            <LogOut className="w-4 h-4" />
            <span>{t('topbar.logout')}</span>
          </button>
        </LogoutButton>
      </div>
    </aside>
  );
}
