import { supabase } from './supabase'

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
  status: 'active' | 'at-risk' | 'inactive'
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
    status: 'completed' | 'at-risk' | 'on-track'
    lastActive: string
    timeSpentSeconds: number
  }[]
  lastActive: string
  totalProgress: number
  learningStreak: number
  status: 'active' | 'inactive' | 'at-risk'
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
  stats: {
    totalEnrollments: number
    activeLearners: number
    inactiveLearners: number
    avgCompletionRate: number
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

// Helper to determine risk
function determineStudentRisk(lastActive: Date, completionPct: number, hasFails: boolean): 'active' | 'inactive' | 'at-risk' {
  const daysInactive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  if (daysInactive > 14) {
    return 'inactive'
  }
  if (daysInactive > 7 || hasFails || (daysInactive > 3 && completionPct < 10)) {
    return 'at-risk'
  }
  return 'active'
}

function calculateStreak(lps: Record<string, unknown>[]): number {
  if (!lps || lps.length === 0) return 0;
  const dates = lps
    .filter(lp => lp.last_viewed_at)
    .map(lp => {
      const d = new Date(lp.last_viewed_at);
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

export async function fetchStudentsDeepProgress(educatorId: string): Promise<DetailedStudentProgress[]> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError) throw coursesError
  const courseIds = (courses || []).map((c) => c.id)
  if (courseIds.length === 0) return []

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id, status, enrolled_at,
      users:user_id (id, full_name, email),
      course_id
    `)
    .in('course_id', courseIds)
    .order('enrolled_at', { ascending: false })

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
      .select('id, accessibility_prefs')
      .in('id', studentUserIds);
    for (const p of profiles || []) {
      userProfilesMap.set(p.id, p.accessibility_prefs);
    }
  }

  for (const raw of (enrollments || []) as Record<string, unknown>[]) {
    const userId = raw.users?.id
    if (!userId) continue

    if (!studentMap.has(userId)) {
      studentMap.set(userId, {
        id: userId,
        name: raw.users?.full_name || 'Unknown',
        email: raw.users?.email || '',
        courses: [],
        lastActive: raw.enrolled_at,
        totalProgress: 0,
        learningStreak: 0,
        status: 'active',
        accessibility_prefs: userProfilesMap.get(userId) || null
      })
    }

    const student = studentMap.get(userId)!
    
    // Calculate progress based on lessons
    const lps = lessonProgressMap.get(raw.id) || []
    const completedLessons = lps.filter(lp => lp.is_viewed).length
    const totalTimeSpent = lps.reduce((acc, lp) => acc + (lp.time_spent_learning || (lp.is_viewed ? 1200 : 0)), 0)
    
    // Find last active from lps
    let courseLastActive = new Date(raw.enrolled_at)
    lps.forEach(lp => {
      if (lp.last_viewed_at && new Date(lp.last_viewed_at) > courseLastActive) {
        courseLastActive = new Date(lp.last_viewed_at)
      }
    })

    if (courseLastActive > new Date(student.lastActive)) {
      student.lastActive = courseLastActive.toISOString()
    }

    const totalLessons = courseLessonCounts.get(raw.course_id) || 1;
    const progress = Math.min(Math.round((completedLessons / totalLessons) * 100), 100);

    const qas = quizAttemptsMap.get(raw.id) || [];
    const hasFails = qas.some(qa => qa.result === 'failed');
    const avgScore = qas.length > 0 ? Math.round(qas.reduce((acc, qa) => acc + (qa.score_pct || 0), 0) / qas.length) : 0;
    
    // Update streak based on all course lesson progress
    const courseStreak = calculateStreak(lps);
    if (courseStreak > student.learningStreak) {
      student.learningStreak = courseStreak;
    }

    student.courses.push({
      id: raw.course_id,
      title: courseMap.get(raw.course_id) || 'Unknown',
      progress: raw.status === 'completed' ? 100 : progress,
      avgScore: avgScore,
      status: determineStudentRisk(courseLastActive, progress, hasFails),
      lastActive: courseLastActive.toISOString(),
      timeSpentSeconds: totalTimeSpent
    })
  }

  // Update overall student status and progress
  for (const student of Array.from(studentMap.values())) {
    student.totalProgress = Math.round(
      student.courses.reduce((sum, c) => sum + c.progress, 0) / (student.courses.length || 1)
    )
    student.status = determineStudentRisk(new Date(student.lastActive), student.totalProgress, false)
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
          title: `Viewed Lesson: ${lp.lessons?.title || 'Unknown'}`,
          courseTitle: courseMap.get(e?.course_id || '') || 'Unknown',
          timestamp: lp.first_viewed_at
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
          title: `Submitted Quiz: ${qa.quizzes?.title || 'Unknown'} (Score: ${qa.score_pct}%)`,
          courseTitle: courseMap.get(e?.course_id || '') || 'Unknown',
          timestamp: qa.submitted_at,
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
    .select('id, title')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError || !courses || courses.length === 0) return []

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
    let activeLearners = 0
    let newEnrollmentsThisMonth = 0
    
    // We would need to join with lesson_progress to get exact active/inactive,
    // but for deep analytics overview, we can estimate based on a simpler approach or fetch
    // To save DB calls, we will mark recent enrollments as active
    enrollments.forEach(e => {
       const enrolledDate = new Date(e.enrolled_at).getTime()
       const days = (now - enrolledDate) / (1000 * 60 * 60 * 24)
       if (days < 14) activeLearners++
       if (days <= 30) newEnrollmentsThisMonth++
    })

    const inactiveLearners = totalEnrollments - activeLearners
    const enrollmentIds = enrollments.map(e => e.id)
    
    // Default insights
    let avgQuizScore = 0
    let mostCompletedLesson = 'Not enough data'
    let mostSkippedLesson = 'Not enough data'
    let mostDifficultLesson = 'Not enough data'
    let mostAttemptedQuiz = 'Not enough data'

    if (enrollmentIds.length > 0) {
      // Fetch Lesson Progress for this course's enrollments
      const { data: lpData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed, is_viewed, lessons(title)')
        .in('enrollment_id', enrollmentIds)

      // Fetch Quiz Attempts for this course's enrollments
      const { data: qaData } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score_pct, quizzes(title)')
        .in('enrollment_id', enrollmentIds)

      if (qaData && qaData.length > 0) {
        const totalScore = qaData.reduce((acc, qa) => acc + (qa.score_pct || 0), 0)
        avgQuizScore = Math.round(totalScore / qaData.length)

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

    results.push({
      courseId: course.id,
      title: course.title,
      stats: {
        totalEnrollments,
        activeLearners,
        inactiveLearners,
        avgCompletionRate: totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0,
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
      .select('quiz_id, score_pct, enrollment_id, submitted_at')
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
    const totalTime = lps.reduce((acc, lp) => acc + (lp.time_spent_learning || 0), 0)
    const avgTime = lps.length > 0 ? Math.round(totalTime / lps.length) : 0

    const quizEntry = quizzes?.find(q => q.lesson_id === lesson.id)
    let avgQuizScore: number | null = null
    if (quizEntry) {
      const scores: number[] = []
      for (const qas of qaByEnrollment.values()) {
        for (const qa of qas) {
          if (qa.quiz_id === quizEntry.id) scores.push(qa.score_pct || 0)
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
    const user = (e as Record<string, unknown>).users || {}
    const lps = lpByEnrollment.get(e.id) || []
    const completedCount = lps.filter(lp => lp.is_completed).length
    const progress = Math.min(Math.round((completedCount / totalLessons) * 100), 100)

    const qas = qaByEnrollment.get(e.id) || []
    const avgScore = qas.length > 0
      ? Math.round(qas.reduce((acc, qa) => acc + (qa.score_pct || 0), 0) / qas.length)
      : 0

    let lastActive = e.enrolled_at
    for (const lp of lps) {
      if (lp.last_viewed_at && lp.last_viewed_at > lastActive) lastActive = lp.last_viewed_at
    }

    const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
    const hasFails = qas.some(qa => qa.score_pct !== null && qa.score_pct < 50)
    let status: 'active' | 'at-risk' | 'inactive' = 'active'
    if (daysSinceActive > 14) status = 'inactive'
    else if (daysSinceActive > 7 || hasFails || (daysSinceActive > 3 && progress < 10)) status = 'at-risk'

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
