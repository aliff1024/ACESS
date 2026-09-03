// Removes every account scripts/loadtest-setup.mjs created (email domain
// acess-loadtest.local) and everything that hangs off it (enrollments,
// lesson_progress, quiz_attempts, certificates all cascade from
// public.users -> enrollments per the FK graph in the baseline migration).
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!/^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL || '')) {
  console.error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not local:', SUPABASE_URL)
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: rows, error } = await admin.from('users').select('id, email').ilike('email', '%@acess-loadtest.local')
  if (error) throw error
  console.log(`Found ${rows.length} load-test accounts to remove.`)

  let removed = 0
  for (const row of rows) {
    const { error: authErr } = await admin.auth.admin.deleteUser(row.id)
    if (authErr && !/user not found/i.test(authErr.message)) {
      console.error(`auth delete failed for ${row.email}:`, authErr.message)
      continue
    }
    const { error: rowErr } = await admin.from('users').delete().eq('id', row.id)
    if (rowErr) {
      console.error(`public.users delete failed for ${row.email}:`, rowErr.message)
      continue
    }
    removed++
  }
  console.log(`Removed ${removed}/${rows.length} load-test accounts (cascades cleared their enrollments, lesson_progress, quiz_attempts, certificates).`)
}

main()
