import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { callGemini, buildChatSystemPrompt, buildAccessibilityHints, type ChatHistoryTurn } from '@/lib/gemini'

export const runtime = 'nodejs'

const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY_TURNS = 10

export async function POST(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title, content_html, transcript, course_id, courses(title)')
      .eq('id', lessonId)
      .maybeSingle()

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found or not accessible' }, { status: 404 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI assistant is not configured on this server' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const message: string = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    const history: ChatHistoryTurn[] = Array.isArray(body.history)
      ? body.history
          .filter((h: unknown): h is ChatHistoryTurn =>
            !!h && typeof h === 'object' && (h as ChatHistoryTurn).role !== undefined && typeof (h as ChatHistoryTurn).content === 'string'
          )
          .slice(-MAX_HISTORY_TURNS)
      : []

    const accessibilityHints = buildAccessibilityHints({
      ageGroup: body.ageGroup,
      readingLevel: body.readingLevel,
      simplifiedUi: body.simplifiedUi,
    })

    const { data: siblingLessons } = await supabase
      .from('lessons')
      .select('title, sequence_order, lesson_ai_summaries(summary)')
      .eq('course_id', lesson.course_id)
      .neq('id', lessonId)
      .eq('status', 'published')
      .order('sequence_order', { ascending: true })

    const courseTitle = Array.isArray(lesson.courses) ? lesson.courses[0]?.title : (lesson.courses as { title: string } | null)?.title

    const { systemInstruction, userPrompt } = buildChatSystemPrompt(
      { title: lesson.title, contentHtml: lesson.content_html || '', transcript: lesson.transcript },
      courseTitle || 'this course',
      (siblingLessons || []).map((s) => ({
        title: s.title,
        sequence_order: s.sequence_order,
        summary: Array.isArray(s.lesson_ai_summaries) ? s.lesson_ai_summaries[0]?.summary : (s.lesson_ai_summaries as { summary: string } | null)?.summary,
      })),
      history,
      message,
      accessibilityHints
    )

    let reply: string
    try {
      reply = await callGemini({ systemInstruction, userPrompt })
    } catch (err) {
      console.error('Gemini chat error:', err)
      return NextResponse.json({ error: 'Failed to get a response, please try again' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Lesson AI chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
