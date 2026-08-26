import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params
    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('video_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('timestamp_seconds', { ascending: true })

    if (error) {
      console.error('Fetch video questions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ questions: data || [] })
  } catch (err) {
    console.error('Fetch video questions API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
