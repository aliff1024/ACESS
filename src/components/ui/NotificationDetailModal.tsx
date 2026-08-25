'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, Award, BookOpen, Users, Trophy, MessageSquare,
  Globe, Shield, CheckCircle, AlertCircle, ExternalLink,
  Clock, ArrowRight, Check, Loader2, Sparkles
} from 'lucide-react';
import type { NotificationItem } from '@/lib/notifications';
import { resolveNotificationAction } from '@/lib/notifications';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionResolved?: (id: string) => void;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  certificate: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Certificate' },
  course: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Course' },
  student: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Student' },
  achievement: { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Achievement' },
  badge_earned: { icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Badge' },
  feedback: { icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Feedback' },
  message: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Message' },
  system: { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-100', label: 'System' },
  learning: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Learning' },
  lesson_completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Lesson Completed' },
  quiz_completed: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Quiz' },
  course_published: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Course Published' },
  enrollment: { icon: Users, color: 'text-green-600', bg: 'bg-green-100', label: 'Enrollment' },
};

export function NotificationDetailModal({
  notification,
  open,
  onOpenChange,
  onActionResolved,
}: NotificationDetailModalProps) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);

  if (!notification) return null;

  const meta = notification.metadata || {};
  const isActionRequired = meta.requires_action === true;
  const isActionCompleted = meta.action_completed === true;
  const cfg = typeConfig[notification.type] || { icon: Bell, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Notification' };
  const Icon = cfg.icon;

  const handleResolveAction = async () => {
    try {
      setResolving(true);
      await resolveNotificationAction(notification.id);
      toast.success('Action marked as completed');
      if (onActionResolved) onActionResolved(notification.id);
    } catch {
      toast.error('Failed to update action status');
    } finally {
      setResolving(false);
    }
  };

  const handleExecuteAction = () => {
    onOpenChange(false);
    if (meta.action_url) {
      router.push(meta.action_url);
    } else if (meta.action_type === 'issue_certificate' || notification.type === 'certificate') {
      router.push('/educator/certificates');
    } else if (meta.course_id) {
      router.push(`/educator/courses/${meta.course_id}`);
    } else if (meta.student_id) {
      router.push(`/educator/students/${meta.student_id}`);
    }
  };

  // Determine default action button label if not explicitly provided
  const actionLabel =
    meta.action_label ||
    (meta.action_type === 'issue_certificate' ? 'Review & Issue Certificate' :
     meta.action_type === 'view_student' ? 'View Student Profile' :
     meta.action_type === 'claim_certificate' ? 'Claim Certificate' :
     meta.action_type === 'view_course' ? 'Go to Course' :
     meta.action_type === 'continue_lesson' ? 'Continue Lesson' :
     meta.action_type === 'view_feedback' ? 'View Feedback' :
     meta.action_url ? 'Open Related Page' : null);

  const formattedDate = notification.created_at
    ? format(new Date(notification.created_at), "MMMM d, yyyy 'at' h:mm a")
    : '';
  const relativeTime = notification.created_at
    ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center ${cfg.color} shrink-0 shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-white/80 border-white/20 text-[10px] uppercase font-semibold">
                      {cfg.label}
                    </Badge>
                    {isActionRequired && (
                      <Badge className={isActionCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500 text-white border-0 font-bold'}>
                        {isActionCompleted ? 'Action Completed' : 'Action Required'}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-lg font-bold text-white mt-1 leading-snug">
                    {notification.title}
                  </DialogTitle>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Details for notification: {notification.title}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-white">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{relativeTime}</span>
          </div>

          {/* Description / Body */}
          <div className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 p-4 rounded-xl border border-gray-100">
            {notification.body || 'No additional details provided for this event.'}
          </div>

          {/* Contextual Entity Information Card */}
          {(meta.course_title || meta.student_name || meta.certificate_code || meta.score !== undefined) && (
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Related Context</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {meta.course_title && (
                  <div>
                    <span className="text-gray-500 block">Course:</span>
                    <strong className="text-gray-900 text-sm">{meta.course_title}</strong>
                  </div>
                )}
                {meta.student_name && (
                  <div>
                    <span className="text-gray-500 block">Student:</span>
                    <strong className="text-gray-900 text-sm">{meta.student_name}</strong>
                    {meta.student_email && <span className="text-gray-500 block text-[11px]">{meta.student_email}</span>}
                  </div>
                )}
                {meta.certificate_code && (
                  <div>
                    <span className="text-gray-500 block">Certificate Code:</span>
                    <span className="font-mono font-semibold text-purple-700">{meta.certificate_code}</span>
                  </div>
                )}
                {meta.score !== undefined && (
                  <div>
                    <span className="text-gray-500 block">Score Achieved:</span>
                    <strong className="text-emerald-700">{meta.score}%</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
            {/* Mark Action Completed toggle if applicable */}
            {isActionRequired && !isActionCompleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResolveAction}
                disabled={resolving}
                className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
              >
                {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1 text-green-600" />}
                Mark as Resolved
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-gray-500 hover:text-gray-900"
              >
                Close
              </Button>

              {actionLabel && (
                <Button
                  size="sm"
                  onClick={handleExecuteAction}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm w-full sm:w-auto"
                >
                  {actionLabel} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
