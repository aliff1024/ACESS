import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { id: certId } = await context.params;
    
    if (!certId) {
       return NextResponse.json({ error: 'Certificate ID missing' }, { status: 400 });
    }

    const body = await request.json();
    const { reason, scope = 'both' } = body;

    let updateData: any = {};
    if (scope === 'custom') {
      updateData = { pdf_url: null };
    } else if (scope === 'system') {
      updateData = {
        status: 'revoked', 
        revoked_at: new Date().toISOString(), 
        revoke_reason: reason 
      };
    } else {
      // both
      updateData = {
        status: 'revoked', 
        revoked_at: new Date().toISOString(), 
        revoke_reason: reason,
        pdf_url: null
      };
    }

    // We use the service role key to bypass RLS, ensuring the update succeeds
    const { error: updateError } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', certId);

    if (updateError) throw updateError;

    // Optional: Fetch the certificate to find the learner and send a notification
    if (scope === 'both' || scope === 'system') {
      const { data: cert } = await supabase
        .from('certificates')
        .select('user_id, course_id')
        .eq('id', certId)
        .single();

      if (cert?.user_id) {
        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('id', cert.course_id)
          .single();
          
        await supabase.from('notifications').insert({
          user_id: cert.user_id,
          type: 'certificate_revoked',
          title: 'Certificate Revoked',
          body: `Your certificate for "${course?.title || 'a course'}" has been revoked. Reason: ${reason || 'Not provided'}`
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Certificate revocation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to revoke certificate' }, { status: 500 });
  }
}
