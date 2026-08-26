'use client';

import { useState, useMemo } from 'react';
import { LayoutDashboard, BookOpen, BookMarked, Heart, TrendingUp, Award, Settings, LogOut, ChevronDown, ChevronRight, Trophy, Calculator, Compass, Clock, Map } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useTranslation } from '@/lib/useTranslation';
import { Logo } from '@/components/ui/Logo';
import { useAccessibility } from '@/providers/AccessibilityProvider';

interface SubItem {
  id: string;
  key: string;
  icon: any;
  labelOverride?: string;
}

interface MenuItem {
  id: string;
  key: string;
  icon: any;
  subItems?: SubItem[];
  labelOverride?: string;
}

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onAccessibilityClick: () => void;
  className?: string;
}

/**
 * The real URL behind each sidebar view id.
 *
 * Every navigation item used to be a <button> with an onClick that called
 * router.push(). That meant none of them were links: no middle-click or
 * open-in-new-tab, no status-bar URL preview, no "copy link address", and a
 * screen reader announced site navigation as "button" rather than "link" —
 * on a product whose entire purpose is accessibility. Items that genuinely
 * are buttons (the collapsible Courses group, and Accessibility, which opens
 * a dialog rather than navigating) stay buttons.
 */
const VIEW_HREF: Record<string, string> = {
  dashboard: '/learner',
  courses: '/learner/courses',
  courses_enrolled: '/learner/courses?filter=enrolled',
  courses_favorites: '/learner/favorites',
  progress: '/learner/progress',
  // Achievements and Certificates were two entries pointing at two pages that
  // were both titled "My Achievements" and both showed a level, badges and
  // certificates. One destination, with tabs inside it, is the honest shape.
  achievements: '/learner/achievements',
};

function isCoursesView(view: string): boolean {
  return view === 'courses' || view === 'courses_enrolled' || view === 'courses_favorites';
}

export function Sidebar({ activeView, onNavigate, onAccessibilityClick, className = '' }: SidebarProps) {
  const { t } = useTranslation();
  const { settings, userAgeGroup } = useAccessibility();
  const activePreset = settings?.base_preset || settings?.active_preset || 'none';
  const [coursesOpen, setCoursesOpen] = useState(isCoursesView(activeView));

  const menuItems = useMemo<MenuItem[]>(() => {
    // ADHD Profile: Simplified navigation, essential items only, grouped into 'Focus Area' and 'Explore'
    if (activePreset === 'adhd') {
      return [
        { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
        {
          id: 'courses',
          key: 'nav.myCourses',
          icon: BookOpen,
          subItems: [
            { id: 'courses', key: 'nav.allCourses', icon: Compass },
            { id: 'courses_enrolled', key: 'nav.enrolled', icon: BookMarked },
          ],
        },
        // Group secondary items to reduce visual clutter
        {
          id: 'explore',
          key: 'Explore', // simplified label
          icon: Map,
          subItems: [
            { id: 'progress', key: 'nav.progress', icon: TrendingUp },
            { id: 'achievements', key: 'nav.achievements', icon: Trophy },
          ],
        },
        { id: 'accessibility', key: 'nav.accessibility', icon: Settings },
      ];
    }

    // Autism Profile: Highly structured, predictable, plain-language labels.
    // docs/accessibility/03 §5.4 "resolve the double numbering" — this used
    // to prefix every entry with "Step N:" (and sub-items "N.N"), which
    // competed with the dashboard's own 1-3 numbered sections for the same
    // learner's attention. Two numbering systems on screen for two
    // different things (site navigation vs. a single page's task order) is
    // itself a source of confusion. Numbering is now reserved for
    // within-task sequences only (the dashboard, guided lesson steps); the
    // sidebar — which is site-wide navigation, not a sequence — gets plain
    // labels instead.
    if (activePreset === 'autism') {
      return [
        { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard, labelOverride: 'Dashboard' },
        {
          id: 'courses',
          key: 'nav.myCourses',
          icon: BookOpen,
          labelOverride: 'Courses',
          subItems: [
            { id: 'courses', key: 'nav.allCourses', icon: BookOpen, labelOverride: 'All Courses' },
            { id: 'courses_enrolled', key: 'nav.enrolled', icon: BookMarked, labelOverride: 'My Active Courses' },
            { id: 'courses_favorites', key: 'nav.favourites', icon: Heart, labelOverride: 'Saved for Later' },
          ],
        },
        { id: 'progress', key: 'nav.progress', icon: TrendingUp, labelOverride: 'Progress' },
        // Plain, concrete label: this preset avoids category words like
        // "Achievements" in favour of naming the thing the learner will see.
        { id: 'achievements', key: 'nav.achievements', icon: Trophy, labelOverride: 'My Badges and Certificates' },
        { id: 'accessibility', key: 'nav.accessibility', icon: Settings, labelOverride: 'Settings' },
      ];
    }



    // Default / Dyslexia (Dyslexia relies more on styling, base structure is fine)
    return [
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
      { id: 'achievements', key: 'nav.achievements', icon: Trophy },
      { id: 'accessibility', key: 'nav.accessibility', icon: Settings },
    ];
  }, [activePreset]);

  const handleClick = (item: MenuItem) => {
    if (item.id === 'accessibility') {
      onAccessibilityClick();
    } else if (item.id === 'math_tools') {
      // Future integration: Open math support panel
      alert('Math Support Tools would open here.');
    } else if (item.subItems) {
      if (item.id === 'courses') setCoursesOpen(!coursesOpen);
      // Let's assume ADHD 'explore' menu auto-opens if clicked
      if (item.id === 'explore') setCoursesOpen(!coursesOpen); // reusing state for simplicity in prototype
    } else {
      onNavigate(item.id);
    }
  };

  const isActive = (id: string) => activeView === id;
  const isParentOpen = (item: MenuItem) => {
    if (item.id === 'courses') return coursesOpen;
    if (item.id === 'explore') return coursesOpen;
    return false;
  };

  const getAgeStyles = () => {
    if (userAgeGroup === '6-12') {
      return { buttonRadius: 'rounded-full', iconSize: 'w-6 h-6', padding: 'py-4 px-5' };
    }
    if (userAgeGroup === '18+') {
      return { buttonRadius: 'rounded-md', iconSize: 'w-5 h-5', padding: 'py-2.5 px-3' };
    }
    // 13-17
    return { buttonRadius: 'rounded-xl', iconSize: 'w-5 h-5', padding: 'py-3.5 px-4' };
  };

  const { buttonRadius, iconSize, padding } = getAgeStyles();

  // Preset-specific global styling logic
  const getPresetStyles = () => {
    if (activePreset === 'dyslexia') {
      return { containerWidth: 'w-72', textClass: 'text-base font-medium', itemGap: 'gap-4', blockPadding: 'py-5 px-6' };
    }
    return { containerWidth: 'w-64', textClass: 'text-sm font-medium', itemGap: 'gap-3', blockPadding: 'py-3.5 px-4' };
  };

  const { containerWidth, textClass, itemGap, blockPadding } = getPresetStyles();

  return (
    <aside data-sidebar className={`${containerWidth} bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0 shadow-xl z-20 transition-all duration-300 ${className}`}>
      {/* Brand */}
      <div className="px-6 py-7 border-b border-sidebar-border">
        <Logo href="/learner" size="md" showSubtitle subtitle="Learner Portal" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSub = !!item.subItems;
          const parentOpen = isParentOpen(item);
          const isItemActive = isActive(item.id) && !hasSub;

          return (
            <div key={item.id} className={activePreset === 'autism' ? 'mb-2' : ''}>
              {(() => {
                const topClass = `w-full flex items-center ${itemGap} ${padding} ${buttonRadius} transition-all duration-300 group ${textClass} ${
                  parentOpen
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border'
                    : isItemActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:ring-1 hover:ring-sidebar-border'
                }`;
                const inner = (
                  <>
                    <Icon className={`${iconSize} shrink-0`} />
                    <span className="text-sm">{item.labelOverride || t(item.key)}</span>
                    {hasSub && (
                      <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
                        {parentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    )}
                  </>
                );
                const href = !hasSub ? VIEW_HREF[item.id] : undefined;
                if (href) {
                  return (
                    <Link
                      href={href}
                      aria-current={isItemActive ? 'page' : undefined}
                      className={topClass}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    onClick={() => handleClick(item)}
                    aria-expanded={hasSub ? parentOpen : undefined}
                    className={topClass}
                  >
                    {inner}
                  </button>
                );
              })()}

              {/* Sub-menu */}
              {hasSub && parentOpen && (
                <div className={`ml-4 mt-2 space-y-1.5 pl-4 border-l-2 border-sidebar-border`}>
                  {item.subItems!.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = isActive(sub.id);
                    return (
                      <Link
                        key={sub.id}
                        href={VIEW_HREF[sub.id] || '/learner'}
                        aria-current={isSubActive ? 'page' : undefined}
                        className={`w-full flex items-center ${itemGap} px-4 py-2.5 ${buttonRadius} transition-all duration-300 ${textClass} ${
                          isSubActive
                            ? 'bg-sidebar-accent text-sidebar-primary ring-1 ring-sidebar-primary/30'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`}
                      >
                        <SubIcon className="w-4 h-4 shrink-0" />
                        <span>{sub.labelOverride || t(sub.key)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <LogoutButton asChild>
          <button className={`w-full flex items-center ${itemGap} px-4 py-3.5 ${buttonRadius} text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive hover:ring-1 hover:ring-destructive/20 transition-all duration-300 ${textClass}`}>
            <LogOut className="w-5 h-5" />
            <span>{t('topbar.logout')}</span>
          </button>
        </LogoutButton>
      </div>
    </aside>
  );
}
