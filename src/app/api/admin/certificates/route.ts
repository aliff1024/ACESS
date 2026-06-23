import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('certificates')
      .select(`
        id, reference_code, status, issued_at, revoked_at,
        enrollments!inner(
          course_id,
          users!enrollments_user_id_fkey(full_name),
          courses!enrollments_course_id_fkey(title)
        )
      `)
      .order('issued_at', { ascending: false })

    if (error) throw error

    const formattedData = (data || []).map((c: any) => {
      const e = c.enrollments
      return {
        id: c.id,
        learner_name: e?.users?.full_name || 'Unknown',
        course_title: e?.courses?.title || 'Unknown Course',
        certificate_code: c.reference_code,
        issued_at: c.issued_at,
        status: c.status,
        revoked_at: c.revoked_at || undefined,
      }
    })

    return NextResponse.json(formattedData)
  } catch (error: any) {
    console.error('Error fetching admin certificates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
