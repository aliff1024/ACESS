'use client';

import { useState, useEffect } from 'react';
import { Settings, LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { LogoutButton } from '@/components/auth/LogoutButton';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { fetchLearnerProfile } from '@/lib/learner-api';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/useTranslation';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps = {}) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetchLearnerProfile()
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
    supabase
      .from('user_profiles')
      .select('avatar_url')
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch(() => {});
  }, []);

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'L';

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-xs">{t('topbar.dashboard')}</h1>
            <p className="text-xs md:text-sm text-gray-600 mt-0.5 hidden sm:block">{t('topbar.welcomeMessage')}</p>
          </div>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 md:gap-4">
          <NotificationPanel />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 sm:px-3 py-2 transition-colors">
                {profileLoading && !profile ? (
                  <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={profile?.full_name || 'Learner'} className="w-full h-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Learner'}</p>
                  <p className="text-xs text-gray-600">{profile?.email || 'Loading...'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                {t('topbar.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <LogoutButton asChild>
                <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('topbar.logout')}
                </DropdownMenuItem>
              </LogoutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
}
