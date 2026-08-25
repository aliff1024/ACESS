import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id: courseId } = await context.params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [courseResult, lessonsResult, categoriesResult, enrollmentsResult, certsResult] = await Promise.all([
      supabase
        .from('courses')
        .select(`
          id, title, description, status, course_type, difficulty_level, category,
          thumbnail_url, created_at, updated_at, published_at, certificate_enabled,
          certificate_settings, certification_locked, created_by,
          primary_disability_focus, secondary_disability_focuses, target_reading_age,
          supports_tts, supports_transcripts, supports_focus_mode, supports_chunked_learning,
          creator:created_by (id, full_name, email)
        `)
        .eq('id', courseId)
        .is('deleted_at', null)
        .maybeSingle(),

      supabase
        .from('lessons')
        .select(`
          id, title, sequence_order, status, lesson_type, estimated_duration,
          video_url, content_html, transcript, simplified_summary,
          focus_mode_enabled, chunked_content_enabled, has_video, has_pdf, has_quiz
        `)
        .eq('course_id', courseId)
        .order('sequence_order', { ascending: true }),

      supabase
        .from('course_accessibility_categories')
        .select('accessibility_category')
        .eq('course_id', courseId),

      supabase
        .from('enrollments')
        .select('id, status, enrolled_at, completed_at')
        .eq('course_id', courseId),

      supabase
        .from('certificates')
        .select('id')
        .eq('course_id', courseId)
        .eq('status', 'issued'),
    ]);

    if (courseResult.error) throw courseResult.error;
    if (lessonsResult.error) throw lessonsResult.error;

    if (!courseResult.data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const lessons = lessonsResult.data || [];
    const lessonIds = lessons.map((l: any) => l.id);

    const quizMap = new Map<string, any>();
    const assetsByLesson = new Map<string, any[]>();
    const interactiveByLesson = new Map<string, any[]>();
    const videoQuestionsByLesson = new Map<string, any[]>();
    const checkpointsByLesson = new Map<string, any[]>();

    if (lessonIds.length > 0) {
      const [
        { data: quizzes },
        { data: assets },
        { data: questions },
        { data: interactiveItems },
        { data: videoQuestions },
        { data: checkpoints },
      ] = await Promise.all([
        supabase.from('quizzes').select('id, lesson_id, title, passing_score').in('lesson_id', lessonIds),
        supabase.from('media_assets').select('id, lesson_id, file_name, file_url, asset_type, file_size').in('lesson_id', lessonIds),
        supabase.from('quiz_questions').select('id, quiz_id, question, question_type, explanation, sequence_order, options:quiz_options(id, option_text, is_correct)'),
        supabase.from('lesson_interactive_content').select('id, lesson_id, title, content_type, data').in('lesson_id', lessonIds),
        supabase.from('video_questions').select('id, lesson_id, timestamp_seconds, question_text, options').in('lesson_id', lessonIds),
        supabase.from('lesson_checkpoints').select('id, lesson_id, title, description, sequence_order').in('lesson_id', lessonIds),
      ]);

      // Map assets
      for (const a of assets || []) {
        const list = assetsByLesson.get(a.lesson_id) || [];
        list.push(a);
        assetsByLesson.set(a.lesson_id, list);
      }

      // Map interactive content
      for (const item of interactiveItems || []) {
        const list = interactiveByLesson.get(item.lesson_id) || [];
        list.push(item);
        interactiveByLesson.set(item.lesson_id, list);
      }

      // Map video questions
      for (const vq of videoQuestions || []) {
        const list = videoQuestionsByLesson.get(vq.lesson_id) || [];
        list.push(vq);
        videoQuestionsByLesson.set(vq.lesson_id, list);
      }

      // Map checkpoints
      for (const cp of checkpoints || []) {
        const list = checkpointsByLesson.get(cp.lesson_id) || [];
        list.push(cp);
        checkpointsByLesson.set(cp.lesson_id, list);
      }

      // Map quiz questions
      const questionCountByQuiz = new Map<string, number>();
      const questionsByQuiz = new Map<string, any[]>();
      for (const q of questions || []) {
        questionCountByQuiz.set(q.quiz_id, (questionCountByQuiz.get(q.quiz_id) || 0) + 1);
        const list = questionsByQuiz.get(q.quiz_id) || [];
        list.push(q);
        questionsByQuiz.set(q.quiz_id, list);
      }

      for (const q of quizzes || []) {
        quizMap.set(q.lesson_id, {
          id: q.id,
          title: q.title,
          passing_score: q.passing_score,
          question_count: questionCountByQuiz.get(q.id) || 0,
          questions: (questionsByQuiz.get(q.id) || []).sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)),
        });
      }
    }

    const mappedLessons = lessons.map((l: any) => {
      const quizInfo = quizMap.get(l.id);
      const lessonAssets = assetsByLesson.get(l.id) || [];
      const interactiveItems = interactiveByLesson.get(l.id) || [];
      const videoQuestions = videoQuestionsByLesson.get(l.id) || [];
      const checkpoints = (checkpointsByLesson.get(l.id) || []).sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));

      return {
        id: l.id,
        title: l.title,
        sequence_order: l.sequence_order,
        status: l.status,
        lesson_type: l.lesson_type || 'standard',
        estimated_duration: l.estimated_duration,
        video_url: l.video_url || null,
        content_html: l.content_html || null,
        transcript: l.transcript || null,
        simplified_summary: l.simplified_summary || null,
        focus_mode_enabled: l.focus_mode_enabled ?? true,
        chunked_content_enabled: l.chunked_content_enabled ?? true,
        has_video: l.has_video || !!l.video_url,
        has_pdf: l.has_pdf || lessonAssets.some((a: any) => a.asset_type === 'pdf'),
        has_quiz: l.has_quiz || !!quizInfo,
        quiz: quizInfo || null,
        assets: lessonAssets,
        assets_count: lessonAssets.length,
        interactive_items: interactiveItems,
        video_questions: videoQuestions,
        checkpoints: checkpoints,
      };
    });

    const categories = (categoriesResult.data || []).map((r: any) => r.accessibility_category);
    const enrollments = enrollmentsResult.data || [];
    const completedCount = enrollments.filter((e) => e.status === 'completed' || !!e.completed_at).length;
    const certsCount = (certsResult.data || []).length;

    const stats = {
      totalEnrollments: enrollments.length,
      completedEnrollments: completedCount,
      completionRate: enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0,
      certificatesIssued: certsCount,
      totalLessons: mappedLessons.length,
      publishedLessons: mappedLessons.filter((l) => l.status === 'published').length,
    };

    return NextResponse.json({
      course: courseResult.data,
      lessons: mappedLessons,
      categories,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching admin course:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch course' }, { status: 500 });
  }
}
