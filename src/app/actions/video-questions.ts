"use server";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function fetchVideoQuestionsAdmin(lessonId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key to bypass RLS!
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  const { data, error } = await supabase
    .from('video_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('timestamp_seconds', { ascending: true })
    
  if (error) {
    console.error('fetchVideoQuestionsAdmin error:', error)
    return []
  }
  return data || []
}
