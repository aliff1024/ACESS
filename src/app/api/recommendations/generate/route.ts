import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { generateRecommendations } from '@/lib/recommendation-engine'

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await generateRecommendations(user.id)

    // Fetch and return the generated recommendations
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .neq('status', 'dropped')

    const enrollmentIds = (enrollments || []).map((e: { id: string }) => e.id)

    if (enrollmentIds.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] })
    }

    const { data: recs } = await supabase
      .from('recommendations')
      .select(`
        id,
        difficulty_tier,
        trigger_reason,
        recommended_lesson_id,
        lessons!inner(id, title, course_id)
      `)
      .in('enrollment_id', enrollmentIds)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(3)

    return NextResponse.json({
      success: true,
      recommendations: (recs || []).map((r: Record<string, unknown>) => {
        const lesson = r.lessons as { id: string; title: string; course_id: string }
        return {
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          course_id: lesson.course_id,
          difficulty_tier: r.difficulty_tier as string,
          trigger_reason: r.trigger_reason as string,
        }
      }),
    })
  } catch (err) {
    console.error('Generate recommendations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
