import { supabase } from './supabase'
import { requireCurrentUserId } from './current-user'
import { v4 as uuidv4 } from 'uuid'
import { createNotification } from './notifications'
import {
  resolveAchievements,
  computeXP,
  getLevelInfo,
  type LearnerMetrics,
  type MetricTimeline,
  type ResolvedAchievement,
  type XPBreakdown,
  type LevelInfo,
} from './gamification'

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
  primary_disability_focus?: string | null
  total_duration?: number
  secondary_disability_focuses?: string[] | null
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
  primary_disability_focus?: string | null
  total_duration?: number
  secondary_disability_focuses?: string[] | null
  recommended_age_group?: string | null
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
  primary_disability_focus?: string | null
  secondary_disability_focuses?: string[] | null
}

export interface LessonSummary {
  id: string
  title: string
  sequence_order: number
  status: 'completed' | 'current' | 'locked'
  estimated_duration?: number | null
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
  allow_discussions?: boolean
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
  certificate_id?: string
  certificate_enabled?: boolean
  custom_cert_pdf_url?: string
  allow_custom_certs?: boolean
  cert_eligible?: boolean
  cert_eligibility_reason?: string
  quizzes_need_improvement?: { quizId: string; quizTitle: string; lessonId: string; lessonTitle: string }[]
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
  course_category?: string
  course_description?: string
  /** ISO timestamp. Formatting is the view's job — see fetchCertificates. */
  completion_date: string
  issued_at: string
  certificate_code: string
  status: string
  score: number
  pdf_url?: string
  verification_url?: string
  is_system_course?: boolean
  is_custom_upload?: boolean
  educator_name?: string
  institution_name?: string
  skills_earned?: string[]
  course_duration_hours?: number
  learner_name?: string
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

/**
 * The signed-in learner's id.
 *
 * Every exported function in this module starts by resolving the current user.
 * This used to call `supabase.auth.getUser()` — a network round-trip to the
 * auth server on EVERY call, measured at 24 hits to /auth/v1/user for a single
 * dashboard load. It now delegates to the shared, memoised resolver in
 * ./current-user, which reads the session the client already holds. See that
 * file for why filtering by a session-derived id is safe while RLS remains the
 * actual authorization boundary.
 */
async function ensureUserId(): Promise<string> {
  return requireCurrentUserId()
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
      courses!inner(id, title, description, difficulty_level, category, thumbnail_url, course_type, system_course, guided_learning_enabled, certificate_enabled, created_by, updated_at, primary_disability_focus)
    `)
    .eq('user_id', userId)
    .neq('status', 'dropped')

  if (error) throw error

  const enrollmentsArr = enrollments as unknown as {
    id: string
    status: string
    course_id: string
    courses: { id: string; title: string; description: string; difficulty_level: string; category: string | null; thumbnail_url: string | null; certificate_enabled: boolean; course_type: string; system_course: boolean; guided_learning_enabled: boolean; created_by: string; updated_at: string; primary_disability_focus?: string | null }
  }[]

  const courseIds = enrollmentsArr.map((e) => e.course_id)

  const lessonCounts = new Map<string, number>()
  const lessonDurationMap = new Map<string, number>()
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
      supabase.from('lessons').select('id, course_id, estimated_duration').in('course_id', courseIds).eq('status', 'published').or('visibility_status.eq.visible,visibility_status.is.null'),
      supabase.from('certificates').select('enrollment_id').in('enrollment_id', enrollmentsArr.map(e => e.id)).eq('status', 'issued'),
    ])

    const lessonMap = new Map<string, string[]>()
    for (const l of lessons || []) {
      const arr = lessonMap.get(l.course_id) || []
      arr.push(l.id)
      lessonMap.set(l.course_id, arr)
      lessonDurationMap.set(l.course_id, (lessonDurationMap.get(l.course_id) || 0) + (l.estimated_duration || 0))
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
      .select('lesson_id, enrollment_id, is_completed')
      .in('enrollment_id', enrollmentIds)

    for (const e of enrollmentsArr) {
      // Only count progress on lessons that are still part of the course's
      // current published/visible lesson set — a lesson_progress row can
      // outlive a lesson that was later unpublished/removed, which would
      // otherwise inflate completed_lessons past total_lessons (>100% progress).
      const currentLessonIds = new Set(lessonMap.get(e.course_id) || [])
      const completed = (lp || []).filter(
        (p) => p.enrollment_id === e.id && p.is_completed && currentLessonIds.has(p.lesson_id)
      )
      completedCounts.set(e.course_id, completed.length)
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
      primary_disability_focus: course.primary_disability_focus,
      total_duration: lessonDurationMap.get(e.course_id) || 0,
    }
  })
}

// ─── Available Courses ─────────────────────────────────────────────────

export async function fetchAvailableCourses(): Promise<AvailableCourse[]> {
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, difficulty_level, category, thumbnail_url,
      course_type, system_course, certificate_enabled, created_by, updated_at, primary_disability_focus,
      lessons(estimated_duration)
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
      const lessonsArr = c.lessons as { estimated_duration: number | null }[] | undefined
      
      let lessonCount = 0;
      let totalDuration = 0;
      if (lessonsArr) {
        lessonCount = lessonsArr.length;
        totalDuration = lessonsArr.reduce((sum, l) => sum + (l.estimated_duration || 0), 0);
      }
      
      return {
        id: c.id as string,
        title: c.title as string,
        description: c.description as string,
        difficulty_level: c.difficulty_level as string,
        category: c.category as string | null,
        thumbnail_url: c.thumbnail_url as string | null,
        tags: (tagsArr || []).map((t) => t.tag),
        lesson_count: lessonCount,
        course_type: c.course_type as string || 'educator',
        system_course: c.system_course as boolean || false,
        certificate_enabled: c.certificate_enabled as boolean || false,
        creator_name: creatorMap.get(c.created_by as string) || 'Educator',
        student_count: enrollCountMap.get(c.id as string) || 0,
        updated_at: c.updated_at as string || '',
        primary_disability_focus: c.primary_disability_focus as string | null,
        total_duration: totalDuration,
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
      certificate_enabled, created_by, updated_at, primary_disability_focus, secondary_disability_focuses
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
    // Draft lessons are unfinished work and must never appear to a learner.
    // Every other learner-facing lesson query already filters on this; this
    // one did not, so drafts were listed on the course page.
    .eq('status', 'published')
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
      .eq('is_completed', true)

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
    // estimated_duration is selected above and already feeds the course total,
    // but it was dropped here — so the roadmap rendered "Estimated time: N/A"
    // on every lesson while the header showed a correct combined duration.
    return {
      id: l.id,
      title: l.title,
      sequence_order: l.sequence_order,
      estimated_duration: l.estimated_duration,
      status,
    }
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
    primary_disability_focus: course.primary_disability_focus || null,
    secondary_disability_focuses: course.secondary_disability_focuses || [],
  }
}

// ─── Lesson Content ────────────────────────────────────────────────────

/**
 * Loads a lesson for reading.
 *
 * Draft lessons are excluded by default: listing them was one bug, but a
 * learner who has a draft lesson's id could also open it directly, so the
 * check belongs here too rather than only on the list query. The educator
 * "Preview as Learner" route passes `includeUnpublished` so authors can still
 * review their own drafts.
 */
export async function fetchLessonContent(
  lessonId: string,
  options: { includeUnpublished?: boolean } = {},
): Promise<LessonContent | null> {
  let query = supabase
    .from('lessons')
    .select(`
      id, title, sequence_order, content_html, transcript, video_url, course_id,
      lesson_type, has_video, has_pdf, has_quiz, has_transcript, has_summary_activity,
      summary_source, summary_word_target, summary_key_points, summary_reflection_questions,
      lesson_layout, simplified_summary, focus_mode_enabled, chunked_content_enabled, checkpoints_enabled, estimated_duration, adaptive_learning_enabled, allow_discussions
    `)
    .eq('id', lessonId)

  if (!options.includeUnpublished) {
    query = query.eq('status', 'published')
  }

  const { data: lesson, error } = await query.maybeSingle()

  if (error) {
    return null
  }

  if (!lesson) return null

  // Derive the lesson's display position from its rank within the course's
  // current published/visible lesson list, rather than trusting the raw
  // sequence_order column directly — sequence_order isn't renumbered when
  // earlier lessons are unpublished/removed, so it can exceed the visible
  // lesson count (e.g. "Lesson 6 of 5").
  const { data: siblingLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', lesson.course_id)
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null')
    .order('sequence_order', { ascending: true })

  const total = siblingLessons?.length ?? 0
  const rankIndex = siblingLessons?.findIndex((l) => l.id === lesson.id) ?? -1
  const displayPosition = rankIndex >= 0 ? rankIndex + 1 : Math.min(lesson.sequence_order, total || lesson.sequence_order)

  return {
    id: lesson.id,
    title: lesson.title,
    sequence_order: displayPosition,
    total_lessons: total,
    content_html: lesson.content_html || '',
    transcript: lesson.transcript,
    video_url: lesson.video_url,
    lesson_type: lesson.lesson_type,
    has_video: lesson.has_video ?? true,
    has_pdf: lesson.has_pdf ?? true,
    has_quiz: lesson.has_quiz ?? true,
    has_transcript: lesson.has_transcript ?? true,
    has_summary_activity: lesson.has_summary_activity ?? false,
    allow_discussions: lesson.allow_discussions ?? false,
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
      .update({ is_viewed: true, view_count: (existing.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress').insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      // Opening the lesson IS the "viewed" event. This used to insert
      // is_viewed: false, which left the flag meaning nothing at all — the
      // only code that ever set it true was completeLesson().
      is_viewed: true,
      view_count: 1,
      first_viewed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
  }
}

/**
 * Asks the database to recompute this learner's state for a course.
 *
 * Course completion and achievement awards are DERIVED, not asserted. They
 * used to be written straight from the browser, which meant a learner could
 * assert them: the escalation probe confirmed that
 *   .from('enrollments').update({ status: 'completed' })
 * and a direct insert into `user_achievements` were both accepted through the
 * public anon key. Both writes are now blocked at the database, and the
 * derivation lives in `sync_learner_course_state()` (SECURITY DEFINER), which
 * is the single authoritative implementation of:
 *
 *   course completed   -> every published, visible lesson of the course has a
 *                         completed progress row on this enrollment
 *   achievement earned -> course_achievements criteria evaluated against that
 *                         same data, server-side
 *
 * Completion only ever moves forward, so adding a lesson to a finished course
 * does not revoke a learner's completion or their certificate.
 */
export interface LearnerCourseState {
  enrolled: boolean
  enrollment_id?: string
  status?: string
  lessons_total?: number
  lessons_completed?: number
  progress_pct?: number
  avg_score?: number
  newly_awarded?: Array<{ id: string; name: string }>
}

export async function syncLearnerCourseState(courseId: string): Promise<LearnerCourseState | null> {
  const { data, error } = await supabase.rpc('sync_learner_course_state', { p_course_id: courseId })
  if (error) {
    console.error('sync_learner_course_state failed:', error)
    return null
  }
  return data as unknown as LearnerCourseState
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
    .select('id, is_completed, progress_meta')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const now = new Date().toISOString()

  // `is_completed` is the canonical completion flag — it is what admin and
  // educator analytics read, and what every learner-side percentage, course
  // completion check and certificate eligibility check now reads too. This
  // used to write only `is_viewed`, so lessons a learner genuinely finished
  // were counted as "skipped" on the educator's dashboard.
  //
  // `progress_meta.completed_at` records WHEN, which nothing else in the row
  // does: `last_viewed_at` is overwritten every time the lesson is re-opened,
  // so without this an achievement's earned date would move whenever a
  // learner revisited old material. It is only ever stamped once — re-running
  // completeLesson on an already-completed lesson leaves the original date
  // alone, which is what keeps the milestone dates stable.
  if (existing) {
    const meta = (existing.progress_meta as Record<string, unknown> | null) ?? {}
    await supabase
      .from('lesson_progress')
      .update({
        is_completed: true,
        is_viewed: true,
        summary_completed: true,
        last_viewed_at: now,
        progress_meta: { ...meta, completed_at: (meta.completed_at as string) || now },
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress').insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      is_completed: true,
      is_viewed: true,
      summary_completed: true,
      view_count: 1,
      first_viewed_at: now,
      last_viewed_at: now,
      progress_meta: { completed_at: now },
    })
  }

  // Course completion and achievements are derived server-side from the
  // progress row just written — the client no longer asserts either.
  const state = await syncLearnerCourseState(courseId)

  try {
    const { data: l } = await supabase.from('lessons').select('title').eq('id', lessonId).single()
    if (l) {
      await createNotification({
        user_id: userId,
        type: 'lesson_completed',
        title: 'Lesson Completed',
        body: `You finished "${l.title}".`,
        metadata: { lesson_id: lessonId }
      })
    }
    for (const badge of state?.newly_awarded ?? []) {
      await createNotification({
        user_id: userId,
        type: 'badge_earned',
        title: 'Badge Unlocked!',
        body: `You just earned the "${badge.name}" badge.`,
        metadata: { achievement_id: badge.id, course_id: courseId }
      })
    }
    await checkAndNotifyCertificateEligibility(userId, courseId)
  } catch (err) {
    console.error('Failed to process lesson hooks:', err)
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
  const currentLessonIds = new Set((lessons || []).map((l) => l.id))

  const { data: lp } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed, last_viewed_at, time_spent_learning')
    .eq('enrollment_id', enrollment.id)

  const completedSet = new Set((lp || []).filter(p => p.is_completed && currentLessonIds.has(p.lesson_id)).map(p => p.lesson_id))
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

  // Time spent — real measured seconds from lesson_progress.time_spent_learning.
  // This used to be `viewed_lessons * 10`, a fabricated figure presented to the
  // learner as their own study time while the actual measurement sat unused in
  // the same rows being read here.
  const timeSpentMinutes = Math.round(
    (lp || []).reduce((acc, p) => acc + (p.time_spent_learning ?? 0), 0) / 60
  )

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

  // quiz_options_scoped, not quiz_options: the view returns the same shape but
  // withholds is_correct until the learner has actually submitted an attempt
  // for the quiz. Reading the base table let any learner download the answer
  // key for every quiz on the platform before answering a single question.
  const { data: options, error: oError } = await supabase
    .from('quiz_options_scoped')
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

/**
 * Was the option the learner just chose the correct one?
 *
 * The adaptive-learning hint used to answer this in the browser by reading
 * quiz_options.is_correct. The answer key is no longer served before an
 * attempt (see migration 20260825001200), so the check moved server-side.
 * It validates a choice the learner has already made without revealing which
 * option is correct.
 */
export async function checkQuizAnswer(questionId: string, optionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_quiz_answer', {
    p_question_id: questionId,
    p_option_id: optionId,
  })
  if (error) {
    console.error('check_quiz_answer failed:', error)
    return true // never block progress on a feedback-only check
  }
  return data === true
}

export async function submitQuizAttempt(params: {
  quizId: string
  courseId: string
  answers: { questionId: string; selectedOptionId: string }[]
}): Promise<{ score: number; passed: boolean; attemptId: string }> {
  const userId = await ensureUserId()

  // Grading happens in the database, not here.
  //
  // This function used to read quiz_options.is_correct in the browser, compute
  // score_pct itself and insert the attempt. That made the score a client
  // assertion: a learner could skip the quiz entirely and insert
  // { score_pct: 100, result: 'pass' }. Quiz scores feed achievement criteria
  // and the certificate quiz threshold, so a forged score bought real
  // credentials. submit_quiz_attempt() (SECURITY DEFINER) now verifies
  // enrollment, enforces max_attempts, grades against the stored answer key,
  // and writes both the attempt and its answers; direct client writes to
  // quiz_attempts are rejected by a trigger.
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: params.quizId,
    p_answers: params.answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
    })),
  })

  if (error) throw error

  const result = data as unknown as {
    attempt_id: string
    score_pct: number
    passed: boolean
  }
  const score = result.score_pct
  const passed = result.passed

  // Hook into Notifications & Achievements
  try {
    const { data: q } = await supabase.from('quizzes').select('title').eq('id', params.quizId).single()
    if (q) {
      await createNotification({
        user_id: userId,
        type: 'quiz_completed',
        title: 'Quiz Submitted',
        body: `You scored ${score}% on "${q.title}".`,
        metadata: { quiz_id: params.quizId, score }
      })
      const quizState = await syncLearnerCourseState(params.courseId)
      for (const badge of quizState?.newly_awarded ?? []) {
        await createNotification({
          user_id: userId,
          type: 'badge_earned',
          title: 'Badge Unlocked!',
          body: `You just earned the "${badge.name}" badge.`,
          metadata: { achievement_id: badge.id, course_id: params.courseId }
        })
      }
      await checkAndNotifyCertificateEligibility(userId, params.courseId)
    }
  } catch (err) {
    console.error('Failed to process quiz hooks:', err)
  }

  return { score, passed, attemptId: result.attempt_id }
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
      .select('attempt_number, score_pct, result, started_at')
      .eq('enrollment_id', enrollment.id)
      .eq('quiz_id', quiz.id)
      .order('attempt_number', { ascending: false })
    if (attError) {
      console.error('fetchQuizAttemptHistory error:', attError);
      return { attempts: [], usedAttempts: 0, maxAttempts: quiz.max_attempts }
    }

    return {
      attempts: (attempts || []).map(a => ({
        attempt_number: a.attempt_number,
        score_pct: a.score_pct,
        result: a.result,
        created_at: a.started_at
      })),
      usedAttempts: attempts?.length || 0,
      maxAttempts: quiz.max_attempts,
    }
  } catch {
    return { attempts: [], usedAttempts: 0, maxAttempts: null }
  }
}

// ─── Learner Stats & Gamification ──────────────────────────────────────

/**
 * Everything the Achievements & Certificates surface needs, measured once.
 *
 * This is the single place the learner's counts are taken. `fetchLearnerStats`
 * now delegates to it, so the Dashboard tiles, the level card, achievement
 * progress and the Progress page can no longer drift apart — which they had:
 * `fetchLearnerStats` counted every `is_completed` progress row on the
 * enrollment, including rows left behind by lessons that had since been
 * unpublished, while `sync_learner_course_state()` and the certificate gate
 * counted only published, visible ones. The same learner could therefore read
 * "12 lessons completed" on the Dashboard and 10/11 on a course.
 */
export interface LearnerGamification {
  metrics: LearnerMetrics
  timeline: MetricTimeline
  achievements: ResolvedAchievement[]
  xp: XPBreakdown
  level: LevelInfo
}

/** A calendar day key in a locale-independent ISO form. */
function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export async function fetchLearnerGamification(): Promise<LearnerGamification> {
  const userId = await ensureUserId()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, course_id, status, enrolled_at, completed_at')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  const enrollmentIds = (enrollments || []).map((e) => e.id)
  const courseIds = [...new Set((enrollments || []).map((e) => e.course_id))]

  // Certificates hang off the learner, not off a completed enrollment: one can
  // legitimately exist while the enrollment is still active (an educator
  // issued it, or the course gained a lesson afterwards). Reading them through
  // `enrollments.status = 'completed'` hid real certificates from the learner
  // who held them — confirmed against the live database.
  const certificatesQuery = supabase
    .from('certificates')
    .select('id, issued_at, completion_date, status')
    .eq('user_id', userId)
    .eq('status', 'issued')

  const badgesQuery = supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId)

  if (enrollmentIds.length === 0) {
    const [{ data: certs }, { data: badges }] = await Promise.all([certificatesQuery, badgesQuery])
    return buildGamification({
      enrollments: enrollments || [],
      publishedLessonIds: new Set<string>(),
      progress: [],
      attempts: [],
      certificates: certs || [],
      badges: badges || [],
    })
  }

  const [{ data: lessons }, { data: progress }, { data: attempts }, { data: certs }, { data: badges }] =
    await Promise.all([
      supabase
        .from('lessons')
        .select('id')
        .in('course_id', courseIds)
        .eq('status', 'published')
        .or('visibility_status.eq.visible,visibility_status.is.null'),
      supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed, first_viewed_at, last_viewed_at, progress_meta')
        .in('enrollment_id', enrollmentIds),
      supabase
        .from('quiz_attempts')
        .select('quiz_id, score_pct, result, submitted_at, started_at')
        .in('enrollment_id', enrollmentIds),
      certificatesQuery,
      badgesQuery,
    ])

  return buildGamification({
    enrollments: enrollments || [],
    publishedLessonIds: new Set((lessons || []).map((l) => l.id)),
    progress: progress || [],
    attempts: attempts || [],
    certificates: certs || [],
    badges: badges || [],
  })
}

export interface GamificationSource {
  enrollments: { id: string; course_id: string; status: string; enrolled_at: string | null; completed_at: string | null }[]
  publishedLessonIds: Set<string>
  progress: { lesson_id: string; is_completed: boolean | null; first_viewed_at: string | null; last_viewed_at: string | null; progress_meta: Record<string, unknown> | null }[]
  attempts: { quiz_id: string; score_pct: number; result: string | null; submitted_at: string | null; started_at: string | null }[]
  certificates: { id: string; issued_at: string; completion_date: string | null; status: string }[]
  badges: { achievement_id: string | null; earned_at: string }[]
}

/**
 * Pure derivation, separated from the queries so the audit script can feed it
 * service-role rows and assert the UI would show the same numbers.
 */
export function buildGamification(src: GamificationSource): LearnerGamification {
  const activeDays = new Set<string>()

  // Lessons. Scoped to published+visible so this count matches the course
  // percentage everywhere else. `progress_meta.completed_at` is stamped by
  // completeLesson going forward; rows written before that fall back to
  // first_viewed_at, which — unlike last_viewed_at — is never overwritten, so
  // an achievement's date cannot move because a lesson was re-opened.
  const lessonStamps: string[] = []
  for (const p of src.progress) {
    if (!src.publishedLessonIds.has(p.lesson_id)) continue
    const meta = p.progress_meta as { completed_at?: string } | null
    const stamp = meta?.completed_at || p.first_viewed_at || p.last_viewed_at
    if (p.first_viewed_at) activeDays.add(dayKey(p.first_viewed_at))
    if (p.last_viewed_at) activeDays.add(dayKey(p.last_viewed_at))
    if (p.is_completed && stamp) lessonStamps.push(stamp)
  }
  lessonStamps.sort()

  // Courses. `status` is derived by sync_learner_course_state(), never
  // asserted by the client, so it is safe to count here.
  const courseStamps = src.enrollments
    .filter((e) => e.status === 'completed')
    .map((e) => e.completed_at)
    .filter((d): d is string => !!d)
    .sort()

  const certStamps = src.certificates
    .map((c) => c.completion_date || c.issued_at)
    .filter((d): d is string => !!d)
    .sort()

  // Quizzes are counted per DISTINCT quiz, so retaking one already passed adds
  // neither a count nor XP — the difference between rewarding learning and
  // rewarding repetition.
  const firstPass = new Map<string, string>()
  const firstHigh = new Map<string, string>()
  let scoreSum = 0
  for (const a of src.attempts) {
    const when = a.submitted_at || a.started_at
    if (when) activeDays.add(dayKey(when))
    scoreSum += a.score_pct ?? 0
    if (a.result === 'pass' && when) {
      const existing = firstPass.get(a.quiz_id)
      if (!existing || when < existing) firstPass.set(a.quiz_id, when)
    }
    if ((a.score_pct ?? 0) >= 90 && when) {
      const existing = firstHigh.get(a.quiz_id)
      if (!existing || when < existing) firstHigh.set(a.quiz_id, when)
    }
  }
  const quizStamps = [...firstPass.values()].sort()
  const highStamps = [...firstHigh.values()].sort()

  const badgeStamps = src.badges.map((b) => b.earned_at).filter(Boolean).sort()

  for (const e of src.enrollments) {
    if (e.enrolled_at) activeDays.add(dayKey(e.enrolled_at))
  }
  for (const d of certStamps) activeDays.add(dayKey(d))

  // A learning day is represented by the first moment of that day, so the
  // "Nth learning day" achievement is dated to the day it was reached.
  const dayStamps = [...activeDays].sort().map((d) => `${d}T00:00:00.000Z`)

  const metrics: LearnerMetrics = {
    lessons_completed: lessonStamps.length,
    courses_completed: courseStamps.length,
    certificates_earned: certStamps.length,
    quizzes_passed: quizStamps.length,
    high_scores: highStamps.length,
    active_days: dayStamps.length,
    course_badges: badgeStamps.length,
    avg_quiz_score: src.attempts.length > 0 ? Math.round(scoreSum / src.attempts.length) : 0,
  }

  const timeline: MetricTimeline = {
    lessons_completed: lessonStamps,
    courses_completed: courseStamps,
    certificates_earned: certStamps,
    quizzes_passed: quizStamps,
    high_scores: highStamps,
    active_days: dayStamps,
    course_badges: badgeStamps,
  }

  const achievements = resolveAchievements(metrics, timeline)
  const xp = computeXP(metrics, achievements)

  return { metrics, timeline, achievements, xp, level: getLevelInfo(xp.total) }
}

/**
 * The four headline numbers. Kept as a thin projection of the measurement
 * above so the Dashboard and this page can never report different totals.
 */
export async function fetchLearnerStats(): Promise<LearnerStats> {
  const { metrics } = await fetchLearnerGamification()
  return {
    courses_completed: metrics.courses_completed,
    lessons_completed: metrics.lessons_completed,
    avg_score: metrics.avg_quiz_score,
    certificates_count: metrics.certificates_earned,
  }
}

// ─── Course Progress ───────────────────────────────────────────────────

export async function fetchCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const userId = await ensureUserId()

  const { data: course, error: cError } = await supabase
    .from('courses')
    .select('id, title, description, certificate_enabled, certificate_settings')
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
      .select('lesson_id, is_completed')
      .eq('enrollment_id', enrollment.id)

    for (const p of lp || []) {
      if (p.is_completed) {
        completedSet.add(p.lesson_id)
      }
    }
    completedCount = (lessons || []).filter(l => completedSet.has(l.id)).length

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

  let certificateId: string | undefined = undefined;
  let customCertPdfUrl: string | undefined = undefined;
  if (enrollment) {
    // Get certificate row (system or custom coexist on the single row)
    const { data: certRow } = await supabase
      .from('certificates')
      .select('id, verification_url, pdf_url')
      .eq('enrollment_id', enrollment.id)
      .maybeSingle()

    if (certRow) {
      if (certRow.verification_url?.includes('/verify/')) {
        certificateId = certRow.id;
      }
      if (certRow.pdf_url) {
        customCertPdfUrl = certRow.pdf_url;
      }
    }
  }

  const certSettings = course.certificate_settings as Record<string, unknown> | null;
  const allowCustomCerts = certSettings?.allow_custom_certificates === true;

  // Fetch eligibility details to align CourseProgressDetailPage with CourseDetailPage
  let certEligible = false;
  let certReason = '';
  let quizzesNeedImprovement: any[] = [];
  try {
    const elig = await checkCourseCertificateEligibility(courseId);
    certEligible = elig.eligible;
    certReason = elig.reason || '';
    quizzesNeedImprovement = elig.quizzesNeedImprovement || [];
  } catch (err) {
    console.error('fetchCourseProgress eligibility check error:', err);
  }

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    progress,
    status: enrollment?.status || 'not_enrolled',
    completion_date: enrollment?.completed_at || null,
    lessons: lessonProgressList,
    avg_score: avgScore,
    certificate_id: certificateId,
    certificate_enabled: course.certificate_enabled || false,
    custom_cert_pdf_url: customCertPdfUrl,
    allow_custom_certs: allowCustomCerts,
    cert_eligible: certEligible,
    cert_eligibility_reason: certReason,
    quizzes_need_improvement: quizzesNeedImprovement,
  }
}

// ─── Certificates ──────────────────────────────────────────────────────

/**
 * The learner's certificates, with real course information attached.
 *
 * WHAT WAS WRONG
 *
 * 1. The list was reached through `enrollments.status = 'completed'`. A
 *    certificate whose enrollment was still `active` — because the course
 *    gained a lesson after issuance, or an educator issued it directly — was
 *    invisible to the learner who held it. Confirmed on live data: a learner
 *    holding two issued certificates was shown one.
 * 2. `is_custom_upload` was inferred from `!!pdf_url`. Every certificate
 *    rendered to storage therefore claimed to be an educator's own upload,
 *    routing the learner to a raw PDF link instead of their certificate.
 *    The metadata flag the issuing endpoints actually write was ignored.
 * 3. `completion_date` was returned pre-formatted as `"6 May 2026"` and then
 *    fed back through `new Date(...)` by the PDF generator — a round-trip
 *    that is locale-dependent and produces `Invalid Date` outside en-US.
 * 4. Missing course titles fell back to the literal string `'Unknown Course'`.
 *
 * Certificates now hang off `certificates.user_id` (which RLS scopes to the
 * signed-in learner), and course information is joined live so a certificate
 * can always name its course even if the snapshot column was never filled in.
 */
export async function fetchCertificates(): Promise<Certificate[]> {
  const userId = await ensureUserId()

  const { data: certs, error: certErr } = await supabase
    .from('certificates')
    .select(
      'id, enrollment_id, course_id, reference_code, issued_at, completion_date, status, pdf_url, verification_url, metadata, learner_name, course_title, educator_name, institution_name, skills_earned, course_duration_hours',
    )
    .eq('user_id', userId)
    .eq('status', 'issued')
    .order('issued_at', { ascending: false })

  if (certErr) {
    console.error('fetchCertificates error:', certErr)
    return []
  }
  if (!certs || certs.length === 0) return []

  const courseIds = [...new Set(certs.map((c) => c.course_id).filter(Boolean))] as string[]
  const enrollmentIds = certs.map((c) => c.enrollment_id).filter(Boolean) as string[]

  const [{ data: courses }, { data: enrollments }, { data: attempts }] = await Promise.all([
    courseIds.length
      ? supabase
          .from('courses')
          .select('id, title, description, category, difficulty_level, system_course, created_by')
          .in('id', courseIds)
      : Promise.resolve({ data: [] as CertificateCourseRow[] }),
    enrollmentIds.length
      ? supabase.from('enrollments').select('id, course_id, completed_at').in('id', enrollmentIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string; completed_at: string | null }[] }),
    enrollmentIds.length
      ? supabase.from('quiz_attempts').select('enrollment_id, score_pct').in('enrollment_id', enrollmentIds)
      : Promise.resolve({ data: [] as { enrollment_id: string; score_pct: number }[] }),
  ])

  const courseMap = new Map<string, CertificateCourseRow>(
    ((courses || []) as CertificateCourseRow[]).map((c) => [c.id, c]),
  )
  const enrollmentMap = new Map<string, { id: string; course_id: string; completed_at: string | null }>(
    ((enrollments || []) as { id: string; course_id: string; completed_at: string | null }[]).map((e) => [e.id, e]),
  )

  const bestScores = new Map<string, number>()
  for (const a of attempts || []) {
    const existing = bestScores.get(a.enrollment_id) ?? 0
    if (a.score_pct > existing) bestScores.set(a.enrollment_id, a.score_pct)
  }

  return certs.map((c) => {
    const course = c.course_id ? courseMap.get(c.course_id) : undefined
    const enrollment = c.enrollment_id ? enrollmentMap.get(c.enrollment_id) : undefined
    const metadata = (c.metadata as Record<string, unknown> | null) ?? {}

    return {
      id: c.id,
      course_id: c.course_id ?? undefined,
      // The snapshot is the record of what was awarded; the live course is the
      // fallback so a certificate can always name its course. Only when both
      // are absent — a course deleted outright — does the UI say so plainly.
      course_title: c.course_title || course?.title || 'Course no longer available',
      course_category: course?.category ?? undefined,
      course_description: course?.description ?? undefined,
      completion_date: c.completion_date || enrollment?.completed_at || c.issued_at,
      issued_at: c.issued_at,
      certificate_code: c.reference_code,
      status: c.status,
      score: bestScores.get(c.enrollment_id) ?? 0,
      pdf_url: c.pdf_url ?? undefined,
      verification_url: c.verification_url ?? undefined,
      is_system_course: course?.system_course === true || metadata.is_custom !== true,
      // The issuing endpoints record what kind of certificate this is. Only a
      // certificate explicitly marked custom, or one carrying a stored PDF it
      // did not generate itself, is an educator upload.
      is_custom_upload: metadata.is_custom === true,
      educator_name: c.educator_name ?? undefined,
      institution_name: c.institution_name ?? undefined,
      skills_earned: c.skills_earned ?? undefined,
      course_duration_hours: c.course_duration_hours ? Number(c.course_duration_hours) : undefined,
      learner_name: c.learner_name ?? undefined,
    }
  })
}

interface CertificateCourseRow {
  id: string
  title: string
  description: string | null
  category: string | null
  difficulty_level: string | null
  system_course: boolean | null
  created_by: string | null
}

// ─── Lesson Summaries ─────────────────────────────────────────────────

export async function fetchLessonSummary(lessonId: string, courseId: string): Promise<StudentLessonSummary | null> {
  const userId = await ensureUserId()
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()
  if (!enrollment) return null

  const { data } = await supabase
    .from('learner_checkpoints')
    .select('*')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .is('checkpoint_id', null)
    .maybeSingle()
    
  if (!data || !data.response_data) return null
  
  const rd = data.response_data as any
  return {
    id: data.id,
    lesson_id: lessonId,
    content: rd.content || '',
    word_count: rd.word_count || 0,
    status: rd.status || 'draft',
    ai_feedback: rd.ai_feedback,
    educator_feedback: rd.educator_feedback,
    submitted_at: data.completed_at,
    created_at: data.created_at,
    updated_at: data.created_at
  }
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
    .from('learner_checkpoints')
    .select('id, response_data')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .is('checkpoint_id', null)
    .maybeSingle()

  const newData = {
    content,
    word_count: wordCount,
    status: 'draft'
  }

  if (existing.data) {
    const prev = existing.data.response_data as any || {}
    await supabase
      .from('learner_checkpoints')
      .update({ response_data: { ...prev, ...newData } })
      .eq('id', existing.data.id)
  } else {
    await supabase
      .from('learner_checkpoints')
      .insert({ 
        enrollment_id: enrollment.id, 
        lesson_id: lessonId, 
        completed: false, 
        response_data: newData 
      })
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
    .from('learner_checkpoints')
    .select('id, response_data')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .is('checkpoint_id', null)
    .maybeSingle()

  const newData = {
    content,
    word_count: wordCount,
    status: 'submitted'
  }

  if (existing.data) {
    const prev = existing.data.response_data as any || {}
    await supabase
      .from('learner_checkpoints')
      .update({ 
        completed: true,
        completed_at: new Date().toISOString(),
        response_data: { ...prev, ...newData } 
      })
      .eq('id', existing.data.id)
  } else {
    await supabase
      .from('learner_checkpoints')
      .insert({ 
        enrollment_id: enrollment.id, 
        lesson_id: lessonId, 
        completed: true,
        completed_at: new Date().toISOString(),
        response_data: newData 
      })
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
    .from('user_profiles')
    .select('accessibility_prefs')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data?.accessibility_prefs) return null
  const prefs = data.accessibility_prefs as any
  return {
    preferred_font_size: prefs.preferred_font_size,
    preferred_theme: prefs.preferred_theme,
    line_spacing: prefs.line_spacing,
    tts_enabled: prefs.tts_enabled,
  }
}

export async function saveLearnerSettings(settings: LearnerSettings): Promise<void> {
  const userId = await ensureUserId()
  const { data: profile } = await supabase.from('user_profiles').select('accessibility_prefs').eq('user_id', userId).maybeSingle()
  const currentPrefs = typeof profile?.accessibility_prefs === 'object' && profile.accessibility_prefs !== null ? profile.accessibility_prefs : {}
  const mergedPrefs = { ...currentPrefs, ...settings }

  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: userId, accessibility_prefs: mergedPrefs },
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
  /** @deprecated No longer used — kept for backward compat with existing data */
  screen_reader_optimized?: boolean | null
  keyboard_navigation_enabled?: boolean | null
  simplified_ui?: boolean | null
  dyslexia_friendly_font?: boolean | null
  preferred_font?: string | null
  preferred_language?: string | null
  preferred_reading_level?: string | null
  preferred_content_format?: string | null
  tts_rate?: number | null
  tts_voice_uri?: string | null
  // ─── Accessibility Presets (new granular fields) ──────────────
  active_preset?: string | null
  /** Which preset this configuration is still "based on" even after manual
   * tweaks reset active_preset to 'custom' — lets preset-specific behavior
   * (color palette, forced focus/chunking, etc.) survive a single tweak
   * instead of silently disappearing. Set once when a preset is applied,
   * left untouched by later individual setting changes. */
  base_preset?: string | null
  font_family?: string | null
  font_size_px?: number | null
  line_spacing_multiplier?: number | null
  word_spacing_pct?: number | null
  background_tint?: string | null
  reading_spotlight?: boolean | null
  distraction_free_mode?: boolean | null
  chunked_content_mode?: boolean | null
  layout_mode?: 'scroll' | 'slide' | 'chunked' | null
  structure_mode?: 'full' | 'minimal' | 'checklist' | null
  animation_level?: string | null
  high_contrast?: boolean | null
  low_contrast?: boolean | null
  muted_colors?: boolean | null
  // ─── Executive Function Supports ─────────────────────────────
  task_checklist_enabled?: boolean | null
  visual_schedule_enabled?: boolean | null
  step_by_step_enabled?: boolean | null
  auto_save_enabled?: boolean | null
  progress_timeline_enabled?: boolean | null
  ai_assistant_enabled?: boolean | null
}

export interface NotificationSettingsData {
  in_app_notifications?: boolean | null
  email_notifications?: boolean | null
  push_notifications?: boolean | null
  course_updates?: boolean | null
  certificate_notifications?: boolean | null
  achievement_notifications?: boolean | null
  feedback_notifications?: boolean | null
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

  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role').eq('id', userId).single(),
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (userResult.error) throw userResult.error

  const p = profileResult.data
  const a = p?.accessibility_prefs as any
  const n = p?.notification_prefs as any

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
      disability_type: p?.disability_type || a.disability_type || (a.base_preset && a.base_preset !== 'none' && a.base_preset !== 'custom' ? a.base_preset : (a.active_preset && a.active_preset !== 'none' && a.active_preset !== 'custom' ? a.active_preset : null)),
      custom_notes: a.custom_notes ?? null,
      preferred_font_size: a.preferred_font_size,
      preferred_theme: a.preferred_theme,
      line_spacing: a.line_spacing,
      tts_enabled: a.tts_enabled,
      captions_enabled: a.captions_enabled,
      screen_reader_optimized: a.screen_reader_optimized,
      keyboard_navigation_enabled: a.keyboard_navigation_enabled,
      simplified_ui: a.simplified_ui,
      dyslexia_friendly_font: a.dyslexia_friendly_font,
      preferred_font: a.preferred_font,
      preferred_language: a.preferred_language,
      preferred_reading_level: a.preferred_reading_level,
      preferred_content_format: a.preferred_content_format,
      tts_rate: a.tts_rate ?? 1,
      tts_voice_uri: a.tts_voice_uri ?? null,
      // Accessibility Presets fields
      active_preset: a.active_preset ?? 'none',
      base_preset: a.base_preset ?? a.active_preset ?? 'none',
      font_family: a.font_family ?? 'arial',
      font_size_px: a.font_size_px ?? 16,
      line_spacing_multiplier: a.line_spacing_multiplier ?? 1.5,
      word_spacing_pct: a.word_spacing_pct ?? 0,
      background_tint: a.background_tint ?? 'white',
      reading_spotlight: a.reading_spotlight ?? false,
      distraction_free_mode: a.distraction_free_mode ?? false,
      chunked_content_mode: a.chunked_content_mode ?? false,
      layout_mode: a.layout_mode ?? 'slide',
      structure_mode: a.structure_mode ?? 'full',
      animation_level: a.animation_level ?? 'normal',
      high_contrast: a.high_contrast ?? false,
      low_contrast: a.low_contrast ?? false,
      muted_colors: a.muted_colors ?? false,
      task_checklist_enabled: a.task_checklist_enabled ?? false,
      visual_schedule_enabled: a.visual_schedule_enabled ?? false,
      step_by_step_enabled: a.step_by_step_enabled ?? false,
      auto_save_enabled: a.auto_save_enabled ?? false,
      progress_timeline_enabled: a.progress_timeline_enabled ?? false,
    } : null,
    notifications: n ? {
      in_app_notifications: n.in_app_notifications ?? true,
      email_notifications: n.email_notifications ?? true,
      push_notifications: n.push_notifications ?? true,
      course_updates: n.course_updates ?? true,
      certificate_notifications: n.certificate_notifications ?? true,
      achievement_notifications: n.achievement_notifications ?? true,
      feedback_notifications: n.feedback_notifications ?? true,
      marketing_notifications: n.marketing_notifications ?? false,
    } : null,
  }
}

export async function saveUserProfile(data: UserProfileData, fullName?: string): Promise<void> {
  const userId = await ensureUserId()
  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: userId, ...data },
    { onConflict: 'user_id' }
  )
  if (error) throw error

  if (fullName && fullName.trim()) {
    const { error: userError } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', userId)

    if (userError) {
      console.warn('Could not update users.full_name:', userError)
    }

    try {
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    } catch {
      // ignore
    }
  }
}

export async function saveAccessibilitySettings(data: AccessibilitySettingsData): Promise<void> {
  const userId = await ensureUserId()
  const { data: profile } = await supabase.from('user_profiles').select('disability_type, accessibility_prefs').eq('user_id', userId).maybeSingle()
  const currentPrefs = typeof profile?.accessibility_prefs === 'object' && profile.accessibility_prefs !== null ? profile.accessibility_prefs : {}
  const mergedPrefs = { ...currentPrefs, ...data }

  const payload: { user_id: string; accessibility_prefs: any; disability_type?: string | null } = {
    user_id: userId,
    accessibility_prefs: mergedPrefs,
  }

  if (data.disability_type !== undefined) {
    payload.disability_type = data.disability_type === 'none' ? null : data.disability_type
  } else if (data.active_preset !== undefined && data.active_preset !== 'custom') {
    payload.disability_type = data.active_preset === 'none' ? null : (data.active_preset === 'asd' ? 'autism' : data.active_preset)
  }

  const { error } = await supabase.from('user_profiles').upsert(
    payload,
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function saveNotificationSettings(data: NotificationSettingsData): Promise<void> {
  const userId = await ensureUserId()
  const { data: profile } = await supabase.from('user_profiles').select('notification_prefs').eq('user_id', userId).maybeSingle()
  const currentPrefs = typeof profile?.notification_prefs === 'object' && profile.notification_prefs !== null ? profile.notification_prefs : {}
  const mergedPrefs = { ...currentPrefs, ...data }

  const { error } = await supabase.from('user_profiles').upsert(
    { user_id: userId, notification_prefs: mergedPrefs },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

// ─── Enrollment ────────────────────────────────────────────────────────

export async function enrollInCourse(courseId: string): Promise<{ enrollmentId: string }> {
  const userId = await ensureUserId()

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'dropped') {
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ status: 'active' })
        .eq('id', existing.id)
      if (updateError) throw updateError
    }
    return { enrollmentId: existing.id }
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({ user_id: userId, course_id: courseId, status: 'active' })
    .select('id')
    .single()

  if (error) throw error

  // Hook into Notifications & Achievements
  try {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single()
    if (course) {
      await createNotification({
        user_id: userId,
        type: 'enrollment',
        title: 'Welcome to the Course!',
        body: `You successfully enrolled in "${course.title}".`,
        metadata: { course_id: courseId }
      })
      await syncLearnerCourseState(courseId)
    }
  } catch (err) {
    console.error('Failed to process enrollment hooks:', err)
  }

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

/**
 * Ordered lesson ids, used to drive next/previous navigation. Drafts are
 * excluded for learners — otherwise "Next lesson" could step straight into
 * unpublished work — but kept for the educator preview route.
 */
export async function fetchLessonIdsInCourse(
  courseId: string,
  options: { includeUnpublished?: boolean } = {},
): Promise<string[]> {
  let query = supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .or('visibility_status.eq.visible,visibility_status.is.null')

  if (!options.includeUnpublished) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query.order('sequence_order', { ascending: true })

  if (error) throw error
  return (data || []).map((l) => l.id)
}

// ─── Enhanced Certificate API ──────────────────────────────────────────

export interface FullCertificate {
  id: string
  learner_name: string
  course_id: string | null
  course_title: string
  course_category: string | null
  course_description: string | null
  course_difficulty: string | null
  educator_name: string
  institution_name: string
  /** ISO timestamp of when the course was finished. */
  completion_date: string
  /** ISO timestamp of when this certificate was issued. */
  issued_at: string
  reference_code: string
  verification_url: string
  skills_earned: string[]
  /** Real hours, derived from the course's lessons when not set explicitly. */
  course_duration_hours: number
  /** Published, visible lessons in the course at the time of reading. */
  lesson_count: number
  status: string
  revoked_at: string | null
  revoke_reason: string | null
  /** An educator's own uploaded PDF, when this certificate is one. */
  pdf_url: string | null
  is_custom_upload: boolean
  is_system_course: boolean
  educator_role: string
  template_id: string
  enrollment_id: string
  metadata?: Record<string, any>
}

/**
 * One certificate, with every field the learner sees resolved from real data.
 *
 * WHAT WAS WRONG
 *
 * This read only the snapshot columns on `certificates` and, when one was
 * empty, substituted the literal strings `'Course'`, `'Learner'` and
 * `'Educator'`. Those are not fallbacks, they are placeholders presented as
 * fact — a learner opening such a certificate was told they had completed a
 * course called "Course". The learner-side claim endpoint made this reachable
 * because its UPDATE branch (taken whenever a certificate row already existed
 * for the enrollment) never wrote the snapshot at all.
 *
 * STALE SNAPSHOT vs LIVE RELATIONSHIP
 *
 * Both, deliberately, in that order. The snapshot is what was awarded and must
 * win — renaming a course should not silently rewrite certificates already
 * issued against its old name, and a learner who has since changed their
 * display name still holds a certificate in the name it was awarded in. But
 * where a snapshot column is empty there is nothing to preserve, so the live
 * row is read instead of inventing a placeholder. Fields that are not part of
 * the award at all (category, description, lesson count) are always live.
 *
 * Access is enforced by RLS on `certificates` — a learner can only select rows
 * where `user_id` is their own, or where they are the course's educator, or
 * they are an admin. The checks below decide what to *show*, not what may be
 * read; substituting another learner's certificate id returns no row at all.
 */
export async function fetchCertificateDetail(certId: string): Promise<FullCertificate | null> {
  const userId = await ensureUserId()
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certId)
    .maybeSingle()

  if (error || !data) return null

  const [{ data: enrollment }, { data: learner }] = await Promise.all([
    supabase.from('enrollments').select('user_id, course_id, completed_at').eq('id', data.enrollment_id).maybeSingle(),
    supabase.from('users').select('full_name').eq('id', data.user_id ?? userId).maybeSingle(),
  ])

  const courseId = data.course_id || enrollment?.course_id || null

  const [{ data: course }, { count: lessonCount }] = await Promise.all([
    courseId
      ? supabase
          .from('courses')
          .select('id, title, description, category, difficulty_level, system_course, created_by, certificate_settings')
          .eq('id', courseId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    courseId
      ? supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('status', 'published')
          .or('visibility_status.eq.visible,visibility_status.is.null')
      : Promise.resolve({ count: 0 }),
  ])

  const isOwner = (data.user_id ?? enrollment?.user_id) === userId
  const isEducator = !!course?.created_by && course.created_by === userId
  if (!isOwner && !isEducator) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', userId).maybeSingle()
    if (!userData || userData.role !== 'admin') return null
  }

  let educatorName = data.educator_name as string | null
  if (!educatorName && course?.created_by) {
    const { data: educator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', course.created_by)
      .maybeSingle()
    educatorName = educator?.full_name ?? null
  }

  const settings = (course?.certificate_settings as Record<string, unknown> | null) ?? {}
  const metadata = (data.metadata as Record<string, unknown> | null) ?? {}

  // Duration: the educator's own figure if they set one, otherwise the real
  // sum of the course's published lesson durations. It used to be whatever
  // `certificate_settings.course_duration_hours` said, which is `0` for every
  // course on the platform that has not filled that panel in — and a
  // certificate reading "Course Duration: 0 hours" is worse than one that
  // omits the line, so an unresolvable duration stays 0 and is not rendered.
  let durationHours = Number(data.course_duration_hours ?? 0)
  if (!durationHours) durationHours = Number(settings.course_duration_hours ?? 0)
  if (!durationHours && courseId) durationHours = await courseDurationHours(courseId)

  return {
    id: data.id,
    learner_name: (data.learner_name as string) || learner?.full_name || 'Learner',
    course_id: courseId,
    course_title: (data.course_title as string) || course?.title || 'Course no longer available',
    course_category: course?.category ?? null,
    course_description: course?.description ?? null,
    course_difficulty: course?.difficulty_level ?? null,
    educator_name: educatorName || '',
    institution_name: (data.institution_name as string) || (settings.institution_name as string) || 'ACESS Platform',
    completion_date: data.completion_date || enrollment?.completed_at || data.issued_at,
    issued_at: data.issued_at,
    reference_code: data.reference_code,
    verification_url: data.verification_url || '',
    skills_earned: (data.skills_earned as string[]) || [],
    course_duration_hours: durationHours,
    lesson_count: lessonCount ?? 0,
    status: data.status,
    revoked_at: data.revoked_at ?? null,
    revoke_reason: data.revoke_reason ?? null,
    pdf_url: data.pdf_url ?? null,
    is_custom_upload: metadata.is_custom === true,
    is_system_course: course?.system_course ?? false,
    educator_role: (metadata.educator_role as string) || (settings.educator_role as string) || 'Course Educator',
    template_id: data.template_id || 'default',
    enrollment_id: data.enrollment_id,
    metadata: (data.metadata as Record<string, any>) || undefined,
  }
}

/**
 * Real study hours for a course, summed from its published, visible lessons.
 *
 * `lessons.estimated_duration` is in minutes and is populated for every lesson
 * on the platform, so this is a measured figure rather than the 0 that
 * `certificate_settings` supplies by default. Rounded to one decimal because
 * a 97-minute course is 1.6 hours, not 2.
 */
export async function courseDurationHours(courseId: string): Promise<number> {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('estimated_duration')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null')

  const minutes = (lessons || []).reduce((sum, l) => sum + (Number(l.estimated_duration) || 0), 0)
  return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : 0
}

/**
 * The URL a certificate's code should be verified at.
 *
 * Stored `verification_url` values are not trustworthy for display: seeded and
 * historically-claimed rows point at the Supabase project host
 * (`<ref>.supabase.co/verify/...`) or at `http://localhost:3000`, because the
 * issuing endpoints build the URL from the request's `Origin` header. Neither
 * resolves for anyone the learner shares the certificate with. When the stored
 * value does not point at the app the page is being served from, the code —
 * which is the durable part — is re-pointed at the current origin.
 */
export function certificateVerificationUrl(cert: { verification_url?: string | null; certificate_code?: string; reference_code?: string }): string {
  const code = cert.reference_code || cert.certificate_code || ''
  if (typeof window === 'undefined') return cert.verification_url || ''
  const origin = window.location.origin
  const stored = cert.verification_url || ''
  if (stored.startsWith(origin)) return stored
  return code ? `${origin}/verify/${code}` : stored
}

export async function checkCourseCertificateEligibility(courseId: string): Promise<{
  eligible: boolean
  reason?: string
  completed?: number
  total?: number
  alreadyIssued?: boolean
  certificateId?: string
  customCertPdfUrl?: string | null
  customCertStatus?: 'published' | 'pending' | null
  quizzesNeedImprovement?: { quizId: string; quizTitle: string; lessonId: string; lessonTitle: string }[]
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

  // Check existing certificate row (system or custom)
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, status, verification_url, pdf_url, metadata')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle()

  const certSettings = course?.certificate_settings as Record<string, unknown> | null
  const allowCustom = certSettings?.allow_custom_certificates === true

  const customCertInfo = (existing && existing.pdf_url) ? {
    customCertPdfUrl: existing.pdf_url || null,
    customCertStatus: 'published' as const,
  } : {
    customCertPdfUrl: null as string | null,
    customCertStatus: (allowCustom ? 'pending' : null) as 'published' | 'pending' | null,
  }

  const isSystemIssued = existing && existing.status === 'issued' && existing.verification_url?.includes('/verify/');

  if (isSystemIssued) {
    return { eligible: true, reason: 'Certificate already issued', alreadyIssued: true, certificateId: existing.id, ...customCertInfo }
  }

  // Count lessons. The two counts must be taken over the SAME lesson set:
  // previously `totalLessons` was scoped to published+visible lessons while
  // `completedLessons` counted every progress row on the enrollment, so a row
  // left behind by an unpublished or removed lesson could push the learner to
  // completedLessons >= totalLessons and issue a certificate for a course they
  // had not actually finished. It also counted `is_viewed` (merely opened)
  // rather than `is_completed`.
  const { data: publishedLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null')

  if (publishedLessons === null) {
    return { eligible: false, reason: 'Error counting lessons', ...customCertInfo }
  }

  const totalLessons = publishedLessons.length
  const publishedLessonIds = publishedLessons.map((l) => l.id)

  let completedLessons = 0
  if (publishedLessonIds.length > 0) {
    const { count, error: countError } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollment.id)
      .eq('is_completed', true)
      .in('lesson_id', publishedLessonIds)

    if (countError || count === null) {
      return { eligible: false, reason: 'Error counting lessons', ...customCertInfo }
    }
    completedLessons = count
  }

  if (completedLessons < totalLessons) {
    return {
      eligible: false,
      reason: `Complete all lessons (${completedLessons}/${totalLessons})`,
      completed: completedLessons,
      total: totalLessons,
      ...customCertInfo,
    }
  }

  // Check quiz thresholds
  const settings = course.certificate_settings as Record<string, unknown> | null
  const quizThreshold = (settings?.completion_rules as Record<string, unknown>)?.quiz_threshold_pct as number || 80

  const { data: lessonsQuery } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .not('has_quiz', 'eq', false)
    .or('visibility_status.eq.visible,visibility_status.is.null')

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      id, title, lesson_id,
      lessons:lesson_id (title)
    `)
    .in('lesson_id', lessonsQuery?.map(l => l.id) || [])

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

    const quizzesNeedImprovement = quizzes
      .filter(q => !passedQuizIds.has(q.id))
      .map(q => ({
        quizId: q.id,
        quizTitle: q.title,
        lessonId: q.lesson_id,
        lessonTitle: (q.lessons as any)?.title || 'Unknown Lesson',
      }))

    if (passRate < quizThreshold) {
      return {
        eligible: false,
        reason: `Quiz pass rate ${passRate}% below threshold ${quizThreshold}%`,
        completed: completedLessons,
        total: totalLessons,
        quizzesNeedImprovement,
        ...customCertInfo,
      }
    }
  }

  return { eligible: true, completed: completedLessons, total: totalLessons, quizzesNeedImprovement: [], ...customCertInfo }
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

  // Check eligibility client-side first
  const eligibility = await checkCourseCertificateEligibility(courseId)
  if (!eligibility.eligible) {
    console.warn('claimCertificate: eligibility check failed', eligibility.reason, eligibility)
    throw new Error(eligibility.reason || 'Not eligible for certificate')
  }

  const response = await fetch('/api/certificates/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to claim certificate')
  }

  return response.json()
}

export async function checkAndNotifyCertificateEligibility(userId: string, courseId: string): Promise<void> {
  try {
    const { data: course } = await supabase
      .from('courses')
      .select('title, created_by, certificate_enabled, system_course')
      .eq('id', courseId)
      .single()

    if (!course || !course.certificate_enabled || course.system_course) return

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .neq('status', 'dropped')
      .maybeSingle()

    if (!enrollment) return

    const eligibility = await checkCourseCertificateEligibility(courseId)
    if (!eligibility.eligible || eligibility.alreadyIssued) return

    const { data: learner } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    const learnerName = learner?.full_name || 'A student'

    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', course.created_by)
      .eq('type', 'course_update')
      .eq('title', 'Action Required: Certificate Awaiting Issuance')
      .maybeSingle()

    if (!existingNotif) {
      await createNotification({
        user_id: course.created_by,
        type: 'course_update' as any,
        title: 'Action Required: Certificate Awaiting Issuance',
        body: `${learnerName} has completed "${course.title}" and is eligible for a Unique Certificate.`,
        metadata: { enrollment_id: enrollment.id, course_id: courseId, learner_name: learnerName }
      })
    }
  } catch (err) {
    console.error('Failed to run checkAndNotifyCertificateEligibility:', err)
  }
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

// ─── Lesson Progress Meta (intermediate tracking) ──────────────────────

export interface LessonProgressMeta {
  video: boolean
  scroll: boolean
  activity: boolean
  quiz: boolean
  guided_step_index?: number
  last_completed_step_index?: number
}

export async function fetchLessonProgressMeta(lessonId: string, courseId: string): Promise<LessonProgressMeta | null> {
  const userId = await ensureUserId()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .neq('status', 'dropped')
    .maybeSingle()

  if (!enrollment) return null

  const { data } = await supabase
    .from('lesson_progress')
    .select('progress_meta')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!data?.progress_meta) return null
  console.log('[lesson-progress] loaded progress_meta for lesson', lessonId, data.progress_meta)
  return data.progress_meta as unknown as LessonProgressMeta
}

export async function saveLessonProgressMeta(
  lessonId: string,
  courseId: string,
  meta: LessonProgressMeta
): Promise<void> {
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
      .update({ progress_meta: meta as unknown as Record<string, unknown>, last_viewed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('lesson_progress').insert({
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      // Saving resume state only happens while the learner is inside the
      // lesson, so it has necessarily been viewed.
      is_viewed: true,
      view_count: 1,
      progress_meta: meta as unknown as Record<string, unknown>,
      first_viewed_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
  }
}

