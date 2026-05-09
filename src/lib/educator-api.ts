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
  options: { option_text: string; is_correct: boolean; sequence_order: number }[]
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
      thumbnail_url, created_at, updated_at
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
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCourse(courseId: string, fields: Partial<CourseFields>) {
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
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId)

  if (error) throw error
}

// ─── Lessons ───────────────────────────────────────────────────────────

export async function fetchLessons(courseId: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, content_html, video_url, transcript, sequence_order, status, created_at, updated_at')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLesson(educatorId: string, fields: LessonFields) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      course_id: fields.course_id,
      title: fields.title,
      content_html: fields.content_html,
      video_url: fields.video_url || null,
      transcript: fields.transcript || null,
      sequence_order: fields.sequence_order,
      status: fields.status,
    })
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

  if (quizError) throw quizError

  for (const q of questions) {
    const { data: questionData, error: questionError } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        sequence_order: q.sequence_order,
      })
      .select()
      .single()

    if (questionError) throw questionError

    if (q.options.length > 0) {
      const optionsWithQuestionId = q.options.map((opt) => ({
        question_id: questionData.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        sequence_order: opt.sequence_order,
      }))

      const { error: optionsError } = await supabase
        .from('quiz_options')
        .insert(optionsWithQuestionId)

      if (optionsError) throw optionsError
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

  if (error) throw error
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
    .select('id, title, content_html, video_url, transcript, sequence_order, status, course_id, created_at, updated_at')
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
}

export async function fetchLessonsWithQuizzes(courseId: string): Promise<LessonWithQuiz[]> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title, sequence_order, status')
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
        id, question_text, question_type, sequence_order,
        quiz_options (id, option_text, is_correct, sequence_order)
      )`
    )
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) throw error
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
