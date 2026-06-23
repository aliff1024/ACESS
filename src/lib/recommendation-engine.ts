import { createClient } from '@supabase/supabase-js'

interface RecInput {
  enrollment_id: string
  course_id: string
  course_title: string
  category: string | null
  tags: string[]
  total_lessons: number
  completed_count: number
  lessons: { id: string; title: string; sequence_order: number }[]
  viewed_lesson_ids: Set<string>
  failed_quiz_lesson_ids: Map<string, number>
}

export interface GeneratedRec {
  enrollment_id: string
  recommended_lesson_id: string
  difficulty_tier: 'revision' | 'standard' | 'advanced'
  trigger_reason: string
}

function buildRecsForCourse(input: RecInput): GeneratedRec[] {
  const recs: GeneratedRec[] = []
  const { enrollment_id, course_title, lessons, viewed_lesson_ids, failed_quiz_lesson_ids, completed_count, total_lessons } = input

  const progress = total_lessons > 0 ? Math.round((completed_count / total_lessons) * 100) : 0

  for (const lesson of lessons) {
    const score = failed_quiz_lesson_ids.get(lesson.id)
    if (score !== undefined) {
      recs.push({
        enrollment_id,
        recommended_lesson_id: lesson.id,
        difficulty_tier: 'revision',
        trigger_reason: `You scored ${score}% on the "${lesson.title}" quiz. Review the material and try again.`,
      })
    }
  }

  const nextLesson = lessons.find((l) => !viewed_lesson_ids.has(l.id))
  if (nextLesson && !failed_quiz_lesson_ids.has(nextLesson.id)) {
    recs.push({
      enrollment_id,
      recommended_lesson_id: nextLesson.id,
      difficulty_tier: 'standard',
      trigger_reason: `Continue your learning — "${nextLesson.title}" is up next in ${course_title}.`,
    })
  }

  if (progress >= 80 && lessons.length > 0) {
    recs.push({
      enrollment_id,
      recommended_lesson_id: lessons[lessons.length - 1].id,
      difficulty_tier: 'advanced',
      trigger_reason: `You're almost done with ${course_title}! Review the final lesson to reinforce your knowledge.`,
    })
  }

  return recs
}

export async function generateRecommendations(userId: string): Promise<void> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Get user's active enrollments
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('id, course_id')
    .eq('user_id', userId)
    .neq('status', 'dropped')

  if (!enrollments?.length) return

  const enrollmentIds = enrollments.map((e: { id: string }) => e.id)
  const enrolledCourseIds = enrollments.map((e: { course_id: string }) => e.course_id)

  // 2. Get enrolled courses with tags and lessons
  const { data: courses } = await admin
    .from('courses')
    .select(`
      id, title, category, tags,
      lessons(id, title, sequence_order)
    `)
    .in('id', enrolledCourseIds)

  if (!courses?.length) return

  // 3. Get lesson progress
  const { data: lessonProgress } = await admin
    .from('lesson_progress')
    .select('enrollment_id, lesson_id, is_viewed')
    .in('enrollment_id', enrollmentIds)

  const viewedMap = new Map<string, Set<string>>()
  for (const lp of lessonProgress || []) {
    if (!lp.is_viewed) continue
    const set = viewedMap.get(lp.enrollment_id) || new Set()
    set.add(lp.lesson_id)
    viewedMap.set(lp.enrollment_id, set)
  }

  // 4. Get quiz attempts
  const allLessonIds = courses.flatMap(
    (c: { lessons: { id: string }[] }) => c.lessons?.map((l: { id: string }) => l.id) || []
  )

  const { data: quizzes } = await admin
    .from('quizzes')
    .select('id, lesson_id')
    .in('lesson_id', allLessonIds)

  const quizIds = (quizzes || []).map((q: { id: string }) => q.id)
  const quizToLesson = new Map<string, string>()
  for (const q of quizzes || []) {
    quizToLesson.set(q.id, q.lesson_id)
  }

  const { data: attempts } = await admin
    .from('quiz_attempts')
    .select('enrollment_id, quiz_id, score_pct, result')
    .in('enrollment_id', enrollmentIds)
    .in('quiz_id', quizIds)
    .eq('result', 'fail')

  const failedQuizMap = new Map<string, Map<string, number>>()
  for (const a of attempts || []) {
    const lessonId = quizToLesson.get(a.quiz_id)
    if (!lessonId) continue
    const map = failedQuizMap.get(a.enrollment_id) || new Map()
    const existing = map.get(lessonId) ?? 100
    if ((a.score_pct ?? 0) < existing) {
      map.set(lessonId, a.score_pct ?? 0)
    }
    failedQuizMap.set(a.enrollment_id, map)
  }

  // 5. Collect user's tag/category profile
  const allUserTags = new Set<string>()
  const userCategories = new Set<string>()
  for (const c of courses || []) {
    for (const tag of c.tags || []) {
      allUserTags.add(tag)
    }
    if (c.category) userCategories.add(c.category)
  }

  // 6. Generate per-enrollment recommendations
  const allRecs: GeneratedRec[] = []

  for (const enrollment of enrollments || []) {
    const course = (courses || []).find((c: { id: string }) => c.id === enrollment.course_id)
    if (!course) continue

    const lessons = (course.lessons || [])
      .filter((l: { sequence_order: number }) => l.sequence_order != null)
      .sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order)

    if (lessons.length === 0) continue

    const viewedSet = viewedMap.get(enrollment.id) || new Set()
    const failedSet = failedQuizMap.get(enrollment.id) || new Map()

    const input: RecInput = {
      enrollment_id: enrollment.id,
      course_id: course.id,
      course_title: course.title,
      category: course.category,
      tags: course.tags || [],
      total_lessons: lessons.length,
      completed_count: viewedSet.size,
      lessons,
      viewed_lesson_ids: viewedSet,
      failed_quiz_lesson_ids: failedSet,
    }

    allRecs.push(...buildRecsForCourse(input))
  }

  // 7. Cross-course recommendations
  const { data: allCourseIds } = await admin
    .from('courses')
    .select('id')
    .eq('status', 'published')
    .is('deleted_at', null)

  const allPublishedIds = (allCourseIds || []).map((c: { id: string }) => c.id)
  const unenrolledIds = allPublishedIds.filter((id: string) => !enrolledCourseIds.includes(id))

  if (unenrolledIds.length > 0 && (allUserTags.size > 0 || userCategories.size > 0)) {
    const { data: unenrolled } = await admin
      .from('courses')
      .select(`
        id, title, category, tags,
        lessons(id, title, sequence_order)
      `)
      .in('id', unenrolledIds)

    const scored: { course: typeof unenrolled[0]; score: number }[] = []

    for (const c of unenrolled || []) {
      let score = 0
      const courseTags = c.tags || []
      for (const tag of courseTags) {
        if (allUserTags.has(tag)) score += 2
      }
      if (c.category && userCategories.has(c.category)) score += 1
      if (score > 0) scored.push({ course: c, score })
    }

    scored.sort((a, b) => b.score - a.score)

    for (const { course } of scored.slice(0, 2)) {
      const xLessons = (course.lessons || [])
        .filter((l: { sequence_order: number }) => l.sequence_order != null)
        .sort((a: { sequence_order: number }, b: { sequence_order: number }) => a.sequence_order - b.sequence_order)

      if (xLessons.length === 0) continue

      const matchTags = (course.tags || [])
        .filter((t: string) => allUserTags.has(t))

      const reason = matchTags.length > 0
        ? `Based on your interest in "${matchTags[0]}", check out "${course.title}"`
        : `You might enjoy "${course.title}" — it covers similar topics to your current courses`

      allRecs.push({
        enrollment_id: enrollmentIds[0],
        recommended_lesson_id: xLessons[0].id,
        difficulty_tier: 'advanced',
        trigger_reason: reason,
      })
    }
  }

  // 8. Replace old recommendations
  if (allRecs.length > 0) {
    await admin
      .from('recommendations')
      .delete()
      .in('enrollment_id', enrollmentIds)

    const batchSize = 10
    for (let i = 0; i < allRecs.length; i += batchSize) {
      const batch = allRecs.slice(i, i + batchSize)
      await admin.from('recommendations').insert(batch)
    }
  }
}
