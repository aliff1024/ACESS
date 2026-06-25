import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType

  let origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://acess-tau.vercel.app'
  if (origin.includes('localhost')) {
    origin = (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
             (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 
             'https://acess-tau.vercel.app'
  }

  if (token_hash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    
    if (!error) {
      // Successfully verified, user is now logged in.
      // Redirect to the reset password page to let them choose a new password.
      return NextResponse.redirect(`${origin}/reset-password`)
    }
    
    console.error('OTP Verification error:', error)
    return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+recovery+link`)
  }

  return NextResponse.redirect(`${origin}/login?error=Missing+recovery+parameters`)
}
