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

    const { data: coursesData, error } = await supabase
      .from('courses')
      .select('id, title, created_by, status, created_at')
      .eq('certificate_enabled', true)
      .is('deleted_at', null)

    if (error) throw error

    if (!coursesData || coursesData.length === 0) {
      return NextResponse.json([])
    }

    const creatorIds = [...new Set(coursesData.map(c => c.created_by).filter(Boolean))]
    const userMap = new Map<string, string>()
    
    if (creatorIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', creatorIds)
        
      if (usersError) throw usersError
      
      for (const u of usersData || []) {
        userMap.set(u.id, u.full_name || 'Unknown')
      }
    }
    
    const enrichedCourses = coursesData.map(c => ({
      ...c,
      creator_name: userMap.get(c.created_by) || 'Unknown'
    }))

    return NextResponse.json(enrichedCourses)
  } catch (error: any) {
    console.error('Error fetching cert courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
