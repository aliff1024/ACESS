import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
      )
    }
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}

export const supabase = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_, prop) {
    return getClient()[prop as keyof SupabaseClient]
  },
})

