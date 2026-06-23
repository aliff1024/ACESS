import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (id) {
      const courseId = id
      const [courseResult, lessonsResult, categoriesResult] = await Promise.all([
        supabase
          .from('courses')
          .select(`
            id, title, description, status, difficulty_level, category,
            thumbnail_url, created_at, updated_at, certificate_enabled,
            certificate_settings, certification_locked,
            primary_disability_focus, secondary_disability_focuses, target_reading_age
          `)
          .eq('id', courseId)
          .is('deleted_at', null)
          .maybeSingle(),
        
        supabase
          .from('lessons')
          .select('id, title, sequence_order, status, video_url, content_html')
          .eq('course_id', courseId)
          .order('sequence_order', { ascending: true }),

        supabase
          .from('course_accessibility_categories')
          .select('accessibility_category')
          .eq('course_id', courseId)
      ])

      if (courseResult.error) throw courseResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      const lessons = lessonsResult.data || []
      const lessonIds = lessons.map((l: any) => l.id)

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

      const mappedLessons = lessons.map((l: any) => ({
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

      const cats = (categoriesResult.data || []).map((r: any) => r.accessibility_category)

      return NextResponse.json({
        course: courseResult.data,
        lessons: mappedLessons,
        categories: cats
      })
    }

    // 1. Fetch Educator Courses
    const { data: educatorData, error: educatorError } = await supabase
      .from('courses')
      .select('id, title, description, status, created_by, created_at, thumbnail_url, course_type')
      .eq('course_type', 'educator')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      
    if (educatorError) throw educatorError;

    // 2. Fetch System Courses
    const { data: systemData, error: systemError } = await supabase
      .from('courses')
      .select('id, title, description, status, created_at, thumbnail_url, course_type, system_course, built_in_course, created_by_role, guided_learning_enabled, recommended_age_group, official_course_order, managed_by_admin, created_by')
      .eq('course_type', 'system')
      .is('deleted_at', null)
      .order('official_course_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      
    if (systemError) throw systemError;

    // Map all creator IDs to fetch user names
    const allCreatorIds = [
      ...(educatorData || []).map(c => c.created_by),
      ...(systemData || []).map(c => c.created_by)
    ].filter(Boolean)
    
    const uniqueCreatorIds = [...new Set(allCreatorIds)]
    const userMap = new Map<string, { name: string, email: string }>()
    
    if (uniqueCreatorIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', uniqueCreatorIds)
        
      for (const u of usersData || []) {
        userMap.set(u.id, { name: u.full_name || 'Admin', email: u.email || '' })
      }
    }

    // Enrich Educator Courses
    const enrichedEducator = (educatorData || []).map(c => ({
      ...c,
      creator_name: userMap.get(c.created_by)?.name || 'Unknown',
      creator_email: userMap.get(c.created_by)?.email || '',
    }))

    // System Stats & Enrich System Courses
    const systemCourseIds = (systemData || []).map(c => c.id)
    const enrollCounts = new Map<string, number>()
    let totalEnrollments = 0
    let activeLearners = 0
    const enrollStats: { title: string; enrollments: number }[] = []

    if (systemCourseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .in('course_id', systemCourseIds)
        
      for (const e of enrollments || []) {
        enrollCounts.set(e.course_id, (enrollCounts.get(e.course_id) || 0) + 1)
        if (e.status === 'active') activeLearners++
      }
      totalEnrollments = enrollments?.length ?? 0
      
      for (const c of systemData || []) {
        const cnt = enrollCounts.get(c.id) || 0
        if (cnt > 0) {
          enrollStats.push({ title: c.title, enrollments: cnt })
        }
      }
      enrollStats.sort((a, b) => b.enrollments - a.enrollments)
    }

    const enrichedSystem = (systemData || []).map(c => ({
      ...c,
      creator_name: userMap.get(c.created_by)?.name || 'System Admin',
      total_enrollments: enrollCounts.get(c.id) || 0,
    }))

    const systemStats = {
      totalSystemCourses: systemCourseIds.length,
      totalEnrollments,
      activeLearners,
      mostEnrolled: enrollStats.slice(0, 5),
    }

    return NextResponse.json({
      educatorCourses: enrichedEducator,
      systemCourses: enrichedSystem,
      systemStats
    })
  } catch (error: any) {
    console.error('Error fetching admin courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
