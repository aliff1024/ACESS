import { supabase } from './supabase'

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number
  totalCourses: number
  totalCertificates: number
  activeUsers: number
  newUsersThisMonth: number
  coursesPublishedThisMonth: number
  educatorsCount: number
  learnersCount: number
}

export interface RecentActivity {
  type: 'user_registration' | 'course_submission' | 'certificate_issued'
  user_name: string
  description: string
  created_at: string
}

// ─── Analytics Types ─────────────────────────────────────────────────

export interface AdminAnalytics {
  totalActiveLearners: number
  avgCompletionRate: number
  avgQuizScore: number
  atRiskLearners: number
  accessibilityMetrics: {
    screenReaderUsage: number
    keyboardNavigation: number
    highContrastMode: number
  }
}

// ─── Report Types ────────────────────────────────────────────────────

export interface ReportDefinition {
  title: string
  description: string
  frequency: string
  data: Record<string, unknown>[]
}

// ─── Dashboard Stats ─────────────────────────────────────────────────

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalCertificates },
    { count: activeUsers },
    { count: newUsersThisMonth },
    { count: coursesPublishedThisMonth },
    { count: educatorsCount },
    { count: learnersCount },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('courses').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', firstOfMonth),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', firstOfMonth),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'educator').is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'learner').is('deleted_at', null),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalCourses: totalCourses ?? 0,
    totalCertificates: totalCertificates ?? 0,
    activeUsers: activeUsers ?? 0,
    newUsersThisMonth: newUsersThisMonth ?? 0,
    coursesPublishedThisMonth: coursesPublishedThisMonth ?? 0,
    educatorsCount: educatorsCount ?? 0,
    learnersCount: learnersCount ?? 0,
  }
}

// ─── Recent Activity ─────────────────────────────────────────────────

export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = []

  const { data: recentUsers } = await supabase
    .from('users')
    .select('full_name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const u of recentUsers || []) {
    activities.push({
      type: 'user_registration',
      user_name: u.full_name || 'Unknown',
      description: 'New user registration',
      created_at: u.created_at,
    })
  }

  const { data: recentCourses } = await supabase
    .from('courses')
    .select(`
      title, created_at,
      users!courses_created_by_fkey(full_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const c of recentCourses || []) {
    const usersArr = c.users as { full_name: string } | { full_name: string }[] | null
    const userName = Array.isArray(usersArr) ? usersArr[0]?.full_name : (usersArr as { full_name: string } | null)?.full_name
    activities.push({
      type: 'course_submission',
      user_name: userName || 'Unknown',
      description: `Course submitted: ${c.title}`,
      created_at: c.created_at,
    })
  }

  const { data: recentCerts } = await supabase
    .from('certificates')
    .select(`
      issued_at,
      enrollments!inner(
        users!enrollments_user_id_fkey(full_name)
      )
    `)
    .eq('status', 'issued')
    .order('issued_at', { ascending: false })
    .limit(5)

  for (const c of recentCerts || []) {
    const e = c.enrollments as unknown as { users: { full_name: string } | { full_name: string }[] }
    const userData = e?.users
    const userName = Array.isArray(userData) ? userData[0]?.full_name : (userData as { full_name: string } | null)?.full_name
    activities.push({
      type: 'certificate_issued',
      user_name: userName || 'Unknown',
      description: 'Certificate issued',
      created_at: c.issued_at,
    })
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return activities.slice(0, 10)
}

// ─── Analytics ───────────────────────────────────────────────────────

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const { count: totalActiveLearners } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'learner')
    .eq('is_active', true)
    .is('deleted_at', null)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, status')

  const totalEnrollments = enrollments?.length ?? 0
  const completedEnrollments = (enrollments || []).filter((e) => e.status === 'completed').length
  const avgCompletionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score_pct')
    .neq('result', 'in_progress')

  const scores = (attempts || []).map((a) => a.score_pct).filter((s): s is number => s !== null)
  const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const activeEnrollmentIds = (enrollments || [])
    .filter((e) => e.status === 'active')
    .map((e) => e.id)

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
    .from('user_accessibility_settings')
    .select('id', { count: 'exact', head: true })
    .eq('screen_reader_optimized', true)

  const { count: kbUsers } = await supabase
    .from('user_accessibility_settings')
    .select('id', { count: 'exact', head: true })
    .eq('keyboard_navigation_enabled', true)

  const { count: hcUsers } = await supabase
    .from('user_accessibility_settings')
    .select('id', { count: 'exact', head: true })
    .eq('preferred_theme', 'high_contrast')

  const totalUsersWithAccessibility = (srUsers ?? 0) + (kbUsers ?? 0) + (hcUsers ?? 0) || 1

  return {
    totalActiveLearners: totalActiveLearners ?? 0,
    avgCompletionRate,
    avgQuizScore,
    atRiskLearners,
    accessibilityMetrics: {
      screenReaderUsage: Math.round(((srUsers ?? 0) / totalUsersWithAccessibility) * 100),
      keyboardNavigation: Math.round(((kbUsers ?? 0) / totalUsersWithAccessibility) * 100),
      highContrastMode: Math.round(((hcUsers ?? 0) / totalUsersWithAccessibility) * 100),
    },
  }
}

// ─── Certificate Management ──────────────────────────────────────────

export interface AdminCertificate {
  id: string
  learner_name: string
  course_title: string
  certificate_code: string
  issued_at: string
  status: string
  revoked_at?: string
}

export async function fetchAdminCertificates(): Promise<AdminCertificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id, reference_code, status, issued_at, revoked_at,
      enrollments!inner(
        course_id,
        users!enrollments_user_id_fkey(full_name),
        courses!enrollments_course_id_fkey(title)
      )
    `)
    .order('issued_at', { ascending: false })

  if (error) throw error

  return (data || []).map((c) => {
    const e = c.enrollments as unknown as {
      users: { full_name: string }
      courses: { title: string }
    }
    return {
      id: c.id,
      learner_name: e.users?.full_name || 'Unknown',
      course_title: e.courses?.title || 'Unknown Course',
      certificate_code: c.reference_code,
      issued_at: c.issued_at,
      status: c.status,
      revoked_at: c.revoked_at || undefined,
    }
  })
}

export async function revokeCertificate(certId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', certId)
  if (error) throw error
}

// ─── Reports ─────────────────────────────────────────────────────────

export async function generateReport(reportType: string): Promise<ReportDefinition> {
  switch (reportType) {
    case 'user_activity': {
      const { data: users } = await supabase
        .from('users')
        .select('full_name, email, role, is_active, last_login_at, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      return {
        title: 'User Activity Report',
        description: 'Detailed breakdown of user engagement and activity patterns',
        frequency: 'On-demand',
        data: (users || []).map((u) => ({
          Name: u.full_name || 'Unknown',
          Email: u.email,
          Role: u.role,
          Active: u.is_active ? 'Yes' : 'No',
          'Last Login': u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never',
          'Joined': new Date(u.created_at).toLocaleDateString(),
        })),
      }
    }

    case 'course_performance': {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, status, difficulty_level, created_at')
        .is('deleted_at', null)

      const courseIds = (courses || []).map((c) => c.id)
      const enrollCounts = new Map<string, number>()

      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .in('course_id', courseIds)

        for (const e of enrollments || []) {
          enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) || 0) + 1)
        }
      }

      return {
        title: 'Course Performance Report',
        description: 'Comprehensive analysis of course completion and quiz scores',
        frequency: 'On-demand',
        data: (courses || []).map((c) => ({
          Title: c.title,
          Status: c.status,
          Difficulty: c.difficulty_level || 'N/A',
          Enrollments: enrollCounts.get(c.id) || 0,
          Created: new Date(c.created_at).toLocaleDateString(),
        })),
      }
    }

    case 'certificate_issuance': {
      const { data: certs } = await supabase
        .from('certificates')
        .select(`
          reference_code, status, issued_at, revoked_at,
          enrollments!inner(
            users!enrollments_user_id_fkey(full_name),
            courses!enrollments_course_id_fkey(title)
          )
        `)
        .order('issued_at', { ascending: false })
        .limit(100)

      return {
        title: 'Certificate Issuance Report',
        description: 'Summary of all certificates issued and revoked',
        frequency: 'On-demand',
        data: (certs || []).map((c) => {
          const e = c.enrollments as unknown as {
            users: { full_name: string }
            courses: { title: string }
          }
          return {
            Learner: e.users?.full_name || 'Unknown',
            Course: e.courses?.title || 'Unknown',
            Code: c.reference_code,
            Status: c.status,
            Issued: new Date(c.issued_at).toLocaleDateString(),
            Revoked: c.revoked_at ? new Date(c.revoked_at).toLocaleDateString() : 'N/A',
          }
        }),
      }
    }

    default:
      return {
        title: 'Platform Health Report',
        description: 'System performance, uptime, and technical metrics',
        frequency: 'On-demand',
        data: [],
      }
  }
}
