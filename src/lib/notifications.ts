import { supabase } from './supabase';

export type NotificationType =
  | 'certificate'
  | 'course'
  | 'student'
  | 'achievement'
  | 'feedback'
  | 'system'
  | 'learning'
  | 'accessibility'
  | 'enrollment'
  | 'lesson_completed'
  | 'quiz_completed'
  | 'lesson_added'
  | 'course_published'
  | 'badge_earned'
  | 'message';

export interface NotificationMetadata {
  requires_action?: boolean;
  action_completed?: boolean;
  action_type?:
    | 'issue_certificate'
    | 'view_student'
    | 'view_course'
    | 'claim_certificate'
    | 'view_feedback'
    | 'continue_lesson'
    | 'general';
  action_url?: string;
  action_label?: string;
  course_id?: string;
  course_title?: string;
  student_id?: string;
  student_name?: string;
  student_email?: string;
  certificate_id?: string;
  certificate_code?: string;
  enrollment_id?: string;
  feedback_id?: string;
  score?: number;
  completed_at?: string;
  sender_id?: string;
  sender_name?: string;
  resolved_at?: string;
  details?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: NotificationMetadata;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetch all notifications for the authenticated user
 */
export async function fetchNotifications(limit = 40): Promise<NotificationItem[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    metadata: (row.metadata || {}) as NotificationMetadata,
  })) as NotificationItem[];
}

/**
 * Get count of unread notifications for currently authenticated user
 */
export async function getUnreadCount(): Promise<number> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Get count of unresolved action-required notifications for currently authenticated user
 */
export async function getActionRequiredCount(): Promise<number> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return 0;

  const { data, error } = await supabase
    .from('notifications')
    .select('metadata')
    .eq('user_id', user.user.id);

  if (error || !data) return 0;

  return data.filter((n: any) => {
    const meta = n.metadata as NotificationMetadata;
    return meta?.requires_action === true && !meta?.action_completed;
  }).length;
}

/**
 * Mark a single notification as read (does NOT resolve action requirements)
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all normal unread notifications as read.
 * Action-required items become read, but their requires_action/action_completed status remains intact.
 */
export async function markAllAsRead(): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all as read:', error);
    throw error;
  }
}

/**
 * Resolve an action-required notification (marks action_completed = true and is_read = true)
 */
export async function resolveNotificationAction(notificationId: string): Promise<void> {
  // First retrieve existing metadata to safely merge
  const { data: notif } = await supabase
    .from('notifications')
    .select('metadata')
    .eq('id', notificationId)
    .single();

  const existingMeta = (notif?.metadata || {}) as NotificationMetadata;
  const updatedMeta: NotificationMetadata = {
    ...existingMeta,
    action_completed: true,
    resolved_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('notifications')
    .update({
      metadata: updatedMeta,
      is_read: true,
    })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to resolve notification action:', error);
    throw error;
  }
}

/**
 * Create a new notification, respecting user notification preferences for optional notifications.
 * Critical action-required notifications are always delivered.
 */
export async function createNotification(params: {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: NotificationMetadata;
}): Promise<void> {
  try {
    const isRequiredAction = params.metadata?.requires_action === true;

    // Check user preferences if optional
    if (!isRequiredAction) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('notification_prefs')
        .eq('user_id', params.user_id)
        .maybeSingle();

      const prefs = (profile?.notification_prefs as Record<string, boolean>) || {};

      // If user disabled in-app notifications
      if (prefs.in_app_notifications === false || prefs.push_notifications === false) {
        return;
      }

      // Check category-specific preferences
      if (
        (params.type === 'badge_earned' || params.type === 'achievement') &&
        prefs.achievement_notifications === false
      ) {
        return;
      }

      if (
        (params.type === 'lesson_added' || params.type === 'course_published' || params.type === 'course') &&
        prefs.course_updates === false
      ) {
        return;
      }

      if (
        params.type === 'certificate' &&
        prefs.certificate_notifications === false
      ) {
        return;
      }

      if (
        (params.type === 'message' || params.type === 'feedback') &&
        prefs.feedback_notifications === false
      ) {
        return;
      }
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body || null,
      metadata: params.metadata || {},
      is_read: false,
    });

    if (error) {
      console.error('Failed to insert notification:', error);
    }
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}
