import { supabase } from './supabase'
import {
  auditLesson,
  DEFAULT_COURSE_SUPPORT,
  type CourseAccessibilitySupport,
  type FocusProfile,
  type LessonAuditSubject,
  type RuleSeverity,
} from './accessibility-audit'
import { resolveFocus } from './accessibility-profiles'
import { determineStudentRisk, type StudentRiskStatus } from './student-risk'

export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'archived'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CourseFields {
  title: string
  description: string
  status: CourseStatus
  difficulty_level: DifficultyLevel
  category?: string
  thumbnail_url?: string
  tags?: string[]
  accessibility_categories?: string[]
  primary_disability_focus?: string
  secondary_disability_focuses?: string[]
  target_reading_age?: number
  recommended_age_group?: string
  educator_custom_guide?: string
  supports_tts?: boolean
  supports_focus_mode?: boolean
  supports_chunked_learning?: boolean
  learning_streaks_enabled?: boolean
  chapter_organization_enabled?: boolean
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
  learning_objectives?: string | null
  accessibility_notes?: string | null
  /** Column exists via migration 20260510000001; typed here so it is settable. */
  prerequisite_lesson_id?: string | null
  has_video?: boolean
  has_pdf?: boolean
  has_quiz?: boolean
  has_transcript?: boolean
  has_summary_activity?: boolean
  summary_source?: 'video' | 'pdf' | 'lesson_text' | 'entire_lesson'
  summary_word_target?: number
  summary_key_points?: string[]
  summary_reflection_questions?: string[]
  lesson_layout?: 'standard' | 'focus' | 'two_column' | 'wide' | 'slideshow'
  simplified_summary?: string
  focus_mode_enabled?: boolean
  chunked_content_enabled?: boolean
  checkpoints_enabled?: boolean
  adaptive_learning_enabled?: boolean
  allow_discussions?: boolean
  allow_download?: boolean
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
  primary_disability_focus?: string | null
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
      thumbnail_url, updated_at, primary_disability_focus
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
    primary_disability_focus: c.primary_disability_focus as string | null,
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
      certificate_settings, certification_locked, created_by,
      primary_disability_focus, secondary_disability_focuses, target_reading_age,
      educator_custom_guide
    `)
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createCourse(educatorId: string, fields: CourseFields) {
  const slug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 8)

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
      tags: fields.tags || [],
      accessibility_categories: fields.accessibility_categories || [],
      primary_disability_focus: fields.primary_disability_focus || null,
      secondary_disability_focuses: fields.secondary_disability_focuses || [],
      target_reading_age: fields.target_reading_age || 13,
      recommended_age_group: fields.recommended_age_group || null,
      educator_custom_guide: fields.educator_custom_guide || '',
    })
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Course created but could not be retrieved. Check RLS policies.')
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

// ─── Accessibility Categories ─────────────────────────────────────────

export async function fetchCourseAccessibilityCategories(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_accessibility_categories')
    .select('accessibility_category')
    .eq('course_id', courseId)

  if (error) throw error
  return (data || []).map((r) => r.accessibility_category)
}

export async function updateCourseAccessibilityCategories(
  courseId: string,
  categories: string[],
): Promise<void> {
  await guardSystemCourse(courseId)
  // Replace all categories for this course in one transaction
  const { error: delError } = await supabase
    .from('course_accessibility_categories')
    .delete()
    .eq('course_id', courseId)
  if (delError) throw delError

  if (categories.length === 0) return

  const { error: insError } = await supabase
    .from('course_accessibility_categories')
    .insert(categories.map((cat) => ({ course_id: courseId, accessibility_category: cat })))
  if (insError) throw insError
}

// ─── Accessibility Templates ──────────────────────────────────────────

export interface AccessibilityTemplate {
  id: string;
  name: string;
  description: string | null;
  target_disability: string;
  content_structure: { type: string; required: boolean; label: string }[];
}

export async function fetchAccessibilityTemplates(): Promise<AccessibilityTemplate[]> {
  const { data, error } = await supabase
    .from('accessibility_templates')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
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

// ─── Students ──────────────────────────────────────────────────────────

export interface CourseStudentProgress {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
  status: StudentRiskStatus;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  hasCertificate?: boolean;
  certificateUrl?: string;
  hasCustomCertificate?: boolean;
  customCertificateUrl?: string;
  lastActive?: string;
  timeSpentSeconds: number;
  avgScore: number;
}

export async function fetchCourseStudentsProgress(courseId: string): Promise<CourseStudentProgress[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id, status, enrolled_at, user_id,
      users:user_id (id, full_name, email)
    `)
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false });

  if (enrollError) throw enrollError;
  if (!enrollments || enrollments.length === 0) return [];

  // Get total lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'published');

  if (lessonsError) throw lessonsError;
  const lessonIds = new Set((lessons || []).map((l) => l.id));
  const totalLessons = lessonIds.size;

  const enrollmentIds = enrollments.map(e => e.id);

  // Get progress for these enrollments
  const { data: progressData, error: progressError } = await supabase
    .from('lesson_progress')
    .select('enrollment_id, lesson_id, is_completed, last_viewed_at, time_spent_learning')
    .in('enrollment_id', enrollmentIds);

  if (progressError) throw progressError;

  const progressMap = new Map<string, number>();
  const lastActiveMap = new Map<string, string>();
  const timeSpentMap = new Map<string, number>();

  for (const p of progressData || []) {
    // Only count lessons still published in this course — otherwise a
    // removed lesson's leftover progress row could push completed past total.
    if (p.is_completed && lessonIds.has(p.lesson_id)) {
      progressMap.set(p.enrollment_id, (progressMap.get(p.enrollment_id) || 0) + 1);
    }
    
    // Calculate last active
    if (p.last_viewed_at) {
      const currentLast = lastActiveMap.get(p.enrollment_id);
      if (!currentLast || new Date(p.last_viewed_at) > new Date(currentLast)) {
        lastActiveMap.set(p.enrollment_id, p.last_viewed_at);
      }
    }

    // Calculate time spent. Previously fell back to a fabricated 1200
    // seconds (20 minutes) whenever a lesson was viewed but had no recorded
    // time — a made-up number presented to educators as a real duration.
    const spent = p.time_spent_learning || 0;
    timeSpentMap.set(p.enrollment_id, (timeSpentMap.get(p.enrollment_id) || 0) + spent);
  }

  // Fetch quiz scores for avg calculation
  const { data: qaData } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score_pct, result')
    .in('enrollment_id', enrollmentIds);

  const quizScoresMap = new Map<string, number[]>();
  const quizFailureMap = new Map<string, boolean>();
  for (const qa of qaData || []) {
    if (!quizScoresMap.has(qa.enrollment_id)) {
      quizScoresMap.set(qa.enrollment_id, []);
    }
    if (qa.score_pct != null) {
      quizScoresMap.get(qa.enrollment_id)!.push(qa.score_pct);
    }
    if (qa.result === 'failed') {
      quizFailureMap.set(qa.enrollment_id, true);
    }
  }

  // Fetch certificates for these enrollments
  const { data: certData } = await supabase
    .from('certificates')
    .select('enrollment_id, verification_url, pdf_url, metadata')
    .in('enrollment_id', enrollmentIds);

  const systemCertMap = new Map<string, string>();
  const customCertMap = new Map<string, string>();
  for (const c of certData || []) {
    const isSystem = c.verification_url?.includes('/verify/');
    const isCustom = !!c.pdf_url || (c.metadata as any)?.is_custom === true;
    
    if (isSystem) {
      systemCertMap.set(c.enrollment_id, c.verification_url || '');
    }
    if (isCustom) {
      customCertMap.set(c.enrollment_id, c.pdf_url || '');
    }
  }

  return enrollments.map((raw: Record<string, unknown>) => {
    const completed = progressMap.get(raw.id as string) || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    
    const scores = quizScoresMap.get(raw.id as string) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Status calculation
    const lastActive = lastActiveMap.get(raw.id as string) || (raw.enrolled_at as string);
    const status = determineStudentRisk({
      enrollmentStatus: raw.status as string,
      lastActive,
      progressPercent,
      hasQuizFailure: quizFailureMap.get(raw.id as string) || false,
    });
    const rawUsers = raw.users as { full_name?: string; email?: string } | null;

    return {
      enrollmentId: raw.id,
      studentId: raw.user_id,
      studentName: rawUsers?.full_name || 'Unknown',
      studentEmail: rawUsers?.email || '',
      enrolledAt: raw.enrolled_at,
      status,
      completedLessons: Math.min(completed, totalLessons), // Just in case
      totalLessons,
      progressPercent,
      hasCertificate: systemCertMap.has(raw.id as string),
      certificateUrl: systemCertMap.get(raw.id as string) || undefined,
      hasCustomCertificate: customCertMap.has(raw.id as string),
      customCertificateUrl: customCertMap.get(raw.id as string) || undefined,
      lastActive,
      timeSpentSeconds: timeSpentMap.get(raw.id as string) || 0,
      avgScore
    };
  });
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
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  if (diffDays < 30) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  if (diffDays < 365) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
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

  const url = urlData.publicUrl

  const { data: user } = await supabase.auth.getUser()
  if (user.user) {
    let fileType = 'other'
    if (file.type.startsWith('image/')) fileType = 'image'
    else if (file.type.startsWith('video/')) fileType = 'video'
    else if (file.type === 'application/pdf') fileType = 'pdf'
    
    await supabase.from('media_assets').insert({
      user_id: user.user.id,
      course_id: courseId,
      file_name: file.name,
      file_type: fileType,
      url: url,
      size_bytes: file.size
    })
  }

  return url
}

export async function uploadThumbnail(file: File, courseId: string): Promise<string> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop() || 'png'
  const filePath = `${user.user.id}/courses/${courseId}/thumbnail.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10) // 10 years

  const url = signedUrlData?.signedUrl ?? ''

  if (user.user) {
    await supabase.from('media_assets').insert({
      user_id: user.user.id,
      course_id: courseId,
      file_name: file.name,
      file_type: 'image',
      url: url,
      size_bytes: file.size
    })
  }

  return url
}

export async function uploadContentImage(file: File, scopeId: string): Promise<string> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop() || 'png'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `${user.user.id}/courses/${scopeId}/content/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) throw uploadError

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

  const url = signedUrlData?.signedUrl ?? ''
  
  if (user.user) {
    await supabase.from('media_assets').insert({
      user_id: user.user.id,
      course_id: null, // Scope ID could be lesson, so we omit course_id for now
      file_name: file.name,
      file_type: 'image',
      url: url,
      size_bytes: file.size
    })
  }

  return url
}

export async function uploadMediaImage(courseId: string, file: File): Promise<string> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop() || 'png'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `${user.user.id}/courses/${courseId}/media/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) throw uploadError

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

  const url = signedUrlData?.signedUrl ?? ''
  
  if (user.user) {
    await supabase.from('media_assets').insert({
      user_id: user.user.id,
      course_id: courseId,
      file_name: file.name,
      file_type: 'image',
      url: url,
      size_bytes: file.size
    })
  }

  return url
}

// ─── Global Media Assets ──────────────────────────────────────────────────

export interface MediaAsset {
  id: string
  user_id: string
  course_id: string | null
  file_name: string
  file_type: 'image' | 'pdf' | 'video' | 'other'
  url: string
  size_bytes: number
  created_at: string
}

export async function fetchMediaAssets(typeFilter?: string): Promise<MediaAsset[]> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return []

  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })

  if (typeFilter) {
    query = query.eq('file_type', typeFilter)
  }

  const { data, error } = await query
  if (error) {
    console.error('fetchMediaAssets error:', error)
    return []
  }
  return data || []
}

export async function createExternalMediaAsset(
  fileName: string,
  url: string,
  fileType: 'image' | 'pdf' | 'video' | 'other'
): Promise<MediaAsset | null> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return null

  const { data, error } = await supabase.from('media_assets').insert({
    user_id: user.user.id,
    course_id: null,
    file_name: fileName,
    file_type: fileType,
    url: url,
    size_bytes: 0
  }).select('*').single()

  if (error) {
    console.error('createExternalMediaAsset error:', error)
    return null
  }
  return data
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const { error } = await supabase.from('media_assets').delete().eq('id', assetId)
  if (error) throw error
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
  const { data: user } = await supabase.auth.getUser()
  const userId = user.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('media_assets').insert({
    lesson_id: lessonId,
    file_type: kind,
    title,
    url,
    user_id: userId,
    file_name: title || 'Asset'
  })
  if (error) throw error
}

export async function fetchLessonAssets(lessonId: string): Promise<LessonAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchLessonAssets error:', error)
    return []
  }
  
  return (data || []).map(row => ({
    id: row.id,
    lesson_id: row.lesson_id,
    kind: row.file_type,
    title: row.title,
    url: row.url
  }))
}

export async function deleteLessonAsset(assetId: string): Promise<void> {
  const { error } = await supabase.from('media_assets').delete().eq('id', assetId)
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
      checkpoints_enabled, adaptive_learning_enabled, allow_discussions,
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
      supabase.from('media_assets').select('lesson_id').in('lesson_id', lessonIds),
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
  allow_custom_certificates?: boolean
  certificate_title?: string
  educator_role?: string
  course_title?: string
  certificate_description?: string
  certificate_id_prefix?: string
  issue_date_behavior?: string
}

export interface EducatorCertificate {
  id: string
  learner_name: string
  course_title: string
  certificate_code: string
  issued_at: string
  status: string
  revoked_at?: string
  revoke_reason?: string
  verification_url?: string
  enrollment_id: string
  pdf_url?: string
  metadata?: Record<string, unknown>
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
      id, reference_code, status, issued_at, revoked_at, revoke_reason, verification_url, enrollment_id,
      learner_name, course_title, pdf_url, metadata
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
    pdf_url: c.pdf_url || undefined,
    metadata: c.metadata || undefined,
  }))
}

export async function uploadEducatorCustomCertificate(certId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const filePath = `custom_certs/${certId}-${Date.now()}.${fileExt}`

  // Upload the file to the 'certificates' storage bucket
  const { error: uploadError } = await supabase.storage
    .from('certificates')
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(filePath)

  const pdfUrl = publicUrlData.publicUrl

  // Fetch the certificate row in the database
  const { data: certInfo, error: fetchError } = await supabase
    .from('certificates')
    .select('metadata')
    .eq('id', certId)
    .single()
    
  if (fetchError) throw fetchError

  const metadata = certInfo?.metadata as Record<string, unknown> | null;

  // Update the existing certificate row in-place
  const { error: updateError } = await supabase
    .from('certificates')
    .update({
      pdf_url: pdfUrl,
      metadata: { ...(metadata || {}), is_custom: true }
    })
    .eq('id', certId)

  if (updateError) throw updateError

  return pdfUrl
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

export async function revokeEducatorCertificate(certId: string, reason: string, scope: 'both' | 'system' | 'custom' = 'both'): Promise<void> {
  const res = await fetch(`/api/educator/certificates/${certId}/revoke`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, scope })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to revoke certificate');
  }
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
  const response = await fetch('/api/educator/certificates/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enrollmentId: params.enrollmentId,
      courseId: params.courseId
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to issue certificate');
  }

  return response.json();
}

export interface EducatorCourseCertStatus {
  courseId: string
  courseTitle: string
  certificateEnabled: boolean
  certificateSettings: Record<string, any>
  totalEnrolled: number
  eligibleCount: number
  awaitingCount: number
  issuedCount: number
  eligibleStudents: {
    enrollmentId: string
    studentId: string
    studentName: string
    studentEmail: string
    completedLessons: number
    totalLessons: number
    progressPercent: number
    quizScorePercent: number
    completedAt?: string
    certificateStatus: 'eligible' | 'issued'
    certificateId?: string
    certificateCode?: string
  }[]
}

export async function fetchEducatorCoursesCertStatus(educatorId: string): Promise<EducatorCourseCertStatus[]> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, certificate_enabled, certificate_settings')
    .eq('created_by', educatorId)
    .is('deleted_at', null);

  if (coursesError) throw coursesError;
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map(c => c.id);

  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id, status, enrolled_at, completed_at, users:user_id (id, full_name, email)')
    .in('course_id', courseIds);

  if (enrollError) throw enrollError;
  const enrollmentIds = (enrollments || []).map(e => e.id);

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, enrollment_id, reference_code, status, issued_at')
    .in('enrollment_id', enrollmentIds);

  const certMap = new Map<string, any>();
  for (const c of certs || []) {
    certMap.set(c.enrollment_id, c);
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null');

  const courseLessonsMap = new Map<string, string[]>();
  for (const l of lessons || []) {
    if (!courseLessonsMap.has(l.course_id)) {
      courseLessonsMap.set(l.course_id, []);
    }
    courseLessonsMap.get(l.course_id)!.push(l.id);
  }

  let progressData: any[] = [];
  if (enrollmentIds.length > 0) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('enrollment_id, lesson_id, is_completed')
      .in('enrollment_id', enrollmentIds)
      .eq('is_completed', true);
    progressData = data || [];
  }

  const enrollmentProgressMap = new Map<string, Set<string>>();
  for (const p of progressData) {
    if (!enrollmentProgressMap.has(p.enrollment_id)) {
      enrollmentProgressMap.set(p.enrollment_id, new Set());
    }
    enrollmentProgressMap.get(p.enrollment_id)!.add(p.lesson_id);
  }

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, lesson_id, lessons:lesson_id (course_id)')
    .in('lesson_id', (lessons || []).map(l => l.id));

  const courseQuizzesMap = new Map<string, string[]>();
  for (const q of quizzes || []) {
    const cid = (q.lessons as any)?.course_id;
    if (cid) {
      if (!courseQuizzesMap.has(cid)) {
        courseQuizzesMap.set(cid, []);
      }
      courseQuizzesMap.get(cid)!.push(q.id);
    }
  }

  let quizAttempts: any[] = [];
  if (enrollmentIds.length > 0) {
    const { data } = await supabase
      .from('quiz_attempts')
      .select('enrollment_id, quiz_id, score_pct, result')
      .in('enrollment_id', enrollmentIds)
      .eq('result', 'pass');
    quizAttempts = data || [];
  }

  const enrollmentPassedQuizzes = new Map<string, Set<string>>();
  for (const qa of quizAttempts) {
    if (!enrollmentPassedQuizzes.has(qa.enrollment_id)) {
      enrollmentPassedQuizzes.set(qa.enrollment_id, new Set());
    }
    enrollmentPassedQuizzes.get(qa.enrollment_id)!.add(qa.quiz_id);
  }

  return courses.map(course => {
    const courseLessons = courseLessonsMap.get(course.id) || [];
    const totalLessons = courseLessons.length;
    const courseQuizzes = courseQuizzesMap.get(course.id) || [];
    const settings = course.certificate_settings as Record<string, any> || {};
    const quizThreshold = settings.completion_rules?.quiz_threshold_pct || 80;

    const courseEnrollments = (enrollments || []).filter(e => e.course_id === course.id);
    const totalEnrolled = courseEnrollments.length;

    let eligibleCount = 0;
    let awaitingCount = 0;
    let issuedCount = 0;
    const eligibleStudents: any[] = [];

    for (const enroll of courseEnrollments) {
      const completedSet = enrollmentProgressMap.get(enroll.id) || new Set();
      const completedLessons = courseLessons.filter(lid => completedSet.has(lid)).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const passedSet = enrollmentPassedQuizzes.get(enroll.id) || new Set();
      const passedQuizzesCount = courseQuizzes.filter(qid => passedSet.has(qid)).length;
      const passRate = courseQuizzes.length > 0 ? Math.round((passedQuizzesCount / courseQuizzes.length) * 100) : 100;

      const lessonsDone = totalLessons > 0 && completedLessons === totalLessons;
      const quizzesDone = courseQuizzes.length === 0 || passRate >= quizThreshold;
      const isEligible = lessonsDone && quizzesDone;

      const cert = certMap.get(enroll.id);
      const isIssued = cert && cert.status === 'issued';

      if (isIssued) {
        issuedCount++;
      }

      if (isEligible) {
        eligibleCount++;
        if (!isIssued) {
          awaitingCount++;
        }

        const studentUser = enroll.users as any;
        eligibleStudents.push({
          enrollmentId: enroll.id,
          studentId: enroll.user_id,
          studentName: studentUser?.full_name || 'Learner',
          studentEmail: studentUser?.email || '',
          completedLessons,
          totalLessons,
          progressPercent,
          quizScorePercent: passRate,
          completedAt: enroll.completed_at || cert?.issued_at,
          certificateStatus: isIssued ? 'issued' : 'eligible',
          certificateId: cert?.id,
          certificateCode: cert?.reference_code
        });
      }
    }

    const isUniqueCertEnabled = course.certificate_enabled === true;

    return {
      courseId: course.id,
      courseTitle: course.title,
      certificateEnabled: isUniqueCertEnabled,
      certificateSettings: settings,
      totalEnrolled,
      eligibleCount: isUniqueCertEnabled ? eligibleCount : 0,
      awaitingCount: isUniqueCertEnabled ? awaitingCount : 0,
      issuedCount,
      eligibleStudents: isUniqueCertEnabled ? eligibleStudents : []
    };
  });
}

export async function uploadCustomCertificate(
  enrollmentId: string,
  courseId: string,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filePath = `certificates/${courseId}/${enrollmentId}/${fileName}`

  // Upload to course-assets bucket (or similar)
  const { error: uploadError } = await supabase.storage
    .from('course-assets')
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = await supabase.storage
    .from('course-assets')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10) // 10 years

  const customUrl = urlData?.signedUrl ?? ''

  // Now upsert into certificates table
  // If we don't have a specific column, we'll store it in verification_url or update status
  // We'll see if there's an existing certificate
  await supabase
    .from('certificates')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  // Call API route to save certificate and notify student (bypasses RLS)
  const res = await fetch('/api/certificates/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enrollmentId,
      courseId,
      userId,
      customUrl
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save certificate to database');
  }

  return customUrl
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

// ─── Interactive Content ────────────────────────────────────────────

export type InteractiveContentType = 'flashcards' | 'drag_drop' | 'fill_blanks' | 'memory_game' | 'timeline'

export interface InteractiveContent {
  id: string
  lesson_id: string
  content_type: InteractiveContentType
  title: string
  content_data: Record<string, unknown>
  accessibility_settings: Record<string, unknown>
  sequence_order: number
  is_draft: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InteractiveContentFields {
  content_type: InteractiveContentType
  title: string
  content_data: Record<string, unknown>
  accessibility_settings?: Record<string, unknown>
  sequence_order?: number
  is_draft?: boolean
}

export async function fetchLessonInteractiveContent(lessonId: string): Promise<InteractiveContent[]> {
  const { data, error } = await supabase
    .from('lesson_interactive_content')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createInteractiveContent(
  lessonId: string,
  fields: InteractiveContentFields,
): Promise<InteractiveContent> {
  const { data, error } = await supabase
    .from('lesson_interactive_content')
    .insert({
      lesson_id: lessonId,
      content_type: fields.content_type,
      title: fields.title,
      content_data: fields.content_data,
      accessibility_settings: fields.accessibility_settings ?? {},
      sequence_order: fields.sequence_order ?? 0,
      is_draft: fields.is_draft ?? false,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateInteractiveContent(
  id: string,
  fields: Partial<InteractiveContentFields>,
): Promise<InteractiveContent> {
  const { data, error } = await supabase
    .from('lesson_interactive_content')
    .update({
      ...fields,
      sequence_order: fields.sequence_order ?? undefined,
      is_draft: fields.is_draft ?? undefined,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteInteractiveContent(id: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_interactive_content')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderInteractiveContent(
  items: { id: string; sequence_order: number }[],
): Promise<void> {
  const updates = items.map((item) =>
    supabase
      .from('lesson_interactive_content')
      .update({ sequence_order: item.sequence_order })
      .eq('id', item.id),
  )
  const results = await Promise.all(updates)
  for (const result of results) {
    if (result.error) throw result.error
  }
}

// ─── Video Questions ─────────────────────────────────────────────────

export interface VideoQuestion {
  id: string
  lesson_id: string
  title: string
  timestamp_seconds: number
  question_text: string
  options: string[]
  correct_option_index: number
  sequence_order: number
}

export async function fetchVideoQuestions(lessonId: string): Promise<VideoQuestion[]> {
  const { data, error } = await supabase
    .from('video_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('timestamp_seconds', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createVideoQuestion(
  lessonId: string,
  fields: {
    title: string
    timestamp_seconds: number
    question_text: string
    options: string[]
    correct_option_index: number
  },
): Promise<VideoQuestion> {
  const { data: max } = await supabase
    .from('video_questions')
    .select('sequence_order')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: false })
    .limit(1)

  const { data, error } = await supabase
    .from('video_questions')
    .insert({
      lesson_id: lessonId,
      title: fields.title,
      timestamp_seconds: fields.timestamp_seconds,
      question_text: fields.question_text,
      options: fields.options,
      correct_option_index: fields.correct_option_index,
      sequence_order: (max?.[0]?.sequence_order ?? -1) + 1,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteVideoQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('video_questions')
    .delete()
    .eq('id', questionId)
  if (error) throw error
}

// ─── H5P Content (Educator) ──────────────────────────────────────────

export interface H5PContent {
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
  content_json?: Record<string, unknown> | null
  folder_path?: string | null
}

export interface H5PContentFields {
  title: string
  embed_url: string
  source_url?: string | null
  description?: string | null
  width?: string
  height?: string
  sequence_order?: number
  thumbnail_url?: string | null
  h5p_mode?: 'external' | 'self_hosted'
  library_name?: string | null
  content_json?: Record<string, unknown> | null
  folder_path?: string | null
}

export async function fetchLessonH5PContent(lessonId: string): Promise<H5PContent[]> {
  const { data, error } = await supabase
    .from('h5p_contents')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createH5PContent(
  lessonId: string,
  fields: H5PContentFields,
): Promise<H5PContent> {
  const { data, error } = await supabase
    .from('h5p_contents')
    .insert({
      lesson_id: lessonId,
      title: fields.title,
      embed_url: fields.embed_url,
      source_url: fields.source_url,
      description: fields.description,
      width: fields.width ?? '100%',
      height: fields.height ?? '500px',
      sequence_order: fields.sequence_order ?? 0,
      thumbnail_url: fields.thumbnail_url,
      h5p_mode: fields.h5p_mode ?? 'external',
      library_name: fields.library_name,
      content_json: fields.content_json,
      folder_path: fields.folder_path,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateH5PContent(
  id: string,
  fields: Partial<H5PContentFields>,
): Promise<H5PContent> {
  const { data, error } = await supabase
    .from('h5p_contents')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteH5PContent(id: string): Promise<void> {
  const { error } = await supabase
    .from('h5p_contents')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderH5PContent(
  items: { id: string; sequence_order: number }[],
): Promise<void> {
  const updates = items.map((item) =>
    supabase
      .from('h5p_contents')
      .update({ sequence_order: item.sequence_order })
      .eq('id', item.id),
  )
  const results = await Promise.all(updates)
  for (const result of results) {
    if (result.error) throw result.error
  }
}

// ─── Content Versioning ──────────────────────────────────────────────

export interface LessonVersion {
  id: string;
  lesson_id: string;
  content_html: string;
  version_name: string;
  created_at: string;
  created_by: string;
}

export async function fetchLessonVersions(lessonId: string): Promise<LessonVersion[]> {
  const { data, error } = await supabase
    .from('lesson_versions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LessonVersion[];
}

export async function saveLessonVersion(lessonId: string, contentHtml: string, versionName: string): Promise<LessonVersion> {
  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('lesson_versions')
    .insert({
      lesson_id: lessonId,
      content_html: contentHtml,
      version_name: versionName,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data as LessonVersion;
}

export async function deleteLessonVersion(versionId: string): Promise<void> {
  const { error } = await supabase
    .from('lesson_versions')
    .delete()
    .eq('id', versionId);

  if (error) throw error;
}

export interface StudentSummarySubmission {
  id: string;
  response_data: { content: string; wordCount: number };
  created_at: string;
  enrollments: {
    id: string;
    course_id: string;
    users: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  } | null;
}

export async function fetchLessonSummaries(lessonId: string, courseId: string): Promise<StudentSummarySubmission[]> {
  const { data, error } = await supabase
    .from('learner_checkpoints')
    .select(`
      id,
      response_data,
      created_at,
      enrollments!inner (
        id,
        course_id,
        users:user_id (
          id,
          full_name,
          email
        )
      )
    `)
    .eq('lesson_id', lessonId)
    .eq('enrollments.course_id', courseId)
    .is('checkpoint_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) as StudentSummarySubmission[];
}


// ─── Accessibility Auditor ─────────────────────────────────────────────
// The rules themselves live in `@/lib/accessibility-audit` as a pure function.
// This layer only fetches rows, feeds them through that engine, and rolls the
// per-lesson results up into a course-level report. Keeping the rules in one
// place is what makes the lesson editor's live score and this report agree.

export interface CourseAccessibilitySettings extends CourseAccessibilitySupport {
  primary_disability_focus: string | null
  educator_custom_guide: string | null
}

const EMPTY_COURSE_SETTINGS: CourseAccessibilitySettings = {
  ...DEFAULT_COURSE_SUPPORT,
  primary_disability_focus: null,
  educator_custom_guide: null,
}

/**
 * Just the accessibility switches for a course.
 *
 * Deliberately separate from `fetchCourseById`, which has many callers that do
 * not need these columns. Returns defaults for a blank courseId so the course
 * builder wizard (which has no course row yet) can call it unconditionally.
 */
export async function fetchCourseAccessibilitySettings(
  courseId: string,
): Promise<CourseAccessibilitySettings> {
  if (!courseId) return { ...EMPTY_COURSE_SETTINGS }

  const { data, error } = await supabase
    .from('courses')
    .select(
      `primary_disability_focus, educator_custom_guide, target_reading_age,
       supports_tts, supports_focus_mode, supports_chunked_learning,
       learning_streaks_enabled, chapter_organization_enabled`,
    )
    .eq('id', courseId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { ...EMPTY_COURSE_SETTINGS }

  return {
    primary_disability_focus: data.primary_disability_focus ?? null,
    educator_custom_guide: data.educator_custom_guide ?? null,
    target_reading_age: data.target_reading_age ?? null,
    supports_tts: !!data.supports_tts,
    supports_focus_mode: !!data.supports_focus_mode,
    supports_chunked_learning: !!data.supports_chunked_learning,
    learning_streaks_enabled: !!data.learning_streaks_enabled,
    chapter_organization_enabled: !!data.chapter_organization_enabled,
  }
}

export interface AccessibilityAuditItem {
  id: string
  title: string
  description: string
  weight: number
  passed: boolean
  /** 'course' items are settings; 'lessons' items roll up per-lesson rules. */
  scope: 'course' | 'lessons'
  severity: RuleSeverity
  source: string
  /** For lesson-scoped items, which lessons still fail and why. */
  affected: { id: string; title: string; detail: string }[]
  /** Kept for backwards compatibility with earlier single-lesson callers. */
  lessonId?: string
  lessonTitle?: string
}

export interface AccessibilityLessonScore {
  id: string
  title: string
  status: string
  score: number
  passed: number
  applicable: number
  failures: number
  requiredFailures: number
}

export interface AccessibilityAuditReport {
  score: number
  focus: FocusProfile
  passedCount: number
  totalCount: number
  /** courseChecks followed by lessonChecks — what the existing UI renders. */
  checks: AccessibilityAuditItem[]
  courseChecks: AccessibilityAuditItem[]
  lessonChecks: AccessibilityAuditItem[]
  perLesson: AccessibilityLessonScore[]
  lessonCount: number
  /** True when the course has no lessons at all, so the score means nothing. */
  empty: boolean
}

/** Course-level switches that matter for each focus profile. */
function courseLevelChecks(
  settings: CourseAccessibilitySettings,
  focus: FocusProfile,
  anyLessonHasNotes: boolean,
): AccessibilityAuditItem[] {
  const item = (
    id: string,
    title: string,
    passed: boolean,
    weight: number,
    severity: RuleSeverity,
    source: string,
    passDescription: string,
    failDescription: string,
  ): AccessibilityAuditItem => ({
    id,
    title,
    description: passed ? passDescription : failDescription,
    weight,
    passed,
    scope: 'course',
    severity,
    source,
    affected: [],
  })

  const tts = item(
    'tts',
    'Text-to-speech available',
    settings.supports_tts,
    20,
    'required',
    'WCAG 2.2 — 1.4.5 Images of Text',
    'Learners can listen to any lesson in this course instead of reading it.',
    'Text-to-speech is off, so every lesson in this course is reading-only.',
  )
  const focusMode = item(
    'focus_mode',
    'Focus mode available',
    settings.supports_focus_mode,
    20,
    'required',
    'WCAG 2.2 — 2.2.4 Interruptions',
    'Learners can strip the interface back to just the lesson.',
    'Focus mode is off at course level, so the per-lesson toggles have no effect.',
  )
  const chunked = item(
    'chunked_content',
    'Chunked learning available',
    settings.supports_chunked_learning,
    15,
    'required',
    'W3C COGA — Pattern 4.2: Chunk information',
    'Lessons can be delivered in segments rather than one long scroll.',
    'Chunked learning is off at course level, so lessons arrive as a single block.',
  )
  const streaks = item(
    'gamification',
    'Learning streaks',
    settings.learning_streaks_enabled,
    10,
    'recommended',
    'W3C COGA — Objective 7: Help users maintain motivation',
    'Streaks are on, which supports building a consistent study habit.',
    'Streaks are off. Turning them on helps learners return day to day.',
  )
  const chapters = item(
    'hierarchy',
    'Chapter organisation',
    settings.chapter_organization_enabled,
    15,
    'recommended',
    'WCAG 2.2 — 2.4.10 Section Headings',
    'Lessons are grouped into chapters, so the course shape is visible.',
    'Chapters are off, so the course reads as a flat list of lessons.',
  )
  const guide = item(
    'custom_guides',
    'Support guidance recorded',
    Boolean(settings.educator_custom_guide?.trim()) || anyLessonHasNotes,
    10,
    'recommended',
    'W3C COGA — Objective 8: Support adaptation',
    'Course or lesson notes record how this material should be supported.',
    'No support guidance recorded. Anyone else delivering this course has to guess.',
  )

  switch (focus) {
    case 'adhd':
      return [focusMode, chunked, streaks, guide]
    case 'autism':
      return [chapters, tts, guide]
    case 'dyslexia':
      return [tts, chapters, guide]
    default:
      return [tts, focusMode, guide]
  }
}

/** Maps a lessons row onto the engine's input shape. */
function toAuditSubject(row: Record<string, unknown>, activityCount: number): LessonAuditSubject {
  const str = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    title: str(row.title),
    content_html: str(row.content_html),
    video_url: str(row.video_url),
    transcript: str(row.transcript),
    estimated_duration: typeof row.estimated_duration === 'number' ? row.estimated_duration : 0,
    learning_objectives: str(row.learning_objectives),
    accessibility_notes: str(row.accessibility_notes),
    simplified_summary: str(row.simplified_summary),
    focus_mode_enabled: !!row.focus_mode_enabled,
    chunked_content_enabled: !!row.chunked_content_enabled,
    has_summary_activity: !!row.has_summary_activity,
    has_quiz: !!row.has_quiz,
    interactiveCount: activityCount,
    videoQuestionCount: 0,
    // Video length is only known in the browser once the player reports it, so
    // duration-based video rules resolve to not_applicable in this context.
    videoSeconds: null,
  }
}

/**
 * Audits a whole course: the course-level switches, plus every lesson run
 * through the same engine the lesson editor uses.
 */
export async function calculateAccessibilityCompliance(
  courseId: string,
): Promise<AccessibilityAuditReport> {
  const settings = await fetchCourseAccessibilitySettings(courseId)
  const focus = resolveFocus(settings.primary_disability_focus)

  // Every lesson, not just published ones. Filtering to published meant a
  // course made entirely of drafts reported 100% against zero lessons.
  const { data: lessonRows, error: lessonError } = await supabase
    .from('lessons')
    .select(
      `id, title, status, content_html, transcript, video_url, estimated_duration,
       learning_objectives, accessibility_notes, simplified_summary,
       focus_mode_enabled, chunked_content_enabled, has_video, has_transcript,
       has_summary_activity, has_h5p, has_quiz`,
    )
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })

  if (lessonError) throw lessonError
  const lessons = lessonRows ?? []

  // Interactive activity counts, so the "something to do" rule can see them.
  const activityCounts = new Map<string, number>()
  if (lessons.length > 0) {
    const { data: activities } = await supabase
      .from('lesson_interactive_content')
      .select('lesson_id')
      .in(
        'lesson_id',
        lessons.map((lesson) => lesson.id),
      )
    for (const row of activities ?? []) {
      const key = row.lesson_id as string
      activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1)
    }
  }

  const anyLessonHasNotes = lessons.some((lesson) =>
    Boolean((lesson.accessibility_notes as string | null)?.trim()),
  )
  const courseChecks = courseLevelChecks(settings, focus, anyLessonHasNotes)

  // Run the shared engine once per lesson.
  const results = lessons.map((lesson) => ({
    lesson,
    result: auditLesson(
      toAuditSubject(lesson as Record<string, unknown>, activityCounts.get(lesson.id) ?? 0),
      focus,
      settings,
    ),
  }))

  const perLesson: AccessibilityLessonScore[] = results.map(({ lesson, result }) => ({
    id: lesson.id as string,
    title: (lesson.title as string) ?? 'Untitled lesson',
    status: (lesson.status as string) ?? 'draft',
    score: result.score,
    passed: result.passed,
    applicable: result.applicable,
    failures: result.failures.length,
    requiredFailures: result.requiredFailures.length,
  }))

  // Roll each rule up across lessons: one row per rule, listing the lessons
  // that still fail it. A rule that is not applicable anywhere is dropped.
  const lessonChecks: AccessibilityAuditItem[] = []
  const ruleOrder: string[] = []
  const byRule = new Map<
    string,
    {
      title: string
      weight: number
      severity: RuleSeverity
      source: string
      requirement: string
      applicable: number
      passed: number
      affected: { id: string; title: string; detail: string }[]
    }
  >()

  for (const { lesson, result } of results) {
    for (const rule of result.rules) {
      if (rule.status === 'not_applicable') continue
      if (!byRule.has(rule.id)) {
        ruleOrder.push(rule.id)
        byRule.set(rule.id, {
          title: rule.title,
          weight: rule.weight,
          severity: rule.severity,
          source: rule.source,
          requirement: rule.requirement,
          applicable: 0,
          passed: 0,
          affected: [],
        })
      }
      const bucket = byRule.get(rule.id)!
      bucket.applicable += 1
      if (rule.status === 'pass') bucket.passed += 1
      else
        bucket.affected.push({
          id: lesson.id as string,
          title: (lesson.title as string) ?? 'Untitled lesson',
          detail: rule.detail,
        })
    }
  }

  for (const ruleId of ruleOrder) {
    const bucket = byRule.get(ruleId)!
    const passed = bucket.passed === bucket.applicable
    lessonChecks.push({
      id: `lesson_${ruleId}`,
      title: bucket.title,
      description: passed
        ? `${bucket.requirement} All ${bucket.applicable} applicable lesson${bucket.applicable === 1 ? '' : 's'} meet this.`
        : `${bucket.passed} of ${bucket.applicable} lessons meet this. Still to fix: ${bucket.affected
            .slice(0, 3)
            .map((entry) => entry.title)
            .join(', ')}${bucket.affected.length > 3 ? ` and ${bucket.affected.length - 3} more` : ''}.`,
      weight: bucket.weight,
      passed,
      scope: 'lessons',
      severity: bucket.severity,
      source: bucket.source,
      affected: bucket.affected,
    })
  }

  const checks = [...courseChecks, ...lessonChecks]

  // Weighted over everything that applies. Course settings and lesson rules
  // share one scale so the headline number reflects both.
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0)
  const earnedWeight = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0)

  return {
    score: totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100),
    focus,
    passedCount: checks.filter((check) => check.passed).length,
    totalCount: checks.length,
    checks,
    courseChecks,
    lessonChecks,
    perLesson,
    lessonCount: lessons.length,
    empty: lessons.length === 0,
  }
}
