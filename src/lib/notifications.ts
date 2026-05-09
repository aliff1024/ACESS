import { supabase } from './supabase'

export interface NotificationItem {
  id: string
  user_id: string
  type: 'enrollment' | 'lesson_completed' | 'quiz_completed' | 'lesson_added' | 'course_published'
  title: string
  body: string | null
  metadata: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export async function fetchNotifications(limit = 20): Promise<NotificationItem[]> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as NotificationItem[]
}

export async function getUnreadCount(): Promise<number> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false)

  if (error) throw error
  return count ?? 0
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead(): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false)

  if (error) throw error
}
