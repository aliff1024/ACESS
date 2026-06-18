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
  certificate_enabled?: boolean
  has_certificate?: boolean
  creator_name?: string
  student_count?: number
  updated_at?: string
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
  certificate_enabled?: boolean
  creator_name?: string
  student_count?: number
  updated_at?: string
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
  course_type: string
  system_course: boolean
  guided_learning_enabled: boolean
  recommended_age_group: string | null
  certificate_enabled?: boolean
  creator_name?: string
  updated_at?: string
  total_duration?: number
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
  lesson_type?: string
  has_video?: boolean
  has_pdf?: boolean
  has_quiz?: boolean
  has_transcript?: boolean
  has_summary_activity?: boolean
  summary_source?: string
  summary_word_target?: number
  summary_key_points?: string[]
  summary_reflection_questions?: string[]
  lesson_layout?: string
  simplified_summary?: string
  focus_mode_enabled?: boolean
  chunked_content_enabled?: boolean
  checkpoints_enabled?: boolean
  estimated_duration?: number
  adaptive_learning_enabled?: boolean
}

export interface StudentLessonSummary {
  id: string
  lesson_id: string
  content: string
  word_count: number
  status: 'draft' | 'submitted' | 'reviewed'
  ai_feedback?: string
  educator_feedback?: string
  submitted_at?: string
  created_at: string
  updated_at: string
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
  image_url?: string | null
  options: QuizOption[]
}

export interface QuizOption {
  id: string
  option_text: string
  is_correct: boolean
  sequence_order: number
  image_url?: string | null
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
  course_id?: string
  course_title: string
  completion_date: string
  certificate_code: string
  score: number
  pdf_url?: string
  verification_url?: string
  is_system_course?: boolean
  is_custom_upload?: boolean
}

export interface Recommendation {
  lesson_id: string
  lesson_title: string
  course_id: string
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
      courses!inner(id, title, description, difficulty_level, category, thumbnail_url, course_type, system_course, guided_learning_enabled, certificate_enabled, created_by, updated_at)
    `)
    .eq('user_id', userId)
    .neq('status', 'dropped')

  if (error) throw error

  const enrollmentsArr = enrollments as unknown as {
    id: string
    status: string
    course_id: string
    courses: { id: string; title: string; description: string; difficulty_level: string; category: string | null; thumbnail_url: string | null; certificate_enabled: boolean; course_type: string; system_course: boolean; guided_learning_enabled: boolean; created_by: string; updated_at: string }
  }[]

  const courseIds = enrollmentsArr.map((e) => e.course_id)

  const lessonCounts = new Map<string, number>()
  const completedCounts = new Map<string, number>()
  const certMap = new Map<string, boolean>()
  const creatorMap = new Map<string, string>()
  const enrollCountMap = new Map<string, number>()
  const updatedAtMap = new Map<string, string>()

  if (courseIds.length > 0) {
    const creatorIds = [...new Set(enrollmentsArr.map(e => e.courses.created_by).filter(Boolean))]
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', creatorIds)
      for (const u of creators || []) {
        creatorMap.set(u.id, u.full_name || 'Unknown')
      }
    }

    const { data: allEnrolls } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseIds)
    for (const en of allEnrolls || []) {
      enrollCountMap.set(en.course_id, (enrollCountMap.get(en.course_id) || 0) + 1)
    }

    const [{ data: lessons }, { data: certs }] = await Promise.all([
      supabase.from('lessons').select('id, course_id').in('course_id', courseIds).eq('status', 'published').or('visibility_status.eq.visible,visibility_status.is.null'),
      supabase.from('certificates').select('enrollment_id').in('enrollment_id', enrollmentsArr.map(e => e.id)).eq('status', 'issued'),
    ])

    const lessonMap = new Map<string, string[]>()
    for (const l of lessons || []) {
      const arr = lessonMap.get(l.course_id) || []
      arr.push(l.id)
      lessonMap.set(l.course_id, arr)
    }

    for (const [cid, ids] of lessonMap) {
      lessonCounts.set(cid, ids.length)
    }

    for (const c of certs || []) {
      certMap.set(c.enrollment_id, true)
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

    for (const e of enrollmentsArr) {
      const cid = e.course_id
      if (!updatedAtMap.has(cid)) {
        updatedAtMap.set(cid, e.courses.updated_at || '')
      }
    }
  }

  return enrollmentsArr.map((e) => {
    const total = lessonCounts.get(e.course_id) ?? 0
    const completed = completedCounts.get(e.course_id) ?? 0
    const course = e.courses
    return {
      id: e.course_id,
      title: course.title,
      description: course.description,
      difficulty_level: course.difficulty_level,
      category: course.category,
      thumbnail_url: course.thumbnail_url,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      total_lessons: total,
      completed_lessons: completed,
      enrollment_status: e.status,
      enrollment_id: e.id,
      course_type: course.course_type || 'educator',
      system_course: course.system_course || false,
      guided_learning_enabled: course.guided_learning_enabled || false,
      certificate_enabled: course.certificate_enabled || false,
      has_certificate: certMap.get(e.id) || false,
      creator_name: creatorMap.get(course.created_by) || 'Educator',
      student_count: enrollCountMap.get(e.course_id) || 0,
      updated_at: updatedAtMap.get(e.course_id) || '',
    }
  })
}

// ─── Available Courses ─────────────────────────────────────────────────

export async function fetchAvailableCourses(): Promise<AvailableCourse[]> {
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, difficulty_level, category, thumbnail_url,
      course_type, system_course, certificate_enabled, created_by, updated_at,
      lessons(count)
    `)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchAvailableCourses error:', JSON.stringify(error))
    return []
  }

  const userId = await ensureUserId()
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  const enrolledIds = new Set((enrollments || []).map((e) => e.course_id))

  const courseIds = (courses || [])
    .filter((c: Record<string, unknown>) => !enrolledIds.has(c.id as string))
    .map((c: Record<string, unknown>) => c.id as string)

  const creatorMap = new Map<string, string>()
  const enrollCountMap = new Map<string, number>()

  if (courseIds.length > 0) {
    const creatorIds = [...new Set((courses || [])
      .filter((c: Record<string, unknown>) => !enrolledIds.has(c.id as string))
      .map((c: Record<string, unknown>) => c.created_by as string)
      .filter(Boolean))]

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', creatorIds)
      for (const u of creators || []) {
        creatorMap.set(u.id, u.full_name || 'Unknown')
      }
    }

    const { data: allEnrolls } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseIds)
    for (const en of allEnrolls || []) {
      enrollCountMap.set(en.course_id, (enrollCountMap.get(en.course_id) || 0) + 1)
    }
  }

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
        certificate_enabled: c.certificate_enabled as boolean || false,
        creator_name: creatorMap.get(c.created_by as string) || 'Educator',
        student_count: enrollCountMap.get(c.id as string) || 0,
        updated_at: c.updated_at as string || '',
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
      certificate_enabled, created_by, updated_at
    `)
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (courseError) {
    console.error('fetchCourseDetail error:', courseError)
    return null
  }
  if (!course) return null

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, sequence_order, estimated_duration')
    .eq('course_id', courseId)
    .or('visibility_status.eq.visible,visibility_status.is.null')
    .order('sequence_order', { ascending: true })

  if (lessonsError) {
    console.error('fetchCourseDetail lessons error:', JSON.stringify(lessonsError))
    return null
  }

  if ((lessons || []).length === 0) {
    const { count: draftCount } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
    console.warn(`fetchCourseDetail: 0 visible lessons for course ${courseId}, but ${draftCount ?? '?'} total lessons exist in DB`)
  }

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

  let creatorName = 'Educator'
  if (course.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', course.created_by)
      .maybeSingle()
    if (creator?.full_name) creatorName = creator.full_name
  }

  const totalLessons = (lessons || []).length
  const completedLessons = (lessons || []).filter((l) => completedSet.has(l.id)).length
  const totalDuration = (lessons || []).reduce((sum, l) => sum + (l.estimated_duration || 0), 0)

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
    certificate_enabled: course.certificate_enabled || false,
    creator_name: creatorName,
    updated_at: course.updated_at || '',
    total_duration: totalDuration,
  }
}

// ─── Lesson Content ────────────────────────────────────────────────────

export async function fetchLessonContent(lessonId: string): Promise<LessonContent | null> {
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select(`
      id, title, sequence_order, content_html, transcript, video_url, course_id,
      lesson_type, has_video, has_pdf, has_quiz, has_transcript, has_summary_activity,
      summary_source, summary_word_target, summary_key_points, summary_reflection_questions,
      lesson_layout, simplified_summary, focus_mode_enabled, chunked_content_enabled, checkpoints_enabled, estimated_duration, adaptive_learning_enabled
    `)
    .eq('id', lessonId)
    .maybeSingle()

  if (error) {
    return null
  }

  if (!lesson) return null

  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', lesson.course_id)
    .or('visibility_status.eq.visible,visibility_status.is.null')

  return {
    id: lesson.id,
    title: lesson.title,
    sequence_order: lesson.sequence_order,
    total_lessons: count ?? 0,
    content_html: lesson.content_html || '',
    transcript: lesson.transcript,
    video_url: lesson.video_url,
    lesson_type: lesson.lesson_type,
    has_video: lesson.has_video ?? true,
    has_pdf: lesson.has_pdf ?? true,
    has_quiz: lesson.has_quiz ?? true,
    has_transcript: lesson.has_transcript ?? true,
    has_summary_activity: lesson.has_summary_activity ?? false,
    summary_source: lesson.summary_source,
    summary_word_target: lesson.summary_word_target,
    summary_key_points: lesson.summary_key_points ? (
      typeof lesson.summary_key_points === 'string'
        ? JSON.parse(lesson.summary_key_points)
        : lesson.summary_key_points
    ) : [],
    summary_reflection_questions: lesson.summary_reflection_questions ? (
      typeof lesson.summary_reflection_questions === 'string'
        ? JSON.parse(lesson.summary_reflection_questions)
        : lesson.summary_reflection_questions
    ) : [],
    lesson_layout: lesson.lesson_layout || 'standard',
    simplified_summary: lesson.simplified_summary || null,
    focus_mode_enabled: lesson.focus_mode_enabled ?? false,
    chunked_content_enabled: lesson.chunked_content_enabled ?? false,
    checkpoints_enabled: lesson.checkpoints_enabled ?? false,
    estimated_duration: lesson.estimated_duration ?? null,
    adaptive_learning_enabled: lesson.adaptive_learning_enabled ?? false,
  }
}

// ─── Lesson Checkpoints (learner) ──────────────────────────────────────

export interface LearnerLessonCheckpoint {
  id: string
  lesson_id: string
  title: string
  description: string | null
  checkpoint_type: string
  sequence_order: number
  required: boolean
}

export async function fetchLessonCheckpoints(lessonId: string): Promise<LearnerLessonCheckpoint[]> {
  const { data, error } = await supabase
    .from('lesson_checkpoints')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchCompletedCheckpointIds(enrollmentId: string, lessonId: string): Promise<Set<string>> {
  const { data: checkpoints } = await supabase
    .from('lesson_checkpoints')
    .select('id')
    .eq('lesson_id', lessonId)
  if (!checkpoints?.length) return new Set()
  const ids = checkpoints.map((c) => c.id)
  const { data } = await supabase
    .from('learner_checkpoints')
    .select('checkpoint_id')
    .eq('enrollment_id', enrollmentId)
    .eq('completed', true)
    .in('checkpoint_id', ids)
  return new Set((data || []).map((r) => r.checkpoint_id))
}

export async function completeLearnerCheckpoint(checkpointId: string, enrollmentId: string): Promise<void> {
  const { error } = await supabase.from('learner_checkpoints').upsert(
    {
      enrollment_id: enrollmentId,
      checkpoint_id: checkpointId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'enrollment_id,checkpoint_id' },
  )
  if (error) throw error
}

// ─── Interactive Content (learner) ────────────────────────────────────────

export interface LearnerInteractiveContent {
  id: string
  lesson_id: string
  content_type: 'flashcards' | 'drag_drop' | 'fill_blanks' | 'memory_game' | 'timeline'
  title: string
  content_data: Record<string, unknown>
  accessibility_settings: Record<string, unknown>
  sequence_order: number
}

export async function fetchLessonInteractiveContent(lessonId: string): Promise<LearnerInteractiveContent[]> {
  const { data, error } = await supabase
    .from('lesson_interactive_content')
    .select('*')
    .eq('lesson_id', lessonId)
    .or('is_draft.eq.false,is_draft.is.null')
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

// ─── Video Questions (learner) ──────────────────────────────────────────

export interface LearnerVideoQuestion {
  id: string
  lesson_id: string
  title: string
  timestamp_seconds: number
  question_text: string
  options: string[]
  correct_option_index: number
  sequence_order: number
}

export async function fetchLessonVideoQuestions(lessonId: string): Promise<LearnerVideoQuestion[]> {
  const { data, error } = await supabase
    .from('video_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('timestamp_seconds', { ascending: true })
  if (error) throw error
  return data || []
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
      is_viewed: false,
      view_count: 1,
      first_viewed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
  }
}

export async function completeLesson(lessonId: string, courseId: string): Promise<void> {
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
    .select('id')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('lesson_progress')
      .update({ is_viewed: true, summary_completed: true, last_viewed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress').insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      is_viewed: true,
      summary_completed: true,
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
    .or('visibility_status.eq.visible,visibility_status.is.null')
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
        .eq('enrollment_id', enrollment.id)
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

  // Milestones — auto-progress + admin-created
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const milestones: { label: string; achieved: boolean; achieved_at: string | null }[] = [
    { label: 'Started', achieved: completedLessons > 0, achieved_at: lastActivity },
    { label: '25% Complete', achieved: pct >= 25, achieved_at: null },
    { label: '50% Complete', achieved: pct >= 50, achieved_at: null },
    { label: '75% Complete', achieved: pct >= 75, achieved_at: null },
    { label: '100% Complete', achieved: pct >= 100, achieved_at: null },
    { label: 'First Quiz Passed', achieved: quizScores.some(q => q.score >= 60), achieved_at: null },
    { label: '7-Day Streak', achieved: streak >= 7, achieved_at: null },
  ]

  // Fetch admin-created course milestones
  const { data: courseMilestones } = await supabase
    .from('course_milestones')
    .select('title, required_completion_pct')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (courseMilestones) {
    for (const cm of courseMilestones) {
      milestones.push({
        label: cm.title,
        achieved: pct >= (cm.required_completion_pct ?? 100),
        achieved_at: null,
      })
    }
  }

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
  let userId: string
  try { userId = await ensureUserId() } catch { return { canAttempt: true, usedAttempts: 0, maxAttempts: 0 } }

  try {
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
  } catch {
    return { canAttempt: true, usedAttempts: 0, maxAttempts: 0 }
  }
}

export async function fetchQuizData(lessonId: string): Promise<QuizData | null> {
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, title, time_limit_seconds, max_attempts, pass_threshold_pct')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (quizError) {
    console.error('fetchQuizData quiz error:', quizError)
    return null
  }
  if (!quiz) return null

  const { data: questions, error: qError } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_type, sequence_order, image_url')
    .eq('quiz_id', quiz.id)
    .order('sequence_order', { ascending: true })

  if (qError) {
    console.error('fetchQuizData questions error:', qError)
    return null
  }

  const questionIds = (questions || []).map((q) => q.id)

  const { data: options, error: oError } = await supabase
    .from('quiz_options')
    .select('id, question_id, option_text, is_correct, sequence_order, image_url')
    .in('question_id', questionIds)
    .order('sequence_order', { ascending: true })

  if (oError) {
    console.error('fetchQuizData options error:', oError)
    return null
  }

  const optionsByQuestion = new Map<string, QuizOption[]>()
  for (const opt of options || []) {
    const arr = optionsByQuestion.get(opt.question_id) || []
    arr.push({
      id: opt.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      sequence_order: opt.sequence_order,
      image_url: opt.image_url,
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
      image_url: q.image_url,
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

export async function fetchQuizAttemptHistory(lessonId: string, courseId: string): Promise<{
  attempts: { attempt_number: number; score_pct: number; result: string; created_at: string }[]
  usedAttempts: number
  maxAttempts: number | null
}> {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, max_attempts')
      .eq('lesson_id', lessonId)
      .maybeSingle()
    if (quizError || !quiz) return { attempts: [], usedAttempts: 0, maxAttempts: null }

    let userId: string
    try { userId = await ensureUserId() } catch { return { attempts: [], usedAttempts: 0, maxAttempts: quiz.max_attempts } }

    const { data: enrollment, error: enrError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .neq('status', 'dropped')
      .maybeSingle()
    if (enrError || !enrollment) return { attempts: [], usedAttempts: 0, maxAttempts: quiz.max_attempts }

    const { data: attempts, error: attError } = await supabase
      .from('quiz_attempts')
      .select('attempt_number, score_pct, result, created_at')
      .eq('enrollment_id', enrollment.id)
      .eq('quiz_id', quiz.id)
      .order('attempt_number', { ascending: false })
    if (attError) return { attempts: [], usedAttempts: 0, maxAttempts: quiz.max_attempts }

    return {
      attempts: attempts || [],
      usedAttempts: attempts?.length || 0,
      maxAttempts: quiz.max_attempts,
    }
  } catch {
    return { attempts: [], usedAttempts: 0, maxAttempts: null }
  }
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
    .or('visibility_status.eq.visible,visibility_status.is.null')
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

  const { data: enrollments, error: enrollErr } = await supabase
    .from('enrollments')
    .select('id, course_id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (enrollErr) {
    console.error('fetchCertificates enrollments error:', enrollErr)
    return []
  }

  const enrollmentIds = (enrollments || []).map((e) => e.id)

  if (enrollmentIds.length === 0) return []

  const { data: certs, error: certErr } = await supabase
    .from('certificates')
    .select('id, enrollment_id, reference_code, issued_at, pdf_url, verification_url, metadata')
    .in('enrollment_id', enrollmentIds)
    .eq('status', 'issued')

  if (certErr) {
    console.error('fetchCertificates certs error:', certErr)
    return []
  }
  if (!certs || certs.length === 0) return []

  const courseMap = new Map((enrollments || []).map((e) => [e.id, e.course_id]))

  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, system_course')
    .in('id', [...new Set((enrollments || []).map((e) => e.course_id))])

  if (courseErr) console.error('fetchCertificates courses error:', courseErr)

  const courseInfoMap = new Map((courses || []).map((c) => [c.id, c]))

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score_pct')
    .in('enrollment_id', enrollmentIds)

  const bestScores = new Map<string, number>()
  for (const a of attempts || []) {
    const existing = bestScores.get(a.enrollment_id) ?? 0
    if (a.score_pct > existing) bestScores.set(a.enrollment_id, a.score_pct)
  }

  return certs.map((c) => {
    const courseId = courseMap.get(c.enrollment_id)
    const courseInfo = courseInfoMap.get(courseId!)
    
    // Determine if custom upload
    const isCustomUpload = c.metadata?.is_custom === true || 
                           (c.verification_url && !c.verification_url.includes('/verify/')) ||
                           !!c.pdf_url;

    return {
      id: c.id,
      course_id: courseId,
      course_title: (courseInfo as any)?.title || 'Unknown Course',
      completion_date: new Date(c.issued_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
      certificate_code: c.reference_code,
      score: bestScores.get(c.enrollment_id) ?? 0,
      pdf_url: c.pdf_url || c.verification_url,
      verification_url: c.verification_url,
      is_system_course: (courseInfo as any)?.system_course || false,
      is_custom_upload: !!isCustomUpload
    }
  })
}

export interface LearnerBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
  unlocked: boolean;
}

export async function fetchLearnerBadges(): Promise<LearnerBadge[]> {
  const stats = await fetchLearnerStats();
  const badges: LearnerBadge[] = [
    {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Completed your first lesson.',
      icon: 'Footprints',
      unlocked: stats.lessons_completed >= 1,
      earnedAt: new Date().toISOString()
    },
    {
      id: 'quick_learner',
      title: 'Quick Learner',
      description: 'Completed 10 lessons.',
      icon: 'Zap',
      unlocked: stats.lessons_completed >= 10,
    },
    {
      id: 'dedicated_learner',
      title: 'Dedicated Learner',
      description: 'Completed 25 lessons.',
      icon: 'BookOpen',
      unlocked: stats.lessons_completed >= 25,
    },
    {
      id: 'course_master',
      title: 'Course Master',
      description: 'Completed your first full course.',
      icon: 'GraduationCap',
      unlocked: stats.courses_completed >= 1,
      earnedAt: new Date().toISOString()
    },
    {
      id: 'veteran_student',
      title: 'Veteran',
      description: 'Completed 5 full courses.',
      icon: 'Shield',
      unlocked: stats.courses_completed >= 5,
    },
    {
      id: 'high_achiever',
      title: 'High Achiever',
      description: 'Maintained an average score of 80% or higher.',
      icon: 'Star',
      unlocked: stats.avg_score >= 80 && stats.lessons_completed > 0,
    },
    {
      id: 'multi_course',
      title: 'Scholar',
      description: 'Earned 3 or more certificates.',
      icon: 'Award',
      unlocked: stats.certificates_count >= 3,
    },
    {
      id: 'consistency',
      title: 'Consistent Explorer',
      description: 'Stayed active and engaged across multiple courses.',
      icon: 'Flame',
      unlocked: stats.courses_completed >= 2 && stats.lessons_completed >= 15,
    }
  ];
  return badges;
}

// ─── Lesson Summaries ─────────────────────────────────────────────────

export async function fetchLessonSummary(lessonId: string): Promise<StudentLessonSummary | null> {
  const userId = await ensureUserId()
  const { data } = await supabase
    .from('lesson_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  return data
}

export async function saveLessonSummary(lessonId: string, courseId: string, content: string, wordCount: number): Promise<void> {
  const userId = await ensureUserId()
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()
  if (!enrollment) throw new Error('Not enrolled')

  const existing = await supabase
    .from('lesson_summaries')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing.data) {
    await supabase
      .from('lesson_summaries')
      .update({ content, word_count: wordCount, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
  } else {
    await supabase
      .from('lesson_summaries')
      .insert({ user_id: userId, lesson_id: lessonId, enrollment_id: enrollment.id, content, word_count: wordCount, status: 'draft' })
  }
}

export async function submitLessonSummary(lessonId: string, courseId: string, content: string, wordCount: number): Promise<void> {
  const userId = await ensureUserId()
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()
  if (!enrollment) throw new Error('Not enrolled')

  const existing = await supabase
    .from('lesson_summaries')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing.data) {
    await supabase
      .from('lesson_summaries')
      .update({ content, word_count: wordCount, status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', existing.data.id)
  } else {
    await supabase
      .from('lesson_summaries')
      .insert({ user_id: userId, lesson_id: lessonId, enrollment_id: enrollment.id, content, word_count: wordCount, status: 'submitted', submitted_at: new Date().toISOString() })
  }

  await supabase
    .from('lesson_progress')
    .update({ summary_completed: true })
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)

  await supabase
    .from('lesson_progress')
    .update({ summary_completed: true })
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
}

// ─── Recommendations ───────────────────────────────────────────────────

interface ApiResponse {
  success: boolean
  recommendations?: Recommendation[]
  error?: string
}

export async function fetchRecommendations(): Promise<Recommendation[]> {
  const res = await fetch('/api/recommendations/generate', { method: 'POST' })
  if (!res.ok) return []
  const data: ApiResponse = await res.json()
  return data.recommendations || []
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
  custom_notes?: string | null
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
  tts_rate?: number | null
  tts_voice_uri?: string | null
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
      custom_notes: a.custom_notes ?? null,
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
      tts_rate: a.tts_rate ?? 1,
      tts_voice_uri: a.tts_voice_uri ?? null,
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
    .or('visibility_status.eq.visible,visibility_status.is.null')
    .order('sequence_order', { ascending: true })

  if (error) throw error
  return (data || []).map((l) => l.id)
}

// ─── Enhanced Certificate API ──────────────────────────────────────────

export interface FullCertificate {
  id: string
  learner_name: string
  course_title: string
  educator_name: string
  institution_name: string
  completion_date: string
  reference_code: string
  verification_url: string
  skills_earned: string[]
  course_duration_hours: number
  status: string
  issued_at: string
  template_id: string
  enrollment_id: string
}

export async function fetchCertificateDetail(certId: string): Promise<FullCertificate | null> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certId)
    .single()

  if (error || !data) return null

  // Security: only the owner or educator/admin can view
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('user_id, course_id')
    .eq('id', data.enrollment_id)
    .single()

  if (!enrollment) return null

  const { data: course } = await supabase
    .from('courses')
    .select('created_by')
    .eq('id', enrollment.course_id)
    .single()

  const isOwner = enrollment.user_id === userId
  const isEducator = course?.created_by === userId
  if (!isOwner && !isEducator) {
    // Check admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    if (!userData || userData.role !== 'admin') return null
  }

  return {
    id: data.id,
    learner_name: data.learner_name || 'Learner',
    course_title: data.course_title || 'Course',
    educator_name: data.educator_name || 'Educator',
    institution_name: data.institution_name || 'ACESS Platform',
    completion_date: data.completion_date || data.issued_at,
    reference_code: data.reference_code,
    verification_url: data.verification_url || '',
    skills_earned: data.skills_earned || [],
    course_duration_hours: data.course_duration_hours || 0,
    status: data.status,
    issued_at: data.issued_at,
    template_id: data.template_id || 'default',
    enrollment_id: data.enrollment_id,
  }
}

export async function checkCourseCertificateEligibility(courseId: string): Promise<{
  eligible: boolean
  reason?: string
  completed?: number
  total?: number
}> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return { eligible: false, reason: 'Not enrolled' }

  // Check if course has certificates enabled
  const { data: course } = await supabase
    .from('courses')
    .select('certificate_enabled, certificate_settings')
    .eq('id', courseId)
    .single()

  if (!course?.certificate_enabled) return { eligible: false, reason: 'Certificates not enabled for this course' }

  // Check existing certificate
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, status')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

  if (existing && existing.status === 'issued') return { eligible: true, reason: 'Certificate already issued' }

  // Count lessons
  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .or('visibility_status.eq.visible,visibility_status.is.null')

  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollment.id)
    .eq('is_viewed', true)

  if (completedLessons < totalLessons) {
    return {
      eligible: false,
      reason: `Complete all lessons (${completedLessons}/${totalLessons})`,
      completed: completedLessons,
      total: totalLessons,
    }
  }

  // Check quiz thresholds
  const settings = course.certificate_settings as Record<string, unknown> | null
  const quizThreshold = (settings?.completion_rules as Record<string, unknown>)?.quiz_threshold_pct as number || 80

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id')
    .in('lesson_id', (
      await supabase.from('lessons').select('id').eq('course_id', courseId)
    ).data?.map(l => l.id) || [])

  if (quizzes && quizzes.length > 0) {
    const quizIds = quizzes.map(q => q.id)
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('quiz_id, score_pct')
      .in('quiz_id', quizIds)
      .eq('enrollment_id', enrollment.id)
      .eq('result', 'pass')

    const passedQuizIds = new Set((attempts || []).map(a => a.quiz_id))
    const passRate = Math.round((passedQuizIds.size / quizzes.length) * 100)

    if (passRate < quizThreshold) {
      return {
        eligible: false,
        reason: `Quiz pass rate ${passRate}% below threshold ${quizThreshold}%`,
        completed: completedLessons,
        total: totalLessons,
      }
    }
  }

  return { eligible: true, completed: completedLessons, total: totalLessons }
}

export async function claimCertificate(courseId: string): Promise<{
  id: string
  referenceCode: string
} | null> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return null

  // Check eligibility
  const eligibility = await checkCourseCertificateEligibility(courseId)
  if (!eligibility.eligible) {
    console.warn('claimCertificate: eligibility check failed', eligibility.reason, eligibility)
    throw new Error(eligibility.reason || 'Not eligible for certificate')
  }

  // Get course and user data
  const [{ data: course }, { data: userData }] = await Promise.all([
    supabase.from('courses').select('title, certificate_settings, created_by').eq('id', courseId).single(),
    supabase.from('users').select('full_name').eq('id', userId).single(),
  ])

  if (!course || !userData) return null

  // Get educator name
  const { data: educator } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', course.created_by)
    .single()

  const settings = course.certificate_settings as Record<string, unknown> | null || {}
  // Call issueCertificate via educator-api logic — but we call it inline
  // to avoid circular dependency, call supabase directly
  const refCode = await (async function genCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const segs = [4, 4, 4]
    let c = ''
    for (const l of segs) {
      if (c) c += '-'
      for (let i = 0; i < l; i++) c += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const { data: exist } = await supabase.from('certificates').select('id').eq('reference_code', c).maybeSingle()
    if (exist) return genCode()
    return c
  })()

  const verificationUrl = `${window.location.origin}/verify/${refCode}`

  // Create signed token
  const tokenData = `${refCode}:${Date.now()}:acess-cert`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(tokenData))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signedToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)

  const skills = (settings.skills as string[]) || []

  const { data: cert, error } = await supabase
    .from('certificates')
    .insert({
      enrollment_id: enrollment.id,
      course_id: courseId,
      user_id: userId,
      learner_name: userData.full_name || 'Learner',
      course_title: course.title,
      educator_name: educator?.full_name || 'Educator',
      reference_code: refCode,
      status: 'issued',
      issued_at: new Date().toISOString(),
      completion_date: new Date().toISOString(),
      verification_url: verificationUrl,
      skills_earned: skills,
      course_duration_hours: (settings.course_duration_hours as number) || 0,
      signed_token: signedToken,
    })
    .select('id, reference_code')
    .single()

  if (error) throw error

  // Update enrollment status
  await supabase
    .from('enrollments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', enrollment.id)

  return { id: cert.id, referenceCode: cert.reference_code }
}

// ─── Public Certificate Verification ───────────────────────────────────

export interface VerificationData {
  valid: boolean
  revoked: boolean
  learner_name?: string
  course_title?: string
  educator_name?: string
  institution_name?: string
  issue_date?: string
  completion_date?: string
  reference_code?: string
  skills_earned?: string[]
}

export async function verifyCertificateByCode(code: string): Promise<VerificationData> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('reference_code', code)
    .maybeSingle()

  if (error || !data) {
    return { valid: false, revoked: false }
  }

  if (data.status === 'revoked') {
    return {
      valid: true,
      revoked: true,
      learner_name: data.learner_name,
      course_title: data.course_title,
      reference_code: data.reference_code,
    }
  }

  return {
    valid: true,
    revoked: false,
    learner_name: data.learner_name,
    course_title: data.course_title,
    educator_name: data.educator_name,
    institution_name: data.institution_name,
    issue_date: data.issued_at,
    completion_date: data.completion_date,
    reference_code: data.reference_code,
    skills_earned: data.skills_earned,
  }
}

// ─── Accessibility Categories ──────────────────────────────────────────

export async function fetchCourseAccessibilityCategoriesForLearner(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_accessibility_categories')
    .select('accessibility_category')
    .eq('course_id', courseId)

  if (error) throw error
  return (data || []).map((r) => r.accessibility_category)
}

export async function fetchCoursesAccessibilityCategories(
  courseIds: string[],
): Promise<Record<string, string[]>> {
  if (courseIds.length === 0) return {}
  const { data, error } = await supabase
    .from('course_accessibility_categories')
    .select('course_id, accessibility_category')
    .in('course_id', courseIds)

  if (error) throw error

  const result: Record<string, string[]> = {}
  for (const row of data || []) {
    if (!result[row.course_id]) result[row.course_id] = []
    result[row.course_id].push(row.accessibility_category)
  }
  return result
}

// ─── H5P Content (Learner) ──────────────────────────────────────────

export interface LearnerH5PContent {
  id: string
  lesson_id: string
  title: string
  embed_url: string
  source_url?: string | null
  description?: string | null
  width?: string
  height?: string
  sequence_order: number
  created_at: string
  updated_at: string
  thumbnail_url?: string | null
  h5p_mode: 'external' | 'self_hosted'
  library_name?: string | null
  content_json?: Record<string, any> | null
  folder_path?: string | null
}

export async function fetchLessonH5PContent(lessonId: string): Promise<LearnerH5PContent[]> {
  const { data, error } = await supabase
    .from('h5p_contents')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function submitH5PResponse(
  userId: string,
  h5pContentId: string,
  score: number | null,
  maxScore: number | null,
  completed: boolean,
  rawStatement: any
): Promise<void> {
  const { error } = await supabase
    .from('h5p_responses')
    .insert({
      user_id: userId,
      h5p_content_id: h5pContentId,
      score,
      max_score: maxScore,
      completed,
      raw_statement: rawStatement
    })
  if (error) throw error
}

