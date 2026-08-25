import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * Confirms the caller is a signed-in admin before an API route reaches for the
 * service-role client.
 *
 * The analytics, engagement and reports routes previously performed no check at
 * all, so any caller could read the whole database through them. The role is
 * read from the `users` table rather than the JWT so that a demotion takes
 * effect immediately instead of on the user's next token refresh.
 *
 * Returns a NextResponse the route should return immediately, or null when the
 * caller is a verified admin:
 *
 *     const denied = await requireAdmin()
 *     if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single()

  if (error || data?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return null
}
