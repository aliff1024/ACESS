import { supabase } from './supabase'
import type { CourseStatus } from './educator-api'

// ─── System Course Types ─────────────────────────────────────────────

export interface SystemCourseFields {
  title: string
  description: string
  difficulty_level: string
  category?: string
  status: CourseStatus
  thumbnail_url?: string
  recommended_age_group?: string
  guided_learning_enabled?: boolean
  tags?: string[]
  accessibility_categories?: string[]
  primary_disability_focus?: string
}

export interface SystemCourseItem {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  thumbnail_url: string | null
  course_type: string
  system_course: boolean
  built_in_course: boolean
  created_by_role: string
  guided_learning_enabled: boolean
  recommended_age_group: string | null
  official_course_order: number | null
  managed_by_admin: boolean
  creator_name?: string
  total_enrollments?: number
}

export interface SystemCourseStats {
  totalSystemCourses: number
  totalEnrollments: number
  activeLearners: number
  mostEnrolled: { title: string; enrollments: number }[]
}

// ─── System Course CRUD ──────────────────────────────────────────────

export async function createSystemCourse(adminId: string, fields: SystemCourseFields) {
  const slug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('courses')
    .insert({
      created_by: adminId,
      title: fields.title,
      slug,
      description: fields.description,
      status: fields.status,
      difficulty_level: fields.difficulty_level,
      category: fields.category || null,
      thumbnail_url: fields.thumbnail_url || null,
      course_type: 'system',
      system_course: true,
      built_in_course: true,
      created_by_role: 'admin',
      managed_by_admin: true,
      guided_learning_enabled: fields.guided_learning_enabled ?? true,
      recommended_age_group: fields.recommended_age_group || null,
      tags: fields.tags || [],
      accessibility_categories: fields.accessibility_categories || [],
      primary_disability_focus: fields.primary_disability_focus || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSystemCourse(courseId: string, fields: Partial<SystemCourseFields & {
  status: CourseStatus
  guided_learning_enabled: boolean
  recommended_age_group: string | null
}>) {
  const { error } = await supabase
    .from('courses')
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('course_type', 'system')

  if (error) throw error
}

export async function archiveSystemCourse(courseId: string) {
  const { error } = await supabase
    .from('courses')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', courseId)
    .eq('course_type', 'system')

  if (error) throw error
}

export async function duplicateSystemCourse(courseId: string): Promise<string> {
  const { data: original, error: fetchError } = await supabase
    .from('courses')
    .select('title, description, difficulty_level, category, thumbnail_url, recommended_age_group, guided_learning_enabled')
    .eq('id', courseId)
    .single()

  if (fetchError) throw fetchError

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const newTitle = `${original.title} (Copy)`
  const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: newCourse, error: insertError } = await supabase
    .from('courses')
    .insert({
      created_by: user.user.id,
      title: newTitle,
      slug,
      description: original.description,
      difficulty_level: original.difficulty_level,
      category: original.category,
      thumbnail_url: original.thumbnail_url,
      status: 'draft',
      course_type: 'system',
      system_course: true,
      built_in_course: true,
      created_by_role: 'admin',
      managed_by_admin: true,
      guided_learning_enabled: original.guided_learning_enabled ?? true,
      recommended_age_group: original.recommended_age_group,
    })
    .select()
    .single()

  if (insertError) throw insertError
  return newCourse.id
}

export async function fetchSystemCourseStats(): Promise<SystemCourseStats> {
  const { count: totalSystemCourses } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('course_type', 'system')
    .is('deleted_at', null)

  const systemCourseIds: string[] = []
  const { data: systemCourses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('course_type', 'system')
    .is('deleted_at', null)
  for (const c of systemCourses || []) {
    systemCourseIds.push(c.id)
  }

  let totalEnrollments = 0
  let activeLearners = 0
  const enrollCounts: { title: string; enrollments: number }[] = []

  if (systemCourseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, status')
      .in('course_id', systemCourseIds)

    const countMap = new Map<string, number>()
    for (const e of enrollments || []) {
      countMap.set(e.course_id, (countMap.get(e.course_id) || 0) + 1)
      if (e.status === 'active') activeLearners++
    }
    totalEnrollments = enrollments?.length ?? 0

    for (const c of systemCourses || []) {
      const cnt = countMap.get(c.id) || 0
      if (cnt > 0) {
        enrollCounts.push({ title: c.title, enrollments: cnt })
      }
    }
    enrollCounts.sort((a, b) => b.enrollments - a.enrollments)
  }

  return {
    totalSystemCourses: totalSystemCourses ?? 0,
    totalEnrollments,
    activeLearners,
    mostEnrolled: enrollCounts.slice(0, 5),
  }
}

export async function fetchSystemCourses(): Promise<SystemCourseItem[]> {
  const { data: coursesData, error } = await supabase
    .from('courses')
    .select('id, title, description, status, created_at, thumbnail_url, course_type, system_course, built_in_course, created_by_role, guided_learning_enabled, recommended_age_group, official_course_order, managed_by_admin, created_by')
    .eq('course_type', 'system')
    .is('deleted_at', null)
    .order('official_course_order', { ascending: true, nullsLast: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  const creatorIds = [...new Set((coursesData || []).map(c => c.created_by).filter(Boolean))]
  const userMap = new Map<string, string>()
  if (creatorIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', creatorIds)
    for (const u of usersData || []) {
      userMap.set(u.id, u.full_name || 'Admin')
    }
  }

  const courseIds = (coursesData || []).map(c => c.id)
  const enrollCounts = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseIds)
    for (const e of enrollments || []) {
      enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) || 0) + 1)
    }
  }

  return (coursesData || []).map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    created_at: c.created_at,
    thumbnail_url: c.thumbnail_url,
    course_type: c.course_type,
    system_course: c.system_course,
    built_in_course: c.built_in_course,
    created_by_role: c.created_by_role,
    guided_learning_enabled: c.guided_learning_enabled,
    recommended_age_group: c.recommended_age_group,
    official_course_order: c.official_course_order,
    managed_by_admin: c.managed_by_admin,
    creator_name: userMap.get(c.created_by) || 'System Admin',
    total_enrollments: enrollCounts.get(c.id) || 0,
  }))
}

export async function fetchAllAdminCourses() {
  const response = await fetch('/api/admin/courses')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch admin courses')
  }
  return response.json()
}

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number
  totalCourses: number
  totalCertificates: number
  activeUsers: number
  newUsersThisMonth: number
  coursesPublishedThisMonth: number
  educatorsCount: number
  learnersCount: number
}

export interface RecentActivity {
  type: 'user_registration' | 'course_submission' | 'certificate_issued'
  user_name: string
  description: string
  created_at: string
}

// ─── Analytics Types ─────────────────────────────────────────────────

export interface AdminAnalytics {
  totalActiveLearners: number
  avgCompletionRate: number
  avgQuizScore: number
  atRiskLearners: number
  totalCourses: number
  totalEducators: number
  totalInteractiveActivities: number
  accessibilityMetrics: {
    screenReaderUsage: number
    keyboardNavigation: number
    highContrastMode: number
  }
}

// ─── Report Types ────────────────────────────────────────────────────

export interface ReportDefinition {
  title: string
  description: string
  frequency: string
  data: Record<string, unknown>[]
}

export interface EngagementData {
  name: string
  users: number
  views: number
}

export async function fetchAdminEngagementData(): Promise<EngagementData[]> {
  try {
    const res = await fetch('/api/admin/engagement');
    if (!res.ok) throw new Error('Failed to fetch engagement data');
    const data = await res.json();
    return data.engagementData || [];
  } catch (error) {
    console.error('Engagement data error:', error);
    return [];
  }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalCertificates },
    { count: activeUsers },
    { count: newUsersThisMonth },
    { count: coursesPublishedThisMonth },
    { count: educatorsCount },
    { count: learnersCount },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('courses').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', firstOfMonth),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', firstOfMonth),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'educator').is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'learner').is('deleted_at', null),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalCourses: totalCourses ?? 0,
    totalCertificates: totalCertificates ?? 0,
    activeUsers: activeUsers ?? 0,
    newUsersThisMonth: newUsersThisMonth ?? 0,
    coursesPublishedThisMonth: coursesPublishedThisMonth ?? 0,
    educatorsCount: educatorsCount ?? 0,
    learnersCount: learnersCount ?? 0,
  }
}

// ─── Recent Activity ─────────────────────────────────────────────────

export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = []

  const { data: recentUsers } = await supabase
    .from('users')
    .select('full_name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const u of recentUsers || []) {
    activities.push({
      type: 'user_registration',
      user_name: u.full_name || 'Unknown',
      description: 'New user registration',
      created_at: u.created_at,
    })
  }

  const { data: recentCourses } = await supabase
    .from('courses')
    .select(`
      title, created_at,
      users!courses_created_by_fkey(full_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const c of recentCourses || []) {
    const usersArr = c.users as { full_name: string } | { full_name: string }[] | null
    const userName = Array.isArray(usersArr) ? usersArr[0]?.full_name : (usersArr as { full_name: string } | null)?.full_name
    activities.push({
      type: 'course_submission',
      user_name: userName || 'Unknown',
      description: `Course submitted: ${c.title}`,
      created_at: c.created_at,
    })
  }

  const { data: recentCerts } = await supabase
    .from('certificates')
    .select(`
      issued_at,
      enrollments!inner(
        users!enrollments_user_id_fkey(full_name)
      )
    `)
    .eq('status', 'issued')
    .order('issued_at', { ascending: false })
    .limit(5)

  for (const c of recentCerts || []) {
    const e = c.enrollments as unknown as { users: { full_name: string } | { full_name: string }[] }
    const userData = e?.users
    const userName = Array.isArray(userData) ? userData[0]?.full_name : (userData as { full_name: string } | null)?.full_name
    activities.push({
      type: 'certificate_issued',
      user_name: userName || 'Unknown',
      description: 'Certificate issued',
      created_at: c.issued_at,
    })
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return activities.slice(0, 10)
}

// ─── Completion Trends ────────────────────────────────────────────────

export interface CompletionTrend {
  month: string
  rate: number
  total: number
  completed: number
}

// CompletionTrends now handled by fetchAllAdminAnalytics

// ─── Enrollment Trends ───────────────────────────────────────────────

export interface EnrollmentTrend {
  month: string
  count: number
}

// EnrollmentTrends now handled by fetchAllAdminAnalytics

// ─── Analytics ───────────────────────────────────────────────────────

export interface DataTrend {
  label: string
  count: number
}

export async function fetchAllAdminAnalytics() {
  const response = await fetch('/api/admin/analytics');
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

// ─── Certificate Management ──────────────────────────────────────────

export interface AdminCertificate {
  id: string
  learner_name: string
  course_title: string
  certificate_code: string
  issued_at: string
  status: string
  revoked_at?: string
}

export async function fetchAdminCertificates(): Promise<AdminCertificate[]> {
  const response = await fetch('/api/admin/certificates');
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch certificates');
  }
  return response.json();
}

export async function revokeCertificate(certId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', certId)
  if (error) throw error
}

// ─── Course Chapters CRUD ──────────────────────────────────────────────

export interface ChapterItem {
  id: string
  course_id: string
  title: string
  description: string | null
  sequence_order: number
  lesson_count?: number
}

export async function fetchChapters(courseId: string): Promise<ChapterItem[]> {
  const { data, error } = await supabase
    .from('course_chapters')
    .select('id, course_id, title, description, sequence_order')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })
  if (error) throw error

  const chapters = data || []
  const chapterIds = chapters.map(c => c.id)
  const countMap = new Map<string, number>()
  if (chapterIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('chapter_id')
      .in('chapter_id', chapterIds)
    for (const l of lessons || []) {
      countMap.set(l.chapter_id, (countMap.get(l.chapter_id) || 0) + 1)
    }
  }
  return chapters.map(c => ({
    ...c,
    lesson_count: countMap.get(c.id) || 0,
  }))
}

export async function createChapter(courseId: string, title: string, description?: string): Promise<ChapterItem> {
  const { data: max } = await supabase
    .from('course_chapters')
    .select('sequence_order')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: false })
    .limit(1)
  const nextOrder = (max?.[0]?.sequence_order ?? -1) + 1

  const { data, error } = await supabase
    .from('course_chapters')
    .insert({ course_id: courseId, title, description: description || null, sequence_order: nextOrder })
    .select()
    .single()
  if (error) throw error
  return { ...data, lesson_count: 0 }
}

export async function updateChapter(chapterId: string, updates: { title?: string; description?: string; sequence_order?: number }): Promise<void> {
  const { error } = await supabase.from('course_chapters').update(updates).eq('id', chapterId)
  if (error) throw error
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await supabase.from('lessons').update({ chapter_id: null }).eq('chapter_id', chapterId)
  const { error } = await supabase.from('course_chapters').delete().eq('id', chapterId)
  if (error) throw error
}

export async function reorderChapters(courseId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from('course_chapters').update({ sequence_order: i }).eq('id', orderedIds[i])
  }
}

// ─── Lesson Templates ─────────────────────────────────────────────────

export interface LessonTemplate {
  id: string
  title: string
  description: string | null
  lesson_type: string
  content_html: string | null
  estimated_duration: number | null
  is_public: boolean
  created_at: string
}

export async function fetchLessonTemplates(): Promise<LessonTemplate[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  const { data, error } = await supabase
    .from('lesson_templates')
    .select('*')
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createLessonTemplate(template: {
  title: string; description?: string; lesson_type?: string; content_html?: string; estimated_duration?: number; is_public?: boolean;
}): Promise<LessonTemplate> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('lesson_templates').insert({
    created_by: userId,
    title: template.title,
    description: template.description || null,
    lesson_type: template.lesson_type || 'standard',
    content_html: template.content_html || null,
    estimated_duration: template.estimated_duration || null,
    is_public: template.is_public ?? false,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteLessonTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('lesson_templates').delete().eq('id', templateId)
  if (error) throw error
}

// ─── Course Milestones ────────────────────────────────────────────────

export interface CourseMilestone {
  id: string
  course_id: string
  title: string
  description: string | null
  required_completion_pct: number
  icon: string | null
  sequence_order: number
}

export async function fetchCourseMilestones(courseId: string): Promise<CourseMilestone[]> {
  const { data, error } = await supabase
    .from('course_milestones')
    .select('*')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCourseMilestone(courseId: string, milestone: {
  title: string; description?: string; required_completion_pct?: number; icon?: string
}): Promise<CourseMilestone> {
  const { data: max } = await supabase
    .from('course_milestones')
    .select('sequence_order')
    .eq('course_id', courseId)
    .order('sequence_order', { ascending: false })
    .limit(1)
  const { data, error } = await supabase.from('course_milestones').insert({
    course_id: courseId,
    title: milestone.title,
    description: milestone.description || null,
    required_completion_pct: milestone.required_completion_pct ?? 100,
    icon: milestone.icon || null,
    sequence_order: (max?.[0]?.sequence_order ?? -1) + 1,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteCourseMilestone(milestoneId: string): Promise<void> {
  const { error } = await supabase.from('course_milestones').delete().eq('id', milestoneId)
  if (error) throw error
}

// ─── Lesson Checkpoints ───────────────────────────────────────────────

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
    required: checkpoint.required ?? false,
    sequence_order: (max?.[0]?.sequence_order ?? -1) + 1,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteLessonCheckpoint(checkpointId: string): Promise<void> {
  const { error } = await supabase.from('lesson_checkpoints').delete().eq('id', checkpointId)
  if (error) throw error
}

export async function updateLessonCheckpoint(checkpointId: string, updates: {
  title?: string; description?: string; checkpoint_type?: string; required?: boolean; completed?: boolean
}): Promise<void> {
  const { error } = await supabase.from('lesson_checkpoints').update(updates).eq('id', checkpointId)
  if (error) throw error
}

// ─── Reports ──────────────────────────────────────────────────────────

// ─── Instructor Application Management ───────────────────────────────

export interface InstructorApplication {
  id: string
  user_id: string | null
  full_name: string
  email: string
  experience: string | null
  reason: string | null
  portfolio_links: string | null
  referral_code: string | null
  status: 'pending' | 'approved' | 'rejected' | 'request_info'
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export async function fetchInstructorApplications(statusFilter?: string): Promise<InstructorApplication[]> {
  let query = supabase
    .from('instructor_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateInstructorApplication(
  applicationId: string,
  updates: {
    status: 'approved' | 'rejected' | 'request_info'
    admin_notes?: string
  }
): Promise<void> {
  const admin = await supabase.auth.getUser()
  const { error } = await supabase
    .from('instructor_applications')
    .update({
      status: updates.status,
      admin_notes: updates.admin_notes || null,
      reviewed_by: admin.data.user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) throw error

  // If approved, update the user's role to educator
  if (updates.status === 'approved') {
    const { data: app } = await supabase
      .from('instructor_applications')
      .select('user_id, email')
      .eq('id', applicationId)
      .single()

    if (app?.user_id) {
      await supabase
        .from('users')
        .update({
          role: 'educator',
          instructor_application_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.user_id)
    }
  }
}

export async function getInstructorApplicationStats() {
  const { data, error } = await supabase
    .from('instructor_applications')
    .select('status')

  if (error) throw error

  const total = data?.length || 0
  const pending = data?.filter(a => a.status === 'pending').length || 0
  const approved = data?.filter(a => a.status === 'approved').length || 0
  const rejected = data?.filter(a => a.status === 'rejected').length || 0

  return { total, pending, approved, rejected }
}

// ─── Contact Messages Management ─────────────────────────────────────

export interface ContactMessage {
  id: string
  name: string
  email: string
  category: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'replied'
  created_at: string
}

export async function fetchContactMessages(statusFilter?: string): Promise<ContactMessage[]> {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateContactMessageStatus(
  messageId: string,
  status: 'read' | 'replied'
): Promise<void> {
  const { error } = await supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', messageId)

  if (error) throw error
}

export async function getContactStats() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('status, category')

  if (error) throw error

  const unread = data?.filter(m => m.status === 'unread').length || 0
  const total = data?.length || 0
  const categories = new Map<string, number>()
  for (const m of data || []) {
    categories.set(m.category, (categories.get(m.category) || 0) + 1)
  }

  return { total, unread, categories: Object.fromEntries(categories) }
}

// ─── Referral Code Management ────────────────────────────────────────

export interface ReferralCode {
  id: string
  code: string
  user_id: string
  usage_count: number
  max_uses: number
  is_active: boolean
  created_at: string
  user_name?: string
}

export async function fetchReferralCodes(): Promise<ReferralCode[]> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*, users!referral_codes_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((r: Record<string, unknown>) => {
    const userData = r.users as { full_name?: string } | null
    return {
      id: r.id as string,
      code: r.code as string,
      user_id: r.user_id as string,
      usage_count: r.usage_count as number,
      max_uses: r.max_uses as number,
      is_active: r.is_active as boolean,
      created_at: r.created_at as string,
      user_name: userData?.full_name || 'Unknown',
    }
  })
}

export async function generateReferralCode(userId: string): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'REF-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  const { error } = await supabase
    .from('referral_codes')
    .insert({ code, user_id: userId })

  if (error) throw error
  return code
}

export async function generateReport(reportType: string): Promise<ReportDefinition> {
  const response = await fetch('/api/admin/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportType }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate report')
  }
  return response.json()
}

export async function generateCustomReport(entity: string, fields: string[]): Promise<ReportDefinition> {
  const response = await fetch('/api/admin/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, fields }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate custom report')
  }
  return response.json()
}

// ─── Course Thumbnails ─────────────────────────────────────────────────

const COURSE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=225&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop',
]

export async function assignCourseThumbnails(): Promise<number> {
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .is('thumbnail_url', null)
    .is('deleted_at', null)

  if (!courses || courses.length === 0) return 0

  for (let i = 0; i < courses.length; i++) {
    const url = COURSE_THUMBNAILS[i % COURSE_THUMBNAILS.length]
    await supabase
      .from('courses')
      .update({ thumbnail_url: url, updated_at: new Date().toISOString() })
      .eq('id', courses[i].id)
  }

  return courses.length
}

// ─── System Health ───────────────────────────────────────────────────

export interface SystemHealthMetrics {
  latencyMs: number;
  databaseStatus: 'Connected' | 'Disconnected';
}

export async function fetchSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  const start = Date.now();
  const { error } = await supabase.from('users').select('id').limit(1);
  const end = Date.now();
  
  return {
    latencyMs: end - start,
    databaseStatus: error ? 'Disconnected' : 'Connected'
  }
}
