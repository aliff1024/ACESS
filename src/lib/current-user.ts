import { supabase } from './supabase'

/**
 * Who is signed in, resolved without a network round-trip per call.
 *
 * `supabase.auth.getUser()` asks the auth server every time it is called. The
 * learner surfaces call it constantly — once at the top of each of the ~48
 * exported functions in learner-api.ts, plus directly in the lesson page, the
 * notification helpers and the adaptive engine. Measured on a single learner
 * dashboard load before this helper existed: **24 requests to /auth/v1/user**,
 * each one on the critical path, each blocking the query that followed it.
 *
 * `getSession()` reads the session the client already holds and refreshes it
 * only when it has actually expired, so the common case costs nothing. The
 * result is memoised and cleared by `onAuthStateChange`, so signing out or
 * switching account cannot leave the previous user's id behind for the next.
 *
 * This is safe because the id is used to FILTER queries, never to authorize
 * them. Authorization is enforced by RLS against the JWT PostgREST receives:
 * a forged, stale or foreign session is rejected by the database whatever id
 * the client passes alongside it. Nothing here accepts a caller-supplied id,
 * and an unauthenticated session still throws.
 */
let cachedUserId: string | null = null

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id ?? null
  })
}

/** The signed-in user's id, or null when nobody is signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) return null
  cachedUserId = data.session.user.id
  return cachedUserId
}

/** The signed-in user's id, throwing when nobody is signed in. */
export async function requireCurrentUserId(): Promise<string> {
  const id = await getCurrentUserId()
  if (!id) throw new Error('Not authenticated')
  return id
}

/** Clears the memoised id. Exposed for tests and explicit sign-out paths. */
export function clearCachedUserId(): void {
  cachedUserId = null
}
