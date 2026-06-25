import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    let origin = request.headers.get('origin')
    if (!origin || origin.includes('localhost')) {
      origin = process.env.NEXT_PUBLIC_APP_URL || 
               process.env.NEXT_PUBLIC_SITE_URL || 
               (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
               (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 
               'https://acess-tau.vercel.app'
    }
    
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
