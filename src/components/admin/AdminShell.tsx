'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookOpen, Award, BarChart3, FileText, LogOut, ChevronDown, Loader2, User, School, MessageSquare, Home } from 'lucide-react';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { supabase } from '@/lib/supabase';
import { useAuth, useRole } from '@/providers/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { UniversalSearch } from '@/components/ui/UniversalSearch';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'users', label: 'User Management', icon: Users, path: '/admin/users' },
  { id: 'courses', label: 'Course Management', icon: BookOpen, path: '/admin/courses' },
  { id: 'instructor-applications', label: 'Educators', icon: School, path: '/admin/instructor-applications' },
  { id: 'contact-messages', label: 'Feedback', icon: MessageSquare, path: '/admin/contact-messages' },
  { id: 'certificates', label: 'Certificates', icon: Award, path: '/admin/certificates' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/admin/reports' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();
  const role = useRole();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (role !== 'admin') { router.replace('/access-denied'); }
  }, [isLoading, isAuthenticated, role, router]);

  const [adminName, setAdminName] = useState('Admin User');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.user_metadata?.full_name) {
        setAdminName(data.user.user_metadata.full_name);
      }
    });
    supabase
      .from('user_profiles')
      .select('avatar_url')
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'admin') {
    return null;
  }

  const activeView = menuItems.find(item =>
    item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path)
  )?.id || 'dashboard';

  const getPageTitle = () => {
    return menuItems.find(i => i.id === activeView)?.label || 'Admin Dashboard';
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = adminName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 shadow-xl z-20">
        <div className="p-6 border-b border-gray-800 dark">
          <Logo href="/admin" size="md" showSubtitle subtitle="Admin Portal" />
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium text-left ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/50' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 hover:ring-1 hover:ring-white/5'
                }`}>
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white hover:ring-1 hover:ring-white/5 transition-all duration-300 font-medium text-sm">
            <Home className="w-5 h-5" />
            <span>Back to Landing Page</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:ring-1 hover:ring-red-500/20 transition-all duration-300 font-medium text-sm">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
            <div className="flex flex-1 justify-end items-center gap-4">
              <UniversalSearch role="admin" />
              <NotificationPanel />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-3 py-2 transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-blue-600">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={adminName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">{initials}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{adminName}</p>
                      <p className="text-xs text-gray-600">System Administrator</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    <User className="w-4 h-4 mr-2" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
