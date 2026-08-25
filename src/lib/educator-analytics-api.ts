import { supabase } from './supabase'
import { determineStudentRisk, type StudentRiskStatus } from './student-risk'

export interface LessonDetail {
  lessonId: string
  title: string
  completedCount: number
  skippedCount: number
  avgTimeSpentSeconds: number
  avgQuizScore: number | null
  quizTitle: string | null
}

export interface EnrolledStudentDetail {
  enrollmentId: string
  studentId: string
  name: string
  email: string
  progress: number
  lastActive: string
  avgQuizScore: number
  status: StudentRiskStatus
  completedLessons: number
  totalLessons: number
}

export interface TimelineBucket {
  date: string
  lessonViews: number
  quizAttempts: number
}

export interface CourseDetailData {
  courseId: string
  title: string
  lessons: LessonDetail[]
  students: EnrolledStudentDetail[]
  timeline: TimelineBucket[]
}

export interface DetailedStudentProgress {
  id: string
  name: string
  email: string
  courses: {
    id: string
    title: string
    progress: number
    avgScore: number
    status: StudentRiskStatus
    lastActive: string
    timeSpentSeconds: number
  }[]
  lastActive: string
  totalProgress: number
  learningStreak: number
  status: 'active' | 'inactive' | 'at-risk' | 'completed'
  accessibility_prefs?: Record<string, unknown> | null
}

export interface TimelineEvent {
  id: string
  type: 'enrollment' | 'lesson_view' | 'quiz_attempt'
  title: string
  courseTitle: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface CourseDeepAnalytics {
  courseId: string
  title: string
  status: string
  stats: {
    totalEnrollments: number
    activeLearners: number
    inactiveLearners: number
    completedLearners: number
    atRiskLearners: number
    avgCompletionRate: number
    avgProgress: number
    avgLearningTimeSeconds: number
    avgQuizScore: number
    newEnrollmentsThisMonth: number
  }
  insights: {
    mostCompletedLesson?: string
    mostSkippedLesson?: string
    mostDifficultLesson?: string
    mostAttemptedQuiz?: string
  }
}


function calculateStreak(lps: Record<string, unknown>[]): number {
  if (!lps || lps.length === 0) return 0;
  const dates = lps
    .filter(lp => lp.last_viewed_at)
    .map(lp => {
      const d = new Date(lp.last_viewed_at as string);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    });
  if (dates.length === 0) return 0;
  dates.sort((a, b) => b - a);
  const uniqueDates = [...new Set(dates)];
  
  let streak = 0;
  const today = new Date();
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let checkDate = todayTime;
  
  if (uniqueDates[0] === todayTime) {
    streak = 1;
    checkDate = todayTime - 86400000;
  } else if (uniqueDates[0] === todayTime - 86400000) {
    streak = 1;
    checkDate = todayTime - 86400000 * 2;
  } else {
    return 0;
  }
  
  for (let i = 1; i < uniqueDates.length; i++) {
    if (uniqueDates[i] === checkDate) {
      streak++;
      checkDate -= 86400000;
    } else if (uniqueDates[i] > checkDate) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * @param studentId - When given, scopes every downstream query to this one
 * student's enrollments instead of the educator's entire roster. Opening a
 * single student's profile used to call this with no filter and then throw
 * away everyone else's data client-side — the same roster-wide enrollment,
 * lesson_progress, quiz_attempts, and lesson-count queries as the Dashboard
 * and Students Progress page, just to find one row. The security model is
 * unchanged either way: a student only ever appears in the result if they
 * have an enrollment in a course this educator owns (`created_by = educatorId`),
 * so an unrelated studentId still resolves to an empty array, not a leak.
 */
export async function fetchStudentsDeepProgress(educatorId: string, studentId?: string): Promise<DetailedStudentProgress[]> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError) throw coursesError
  const courseIds = (courses || []).map((c) => c.id)
  if (courseIds.length === 0) return []

  let enrollmentsQuery = supabase
    .from('enrollments')
    .select(`
      id, status, enrolled_at,
      users:user_id (id, full_name, email),
      course_id
    `)
    .in('course_id', courseIds)
    .order('enrolled_at', { ascending: false })

  if (studentId) {
    enrollmentsQuery = enrollmentsQuery.eq('user_id', studentId)
  }

  const { data: enrollments, error: enrollError } = await enrollmentsQuery

  if (enrollError) throw enrollError

  const courseMap = new Map<string, string>((courses || []).map((c) => [c.id, c.title]))
  const studentMap = new Map<string, DetailedStudentProgress>()

  const enrollmentIds = (enrollments || []).map((e: Record<string, unknown>) => e.id)
  
  const { data: lessonCountsData } = await supabase
    .from('lessons')
    .select('course_id')
    .in('course_id', courseIds)
    .in('status', ['published', 'draft']);
    
  const courseLessonCounts = new Map<string, number>();
  if (lessonCountsData) {
    for (const l of lessonCountsData) {
      courseLessonCounts.set(l.course_id, (courseLessonCounts.get(l.course_id) || 0) + 1);
    }
  }

  const quizAttemptsMap = new Map<string, Record<string, unknown>[]>();
  if (enrollmentIds.length > 0) {
    const { data: qaData } = await supabase
      .from('quiz_attempts')
      .select('enrollment_id, score_pct, result')
      .in('enrollment_id', enrollmentIds);
      
    for (const qa of (qaData || []) as Record<string, unknown>[]) {
      if (!quizAttemptsMap.has(qa.enrollment_id as string)) {
        quizAttemptsMap.set(qa.enrollment_id as string, []);
      }
      quizAttemptsMap.get(qa.enrollment_id as string)!.push(qa);
    }
  }
  
  // Fetch lesson progress for all these enrollments
  const lessonProgressMap = new Map<string, Record<string, unknown>[]>()
  if (enrollmentIds.length > 0) {
    const { data: lpData } = await supabase
      .from('lesson_progress')
      .select('enrollment_id, is_viewed, last_viewed_at, time_spent_learning')
      .in('enrollment_id', enrollmentIds)
      
    for (const lp of lpData || []) {
      if (!lessonProgressMap.has(lp.enrollment_id)) {
        lessonProgressMap.set(lp.enrollment_id, [])
      }
      lessonProgressMap.get(lp.enrollment_id)!.push(lp)
    }
  }

  // Fetch accessibility profiles
  const studentUserIds = [...new Set((enrollments || []).map((e: Record<string, unknown>) => (e.users as Record<string, unknown> | null)?.id).filter(Boolean))] as string[];
  const userProfilesMap = new Map<string, Record<string, unknown>>();
  if (studentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      // The FK to users is `user_id`; `id` is the profile's own primary key.
      // Matching on `id` silently returned nothing, so this panel was always
      // empty.
      .select('user_id, accessibility_prefs')
      .in('user_id', studentUserIds);
    for (const p of profiles || []) {
      userProfilesMap.set(p.user_id, p.accessibility_prefs);
    }
  }

  for (const raw of (enrollments || []) as Record<string, unknown>[]) {
    const userId = (raw.users as any)?.id
    if (!userId) continue

    if (!studentMap.has(userId)) {
      studentMap.set(userId, {
        id: userId,
        name: (raw.users as any)?.full_name || 'Unknown',
        email: (raw.users as any)?.email || '',
        courses: [],
        lastActive: raw.enrolled_at as string,
        totalProgress: 0,
        learningStreak: 0,
        status: 'active',
        accessibility_prefs: userProfilesMap.get(userId) || null
      })
    }

    const student = studentMap.get(userId)!
    
    // Calculate progress based on lessons
    const lps = lessonProgressMap.get((raw as any).id) || []
    const completedLessons = lps.filter(lp => lp.is_viewed).length
    // No fallback for missing time: a viewed lesson with no recorded duration
    // contributes 0, not a fabricated 20 minutes.
    const totalTimeSpent = lps.reduce((acc, lp) => acc + ((lp.time_spent_learning as number) || 0), 0)
    
    // Find last active from lps
    let courseLastActive = new Date(raw.enrolled_at as string)
    lps.forEach(lp => {
      if (lp.last_viewed_at && new Date(lp.last_viewed_at as string) > courseLastActive) {
        courseLastActive = new Date(lp.last_viewed_at as string)
      }
    })

    if (courseLastActive > new Date(student.lastActive)) {
      student.lastActive = courseLastActive.toISOString()
    }

    const totalLessons = courseLessonCounts.get((raw as any).course_id) || 1;
    const progress = Math.min(Math.round((completedLessons / totalLessons) * 100), 100);

    const qas = quizAttemptsMap.get((raw as any).id) || [];
    const hasFails = qas.some(qa => qa.result === 'failed');
    const avgScore = qas.length > 0 ? Math.round(qas.reduce((acc, qa) => acc + ((qa.score_pct as number) || 0), 0) / qas.length) : 0;
    
    // Update streak based on all course lesson progress
    const courseStreak = calculateStreak(lps);
    if (courseStreak > student.learningStreak) {
      student.learningStreak = courseStreak;
    }

    student.courses.push({
      id: (raw as any).course_id,
      title: courseMap.get((raw as any).course_id) || 'Unknown',
      progress: (raw as any).status === 'completed' ? 100 : progress,
      avgScore: avgScore,
      status: determineStudentRisk({
        enrollmentStatus: (raw as any).status,
        lastActive: courseLastActive,
        progressPercent: progress,
        hasQuizFailure: hasFails,
      }),
      lastActive: courseLastActive.toISOString(),
      timeSpentSeconds: totalTimeSpent
    })
  }

  // Update overall student status and progress. This is an aggregate across
  // every course the student is in with this educator, so no single
  // enrollment status applies to the whole student — except the case where
  // every one of their courses is finished (completed or dropped). A
  // student who completed everything months ago must not fall through to
  // the time-based rules below and get flagged "inactive" on the Dashboard's
  // Needs Attention list — there is nothing left to reach out about.
  for (const student of Array.from(studentMap.values())) {
    student.totalProgress = Math.round(
      student.courses.reduce((sum, c) => sum + c.progress, 0) / (student.courses.length || 1)
    )
    const allCoursesFinished = student.courses.length > 0 &&
      student.courses.every(c => c.status === 'completed' || c.status === 'dropped')

    if (allCoursesFinished) {
      student.status = 'completed'
    } else {
      student.status = determineStudentRisk({
        lastActive: new Date(student.lastActive),
        progressPercent: student.totalProgress,
      }) as 'active' | 'at-risk' | 'inactive'
    }
  }

  return Array.from(studentMap.values())
}

export async function fetchStudentTimeline(studentId: string, educatorId: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = []
  
  // Verify student is enrolled in one of educator's courses
  const { data: courses } = await supabase.from('courses').select('id, title').eq('created_by', educatorId).is('deleted_at', null)
  const courseIds = (courses || []).map(c => c.id)
  if (courseIds.length === 0) return []

  const courseMap = new Map<string, string>((courses || []).map(c => [c.id, c.title]))

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, enrolled_at')
    .eq('user_id', studentId)
    .in('course_id', courseIds)

  if (!enrollments || enrollments.length === 0) return []

  const enrollmentIds = enrollments.map(e => e.id)

  // Enrollments
  enrollments.forEach(e => {
    events.push({
      id: `enroll-${e.id}`,
      type: 'enrollment',
      title: 'Enrolled in course',
      courseTitle: courseMap.get(e.course_id) || 'Unknown',
      timestamp: e.enrolled_at
    })
  })

  // Lesson views
  const { data: lps } = await supabase
    .from('lesson_progress')
    .select('id, lesson_id, first_viewed_at, enrollment_id, lessons(title)')
    .in('enrollment_id', enrollmentIds)

  if (lps) {
    lps.forEach((lp: Record<string, unknown>) => {
      if (lp.first_viewed_at) {
        const e = enrollments.find(env => env.id === lp.enrollment_id)
        events.push({
          id: `lp-${lp.id}`,
          type: 'lesson_view',
          title: `Viewed Lesson: ${(lp.lessons as any)?.title || 'Unknown'}`,
          courseTitle: courseMap.get(e?.course_id || '') || 'Unknown',
          timestamp: lp.first_viewed_at as string
        })
      }
    })
  }

  // Quizzes
  const { data: qas } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, submitted_at, score_pct, result, enrollment_id, quizzes(title)')
    .in('enrollment_id', enrollmentIds)

  if (qas) {
    qas.forEach((qa: Record<string, unknown>) => {
      if (qa.submitted_at) {
        const e = enrollments.find(env => env.id === qa.enrollment_id)
        events.push({
          id: `qa-${qa.id}`,
          type: 'quiz_attempt',
          title: `Submitted Quiz: ${(qa.quizzes as any)?.title || 'Unknown'} (Score: ${qa.score_pct}%)`,
          courseTitle: courseMap.get(e?.course_id || '') || 'Unknown',
          timestamp: qa.submitted_at as string,
          metadata: { score: qa.score_pct, result: qa.result }
        })
      }
    })
  }

  // Sort by timestamp desc
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function sendEducatorNotification(
  studentId: string, 
  educatorId: string, 
  message: string, 
  type: string = 'message'
): Promise<void> {
  const { data: educator } = await supabase.from('users').select('full_name').eq('id', educatorId).single()
  
  const title = `Message from ${educator?.full_name || 'Educator'}`
  
  const { error } = await supabase.rpc('create_notification', {
    p_user_id: studentId,
    p_type: type,
    p_title: title,
    p_body: message,
    p_metadata: { sender_id: educatorId }
  })

  if (error) throw error
}

export async function fetchCourseDeepAnalytics(educatorId: string): Promise<CourseDeepAnalytics[]> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, status')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError || !courses || courses.length === 0) return []

  const courseIds = courses.map(c => c.id)

  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courseIds)
    .in('status', ['published', 'draft'])

  const courseLessonCountMap = new Map<string, number>()
  for (const l of allLessons || []) {
    courseLessonCountMap.set(l.course_id, (courseLessonCountMap.get(l.course_id) || 0) + 1)
  }

  const results: CourseDeepAnalytics[] = []

  for (const course of courses) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, status, enrolled_at')
      .eq('course_id', course.id)
    
    if (!enrollments) continue

    const totalEnrollments = enrollments.length
    const completed = enrollments.filter(e => e.status === 'completed').length

    const now = Date.now()
    let newEnrollmentsThisMonth = 0

    enrollments.forEach(e => {
       const enrolledDate = new Date(e.enrolled_at).getTime()
       const days = (now - enrolledDate) / (1000 * 60 * 60 * 24)
       if (days <= 30) newEnrollmentsThisMonth++
    })

    const enrollmentIds = enrollments.map(e => e.id)
    
    // Default insights
    let avgQuizScore = 0
    let mostCompletedLesson = 'Not enough data'
    let mostSkippedLesson = 'Not enough data'
    let mostDifficultLesson = 'Not enough data'
    let mostAttemptedQuiz = 'Not enough data'

    let activeLearners = 0
    let atRiskLearners = 0
    let totalProgressSum = 0
    let totalTimeSum = 0
    const totalLessons = courseLessonCountMap.get(course.id) || 1

    if (enrollmentIds.length > 0) {
      // Fetch Lesson Progress for this course's enrollments
      const { data: lpData } = await supabase
        .from('lesson_progress')
        .select('enrollment_id, lesson_id, is_completed, is_viewed, time_spent_learning, last_viewed_at, lessons(title)')
        .in('enrollment_id', enrollmentIds)

      const lastActiveMap = new Map<string, number>()
      const enrollmentCompletedLessons = new Map<string, number>()
      const enrollmentTimeMap = new Map<string, number>()

      for (const lp of lpData || []) {
        if (lp.last_viewed_at) {
          const t = new Date(lp.last_viewed_at).getTime()
          const current = lastActiveMap.get(lp.enrollment_id)
          if (!current || t > current) lastActiveMap.set(lp.enrollment_id, t)
        }
        if (lp.is_completed) {
          enrollmentCompletedLessons.set(lp.enrollment_id, (enrollmentCompletedLessons.get(lp.enrollment_id) || 0) + 1)
        }
        if (lp.time_spent_learning) {
          enrollmentTimeMap.set(lp.enrollment_id, (enrollmentTimeMap.get(lp.enrollment_id) || 0) + Number(lp.time_spent_learning))
        }
      }

      // Fetch Quiz Attempts for this course's enrollments
      const { data: qaData } = await supabase
        .from('quiz_attempts')
        .select('enrollment_id, quiz_id, score_pct, result, submitted_at, quizzes(title)')
        .in('enrollment_id', enrollmentIds)

      const enrollmentHasFails = new Map<string, boolean>()
      for (const qa of qaData || []) {
        if (qa.submitted_at) {
          const t = new Date(qa.submitted_at).getTime()
          const current = lastActiveMap.get(qa.enrollment_id)
          if (!current || t > current) lastActiveMap.set(qa.enrollment_id, t)
        }
        if (qa.result === 'failed' || (qa.score_pct !== null && qa.score_pct < 50)) {
          enrollmentHasFails.set(qa.enrollment_id, true)
        }
      }

      for (const e of enrollments) {
        const referenceDate = lastActiveMap.get(e.id) ? new Date(lastActiveMap.get(e.id)!) : new Date(e.enrolled_at)
        const completedCount = enrollmentCompletedLessons.get(e.id) || 0
        const progress = Math.min(Math.round((completedCount / totalLessons) * 100), 100)
        const timeSpent = enrollmentTimeMap.get(e.id) || 0

        totalProgressSum += (e.status === 'completed' ? 100 : progress)
        totalTimeSum += timeSpent

        const riskStatus = determineStudentRisk({
          enrollmentStatus: e.status,
          lastActive: referenceDate,
          progressPercent: progress,
          hasQuizFailure: enrollmentHasFails.get(e.id) || false
        })

        if (riskStatus === 'active') activeLearners++
        else if (riskStatus === 'at-risk') atRiskLearners++
      }

      if (qaData && qaData.length > 0) {
        const validScores = qaData.map(qa => qa.score_pct).filter((s): s is number => s !== null && s !== undefined)
        if (validScores.length > 0) {
          avgQuizScore = Math.round(validScores.reduce((acc, s) => acc + s, 0) / validScores.length)
        }

        // Most attempted quiz
        const quizAttemptCounts = new Map<string, { count: number, title: string }>()
        const quizScores = new Map<string, { total: number, count: number, title: string }>()

        for (const qa of qaData) {
          if (!qa.quiz_id) continue
          const title = (qa.quizzes as Record<string, unknown>)?.title as string || 'Unknown Quiz'
          
          // Attempts
          const curr = quizAttemptCounts.get(qa.quiz_id) || { count: 0, title }
          curr.count++
          quizAttemptCounts.set(qa.quiz_id, curr)

          // Scores (for most difficult)
          const scoreStats = quizScores.get(qa.quiz_id) || { total: 0, count: 0, title }
          scoreStats.total += (qa.score_pct || 0)
          scoreStats.count++
          quizScores.set(qa.quiz_id, scoreStats)
        }

        let maxAttempts = 0
        for (const [, stats] of quizAttemptCounts.entries()) {
          if (stats.count > maxAttempts) {
            maxAttempts = stats.count
            mostAttemptedQuiz = stats.title
          }
        }

        let minAvgScore = 101
        for (const [, stats] of quizScores.entries()) {
          const avg = stats.total / stats.count
          if (avg < minAvgScore) {
            minAvgScore = avg
            mostDifficultLesson = stats.title
          }
        }
      }

      if (lpData && lpData.length > 0) {
        const completedCounts = new Map<string, { count: number, title: string }>()
        const skippedCounts = new Map<string, { count: number, title: string }>()

        for (const lp of lpData) {
          if (!lp.lesson_id) continue
          const title = (lp.lessons as Record<string, unknown>)?.title as string || 'Unknown Lesson'

          if (lp.is_completed) {
            const curr = completedCounts.get(lp.lesson_id) || { count: 0, title }
            curr.count++
            completedCounts.set(lp.lesson_id, curr)
          } else if (lp.is_viewed) {
            const curr = skippedCounts.get(lp.lesson_id) || { count: 0, title }
            curr.count++
            skippedCounts.set(lp.lesson_id, curr)
          }
        }

        let maxCompleted = 0
        for (const [, stats] of completedCounts.entries()) {
          if (stats.count > maxCompleted) {
            maxCompleted = stats.count
            mostCompletedLesson = stats.title
          }
        }

        let maxSkipped = 0
        for (const [, stats] of skippedCounts.entries()) {
          if (stats.count > maxSkipped) {
            maxSkipped = stats.count
            mostSkippedLesson = stats.title
          }
        }
      }
    }

    const inactiveLearners = Math.max(0, totalEnrollments - activeLearners - atRiskLearners - completed)

    results.push({
      courseId: course.id,
      title: course.title,
      status: course.status,
      stats: {
        totalEnrollments,
        activeLearners,
        inactiveLearners,
        completedLearners: completed,
        atRiskLearners,
        avgCompletionRate: totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0,
        avgProgress: totalEnrollments > 0 ? Math.round(totalProgressSum / totalEnrollments) : 0,
        avgLearningTimeSeconds: totalEnrollments > 0 ? Math.round(totalTimeSum / totalEnrollments) : 0,
        avgQuizScore,
        newEnrollmentsThisMonth
      },
      insights: {
        mostCompletedLesson,
        mostSkippedLesson,
        mostDifficultLesson,
        mostAttemptedQuiz
      }
    })
  }

  return results
}

export async function fetchCourseDetailData(courseId: string, educatorId: string): Promise<CourseDetailData> {
  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', courseId)
    .eq('created_by', educatorId)
    .is('deleted_at', null)
    .single()

  if (!course) throw new Error('Course not found')

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('course_id', courseId)
    .in('status', ['published', 'draft'])

  const lessonIds = (lessons || []).map(l => l.id)

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title')
    .in('lesson_id', lessonIds)

  const quizLessonMap = new Map<string, string>()
  const quizTitleMap = new Map<string, string>()
  for (const q of quizzes || []) {
    quizLessonMap.set(q.id, q.lesson_id)
    quizTitleMap.set(q.id, q.title)
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, user_id, status, enrolled_at,
      users:user_id (id, full_name, email)
    `)
    .eq('course_id', courseId)

  const enrollmentIds = (enrollments || []).map(e => e.id)

  const lpByLesson = new Map<string, Record<string, unknown>[]>()
  const lpByEnrollment = new Map<string, Record<string, unknown>[]>()
  const allTimestamps: { date: string; type: 'lesson_view' | 'quiz_attempt' }[] = []

  if (enrollmentIds.length > 0) {
    const { data: lpData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, enrollment_id, is_completed, is_viewed, time_spent_learning, first_viewed_at, last_viewed_at')
      .in('enrollment_id', enrollmentIds)

    for (const lp of lpData || []) {
      if (!lpByLesson.has(lp.lesson_id)) lpByLesson.set(lp.lesson_id, [])
      lpByLesson.get(lp.lesson_id)!.push(lp)

      if (!lpByEnrollment.has(lp.enrollment_id)) lpByEnrollment.set(lp.enrollment_id, [])
      lpByEnrollment.get(lp.enrollment_id)!.push(lp)

      if (lp.first_viewed_at) {
        allTimestamps.push({ date: lp.first_viewed_at.slice(0, 10), type: 'lesson_view' })
      }
    }
  }

  const qaByEnrollment = new Map<string, Record<string, unknown>[]>()
  if (enrollmentIds.length > 0) {
    const { data: qaData } = await supabase
      .from('quiz_attempts')
      .select('quiz_id, score_pct, result, enrollment_id, submitted_at')
      .in('enrollment_id', enrollmentIds)

    for (const qa of qaData || []) {
      if (!qaByEnrollment.has(qa.enrollment_id)) qaByEnrollment.set(qa.enrollment_id, [])
      qaByEnrollment.get(qa.enrollment_id)!.push(qa)

      if (qa.submitted_at) {
        allTimestamps.push({ date: qa.submitted_at.slice(0, 10), type: 'quiz_attempt' })
      }
    }
  }

  const lessonsDetail: LessonDetail[] = (lessons || []).map(lesson => {
    const lps = lpByLesson.get(lesson.id) || []
    const completed = lps.filter(lp => lp.is_completed).length
    const skipped = lps.filter(lp => lp.is_viewed && !lp.is_completed).length
    const totalTime = lps.reduce((acc, lp) => acc + ((lp.time_spent_learning as number) || 0), 0)
    const avgTime = lps.length > 0 ? Math.round(totalTime / lps.length) : 0

    const quizEntry = quizzes?.find(q => q.lesson_id === lesson.id)
    let avgQuizScore: number | null = null
    if (quizEntry) {
      const scores: number[] = []
      for (const qas of qaByEnrollment.values()) {
        for (const qa of qas) {
          if (qa.quiz_id === quizEntry.id) scores.push((qa.score_pct as number) || 0)
        }
      }
      if (scores.length > 0) avgQuizScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }

    return {
      lessonId: lesson.id,
      title: lesson.title,
      completedCount: completed,
      skippedCount: skipped,
      avgTimeSpentSeconds: avgTime,
      avgQuizScore,
      quizTitle: quizEntry?.title || null
    }
  })

  const totalLessons = lessons?.length || 1
  const studentsDetail: EnrolledStudentDetail[] = (enrollments || []).map(e => {
    const user = ((e as Record<string, unknown>).users || {}) as any
    const lps = lpByEnrollment.get(e.id) || []
    const completedCount = lps.filter(lp => lp.is_completed).length
    const progress = Math.min(Math.round((completedCount / totalLessons) * 100), 100)

    const qas = qaByEnrollment.get(e.id) || []
    const avgScore = qas.length > 0
      ? Math.round(qas.reduce((acc, qa) => acc + ((qa.score_pct as number) || 0), 0) / qas.length)
      : 0

    let lastActive = e.enrolled_at
    for (const lp of lps) {
      if (lp.last_viewed_at && lp.last_viewed_at > lastActive) lastActive = lp.last_viewed_at
    }

    const hasFails = qas.some(qa => qa.result === 'failed')
    const status = determineStudentRisk({
      enrollmentStatus: e.status,
      lastActive,
      progressPercent: progress,
      hasQuizFailure: hasFails,
    })

    return {
      enrollmentId: e.id,
      studentId: user.id || '',
      name: user.full_name || 'Unknown',
      email: user.email || '',
      progress,
      lastActive,
      avgQuizScore: avgScore,
      status,
      completedLessons: completedCount,
      totalLessons
    }
  })

  const timelineBuckets = new Map<string, { lessonViews: number; quizAttempts: number }>()
  for (const ts of allTimestamps) {
    if (!timelineBuckets.has(ts.date)) timelineBuckets.set(ts.date, { lessonViews: 0, quizAttempts: 0 })
    const bucket = timelineBuckets.get(ts.date)!
    if (ts.type === 'lesson_view') bucket.lessonViews++
    else bucket.quizAttempts++
  }

  const timeline: TimelineBucket[] = Array.from(timelineBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))

  return {
    courseId: course.id,
    title: course.title,
    lessons: lessonsDetail,
    students: studentsDetail,
    timeline
  }
}

export interface CourseDetailedAnalyticsData {
  courseId: string
  title: string
  status: string
  category: string | null
  difficulty_level: string | null
  summary: {
    totalEnrolled: number
    activeLearners: number
    completedLearners: number
    atRiskLearners: number
    inactiveLearners: number
    avgProgress: number
    completionRate: number
    avgLearningTimeSeconds: number
    avgQuizScore: number
    totalLessons: number
    totalQuizzes: number
  }
  progressDistribution: {
    bucket: string
    count: number
    percentage: number
  }[]
  timeline: {
    date: string
    lessonViews: number
    completions: number
    quizAttempts: number
  }[]
  lessonEngagement: {
    lessonId: string
    sequenceOrder: number
    title: string
    avgTimeSpentSeconds: number
    totalLearnersStarted: number
    totalLearnersCompleted: number
    completionRate: number
    dropOffCount: number
    dropOffRate: number
  }[]
  accessibilityUsage: {
    preset: string
    presetKey: string
    learnersCount: number
    percentage: number
    avgProgress: number
    completionRate: number
    avgLearningTimeSeconds: number
  }[]
  quizAnalytics: {
    quizId: string
    lessonId: string
    lessonTitle: string
    title: string
    attemptsCount: number
    passCount: number
    passRate: number
    avgScore: number
    minScore: number
    maxScore: number
  }[]
  lowestPerformingQuiz?: {
    title: string
    avgScore: number
    passRate: number
  }
  students: {
    enrollmentId: string
    studentId: string
    name: string
    email: string
    progress: number
    completedLessons: number
    totalLessons: number
    avgQuizScore: number
    lastActive: string
    timeSpentSeconds: number
    status: StudentRiskStatus
    accessibilityPreset: string
  }[]
}

function formatPresetName(presetKey: string | null | undefined, prefs?: Record<string, unknown> | null): string {
  if (!presetKey || presetKey === 'none') {
    if (prefs?.dyslexia_friendly_font) return 'Dyslexia Font';
    if (prefs?.chunked_content_mode) return 'Chunked Content';
    if (prefs?.distraction_free_mode) return 'Focus Mode';
    return 'Default / Standard';
  }
  switch (presetKey.toLowerCase()) {
    case 'dyslexia': return 'Dyslexia / Easy Read';
    case 'adhd': return 'ADHD-oriented';
    case 'autism': return 'Autism-oriented';
    case 'focus': return 'Focus Mode';
    case 'low_vision': return 'Low Vision / High Contrast';
    case 'screen_reader': return 'Screen Reader';
    case 'motion_sensitivity': return 'Motion Sensitivity';
    case 'custom': return 'Custom';
    default:
      return presetKey.charAt(0).toUpperCase() + presetKey.slice(1).replace(/_/g, ' ');
  }
}

export async function fetchDetailedCourseAnalytics(courseId: string, educatorId: string): Promise<CourseDetailedAnalyticsData> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, status, category, difficulty_level')
    .eq('id', courseId)
    .eq('created_by', educatorId)
    .is('deleted_at', null)
    .single()

  if (courseError || !course) {
    throw new Error('Course not found or you are not authorized to view its analytics')
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, sequence_order, status')
    .eq('course_id', courseId)
    .in('status', ['published', 'draft'])
    .order('sequence_order', { ascending: true })

  const allLessons = lessons || []
  const lessonIds = allLessons.map(l => l.id)
  const totalLessons = allLessons.length

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title, pass_threshold_pct')
    .in('lesson_id', lessonIds)

  const allQuizzes = quizzes || []
  const quizLessonMap = new Map<string, { lessonId: string; lessonTitle: string }>()
  for (const q of allQuizzes) {
    const l = allLessons.find(les => les.id === q.lesson_id)
    quizLessonMap.set(q.id, { lessonId: q.lesson_id, lessonTitle: l?.title || 'Lesson' })
  }

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id, user_id, status, enrolled_at, completed_at,
      users:user_id (id, full_name, email)
    `)
    .eq('course_id', courseId)

  if (enrollError) throw enrollError
  const allEnrollments = enrollments || []
  const enrollmentIds = allEnrollments.map(e => e.id)
  const userIds = allEnrollments.map((e: any) => e.user_id).filter(Boolean)

  const userProfilesMap = new Map<string, Record<string, unknown>>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, accessibility_prefs')
      .in('user_id', userIds)
    for (const p of profiles || []) {
      userProfilesMap.set(p.user_id, p.accessibility_prefs as Record<string, unknown>)
    }
  }

  let progressData: any[] = []
  if (enrollmentIds.length > 0) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('id, enrollment_id, lesson_id, is_completed, is_viewed, time_spent_learning, first_viewed_at, last_viewed_at')
      .in('enrollment_id', enrollmentIds)
    progressData = data || []
  }

  let quizAttemptsData: any[] = []
  if (enrollmentIds.length > 0) {
    const { data } = await supabase
      .from('quiz_attempts')
      .select('id, enrollment_id, quiz_id, score_pct, result, submitted_at')
      .in('enrollment_id', enrollmentIds)
    quizAttemptsData = data || []
  }

  const lpByEnrollment = new Map<string, any[]>()
  const lpByLesson = new Map<string, any[]>()
  const timelineEvents: { date: string; type: 'lesson_view' | 'completion' | 'quiz_attempt' }[] = []

  for (const lp of progressData) {
    if (!lpByEnrollment.has(lp.enrollment_id)) lpByEnrollment.set(lp.enrollment_id, [])
    lpByEnrollment.get(lp.enrollment_id)!.push(lp)

    if (!lpByLesson.has(lp.lesson_id)) lpByLesson.set(lp.lesson_id, [])
    lpByLesson.get(lp.lesson_id)!.push(lp)

    if (lp.first_viewed_at) {
      timelineEvents.push({ date: lp.first_viewed_at.slice(0, 10), type: 'lesson_view' })
    }
    if (lp.is_completed && lp.last_viewed_at) {
      timelineEvents.push({ date: lp.last_viewed_at.slice(0, 10), type: 'completion' })
    }
  }

  const qaByEnrollment = new Map<string, any[]>()
  const qaByQuiz = new Map<string, any[]>()

  for (const qa of quizAttemptsData) {
    if (!qaByEnrollment.has(qa.enrollment_id)) qaByEnrollment.set(qa.enrollment_id, [])
    qaByEnrollment.get(qa.enrollment_id)!.push(qa)

    if (!qaByQuiz.has(qa.quiz_id)) qaByQuiz.set(qa.quiz_id, [])
    qaByQuiz.get(qa.quiz_id)!.push(qa)

    if (qa.submitted_at) {
      timelineEvents.push({ date: qa.submitted_at.slice(0, 10), type: 'quiz_attempt' })
    }
  }

  const studentsList: CourseDetailedAnalyticsData['students'] = []
  let totalTimeAllStudents = 0
  let totalProgressAllStudents = 0
  let activeCount = 0
  let completedCount = 0
  let atRiskCount = 0
  let inactiveCount = 0

  const buckets = [
    { bucket: '0–20%', min: 0, max: 20, count: 0 },
    { bucket: '21–40%', min: 21, max: 40, count: 0 },
    { bucket: '41–60%', min: 41, max: 60, count: 0 },
    { bucket: '61–80%', min: 61, max: 80, count: 0 },
    { bucket: '81–99%', min: 81, max: 99, count: 0 },
    { bucket: '100%', min: 100, max: 100, count: 0 }
  ]

  const presetGroupsMap = new Map<string, {
    preset: string
    presetKey: string
    learnersCount: number
    totalProgress: number
    completedCount: number
    totalTimeSpent: number
  }>()

  for (const enroll of allEnrollments) {
    const user = (enroll.users as any) || {}
    const lps = lpByEnrollment.get(enroll.id) || []
    const qas = qaByEnrollment.get(enroll.id) || []

    const completedLessonsCount = lps.filter(lp => lp.is_completed).length
    const progress = totalLessons > 0 ? Math.min(Math.round((completedLessonsCount / totalLessons) * 100), 100) : 0
    const timeSpentSeconds = lps.reduce((acc, lp) => acc + (Number(lp.time_spent_learning) || 0), 0)

    let lastActive = enroll.enrolled_at as string
    for (const lp of lps) {
      if (lp.last_viewed_at && new Date(lp.last_viewed_at) > new Date(lastActive)) {
        lastActive = lp.last_viewed_at
      }
    }
    for (const qa of qas) {
      if (qa.submitted_at && new Date(qa.submitted_at) > new Date(lastActive)) {
        lastActive = qa.submitted_at
      }
    }

    const hasQuizFailure = qas.some(qa => qa.result === 'failed' || (qa.score_pct !== null && qa.score_pct < 50))
    const status = determineStudentRisk({
      enrollmentStatus: enroll.status,
      lastActive,
      progressPercent: progress,
      hasQuizFailure
    })

    if (status === 'active') activeCount++
    else if (status === 'completed' || enroll.status === 'completed') completedCount++
    else if (status === 'at-risk') atRiskCount++
    else if (status === 'inactive') inactiveCount++

    totalTimeAllStudents += timeSpentSeconds
    totalProgressAllStudents += (enroll.status === 'completed' ? 100 : progress)

    const effectiveProgress = enroll.status === 'completed' ? 100 : progress
    for (const b of buckets) {
      if (effectiveProgress >= b.min && effectiveProgress <= b.max) {
        b.count++
        break
      }
    }

    const avgQuizScore = qas.length > 0
      ? Math.round(qas.reduce((acc, qa) => acc + (qa.score_pct || 0), 0) / qas.length)
      : 0

    const prefs = userProfilesMap.get(enroll.user_id) || null
    const presetKey = (prefs?.active_preset as string) || (prefs?.base_preset as string) || 'none'
    const presetLabel = formatPresetName(presetKey, prefs)

    if (!presetGroupsMap.has(presetLabel)) {
      presetGroupsMap.set(presetLabel, {
        preset: presetLabel,
        presetKey,
        learnersCount: 0,
        totalProgress: 0,
        completedCount: 0,
        totalTimeSpent: 0
      })
    }
    const pGroup = presetGroupsMap.get(presetLabel)!
    pGroup.learnersCount++
    pGroup.totalProgress += effectiveProgress
    if (effectiveProgress === 100 || enroll.status === 'completed') pGroup.completedCount++
    pGroup.totalTimeSpent += timeSpentSeconds

    studentsList.push({
      enrollmentId: enroll.id,
      studentId: enroll.user_id,
      name: user.full_name || 'Student',
      email: user.email || '',
      progress: effectiveProgress,
      completedLessons: completedLessonsCount,
      totalLessons,
      avgQuizScore,
      lastActive,
      timeSpentSeconds,
      status,
      accessibilityPreset: presetLabel
    })
  }

  const totalEnrolled = allEnrollments.length
  const avgProgress = totalEnrolled > 0 ? Math.round(totalProgressAllStudents / totalEnrolled) : 0
  const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0
  const avgLearningTimeSeconds = totalEnrolled > 0 ? Math.round(totalTimeAllStudents / totalEnrolled) : 0

  const allScores = quizAttemptsData.map(qa => qa.score_pct).filter((s): s is number => s !== null && s !== undefined)
  const avgQuizScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0

  const progressDistribution = buckets.map(b => ({
    bucket: b.bucket,
    count: b.count,
    percentage: totalEnrolled > 0 ? Math.round((b.count / totalEnrolled) * 100) : 0
  }))

  const timelineMap = new Map<string, { lessonViews: number; completions: number; quizAttempts: number }>()
  for (const ev of timelineEvents) {
    if (!timelineMap.has(ev.date)) {
      timelineMap.set(ev.date, { lessonViews: 0, completions: 0, quizAttempts: 0 })
    }
    const entry = timelineMap.get(ev.date)!
    if (ev.type === 'lesson_view') entry.lessonViews++
    else if (ev.type === 'completion') entry.completions++
    else if (ev.type === 'quiz_attempt') entry.quizAttempts++
  }

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, counts]) => ({ date, ...counts }))

  const lessonEngagement: CourseDetailedAnalyticsData['lessonEngagement'] = allLessons.map(l => {
    const lps = lpByLesson.get(l.id) || []
    const started = lps.filter(lp => lp.is_viewed || lp.is_completed).length
    const completed = lps.filter(lp => lp.is_completed).length
    const totalTime = lps.reduce((acc, lp) => acc + (Number(lp.time_spent_learning) || 0), 0)
    const avgTime = started > 0 ? Math.round(totalTime / started) : 0
    const compRate = started > 0 ? Math.round((completed / started) * 100) : 0
    const dropOff = Math.max(0, started - completed)
    const dropRate = started > 0 ? Math.round((dropOff / started) * 100) : 0

    return {
      lessonId: l.id,
      sequenceOrder: l.sequence_order || 0,
      title: l.title || 'Lesson',
      avgTimeSpentSeconds: avgTime,
      totalLearnersStarted: started,
      totalLearnersCompleted: completed,
      completionRate: compRate,
      dropOffCount: dropOff,
      dropOffRate: dropRate
    }
  })

  const accessibilityUsage = Array.from(presetGroupsMap.values()).map(pg => ({
    preset: pg.preset,
    presetKey: pg.presetKey,
    learnersCount: pg.learnersCount,
    percentage: totalEnrolled > 0 ? Math.round((pg.learnersCount / totalEnrolled) * 100) : 0,
    avgProgress: pg.learnersCount > 0 ? Math.round(pg.totalProgress / pg.learnersCount) : 0,
    completionRate: pg.learnersCount > 0 ? Math.round((pg.completedCount / pg.learnersCount) * 100) : 0,
    avgLearningTimeSeconds: pg.learnersCount > 0 ? Math.round(pg.totalTimeSpent / pg.learnersCount) : 0
  })).sort((a, b) => b.learnersCount - a.learnersCount)

  let lowestPerformingQuiz: CourseDetailedAnalyticsData['lowestPerformingQuiz'] = undefined
  let lowestScore = 101

  const quizAnalytics: CourseDetailedAnalyticsData['quizAnalytics'] = allQuizzes.map(q => {
    const qas = qaByQuiz.get(q.id) || []
    const attempts = qas.length
    const passes = qas.filter(qa => qa.result === 'pass' || (qa.score_pct !== null && qa.score_pct >= (q.pass_threshold_pct || 80))).length
    const scores = qas.map(qa => qa.score_pct).filter((s): s is number => s !== null && s !== undefined)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const passRate = attempts > 0 ? Math.round((passes / attempts) * 100) : 0
    const minScore = scores.length > 0 ? Math.min(...scores) : 0
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0

    const meta = quizLessonMap.get(q.id) || { lessonId: q.lesson_id, lessonTitle: 'Lesson' }

    if (attempts > 0 && avgScore < lowestScore) {
      lowestScore = avgScore
      lowestPerformingQuiz = {
        title: q.title,
        avgScore,
        passRate
      }
    }

    return {
      quizId: q.id,
      lessonId: meta.lessonId,
      lessonTitle: meta.lessonTitle,
      title: q.title,
      attemptsCount: attempts,
      passCount: passes,
      passRate,
      avgScore,
      minScore,
      maxScore
    }
  })

  return {
    courseId: course.id,
    title: course.title,
    status: course.status,
    category: course.category,
    difficulty_level: course.difficulty_level,
    summary: {
      totalEnrolled,
      activeLearners: activeCount,
      completedLearners: completedCount,
      atRiskLearners: atRiskCount,
      inactiveLearners: inactiveCount,
      avgProgress,
      completionRate,
      avgLearningTimeSeconds,
      avgQuizScore,
      totalLessons,
      totalQuizzes: allQuizzes.length
    },
    progressDistribution,
    timeline,
    lessonEngagement,
    accessibilityUsage,
    quizAnalytics,
    lowestPerformingQuiz,
    students: studentsList.sort((a, b) => b.progress - a.progress)
  }
}
