import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase-server'

function generatePassword() {
  return 'AcessDemo2026!'
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await serverSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { applicationId, admin_notes } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: app, error: appError } = await supabase
      .from('instructor_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (app.status !== 'pending') {
      return NextResponse.json({ error: 'Application already processed' }, { status: 400 })
    }

    let userId = app.user_id
    let temporaryPassword: string | undefined

    if (!userId) {
      temporaryPassword = generatePassword()

      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: app.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: app.full_name, role: 'educator' },
      })

      if (createError || !authUser.user) {
        return NextResponse.json({ error: 'Failed to create user account: ' + (createError?.message || 'unknown') }, { status: 500 })
      }

      userId = authUser.user.id

      await supabase.from('users').upsert({
        id: userId,
        email: app.email,
        full_name: app.full_name,
        role: 'educator',
        instructor_application_status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } else {
      await supabase
        .from('users')
        .update({
          role: 'educator',
          instructor_application_status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }

    const { error: updateError } = await supabase
      .from('instructor_applications')
      .update({
        status: 'approved',
        admin_notes: admin_notes || app.admin_notes,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId,
      accountCreated: !app.user_id,
      email: app.email,
      password: temporaryPassword || null,
    })
  } catch (err) {
    console.error('Approve instructor error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
