import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://acess-tau.vercel.app'
    let baseUrl = origin
    if (baseUrl.includes('localhost')) {
      baseUrl = (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 
                'https://acess-tau.vercel.app'
    }
    
    // We must use a service role client to generate the admin link
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generate link so we can bypass Supabase's Site URL setting
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/reset-password`,
      }
    })

    if (error) {
       console.error('Reset password error:', error)
       return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Instead of raw action_link which still hits Supabase and redirects via Site URL,
    // we bypass by generating our own URL with the token_hash
    const customResetLink = `${baseUrl}/auth/verify-recovery?token_hash=${linkData.properties.hashed_token}&type=recovery`
    
    const { sendPasswordResetEmail } = require('@/lib/email')
    try {
      await sendPasswordResetEmail(email.toLowerCase(), customResetLink, baseUrl)
    } catch (err) {
      console.error('Failed to send custom email:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
