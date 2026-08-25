import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import {
  buildIndex,
  computeCoursePerformance,
  computeLessonFunnel,
  loadSnapshot,
} from '@/lib/admin-analytics'

/**
 * Administrative performance view for one course: reach, outcomes, the
 * lesson-by-lesson funnel and accessibility coverage.
 *
 * Derived from the shared snapshot, so these figures match the course league
 * table on the Analytics page exactly.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { id } = await context.params

    const snap = await loadSnapshot()
    const index = buildIndex(snap)

    const course = index.courseById.get(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const performance = computeCoursePerformance(snap, index).find((c) => c.id === id)
    const lessons = computeLessonFunnel(id, snap)
    const courseLessons = snap.lessons.filter((l) => l.course_id === id)

    const hasText = (v: string | null) => !!v && v.trim().length > 0

    // Accessibility coverage for this course only. Transcript coverage is
    // derived from actual transcript text — `lessons.has_transcript` is set on
    // every lesson in the database regardless of content, and
    // `lessons.accessibility_score` holds the column default on every row, so
    // neither is reported.
    const accessibility = {
      course: {
        supportsTts: !!course.supports_tts,
        supportsTranscripts: !!course.supports_transcripts,
        supportsFocusMode: !!course.supports_focus_mode,
        supportsChunkedLearning: !!course.supports_chunked_learning,
        primaryDisabilityFocus: course.primary_disability_focus,
        categories: course.accessibility_categories ?? [],
      },
      lessons: {
        total: courseLessons.length,
        published: courseLessons.filter((l) => l.status === 'published').length,
        focusMode: courseLessons.filter((l) => l.focus_mode_enabled).length,
        chunkedContent: courseLessons.filter((l) => l.chunked_content_enabled).length,
        simplifiedSummary: courseLessons.filter((l) => hasText(l.simplified_summary)).length,
        transcriptText: courseLessons.filter((l) => hasText(l.transcript)).length,
        withVideo: courseLessons.filter((l) => l.has_video).length,
        withPdf: courseLessons.filter((l) => l.has_pdf).length,
        withQuiz: courseLessons.filter((l) => l.has_quiz).length,
      },
    }

    // Adaptation events recorded against this course.
    const adaptationCounts = new Map<string, number>()
    for (const a of snap.adaptations) {
      if (a.course_id !== id) continue
      const type = a.adaptation_used.split(':')[0]
      adaptationCounts.set(type, (adaptationCounts.get(type) ?? 0) + 1)
    }

    return NextResponse.json({
      performance,
      lessons,
      accessibility,
      adaptations: Array.from(adaptationCounts, ([type, events]) => ({ type, events })).sort(
        (a, b) => b.events - a.events
      ),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load course performance'
    console.error('Admin course performance error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
