import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, experience, reason, portfolio_links, referral_code } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await adminSupabase
      .from('instructor_applications')
      .insert({
        user_id: null,
        full_name,
        email,
        experience: experience || null,
        reason: reason || null,
        portfolio_links: portfolio_links || null,
        referral_code: referral_code || null,
        status: 'pending',
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Instructor application error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
