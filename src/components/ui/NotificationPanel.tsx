'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, UserPlus, CheckCircle, Award, FilePlus, Globe, Loader2, CheckCheck, Trophy } from 'lucide-react';
import { fetchNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notifications';
import type { NotificationItem } from '@/lib/notifications';

const typeIcons: Record<string, typeof Bell> = {
  enrollment: UserPlus,
  lesson_completed: CheckCircle,
  quiz_completed: Award,
  lesson_added: FilePlus,
  course_published: Globe,
  badge_earned: Trophy,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load() }, [load]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1">Notifications will appear here when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => {
                  const Icon = typeIcons[notif.type] || Bell;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleMarkRead(notif.id)}
                      className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        !notif.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.type === 'enrollment' ? 'bg-green-100 text-green-600' :
                        notif.type === 'lesson_completed' ? 'bg-blue-100 text-blue-600' :
                        notif.type === 'quiz_completed' ? 'bg-purple-100 text-purple-600' :
                        notif.type === 'lesson_added' ? 'bg-orange-100 text-orange-600' :
                        notif.type === 'badge_earned' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        {notif.body && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
