/**
 * Single, shared definition of student engagement risk.
 *
 * Before this module existed, three separate implementations computed the
 * same concept differently — `getSmartStatus` (educator-api.ts),
 * `determineStudentRisk` (educator-analytics-api.ts, fetchStudentsDeepProgress),
 * and an inline version in `fetchCourseDetailData` — with different day
 * thresholds and different "failure" signals (one used the quiz's `result`
 * column, another used "any score under 50%"). The same student could show
 * "Active" on one educator page and "At Risk" on another for identical
 * underlying data. Every surface (Dashboard, Students Progress, Course →
 * Students, Student Profile, Analytics, Course Detail dialog) now calls this
 * one function.
 */

export type StudentRiskStatus = 'active' | 'at-risk' | 'inactive' | 'completed' | 'dropped'

export interface StudentRiskInput {
  /**
   * The enrollment's own status, when the caller is evaluating a single
   * enrollment. 'completed' and 'dropped' are terminal states and are
   * always passed through as-is — a finished course is never "at risk",
   * no matter how long ago the student was last active in it.
   *
   * Omit this when aggregating risk across multiple courses for one
   * student overall (a student can't have one terminal status that covers
   * every course they're enrolled in) — the aggregate falls through to the
   * time/progress-based rules below.
   */
  enrollmentStatus?: string | null
  /**
   * The student's most recent known activity in scope (a lesson view or
   * quiz attempt). Pass the enrollment date when there has been no
   * activity yet — "days since I could have started" is the correct
   * fallback, not "never inactive".
   */
  lastActive: Date | string | null
  /** 0-100 completion percentage for the course (or overall, when aggregating). */
  progressPercent: number
  /** Whether the student has at least one failed quiz attempt in scope. */
  hasQuizFailure?: boolean
}

/**
 * Risk criteria (in order):
 * 1. completed / dropped enrollment => pass through unchanged.
 * 2. > 14 days since last activity => inactive. The strongest, clearest
 *    signal — a student who has genuinely stopped coming back.
 * 3. Otherwise, any one of these is an early warning => at-risk:
 *      - > 7 days since last activity (engagement is already slowing)
 *      - a failed quiz attempt (a comprehension signal, not just recency)
 *      - > 3 days enrolled/inactive with < 10% progress (stalled before
 *        really starting)
 * 4. Otherwise => active.
 */
export function determineStudentRisk(input: StudentRiskInput): StudentRiskStatus {
  const { enrollmentStatus, lastActive, progressPercent, hasQuizFailure = false } = input

  if (enrollmentStatus === 'completed' || enrollmentStatus === 'dropped') {
    return enrollmentStatus
  }

  if (!lastActive) return 'inactive'

  const lastActiveDate = typeof lastActive === 'string' ? new Date(lastActive) : lastActive
  const daysSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceActive > 14) return 'inactive'
  if (daysSinceActive > 7 || hasQuizFailure || (daysSinceActive > 3 && progressPercent < 10)) {
    return 'at-risk'
  }
  return 'active'
}
