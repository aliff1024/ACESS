import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createBrowserClient> | null = null

function getClient(): ReturnType<typeof createBrowserClient> {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
      )
    }
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}

export const supabase = new Proxy<ReturnType<typeof createBrowserClient>>({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop) {
    return getClient()[prop as keyof SupabaseClient]
  },
})
