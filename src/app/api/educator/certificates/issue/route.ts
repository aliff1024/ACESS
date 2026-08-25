import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentId, courseId } = await request.json();

    if (!enrollmentId || !courseId) {
      return NextResponse.json({ error: 'Missing enrollmentId or courseId' }, { status: 400 });
    }

    // 1. Fetch course details and verify ownership
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, certificate_enabled, certificate_settings, created_by')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Educator must own the course
    if (course.created_by !== user.id) {
      return NextResponse.json({ error: 'You are not authorized to manage certificates for this course' }, { status: 403 });
    }

    // 2. Fetch enrollment details
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('id, user_id, status')
      .eq('id', enrollmentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Check if certificate already exists to prevent duplicate issuance
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id, reference_code, status')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (existingCert && existingCert.status === 'issued') {
      return NextResponse.json({ id: existingCert.id, referenceCode: existingCert.reference_code, message: 'Certificate already issued' });
    }

    // 3. Verify learner eligibility server-side (canonical logic)
    // Get all published & visible lessons in the course
    const { data: publishedLessons } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .or('visibility_status.eq.visible,visibility_status.is.null');

    const totalLessons = publishedLessons?.length ?? 0;

    let completedLessons = 0;
    if (publishedLessons && publishedLessons.length > 0) {
      const { count } = await supabaseAdmin
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enrollmentId)
        .eq('is_completed', true)
        .in('lesson_id', publishedLessons.map((l) => l.id));
      completedLessons = count || 0;
    }

    if (totalLessons === 0 || completedLessons < totalLessons) {
      return NextResponse.json({ 
        error: `Cannot issue certificate: learner completed ${completedLessons}/${totalLessons} lessons.` 
      }, { status: 400 });
    }

    // Check quiz score threshold if quizzes exist
    const certSettings = course.certificate_settings as Record<string, any> || {};
    const quizThreshold = certSettings.completion_rules?.quiz_threshold_pct || 80;

    const { data: lessonsWithQuizzes } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .not('has_quiz', 'eq', false)
      .or('visibility_status.eq.visible,visibility_status.is.null');

    const { data: quizzes } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .in('lesson_id', lessonsWithQuizzes?.map((l) => l.id) || []);

    if (quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map((q) => q.id);
      const { data: passedAttempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('quiz_id')
        .in('quiz_id', quizIds)
        .eq('enrollment_id', enrollmentId)
        .eq('result', 'pass');

      const passedQuizIds = new Set((passedAttempts || []).map((a) => a.quiz_id));
      const passRate = Math.round((passedQuizIds.size / quizzes.length) * 100);

      if (passRate < quizThreshold) {
        return NextResponse.json({ 
          error: `Cannot issue certificate: learner quiz pass rate is ${passRate}%, which is below the required ${quizThreshold}%.` 
        }, { status: 400 });
      }
    }

    // 4. Fetch learner details
    const { data: learner } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', enrollment.user_id)
      .single();

    // Fetch educator details
    const { data: educator } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Get certificate custom fields from certificate_settings
    const educatorName = certSettings.educator_name || educator?.full_name || 'Course Educator';
    const institutionName = certSettings.institution_name || 'ACESS Platform';
    const courseDurationHours = certSettings.course_duration_hours || 0;
    const skills = certSettings.skills || [];
    const courseTitle = certSettings.course_title || course.title;
    const prefix = certSettings.certificate_id_prefix || 'ACESS';

    // 5. Generate a unique reference code with the educator's custom prefix
    const refCode = await (async function genCode(): Promise<string> {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let suffix = '';
      for (let j = 0; j < 2; j++) {
        if (suffix) suffix += '-';
        for (let i = 0; i < 4; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const fullCode = `${prefix}-${suffix}`;
      const { data: exist } = await supabaseAdmin.from('certificates').select('id').eq('reference_code', fullCode).maybeSingle();
      if (exist) return genCode();
      return fullCode;
    })();

    const origin = request.headers.get('origin') || '';
    const verificationUrl = `${origin}/verify/${refCode}`;

    // Create signed token
    const tokenData = `${refCode}:${Date.now()}:acess-cert`;
    const crypto = require('crypto');
    const signedToken = crypto.createHash('sha256').update(tokenData).digest('hex').slice(0, 32);

    let certId = '';
    let finalRefCode = refCode;

    const educatorRole = certSettings.educator_role || 'Course Educator';

    if (existingCert) {
      // Update existing cert
      const { data: updatedCert, error: updateError } = await supabaseAdmin
        .from('certificates')
        .update({
          reference_code: refCode,
          learner_name: learner?.full_name || 'Learner',
          course_title: courseTitle,
          educator_name: educatorName,
          institution_name: institutionName,
          verification_url: verificationUrl,
          signed_token: signedToken,
          skills_earned: skills,
          course_duration_hours: courseDurationHours,
          completion_date: new Date().toISOString(),
          status: 'issued',
          issued_at: new Date().toISOString(),
          metadata: { is_custom: false, educator_role: educatorRole }
        })
        .eq('id', existingCert.id)
        .select('id, reference_code')
        .single();

      if (updateError) throw updateError;
      certId = updatedCert.id;
      finalRefCode = updatedCert.reference_code;
    } else {
      // Insert new cert
      const { data: newCert, error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({
          enrollment_id: enrollmentId,
          course_id: courseId,
          user_id: enrollment.user_id,
          learner_name: learner?.full_name || 'Learner',
          course_title: courseTitle,
          educator_name: educatorName,
          institution_name: institutionName,
          reference_code: refCode,
          status: 'issued',
          issued_at: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          verification_url: verificationUrl,
          skills_earned: skills,
          course_duration_hours: courseDurationHours,
          signed_token: signedToken,
          metadata: { is_custom: false, educator_role: educatorRole }
        })
        .select('id, reference_code')
        .single();

      if (insertError) throw insertError;
      certId = newCert.id;
      finalRefCode = newCert.reference_code;
    }

    // Update enrollment status to completed
    await supabaseAdmin
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    // Notify the learner
    const notifyBody = `Your certificate for "${course.title}" has been issued by ${educatorName}.`;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: enrollment.user_id,
        title: 'Unique Certificate Issued!',
        body: notifyBody,
        type: 'badge_earned', // Map to standard badge/achievement notification
        is_read: false
      });

    return NextResponse.json({ id: certId, referenceCode: finalRefCode });
  } catch (err: any) {
    console.error('Issue certificate API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
