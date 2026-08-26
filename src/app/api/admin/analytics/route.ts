import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import {
  loadSnapshot,
  buildIndex,
  resolveRange,
  previousRange,
  computeKpis,
  computeCoursePerformance,
  computeAdaptationUsage,
  computePresetAdoption,
  computeSettingsAdoption,
  computeAccessibilityCoverage,
  computeAgeDistribution,
  buildBuckets,
  bucketCounts,
  earliestStamp,
  calcChange,
  activityBand,
  ACTIVITY_BAND_LABELS,
  formatDuration,
  type ActivityBand,
  type Change,
} from '@/lib/admin-analytics'

/**
 * One range-aware payload serving both the Admin Dashboard and the Analytics
 * page. Every figure is derived in `admin-analytics.ts`, so the two screens
 * cannot disagree.
 *
 * Query: ?range=7d|30d|3m|6m|1y|all   (default: all — see resolveRange)
 */
export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const range = resolveRange(searchParams.get('range'))
    const prior = previousRange(range)

    const snap = await loadSnapshot()
    const index = buildIndex(snap)

    const kpis = computeKpis(snap, index, range)
    const priorKpis = prior ? computeKpis(snap, index, prior) : null

    const change = (pick: (k: typeof kpis) => number): Change | null =>
      priorKpis ? calcChange(pick(kpis), pick(priorKpis)) : null

    // ─── Trends ──────────────────────────────────────────────────────────
    const buckets = buildBuckets(range, earliestStamp(snap))
    const g = range.granularity

    const enrollmentSeries = bucketCounts(
      snap.enrollments.map((e) => e.enrolled_at),
      buckets,
      g
    )
    const completionSeries = bucketCounts(
      snap.enrollments.map((e) => e.completed_at),
      buckets,
      g
    )
    const registrationSeries = bucketCounts(
      snap.users.map((u) => u.created_at),
      buckets,
      g
    )
    const courseSeries = bucketCounts(
      snap.courses.map((c) => c.created_at),
      buckets,
      g
    )
    const adaptationSeries = bucketCounts(
      snap.adaptations.map((a) => a.created_at),
      buckets,
      g
    )
    const lessonActivitySeries = bucketCounts(
      snap.lessonProgress.map((p) => p.last_viewed_at),
      buckets,
      g
    )

    const trends = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      enrollments: enrollmentSeries.get(b.key) ?? 0,
      completions: completionSeries.get(b.key) ?? 0,
      registrations: registrationSeries.get(b.key) ?? 0,
      coursesCreated: courseSeries.get(b.key) ?? 0,
      adaptations: adaptationSeries.get(b.key) ?? 0,
      lessonActivity: lessonActivitySeries.get(b.key) ?? 0,
    }))

    // ─── Composition ─────────────────────────────────────────────────────
    const roleCounts = new Map<string, number>()
    for (const u of snap.users) roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1)

    const statusCounts = new Map<string, number>()
    for (const c of snap.courses) statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1)

    const difficultyCounts = new Map<string, number>()
    for (const c of snap.courses) {
      const key = c.difficulty_level ?? 'unspecified'
      difficultyCounts.set(key, (difficultyCounts.get(key) ?? 0) + 1)
    }

    const categoryCounts = new Map<string, number>()
    for (const c of snap.courses) {
      const key = c.category ?? 'Uncategorised'
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1)
    }

    // ─── Learner activity bands ──────────────────────────────────────────
    const bandCounts: Record<ActivityBand, number> = {
      'active-7': 0,
      'active-30': 0,
      'dormant-90': 0,
      never: 0,
    }
    for (const u of snap.users) {
      if (u.role !== 'learner') continue
      bandCounts[activityBand(index.lastActive.get(u.id))]++
    }

    // ─── Progress distribution ───────────────────────────────────────────
    const progressBands = [
      { label: '0%', min: 0, max: 0, count: 0 },
      { label: '1–25%', min: 1, max: 25, count: 0 },
      { label: '26–50%', min: 26, max: 50, count: 0 },
      { label: '51–75%', min: 51, max: 75, count: 0 },
      { label: '76–99%', min: 76, max: 99, count: 0 },
      { label: '100%', min: 100, max: 100, count: 0 },
    ]
    for (const e of snap.enrollments) {
      const pct = index.progress.get(e.id) ?? 0
      const band = progressBands.find((b) => pct >= b.min && pct <= b.max)
      if (band) band.count++
    }

    // ─── Courses ─────────────────────────────────────────────────────────
    const courses = computeCoursePerformance(snap, index)
    const enrolled = courses.filter((c) => c.enrollments > 0)

    const topByEnrollment = [...enrolled].sort((a, b) => b.enrollments - a.enrollments).slice(0, 8)
    const topByCompletion = [...enrolled]
      .filter((c) => c.enrollments >= 3)
      .sort((a, b) => b.markedCompleteRate - a.markedCompleteRate)
      .slice(0, 8)
    const lowEngagement = courses
      .filter((c) => c.status === 'published' && c.enrollments === 0)
      .sort((a, b) => a.title.localeCompare(b.title))

    // ─── Accessibility ───────────────────────────────────────────────────
    const adaptationUsage = computeAdaptationUsage(snap, range)
    const presetAdoption = computePresetAdoption(snap, range)
    const settingsAdoption = computeSettingsAdoption(snap)
    const coverage = computeAccessibilityCoverage(snap)

    const adaptationUsers = new Set(
      snap.adaptations
        .filter((a) => (!range.from || new Date(a.created_at) >= range.from))
        .map((a) => a.user_id)
    ).size
    const learnerTotal = snap.users.filter((u) => u.role === 'learner').length

    // ─── Recent activity ─────────────────────────────────────────────────
    const recentUsers = [...snap.users]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 5)
      .map((u) => ({
        type: 'user_registration' as const,
        name: u.full_name ?? u.email,
        detail: `Registered as ${u.role}`,
        at: u.created_at,
      }))

    const recentCourses = [...snap.courses]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 5)
      .map((c) => ({
        type: 'course_created' as const,
        name: index.userById.get(c.created_by)?.full_name ?? 'Unknown',
        detail: `Created course: ${c.title}`,
        at: c.created_at,
      }))

    const recentCerts = snap.certificates
      .filter((c) => c.status === 'issued')
      .sort((a, b) => +new Date(b.issued_at) - +new Date(a.issued_at))
      .slice(0, 5)
      .map((c) => ({
        type: 'certificate_issued' as const,
        name: (c.user_id && index.userById.get(c.user_id)?.full_name) || 'Unknown',
        detail: `Certificate issued${
          c.course_id ? `: ${index.courseById.get(c.course_id)?.title ?? ''}` : ''
        }`,
        at: c.issued_at,
      }))

    const recentActivity = [...recentUsers, ...recentCourses, ...recentCerts]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 10)

      const ageDistribution = computeAgeDistribution(snap)

      return NextResponse.json({
      range: {
        key: range.key,
        label: range.label,
        from: range.from?.toISOString() ?? null,
        to: range.to.toISOString(),
        granularity: range.granularity,
        comparisonAvailable: prior !== null,
      },
      kpis,
      changes: {
        newUsers: change((k) => k.newUsers),
        activeUsers: change((k) => k.activeUsers),
        newEnrollments: change((k) => k.newEnrollments),
        newCourses: change((k) => k.newCourses),
        lessonsCompleted: change((k) => k.lessonsCompleted),
        certificatesIssued: change((k) => k.certificatesIssued),
      },
      trends,
      composition: {
        roles: Array.from(roleCounts, ([label, count]) => ({ label, count })).sort(
          (a, b) => b.count - a.count
        ),
        courseStatus: Array.from(statusCounts, ([label, count]) => ({ label, count })).sort(
          (a, b) => b.count - a.count
        ),
        difficulty: Array.from(difficultyCounts, ([label, count]) => ({ label, count })).sort(
          (a, b) => b.count - a.count
        ),
        categories: Array.from(categoryCounts, ([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        ageDistribution,
      },
      learners: {
        bands: (Object.keys(bandCounts) as ActivityBand[]).map((band) => ({
          band,
          label: ACTIVITY_BAND_LABELS[band],
          count: bandCounts[band],
        })),
        progressDistribution: progressBands.map(({ label, count }) => ({ label, count })),
        ageDistribution,
        totalLearners: learnerTotal,
      },
      courses: {
        topByEnrollment,
        topByCompletion,
        lowEngagement,
        total: courses.length,
      },
      accessibility: {
        adaptationUsage,
        presetAdoption,
        settingsAdoption,
        coverage,
        reach: {
          usersWithEvents: adaptationUsers,
          learnerTotal,
        },
      },
      recentActivity,
      totals: {
        learningTimeLabel: formatDuration(kpis.totalLearningSeconds),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics'
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
