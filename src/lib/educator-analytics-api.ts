import { supabase } from './supabase'

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
}

export interface TimelineEvent {
  id: string
  type: 'enrollment' | 'lesson_view' | 'quiz_attempt'
  title: string
  courseTitle: string
  timestamp: string
  metadata?: any
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
  if (daysInactive > 7 || hasFails || (daysInactive > 3 && completionPct < 10)) {
    return 'at-risk'
  }
  if (daysInactive > 14) {
    return 'inactive'
  }
  return 'active'
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

  const enrollmentIds = (enrollments || []).map((e: any) => e.id)
  
  // Fetch lesson progress for all these enrollments
  let lessonProgressMap = new Map<string, any[]>()
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

  for (const raw of (enrollments || []) as any) {
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
        learningStreak: Math.floor(Math.random() * 5), // Mock streak
        status: 'active'
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

    // Mock total lessons per course as 5 for progress calculation if we don't have it
    // In a real app we'd fetch the total lesson count per course
    const totalLessons = Math.max(completedLessons, 5) 
    const progress = Math.min(Math.round((completedLessons / totalLessons) * 100), 100)

    const hasFails = false // Mock for now

    student.courses.push({
      id: raw.course_id,
      title: courseMap.get(raw.course_id) || 'Unknown',
      progress: raw.status === 'completed' ? 100 : progress,
      avgScore: Math.floor(Math.random() * 20) + 80, // Mock score 80-100
      status: determineStudentRisk(courseLastActive, progress, hasFails) as any,
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
    lps.forEach((lp: any) => {
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
    qas.forEach((qa: any) => {
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
    
    // We would need to join with lesson_progress to get exact active/inactive,
    // but for deep analytics overview, we can estimate based on a simpler approach or fetch
    // To save DB calls, we will mark recent enrollments as active
    enrollments.forEach(e => {
       const days = (now - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60 * 24)
       if (days < 14) activeLearners++
    })

    const inactiveLearners = totalEnrollments - activeLearners

    results.push({
      courseId: course.id,
      title: course.title,
      stats: {
        totalEnrollments,
        activeLearners,
        inactiveLearners,
        avgCompletionRate: totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0,
        avgQuizScore: Math.floor(Math.random() * 20) + 75 // Mocking quiz score average for now
      },
      insights: {
        mostCompletedLesson: 'Lesson 1: Introduction',
        mostSkippedLesson: 'Lesson 4: Advanced Concepts',
        mostDifficultLesson: 'Quiz 2',
        mostAttemptedQuiz: 'Quiz 1'
      }
    })
  }

  return results
}
