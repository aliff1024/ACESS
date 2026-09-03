// Creates real, throwaway learner accounts for the k6 load tests in
// scripts/k6/*.js, against the LOCAL Supabase instance only (reads
// NEXT_PUBLIC_SUPABASE_URL from .env.local — refuses to run against anything
// that isn't 127.0.0.1/localhost). Each account is real: it goes through
// supabase.auth.admin.createUser, gets a real access token via the same
// password-grant flow the login page uses, and is pre-enrolled (service-role
// insert, since this is fixture setup, not the thing under test) into the
// quiz course used by scripts/k6/quiz-submission.js.
//
// Run: node scripts/loadtest-setup.mjs
// Writes tokens to the path given by LOADTEST_TOKENS_PATH (default: OS tmp dir).
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import os from 'os'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!/^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL || '')) {
  console.error('Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not local:', SUPABASE_URL)
  process.exit(1)
}

const N = Number(process.env.LOADTEST_USER_COUNT || 40)
const PASSWORD = 'LoadTest#2026!'
const QUIZ_COURSE_ID = '75e82100-5247-4e84-9401-d8804fea37a0' // "Reading Fluency with Dyslexia Support"
const TOKENS_PATH = process.env.LOADTEST_TOKENS_PATH || path.join(os.tmpdir(), 'acess-loadtest-tokens.json')

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })

async function main() {
  const users = []
  for (let i = 0; i < N; i++) {
    const email = `loadtest${i}@acess-loadtest.local`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `Load Test User ${i}` },
    })
    if (error) {
      console.error(`createUser failed for ${email}:`, error.message)
      continue
    }
    users.push({ id: data.user.id, email })
  }
  console.log(`Created ${users.length}/${N} temporary auth users.`)

  // Pre-enroll all of them into the quiz course via service role — this is
  // fixture setup, not the enrollment flow under test (that's k6's own job
  // in enrollment-burst.js, which uses a DIFFERENT course and each user's
  // own token so RLS is genuinely exercised there).
  const enrollRows = users.map((u) => ({ user_id: u.id, course_id: QUIZ_COURSE_ID, status: 'active' }))
  const { data: enrollments, error: enrollErr } = await admin.from('enrollments').insert(enrollRows).select('id, user_id')
  if (enrollErr) {
    console.error('Bulk enrollment insert failed:', enrollErr.message)
    process.exit(1)
  }
  const enrollmentByUser = new Map(enrollments.map((e) => [e.user_id, e.id]))

  const tokens = []
  for (const u of users) {
    const { data, error } = await anon.auth.signInWithPassword({ email: u.email, password: PASSWORD })
    if (error) {
      console.error(`signIn failed for ${u.email}:`, error.message)
      continue
    }
    tokens.push({
      id: u.id,
      email: u.email,
      access_token: data.session.access_token,
      enrollment_id: enrollmentByUser.get(u.id),
    })
  }

  fs.writeFileSync(TOKENS_PATH, JSON.stringify({ supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY, quizCourseId: QUIZ_COURSE_ID, users: tokens }, null, 2))
  console.log(`Wrote ${tokens.length} real access tokens to ${TOKENS_PATH}`)
}

main()
