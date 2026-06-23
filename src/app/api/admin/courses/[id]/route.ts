import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await context.params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

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
  } catch (error: any) {
    console.error('Error fetching admin course:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
