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
    
    const { id: courseId } = await context.params;
    
    if (!courseId) {
       return NextResponse.json({ error: 'Course ID missing' }, { status: 400 });
    }

    const body = await request.json();
    const { status, reason } = body;

    if (!['published', 'draft'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 1. Fetch the course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, created_by')
      .eq('id', courseId)
      .single();

    if (fetchError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // 2. Update the course
    const updatePayload: any = { status };
    if (status === 'published') {
      updatePayload.published_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', courseId);

    if (updateError) throw updateError;

    // 3. Side effects
    if (status === 'published') {
      await supabase
        .from('certificate_templates')
        .update({ is_active: true })
        .eq('course_id', courseId);
    }

    // 4. Send notification
    if (course.created_by) {
      if (status === 'published') {
        await supabase.from('notifications').insert({
          user_id: course.created_by,
          type: 'course_approved',
          title: 'Course Approved',
          body: `Your course "${course.title}" has been approved and is now published!`,
        });
      } else if (status === 'draft') {
        await supabase.from('notifications').insert({
          user_id: course.created_by,
          type: 'course_rejected',
          title: 'Course Publication Update Required',
          body: `Your course "${course.title}" requires updates before publishing. Reason: ${reason || 'Not provided'}`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Course status update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update course status' }, { status: 500 });
  }
}
