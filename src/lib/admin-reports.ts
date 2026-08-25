/**
 * Report construction for the Admin Portal.
 *
 * Four reports, all built from the same snapshot the dashboard uses, so a
 * report can never contradict the screen it was generated from.
 *
 * Findings are generated from thresholds against real values and suppressed
 * when the dataset is too small to support the claim — a "top course" chosen
 * from two enrollments is noise presented as insight.
 */

import {
  type AnalyticsSnapshot,
  type DateRange,
  type SnapshotIndex,
  activityBand,
  computeAccessibilityCoverage,
  computeAdaptationUsage,
  computeCoursePerformance,
  computeKpis,
  computePresetAdoption,
  computeSettingsAdoption,
  bucketCounts,
  buildBuckets,
  earliestStamp,
  formatDuration,
  ACTIVITY_BAND_LABELS,
  type ActivityBand,
} from './admin-analytics'

export type ReportId = 'users' | 'courses' | 'learning' | 'accessibility'

export const REPORT_META: Record<ReportId, { title: string; description: string }> = {
  users: {
    title: 'User Report',
    description: 'Accounts, roles, registration trend and activity recency.',
  },
  courses: {
    title: 'Course Report',
    description: 'Catalogue composition, enrollment reach and course performance.',
  },
  learning: {
    title: 'Learning Report',
    description: 'Enrollment and completion trends, progress distribution and assessment results.',
  },
  accessibility: {
    title: 'Accessibility Report',
    description: 'Adaptation usage, saved preferences and accessibility coverage of the catalogue.',
  },
}

export interface ReportChart {
  type: 'bar' | 'line'
  title: string
  /** what one unit on the value axis represents */
  unit: string
  series: { label: string; value: number }[]
}

export interface ReportTable {
  title: string
  columns: string[]
  /** column indexes that hold numbers and should be right-aligned */
  numericColumns: number[]
  rows: (string | number)[][]
}

export interface ReportSection {
  title: string
  description?: string
  chart?: ReportChart
  table?: ReportTable
  note?: string
}

export interface ReportSummaryItem {
  label: string
  value: string
  hint?: string
}

export interface AdminReport {
  id: ReportId
  title: string
  description: string
  generatedAt: string
  range: { key: string; label: string; from: string | null; to: string }
  summary: ReportSummaryItem[]
  sections: ReportSection[]
  findings: string[]
  caveats: string[]
}

/** Below this many records, comparative statements are not made. */
const MIN_RECORDS_FOR_FINDING = 5
/** A "best performing" claim needs at least this many enrollments behind it. */
const MIN_ENROLLMENTS_FOR_RANKING = 3

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

type Trend = 'rising' | 'falling' | 'flat' | 'stopped' | null

/**
 * Compares the two halves of a series.
 *
 * `stopped` takes precedence over the halves comparison: a series that grew and
 * then went silent for its most recent buckets is not "rising", even though the
 * second half outweighs the first. Reporting that as growth is exactly the kind
 * of confident-but-wrong summary this report is meant to avoid.
 */
function trendDirection(series: { value: number }[]): Trend {
  const nonEmpty = series.filter((s) => s.value > 0)
  if (nonEmpty.length < 3) return null

  const trailingEmpty = series.length - 1 - series.findLastIndex((s) => s.value > 0)
  if (trailingEmpty >= 2) return 'stopped'

  const half = Math.floor(series.length / 2)
  const first = series.slice(0, half).reduce((s, x) => s + x.value, 0)
  const second = series.slice(half).reduce((s, x) => s + x.value, 0)
  if (first === 0 && second === 0) return null
  if (second > first * 1.1) return 'rising'
  if (second < first * 0.9) return 'falling'
  return 'flat'
}

function describeTrend(what: string, dir: Trend, series: { label: string; value: number }[]): string | null {
  switch (dir) {
    case 'rising':
      return `${what} are rising across the selected range.`
    case 'falling':
      return `${what} are falling across the selected range.`
    case 'stopped': {
      const lastActive = series.findLastIndex((s) => s.value > 0)
      return `${what} stopped after ${series[lastActive].label} — no records in the periods since.`
    }
    default:
      return null
  }
}

export function buildReport(
  id: ReportId,
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  range: DateRange
): AdminReport {
  const kpis = computeKpis(snap, index, range)
  const buckets = buildBuckets(range, earliestStamp(snap))
  const meta = REPORT_META[id]

  const base = {
    id,
    title: meta.title,
    description: meta.description,
    generatedAt: new Date().toISOString(),
    range: {
      key: range.key,
      label: range.label,
      from: range.from?.toISOString() ?? null,
      to: range.to.toISOString(),
    },
  }

  switch (id) {
    case 'users':
      return { ...base, ...buildUserReport(snap, index, range, kpis, buckets) }
    case 'courses':
      return { ...base, ...buildCourseReport(snap, index, kpis) }
    case 'learning':
      return { ...base, ...buildLearningReport(snap, index, range, kpis, buckets) }
    case 'accessibility':
      return { ...base, ...buildAccessibilityReport(snap, range) }
  }
}

// ─── User report ─────────────────────────────────────────────────────────

function buildUserReport(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  range: DateRange,
  kpis: ReturnType<typeof computeKpis>,
  buckets: ReturnType<typeof buildBuckets>
) {
  const registrations = bucketCounts(
    snap.users.map((u) => u.created_at),
    buckets,
    range.granularity
  )
  const registrationSeries = buckets.map((b) => ({
    label: b.label,
    value: registrations.get(b.key) ?? 0,
  }))

  const roleCounts = new Map<string, number>()
  for (const u of snap.users) roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1)

  const bandCounts: Record<ActivityBand, number> = {
    'active-7': 0,
    'active-30': 0,
    'dormant-90': 0,
    never: 0,
  }
  for (const u of snap.users) bandCounts[activityBand(index.lastActive.get(u.id))]++

  const recent = [...snap.users]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 20)

  const findings: string[] = []
  const dormant = bandCounts['dormant-90'] + bandCounts.never
  if (snap.users.length >= MIN_RECORDS_FOR_FINDING) {
    findings.push(
      `${snap.users.length} accounts exist, of which ${pct(
        roleCounts.get('learner') ?? 0,
        snap.users.length
      )}% are learners.`
    )
    findings.push(
      `${dormant} of ${snap.users.length} accounts (${pct(
        dormant,
        snap.users.length
      )}%) have shown no activity in the last 30 days.`
    )
  }
  const registrationTrend = describeTrend(
    'Registrations',
    trendDirection(registrationSeries),
    registrationSeries
  )
  if (registrationTrend) findings.push(registrationTrend)

  const withLogin = snap.users.filter((u) => u.last_login_at).length

  return {
    summary: [
      { label: 'Total users', value: String(snap.users.length) },
      { label: 'New in range', value: String(kpis.newUsers), hint: range.label },
      {
        label: 'Active users',
        value: String(kpis.activeUsers),
        hint: 'With recorded activity',
      },
      { label: 'Learners', value: String(roleCounts.get('learner') ?? 0) },
      { label: 'Educators', value: String(roleCounts.get('educator') ?? 0) },
    ],
    sections: [
      {
        title: 'Registration trend',
        description: 'New accounts created over the selected range.',
        chart: {
          type: 'line' as const,
          title: 'New accounts',
          unit: 'accounts',
          series: registrationSeries,
        },
      },
      {
        title: 'Role distribution',
        chart: {
          type: 'bar' as const,
          title: 'Accounts by role',
          unit: 'accounts',
          series: Array.from(roleCounts, ([label, value]) => ({ label, value })).sort(
            (a, b) => b.value - a.value
          ),
        },
      },
      {
        title: 'Activity recency',
        description:
          'Based on the most recent sign-in, lesson view, quiz attempt, adaptation event or enrollment.',
        chart: {
          type: 'bar' as const,
          title: 'Accounts by last activity',
          unit: 'accounts',
          series: (Object.keys(bandCounts) as ActivityBand[]).map((b) => ({
            label: ACTIVITY_BAND_LABELS[b],
            value: bandCounts[b],
          })),
        },
      },
      {
        title: 'Recently registered users',
        table: {
          title: 'Most recent 20 accounts',
          columns: ['Name', 'Email', 'Role', 'Registered', 'Last active'],
          numericColumns: [],
          rows: recent.map((u) => [
            u.full_name ?? '—',
            u.email,
            u.role,
            new Date(u.created_at).toLocaleDateString(),
            index.lastActive.get(u.id)?.toLocaleDateString() ?? 'Never',
          ]),
        },
      },
    ],
    findings,
    caveats: [
      `Sign-in timestamps exist for ${withLogin} of ${snap.users.length} accounts; login tracking was added in August 2026, so activity for older sessions is derived from learning records instead.`,
      'Age and disability demographics are excluded: birth date is recorded for 2 of 25 users and disability type for none, so any breakdown would report defaults as findings.',
    ],
  }
}

// ─── Course report ───────────────────────────────────────────────────────

function buildCourseReport(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  kpis: ReturnType<typeof computeKpis>
) {
  const courses = computeCoursePerformance(snap, index)
  const enrolled = courses.filter((c) => c.enrollments > 0)
  const rankable = courses.filter((c) => c.enrollments >= MIN_ENROLLMENTS_FOR_RANKING)

  const statusCounts = new Map<string, number>()
  for (const c of snap.courses) statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1)

  const difficultyCounts = new Map<string, number>()
  for (const c of snap.courses) {
    const key = c.difficulty_level ?? 'unspecified'
    difficultyCounts.set(key, (difficultyCounts.get(key) ?? 0) + 1)
  }

  const topEnrolled = [...enrolled].sort((a, b) => b.enrollments - a.enrollments).slice(0, 10)
  const topCompletion = [...rankable]
    .sort((a, b) => b.markedCompleteRate - a.markedCompleteRate)
    .slice(0, 10)
  const noEngagement = courses.filter((c) => c.status === 'published' && c.enrollments === 0)

  const findings: string[] = []
  if (topEnrolled.length && topEnrolled[0].enrollments >= MIN_ENROLLMENTS_FOR_RANKING) {
    findings.push(
      `"${topEnrolled[0].title}" has the highest enrollment at ${topEnrolled[0].enrollments} learners.`
    )
  }
  if (topCompletion.length) {
    findings.push(
      `"${topCompletion[0].title}" has the highest completion rate at ${topCompletion[0].markedCompleteRate}%, across ${topCompletion[0].enrollments} enrollments.`
    )
  }
  if (noEngagement.length > 0) {
    findings.push(
      `${noEngagement.length} of ${kpis.publishedCourses} published courses have no enrollments at all.`
    )
  }
  const emptyCourses = courses.filter((c) => c.publishedLessons === 0).length
  if (emptyCourses > 0) {
    findings.push(`${emptyCourses} courses contain no published lessons.`)
  }

  return {
    summary: [
      { label: 'Total courses', value: String(kpis.totalCourses) },
      { label: 'Published', value: String(kpis.publishedCourses) },
      { label: 'With enrollments', value: String(enrolled.length) },
      { label: 'Total enrollments', value: String(kpis.totalEnrollments) },
      {
        label: 'Average progress',
        value: `${kpis.averageProgress}%`,
        hint: 'Across all enrollments',
      },
    ],
    sections: [
      {
        title: 'Catalogue composition',
        chart: {
          type: 'bar' as const,
          title: 'Courses by status',
          unit: 'courses',
          series: Array.from(statusCounts, ([label, value]) => ({
            label: label.replace('_', ' '),
            value,
          })).sort((a, b) => b.value - a.value),
        },
      },
      {
        title: 'Courses by difficulty',
        chart: {
          type: 'bar' as const,
          title: 'Difficulty spread',
          unit: 'courses',
          series: Array.from(difficultyCounts, ([label, value]) => ({ label, value })).sort(
            (a, b) => b.value - a.value
          ),
        },
      },
      {
        title: 'Most enrolled courses',
        chart: {
          type: 'bar' as const,
          title: 'Enrollments by course',
          unit: 'enrollments',
          series: topEnrolled.slice(0, 8).map((c) => ({ label: c.title, value: c.enrollments })),
        },
      },
      {
        title: 'Course performance',
        description:
          'Marked complete comes from the enrollment record; average progress is derived from completed published lessons. They are reported separately because they disagree.',
        table: {
          title: 'All courses with enrollments',
          columns: [
            'Course',
            'Status',
            'Lessons',
            'Enrolled',
            'Marked complete',
            'Complete %',
            'Avg progress %',
            'Learning time',
          ],
          numericColumns: [2, 3, 4, 5, 6],
          rows: [...enrolled]
            .sort((a, b) => b.enrollments - a.enrollments)
            .map((c) => [
              c.title,
              c.status.replace('_', ' '),
              c.publishedLessons,
              c.enrollments,
              c.markedComplete,
              c.markedCompleteRate,
              c.averageProgress,
              formatDuration(c.learningSeconds),
            ]),
        },
      },
      ...(noEngagement.length
        ? [
            {
              title: 'Published courses with no enrollments',
              description: 'Live in the catalogue but never taken up.',
              table: {
                title: `${noEngagement.length} courses`,
                columns: ['Course', 'Educator', 'Published lessons', 'Category'],
                numericColumns: [2],
                rows: noEngagement.map((c) => [
                  c.title,
                  c.creatorName,
                  c.publishedLessons,
                  c.category ?? 'Uncategorised',
                ]),
              },
            },
          ]
        : []),
    ],
    findings,
    caveats: [
      `Completion rankings only consider courses with at least ${MIN_ENROLLMENTS_FOR_RANKING} enrollments; a 100% rate from one learner is not a finding.`,
      'Course figures are all-time and are not filtered by the selected range, because a course’s enrollment total is a property of the course rather than of the period.',
    ],
  }
}

// ─── Learning report ─────────────────────────────────────────────────────

function buildLearningReport(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  range: DateRange,
  kpis: ReturnType<typeof computeKpis>,
  buckets: ReturnType<typeof buildBuckets>
) {
  const enrollSeries = bucketCounts(
    snap.enrollments.map((e) => e.enrolled_at),
    buckets,
    range.granularity
  )
  const completeSeries = bucketCounts(
    snap.enrollments.map((e) => e.completed_at),
    buckets,
    range.granularity
  )

  const enrollments = buckets.map((b) => ({ label: b.label, value: enrollSeries.get(b.key) ?? 0 }))
  const completions = buckets.map((b) => ({ label: b.label, value: completeSeries.get(b.key) ?? 0 }))

  const bands = [
    { label: '0%', min: 0, max: 0, value: 0 },
    { label: '1-25%', min: 1, max: 25, value: 0 },
    { label: '26-50%', min: 26, max: 50, value: 0 },
    { label: '51-75%', min: 51, max: 75, value: 0 },
    { label: '76-99%', min: 76, max: 99, value: 0 },
    { label: '100%', min: 100, max: 100, value: 0 },
  ]
  for (const e of snap.enrollments) {
    const p = index.progress.get(e.id) ?? 0
    const band = bands.find((b) => p >= b.min && p <= b.max)
    if (band) band.value++
  }

  // Learners at risk: active enrollment, low progress, nothing recent.
  const atRiskAll = snap.enrollments
    .filter((e) => e.status === 'active')
    .map((e) => {
      const user = index.userById.get(e.user_id)
      const last = index.lastActive.get(e.user_id)
      return {
        name: user?.full_name ?? user?.email ?? 'Unknown',
        course: index.courseById.get(e.course_id)?.title ?? 'Unknown course',
        progress: index.progress.get(e.id) ?? 0,
        band: activityBand(last),
        last,
      }
    })
    .filter((r) => r.band === 'dormant-90' || r.band === 'never')
    .sort((a, b) => a.progress - b.progress)

  // Keep the full count for the finding; the table lists the worst 25.
  const atRisk = atRiskAll.slice(0, 25)

  const findings: string[] = []
  if (kpis.totalEnrollments >= MIN_RECORDS_FOR_FINDING) {
    findings.push(
      `${kpis.markedComplete} of ${kpis.totalEnrollments} enrollments (${kpis.markedCompleteRate}%) are marked complete, while ${kpis.fullyProgressed} have finished every published lesson.`
    )
    findings.push(
      `Learners finish ${kpis.lessonCompletionRate}% of the lessons they open, across ${formatDuration(
        kpis.totalLearningSeconds
      )} of recorded learning time.`
    )
  }
  if (atRiskAll.length > 0) {
    findings.push(
      `${atRiskAll.length} active enrollments belong to learners with no activity in the last 30 days.`
    )
  }
  const enrollmentTrend = describeTrend('Enrollments', trendDirection(enrollments), enrollments)
  if (enrollmentTrend) findings.push(enrollmentTrend)
  if (kpis.quizAttempts >= MIN_RECORDS_FOR_FINDING && kpis.quizPassRate != null) {
    findings.push(
      `Quiz pass rate is ${kpis.quizPassRate}% across ${kpis.quizAttempts} attempts, averaging ${kpis.averageQuizScore}%.`
    )
  }

  return {
    summary: [
      { label: 'Total enrollments', value: String(kpis.totalEnrollments) },
      { label: 'Active', value: String(kpis.activeEnrollments) },
      {
        label: 'Marked complete',
        value: `${kpis.markedCompleteRate}%`,
        hint: `${kpis.markedComplete} enrollments`,
      },
      { label: 'Average progress', value: `${kpis.averageProgress}%` },
      { label: 'Learning time', value: formatDuration(kpis.totalLearningSeconds) },
    ],
    sections: [
      {
        title: 'Enrollment trend',
        chart: {
          type: 'line' as const,
          title: 'New enrollments',
          unit: 'enrollments',
          series: enrollments,
        },
      },
      {
        title: 'Completion trend',
        chart: {
          type: 'line' as const,
          title: 'Enrollments marked complete',
          unit: 'completions',
          series: completions,
        },
      },
      {
        title: 'Progress distribution',
        description:
          'Each enrollment counted once. A learner enrolled in three courses appears three times.',
        chart: {
          type: 'bar' as const,
          title: 'Enrollments by progress band',
          unit: 'enrollments',
          series: bands.map((b) => ({ label: b.label, value: b.value })),
        },
      },
      {
        title: 'Assessment results',
        table: {
          title: 'Quiz activity in range',
          columns: ['Metric', 'Value'],
          numericColumns: [],
          rows: [
            ['Attempts', String(kpis.quizAttempts)],
            ['Pass rate', kpis.quizPassRate != null ? `${kpis.quizPassRate}%` : 'No attempts'],
            [
              'Average score',
              kpis.averageQuizScore != null ? `${kpis.averageQuizScore}%` : 'No attempts',
            ],
            ['Lessons opened', String(kpis.lessonsStarted)],
            ['Lessons completed', String(kpis.lessonsCompleted)],
          ],
        },
      },
      ...(atRisk.length
        ? [
            {
              title: 'Learners falling behind',
              description:
                'Active enrollments where the learner has no recorded activity in the last 30 days.',
              table: {
                title:
                atRiskAll.length > atRisk.length
                  ? `Worst ${atRisk.length} of ${atRiskAll.length} enrollments`
                  : `${atRisk.length} enrollments`,
                columns: ['Learner', 'Course', 'Progress %', 'Last active'],
                numericColumns: [2],
                rows: atRisk.map((r) => [
                  r.name,
                  r.course,
                  r.progress,
                  r.last ? r.last.toLocaleDateString() : 'Never',
                ]),
              },
            },
          ]
        : []),
    ],
    findings,
    caveats: [
      'Completion is reported two ways because the records disagree: the enrollment status and the lesson-derived progress do not currently agree for any enrollment marked complete.',
      'Learning time is time recorded inside lessons, not time on the platform. There is no session tracking.',
    ],
  }
}

// ─── Accessibility report ────────────────────────────────────────────────

function buildAccessibilityReport(snap: AnalyticsSnapshot, range: DateRange) {
  const usage = computeAdaptationUsage(snap, range)
  const presets = computePresetAdoption(snap, range)
  const adoption = computeSettingsAdoption(snap)
  const coverage = computeAccessibilityCoverage(snap)

  const learnerTotal = snap.users.filter((u) => u.role === 'learner').length
  const reached = new Set(
    snap.adaptations
      .filter((a) => !range.from || new Date(a.created_at) >= range.from)
      .map((a) => a.user_id)
  ).size

  const findings: string[] = []
  if (usage.length > 0) {
    const top = usage[0]
    findings.push(
      `"${top.label}" is the most used adaptation, with ${top.events} uses across ${top.users} ${
        top.users === 1 ? 'learner' : 'learners'
      }.`
    )
    findings.push(
      `Adaptations reached ${reached} of ${learnerTotal} learners (${pct(reached, learnerTotal)}%).`
    )
  }
  if (presets.length > 0) {
    const applied = presets.filter((p) => p.preset !== 'none')
    if (applied.length > 0) {
      findings.push(
        `The most applied accessibility preset is ${applied[0].preset.toUpperCase()}, chosen ${applied[0].events} times.`
      )
    }
  }
  findings.push(
    `${coverage.courses.supportsTts} of ${coverage.courses.total} courses declare text-to-speech support and ${coverage.courses.withDisabilityFocus} declare a primary disability focus.`
  )
  if (coverage.lessons.withTranscriptContent === 0 && coverage.lessons.total > 0) {
    findings.push(
      `No lesson has transcript text, despite every lesson carrying a transcript flag — a content gap, not a reporting gap.`
    )
  }

  return {
    summary: [
      { label: 'Adaptation events', value: String(usage.reduce((s, u) => s + u.events, 0)) },
      {
        label: 'Learners reached',
        value: `${reached}/${learnerTotal}`,
        hint: 'With any adaptation event',
      },
      {
        label: 'Saved preferences',
        value: `${adoption.denominator}/${adoption.populationTotal}`,
        hint: 'Users with any saved settings',
      },
      {
        label: 'Accessible courses',
        value: String(coverage.courses.withDisabilityFocus),
        hint: 'With a declared disability focus',
      },
      { label: 'Published lessons', value: String(coverage.lessons.published) },
    ],
    sections: [
      {
        title: 'Adaptation usage',
        description: 'Accessibility features learners actively switched on during the range.',
        chart: {
          type: 'bar' as const,
          title: 'Uses by feature',
          unit: 'uses',
          series: usage.map((u) => ({ label: u.label, value: u.events })),
        },
        note:
          usage.length === 0
            ? 'No adaptation events were recorded in this range.'
            : undefined,
      },
      {
        title: 'Preset adoption',
        chart: {
          type: 'bar' as const,
          title: 'Times applied',
          unit: 'applications',
          series: presets.map((p) => ({
            label: p.preset === 'none' ? 'Cleared' : p.preset.toUpperCase(),
            value: p.events,
          })),
        },
      },
      {
        title: 'Saved accessibility settings',
        description: `Measured across the ${adoption.denominator} of ${adoption.populationTotal} users who have saved any preferences. Percentages against the whole user base are not reported, because an absent record is not the same fact as a disabled setting.`,
        table: {
          title: 'Feature adoption',
          columns: ['Feature', 'Users with it enabled'],
          numericColumns: [1],
          rows: adoption.features.map((f) => [f.label, f.users]),
        },
      },
      {
        title: 'Course accessibility coverage',
        chart: {
          type: 'bar' as const,
          title: `Courses declaring support (of ${coverage.courses.total})`,
          unit: 'courses',
          series: [
            { label: 'Text-to-speech', value: coverage.courses.supportsTts },
            { label: 'Transcripts', value: coverage.courses.supportsTranscripts },
            { label: 'Focus mode', value: coverage.courses.supportsFocusMode },
            { label: 'Chunked learning', value: coverage.courses.supportsChunkedLearning },
            { label: 'Disability focus', value: coverage.courses.withDisabilityFocus },
          ],
        },
      },
      {
        title: 'Lesson accessibility coverage',
        table: {
          title: `Across ${coverage.lessons.total} lessons`,
          columns: ['Feature', 'Lessons', '% of catalogue'],
          numericColumns: [1, 2],
          rows: [
            ['Chunked content', coverage.lessons.chunkedContent, pct(coverage.lessons.chunkedContent, coverage.lessons.total)],
            ['Simplified summary', coverage.lessons.simplifiedSummary, pct(coverage.lessons.simplifiedSummary, coverage.lessons.total)],
            ['Focus mode', coverage.lessons.focusMode, pct(coverage.lessons.focusMode, coverage.lessons.total)],
            ['Video', coverage.lessons.withVideo, pct(coverage.lessons.withVideo, coverage.lessons.total)],
            ['Quiz', coverage.lessons.withQuiz, pct(coverage.lessons.withQuiz, coverage.lessons.total)],
            ['PDF material', coverage.lessons.withPdf, pct(coverage.lessons.withPdf, coverage.lessons.total)],
            ['Transcript text', coverage.lessons.withTranscriptContent, pct(coverage.lessons.withTranscriptContent, coverage.lessons.total)],
          ],
        },
      },
      {
        title: 'Courses by disability focus',
        chart: {
          type: 'bar' as const,
          title: 'Primary focus',
          unit: 'courses',
          series: coverage.disabilityFocus.map((d) => ({ label: d.focus, value: d.courses })),
        },
      },
    ],
    findings,
    caveats: [
      'Adaptation events only exist for features instrumented in the learner interface. An absent feature means "not recorded", not "not needed".',
      'Accessibility profile distribution is excluded: disability type is not recorded for any user.',
      'Lesson accessibility scores are excluded: every lesson holds the column default rather than an audit result.',
      `Transcript coverage counts lessons with actual transcript text, not the has_transcript flag, which is set on all ${coverage.lessons.total} lessons regardless of content.`,
    ],
  }
}
