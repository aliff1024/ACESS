import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Admin Analytics
    const { count: totalActiveLearners } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'learner')
      .eq('is_active', true)
      .is('deleted_at', null)

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, status, enrolled_at')

    const totalEnrollments = enrollments?.length ?? 0
    const completedEnrollments = (enrollments || []).filter((e: any) => e.status === 'completed').length
    const avgCompletionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score_pct')
      .neq('result', 'in_progress')

    const scores = (attempts || []).map((a: any) => a.score_pct).filter((s: any): s is number => s !== null)
    const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a: any, b: any) => a + b, 0) / scores.length) : 0

    const activeEnrollmentIds = (enrollments || [])
      .filter((e: any) => e.status === 'active')
      .map((e: any) => e.id)

    let atRiskLearners = 0
    if (activeEnrollmentIds.length > 0) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentViews } = await supabase
        .from('lesson_progress')
        .select('enrollment_id', { count: 'exact', head: true })
        .in('enrollment_id', activeEnrollmentIds)
        .gte('last_viewed_at', oneWeekAgo)
      atRiskLearners = activeEnrollmentIds.length - (recentViews?.length ?? 0)
      if (atRiskLearners < 0) atRiskLearners = 0
    }

    const { count: srUsers } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .contains('accessibility_prefs', { screen_reader_optimized: true })

    const { count: kbUsers } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .contains('accessibility_prefs', { keyboard_navigation_enabled: true })

    const { count: hcUsers } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .contains('accessibility_prefs', { preferred_theme: 'high_contrast' })

    const totalUsersWithAccessibility = (srUsers ?? 0) + (kbUsers ?? 0) + (hcUsers ?? 0) || 1

    const { count: totalCourses } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    const { count: totalEducators } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'educator')
      .is('deleted_at', null)

    const { count: totalInteractiveActivities } = await supabase
      .from('lesson_interactive_content')
      .select('id', { count: 'exact', head: true })

    const analytics = {
      totalActiveLearners: totalActiveLearners ?? 0,
      avgCompletionRate,
      avgQuizScore,
      atRiskLearners,
      totalCourses: totalCourses ?? 0,
      totalEducators: totalEducators ?? 0,
      totalInteractiveActivities: totalInteractiveActivities ?? 0,
      accessibilityMetrics: {
        screenReaderUsage: Math.round(((srUsers ?? 0) / totalUsersWithAccessibility) * 100),
        keyboardNavigation: Math.round(((kbUsers ?? 0) / totalUsersWithAccessibility) * 100),
        highContrastMode: Math.round(((hcUsers ?? 0) / totalUsersWithAccessibility) * 100),
      },
    }

    // 2. Enrollment Trends & Completion Trends
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    
    const enrollmentMonthMap = new Map<string, number>()
    const completionMonthMap = new Map<string, { total: number; completed: number }>()
    
    for (const e of enrollments || []) {
      const eDate = new Date(e.enrolled_at)
      if (eDate >= twelveMonthsAgo) {
        const key = eDate.toISOString().slice(0, 7)
        // Enrollments
        enrollmentMonthMap.set(key, (enrollmentMonthMap.get(key) || 0) + 1)
        // Completions
        const entry = completionMonthMap.get(key) || { total: 0, completed: 0 }
        entry.total++
        if (e.status === 'completed') entry.completed++
        completionMonthMap.set(key, entry)
      }
    }

    const enrollmentTrends = []
    const completionTrends = []
    const d = new Date(twelveMonthsAgo)
    for (let i = 0; i < 12; i++) {
      const key = d.toISOString().slice(0, 7)
      const monthName = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      
      enrollmentTrends.push({ month: monthName, count: enrollmentMonthMap.get(key) || 0 })
      
      const entry = completionMonthMap.get(key) || { total: 0, completed: 0 }
      completionTrends.push({
        month: monthName,
        rate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
        total: entry.total,
        completed: entry.completed,
      })
      
      d.setMonth(d.getMonth() + 1)
    }

    // 3. User Trends
    const { data: usersForTrends } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())

    const userMonthMap = new Map<string, number>()
    for (const u of usersForTrends || []) {
      const key = new Date(u.created_at).toISOString().slice(0, 7)
      userMonthMap.set(key, (userMonthMap.get(key) || 0) + 1)
    }

    const userTrends = []
    const d2 = new Date(twelveMonthsAgo)
    for (let i = 0; i < 12; i++) {
      const key = d2.toISOString().slice(0, 7)
      const monthName = d2.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      userTrends.push({ label: monthName, count: userMonthMap.get(key) || 0 })
      d2.setMonth(d2.getMonth() + 1)
    }

    // 4. Age Distribution
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('age_group')

    const groups: Record<string, number> = { '6-12': 0, '13-17': 0, '18+': 0 }
    for (const p of userProfiles || []) {
      if (p.age_group === '6-12') groups['6-12']++
      else if (p.age_group === '13-17') groups['13-17']++
      else groups['18+']++
    }

    const ageDistribution = [
      { label: '6-12 yrs', count: groups['6-12'] },
      { label: '13-17 yrs', count: groups['13-17'] },
      { label: '18+ yrs', count: groups['18+'] },
    ]

    return NextResponse.json({
      analytics,
      enrollmentTrends,
      completionTrends,
      userTrends,
      ageDistribution
    })
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
