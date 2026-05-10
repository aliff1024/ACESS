import { supabase } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────

export interface LearnerProfile {
  id: string
  full_name: string
  email: string
}

export interface EnrolledCourse {
  id: string
  title: string
  description: string
  difficulty_level: string
  category: string | null
  thumbnail_url: string | null
  progress: number
  total_lessons: number
  completed_lessons: number
  enrollment_status: string
  enrollment_id: string
  course_type: string
  system_course: boolean
  guided_learning_enabled: boolean
}

export interface AvailableCourse {
  id: string
  title: string
  description: string
  difficulty_level: string
  category: string | null
  tags: string[]
  lesson_count: number
  thumbnail_url: string | null
  course_type: string
  system_course: boolean
}

export interface CourseDetail {
  id: string
  title: string
  description: string
  difficulty_level: string
  category: string | null
  tags: string[]
  thumbnail_url: string | null
  progress: number
  total_lessons: number
  completed_lessons: number
  enrollment_id: string | null
  lessons: LessonSummary[]
  /** System course indicators */
  course_type: string
  system_course: boolean
  guided_learning_enabled: boolean
  recommended_age_group: string | null
}

export interface LessonSummary {
  id: string
  title: string
  sequence_order: number
  status: 'completed' | 'current' | 'locked'
}

export interface LessonContent {
  id: string
  title: string
  sequence_order: number
  total_lessons: number
  content_html: string
  transcript: string | null
  video_url: string | null
}

export interface QuizData {
  id: string
  title: string
  time_limit_seconds: number | null
  max_attempts: number | null
  pass_threshold_pct: number | null
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  question_text: string
  question_type: string
  sequence_order: number
  options: QuizOption[]
}

export interface QuizOption {
  id: string
  option_text: string
  is_correct: boolean
  sequence_order: number
}

export interface LearnerStats {
  courses_completed: number
  lessons_completed: number
  avg_score: number
  certificates_count: number
}

export interface CourseProgress {
  id: string
  title: string
  description: string
  progress: number
  status: string
  completion_date: string | null
  lessons: LessonProgress[]
  avg_score: number
}

export interface LessonProgress {
  id: string
  title: string
  sequence_order: number
  status: 'completed' | 'inProgress' | 'locked'
  score: number | null
}

export interface Certificate {
  id: string
  course_title: string
  completion_date: string
  certificate_code: string
  score: number
}

export interface Recommendation {
  lesson_id: string
  lesson_title: string
  difficulty_tier: string
  trigger_reason: string
}

export interface LearnerSettings {
  preferred_font_size: number
  preferred_theme: string
  line_spacing: number
  tts_enabled: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────

async function ensureUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return data.user.id
}

// ─── Profile ───────────────────────────────────────────────────────────

export async function fetchLearnerProfile(): Promise<LearnerProfile> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ─── Enrolled Courses ──────────────────────────────────────────────────

export async function fetchEnrolledCourses(): Promise<EnrolledCourse[]> {
  const userId = await ensureUserId()
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      id, status,
      course_id,
      courses!inner(id, title, description, difficulty_level, category, thumbnail_url, course_type, system_course, guided_learning_enabled)
    `)
    .eq('user_id', userId)
    .neq('status', 'dropped')

  if (error) throw error

  const enrollmentsArr = enrollments as unknown as {
    id: string
    status: string
    course_id: string
    courses: { id: string; title: string; description: string; difficulty_level: string; category: string | null; thumbnail_url: string | null }
  }[]

  const courseIds = enrollmentsArr.map((e) => e.course_id)

  const lessonCounts = new Map<string, number>()
  const completedCounts = new Map<string, number>()

  if (courseIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
      .eq('status', 'published')

    const lessonMap = new Map<string, string[]>()
    for (const l of lessons || []) {
      const arr = lessonMap.get(l.course_id) || []
      arr.push(l.id)
      lessonMap.set(l.course_id, arr)
    }

    for (const [cid, ids] of lessonMap) {
      lessonCounts.set(cid, ids.length)
    }

    const enrollmentIds = enrollmentsArr.map((e) => e.id)

    const { data: lp } = await supabase
      .from('lesson_progress')
      .select('lesson_id, enrollment_id, is_viewed')
      .in('enrollment_id', enrollmentIds)

    for (const e of enrollmentsArr) {
      const viewed = (lp || []).filter(
        (p) => p.enrollment_id === e.id && p.is_viewed
      )
      completedCounts.set(e.course_id, viewed.length)
    }
  }

  return enrollmentsArr.map((e) => {
    const total = lessonCounts.get(e.course_id) ?? 0
    const completed = completedCounts.get(e.course_id) ?? 0
    return {
      id: e.course_id,
      title: e.courses.title,
      description: e.courses.description,
      difficulty_level: e.courses.difficulty_level,
      category: e.courses.category,
      thumbnail_url: e.courses.thumbnail_url,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      total_lessons: total,
      completed_lessons: completed,
      enrollment_status: e.status,
      enrollment_id: e.id,
      course_type: (e.courses as Record<string, unknown>).course_type as string || 'educator',
      system_course: (e.courses as Record<string, unknown>).system_course as boolean || false,
      guided_learning_enabled: (e.courses as Record<string, unknown>).guided_learning_enabled as boolean || false,
    }
  })
}

// ─── Available Courses ─────────────────────────────────────────────────

export async function fetchAvailableCourses(): Promise<AvailableCourse[]> {
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, difficulty_level, category, thumbnail_url,
      course_type, system_course,
      course_tags(tag),
      lessons(count)
    `)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  const userId = await ensureUserId()
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  const enrolledIds = new Set((enrollments || []).map((e) => e.course_id))

  return (courses || [])
    .filter((c: Record<string, unknown>) => !enrolledIds.has(c.id as string))
    .map((c: Record<string, unknown>) => {
      const tagsArr = c.course_tags as { tag: string }[] | undefined
      const lessonsArr = c.lessons as { count: number }[] | undefined
      return {
        id: c.id as string,
        title: c.title as string,
        description: c.description as string,
        difficulty_level: c.difficulty_level as string,
        category: c.category as string | null,
        thumbnail_url: c.thumbnail_url as string | null,
        tags: (tagsArr || []).map((t) => t.tag),
        lesson_count: lessonsArr?.[0]?.count ?? 0,
        course_type: c.course_type as string || 'educator',
        system_course: c.system_course as boolean || false,
      }
    })
}

// ─── Course Detail ─────────────────────────────────────────────────────

export async function fetchCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const userId = await ensureUserId()

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id, title, description, difficulty_level, category, thumbnail_url,
      course_type, system_course, guided_learning_enabled, recommended_age_group,
      course_tags(tag)
    `)
    .eq('id', courseId)
    .is('deleted_at', null)
    .single()

  if (courseError) throw courseError

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, sequence_order')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('sequence_order', { ascending: true })

  if (lessonsError) throw lessonsError

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  let completedSet = new Set<string>()
  if (enrollment) {
    const { data: lp } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('enrollment_id', enrollment.id)
      .eq('is_viewed', true)

    completedSet = new Set((lp || []).map((p) => p.lesson_id))
  }

  const totalLessons = (lessons || []).length
  const completedLessons = (lessons || []).filter((l) => completedSet.has(l.id)).length

  const lessonsWithStatus: LessonSummary[] = (lessons || []).map((l, i) => {
    let status: 'completed' | 'current' | 'locked'
    if (completedSet.has(l.id)) {
      status = 'completed'
    } else if (i === 0 || completedSet.has(lessons[i - 1].id)) {
      status = 'current'
    } else {
      status = 'locked'
    }
    return { id: l.id, title: l.title, sequence_order: l.sequence_order, status }
  })

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    difficulty_level: course.difficulty_level,
    category: course.category,
    thumbnail_url: course.thumbnail_url,
    tags: (course.course_tags || []).map((t: { tag: string }) => t.tag),
    progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    enrollment_id: enrollment?.id || null,
    lessons: lessonsWithStatus,
    course_type: course.course_type || 'educator',
    system_course: course.system_course || false,
    guided_learning_enabled: course.guided_learning_enabled || false,
    recommended_age_group: course.recommended_age_group || null,
  }
}

// ─── Lesson Content ────────────────────────────────────────────────────

export async function fetchLessonContent(lessonId: string): Promise<LessonContent | null> {
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, title, sequence_order, content_html, transcript, video_url, course_id')
    .eq('id', lessonId)
    .single()

  if (error) throw error

  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', lesson.course_id)
    .eq('status', 'published')

  return {
    id: lesson.id,
    title: lesson.title,
    sequence_order: lesson.sequence_order,
    total_lessons: count ?? 0,
    content_html: lesson.content_html,
    transcript: lesson.transcript,
    video_url: lesson.video_url,
  }
}

// ─── Mark Lesson Progress ──────────────────────────────────────────────

export async function markLessonViewed(lessonId: string, courseId: string): Promise<void> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return

  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id, view_count')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('lesson_progress')
      .update({ view_count: (existing.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress').insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      is_viewed: true,
      view_count: 1,
      first_viewed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
  }
}

// ─── System Course Enhanced Progress ───────────────────────────────────

export interface SystemCourseProgress {
  completed_lessons: number
  total_lessons: number
  progress_pct: number
  quiz_scores: { lesson_title: string; score: number }[]
  learning_streak: number
  last_activity: string | null
  time_spent_minutes: number
  milestones: { label: string; achieved: boolean; achieved_at: string | null }[]
  next_lesson_id: string | null
  next_lesson_title: string | null
}

export async function fetchSystemCourseProgress(courseId: string): Promise<SystemCourseProgress | null> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return null

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, sequence_order')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('sequence_order', { ascending: true })

  const totalLessons = lessons?.length ?? 0

  const { data: lp } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_viewed, last_viewed_at')
    .eq('enrollment_id', enrollment.id)

  const completedSet = new Set((lp || []).filter(p => p.is_viewed).map(p => p.lesson_id))
  const completedLessons = completedSet.size

  // Find next incomplete lesson
  let nextLessonId: string | null = null
  let nextLessonTitle: string | null = null
  for (const l of lessons || []) {
    if (!completedSet.has(l.id)) {
      nextLessonId = l.id
      nextLessonTitle = l.title
      break
    }
  }

  // Quiz scores per lesson
  const lessonIds = (lessons || []).map(l => l.id)
  const quizScores: { lesson_title: string; score: number }[] = []
  if (lessonIds.length > 0) {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, lesson_id')
      .in('lesson_id', lessonIds)

    const quizIds = (quizzes || []).map(q => q.id)
    if (quizIds.length > 0) {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score_pct')
        .in('quiz_id', quizIds)
        .eq('user_id', userId)
        .neq('result', 'in_progress')

      const bestScore = new Map<string, number>()
      for (const a of attempts || []) {
        const curr = bestScore.get(a.quiz_id) ?? 0
        if ((a.score_pct ?? 0) > curr) bestScore.set(a.quiz_id, a.score_pct ?? 0)
      }

      for (const q of quizzes || []) {
        const score = bestScore.get(q.id)
        if (score !== undefined) {
          const lesson = (lessons || []).find(l => l.id === q.lesson_id)
          quizScores.push({ lesson_title: lesson?.title || 'Unknown', score })
        }
      }
    }
  }

  // Learning streak: count consecutive days with activity
  let streak = 0
  const dates = (lp || [])
    .filter(p => p.last_viewed_at)
    .map(p => new Date(p.last_viewed_at!).toISOString().split('T')[0])
  const uniqueDates = [...new Set(dates)].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let checkDate = today
  for (const d of uniqueDates) {
    if (d === checkDate) {
      streak++
      const prev = new Date(checkDate)
      prev.setDate(prev.getDate() - 1)
      checkDate = prev.toISOString().split('T')[0]
    } else if (d < checkDate) {
      break
    }
  }

  // Time spent (simple estimate: count view records * 10 min each)
  const timeSpentMinutes = (lp || []).filter(p => p.is_viewed).length * 10

  // Last activity
  const datesWithActivity = (lp || [])
    .filter(p => p.last_viewed_at)
    .map(p => p.last_viewed_at!)
    .sort()
  const lastActivity = datesWithActivity.length > 0 ? datesWithActivity[datesWithActivity.length - 1] : null

  // Milestones
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const milestones = [
    { label: 'Started', achieved: completedLessons > 0, achieved_at: lastActivity },
    { label: '25% Complete', achieved: pct >= 25, achieved_at: null },
    { label: '50% Complete', achieved: pct >= 50, achieved_at: null },
    { label: '75% Complete', achieved: pct >= 75, achieved_at: null },
    { label: '100% Complete', achieved: pct >= 100, achieved_at: null },
    { label: 'First Quiz Passed', achieved: quizScores.some(q => q.score >= 60), achieved_at: null },
    { label: '7-Day Streak', achieved: streak >= 7, achieved_at: null },
  ]

  return {
    completed_lessons: completedLessons,
    total_lessons: totalLessons,
    progress_pct: pct,
    quiz_scores: quizScores,
    learning_streak: streak,
    last_activity: lastActivity,
    time_spent_minutes: timeSpentMinutes,
    milestones,
    next_lesson_id: nextLessonId,
    next_lesson_title: nextLessonTitle,
  }
}

// ─── Quiz ──────────────────────────────────────────────────────────────

export async function checkQuizAttempts(lessonId: string, courseId: string): Promise<{
  canAttempt: boolean
  usedAttempts: number
  maxAttempts: number | null
  message?: string
}> {
  const userId = await ensureUserId()

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, max_attempts')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!quiz) return { canAttempt: false, usedAttempts: 0, maxAttempts: null, message: 'No quiz found' }

  const max = quiz.max_attempts ?? 0

  if (max <= 0) return { canAttempt: true, usedAttempts: 0, maxAttempts: 0 }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return { canAttempt: true, usedAttempts: 0, maxAttempts: max }

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('enrollment_id', enrollment.id)
    .eq('quiz_id', quiz.id)

  const used = count ?? 0
  const canAttempt = used < max

  return {
    canAttempt,
    usedAttempts: used,
    maxAttempts: max,
    message: canAttempt ? undefined : `You have used all ${max} allowed attempt${max > 1 ? 's' : ''} for this quiz.`,
  }
}

export async function fetchQuizData(lessonId: string): Promise<QuizData | null> {
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title, time_limit_seconds, max_attempts, pass_threshold_pct')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (quizError) throw quizError
  if (!quiz) return null

  const { data: questions, error: qError } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_type, sequence_order')
    .eq('quiz_id', quiz.id)
    .order('sequence_order', { ascending: true })

  if (qError) throw qError

  const questionIds = (questions || []).map((q) => q.id)

  const { data: options, error: oError } = await supabase
    .from('quiz_options')
    .select('id, question_id, option_text, is_correct, sequence_order')
    .in('question_id', questionIds)
    .order('sequence_order', { ascending: true })

  if (oError) throw oError

  const optionsByQuestion = new Map<string, QuizOption[]>()
  for (const opt of options || []) {
    const arr = optionsByQuestion.get(opt.question_id) || []
    arr.push({
      id: opt.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      sequence_order: opt.sequence_order,
    })
    optionsByQuestion.set(opt.question_id, arr)
  }

  return {
    id: quiz.id,
    title: quiz.title,
    time_limit_seconds: quiz.time_limit_seconds,
    max_attempts: quiz.max_attempts,
    pass_threshold_pct: quiz.pass_threshold_pct,
    questions: (questions || []).map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      sequence_order: q.sequence_order,
      options: optionsByQuestion.get(q.id) || [],
    })),
  }
}

export async function submitQuizAttempt(params: {
  quizId: string
  courseId: string
  answers: { questionId: string; selectedOptionId: string }[]
}): Promise<{ score: number; passed: boolean; attemptId: string }> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', params.courseId)
    .neq('status', 'dropped')
    .single()

  const { data: existingAttempts } = await supabase
    .from('quiz_attempts')
    .select('attempt_number')
    .eq('enrollment_id', enrollment.id)
    .eq('quiz_id', params.quizId)
    .order('attempt_number', { ascending: false })
    .limit(1)

  const attemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('pass_threshold_pct')
    .eq('id', params.quizId)
    .single()

  let correctCount = 0
  const totalQuestions = params.answers.length

  for (const answer of params.answers) {
    const { data: opt } = await supabase
      .from('quiz_options')
      .select('is_correct')
      .eq('id', answer.selectedOptionId)
      .single()
    if (opt?.is_correct) correctCount++
  }

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const passed = (quiz?.pass_threshold_pct ?? 80) <= score

  const { data: attempt, error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert({
      enrollment_id: enrollment.id,
      quiz_id: params.quizId,
      attempt_number: attemptNumber,
      score_pct: score,
      result: passed ? 'pass' : 'fail',
    })
    .select()
    .single()

  if (attemptError) throw attemptError

  const answerRows = params.answers.map((a) => ({
    attempt_id: attempt.id,
    question_id: a.questionId,
    selected_option_id: a.selectedOptionId,
  }))

  const { error: ansError } = await supabase.from('quiz_answers').insert(answerRows)
  if (ansError) throw ansError

  return { score, passed, attemptId: attempt.id }
}

// ─── Learner Stats ─────────────────────────────────────────────────────

export async function fetchLearnerStats(): Promise<LearnerStats> {
  const userId = await ensureUserId()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  const enrollmentIds = (enrollments || []).map((e) => e.id)
  const completedEnrollments = (enrollments || []).filter((e) => e.status === 'completed').length

  let totalViewed = 0

  if (enrollmentIds.length > 0) {
    const { data: lp } = await supabase
      .from('lesson_progress')
      .select('id')
      .in('enrollment_id', enrollmentIds)
      .eq('is_viewed', true)
    totalViewed = lp?.length ?? 0
  }

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score_pct')
    .in('enrollment_id', enrollmentIds)

  const scores = (attempts || []).map((a) => a.score_pct)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const { count: certCount } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .in('enrollment_id', enrollmentIds)
    .eq('status', 'issued')

  return {
    courses_completed: completedEnrollments,
    lessons_completed: totalViewed,
    avg_score: avgScore,
    certificates_count: certCount ?? 0,
  }
}

// ─── Course Progress ───────────────────────────────────────────────────

export async function fetchCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const userId = await ensureUserId()

  const { data: course, error: cError } = await supabase
    .from('courses')
    .select('id, title, description')
    .eq('id', courseId)
    .single()

  if (cError) throw cError

  const { data: lessons, error: lError } = await supabase
    .from('lessons')
    .select('id, title, sequence_order')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('sequence_order', { ascending: true })

  if (lError) throw lError

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status, completed_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  const completedSet = new Set<string>()
  const lessonScores = new Map<string, number>()
  const totalLessons = lessons?.length ?? 0
  let completedCount = 0

  if (enrollment) {
    const { data: lp } = await supabase
      .from('lesson_progress')
      .select('lesson_id, is_viewed')
      .eq('enrollment_id', enrollment.id)

    for (const p of lp || []) {
      if (p.is_viewed) {
        completedSet.add(p.lesson_id)
      }
    }
    completedCount = completedSet.size

    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        score_pct,
        quizzes!inner(lesson_id)
      `)
      .eq('enrollment_id', enrollment.id)
      .eq('result', 'pass')

    for (const qa of quizAttempts || []) {
      const q = qa as unknown as { score_pct: number; quizzes: { lesson_id: string } }
      const existing = lessonScores.get(q.quizzes.lesson_id)
      if (existing === undefined || q.score_pct > existing) {
        lessonScores.set(q.quizzes.lesson_id, q.score_pct)
      }
    }
  }

  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const lessonProgressList: LessonProgress[] = (lessons || []).map((l, i) => {
    let status: 'completed' | 'inProgress' | 'locked'
    if (completedSet.has(l.id)) {
      status = 'completed'
    } else if (i === 0 || completedSet.has(lessons[i - 1].id)) {
      status = 'inProgress'
    } else {
      status = 'locked'
    }
    return {
      id: l.id,
      title: l.title,
      sequence_order: l.sequence_order,
      status,
      score: lessonScores.get(l.id) ?? null,
    }
  })

  const scores = lessonProgressList.filter((l) => l.score !== null).map((l) => l.score!)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    progress,
    status: enrollment?.status || 'not_enrolled',
    completion_date: enrollment?.completed_at || null,
    lessons: lessonProgressList,
    avg_score: avgScore,
  }
}

// ─── Certificates ──────────────────────────────────────────────────────

export async function fetchCertificates(): Promise<Certificate[]> {
  const userId = await ensureUserId()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  const enrollmentIds = (enrollments || []).map((e) => e.id)

  if (enrollmentIds.length === 0) return []

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, enrollment_id, reference_code, issued_at, pdf_url')
    .in('enrollment_id', enrollmentIds)
    .eq('status', 'issued')

  const courseMap = new Map((enrollments || []).map((e) => [e.id, e.course_id]))

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .in('id', [...new Set((enrollments || []).map((e) => e.course_id))])

  const titleMap = new Map((courses || []).map((c) => [c.id, c.title]))

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score_pct')
    .in('enrollment_id', enrollmentIds)

  const bestScores = new Map<string, number>()
  for (const a of attempts || []) {
    const existing = bestScores.get(a.enrollment_id) ?? 0
    if (a.score_pct > existing) bestScores.set(a.enrollment_id, a.score_pct)
  }

  return (certs || []).map((c) => {
    const courseId = courseMap.get(c.enrollment_id)
    return {
      id: c.id,
      course_title: titleMap.get(courseId!) || 'Unknown Course',
      completion_date: new Date(c.issued_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
      certificate_code: c.reference_code,
      score: bestScores.get(c.enrollment_id) ?? 0,
    }
  })
}

// ─── Recommendations ───────────────────────────────────────────────────

export async function fetchRecommendations(): Promise<Recommendation[]> {
  const userId = await ensureUserId()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  const enrollmentIds = (enrollments || []).map((e) => e.id)

  if (enrollmentIds.length === 0) return []

  const { data: recs } = await supabase
    .from('recommendations')
    .select(`
      id, difficulty_tier, trigger_reason,
      recommended_lesson_id,
      lessons!inner(id, title)
    `)
    .in('enrollment_id', enrollmentIds)
    .eq('is_acknowledged', false)
    .limit(3)

  return (recs || []).map((r: Record<string, unknown>) => {
    const lesson = r.lessons as { id: string; title: string }
    return {
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      difficulty_tier: r.difficulty_tier as string,
      trigger_reason: r.trigger_reason as string,
    }
  })
}

// ─── Learner Settings ──────────────────────────────────────────────────

export async function fetchLearnerSettings(): Promise<LearnerSettings | null> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('learner_profiles')
    .select('preferred_font_size, preferred_theme, line_spacing, tts_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    preferred_font_size: data.preferred_font_size,
    preferred_theme: data.preferred_theme,
    line_spacing: data.line_spacing,
    tts_enabled: data.tts_enabled,
  }
}

export async function saveLearnerSettings(settings: LearnerSettings): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase.from('learner_profiles').upsert(
    {
      user_id: userId,
      preferred_font_size: settings.preferred_font_size,
      preferred_theme: settings.preferred_theme,
      line_spacing: settings.line_spacing,
      tts_enabled: settings.tts_enabled,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

// ─── Profile (new tables) ──────────────────────────────────────────────

export interface UserProfileData {
  username?: string | null
  avatar_url?: string | null
  phone_number?: string | null
  birth_date?: string | null
  bio?: string | null
  country?: string | null
  preferred_language?: string | null
}

export interface AccessibilitySettingsData {
  disability_type?: string | null
  preferred_font_size?: string | null
  preferred_theme?: string | null
  line_spacing?: string | null
  tts_enabled?: boolean | null
  captions_enabled?: boolean | null
  screen_reader_optimized?: boolean | null
  keyboard_navigation_enabled?: boolean | null
  reduced_motion?: boolean | null
  simplified_ui?: boolean | null
  dyslexia_friendly_font?: boolean | null
  preferred_font?: string | null
  preferred_language?: string | null
  preferred_reading_level?: string | null
  preferred_content_format?: string | null
}

export interface NotificationSettingsData {
  email_notifications?: boolean | null
  push_notifications?: boolean | null
  course_updates?: boolean | null
  certificate_notifications?: boolean | null
  marketing_notifications?: boolean | null
}

export interface FullProfile {
  id: string
  email: string
  full_name: string
  role: string
  profile: UserProfileData | null
  accessibility: AccessibilitySettingsData | null
  notifications: NotificationSettingsData | null
}

export async function fetchFullProfile(): Promise<FullProfile> {
  const userId = await ensureUserId()

  const [userResult, profileResult, accessibilityResult, notificationResult] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role').eq('id', userId).single(),
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_accessibility_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_notification_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (userResult.error) throw userResult.error

  const p = profileResult.data
  const a = accessibilityResult.data
  const n = notificationResult.data

  return {
    id: userResult.data.id,
    email: userResult.data.email,
    full_name: userResult.data.full_name,
    role: userResult.data.role,
    profile: p ? {
      username: p.username,
      avatar_url: p.avatar_url,
      phone_number: p.phone_number,
      birth_date: p.birth_date,
      bio: p.bio,
      country: p.country,
      preferred_language: p.preferred_language,
    } : null,
    accessibility: a ? {
      disability_type: a.disability_type,
      preferred_font_size: a.preferred_font_size,
      preferred_theme: a.preferred_theme,
      line_spacing: a.line_spacing,
      tts_enabled: a.tts_enabled,
      captions_enabled: a.captions_enabled,
      screen_reader_optimized: a.screen_reader_optimized,
      keyboard_navigation_enabled: a.keyboard_navigation_enabled,
      reduced_motion: a.reduced_motion,
      simplified_ui: a.simplified_ui,
      dyslexia_friendly_font: a.dyslexia_friendly_font,
      preferred_font: a.preferred_font,
      preferred_language: a.preferred_language,
      preferred_reading_level: a.preferred_reading_level,
      preferred_content_format: a.preferred_content_format,
    } : null,
    notifications: n ? {
      email_notifications: n.email_notifications,
      push_notifications: n.push_notifications,
      course_updates: n.course_updates,
      certificate_notifications: n.certificate_notifications,
      marketing_notifications: n.marketing_notifications,
    } : null,
  }
}

export async function saveUserProfile(data: UserProfileData): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: userId, ...data },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function saveAccessibilitySettings(data: AccessibilitySettingsData): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase.from('user_accessibility_settings').upsert(
    { user_id: userId, ...data },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function saveNotificationSettings(data: NotificationSettingsData): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase.from('user_notification_settings').upsert(
    { user_id: userId, ...data },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

// ─── Enrollment ────────────────────────────────────────────────────────

export async function enrollInCourse(courseId: string): Promise<{ enrollmentId: string }> {
  const userId = await ensureUserId()

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (existing) return { enrollmentId: existing.id }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({ user_id: userId, course_id: courseId, status: 'active' })
    .select('id')
    .single()

  if (error) throw error
  return { enrollmentId: data.id }
}

// ─── Favorites ─────────────────────────────────────────────────────────

export async function toggleFavorite(courseId: string): Promise<boolean> {
  const userId = await ensureUserId()
  const { data: existing } = await supabase
    .from('course_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('course_favorites')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return false // no longer favourited
  } else {
    const { error } = await supabase
      .from('course_favorites')
      .insert({ user_id: userId, course_id: courseId })
    if (error) throw error
    return true // now favourited
  }
}

export async function checkIsFavorited(courseId: string): Promise<boolean> {
  const userId = await ensureUserId()
  const { data } = await supabase
    .from('course_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  return !!data
}

export async function fetchFavoriteCourseIds(): Promise<string[]> {
  const userId = await ensureUserId()
  const { data } = await supabase
    .from('course_favorites')
    .select('course_id')
    .eq('user_id', userId)
  return (data || []).map((r) => r.course_id)
}

export async function fetchFavoriteCourses() {
  const ids = await fetchFavoriteCourseIds()
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, difficulty_level, category, thumbnail_url')
    .in('id', ids)
    .is('deleted_at', null)
    .eq('status', 'published')
  if (error) throw error
  return (data || []).map((c) => ({
    ...c,
    isFavorited: true,
    lesson_count: 0,
  }))
}

// ─── Unenroll ───────────────────────────────────────────────────────────

export async function unenrollFromCourse(courseId: string): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'dropped' })
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
  if (error) throw error
}

// ─── Adjacent Lessons ──────────────────────────────────────────────────

export async function fetchLessonIdsInCourse(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('sequence_order', { ascending: true })

  if (error) throw error
  return (data || []).map((l) => l.id)
}
