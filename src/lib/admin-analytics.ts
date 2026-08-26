/**
 * Admin analytics — the single source of truth for every number the Admin
 * Portal displays.
 *
 * Dashboard, Analytics, Reports and the user profile page all read from this
 * module, so a figure can never disagree with itself across two screens.
 *
 * ─── Definitions used throughout ────────────────────────────────────────
 *
 * PROGRESS      completed published lessons ÷ published lessons in the course.
 *               Uses `lesson_progress.is_completed`, and only counts rows whose
 *               lesson is still published — a stale row for a deleted lesson
 *               would otherwise push an enrollment past 100%.
 *
 * LAST ACTIVE   MAX over: users.last_login_at, lesson_progress.last_viewed_at,
 *               quiz_attempts.submitted_at/started_at,
 *               adaptive_interactions.created_at, enrollments.enrolled_at.
 *               `users.is_active` is NOT an activity signal — it is an
 *               account-enabled flag that is true for every account.
 *
 * COMPLETION    Reported as two distinct metrics that must never be averaged
 *               together, because the database disagrees with itself:
 *                 · markedComplete   — enrollments.status = 'completed'
 *                 · lessonCompletion — enrollments at 100% PROGRESS
 *               On current data 14 enrollments are marked complete while none
 *               has finished every published lesson. Showing one number would
 *               mean picking a side silently.
 *
 * ─── Fields deliberately NOT reported ───────────────────────────────────
 *
 * lessons.has_transcript      true on every row while `transcript` is empty on
 *                             every row. Transcript coverage is derived from
 *                             the content instead.
 * lessons.accessibility_score 100 on every row — a column default, not an
 *                             audit result.
 * user_profiles.age_group     a Postgres function returning '18+' whenever
 *                             birth_date is NULL, which it is for 23 of 25
 *                             users. Reported as coverage, never as a chart.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Client ──────────────────────────────────────────────────────────────

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Date ranges ─────────────────────────────────────────────────────────

export type RangeKey = '7d' | '30d' | '3m' | '6m' | '1y' | 'all'

export const RANGE_KEYS: RangeKey[] = ['7d', '30d', '3m', '6m', '1y', 'all']

export const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '1y': 'Last year',
  all: 'All time',
}

export type Granularity = 'day' | 'week' | 'month'

export interface DateRange {
  key: RangeKey
  /** null means unbounded — "all time" */
  from: Date | null
  to: Date
  label: string
  granularity: Granularity
}

const DAY_MS = 24 * 60 * 60 * 1000

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

/**
 * `all` is the default on purpose. Course, lesson, enrollment and quiz records
 * in this database stop several weeks before the present, so a 30-day default
 * would render most charts empty and read as a bug rather than as an absence
 * of records.
 */
export function resolveRange(key: string | null | undefined, now: Date = new Date()): DateRange {
  const k = (RANGE_KEYS as string[]).includes(key ?? '') ? (key as RangeKey) : 'all'
  const to = now
  let from: Date | null
  let granularity: Granularity

  switch (k) {
    case '7d':
      from = new Date(now.getTime() - 7 * DAY_MS)
      granularity = 'day'
      break
    case '30d':
      from = new Date(now.getTime() - 30 * DAY_MS)
      granularity = 'day'
      break
    case '3m':
      from = subtractMonths(now, 3)
      granularity = 'week'
      break
    case '6m':
      from = subtractMonths(now, 6)
      granularity = 'month'
      break
    case '1y':
      from = subtractMonths(now, 12)
      granularity = 'month'
      break
    default:
      from = null
      granularity = 'month'
  }

  return { key: k, from, to, label: RANGE_LABELS[k], granularity }
}

/**
 * The equally-long window immediately before `range`, used for period-over-period
 * deltas. Returns null for "all time", which has no comparable prior period —
 * callers must then suppress the delta rather than invent one.
 */
export function previousRange(range: DateRange): DateRange | null {
  if (!range.from) return null
  const span = range.to.getTime() - range.from.getTime()
  return {
    key: range.key,
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime()),
    label: `Previous ${range.label.toLowerCase()}`,
    granularity: range.granularity,
  }
}

function inRange(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return false
  if (range.from && t < range.from.getTime()) return false
  return t <= range.to.getTime()
}

// ─── Change calculation ──────────────────────────────────────────────────

export interface Change {
  current: number
  previous: number
  /** null when a percentage change would be meaningless or misleading */
  percent: number | null
  direction: 'up' | 'down' | 'flat'
  /** why percent is null, for the UI to explain itself */
  suppressedReason?: 'no-prior-period' | 'insufficient-data'
}

/**
 * A delta is only shown when it means something. Growing from 0 has no
 * percentage, and a handful of records produces percentages that swing wildly
 * enough to mislead — those cases return null rather than a confident number.
 */
export function calcChange(current: number, previous: number, minBase = 3): Change {
  const direction: Change['direction'] =
    current > previous ? 'up' : current < previous ? 'down' : 'flat'

  if (previous < minBase) {
    return { current, previous, percent: null, direction, suppressedReason: 'insufficient-data' }
  }
  return {
    current,
    previous,
    percent: Math.round(((current - previous) / previous) * 1000) / 10,
    direction,
  }
}

// ─── Raw snapshot ────────────────────────────────────────────────────────

export interface RawUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  deleted_at: string | null
}

export interface RawCourse {
  id: string
  title: string
  status: string
  course_type: string
  category: string | null
  difficulty_level: string | null
  created_by: string
  created_at: string
  published_at: string | null
  supports_tts: boolean | null
  supports_transcripts: boolean | null
  supports_focus_mode: boolean | null
  supports_chunked_learning: boolean | null
  primary_disability_focus: string | null
  accessibility_categories: string[] | null
}

export interface RawLesson {
  id: string
  course_id: string
  title: string
  status: string
  sequence_order: number
  lesson_type: string
  estimated_duration: number | null
  transcript: string | null
  simplified_summary: string | null
  focus_mode_enabled: boolean
  chunked_content_enabled: boolean
  has_video: boolean | null
  has_pdf: boolean | null
  has_quiz: boolean | null
}

export interface RawEnrollment {
  id: string
  user_id: string
  course_id: string
  status: string
  enrolled_at: string
  completed_at: string | null
}

export interface RawLessonProgress {
  enrollment_id: string
  lesson_id: string
  is_viewed: boolean
  is_completed: boolean | null
  view_count: number
  first_viewed_at: string | null
  last_viewed_at: string | null
  time_spent_learning: number
}

export interface RawQuizAttempt {
  enrollment_id: string
  quiz_id: string
  score_pct: number | null
  result: string
  started_at: string
  submitted_at: string | null
}

export interface RawCertificate {
  id: string
  user_id: string | null
  course_id: string | null
  enrollment_id: string
  status: string
  issued_at: string
  revoked_at: string | null
  reference_code?: string | null
  verification_url?: string | null
}

export interface RawAdaptation {
  user_id: string
  lesson_id: string | null
  course_id: string | null
  adaptation_used: string
  created_at: string
}

export interface RawProfile {
  user_id: string
  username?: string | null
  phone_number?: string | null
  bio?: string | null
  avatar_url?: string | null
  birth_date: string | null
  country: string | null
  preferred_language: string | null
  disability_type: string | null
  accessibility_prefs: Record<string, unknown> | null
  notification_prefs?: Record<string, boolean> | null
}

export interface AnalyticsSnapshot {
  users: RawUser[]
  courses: RawCourse[]
  lessons: RawLesson[]
  enrollments: RawEnrollment[]
  lessonProgress: RawLessonProgress[]
  quizAttempts: RawQuizAttempt[]
  certificates: RawCertificate[]
  adaptations: RawAdaptation[]
  profiles: RawProfile[]
}

/**
 * Loads every table the admin surfaces need, once.
 *
 * This is deliberately a whole-table read rather than a set of filtered
 * queries: the working set is a few hundred rows, and holding one consistent
 * snapshot in memory is what lets every metric below be derived from the same
 * data. Filtering happens per-metric against the requested range, so a single
 * fetch serves the dashboard, its comparison period and every chart on it.
 */
export async function loadSnapshot(client?: SupabaseClient): Promise<AnalyticsSnapshot> {
  const db = client ?? createAdminClient()

  const [
    users,
    courses,
    lessons,
    enrollments,
    lessonProgress,
    quizAttempts,
    certificates,
    adaptations,
    profiles,
  ] = await Promise.all([
    db
      .from('users')
      .select('id, email, full_name, role, is_active, last_login_at, created_at, deleted_at')
      .is('deleted_at', null),
    db
      .from('courses')
      .select(
        'id, title, status, course_type, category, difficulty_level, created_by, created_at, published_at, supports_tts, supports_transcripts, supports_focus_mode, supports_chunked_learning, primary_disability_focus, accessibility_categories'
      )
      .is('deleted_at', null),
    db
      .from('lessons')
      .select(
        'id, course_id, title, status, sequence_order, lesson_type, estimated_duration, transcript, simplified_summary, focus_mode_enabled, chunked_content_enabled, has_video, has_pdf, has_quiz'
      ),
    db.from('enrollments').select('id, user_id, course_id, status, enrolled_at, completed_at'),
    db
      .from('lesson_progress')
      .select(
        'enrollment_id, lesson_id, is_viewed, is_completed, view_count, first_viewed_at, last_viewed_at, time_spent_learning'
      ),
    db
      .from('quiz_attempts')
      .select('enrollment_id, quiz_id, score_pct, result, started_at, submitted_at'),
    db
      .from('certificates')
      .select('id, user_id, course_id, enrollment_id, status, issued_at, revoked_at, reference_code, verification_url'),
    db
      .from('adaptive_interactions')
      .select('user_id, lesson_id, course_id, adaptation_used, created_at'),
    db
      .from('user_profiles')
      .select(
        'user_id, username, phone_number, bio, avatar_url, birth_date, country, preferred_language, disability_type, accessibility_prefs, notification_prefs'
      ),
  ])

  const firstError = [
    users,
    courses,
    lessons,
    enrollments,
    lessonProgress,
    quizAttempts,
    certificates,
    adaptations,
    profiles,
  ].find((r) => r.error)
  if (firstError?.error) {
    throw new Error(`Analytics snapshot failed: ${firstError.error.message}`)
  }

  return {
    users: (users.data ?? []) as RawUser[],
    courses: (courses.data ?? []) as RawCourse[],
    lessons: (lessons.data ?? []) as RawLesson[],
    enrollments: (enrollments.data ?? []) as RawEnrollment[],
    lessonProgress: (lessonProgress.data ?? []) as RawLessonProgress[],
    quizAttempts: (quizAttempts.data ?? []) as RawQuizAttempt[],
    certificates: (certificates.data ?? []) as RawCertificate[],
    adaptations: (adaptations.data ?? []) as RawAdaptation[],
    profiles: (profiles.data ?? []) as RawProfile[],
  }
}

// ─── Derived indexes ─────────────────────────────────────────────────────

export interface SnapshotIndex {
  /** enrollment id → its course id */
  enrollmentCourse: Map<string, string>
  /** enrollment id → its user id */
  enrollmentUser: Map<string, string>
  /** course id → set of published lesson ids */
  publishedLessons: Map<string, Set<string>>
  /** course id → published lesson count */
  publishedLessonCount: Map<string, number>
  /** enrollment id → completed published lessons */
  completedLessons: Map<string, number>
  /** enrollment id → started (viewed) published lessons */
  startedLessons: Map<string, number>
  /** enrollment id → progress 0–100 */
  progress: Map<string, number>
  /** enrollment id → seconds spent */
  timeSpent: Map<string, number>
  /** user id → most recent activity of any kind */
  lastActive: Map<string, Date>
  /** course id → its record */
  courseById: Map<string, RawCourse>
  /** user id → its record */
  userById: Map<string, RawUser>
  /** user id → its profile */
  profileByUser: Map<string, RawProfile>
}

export function buildIndex(snap: AnalyticsSnapshot): SnapshotIndex {
  const enrollmentCourse = new Map<string, string>()
  const enrollmentUser = new Map<string, string>()
  for (const e of snap.enrollments) {
    enrollmentCourse.set(e.id, e.course_id)
    enrollmentUser.set(e.id, e.user_id)
  }

  const publishedLessons = new Map<string, Set<string>>()
  for (const l of snap.lessons) {
    if (l.status !== 'published') continue
    let set = publishedLessons.get(l.course_id)
    if (!set) {
      set = new Set<string>()
      publishedLessons.set(l.course_id, set)
    }
    set.add(l.id)
  }
  const publishedLessonCount = new Map<string, number>()
  for (const [courseId, set] of publishedLessons) {
    publishedLessonCount.set(courseId, set.size)
  }

  const completedLessons = new Map<string, number>()
  const startedLessons = new Map<string, number>()
  const timeSpent = new Map<string, number>()
  const lastActiveByEnrollment = new Map<string, number>()

  for (const p of snap.lessonProgress) {
    const courseId = enrollmentCourse.get(p.enrollment_id)
    // Ignore progress rows whose lesson is no longer a published lesson of the
    // enrolled course — otherwise a removed lesson pushes progress past 100%.
    const valid = courseId ? publishedLessons.get(courseId)?.has(p.lesson_id) : false
    if (valid) {
      if (p.is_completed) {
        completedLessons.set(p.enrollment_id, (completedLessons.get(p.enrollment_id) ?? 0) + 1)
      }
      if (p.is_viewed) {
        startedLessons.set(p.enrollment_id, (startedLessons.get(p.enrollment_id) ?? 0) + 1)
      }
    }
    timeSpent.set(
      p.enrollment_id,
      (timeSpent.get(p.enrollment_id) ?? 0) + (p.time_spent_learning ?? 0)
    )
    if (p.last_viewed_at) {
      const t = new Date(p.last_viewed_at).getTime()
      if (!Number.isNaN(t) && t > (lastActiveByEnrollment.get(p.enrollment_id) ?? 0)) {
        lastActiveByEnrollment.set(p.enrollment_id, t)
      }
    }
  }

  for (const a of snap.quizAttempts) {
    const stamp = a.submitted_at ?? a.started_at
    if (!stamp) continue
    const t = new Date(stamp).getTime()
    if (!Number.isNaN(t) && t > (lastActiveByEnrollment.get(a.enrollment_id) ?? 0)) {
      lastActiveByEnrollment.set(a.enrollment_id, t)
    }
  }

  const progress = new Map<string, number>()
  for (const e of snap.enrollments) {
    const total = publishedLessonCount.get(e.course_id) ?? 0
    const done = completedLessons.get(e.id) ?? 0
    progress.set(e.id, total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0)
  }

  // LAST ACTIVE — every signal the schema actually records, newest wins.
  const lastActive = new Map<string, Date>()
  const bump = (userId: string | null | undefined, stamp: string | null | undefined) => {
    if (!userId || !stamp) return
    const t = new Date(stamp).getTime()
    if (Number.isNaN(t)) return
    const existing = lastActive.get(userId)
    if (!existing || t > existing.getTime()) lastActive.set(userId, new Date(t))
  }

  for (const u of snap.users) bump(u.id, u.last_login_at)
  for (const e of snap.enrollments) {
    bump(e.user_id, e.enrolled_at)
    bump(e.user_id, e.completed_at)
  }
  for (const [enrollmentId, t] of lastActiveByEnrollment) {
    bump(enrollmentUser.get(enrollmentId), new Date(t).toISOString())
  }
  for (const a of snap.adaptations) bump(a.user_id, a.created_at)

  return {
    enrollmentCourse,
    enrollmentUser,
    publishedLessons,
    publishedLessonCount,
    completedLessons,
    startedLessons,
    progress,
    timeSpent,
    lastActive,
    courseById: new Map(snap.courses.map((c) => [c.id, c])),
    userById: new Map(snap.users.map((u) => [u.id, u])),
    profileByUser: new Map(snap.profiles.map((p) => [p.user_id, p])),
  }
}

// ─── Time bucketing ──────────────────────────────────────────────────────

export interface Bucket {
  /** ISO date of the bucket start */
  key: string
  /** short human label for an axis */
  label: string
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function startOfMonth(d: Date): Date {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}

function bucketStart(d: Date, g: Granularity): Date {
  return g === 'day' ? startOfDay(d) : g === 'week' ? startOfWeek(d) : startOfMonth(d)
}

function bucketLabel(d: Date, g: Granularity): string {
  if (g === 'month') return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Every bucket in the range, including empty ones, so a gap in the data reads
 * as a gap rather than as a missing point the chart quietly closes over.
 */
export function buildBuckets(range: DateRange, earliest: Date | null): Bucket[] {
  const start = range.from ?? earliest
  if (!start) return []

  const buckets: Bucket[] = []
  const cursor = bucketStart(start, range.granularity)
  const end = range.to.getTime()
  let guard = 0

  while (cursor.getTime() <= end && guard++ < 800) {
    buckets.push({
      key: cursor.toISOString().slice(0, 10),
      label: bucketLabel(cursor, range.granularity),
    })
    if (range.granularity === 'day') cursor.setDate(cursor.getDate() + 1)
    else if (range.granularity === 'week') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
  }
  return buckets
}

/** Counts timestamped records into the supplied buckets. */
export function bucketCounts(
  stamps: (string | null | undefined)[],
  buckets: Bucket[],
  granularity: Granularity
): Map<string, number> {
  const valid = new Set(buckets.map((b) => b.key))
  const counts = new Map<string, number>()
  for (const b of buckets) counts.set(b.key, 0)

  for (const s of stamps) {
    if (!s) continue
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) continue
    const key = bucketStart(d, granularity).toISOString().slice(0, 10)
    if (valid.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function earliestStamp(snap: AnalyticsSnapshot): Date | null {
  const candidates: number[] = []
  const push = (s: string | null | undefined) => {
    if (!s) return
    const t = new Date(s).getTime()
    if (!Number.isNaN(t)) candidates.push(t)
  }
  for (const u of snap.users) push(u.created_at)
  for (const c of snap.courses) push(c.created_at)
  for (const e of snap.enrollments) push(e.enrolled_at)
  for (const a of snap.adaptations) push(a.created_at)
  return candidates.length ? new Date(Math.min(...candidates)) : null
}

// ─── Activity ────────────────────────────────────────────────────────────

export type ActivityBand = 'active-7' | 'active-30' | 'dormant-90' | 'never'

export function activityBand(last: Date | undefined, now = new Date()): ActivityBand {
  if (!last) return 'never'
  const days = (now.getTime() - last.getTime()) / DAY_MS
  if (days <= 7) return 'active-7'
  if (days <= 30) return 'active-30'
  if (days <= 90) return 'dormant-90'
  return 'never'
}

export const ACTIVITY_BAND_LABELS: Record<ActivityBand, string> = {
  'active-7': 'Active this week',
  'active-30': 'Active this month',
  'dormant-90': 'Dormant (30–90 days)',
  never: 'No recorded activity',
}

/** Users with any recorded activity inside the range. */
export function activeUserCount(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  range: DateRange
): number {
  let n = 0
  for (const u of snap.users) {
    const last = index.lastActive.get(u.id)
    if (!last) continue
    if (range.from && last.getTime() < range.from.getTime()) continue
    if (last.getTime() > range.to.getTime()) continue
    n++
  }
  return n
}

// ─── Headline metrics ────────────────────────────────────────────────────

export interface Kpis {
  totalUsers: number
  newUsers: number
  activeUsers: number
  totalCourses: number
  publishedCourses: number
  draftCourses: number
  newCourses: number
  totalEnrollments: number
  newEnrollments: number
  activeEnrollments: number
  /** enrollments.status = 'completed' */
  markedComplete: number
  markedCompleteRate: number
  /** enrollments at 100% derived lesson progress */
  fullyProgressed: number
  fullyProgressedRate: number
  averageProgress: number
  lessonsStarted: number
  lessonsCompleted: number
  lessonCompletionRate: number
  totalLearningSeconds: number
  quizAttempts: number
  quizPassRate: number | null
  averageQuizScore: number | null
  certificatesIssued: number
}

export function computeKpis(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  range: DateRange
): Kpis {
  const enrollmentsInRange = snap.enrollments.filter((e) => inRange(e.enrolled_at, range))
  const totalEnrollments = snap.enrollments.length

  const markedComplete = snap.enrollments.filter((e) => e.status === 'completed').length
  let fullyProgressed = 0
  let progressSum = 0
  for (const e of snap.enrollments) {
    const pct = index.progress.get(e.id) ?? 0
    progressSum += pct
    if (pct >= 100) fullyProgressed++
  }

  // Lesson funnel is scoped to the range by when the lesson was last opened.
  let lessonsStarted = 0
  let lessonsCompleted = 0
  let seconds = 0
  for (const p of snap.lessonProgress) {
    if (!inRange(p.last_viewed_at, range)) continue
    if (p.is_viewed) lessonsStarted++
    if (p.is_completed) lessonsCompleted++
    seconds += p.time_spent_learning ?? 0
  }

  const attemptsInRange = snap.quizAttempts.filter(
    (a) => inRange(a.submitted_at ?? a.started_at, range) && a.result !== 'in_progress'
  )
  const scored = attemptsInRange.filter((a) => a.score_pct != null)
  const passed = attemptsInRange.filter((a) => a.result === 'pass').length

  return {
    totalUsers: snap.users.length,
    newUsers: snap.users.filter((u) => inRange(u.created_at, range)).length,
    activeUsers: activeUserCount(snap, index, range),
    totalCourses: snap.courses.length,
    publishedCourses: snap.courses.filter((c) => c.status === 'published').length,
    draftCourses: snap.courses.filter((c) => c.status === 'draft').length,
    newCourses: snap.courses.filter((c) => inRange(c.created_at, range)).length,
    totalEnrollments,
    newEnrollments: enrollmentsInRange.length,
    activeEnrollments: snap.enrollments.filter((e) => e.status === 'active').length,
    markedComplete,
    markedCompleteRate: totalEnrollments ? Math.round((markedComplete / totalEnrollments) * 100) : 0,
    fullyProgressed,
    fullyProgressedRate: totalEnrollments
      ? Math.round((fullyProgressed / totalEnrollments) * 100)
      : 0,
    averageProgress: totalEnrollments ? Math.round(progressSum / totalEnrollments) : 0,
    lessonsStarted,
    lessonsCompleted,
    lessonCompletionRate: lessonsStarted ? Math.round((lessonsCompleted / lessonsStarted) * 100) : 0,
    totalLearningSeconds: seconds,
    quizAttempts: attemptsInRange.length,
    quizPassRate: attemptsInRange.length
      ? Math.round((passed / attemptsInRange.length) * 100)
      : null,
    averageQuizScore: scored.length
      ? Math.round(scored.reduce((sum, a) => sum + (a.score_pct ?? 0), 0) / scored.length)
      : null,
    certificatesIssued: snap.certificates.filter(
      (c) => c.status === 'issued' && inRange(c.issued_at, range)
    ).length,
  }
}

// ─── Course performance ──────────────────────────────────────────────────

export interface CoursePerformance {
  id: string
  title: string
  status: string
  courseType: string
  category: string | null
  difficulty: string | null
  creatorId: string
  creatorName: string
  publishedLessons: number
  enrollments: number
  activeEnrollments: number
  markedComplete: number
  markedCompleteRate: number
  fullyProgressed: number
  averageProgress: number
  learningSeconds: number
  certificates: number
  lastActivity: string | null
}

export function computeCoursePerformance(
  snap: AnalyticsSnapshot,
  index: SnapshotIndex
): CoursePerformance[] {
  const byCourse = new Map<string, RawEnrollment[]>()
  for (const e of snap.enrollments) {
    const list = byCourse.get(e.course_id)
    if (list) list.push(e)
    else byCourse.set(e.course_id, [e])
  }

  const certsByCourse = new Map<string, number>()
  for (const c of snap.certificates) {
    if (c.status !== 'issued') continue
    const courseId = c.course_id ?? index.enrollmentCourse.get(c.enrollment_id)
    if (courseId) certsByCourse.set(courseId, (certsByCourse.get(courseId) ?? 0) + 1)
  }

  const lastActivityByCourse = new Map<string, number>()
  for (const p of snap.lessonProgress) {
    if (!p.last_viewed_at) continue
    const courseId = index.enrollmentCourse.get(p.enrollment_id)
    if (!courseId) continue
    const t = new Date(p.last_viewed_at).getTime()
    if (!Number.isNaN(t) && t > (lastActivityByCourse.get(courseId) ?? 0)) {
      lastActivityByCourse.set(courseId, t)
    }
  }

  return snap.courses.map((course) => {
    const enrolls = byCourse.get(course.id) ?? []
    const markedComplete = enrolls.filter((e) => e.status === 'completed').length
    let progressSum = 0
    let fullyProgressed = 0
    let seconds = 0
    for (const e of enrolls) {
      const pct = index.progress.get(e.id) ?? 0
      progressSum += pct
      if (pct >= 100) fullyProgressed++
      seconds += index.timeSpent.get(e.id) ?? 0
    }
    const lastMs = lastActivityByCourse.get(course.id)

    return {
      id: course.id,
      title: course.title,
      status: course.status,
      courseType: course.course_type,
      category: course.category,
      difficulty: course.difficulty_level,
      creatorId: course.created_by,
      creatorName: index.userById.get(course.created_by)?.full_name ?? 'Unknown',
      publishedLessons: index.publishedLessonCount.get(course.id) ?? 0,
      enrollments: enrolls.length,
      activeEnrollments: enrolls.filter((e) => e.status === 'active').length,
      markedComplete,
      markedCompleteRate: enrolls.length ? Math.round((markedComplete / enrolls.length) * 100) : 0,
      fullyProgressed,
      averageProgress: enrolls.length ? Math.round(progressSum / enrolls.length) : 0,
      learningSeconds: seconds,
      certificates: certsByCourse.get(course.id) ?? 0,
      lastActivity: lastMs ? new Date(lastMs).toISOString() : null,
    }
  })
}

// ─── Lesson funnel (drop-off) ────────────────────────────────────────────

export interface LessonFunnelRow {
  id: string
  title: string
  sequenceOrder: number
  lessonType: string
  status: string
  learnersStarted: number
  learnersCompleted: number
  completionRate: number
  averageSeconds: number
  /** true where the largest fall-off from the previous lesson occurs */
  isDropOffPoint: boolean
}

export function computeLessonFunnel(
  courseId: string,
  snap: AnalyticsSnapshot
): LessonFunnelRow[] {
  const enrollmentIds = new Set(
    snap.enrollments.filter((e) => e.course_id === courseId).map((e) => e.id)
  )

  const started = new Map<string, number>()
  const completed = new Map<string, number>()
  const seconds = new Map<string, number>()
  const timeRows = new Map<string, number>()

  for (const p of snap.lessonProgress) {
    if (!enrollmentIds.has(p.enrollment_id)) continue
    if (p.is_viewed) started.set(p.lesson_id, (started.get(p.lesson_id) ?? 0) + 1)
    if (p.is_completed) completed.set(p.lesson_id, (completed.get(p.lesson_id) ?? 0) + 1)
    if (p.time_spent_learning > 0) {
      seconds.set(p.lesson_id, (seconds.get(p.lesson_id) ?? 0) + p.time_spent_learning)
      timeRows.set(p.lesson_id, (timeRows.get(p.lesson_id) ?? 0) + 1)
    }
  }

  const rows: LessonFunnelRow[] = snap.lessons
    .filter((l) => l.course_id === courseId)
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .map((l) => {
      const s = started.get(l.id) ?? 0
      const c = completed.get(l.id) ?? 0
      const rows = timeRows.get(l.id) ?? 0
      return {
        id: l.id,
        title: l.title,
        sequenceOrder: l.sequence_order,
        lessonType: l.lesson_type,
        status: l.status,
        learnersStarted: s,
        learnersCompleted: c,
        completionRate: s ? Math.round((c / s) * 100) : 0,
        averageSeconds: rows ? Math.round((seconds.get(l.id) ?? 0) / rows) : 0,
        isDropOffPoint: false,
      }
    })

  // The drop-off point is the steepest fall in learners between consecutive
  // lessons. With fewer than two lessons carrying learners there is no fall to
  // measure, so none is marked.
  let worstDelta = 0
  let worstIdx = -1
  for (let i = 1; i < rows.length; i++) {
    const delta = rows[i - 1].learnersStarted - rows[i].learnersStarted
    if (delta > worstDelta) {
      worstDelta = delta
      worstIdx = i
    }
  }
  if (worstIdx >= 0) rows[worstIdx].isDropOffPoint = true

  return rows
}

// ─── Accessibility ───────────────────────────────────────────────────────

/**
 * Adaptation events carry their detail in the event string, e.g.
 * `preset_applied:dyslexia`, because `adaptive_interactions` has no properties
 * column. Split rather than guess.
 */
export function splitAdaptation(raw: string): { type: string; detail: string | null } {
  const idx = raw.indexOf(':')
  return idx === -1
    ? { type: raw, detail: null }
    : { type: raw.slice(0, idx), detail: raw.slice(idx + 1) }
}

export const ADAPTATION_LABELS: Record<string, string> = {
  tts: 'Text-to-speech',
  focus_mode: 'Focus mode',
  slideshow: 'Slideshow layout',
  chunked_content: 'Chunked content',
  distraction_free: 'Distraction-free',
  reading_spotlight: 'Reading spotlight',
  simplified_summary: 'Simplified summary',
  high_contrast: 'High contrast',
  guided_mode: 'Guided mode',
  preset_applied: 'Preset applied',
}

export function labelAdaptation(type: string): string {
  return ADAPTATION_LABELS[type] ?? type.replace(/_/g, ' ')
}

export interface AdaptationUsage {
  type: string
  label: string
  events: number
  users: number
  lastUsed: string | null
}

export function computeAdaptationUsage(
  snap: AnalyticsSnapshot,
  range: DateRange
): AdaptationUsage[] {
  const byType = new Map<string, { events: number; users: Set<string>; last: number }>()

  for (const a of snap.adaptations) {
    if (!inRange(a.created_at, range)) continue
    const { type } = splitAdaptation(a.adaptation_used)
    let entry = byType.get(type)
    if (!entry) {
      entry = { events: 0, users: new Set(), last: 0 }
      byType.set(type, entry)
    }
    entry.events++
    entry.users.add(a.user_id)
    const t = new Date(a.created_at).getTime()
    if (!Number.isNaN(t) && t > entry.last) entry.last = t
  }

  return Array.from(byType.entries())
    .map(([type, v]) => ({
      type,
      label: labelAdaptation(type),
      events: v.events,
      users: v.users.size,
      lastUsed: v.last ? new Date(v.last).toISOString() : null,
    }))
    .sort((a, b) => b.events - a.events)
}

export interface PresetAdoption {
  preset: string
  events: number
  users: number
}

export function computePresetAdoption(
  snap: AnalyticsSnapshot,
  range: DateRange
): PresetAdoption[] {
  const byPreset = new Map<string, { events: number; users: Set<string> }>()
  for (const a of snap.adaptations) {
    if (!inRange(a.created_at, range)) continue
    const { type, detail } = splitAdaptation(a.adaptation_used)
    if (type !== 'preset_applied' || !detail) continue
    let entry = byPreset.get(detail)
    if (!entry) {
      entry = { events: 0, users: new Set() }
      byPreset.set(detail, entry)
    }
    entry.events++
    entry.users.add(a.user_id)
  }
  return Array.from(byPreset.entries())
    .map(([preset, v]) => ({ preset, events: v.events, users: v.users.size }))
    .sort((a, b) => b.events - a.events)
}

/**
 * Adoption of saved accessibility settings.
 *
 * `denominator` is the number of users who have ANY saved preferences — not the
 * whole user base. Absent preferences and disabled preferences are different
 * facts, and only 3 of 25 users have a record, so dividing by the population
 * would report a near-zero adoption that the data does not support. Callers
 * must show `denominator` alongside the percentages.
 */
export interface SettingsAdoption {
  denominator: number
  populationTotal: number
  features: { key: string; label: string; users: number }[]
}

const TRACKED_PREFS: { key: string; label: string; test: (p: Record<string, unknown>) => boolean }[] =
  [
    { key: 'tts_enabled', label: 'Text-to-speech', test: (p) => p.tts_enabled === true },
    {
      key: 'dyslexia_friendly_font',
      label: 'Dyslexia-friendly font',
      test: (p) => p.dyslexia_friendly_font === true || p.preferred_font === 'dyslexia',
    },
    {
      key: 'high_contrast',
      label: 'High contrast',
      test: (p) => p.high_contrast === true || p.preferred_theme === 'high_contrast',
    },
    {
      key: 'chunked_content_mode',
      label: 'Chunked content',
      test: (p) => p.chunked_content_mode === true,
    },
    {
      key: 'distraction_free_mode',
      label: 'Distraction-free',
      test: (p) => p.distraction_free_mode === true,
    },
    { key: 'simplified_ui', label: 'Simplified interface', test: (p) => p.simplified_ui === true },
    {
      key: 'reading_spotlight',
      label: 'Reading spotlight',
      test: (p) => p.reading_spotlight === true,
    },
    {
      key: 'keyboard_navigation_enabled',
      label: 'Keyboard navigation',
      test: (p) => p.keyboard_navigation_enabled === true,
    },
    { key: 'captions_enabled', label: 'Captions', test: (p) => p.captions_enabled === true },
  ]

export function computeSettingsAdoption(snap: AnalyticsSnapshot): SettingsAdoption {
  const withPrefs = snap.profiles.filter(
    (p) => p.accessibility_prefs && Object.keys(p.accessibility_prefs).length > 0
  )

  return {
    denominator: withPrefs.length,
    populationTotal: snap.users.length,
    features: TRACKED_PREFS.map((f) => ({
      key: f.key,
      label: f.label,
      users: withPrefs.filter((p) => f.test(p.accessibility_prefs as Record<string, unknown>))
        .length,
    })),
  }
}

/**
 * Accessibility coverage across the catalogue.
 *
 * Transcript coverage is derived from actual transcript content, not from
 * `lessons.has_transcript` — that flag is true on every row while the content
 * is empty on every row. `lessons.accessibility_score` is excluded entirely: it
 * is the literal 100 on all 141 rows, a column default rather than an audit.
 */
export interface AccessibilityCoverage {
  courses: {
    total: number
    supportsTts: number
    supportsTranscripts: number
    supportsFocusMode: number
    supportsChunkedLearning: number
    withDisabilityFocus: number
  }
  lessons: {
    total: number
    published: number
    focusMode: number
    chunkedContent: number
    simplifiedSummary: number
    withVideo: number
    withPdf: number
    withQuiz: number
    withTranscriptContent: number
  }
  disabilityFocus: { focus: string; courses: number }[]
}

export function computeAccessibilityCoverage(snap: AnalyticsSnapshot): AccessibilityCoverage {
  const focusCounts = new Map<string, number>()
  for (const c of snap.courses) {
    if (!c.primary_disability_focus) continue
    focusCounts.set(
      c.primary_disability_focus,
      (focusCounts.get(c.primary_disability_focus) ?? 0) + 1
    )
  }

  const hasTranscript = (l: RawLesson) => !!l.transcript && l.transcript.trim().length > 0

  return {
    courses: {
      total: snap.courses.length,
      supportsTts: snap.courses.filter((c) => c.supports_tts).length,
      supportsTranscripts: snap.courses.filter((c) => c.supports_transcripts).length,
      supportsFocusMode: snap.courses.filter((c) => c.supports_focus_mode).length,
      supportsChunkedLearning: snap.courses.filter((c) => c.supports_chunked_learning).length,
      withDisabilityFocus: snap.courses.filter((c) => c.primary_disability_focus).length,
    },
    lessons: {
      total: snap.lessons.length,
      published: snap.lessons.filter((l) => l.status === 'published').length,
      focusMode: snap.lessons.filter((l) => l.focus_mode_enabled).length,
      chunkedContent: snap.lessons.filter((l) => l.chunked_content_enabled).length,
      simplifiedSummary: snap.lessons.filter(
        (l) => !!l.simplified_summary && l.simplified_summary.trim().length > 0
      ).length,
      withVideo: snap.lessons.filter((l) => l.has_video).length,
      withPdf: snap.lessons.filter((l) => l.has_pdf).length,
      withQuiz: snap.lessons.filter((l) => l.has_quiz).length,
      withTranscriptContent: snap.lessons.filter(hasTranscript).length,
    },
    disabilityFocus: Array.from(focusCounts.entries())
      .map(([focus, courses]) => ({ focus, courses }))
      .sort((a, b) => b.courses - a.courses),
  }
}

// ─── Formatting helpers shared by UI and PDF ─────────────────────────────

// ─── Formatting helpers shared by UI and PDF ─────────────────────────────

export function computeAgeDistribution(snap: AnalyticsSnapshot): LabelCount[] {
  const profileByUserId = new Map(snap.profiles.map((p) => [p.user_id, p]))
  const now = new Date()

  const bands: Record<string, number> = {
    'Under 13': 0,
    '13–17': 0,
    '18–24': 0,
    '25–34': 0,
    '35+': 0,
    'Unspecified': 0,
  }

  for (const u of snap.users) {
    if (u.role !== 'learner') continue
    const prof = profileByUserId.get(u.id)
    if (!prof?.birth_date) {
      bands['Unspecified']++
      continue
    }

    const birthDate = new Date(prof.birth_date)
    if (Number.isNaN(birthDate.getTime())) {
      bands['Unspecified']++
      continue
    }

    let age = now.getFullYear() - birthDate.getFullYear()
    const m = now.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 13) bands['Under 13']++
    else if (age <= 17) bands['13–17']++
    else if (age <= 24) bands['18–24']++
    else if (age <= 34) bands['25–34']++
    else bands['35+']++
  }

  return Object.entries(bands).map(([label, count]) => ({ label, count }))
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return 'Never'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'Unknown'
  const days = Math.floor((now.getTime() - t) / DAY_MS)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} months ago`
  return `${Math.round(days / 365)} years ago`
}

// ─── API payload ─────────────────────────────────────────────────────────
//
// Shared between `/api/admin/analytics` and its client callers so the two can
// never drift. Type-only import on the client keeps the service-role code out
// of the browser bundle.

export interface TrendPoint {
  key: string
  label: string
  enrollments: number
  completions: number
  registrations: number
  coursesCreated: number
  adaptations: number
  lessonActivity: number
}

export interface LabelCount {
  label: string
  count: number
}

export interface RecentActivityItem {
  type: 'user_registration' | 'course_created' | 'certificate_issued'
  name: string
  detail: string
  at: string
}

export interface AdminAnalyticsPayload {
  range: {
    key: RangeKey
    label: string
    from: string | null
    to: string
    granularity: Granularity
    comparisonAvailable: boolean
  }
  kpis: Kpis
  changes: {
    newUsers: Change | null
    activeUsers: Change | null
    newEnrollments: Change | null
    newCourses: Change | null
    lessonsCompleted: Change | null
    certificatesIssued: Change | null
  }
  trends: TrendPoint[]
  composition: {
    roles: LabelCount[]
    courseStatus: LabelCount[]
    difficulty: LabelCount[]
    categories: LabelCount[]
    ageDistribution: LabelCount[]
  }
  learners: {
    bands: { band: ActivityBand; label: string; count: number }[]
    progressDistribution: LabelCount[]
    ageDistribution: LabelCount[]
    totalLearners: number
  }
  courses: {
    topByEnrollment: CoursePerformance[]
    topByCompletion: CoursePerformance[]
    lowEngagement: CoursePerformance[]
    total: number
  }
  accessibility: {
    adaptationUsage: AdaptationUsage[]
    presetAdoption: PresetAdoption[]
    settingsAdoption: SettingsAdoption
    coverage: AccessibilityCoverage
    reach: { usersWithEvents: number; learnerTotal: number }
  }
  recentActivity: RecentActivityItem[]
  totals: { learningTimeLabel: string }
}

// ─── Individual user detail ──────────────────────────────────────────────

export interface UserCourseRow {
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseStatus: string
  difficulty: string | null
  category: string | null
  enrollmentStatus: string
  progress: number
  lessonsCompleted: number
  lessonsStarted: number
  publishedLessons: number
  learningSeconds: number
  enrolledAt: string
  completedAt: string | null
  lastActivity: string | null
  certificateId: string | null
}

export interface UserLessonActivity {
  lessonId: string
  lessonTitle: string
  courseTitle: string
  isCompleted: boolean
  viewCount: number
  lastViewedAt: string | null
  timeSpentSeconds: number
}

export interface UserQuizRow {
  quizId: string
  courseTitle: string
  attempts: number
  bestScore: number | null
  lastResult: string
  lastAttemptAt: string | null
}

export interface UserAccessibilityDetail {
  hasSavedPreferences: boolean
  activePreset: string | null
  declaredDisability: string | null
  enabledFeatures: { key: string; label: string }[]
  recentAdaptations: { type: string; label: string; at: string }[]
  adaptationTotals: { type: string; label: string; events: number }[]
}

export interface EducatorDetail {
  coursesCreated: number
  published: number
  drafts: number
  totalEnrollments: number
  totalMarkedComplete: number
  markedCompleteRate: number
  averageProgress: number
  totalLearners: number
  certificatesIssued: number
  courses: CoursePerformance[]
}

export interface UserEarnedCertificate {
  id: string
  courseId: string | null
  courseTitle: string
  referenceCode: string | null
  issuedAt: string
  verificationUrl: string | null
}

export interface UserDetail {
  id: string
  email: string
  fullName: string | null
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  lastActive: string | null
  activityBand: ActivityBand
  activityBandLabel: string
  profile: {
    country: string | null
    preferredLanguage: string | null
    birthDateRecorded: boolean
    birthDate: string | null
    username: string | null
    phoneNumber: string | null
    bio: string | null
    avatarUrl: string | null
  }
  notifications: Record<string, boolean> | null
  learner: {
    totalEnrollments: number
    inProgress: number
    markedComplete: number
    fullyProgressed: number
    averageProgress: number
    totalLearningSeconds: number
    lessonsStarted: number
    lessonsCompleted: number
    certificates: number
    earnedCertificates: UserEarnedCertificate[]
    courses: UserCourseRow[]
    recentLessons: UserLessonActivity[]
    quizzes: UserQuizRow[]
  } | null
  educator: EducatorDetail | null
  accessibility: UserAccessibilityDetail
}

const PREF_FEATURE_LABELS: Record<string, string> = {
  tts_enabled: 'Text-to-speech',
  dyslexia_friendly_font: 'Dyslexia-friendly font',
  high_contrast: 'High contrast',
  chunked_content_mode: 'Chunked content',
  distraction_free_mode: 'Distraction-free mode',
  simplified_ui: 'Simplified interface',
  reading_spotlight: 'Reading spotlight',
  keyboard_navigation_enabled: 'Keyboard navigation',
  captions_enabled: 'Captions',
  step_by_step_enabled: 'Step-by-step guidance',
  visual_schedule_enabled: 'Visual schedule',
  task_checklist_enabled: 'Task checklist',
  progress_timeline_enabled: 'Progress timeline',
  muted_colors: 'Muted colours',
  ai_assistant_enabled: 'AI assistant',
}

/**
 * Everything the admin profile page shows for one user, derived from the same
 * snapshot the dashboard uses — so a learner progress figure here always
 * matches the course figures elsewhere.
 */
export function computeUserDetail(
  userId: string,
  snap: AnalyticsSnapshot,
  index: SnapshotIndex,
  now = new Date()
): UserDetail | null {
  const user = index.userById.get(userId)
  if (!user) return null

  const profile = index.profileByUser.get(userId)
  const last = index.lastActive.get(userId)
  const band = activityBand(last, now)

  // ── Accessibility (shared by every role) ────────────────────────────
  const prefs = (profile?.accessibility_prefs ?? null) as Record<string, unknown> | null
  const hasSavedPreferences = !!prefs && Object.keys(prefs).length > 0

  const enabledFeatures = hasSavedPreferences
    ? Object.entries(PREF_FEATURE_LABELS)
        .filter(([key]) => prefs?.[key] === true)
        .map(([key, label]) => ({ key, label }))
    : []
  if (
    hasSavedPreferences &&
    prefs?.preferred_font === 'dyslexia' &&
    !enabledFeatures.some((f) => f.key === 'dyslexia_friendly_font')
  ) {
    enabledFeatures.push({ key: 'dyslexia_friendly_font', label: 'Dyslexia-friendly font' })
  }

  const userAdaptations = snap.adaptations
    .filter((a) => a.user_id === userId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  const adaptationTotals = new Map<string, number>()
  for (const a of userAdaptations) {
    const { type } = splitAdaptation(a.adaptation_used)
    adaptationTotals.set(type, (adaptationTotals.get(type) ?? 0) + 1)
  }

  const activePreset =
    hasSavedPreferences &&
    typeof prefs?.active_preset === 'string' &&
    prefs.active_preset !== 'none'
      ? (prefs.active_preset as string)
      : null

  const accessibility: UserAccessibilityDetail = {
    hasSavedPreferences,
    activePreset,
    declaredDisability:
      profile?.disability_type ??
      (typeof prefs?.disability_type === 'string' ? (prefs.disability_type as string) : null),
    enabledFeatures,
    recentAdaptations: userAdaptations.slice(0, 8).map((a) => {
      const { type } = splitAdaptation(a.adaptation_used)
      return { type, label: labelAdaptation(type), at: a.created_at }
    }),
    adaptationTotals: Array.from(adaptationTotals.entries())
      .map(([type, events]) => ({ type, label: labelAdaptation(type), events }))
      .sort((a, b) => b.events - a.events),
  }

  // ── Learner side ────────────────────────────────────────────────────
  const enrollments = snap.enrollments.filter((e) => e.user_id === userId)
  let learner: UserDetail['learner'] = null

  if (enrollments.length > 0 || user.role === 'learner') {
    const enrollmentIds = new Set(enrollments.map((e) => e.id))

    const certByEnrollment = new Map<string, string>()
    for (const c of snap.certificates) {
      if (c.status === 'issued' && enrollmentIds.has(c.enrollment_id)) {
        certByEnrollment.set(c.enrollment_id, c.id)
      }
    }

    const lastActivityByEnrollment = new Map<string, number>()
    for (const p of snap.lessonProgress) {
      if (!enrollmentIds.has(p.enrollment_id) || !p.last_viewed_at) continue
      const t = new Date(p.last_viewed_at).getTime()
      if (!Number.isNaN(t) && t > (lastActivityByEnrollment.get(p.enrollment_id) ?? 0)) {
        lastActivityByEnrollment.set(p.enrollment_id, t)
      }
    }

    const courses: UserCourseRow[] = enrollments
      .map((e) => {
        const course = index.courseById.get(e.course_id)
        const lastMs = lastActivityByEnrollment.get(e.id)
        return {
          enrollmentId: e.id,
          courseId: e.course_id,
          courseTitle: course?.title ?? 'Removed course',
          courseStatus: course?.status ?? 'unknown',
          difficulty: course?.difficulty_level ?? null,
          category: course?.category ?? null,
          enrollmentStatus: e.status,
          progress: index.progress.get(e.id) ?? 0,
          lessonsCompleted: index.completedLessons.get(e.id) ?? 0,
          lessonsStarted: index.startedLessons.get(e.id) ?? 0,
          publishedLessons: index.publishedLessonCount.get(e.course_id) ?? 0,
          learningSeconds: index.timeSpent.get(e.id) ?? 0,
          enrolledAt: e.enrolled_at,
          completedAt: e.completed_at,
          lastActivity: lastMs ? new Date(lastMs).toISOString() : null,
          certificateId: certByEnrollment.get(e.id) ?? null,
        }
      })
      .sort((a, b) => {
        const at = a.lastActivity ?? a.enrolledAt
        const bt = b.lastActivity ?? b.enrolledAt
        return +new Date(bt) - +new Date(at)
      })

    const lessonById = new Map(snap.lessons.map((l) => [l.id, l]))
    const recentLessons: UserLessonActivity[] = snap.lessonProgress
      .filter((p) => enrollmentIds.has(p.enrollment_id))
      .sort((a, b) => +new Date(b.last_viewed_at ?? 0) - +new Date(a.last_viewed_at ?? 0))
      .slice(0, 10)
      .map((p) => {
        const lesson = lessonById.get(p.lesson_id)
        const courseId = index.enrollmentCourse.get(p.enrollment_id)
        return {
          lessonId: p.lesson_id,
          lessonTitle: lesson?.title ?? 'Removed lesson',
          courseTitle: (courseId && index.courseById.get(courseId)?.title) || 'Unknown course',
          isCompleted: !!p.is_completed,
          viewCount: p.view_count,
          lastViewedAt: p.last_viewed_at,
          timeSpentSeconds: p.time_spent_learning ?? 0,
        }
      })

    const quizByKey = new Map<string, UserQuizRow>()
    for (const a of snap.quizAttempts) {
      if (!enrollmentIds.has(a.enrollment_id)) continue
      const courseId = index.enrollmentCourse.get(a.enrollment_id)
      const key = a.quiz_id + ':' + a.enrollment_id
      const stamp = a.submitted_at ?? a.started_at
      const existing = quizByKey.get(key)
      if (!existing) {
        quizByKey.set(key, {
          quizId: a.quiz_id,
          courseTitle: (courseId && index.courseById.get(courseId)?.title) || 'Unknown course',
          attempts: 1,
          bestScore: a.score_pct,
          lastResult: a.result,
          lastAttemptAt: stamp,
        })
      } else {
        existing.attempts++
        if (
          a.score_pct != null &&
          (existing.bestScore == null || a.score_pct > existing.bestScore)
        ) {
          existing.bestScore = a.score_pct
        }
        if (
          stamp &&
          (!existing.lastAttemptAt || new Date(stamp) > new Date(existing.lastAttemptAt))
        ) {
          existing.lastAttemptAt = stamp
          existing.lastResult = a.result
        }
      }
    }

    const progressSum = courses.reduce((s, c) => s + c.progress, 0)

    const earnedCertificates: UserEarnedCertificate[] = snap.certificates
      .filter((c) => c.status === 'issued' && (c.user_id === userId || enrollmentIds.has(c.enrollment_id)))
      .map((c) => {
        const course = c.course_id ? index.courseById.get(c.course_id) : null
        return {
          id: c.id,
          courseId: c.course_id || null,
          courseTitle: course?.title || 'Course Certificate',
          referenceCode: c.reference_code || null,
          issuedAt: c.issued_at,
          verificationUrl: c.verification_url || (c.reference_code ? `/verify/${c.reference_code}` : null),
        }
      })
      .sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt))

    learner = {
      totalEnrollments: courses.length,
      inProgress: courses.filter((c) => c.enrollmentStatus === 'active').length,
      markedComplete: courses.filter((c) => c.enrollmentStatus === 'completed').length,
      fullyProgressed: courses.filter((c) => c.progress >= 100).length,
      averageProgress: courses.length ? Math.round(progressSum / courses.length) : 0,
      totalLearningSeconds: courses.reduce((s, c) => s + c.learningSeconds, 0),
      lessonsStarted: courses.reduce((s, c) => s + c.lessonsStarted, 0),
      lessonsCompleted: courses.reduce((s, c) => s + c.lessonsCompleted, 0),
      certificates: earnedCertificates.length || certByEnrollment.size,
      earnedCertificates,
      courses,
      recentLessons,
      quizzes: Array.from(quizByKey.values()).sort(
        (a, b) => +new Date(b.lastAttemptAt ?? 0) - +new Date(a.lastAttemptAt ?? 0)
      ),
    }
  }

  // ── Educator side ───────────────────────────────────────────────────
  let educator: EducatorDetail | null = null
  const authored = snap.courses.filter((c) => c.created_by === userId)

  if (authored.length > 0 || user.role === 'educator' || user.role === 'admin') {
    const authoredIds = new Set(authored.map((c) => c.id))
    const performance = computeCoursePerformance(snap, index).filter((c) => authoredIds.has(c.id))

    const totalEnrollments = performance.reduce((s, c) => s + c.enrollments, 0)
    const totalMarkedComplete = performance.reduce((s, c) => s + c.markedComplete, 0)
    const withEnrollments = performance.filter((c) => c.enrollments > 0)

    const learners = new Set(
      snap.enrollments.filter((e) => authoredIds.has(e.course_id)).map((e) => e.user_id)
    )

    educator = {
      coursesCreated: authored.length,
      published: authored.filter((c) => c.status === 'published').length,
      drafts: authored.filter((c) => c.status === 'draft').length,
      totalEnrollments,
      totalMarkedComplete,
      markedCompleteRate: totalEnrollments
        ? Math.round((totalMarkedComplete / totalEnrollments) * 100)
        : 0,
      averageProgress: withEnrollments.length
        ? Math.round(
            withEnrollments.reduce((s, c) => s + c.averageProgress, 0) / withEnrollments.length
          )
        : 0,
      totalLearners: learners.size,
      certificatesIssued: performance.reduce((s, c) => s + c.certificates, 0),
      courses: performance.sort((a, b) => b.enrollments - a.enrollments),
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    lastActive: last ? last.toISOString() : null,
    activityBand: band,
    activityBandLabel: ACTIVITY_BAND_LABELS[band],
    profile: {
      username: profile?.username ?? null,
      phoneNumber: profile?.phone_number ?? null,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      country: profile?.country ?? null,
      preferredLanguage: profile?.preferred_language ?? null,
      birthDateRecorded: !!profile?.birth_date,
      birthDate: profile?.birth_date ?? null,
    },
    notifications: (profile?.notification_prefs as Record<string, boolean>) || null,
    learner,
    educator,
    accessibility,
  }
}
