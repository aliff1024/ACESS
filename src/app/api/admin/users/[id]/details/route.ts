import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const serverSupabase = await createServerSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await serverSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        courses:course_id (title, difficulty_level, status)
      `)
      .eq('user_id', id);

    const { data: certificates } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        enrollments (
          courses (title)
        )
      `)
      .eq('user_id', id);

    const { data: createdCourses } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('created_by', id)
      .is('deleted_at', null);

    return NextResponse.json({ enrollments, certificates, createdCourses });
  } catch (err) {
    console.error('Error fetching admin user details:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
