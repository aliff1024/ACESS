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

    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // Get enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .neq('status', 'dropped')
      .maybeSingle();

    if (enrollError) {
      return NextResponse.json({ error: enrollError.message }, { status: 500 });
    }
    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 400 });
    }

    // Check if certificate row already exists for this enrollment
    const { data: existingCert, error: findError } = await supabaseAdmin
      .from('certificates')
      .select('id, reference_code, verification_url, pdf_url')
      .eq('enrollment_id', enrollment.id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existingCert && existingCert.verification_url?.includes('/verify/')) {
      return NextResponse.json({ id: existingCert.id, referenceCode: existingCert.reference_code });
    }

    // Get course and user details
    const [{ data: course }, { data: userData }] = await Promise.all([
      supabaseAdmin.from('courses').select('title, certificate_settings, created_by, certificate_enabled').eq('id', courseId).single(),
      supabaseAdmin.from('users').select('full_name').eq('id', user.id).single(),
    ]);

    if (!course || !userData) {
      return NextResponse.json({ error: 'Course or user data not found' }, { status: 404 });
    }

    if (!course.certificate_enabled) {
      return NextResponse.json({ error: 'Certificates not enabled for this course' }, { status: 400 });
    }

    // Re-verify completion eligibility server-side — the client-side check in
    // checkCourseCertificateEligibility() is UX-only and must not be trusted
    // as the authorization boundary for this endpoint.
    const { count: totalLessons } = await supabaseAdmin
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'published')
      .or('visibility_status.eq.visible,visibility_status.is.null');

    const { count: completedLessons } = await supabaseAdmin
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollment.id)
      .eq('is_viewed', true);

    if (totalLessons === null || completedLessons === null || completedLessons < totalLessons) {
      return NextResponse.json({ error: 'Complete all lessons before claiming a certificate' }, { status: 400 });
    }

    const certSettings = course.certificate_settings as Record<string, unknown> | null;
    const quizThreshold = ((certSettings?.completion_rules as Record<string, unknown>)?.quiz_threshold_pct as number) || 80;

    const { data: eligibleLessons } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .not('has_quiz', 'eq', false)
      .or('visibility_status.eq.visible,visibility_status.is.null');

    const { data: quizzesForCourse } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .in('lesson_id', eligibleLessons?.map((l) => l.id) || []);

    if (quizzesForCourse && quizzesForCourse.length > 0) {
      const quizIds = quizzesForCourse.map((q) => q.id);
      const { data: passedAttempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('quiz_id')
        .in('quiz_id', quizIds)
        .eq('enrollment_id', enrollment.id)
        .eq('result', 'pass');

      const passedQuizIds = new Set((passedAttempts || []).map((a) => a.quiz_id));
      const passRate = Math.round((passedQuizIds.size / quizzesForCourse.length) * 100);

      if (passRate < quizThreshold) {
        return NextResponse.json({ error: `Quiz pass rate ${passRate}% below required ${quizThreshold}%` }, { status: 400 });
      }
    }

    // Get educator details
    const { data: educator } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', course.created_by)
      .single();

    const settings = course.certificate_settings as Record<string, unknown> | null || {};
    
    // Generate a reference code
    const refCode = await (async function genCode(): Promise<string> {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const segs = [4, 4, 4];
      let c = '';
      for (const l of segs) {
        if (c) c += '-';
        for (let i = 0; i < l; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const { data: exist } = await supabaseAdmin.from('certificates').select('id').eq('reference_code', c).maybeSingle();
      if (exist) return genCode();
      return c;
    })();

    // Verification URL pointing to the Next.js app host (origin)
    const origin = request.headers.get('origin') || '';
    const verificationUrl = `${origin}/verify/${refCode}`;

    // Create signed token
    const tokenData = `${refCode}:${Date.now()}:acess-cert`;
    // Node.js crypto SHA-256
    const crypto = require('crypto');
    const signedToken = crypto.createHash('sha256').update(tokenData).digest('hex').slice(0, 32);

    const skills = (settings.skills as string[]) || [];

    let certId = '';
    let finalRefCode = refCode;

    if (existingCert) {
      // Update existing row
      const { data: updatedCert, error: updateError } = await supabaseAdmin
        .from('certificates')
        .update({
          reference_code: refCode,
          verification_url: verificationUrl,
          signed_token: signedToken,
          skills_earned: skills,
          course_duration_hours: (settings.course_duration_hours as number) || 0,
          completion_date: new Date().toISOString(),
          status: 'issued'
        })
        .eq('id', existingCert.id)
        .select('id, reference_code')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      certId = updatedCert.id;
      finalRefCode = updatedCert.reference_code;
    } else {
      // Insert new row
      const { data: newCert, error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({
          enrollment_id: enrollment.id,
          course_id: courseId,
          user_id: user.id,
          learner_name: userData.full_name || 'Learner',
          course_title: course.title,
          educator_name: educator?.full_name || 'Educator',
          reference_code: refCode,
          status: 'issued',
          issued_at: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          verification_url: verificationUrl,
          skills_earned: skills,
          course_duration_hours: (settings.course_duration_hours as number) || 0,
          signed_token: signedToken,
        })
        .select('id, reference_code')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      certId = newCert.id;
      finalRefCode = newCert.reference_code;
    }

    // Update enrollment status
    await supabaseAdmin
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    // Notify educator if custom certificates are allowed
    const allowCustom = (settings.allow_custom_certificates as boolean) || false;
    if (allowCustom && course.created_by) {
      const message = `Student ${userData.full_name || 'A student'} has completed your course "${course.title}". Please publish their unique certificate.`;
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: course.created_by,
          title: 'Action Required: Publish Unique Certificate',
          message: message,
          type: 'course_update',
          read: false
        });
    }

    return NextResponse.json({ id: certId, referenceCode: finalRefCode });
  } catch (err: any) {
    console.error('Claim certificate API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
