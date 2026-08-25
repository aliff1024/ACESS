'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, UserPlus, CheckCircle, Award, FilePlus, Globe,
  Loader2, CheckCheck, Trophy, AlertCircle, MessageSquare,
  Sparkles, BookOpen, Shield, ChevronRight
} from 'lucide-react';
import {
  fetchNotifications,
  getUnreadCount,
  getActionRequiredCount,
  markAsRead,
  markAllAsRead,
  resolveNotificationAction
} from '@/lib/notifications';
import type { NotificationItem } from '@/lib/notifications';
import { NotificationDetailModal } from './NotificationDetailModal';
import { Badge } from './badge';

const typeIcons: Record<string, { icon: any; color: string; bg: string }> = {
  enrollment: { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100' },
  lesson_completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  quiz_completed: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-100' },
  lesson_added: { icon: FilePlus, color: 'text-orange-600', bg: 'bg-orange-100' },
  course_published: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100' },
  badge_earned: { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
  achievement: { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
  certificate: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-100' },
  message: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  feedback: { icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-100' },
  student: { icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  course: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
  learning: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  system: { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-100' },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
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
  const [actionRequiredCount, setActionRequiredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'actions'>('all');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [notifs, unread, actionReq] = await Promise.all([
        fetchNotifications(30),
        getUnreadCount(),
        getActionRequiredCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(unread);
      setActionRequiredCount(actionReq);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    setSelectedNotification(notif);
    setModalOpen(true);

    if (!notif.is_read) {
      try {
        await markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
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

  const handleActionResolved = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              is_read: true,
              metadata: { ...n.metadata, action_completed: true },
            }
          : n
      )
    );
    setActionRequiredCount((prev) => Math.max(0, prev - 1));
    if (selectedNotification?.id === id) {
      setSelectedNotification((prev) =>
        prev
          ? {
              ...prev,
              is_read: true,
              metadata: { ...prev.metadata, action_completed: true },
            }
          : null
      );
    }
  };

  const filteredList = notifications.filter((n) => {
    if (filterTab === 'actions') {
      return n.metadata?.requires_action === true && !n.metadata?.action_completed;
    }
    return true;
  });

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="View notifications"
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      >
        <Bell className="w-5 h-5 text-gray-700" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Action Required Dot Indicator (when unread is 0 but action required is pending) */}
        {unreadCount === 0 && actionRequiredCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[75vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-white shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">Notifications</h3>
                {actionRequiredCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-2 py-0.5">
                    {actionRequiredCount} Action{actionRequiredCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition-all ${
                  filterTab === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilterTab('actions')}
                className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition-all ${
                  filterTab === 'actions'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Action Required ({actionRequiredCount})
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="text-xs text-gray-400">Loading notifications...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-12 px-6 text-center text-gray-500">
                {filterTab === 'actions' ? (
                  <>
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-semibold text-gray-900">No actions required</p>
                    <p className="text-xs text-gray-500 mt-1">You're all caught up with your outstanding tasks.</p>
                  </>
                ) : (
                  <>
                    <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-900">You're all caught up</p>
                    <p className="text-xs text-gray-500 mt-1">New updates and activity will appear here.</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {filteredList.map((notif) => {
                  const cfg = typeIcons[notif.type] || {
                    icon: Bell,
                    color: 'text-gray-600',
                    bg: 'bg-gray-100',
                  };
                  const Icon = cfg.icon;
                  const isAction = notif.metadata?.requires_action === true;
                  const isCompleted = notif.metadata?.action_completed === true;

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-4 hover:bg-gray-50/80 transition-colors flex items-start gap-3 relative group ${
                        !notif.is_read ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color} shadow-xs`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-xs leading-snug truncate max-w-[200px] ${
                              !notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                            }`}
                          >
                            {notif.title}
                          </p>

                          {/* Action badges */}
                          {isAction && !isCompleted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              Action Required
                            </span>
                          )}
                          {isAction && isCompleted && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Completed
                            </span>
                          )}
                        </div>

                        {notif.body && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                          <span>{timeAgo(notif.created_at)}</span>
                          {notif.metadata?.course_title && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px] text-gray-500">
                                {notif.metadata.course_title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-2 absolute right-3" />
                      )}

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 self-center hidden sm:block" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onActionResolved={handleActionResolved}
      />
    </div>
  );
}
