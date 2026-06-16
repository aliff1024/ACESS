import { supabase } from './supabase'

export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'archived'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CourseFields {
  title: string
  description: string
  status: CourseStatus
  difficulty_level: DifficultyLevel
  category?: string
  thumbnail_url?: string
}

export interface LessonFields {
  course_id: string
  title: string
  content_html: string
  video_url?: string
  transcript?: string
  sequence_order: number
  status: 'draft' | 'published'
  lesson_type?: 'standard' | 'video' | 'quiz' | 'practice' | 'reading' | 'assessment'
  estimated_duration?: number
  learning_objectives?: string
  accessibility_notes?: string
  has_video?: boolean
  has_pdf?: boolean
  has_quiz?: boolean
  has_transcript?: boolean
  has_summary_activity?: boolean
  summary_source?: 'video' | 'pdf' | 'lesson_text' | 'entire_lesson'
  summary_word_target?: number
  summary_key_points?: string[]
  summary_reflection_questions?: string[]
  summary_ai_feedback_enabled?: boolean
  lesson_layout?: 'standard' | 'focus' | 'two_column' | 'wide' | 'slideshow'
  simplified_summary?: string
  focus_mode_enabled?: boolean
  chunked_content_enabled?: boolean
  checkpoints_enabled?: boolean
  adaptive_learning_enabled?: boolean
}

export interface QuizFields {
  lesson_id: string
  title: string
  time_limit_seconds?: number
  max_attempts?: number
  pass_threshold_pct?: number
}

export interface QuestionFields {
  question_text: string
  question_type: 'multiple_choice' | 'scenario'
  sequence_order: number
  image_url?: string | null
  options: { option_text: string; is_correct: boolean; sequence_order: number; image_url?: string | null }[]
}

export interface CourseSummary {
  id: string
  title: string
  description: string
  status: CourseStatus
  difficulty_level: DifficultyLevel
  category: string | null
  thumbnail_url: string | null
  lastUpdated: string
  lessons: number
  students: number
}

export interface ActivityItem {
  type: 'completion' | 'enrollment'
  student: string
  course: string
  time: string
}

export interface AtRiskStudent {
  name: string
  course: string
  progress: number
  lastActive: string
}

export interface StudentProgress {
  id: string
  name: string
  email: string
  courses: { title: string; progress: number; avgScore: number; status: string }[]
  lastActive: string
  totalProgress: number
}

export interface CourseAnalyticsItem {
  title: string
  status: CourseStatus
  enrolled: number
  completed: number
  avgCompletion: number
}

export interface AggStats {
  totalEnrollments: number
  completions: number
  avgCompletion: number
}

// ─── Courses ───────────────────────────────────────────────────────────

export async function fetchCourses(educatorId: string): Promise<CourseSummary[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, status, difficulty_level, category,
      thumbnail_url, updated_at
    `)
    .eq('created_by', educatorId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const courseIds = (data || []).map((c) => c.id)
  let lessonCounts = new Map<string, number>()
  let enrollmentCounts = new Map<string, number>()

  if (courseIds.length > 0) {
    const [{ data: lessons }, { data: enrollments }] = await Promise.all([
      supabase.from('lessons').select('course_id').in('course_id', courseIds),
      supabase.from('enrollments').select('course_id').in('course_id', courseIds),
    ])

    lessonCounts = countBy(lessons || [], 'course_id')
    enrollmentCounts = countBy(enrollments || [], 'course_id')
  }

  return (data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    title: c.title as string,
    description: c.description as string,
    status: c.status as CourseStatus,
    difficulty_level: c.difficulty_level as DifficultyLevel,
    category: (c.category as string) ?? null,
    thumbnail_url: (c.thumbnail_url as string) ?? null,
    lastUpdated: c.updated_at as string,
    lessons: lessonCounts.get(c.id as string) ?? 0,
    students: enrollmentCounts.get(c.id as string) ?? 0,
  }))
}

function countBy(arr: { course_id: string }[], key: 'course_id'): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of arr) {
    map.set(item[key], (map.get(item[key]) ?? 0) + 1)
  }
  return map
}

export async function fetchCourseById(courseId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, status, difficulty_level, category,
      thumbnail_url, created_at, updated_at, certificate_enabled,
      certificate_settings, certification_locked
    `)
    .eq('id', courseId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data
}

export async function createCourse(educatorId: string, fields: CourseFields) {
  const slug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('courses')
    .insert({
      created_by: educatorId,
      title: fields.title,
      slug,
      description: fields.description,
      status: fields.status,
      difficulty_level: fields.difficulty_level,
      category: fields.category || null,
      thumbnail_url: fields.thumbnail_url || null,
      course_type: 'educator',
      created_by_role: 'educator',
      managed_by_admin: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCourse(courseId: string, fields: Partial<CourseFields>) {
  await guardSystemCourse(courseId)
  const { data, error } = await supabase
    .from('courses')
    .update(fields)
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCourse(courseId: string) {
  await guardSystemCourse(courseId)
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId)

  if (error) throw error
}

/** Prevent educators from modifying system courses */
async function guardSystemCourse(courseId: string) {
  const { data: course } = await supabase
    .from('courses')
    .select('course_type')
    .eq('id', courseId)
    .single()

  if (course?.course_type === 'system') {
    throw new Error('System courses cannot be modified by educators')
  }
}

// ─── Lessons ───────────────────────────────────────────────────────────

export async function fetchLessons(courseId: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id, title, content_html, video_url, transcript, sequence_order, status,
      lesson_type, estimated_duration, learning_objectives, accessibility_notes,
      has_video, has_pdf, has_quiz, has_transcript, has_summary_activity,
      summary_source, summary_word_target, summary_key_points, summary_reflection_questions,
      summary_ai_feedback_enabled, lesson_layout,
      simplified_summary, focus_mode_enabled, chunked_content_enabled,
      checkpoints_enabled,
      created_at, updated_at
    `)
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLesson(educatorId: string, fields: LessonFields) {
  const insertFields: Record<string, unknown> = {
    course_id: fields.course_id,
    title: fields.title,
    content_html: fields.content_html,
    video_url: fields.video_url || null,
    transcript: fields.transcript || null,
    sequence_order: fields.sequence_order,
    status: fields.status,
  }

  const optionalFields = [
    'lesson_type', 'estimated_duration', 'learning_objectives', 'accessibility_notes',
    'has_video', 'has_pdf', 'has_quiz', 'has_transcript', 'has_summary_activity',
    'summary_source', 'summary_word_target',
    'summary_ai_feedback_enabled', 'lesson_layout',
    'simplified_summary', 'focus_mode_enabled', 'chunked_content_enabled',
    'checkpoints_enabled', 'adaptive_learning_enabled',
  ] as const

  for (const key of optionalFields) {
    const val = (fields as unknown as Record<string, unknown>)[key]
    if (val !== undefined) insertFields[key] = val
  }

  if (fields.summary_key_points) insertFields.summary_key_points = JSON.stringify(fields.summary_key_points)
  if (fields.summary_reflection_questions) insertFields.summary_reflection_questions = JSON.stringify(fields.summary_reflection_questions)

  const { data, error } = await supabase
    .from('lessons')
    .insert(insertFields)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Quizzes ───────────────────────────────────────────────────────────

export async function createFullQuiz(quiz: QuizFields, questions: QuestionFields[]) {
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      lesson_id: quiz.lesson_id,
      title: quiz.title,
      time_limit_seconds: quiz.time_limit_seconds ?? 0,
      max_attempts: quiz.max_attempts ?? 0,
      pass_threshold_pct: quiz.pass_threshold_pct ?? 60,
    })
    .select()
    .single()

  if (quizError) {
    console.error('[createFullQuiz] quiz insert error:', JSON.stringify(quizError, Object.getOwnPropertyNames(quizError)))
    throw new Error(`Quiz insert failed: ${quizError.message || 'unknown'}`)
  }

  for (const q of questions) {
    const { data: questionData, error: questionError } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        sequence_order: q.sequence_order,
        image_url: q.image_url || null,
      })
      .select()
      .single()

    if (questionError) {
      console.error('[createFullQuiz] question insert error:', JSON.stringify(questionError, Object.getOwnPropertyNames(questionError)))
      throw new Error(`Question insert failed: ${questionError.message || 'unknown'}`)
    }

    if (q.options.length > 0) {
      const optionsWithQuestionId = q.options.map((opt) => ({
        question_id: questionData.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        sequence_order: opt.sequence_order,
        image_url: opt.image_url || null,
      }))

      const { error: optionsError } = await supabase
        .from('quiz_options')
        .insert(optionsWithQuestionId)

      if (optionsError) {
        console.error('[createFullQuiz] options insert error:', JSON.stringify(optionsError, Object.getOwnPropertyNames(optionsError)))
        throw new Error(`Options insert failed: ${optionsError.message || 'unknown'}`)
      }
    }
  }

  return quizData
}

// ─── Dashboard Stats ───────────────────────────────────────────────────

export async function fetchDashboardStats(educatorId: string) {
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, status')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError) throw coursesError

  const courseIds = (coursesData || []).map((c) => c.id)
  const totalCourses = courseIds.length
  const publishedCourses = (coursesData || []).filter((c) => c.status === 'published').length

  let totalStudents = 0
  let totalCompletions = 0
  let atRiskCount = 0

  if (courseIds.length > 0) {
    const { data: enrollData, error: enrollError } = await supabase
      .from('enrollments')
      .select('status')
      .in('course_id', courseIds)

    if (enrollError) throw enrollError

    totalStudents = (enrollData || []).length
    totalCompletions = (enrollData || []).filter((e) => e.status === 'completed').length
    atRiskCount = (enrollData || []).filter((e) => e.status === 'active').length
  }

  const avgCompletion = totalStudents > 0 ? Math.round((totalCompletions / totalStudents) * 100) : 0

  return {
    totalCourses,
    publishedCourses,
    totalStudents,
    totalCompletions,
    avgCompletion,
    atRiskCount,
  }
}

export async function fetchRecentActivity(educatorId: string): Promise<ActivityItem[]> {
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
      id, status, enrolled_at, completed_at,
      users:user_id (id, full_name, email),
      course_id
    `)
    .in('course_id', courseIds)
    .order('enrolled_at', { ascending: false })
    .limit(10)

  if (enrollError) throw enrollError

  const courseMap = new Map<string, string>((courses || []).map((c: { id: string; title: string }) => [c.id, c.title]))

  return (enrollments || []).map((e: Record<string, unknown>) => {
    const users = e.users as { full_name?: string } | null
    return {
      type: e.status === 'completed' ? 'completion' as const : 'enrollment' as const,
      student: users?.full_name || 'Unknown',
      course: courseMap.get(e.course_id as string) || 'Unknown',
      time: formatRelativeTime((e.enrolled_at || e.completed_at) as string),
    }
  })
}

export async function fetchAtRiskStudents(educatorId: string): Promise<AtRiskStudent[]> {
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
      id, status,
      users:user_id (id, full_name, email),
      course_id
    `)
    .in('course_id', courseIds)
    .eq('status', 'active')

  if (enrollError) throw enrollError

  const courseMap = new Map<string, string>((courses || []).map((c: { id: string; title: string }) => [c.id, c.title]))

  return (enrollments || []).slice(0, 5).map((e: Record<string, unknown>) => {
    const users = e.users as { full_name?: string } | null
    return {
      name: users?.full_name || 'Unknown',
      course: courseMap.get(e.course_id as string) || 'Unknown',
      progress: 0,
      lastActive: 'Recently',
    }
  })
}

// ─── Students ──────────────────────────────────────────────────────────

interface EnrollmentWithUser {
  id: string
  status: string
  enrolled_at: string
  course_id: string
  users: { id: string; full_name: string; email: string } | null
}

export async function fetchStudentsWithProgress(educatorId: string): Promise<StudentProgress[]> {
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

  const courseMap = new Map<string, string>((courses || []).map((c: { id: string; title: string }) => [c.id, c.title]))

  const studentMap = new Map<string, StudentProgress>()

  for (const raw of (enrollments || []) as unknown as EnrollmentWithUser[]) {
    const userId = raw.users?.id
    if (!userId) continue

    if (!studentMap.has(userId)) {
      studentMap.set(userId, {
        id: userId,
        name: raw.users?.full_name || 'Unknown',
        email: raw.users?.email || '',
        courses: [],
        lastActive: formatRelativeTime(raw.enrolled_at),
        totalProgress: 0,
      })
    }

    const student = studentMap.get(userId)!
    const progress = raw.status === 'completed' ? 100 : 0
    student.courses.push({
      title: courseMap.get(raw.course_id) || 'Unknown',
      progress,
      avgScore: 0,
      status: raw.status === 'completed' ? 'completed' : raw.status === 'dropped' ? 'at-risk' : 'on-track',
    })
    student.totalProgress = Math.round(
      student.courses.reduce((sum, c) => sum + c.progress, 0) / student.courses.length
    )
  }

  return Array.from(studentMap.values())
}

// ─── Analytics ─────────────────────────────────────────────────────────

export async function fetchCourseAnalytics(educatorId: string) {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, status')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  if (coursesError) throw coursesError

  const courseIds = (courses || []).map((c) => c.id)

  if (courseIds.length === 0) return { courses: [], stats: { totalEnrollments: 0, completions: 0, avgCompletion: 0, avgScore: 0 } }

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('course_id, status')
    .in('course_id', courseIds)

  if (enrollError) throw enrollError

  const enrollMap = new Map<string, { total: number; completed: number }>()

  for (const e of enrollments || []) {
    if (!enrollMap.has(e.course_id)) {
      enrollMap.set(e.course_id, { total: 0, completed: 0 })
    }
    const entry = enrollMap.get(e.course_id)!
    entry.total++
    if (e.status === 'completed') entry.completed++
  }

  const totalEnrollments = (enrollments || []).length
  const completions = (enrollments || []).filter((e) => e.status === 'completed').length
  const avgCompletion = totalEnrollments > 0 ? Math.round((completions / totalEnrollments) * 100) : 0

  const courseAnalytics = (courses || []).map((c) => {
    const stats = enrollMap.get(c.id) || { total: 0, completed: 0 }
    return {
      title: c.title,
      status: c.status,
      enrolled: stats.total,
      completed: stats.completed,
      avgCompletion: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }
  })

  return {
    courses: courseAnalytics,
    stats: { totalEnrollments, completions, avgCompletion },
  }
}

// ─── Educator profile ──────────────────────────────────────────────────

export async function fetchEducatorProfile() {
  const { data: user, error: userError } = await supabase.auth.getUser()
  if (userError || !user.user) throw userError || new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', user.user.id)
    .single()

  if (error) throw error
  return data as { id: string; full_name: string; email: string; role: string }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Recently'
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return dateStr
}

// ─── File Upload ────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'course-assets'

// Setup upload-only bucket (call this once to configure)
export async function setupUploadOnlyBucket(): Promise<void> {
  try {
    // Delete existing bucket if it exists
    await supabase.storage.deleteBucket(STORAGE_BUCKET)
    console.log('Deleted existing bucket')
  } catch (error) {
    console.log('Bucket deletion (expected if bucket doesn\'t exist):', error)
  }

  // Create new bucket with upload-only configuration
  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false, // Files are NOT publicly accessible
    fileSizeLimit: 10485760, // 10MB limit
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  })

  if (createError) {
    console.error('Bucket creation error:', createError)
    throw createError
  }

  console.log('Created upload-only bucket successfully')
}

export async function uploadCourseFile(
  file: File,
  courseId: string,
  lessonId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `courses/${courseId}/lessons/${lessonId}/${fileName}`

  // Upload the file (bucket should already exist with upload-only policies)
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw uploadError
  }

  // Note: Since bucket is not public, getPublicUrl won't work
  // Files can only be accessed through signed URLs or by users with proper permissions
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

export async function uploadThumbnail(file: File, courseId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const filePath = `courses/${courseId}/thumbnail.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10) // 10 years

  return signedUrlData?.signedUrl ?? ''
}

export async function uploadContentImage(file: File, scopeId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `courses/${scopeId}/content/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) throw uploadError

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

  return signedUrlData?.signedUrl ?? ''
}

// ─── Lesson Assets ──────────────────────────────────────────────────────

export interface LessonAsset {
  id: string
  lesson_id: string
  kind: string
  title: string | null
  url: string
  created_at: string
}

export async function createLessonAsset(
  lessonId: string,
  kind: string,
  title: string,
  url: string
): Promise<void> {
  const { error } = await supabase.from('lesson_assets').insert({
    lesson_id: lessonId,
    kind,
    title,
    url,
  })
  if (error) throw error
}

export async function fetchLessonAssets(lessonId: string): Promise<LessonAsset[]> {
  const { data, error } = await supabase
    .from('lesson_assets')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchLessonAssets error:', error)
    return []
  }
  return data || []
}

export async function deleteLessonAsset(assetId: string): Promise<void> {
  const { error } = await supabase.from('lesson_assets').delete().eq('id', assetId)
  if (error) throw error
}

// ─── Single Lesson CRUD ─────────────────────────────────────────────────

export async function fetchLessonById(lessonId: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id, title, content_html, video_url, transcript, sequence_order, status, course_id,
      lesson_type, estimated_duration, learning_objectives, accessibility_notes,
      has_video, has_pdf, has_quiz, has_transcript, has_summary_activity,
      summary_source, summary_word_target, summary_key_points, summary_reflection_questions,
      summary_ai_feedback_enabled, lesson_layout,
      simplified_summary, focus_mode_enabled, chunked_content_enabled,
      checkpoints_enabled, adaptive_learning_enabled,
      created_at, updated_at
    `)
    .eq('id', lessonId)
    .single()

  if (error) throw error
  return data
}

export async function updateLesson(lessonId: string, fields: Partial<LessonFields>) {
  const { data, error } = await supabase
    .from('lessons')
    .update(fields)
    .eq('id', lessonId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
  if (error) throw error
}

export async function getNextSequenceOrder(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('lessons')
    .select('sequence_order')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: false })
    .limit(1)

  if (error) throw error
  return (data?.[0]?.sequence_order || 0) + 1
}

// ─── Lessons with Quiz Info ────────────────────────────────────────────

export interface LessonWithQuiz {
  id: string
  title: string
  sequence_order: number
  status: string
  has_quiz: boolean
  quiz_id: string | null
  assets_count: number
  video_url: string | null
  has_content: boolean
}

export async function fetchLessonsWithQuizzes(courseId: string): Promise<LessonWithQuiz[]> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, sequence_order, status, video_url, content_html')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (error) throw error

  const lessonIds = (lessons || []).map((l) => l.id)

  const quizMap = new Map<string, { id: string }>()
  const assetCountMap = new Map<string, number>()

  if (lessonIds.length > 0) {
    const [{ data: quizzes }, { data: assets }] = await Promise.all([
      supabase.from('quizzes').select('id, lesson_id').in('lesson_id', lessonIds),
      supabase.from('lesson_assets').select('lesson_id').in('lesson_id', lessonIds),
    ])

    for (const q of quizzes || []) {
      quizMap.set(q.lesson_id, { id: q.id })
    }
    for (const a of assets || []) {
      assetCountMap.set(a.lesson_id, (assetCountMap.get(a.lesson_id) || 0) + 1)
    }
  }

  return (lessons || []).map((l) => ({
    id: l.id,
    title: l.title,
    sequence_order: l.sequence_order,
    status: l.status,
    has_quiz: quizMap.has(l.id),
    quiz_id: quizMap.get(l.id)?.id || null,
    assets_count: assetCountMap.get(l.id) || 0,
    video_url: l.video_url || null,
    has_content: !!l.content_html,
  }))
}

// ─── Quiz CRUD ──────────────────────────────────────────────────────────

export async function fetchQuizByLesson(lessonId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, time_limit_seconds, max_attempts, pass_threshold_pct, lesson_id')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchQuizWithQuestions(lessonId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `id, title, lesson_id, time_limit_seconds, max_attempts, pass_threshold_pct,
      quiz_questions (
        id, question_text, question_type, sequence_order, image_url,
        quiz_options (id, option_text, is_correct, sequence_order, image_url)
      )`
    )
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) {
    console.error('fetchQuizWithQuestions error:', error)
    return null
  }
  return data
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase.from('quizzes').delete().eq('id', quizId)
  if (error) throw error
}

// ─── Course Status ──────────────────────────────────────────────────────

export async function updateCourseStatus(courseId: string, status: CourseStatus): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', courseId)

  if (error) throw error
}

// ─── Certificate Management ────────────────────────────────────────────

export interface CertificateSettings {
  enabled: boolean
  pass_threshold_pct: number
  required_lessons: string[] // lesson IDs that are mandatory
  completion_rules: {
    all_lessons_required: boolean
    quiz_threshold_pct: number
    minimum_progress_pct: number
    mandatory_activities: boolean
  }
  educator_name: string
  institution_name: string
  course_duration_hours: number
  skills: string[]
}

export interface EducatorCertificate {
  id: string
  learner_name: string
  course_title: string
  certificate_code: string
  issued_at: string
  status: string
  revoked_at?: string
  verification_url?: string
  enrollment_id: string
}

export async function fetchCourseCertSettings(courseId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('certificate_enabled, certificate_settings, certification_locked')
    .eq('id', courseId)
    .single()
  if (error) throw error
  return data as {
    certificate_enabled: boolean
    certificate_settings: Record<string, unknown>
    certification_locked: boolean
  }
}

export async function updateCertificateSettings(
  courseId: string,
  settings: Partial<CertificateSettings>
) {
  const { error } = await supabase
    .from('courses')
    .update({
      certificate_enabled: settings.enabled,
      certificate_settings: settings,
    })
    .eq('id', courseId)
  if (error) throw error
}

export async function lockCertification(courseId: string) {
  const { error } = await supabase
    .from('courses')
    .update({ certification_locked: true })
    .eq('id', courseId)
  if (error) throw error
}

export async function fetchEducatorCertificates(educatorId: string): Promise<EducatorCertificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id, reference_code, status, issued_at, revoked_at, verification_url, enrollment_id,
      learner_name, course_title
    `)
    .in('course_id', (
      await supabase.from('courses').select('id').eq('created_by', educatorId).is('deleted_at', null)
    ).data?.map(c => c.id) || [])
    .order('issued_at', { ascending: false })

  if (error) throw error

  return (data || []).map(c => ({
    id: c.id,
    learner_name: c.learner_name || 'Unknown',
    course_title: c.course_title || 'Unknown Course',
    certificate_code: c.reference_code,
    issued_at: c.issued_at,
    status: c.status,
    revoked_at: c.revoked_at || undefined,
    verification_url: c.verification_url || undefined,
    enrollment_id: c.enrollment_id,
  }))
}

export async function fetchEducatorCertStats(educatorId: string) {
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('created_by', educatorId)
    .is('deleted_at', null)

  const courseIds = (courses || []).map(c => c.id)

  if (courseIds.length === 0) {
    return { totalIssued: 0, valid: 0, revoked: 0, thisMonth: 0, completionRate: 0, totalEnrollments: 0, completions: 0 }
  }

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, status, issued_at')
    .in('course_id', courseIds)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, status')
    .in('course_id', courseIds)

  const now = new Date()
  const totalIssued = certs?.length || 0
  const valid = (certs || []).filter(c => c.status === 'issued').length
  const revoked = (certs || []).filter(c => c.status === 'revoked').length
  const thisMonth = (certs || []).filter(c => {
    const d = new Date(c.issued_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const totalEnrollments = enrollments?.length || 0
  const completions = (enrollments || []).filter(e => e.status === 'completed').length
  const completionRate = totalEnrollments > 0 ? Math.round((completions / totalEnrollments) * 100) : 0

  return { totalIssued, valid, revoked, thisMonth, completionRate, totalEnrollments, completions }
}

export async function revokeEducatorCertificate(certId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', certId)
  if (error) throw error
}

export async function issueCertificate(params: {
  enrollmentId: string
  courseId: string
  userId: string
  learnerName: string
  courseTitle: string
  educatorName: string
  skills: string[]
  courseDurationHours: number
}): Promise<{ id: string; referenceCode: string }> {
  // Check for existing certificate to prevent duplicates
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, reference_code')
    .eq('enrollment_id', params.enrollmentId)
    .maybeSingle()

  if (existing) {
    return { id: existing.id, referenceCode: existing.reference_code }
  }

  // Validate all lessons are completed before issuing
  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', params.courseId)
    .eq('status', 'published')

  const { count: completedLessons } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', params.enrollmentId)
    .eq('is_viewed', true)

  if (completedLessons < totalLessons) {
    throw new Error(
      `Cannot issue certificate: learner has only completed ${completedLessons}/${totalLessons} lessons`
    )
  }

  // Generate reference code
  const refCode = await generateReferenceCode()

  const verificationUrl = `${window.location.origin}/verify/${refCode}`

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      enrollment_id: params.enrollmentId,
      course_id: params.courseId,
      user_id: params.userId,
      learner_name: params.learnerName,
      course_title: params.courseTitle,
      educator_name: params.educatorName,
      reference_code: refCode,
      status: 'issued',
      issued_at: new Date().toISOString(),
      completion_date: new Date().toISOString(),
      verification_url: verificationUrl,
      skills_earned: params.skills,
      course_duration_hours: params.courseDurationHours,
      signed_token: await generateSignedToken(refCode),
    })
    .select('id, reference_code')
    .single()

  if (error) throw error

  // Update enrollment to completed
  await supabase
    .from('enrollments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', params.enrollmentId)

  return { id: data.id, referenceCode: data.reference_code }
}

async function generateReferenceCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = [4, 4, 4]
  let code = ''
  for (const len of segments) {
    if (code) code += '-'
    for (let i = 0; i < len; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  // Verify uniqueness
  const { data } = await supabase
    .from('certificates')
    .select('id')
    .eq('reference_code', code)
    .maybeSingle()
  if (data) return generateReferenceCode() // retry
  return code
}

// ─── Instructor Application ───────────────────────────────────────────

export interface InstructorApplicationFields {
  full_name: string
  email: string
  experience: string
  reason: string
  portfolio_links?: string
  referral_code?: string
}

export async function submitInstructorApplication(fields: InstructorApplicationFields): Promise<void> {
  const user = await supabase.auth.getUser()
  const userId = user.data.user?.id || null

  const { error } = await supabase
    .from('instructor_applications')
    .insert({
      user_id: userId,
      full_name: fields.full_name,
      email: fields.email,
      experience: fields.experience,
      reason: fields.reason,
      portfolio_links: fields.portfolio_links || null,
      referral_code: fields.referral_code || null,
      status: 'pending',
    })

  if (error) throw error

  // Update the user's application status
  if (userId) {
    await supabase
      .from('users')
      .update({ instructor_application_status: 'pending' })
      .eq('id', userId)
  }
}

export async function fetchMyApplication(): Promise<{ status: string } | null> {
  const user = await supabase.auth.getUser()
  if (!user.data.user?.id) return null

  const { data, error } = await supabase
    .from('instructor_applications')
    .select('status')
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// ─── Contact Messages ─────────────────────────────────────────────────

export async function submitContactMessage(fields: {
  name: string
  email: string
  category: string
  subject: string
  message: string
}): Promise<void> {
  const { error } = await supabase
    .from('contact_messages')
    .insert({
      name: fields.name,
      email: fields.email,
      category: fields.category,
      subject: fields.subject,
      message: fields.message,
    })

  if (error) throw error
}

// ─── Referral Codes ──────────────────────────────────────────────────

export async function fetchMyReferralCodes(): Promise<{ code: string; usage_count: number; max_uses: number }[]> {
  const user = await supabase.auth.getUser()
  if (!user.data.user?.id) return []

  const { data, error } = await supabase
    .from('referral_codes')
    .select('code, usage_count, max_uses')
    .eq('user_id', user.data.user.id)
    .eq('is_active', true)

  if (error) throw error
  return data || []
}

export async function generateMyReferralCode(): Promise<string> {
  const user = await supabase.auth.getUser()
  if (!user.data.user?.id) throw new Error('Not authenticated')

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'REF-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  const { error } = await supabase
    .from('referral_codes')
    .insert({ code, user_id: user.data.user.id })

  if (error) throw error
  return code
}

async function generateSignedToken(refCode: string): Promise<string> {
  const data = `${refCode}:${Date.now()}:acess-cert`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

// ─── Lesson Checkpoints (educator) ─────────────────────────────────────

export interface LessonCheckpoint {
  id: string
  lesson_id: string
  title: string
  description: string | null
  checkpoint_type: string
  sequence_order: number
  required: boolean
}

export async function fetchLessonCheckpoints(lessonId: string): Promise<LessonCheckpoint[]> {
  const { data, error } = await supabase
    .from('lesson_checkpoints')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createLessonCheckpoint(lessonId: string, checkpoint: {
  title: string; description?: string; checkpoint_type?: string; required?: boolean
}): Promise<LessonCheckpoint> {
  const { data: max } = await supabase
    .from('lesson_checkpoints')
    .select('sequence_order')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: false })
    .limit(1)
  const { data, error } = await supabase.from('lesson_checkpoints').insert({
    lesson_id: lessonId,
    title: checkpoint.title,
    description: checkpoint.description || null,
    checkpoint_type: checkpoint.checkpoint_type || 'reflection',
    required: checkpoint.required ?? true,
    sequence_order: (max?.[0]?.sequence_order ?? -1) + 1,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteLessonCheckpoint(checkpointId: string): Promise<void> {
  const { error } = await supabase.from('lesson_checkpoints').delete().eq('id', checkpointId)
  if (error) throw error
}
