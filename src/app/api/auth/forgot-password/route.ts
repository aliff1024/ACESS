import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail, verifySmtpConnection } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Pre-check SMTP connection
    const smtpCheck = await verifySmtpConnection()
    if (!smtpCheck.ok) {
      return NextResponse.json({ error: 'SMTP connection failed. Check credentials.', details: smtpCheck.error }, { status: 500 })
    }

    const supabase = await createServerSupabase()

    // Try public users table first
    let userId: string | null = null

    const { data: publicUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (publicUser) {
      userId = publicUser.id
    } else {
      // Fallback: look up from auth.users using service role key
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers()
      if (!authError && authData?.users) {
        for (const u of authData.users) {
          if (u.email === email.toLowerCase()) {
            userId = u.id
            break
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ sent: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await supabase.from('password_reset_tokens').insert({
      user_id: userId,
      email: email.toLowerCase(),
      token,
      expires_at: expiresAt,
    })

    const origin = request.headers.get('origin') || 'https://acess-tau.vercel.app'
    const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`

    try {
      await sendPasswordResetEmail(email.toLowerCase(), resetLink)
    } catch (err) {
      console.error('Failed to send email:', err)
      return NextResponse.json({ error: 'Failed to send email. Check SMTP credentials in .env.local.', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
