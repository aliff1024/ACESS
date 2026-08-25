import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const serverSupabase = await createServerSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: certId } = await context.params;
    
    if (!certId) {
       return NextResponse.json({ error: 'Certificate ID missing' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch certificate and verify educator owns the course or is admin
    const { data: cert, error: fetchError } = await supabaseAdmin
      .from('certificates')
      .select('id, user_id, course_id, courses:course_id (created_by)')
      .eq('id', certId)
      .maybeSingle();

    if (fetchError || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const isEducator = (cert.courses as any)?.created_by === user.id;

    // Check if the user is an admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = userData?.role === 'admin';

    if (!isEducator && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to modify this certificate' }, { status: 403 });
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

    const { error: updateError } = await supabaseAdmin
      .from('certificates')
      .update(updateData)
      .eq('id', certId);

    if (updateError) throw updateError;

    // Fetch the course to find its title and notify the student
    if (scope === 'both' || scope === 'system') {
      if (cert.user_id) {
        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('title')
          .eq('id', cert.course_id)
          .single();
          
        await supabaseAdmin.from('notifications').insert({
          user_id: cert.user_id,
          type: 'certificate_revoked',
          title: 'Certificate Revoked',
          body: `Your certificate for "${course?.title || 'a course'}" has been revoked. Reason: ${reason || 'Not provided'}`,
          is_read: false
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Certificate revocation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to revoke certificate' }, { status: 500 });
  }
}
