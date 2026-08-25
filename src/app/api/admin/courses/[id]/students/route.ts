import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/admin-analytics'
import { determineStudentRisk } from '@/lib/student-risk'
import type { CourseStudentProgress } from '@/lib/educator-api'

/**
 * Per-course student progress, for admins.
 *
 * `StudentProgressView` (shared with the educator's own course workspace)
 * normally reads `enrollments` / `lesson_progress` / `quiz_attempts` /
 * `certificates` straight from the browser with the RLS-scoped anon client.
 * Those RLS policies only grant SELECT to the enrolled learner or the
 * course's own creator — there is no admin-bypass clause on `enrollments`,
 * `lesson_progress` or `quiz_attempts` (unlike `certificates`, which has
 * one). An admin opening the Students tab on a course they didn't personally
 * author was silently shown "0 enrollments" — RLS filters rows rather than
 * erroring, so the empty state looked like real data instead of a
 * permission gap.
 *
 * This route serves the same shape with the service-role client instead, so
 * the fix is scoped to the admin surface without loosening RLS for anyone
 * else.
 *
 * Progress here is completed published lessons (`is_completed`) over
 * published lessons — not `is_viewed`, which is what the educator-facing
 * `fetchCourseStudentsProgress` uses for the same "completed" figure. That is
 * a pre-existing inconsistency in the educator codebase (a viewed-but-not-
 * finished lesson counts as "completed" there); it is documented, not
 * carried forward into new admin code, since a lesson only counts as
 * completed once `is_completed` is true.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id: courseId } = await context.params
    const db = createAdminClient()

    const { data: enrollments, error: enrollError } = await db
      .from('enrollments')
      .select('id, status, enrolled_at, user_id, users:user_id (id, full_name, email)')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false })

    if (enrollError) throw enrollError
    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ students: [] satisfies CourseStudentProgress[] })
    }

    const { data: lessons, error: lessonsError } = await db
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published')
    if (lessonsError) throw lessonsError

    const lessonIds = new Set((lessons ?? []).map((l) => l.id))
    const totalLessons = lessonIds.size
    const enrollmentIds = enrollments.map((e) => e.id)

    const { data: progressData, error: progressError } = await db
      .from('lesson_progress')
      .select('enrollment_id, lesson_id, is_completed, last_viewed_at, time_spent_learning')
      .in('enrollment_id', enrollmentIds)
    if (progressError) throw progressError

    const progressMap = new Map<string, number>()
    const lastActiveMap = new Map<string, string>()
    const timeSpentMap = new Map<string, number>()

    for (const p of progressData ?? []) {
      if (p.is_completed && lessonIds.has(p.lesson_id)) {
        progressMap.set(p.enrollment_id, (progressMap.get(p.enrollment_id) ?? 0) + 1)
      }
      if (p.last_viewed_at) {
        const current = lastActiveMap.get(p.enrollment_id)
        if (!current || new Date(p.last_viewed_at) > new Date(current)) {
          lastActiveMap.set(p.enrollment_id, p.last_viewed_at)
        }
      }
      timeSpentMap.set(
        p.enrollment_id,
        (timeSpentMap.get(p.enrollment_id) ?? 0) + (p.time_spent_learning ?? 0)
      )
    }

    const { data: qaData } = await db
      .from('quiz_attempts')
      .select('enrollment_id, score_pct, result')
      .in('enrollment_id', enrollmentIds)

    const quizScoresMap = new Map<string, number[]>()
    const quizFailureMap = new Map<string, boolean>()
    for (const qa of qaData ?? []) {
      if (qa.score_pct != null) {
        const list = quizScoresMap.get(qa.enrollment_id)
        if (list) list.push(qa.score_pct)
        else quizScoresMap.set(qa.enrollment_id, [qa.score_pct])
      }
      if (qa.result === 'failed') quizFailureMap.set(qa.enrollment_id, true)
    }

    const { data: certData } = await db
      .from('certificates')
      .select('enrollment_id, verification_url, pdf_url, metadata')
      .in('enrollment_id', enrollmentIds)

    const systemCertMap = new Map<string, string>()
    const customCertMap = new Map<string, string>()
    for (const c of certData ?? []) {
      const isSystem = c.verification_url?.includes('/verify/')
      const isCustom = !!c.pdf_url || (c.metadata as { is_custom?: boolean } | null)?.is_custom === true
      if (isSystem) systemCertMap.set(c.enrollment_id, c.verification_url ?? '')
      if (isCustom) customCertMap.set(c.enrollment_id, c.pdf_url ?? '')
    }

    const students: CourseStudentProgress[] = enrollments.map((raw) => {
      const completed = progressMap.get(raw.id) ?? 0
      const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
      const scores = quizScoresMap.get(raw.id) ?? []
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const lastActive = lastActiveMap.get(raw.id) ?? raw.enrolled_at
      const status = determineStudentRisk({
        enrollmentStatus: raw.status,
        lastActive,
        progressPercent,
        hasQuizFailure: quizFailureMap.get(raw.id) ?? false,
      })
      const rawUser = raw.users as unknown as { full_name?: string; email?: string } | null

      return {
        enrollmentId: raw.id,
        studentId: raw.user_id,
        studentName: rawUser?.full_name || 'Unknown',
        studentEmail: rawUser?.email || '',
        enrolledAt: raw.enrolled_at,
        status,
        completedLessons: Math.min(completed, totalLessons),
        totalLessons,
        progressPercent,
        hasCertificate: systemCertMap.has(raw.id),
        certificateUrl: systemCertMap.get(raw.id) || undefined,
        hasCustomCertificate: customCertMap.has(raw.id),
        customCertificateUrl: customCertMap.get(raw.id) || undefined,
        lastActive,
        timeSpentSeconds: timeSpentMap.get(raw.id) ?? 0,
        avgScore,
      }
    })

    return NextResponse.json({ students })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load student progress'
    console.error('Admin course students error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
