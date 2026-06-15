import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { STOCK_COURSE_THUMBNAILS } from '@/lib/course-thumbnails'

const COURSE_THUMBNAILS = [...STOCK_COURSE_THUMBNAILS]

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .is('thumbnail_url', null)
    .is('deleted_at', null)

  if (!courses || courses.length === 0) {
    return NextResponse.json({ updated: 0, message: 'All courses already have thumbnails' })
  }

  for (let i = 0; i < courses.length; i++) {
    await supabase
      .from('courses')
      .update({ thumbnail_url: COURSE_THUMBNAILS[i % COURSE_THUMBNAILS.length], updated_at: new Date().toISOString() })
      .eq('id', courses[i].id)
  }

  return NextResponse.json({ updated: courses.length })
}
