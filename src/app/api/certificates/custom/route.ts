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

    const { enrollmentId, courseId, userId, customUrl } = await request.json();

    if (!enrollmentId || !courseId || !userId || !customUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if a certificate already exists for this enrollment (system or custom)
    const { data: existingCert, error: findError } = await supabaseAdmin
      .from('certificates')
      .select('id, metadata')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existingCert) {
      // Update existing certificate row (preserve system cert, add custom cert fields)
      const existingMeta = existingCert.metadata as Record<string, unknown> | null;
      const { error: updateError } = await supabaseAdmin
        .from('certificates')
        .update({
          status: 'issued',
          pdf_url: customUrl,
          metadata: { ...(existingMeta || {}), is_custom: true },
        })
        .eq('id', existingCert.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Create a NEW certificate record (no certificate exists yet)
      // We need learner name and course title
      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select(`
          users:user_id (full_name),
          course:course_id (title)
        `)
        .eq('id', enrollmentId)
        .single();

      if (enrollError) {
        return NextResponse.json({ error: enrollError.message }, { status: 500 });
      }

      // Generate a reference code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let refCode = '';
      for (let j = 0; j < 3; j++) {
        if (refCode) refCode += '-';
        for (let i = 0; i < 4; i++) {
          refCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      const { error: insertError } = await supabaseAdmin
        .from('certificates')
        .insert({
          enrollment_id: enrollmentId,
          course_id: courseId,
          user_id: userId,
          learner_name: (enrollment as any)?.users?.full_name || 'Unknown Learner',
          course_title: (enrollment as any)?.course?.title || 'Unknown Course',
          issued_at: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          reference_code: refCode,
          pdf_url: customUrl,
          verification_url: customUrl,
          metadata: { is_custom: true },
          status: 'issued'
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Mark enrollment as completed
    await supabaseAdmin
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    // 2. Create notification for the student
    const message = `Your educator has uploaded a custom certificate for your course completion!`;
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Custom Certificate Uploaded',
        message: message,
        type: 'course_update',
        read: false
      });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Custom certificate API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
