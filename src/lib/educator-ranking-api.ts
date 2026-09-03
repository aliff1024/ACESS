import { supabase } from './supabase'
import { determineStudentRisk, type StudentRiskStatus } from './student-risk'
import { requireCurrentUserId } from './current-user'

export type PerformanceTier = 'platinum' | 'gold' | 'silver' | 'bronze'

export interface EducatorScoreBreakdown {
  /** Course completion rate (0-100%) and points contribution (0-30 pts) */
  completionRate: number
  completionPoints: number

  /** Positive student status rate (0-100%) and points contribution (0-30 pts) */
  positiveProgressRate: number
  positiveProgressPoints: number

  /** Course catalog count/depth and points contribution (0-20 pts) */
  coursesCount: number
  courseCatalogPoints: number

  /** Student reach and points contribution (0-10 pts) */
  totalStudents: number
  studentReachPoints: number

  /** Risk mitigation / retention rate (0-100%) and points contribution (0-10 pts) */
  retentionRate: number
  retentionPoints: number

  /** Overall composite score (0-100 pts) */
  totalScore: number
}

export interface EducatorBadge {
  id: string
  label: string
  description: string
  icon: string
  color: string
}

export interface EducatorRankingEntry {
  educatorId: string
  fullName: string
  email: string
  avatarUrl: string | null
  bio: string | null
  joinedAt: string
  participating: boolean
  isCurrentUser: boolean

  // Key performance indicators
  coursesCreated: number
  totalStudents: number
  completionRate: number
  positiveStudentsCount: number
  atRiskStudentsCount: number
  inactiveStudentsCount: number

  // Scoring & Rank
  scoreBreakdown: EducatorScoreBreakdown
  overallScore: number
  rank: number
  tier: PerformanceTier
  badges: EducatorBadge[]
}

export interface MotivationalTip {
  id: string
  type: 'achievement' | 'completion' | 'retention' | 'course_quality'
  title: string
  description: string
  actionLabel?: string
  actionPath?: string
  potentialPoints: number
}

export interface LeaderboardResponse {
  leaderboard: EducatorRankingEntry[]
  currentEducator: EducatorRankingEntry | null
  totalParticipating: number
  platformAverages: {
    avgScore: number
    avgCompletionRate: number
    avgCourses: number
    avgStudents: number
  }
  motivationalTips: MotivationalTip[]
  isParticipating: boolean
}

export interface EducatorRankingCourse {
  id: string
  title: string
  description: string
  category: string | null
  difficultyLevel: string
  thumbnailUrl: string | null
  lessonCount: number
  studentCount: number
  completionRate: number
  positiveStatusRate: number
  updatedAt: string
  isOwner: boolean
  students?: {
    id: string
    name: string
    email: string
    progress: number
    status: StudentRiskStatus
    lastActive: string
    completedLessons: number
    totalLessons: number
  }[]
}

export interface EducatorDetailForRanking {
  educator: EducatorRankingEntry
  courses: EducatorRankingCourse[]
  canViewStudentPii: boolean
}

/**
 * Calculates a balanced multi-factor score (0 - 100) combining course quantity,
 * completion outcomes, student engagement status, reach, and risk mitigation.
 */
export function calculateEducatorScore(params: {
  coursesCreated: number
  totalLessons: number
  totalStudents: number
  avgCompletionRate: number
  positiveStudentsCount: number
  atRiskStudentsCount: number
  inactiveStudentsCount: number
}): EducatorScoreBreakdown {
  const {
    coursesCreated,
    totalLessons,
    totalStudents,
    avgCompletionRate,
    positiveStudentsCount,
    atRiskStudentsCount,
    inactiveStudentsCount,
  } = params

  // 1. Completion Rate Points (Weight: 30% -> max 30 pts)
  // avgCompletionRate is 0 to 100
  const normalizedCompletion = Math.min(100, Math.max(0, avgCompletionRate))
  const completionPoints = Math.round((normalizedCompletion / 100) * 30 * 10) / 10

  // 2. Positive Student Progress Points (Weight: 30% -> max 30 pts)
  // Ratio of active & completed students making healthy progress
  const positiveRate = totalStudents > 0
    ? Math.min(100, Math.round((positiveStudentsCount / totalStudents) * 100))
    : (coursesCreated > 0 ? 50 : 0)
  const positiveProgressPoints = Math.round((positiveRate / 100) * 30 * 10) / 10

  // 3. Course Catalog Quality & Depth (Weight: 20% -> max 20 pts)
  // High quality catalog: 1 course with good depth = ~10 pts, 2 courses = ~15 pts, 3+ complete courses = 20 pts
  let courseCatalogPoints = 0
  if (coursesCreated > 0) {
    const courseBase = Math.min(12, coursesCreated * 4)
    const lessonBonus = Math.min(8, Math.round((totalLessons / Math.max(1, coursesCreated)) * 1.6))
    courseCatalogPoints = Math.min(20, courseBase + lessonBonus)
  }

  // 4. Student Reach & Impact (Weight: 10% -> max 10 pts)
  // Scaled logarithmically so large courses don't eclipse specialized small classes
  let studentReachPoints = 0
  if (totalStudents > 0) {
    // 1 student = 3 pts, 5 students = 6 pts, 10+ students = 9 pts, 20+ students = 10 pts
    studentReachPoints = Math.min(10, Math.round((Math.log2(totalStudents + 1) / Math.log2(25)) * 10 * 10) / 10)
  }

  // 5. Retention & Risk Mitigation Points (Weight: 10% -> max 10 pts)
  // Rewards keeping learners active and mitigating inactive/at-risk states
  let retentionRate = 100
  if (totalStudents > 0) {
    const troubledStudents = atRiskStudentsCount + inactiveStudentsCount
    retentionRate = Math.max(0, Math.round(((totalStudents - troubledStudents) / totalStudents) * 100))
  }
  const retentionPoints = Math.round((retentionRate / 100) * 10 * 10) / 10

  // Total Score (0 - 100)
  const rawTotal = completionPoints + positiveProgressPoints + courseCatalogPoints + studentReachPoints + retentionPoints
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal * 10) / 10))

  return {
    completionRate: normalizedCompletion,
    completionPoints,
    positiveProgressRate: positiveRate,
    positiveProgressPoints,
    coursesCount: coursesCreated,
    courseCatalogPoints,
    totalStudents,
    studentReachPoints,
    retentionRate,
    retentionPoints,
    totalScore,
  }
}

/**
 * Resolves performance tier based on composite score.
 */
export function getPerformanceTier(score: number): PerformanceTier {
  if (score >= 85) return 'platinum'
  if (score >= 70) return 'gold'
  if (score >= 50) return 'silver'
  return 'bronze'
}

/**
 * Resolves achievement badges based on educator performance.
 */
export function resolveEducatorBadges(entry: {
  scoreBreakdown: EducatorScoreBreakdown
  coursesCreated: number
  totalStudents: number
  completionRate: number
  positiveStudentsCount: number
  atRiskStudentsCount: number
}): EducatorBadge[] {
  const badges: EducatorBadge[] = []

  if (entry.completionRate >= 75 && entry.totalStudents >= 2) {
    badges.push({
      id: 'completion_master',
      label: 'Completion Master',
      description: 'Maintains an exceptional >75% student course completion rate',
      icon: 'GraduationCap',
      color: 'emerald',
    })
  }

  if (entry.scoreBreakdown.positiveProgressRate >= 80 && entry.totalStudents >= 2) {
    badges.push({
      id: 'engagement_champion',
      label: 'Engagement Champion',
      description: 'Over 80% of enrolled students demonstrate positive active progress',
      icon: 'Flame',
      color: 'amber',
    })
  }

  if (entry.coursesCreated >= 3) {
    badges.push({
      id: 'content_pioneer',
      label: 'Content Pioneer',
      description: 'Created 3 or more published accessible courses',
      icon: 'BookOpenCheck',
      color: 'indigo',
    })
  }

  if (entry.totalStudents >= 10) {
    badges.push({
      id: 'community_anchor',
      label: 'Community Anchor',
      description: 'Mentored and guided 10 or more learners',
      icon: 'Users',
      color: 'blue',
    })
  }

  if (entry.atRiskStudentsCount === 0 && entry.totalStudents >= 3) {
    badges.push({
      id: 'risk_guardian',
      label: 'Risk Guardian',
      description: 'Zero at-risk or stalled students across all courses',
      icon: 'ShieldCheck',
      color: 'purple',
    })
  }

  if (badges.length === 0) {
    badges.push({
      id: 'rising_educator',
      label: 'Rising Educator',
      description: 'Building impactful learning experiences on ACESS',
      icon: 'Sparkles',
      color: 'purple',
    })
  }

  return badges
}

/**
 * Generates tailored motivational guidance for an educator.
 */
export function generateMotivationalTips(entry: EducatorRankingEntry): MotivationalTip[] {
  const tips: MotivationalTip[] = []

  if (entry.atRiskStudentsCount > 0) {
    tips.push({
      id: 'mitigate_risk',
      type: 'retention',
      title: `Support ${entry.atRiskStudentsCount} at-risk learner${entry.atRiskStudentsCount > 1 ? 's' : ''}`,
      description: `Re-engaging at-risk students who stalled on recent lessons will boost your retention and positive progress score.`,
      actionLabel: 'View At-Risk Students',
      actionPath: '/educator/students',
      potentialPoints: Math.min(12, entry.atRiskStudentsCount * 4),
    })
  }

  if (entry.completionRate < 70 && entry.totalStudents > 0) {
    tips.push({
      id: 'boost_completion',
      type: 'completion',
      title: 'Drive Course Completion',
      description: 'Add interactive checkpoints or check in with learners close to the finish line to lift your completion rate above 70%.',
      actionLabel: 'Review Course Progress',
      actionPath: '/educator/analytics',
      potentialPoints: Math.round((75 - entry.completionRate) * 0.25),
    })
  }

  if (entry.coursesCreated < 2) {
    tips.push({
      id: 'publish_new_course',
      type: 'course_quality',
      title: 'Expand Course Catalog',
      description: 'Publishing another accessible course will earn up to +8 catalog quality points.',
      actionLabel: 'Create New Course',
      actionPath: '/educator/courses/create',
      potentialPoints: 8,
    })
  }

  if (tips.length === 0) {
    tips.push({
      id: 'maintain_excellence',
      type: 'achievement',
      title: 'Maintain Top-Tier Standing',
      description: 'Your courses have stellar engagement. Continue monitoring student progress and publishing accessible modules!',
      actionLabel: 'Browse All Courses',
      actionPath: '/educator/courses/all',
      potentialPoints: 3,
    })
  }

  return tips
}

/**
 * Reads whether the user participates in the public ranking.
 */
export async function getRankingParticipation(userId?: string): Promise<boolean> {
  try {
    const targetId = userId || (await requireCurrentUserId())
    const { data, error } = await supabase
      .from('user_profiles')
      .select('notification_prefs, accessibility_prefs')
      .eq('user_id', targetId)
      .maybeSingle()

    if (error || !data) return true

    const notifPrefs = data.notification_prefs as Record<string, unknown> | null
    if (notifPrefs && typeof notifPrefs.participate_in_ranking === 'boolean') {
      return notifPrefs.participate_in_ranking
    }

    const accessPrefs = data.accessibility_prefs as Record<string, unknown> | null
    if (accessPrefs && typeof accessPrefs.participate_in_ranking === 'boolean') {
      return accessPrefs.participate_in_ranking
    }

    return true
  } catch (err) {
    console.error('Failed to get ranking participation:', err)
    return true
  }
}

/**
 * Updates ranking participation preference for the current educator.
 */
export async function setRankingParticipation(participating: boolean): Promise<void> {
  const userId = await requireCurrentUserId()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('notification_prefs')
    .eq('user_id', userId)
    .maybeSingle()

  const currentPrefs = typeof profile?.notification_prefs === 'object' && profile.notification_prefs !== null
    ? profile.notification_prefs
    : {}

  const mergedPrefs = { ...currentPrefs, participate_in_ranking: participating }

  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: userId, notification_prefs: mergedPrefs },
    { onConflict: 'user_id' }
  )

  if (error) throw error
}

/**
 * Fetches the full educator leaderboard, calculating performance indicators
 * for all educators and ranking them transparently.
 */
export async function fetchEducatorLeaderboard(currentUserId?: string): Promise<LeaderboardResponse> {
  const resolvedUserId = currentUserId || (await requireCurrentUserId())

  // 1. Fetch all users with role 'educator' or 'admin'
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .in('role', ['educator', 'admin'])

  if (userError) throw userError

  const userIds = (users || []).map((u) => u.id)

  // 2. Fetch profiles (for avatars, bios, ranking preference)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, avatar_url, bio, notification_prefs, accessibility_prefs')
    .in('user_id', userIds)

  const profileMap = new Map<string, {
    avatar_url: string | null
    bio: string | null
    participating: boolean
  }>()

  for (const p of profiles || []) {
    let participating = true
    const notifs = p.notification_prefs as Record<string, unknown> | null
    if (notifs && typeof notifs.participate_in_ranking === 'boolean') {
      participating = notifs.participate_in_ranking
    }
    profileMap.set(p.user_id, {
      avatar_url: p.avatar_url ?? null,
      bio: p.bio ?? null,
      participating,
    })
  }

  // 3. Fetch all published courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, created_by, status, created_at')
    .in('created_by', userIds)
    .is('deleted_at', null)

  const courseIds = (courses || []).map((c) => c.id)

  // 4. Fetch lessons for depth metric
  const lessonsByCourse = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, course_id, status')
      .in('course_id', courseIds)

    for (const l of lessons || []) {
      lessonsByCourse.set(l.course_id, (lessonsByCourse.get(l.course_id) || 0) + 1)
    }
  }

  // 5. Fetch enrollments across all courses
  const enrollmentsByCourse = new Map<string, {
    id: string
    userId: string
    courseId: string
    status: string
    enrolledAt: string
  }[]>()

  const allEnrollmentIds: string[] = []
  if (courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, user_id, course_id, status, enrolled_at')
      .in('course_id', courseIds)

    for (const e of enrollments || []) {
      if (!enrollmentsByCourse.has(e.course_id)) {
        enrollmentsByCourse.set(e.course_id, [])
      }
      enrollmentsByCourse.get(e.course_id)!.push({
        id: e.id,
        userId: e.user_id,
        courseId: e.course_id,
        status: e.status,
        enrolledAt: e.enrolled_at,
      })
      allEnrollmentIds.push(e.id)
    }
  }

  // 6. Fetch lesson progress to calculate real completion rate and risk status
  const lpByEnrollment = new Map<string, {
    is_completed: boolean
    is_viewed: boolean
    last_viewed_at: string | null
  }[]>()

  if (allEnrollmentIds.length > 0) {
    const { data: lps } = await supabase
      .from('lesson_progress')
      .select('enrollment_id, is_completed, is_viewed, last_viewed_at')
      .in('enrollment_id', allEnrollmentIds)

    for (const lp of lps || []) {
      if (!lpByEnrollment.has(lp.enrollment_id)) {
        lpByEnrollment.set(lp.enrollment_id, [])
      }
      lpByEnrollment.get(lp.enrollment_id)!.push(lp)
    }
  }

  // 7. Group courses and calculate metrics per educator
  const coursesByEducator = new Map<string, typeof courses>()
  for (const c of courses || []) {
    if (!coursesByEducator.has(c.created_by)) {
      coursesByEducator.set(c.created_by, [])
    }
    coursesByEducator.get(c.created_by)!.push(c)
  }

  const rawEntries: Omit<EducatorRankingEntry, 'rank'>[] = []

  for (const u of users || []) {
    const p = profileMap.get(u.id)
    const participating = p?.participating ?? true
    const eduCourses = coursesByEducator.get(u.id) || []
    const publishedCourses = eduCourses.filter((c) => c.status === 'published')

    let totalLessonsCount = 0
    const uniqueStudentIds = new Set<string>()
    const enrollmentProgressList: number[] = []
    let positiveCount = 0
    let atRiskCount = 0
    let inactiveCount = 0

    for (const c of publishedCourses) {
      const lessonCount = lessonsByCourse.get(c.id) || 0
      totalLessonsCount += lessonCount

      const courseEnrollments = enrollmentsByCourse.get(c.id) || []
      for (const e of courseEnrollments) {
        uniqueStudentIds.add(e.userId)
        const lps = lpByEnrollment.get(e.id) || []
        const completedLessons = lps.filter((lp) => lp.is_completed).length
        const progressPct = lessonCount > 0
          ? Math.min(100, Math.round((completedLessons / lessonCount) * 100))
          : (e.status === 'completed' ? 100 : 0)

        enrollmentProgressList.push(progressPct)

        // Determine student status
        const mostRecentView = lps
          .map((lp) => lp.last_viewed_at)
          .filter(Boolean)
          .sort()
          .pop() || e.enrolledAt

        const riskStatus = determineStudentRisk({
          enrollmentStatus: e.status,
          lastActive: mostRecentView,
          progressPercent: progressPct,
        })

        if (riskStatus === 'active' || riskStatus === 'completed') {
          positiveCount++
        } else if (riskStatus === 'at-risk') {
          atRiskCount++
        } else if (riskStatus === 'inactive' || riskStatus === 'dropped') {
          inactiveCount++
        }
      }
    }

    const avgCompletion = enrollmentProgressList.length > 0
      ? Math.round(enrollmentProgressList.reduce((a, b) => a + b, 0) / enrollmentProgressList.length)
      : 0

    const scoreBreakdown = calculateEducatorScore({
      coursesCreated: publishedCourses.length,
      totalLessons: totalLessonsCount,
      totalStudents: uniqueStudentIds.size,
      avgCompletionRate: avgCompletion,
      positiveStudentsCount: positiveCount,
      atRiskStudentsCount: atRiskCount,
      inactiveStudentsCount: inactiveCount,
    })

    const tier = getPerformanceTier(scoreBreakdown.totalScore)
    const badges = resolveEducatorBadges({
      scoreBreakdown,
      coursesCreated: publishedCourses.length,
      totalStudents: uniqueStudentIds.size,
      completionRate: avgCompletion,
      positiveStudentsCount: positiveCount,
      atRiskStudentsCount: atRiskCount,
    })

    rawEntries.push({
      educatorId: u.id,
      fullName: u.full_name || 'Educator',
      email: u.email,
      avatarUrl: p?.avatar_url ?? null,
      bio: p?.bio ?? null,
      joinedAt: u.created_at,
      participating,
      isCurrentUser: u.id === resolvedUserId,
      coursesCreated: publishedCourses.length,
      totalStudents: uniqueStudentIds.size,
      completionRate: avgCompletion,
      positiveStudentsCount: positiveCount,
      atRiskStudentsCount: atRiskCount,
      inactiveStudentsCount: inactiveCount,
      scoreBreakdown,
      overallScore: scoreBreakdown.totalScore,
      tier,
      badges,
    })
  }

  // 8. Sort by overall score descending, breaking ties by positive progress and completion rate
  rawEntries.sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore
    if (b.positiveStudentsCount !== a.positiveStudentsCount) return b.positiveStudentsCount - a.positiveStudentsCount
    return b.completionRate - a.completionRate
  })

  // 9. Assign ranks to participating educators
  let currentRank = 1
  const rankedEntries: EducatorRankingEntry[] = rawEntries.map((entry) => {
    if (entry.participating) {
      const assigned = { ...entry, rank: currentRank }
      currentRank++
      return assigned
    }
    // If not participating, set placeholder rank but keep computed stats
    return { ...entry, rank: 0 }
  })

  // 10. Filter public leaderboard to participating educators only
  const publicLeaderboard = rankedEntries.filter((e) => e.participating)

  // Find the current educator's entry
  const currentEducator = rankedEntries.find((e) => e.isCurrentUser) || null

  // If current educator is not participating, compute what their standing would be
  if (currentEducator && !currentEducator.participating) {
    const simulatedRank = rankedEntries
      .filter((e) => e.participating || e.isCurrentUser)
      .sort((a, b) => b.overallScore - a.overallScore)
      .findIndex((e) => e.educatorId === currentEducator.educatorId) + 1
    currentEducator.rank = simulatedRank
  }

  // 11. Compute platform benchmarks
  const participatingList = rankedEntries.filter((e) => e.participating)
  const totalCount = Math.max(1, participatingList.length)
  const platformAverages = {
    avgScore: Math.round(participatingList.reduce((sum, e) => sum + e.overallScore, 0) / totalCount),
    avgCompletionRate: Math.round(participatingList.reduce((sum, e) => sum + e.completionRate, 0) / totalCount),
    avgCourses: Math.round((participatingList.reduce((sum, e) => sum + e.coursesCreated, 0) / totalCount) * 10) / 10,
    avgStudents: Math.round((participatingList.reduce((sum, e) => sum + e.totalStudents, 0) / totalCount) * 10) / 10,
  }

  const motivationalTips = currentEducator ? generateMotivationalTips(currentEducator) : []

  return {
    leaderboard: publicLeaderboard,
    currentEducator,
    totalParticipating: publicLeaderboard.length,
    platformAverages,
    motivationalTips,
    isParticipating: currentEducator?.participating ?? true,
  }
}

/**
 * Fetches an educator's detailed profile and published courses for inspection,
 * providing authorized student information (anonymized aggregates for peer courses,
 * full roster with risk status for own courses).
 */
export async function fetchEducatorDetailForRanking(
  educatorId: string,
  currentUserId?: string
): Promise<EducatorDetailForRanking> {
  const viewerId = currentUserId || (await requireCurrentUserId())
  const isOwner = educatorId === viewerId

  // 1. Fetch leaderboard data to get calculated score and rankings
  const leaderboardData = await fetchEducatorLeaderboard(viewerId)
  const educator = leaderboardData.leaderboard.find((e) => e.educatorId === educatorId)
    || (leaderboardData.currentEducator?.educatorId === educatorId ? leaderboardData.currentEducator : null)

  if (!educator) throw new Error('Educator not found')

  // 2. Fetch educator's published courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id, title, description, category, difficulty_level,
      thumbnail_url, updated_at, created_by, status
    `)
    .eq('created_by', educatorId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (coursesError) throw coursesError

  const courseIds = (courses || []).map((c) => c.id)

  // 3. Fetch lesson counts
  const lessonCounts = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)

    for (const l of lessons || []) {
      lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1)
    }
  }

  // 4. Fetch enrollments
  const rankingCourses: EducatorRankingCourse[] = []

  for (const c of courses || []) {
    const totalLessons = lessonCounts.get(c.id) || 0

    // Fetch enrollments for this course
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id, user_id, status, enrolled_at,
        users:user_id (id, full_name, email)
      `)
      .eq('course_id', c.id)

    const enrollmentList = enrollments || []
    const enrollmentIds = enrollmentList.map((e) => e.id)

    // Fetch lesson progress
    const lpByEnrollment = new Map<string, { is_completed: boolean; last_viewed_at: string | null }[]>()
    if (enrollmentIds.length > 0) {
      const { data: lps } = await supabase
        .from('lesson_progress')
        .select('enrollment_id, is_completed, last_viewed_at')
        .in('enrollment_id', enrollmentIds)

      for (const lp of lps || []) {
        if (!lpByEnrollment.has(lp.enrollment_id)) {
          lpByEnrollment.set(lp.enrollment_id, [])
        }
        lpByEnrollment.get(lp.enrollment_id)!.push(lp)
      }
    }

    let positiveCount = 0
    let totalProgressSum = 0

    const studentDetails: EducatorRankingCourse['students'] = []

    for (const e of enrollmentList) {
      const lps = lpByEnrollment.get(e.id) || []
      const completedLessons = lps.filter((lp) => lp.is_completed).length
      const progress = totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : (e.status === 'completed' ? 100 : 0)

      totalProgressSum += progress

      const mostRecentView = lps
        .map((lp) => lp.last_viewed_at)
        .filter(Boolean)
        .sort()
        .pop() || e.enrolled_at

      const status = determineStudentRisk({
        enrollmentStatus: e.status,
        lastActive: mostRecentView,
        progressPercent: progress,
      })

      if (status === 'active' || status === 'completed') {
        positiveCount++
      }

      // If viewer is owner, include individual student roster
      if (isOwner && e.users) {
        const u = Array.isArray(e.users) ? e.users[0] : e.users
        studentDetails.push({
          id: u?.id || e.user_id,
          name: u?.full_name || 'Enrolled Student',
          email: u?.email || '',
          progress,
          status,
          lastActive: mostRecentView,
          completedLessons,
          totalLessons,
        })
      }
    }

    const studentCount = enrollmentList.length
    const completionRate = studentCount > 0 ? Math.round(totalProgressSum / studentCount) : 0
    const positiveStatusRate = studentCount > 0 ? Math.round((positiveCount / studentCount) * 100) : 0

    rankingCourses.push({
      id: c.id,
      title: c.title,
      description: c.description || '',
      category: c.category,
      difficultyLevel: c.difficulty_level || 'Beginner',
      thumbnailUrl: c.thumbnail_url,
      lessonCount: totalLessons,
      studentCount,
      completionRate,
      positiveStatusRate,
      updatedAt: c.updated_at,
      isOwner,
      students: isOwner ? studentDetails : undefined,
    })
  }

  return {
    educator,
    courses: rankingCourses,
    canViewStudentPii: isOwner,
  }
}
