import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const origin = request.headers.get('origin') || 'https://acess-tau.vercel.app'
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
       console.error('Reset password error:', error)
       return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
