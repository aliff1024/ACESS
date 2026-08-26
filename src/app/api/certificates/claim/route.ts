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
      .select('id, reference_code, verification_url, pdf_url, metadata')
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
    // Both counts must be taken over the SAME lesson set. This previously
    // compared "published + visible lessons" against "every progress row on
    // the enrollment", so a row left behind by an unpublished or deleted
    // lesson could satisfy the gate without the course being finished. It also
    // counted is_viewed (merely opened) rather than is_completed.
    const { data: publishedLessons } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .or('visibility_status.eq.visible,visibility_status.is.null');

    const totalLessons = publishedLessons?.length ?? null;

    let completedLessons: number | null = 0;
    if (publishedLessons && publishedLessons.length > 0) {
      const { count } = await supabaseAdmin
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enrollment.id)
        .eq('is_completed', true)
        .in('lesson_id', publishedLessons.map((l) => l.id));
      completedLessons = count;
    }

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

    // ── The certificate's factual content ──
    //
    // This block is the fix for "the certificate does not show course
    // information". Every field below was previously written on the INSERT
    // path only. The UPDATE path — taken whenever a certificate row already
    // existed for the enrollment, which is the case for every learner whose
    // educator allows custom certificates, and for every re-claim — set only
    // the code, URL, skills and status. `learner_name`, `course_title` and
    // `educator_name` were left at whatever they were, usually NULL, and
    // fetchCertificateDetail then rendered its placeholders: a certificate
    // that said the learner had completed a course called "Course".
    //
    // The two paths now write the same fields from the same values.
    const learnerName = userData.full_name || null;
    const courseTitle = (settings.course_title as string) || course.title;
    const educatorName = (settings.educator_name as string) || educator?.full_name || null;
    const institutionName = (settings.institution_name as string) || 'ACESS Platform';
    const educatorRole = (settings.educator_role as string) || 'Course Educator';

    // Duration: the educator's own figure when they set one, otherwise the
    // real sum of the course's published lesson durations. Defaulting to the
    // settings value alone produced 0 for every course that has never had its
    // certificate panel filled in, i.e. almost all of them.
    let courseDurationHours = Number(settings.course_duration_hours ?? 0);
    if (!courseDurationHours) {
      const { data: durationRows } = await supabaseAdmin
        .from('lessons')
        .select('estimated_duration')
        .eq('course_id', courseId)
        .eq('status', 'published')
        .or('visibility_status.eq.visible,visibility_status.is.null');
      const minutes = (durationRows || []).reduce(
        (sum, l) => sum + (Number(l.estimated_duration) || 0),
        0,
      );
      courseDurationHours = minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : 0;
    }

    // Completion date is when the learner actually finished, not when they got
    // round to pressing the button. `completed_at` is set by the database's
    // own derivation, so it is the trustworthy answer when present.
    const { data: enrollmentRow } = await supabaseAdmin
      .from('enrollments')
      .select('completed_at')
      .eq('id', enrollment.id)
      .maybeSingle();
    const issuedAt = new Date().toISOString();
    const completionDate = enrollmentRow?.completed_at || issuedAt;

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
    // Origin is present on a browser fetch, but not on every caller, and an
    // empty origin produced the relative "/verify/CODE" that nobody can open.
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const verificationUrl = `${origin}/verify/${refCode}`;

    // Create signed token
    const tokenData = `${refCode}:${Date.now()}:acess-cert`;
    // Node.js crypto SHA-256
    const crypto = require('crypto');
    const signedToken = crypto.createHash('sha256').update(tokenData).digest('hex').slice(0, 32);

    const skills = (settings.skills as string[]) || [];

    let certId = '';
    let finalRefCode = refCode;

    // The full record, written identically whether the row is new or being
    // re-issued. `metadata.is_custom: false` is what tells the learner UI this
    // is a platform-generated certificate; it used to be inferred from the
    // presence of a pdf_url, which misfiled every generated certificate as an
    // educator's own upload.
    // An educator may already have uploaded their own PDF against this same
    // row (see /api/certificates/custom). Re-issuing must not demote it to a
    // generated certificate, so the custom flag and the uploaded file survive.
    const existingMeta = (existingCert?.metadata as Record<string, unknown> | null) || {};
    const isCustom = existingMeta.is_custom === true;

    const certificateRecord = {
      course_id: courseId,
      user_id: user.id,
      learner_name: learnerName,
      course_title: courseTitle,
      educator_name: educatorName,
      institution_name: institutionName,
      reference_code: refCode,
      status: 'issued',
      issued_at: issuedAt,
      completion_date: completionDate,
      verification_url: verificationUrl,
      skills_earned: skills,
      course_duration_hours: courseDurationHours,
      signed_token: signedToken,
      metadata: { ...existingMeta, is_custom: isCustom, educator_role: educatorRole },
    };

    if (existingCert) {
      const { data: updatedCert, error: updateError } = await supabaseAdmin
        .from('certificates')
        .update(certificateRecord)
        .eq('id', existingCert.id)
        .select('id, reference_code')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      certId = updatedCert.id;
      finalRefCode = updatedCert.reference_code;
    } else {
      const { data: newCert, error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({ enrollment_id: enrollment.id, ...certificateRecord })
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
          body: message,
          type: 'course_update',
          is_read: false
        });
    }

    return NextResponse.json({ id: certId, referenceCode: finalRefCode });
  } catch (err: any) {
    console.error('Claim certificate API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
