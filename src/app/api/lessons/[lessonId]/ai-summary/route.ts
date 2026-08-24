import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import {
  callGemini,
  hashContent,
  buildSummaryPrompt,
  buildAccessibilityHints,
  parseSummaryAndQuestions,
} from '@/lib/gemini'

export const runtime = 'nodejs'

async function checkLessonAccess(lessonId: string) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lesson) {
    return { error: NextResponse.json({ error: 'Lesson not found or not accessible' }, { status: 404 }) }
  }

  return { supabase, user }
}

export async function GET(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params
    const access = await checkLessonAccess(lessonId)
    if (access.error) return access.error

    const { data: cached } = await access.supabase
      .from('lesson_ai_summaries')
      .select('summary, suggested_questions, updated_at')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    return NextResponse.json({
      summary: cached?.summary ?? null,
      suggestedQuestions: cached?.suggested_questions ?? [],
      cached: true,
      updated_at: cached?.updated_at,
    })
  } catch (err) {
    console.error('Fetch lesson AI summary error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params
    const access = await checkLessonAccess(lessonId)
    if (access.error) return access.error

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI assistant is not configured on this server' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const accessibilityHints = buildAccessibilityHints({
      ageGroup: body.ageGroup,
      readingLevel: body.readingLevel,
      simplifiedUi: body.simplifiedUi,
    })

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: lesson, error: lessonError } = await admin
      .from('lessons')
      .select('id, title, content_html, transcript, course_id')
      .eq('id', lessonId)
      .maybeSingle()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found or not accessible' }, { status: 404 })
    }

    const contentHash = hashContent(`${lesson.content_html || ''}|${lesson.transcript || ''}`)

    const { data: existing } = await admin
      .from('lesson_ai_summaries')
      .select('summary, suggested_questions, source_content_hash, updated_at')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (existing && existing.source_content_hash === contentHash) {
      return NextResponse.json({
        summary: existing.summary,
        suggestedQuestions: existing.suggested_questions ?? [],
        cached: true,
        updated_at: existing.updated_at,
      })
    }

    const { data: siblingLessons } = await admin
      .from('lessons')
      .select('title, sequence_order')
      .eq('course_id', lesson.course_id)
      .neq('id', lessonId)
      .eq('status', 'published')
      .order('sequence_order', { ascending: true })

    const { systemInstruction, userPrompt } = buildSummaryPrompt(
      { title: lesson.title, contentHtml: lesson.content_html || '', transcript: lesson.transcript },
      siblingLessons || [],
      accessibilityHints
    )

    let raw: string
    try {
      raw = await callGemini({ systemInstruction, userPrompt })
    } catch (err) {
      console.error('Gemini summary generation error:', err)
      return NextResponse.json({ error: 'Failed to generate summary, please try again' }, { status: 502 })
    }

    const { summary, suggestedQuestions } = parseSummaryAndQuestions(raw)
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'

    const { data: saved, error: upsertError } = await admin
      .from('lesson_ai_summaries')
      .upsert(
        {
          lesson_id: lessonId,
          summary,
          suggested_questions: suggestedQuestions,
          source_content_hash: contentHash,
          model,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id' }
      )
      .select('summary, suggested_questions, updated_at')
      .single()

    if (upsertError) throw upsertError

    return NextResponse.json({
      summary: saved.summary,
      suggestedQuestions: saved.suggested_questions ?? [],
      cached: false,
      updated_at: saved.updated_at,
    })
  } catch (err) {
    console.error('Generate lesson AI summary error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
