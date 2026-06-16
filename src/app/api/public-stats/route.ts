import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [
      { count: courseCount },
      { count: learnerCount },
      { data: enrollments },
    ] = await Promise.all([
      adminSupabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .is('deleted_at', null),
      adminSupabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'learner'),
      adminSupabase
        .from('enrollments')
        .select('status'),
    ])

    const total = enrollments?.length || 0
    const completed = enrollments?.filter((e) => e.status === 'completed').length || 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return NextResponse.json({
      courses: courseCount || 0,
      learners: learnerCount || 0,
      completionRate,
    })
  } catch (err) {
    console.error('Failed to fetch public stats:', err)
    return NextResponse.json({ courses: 0, learners: 0, completionRate: 0 })
  }
}
