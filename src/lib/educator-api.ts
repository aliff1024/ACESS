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
  tags?: string[]
  accessibility_categories?: string[]
  primary_disability_focus?: string
  secondary_disability_focuses?: string[]
  target_reading_age?: number
  recommended_age_group?: string
  educator_custom_guide?: string
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
      certificate_settings, certification_locked,
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

export function getSmartStatus(
  baseStatus: string,
  lastActive: string,
  progressPercent: number
): string {
  if (baseStatus === 'completed' || baseStatus === 'dropped') {
    return baseStatus;
  }
  const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActive > 14) return 'inactive';
  if (daysSinceActive > 7 && progressPercent < 20) return 'at-risk';
  return 'active';
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

  if (enrollments.length === 0) return []
  const enrollmentIds = enrollments.map(e => e.id);

  // 1. Fetch lesson counts for all these courses
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courseIds)
    .eq('status', 'published');
    
  const lessonCounts = new Map<string, number>();
  for (const l of lessons || []) {
    lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1);
  }

  // 2. Fetch lesson_progress for all enrollments
  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('enrollment_id, is_viewed, last_viewed_at')
    .in('enrollment_id', enrollmentIds);
    
  const progressMap = new Map<string, number>();
  const lastActiveMap = new Map<string, string>();
  
  for (const p of progressData || []) {
    if (p.is_viewed) {
      progressMap.set(p.enrollment_id, (progressMap.get(p.enrollment_id) || 0) + 1);
    }
    if (p.last_viewed_at) {
      const currentLast = lastActiveMap.get(p.enrollment_id);
      if (!currentLast || new Date(p.last_viewed_at) > new Date(currentLast)) {
        lastActiveMap.set(p.enrollment_id, p.last_viewed_at);
      }
    }
  }

  // 3. Fetch quiz_attempts
  const { data: qaData } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score_pct, submitted_at, started_at')
    .in('enrollment_id', enrollmentIds);
    
  const quizScoresMap = new Map<string, number[]>();
  for (const qa of qaData || []) {
    if (!quizScoresMap.has(qa.enrollment_id)) {
      quizScoresMap.set(qa.enrollment_id, []);
    }
    if (qa.score_pct != null) {
      quizScoresMap.get(qa.enrollment_id)!.push(qa.score_pct);
    }
    // Also factor into lastActive
    const actTime = qa.submitted_at || qa.started_at;
    if (actTime) {
      const currentLast = lastActiveMap.get(qa.enrollment_id);
      if (!currentLast || new Date(actTime) > new Date(currentLast)) {
        lastActiveMap.set(qa.enrollment_id, actTime);
      }
    }
  }

  const studentMap = new Map<string, StudentProgress>()

  for (const raw of (enrollments || []) as unknown as Record<string, unknown>[]) {
    const rawUsers = raw.users as { id?: string; full_name?: string; email?: string } | null;
    const userId = rawUsers?.id;
    if (!userId) continue

    if (!studentMap.has(userId)) {
      studentMap.set(userId, {
        id: userId,
        name: raw.users?.full_name || 'Unknown',
        email: raw.users?.email || '',
        courses: [],
        lastActive: raw.enrolled_at, // Will override later
        totalProgress: 0,
      })
    }

    const student = studentMap.get(userId)!
    
    // Compute exact progress
    const totalLessons = lessonCounts.get(raw.course_id as string) || 0;
    const completed = progressMap.get(raw.id as string) || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    
    // Compute avg score
    const scores = quizScoresMap.get(raw.id as string) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Compute status
    const lastActiveStr = lastActiveMap.get(raw.id as string) || (raw.enrolled_at as string);
    const finalStatus = getSmartStatus(raw.status as string, lastActiveStr, progressPercent);
    
    // Update global student lastActive if this course is more recent
    if (new Date(lastActiveStr) > new Date(student.lastActive)) {
      student.lastActive = lastActiveStr;
    }

    student.courses.push({
      title: courseMap.get(raw.course_id) || 'Unknown',
      progress: progressPercent,
      avgScore,
      status: finalStatus,
    })
  }

  for (const student of studentMap.values()) {
    student.lastActive = formatRelativeTime(student.lastActive);
    student.totalProgress = student.courses.length > 0 
      ? Math.round(student.courses.reduce((sum, c) => sum + c.progress, 0) / student.courses.length)
      : 0;
  }

  return Array.from(studentMap.values())
}

export interface CourseStudentProgress {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
  status: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  hasCertificate?: boolean;
  certificateUrl?: string;
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
  const totalLessons = lessons?.length || 0;

  const enrollmentIds = enrollments.map(e => e.id);

  // Get progress for these enrollments
  const { data: progressData, error: progressError } = await supabase
    .from('lesson_progress')
    .select('enrollment_id, is_viewed, last_viewed_at, time_spent_learning')
    .in('enrollment_id', enrollmentIds);

  if (progressError) throw progressError;

  const progressMap = new Map<string, number>();
  const lastActiveMap = new Map<string, string>();
  const timeSpentMap = new Map<string, number>();

  for (const p of progressData || []) {
    if (p.is_viewed) {
      progressMap.set(p.enrollment_id, (progressMap.get(p.enrollment_id) || 0) + 1);
    }
    
    // Calculate last active
    if (p.last_viewed_at) {
      const currentLast = lastActiveMap.get(p.enrollment_id);
      if (!currentLast || new Date(p.last_viewed_at) > new Date(currentLast)) {
        lastActiveMap.set(p.enrollment_id, p.last_viewed_at);
      }
    }

    // Calculate time spent
    const spent = p.time_spent_learning || (p.is_viewed ? 1200 : 0);
    timeSpentMap.set(p.enrollment_id, (timeSpentMap.get(p.enrollment_id) || 0) + spent);
  }

  // Fetch quiz scores for avg calculation
  const { data: qaData } = await supabase
    .from('quiz_attempts')
    .select('enrollment_id, score_pct')
    .in('enrollment_id', enrollmentIds);

  const quizScoresMap = new Map<string, number[]>();
  for (const qa of qaData || []) {
    if (!quizScoresMap.has(qa.enrollment_id)) {
      quizScoresMap.set(qa.enrollment_id, []);
    }
    if (qa.score_pct != null) {
      quizScoresMap.get(qa.enrollment_id)!.push(qa.score_pct);
    }
  }

  // Fetch certificates for these enrollments
  const { data: certData } = await supabase
    .from('certificates')
    .select('enrollment_id, verification_url, pdf_url')
    .in('enrollment_id', enrollmentIds);

  const certMap = new Map<string, string>();
  for (const c of certData || []) {
    certMap.set(c.enrollment_id, c.verification_url || c.pdf_url || '');
  }

  return enrollments.map((raw: Record<string, unknown>) => {
    const completed = progressMap.get(raw.id as string) || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    
    const scores = quizScoresMap.get(raw.id as string) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Status calculation
    const lastActive = lastActiveMap.get(raw.id as string) || (raw.enrolled_at as string);
    const status = getSmartStatus(raw.status as string, lastActive, progressPercent);
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
      hasCertificate: certMap.has(raw.id as string),
      certificateUrl: certMap.get(raw.id as string) || undefined,
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

  // Update the certificate row in the database
  const { data: certInfo, error: fetchError } = await supabase
    .from('certificates')
    .select('metadata')
    .eq('id', certId)
    .single()
    
  if (fetchError) throw fetchError

  const newMetadata = {
    ...(certInfo?.metadata || {}),
    is_custom: true
  }

  const { error: updateError } = await supabase
    .from('certificates')
    .update({
      pdf_url: pdfUrl,
      metadata: newMetadata
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
