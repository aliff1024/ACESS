'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChevronDown, LogOut, Menu } from 'lucide-react';
import NotificationPanel from '@/components/ui/NotificationPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { fetchEducatorProfile } from '@/lib/educator-api';
import { supabase } from '@/lib/supabase';
import { UniversalSearch } from '@/components/ui/UniversalSearch';

interface EducatorTopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function EducatorTopBar({ title, subtitle, onMenuClick }: EducatorTopBarProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    setProfileLoading(true);
    fetchEducatorProfile().then(setProfile).catch(() => {}).finally(() => setProfileLoading(false));
    setNotifLoading(true);
    supabase
      .from('user_profiles')
      .select('avatar_url')
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'E';
  if (initials) {}

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-xs">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-gray-600 mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 md:gap-4">
          <UniversalSearch role="educator" />
          <NotificationPanel />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-3 py-2 transition-colors">
                {profileLoading && !profile ? (
                  <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-purple-600">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={profile?.full_name || 'Educator'} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Educator'}</p>
                  <p className="text-xs text-gray-600">Educator</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
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

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
