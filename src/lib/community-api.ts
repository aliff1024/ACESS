import { supabase } from './supabase';

async function ensureUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role?: string;
  };
  replies?: LessonComment[];
}

export async function fetchLessonComments(lessonId: string): Promise<LessonComment[]> {
  const { data, error } = await supabase
    .from('lesson_comments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const userIds = [...new Set((data || []).map(r => r.user_id))];
  const { data: profilesData } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, role')
    .in('id', userIds);

  const profileMap = new Map();
  if (profilesData) {
    profilesData.forEach(p => profileMap.set(p.id, p));
  }

  const comments = (data || []).map(row => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      lesson_id: row.lesson_id,
      user_id: row.user_id,
      content: row.content,
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      } : undefined
    };
  });

  // Build tree
  const map = new Map<string, LessonComment>();
  const roots: LessonComment[] = [];

  for (const c of comments) {
    c.replies = [];
    map.set(c.id, c);
  }

  for (const c of comments) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }

  return roots;
}

export async function postLessonComment(lessonId: string, content: string, parentId?: string): Promise<LessonComment> {
  const userId = await ensureUserId();

  const { data, error } = await supabase
    .from('lesson_comments')
    .insert({
      lesson_id: lessonId,
      user_id: userId,
      content,
      parent_id: parentId || null
    })
    .select('*')
    .single();

  if (error) throw error;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, role')
    .eq('id', userId)
    .single();

  return {
    id: data.id,
    lesson_id: data.lesson_id,
    user_id: data.user_id,
    content: data.content,
    parent_id: data.parent_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user: profile ? {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
    } : undefined,
    replies: []
  };
}

export async function fetchLessonCommentCount(lessonId: string): Promise<number> {
  const { count, error } = await supabase
    .from('lesson_comments')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_id', lessonId);

  if (error) return 0;
  return count || 0;
}

export async function deleteLessonComment(commentId: string): Promise<void> {
  const userId = await ensureUserId();

  const { error } = await supabase
    .from('lesson_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw error;
}
