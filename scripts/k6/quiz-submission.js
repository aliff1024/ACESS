// LOAD TEST 3 — concurrent quiz submissions.
//
// Quiz grading does not go through a plain table INSERT: quiz_attempts has
// no INSERT policy at all (confirmed by reading the RLS section of
// supabase/migrations/20260826000000_baseline_schema.sql — SELECT policies
// only). Grading happens in submit_quiz_attempt(), a SECURITY DEFINER RPC
// (src/lib/learner-api.ts:1365 is the real call site: `supabase.rpc(
// 'submit_quiz_attempt', ...)`) that verifies enrollment, enforces
// max_attempts and grades against the stored answer key server-side — the
// comment above that call explains a direct-write path used to exist and was
// closed after a forged-score incident. This script calls that same RPC
// through PostgREST (POST /rest/v1/rpc/submit_quiz_attempt) with each VU's
// own real JWT, so it exercises the actual authoritative grading path, not a
// raw table write.
//
// Quiz used: "Fluency Check" (1deae4e5-0d92-43dc-a201-255957412942, lesson
// "Repeated Reading", course "Reading Fluency with Dyslexia Support") has
// max_attempts = 0, i.e. unlimited attempts (confirmed via a direct read
// before this test was written) — the one quiz in the seed data that can
// absorb a sustained duration-based load pattern without every VU's attempts
// after the first being rejected by the attempt-limit check. Every VU is
// pre-enrolled in that course by scripts/loadtest-setup.mjs.
//
// VU/duration: same 40 concurrent learners / 30s window as the enrollment
// test, for the same reason — a class submitting the same quiz at the same
// moment (e.g. a timed in-class assessment) is the realistic spike shape,
// more so than steady background traffic.
import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

const TOKENS_PATH = __ENV.LOADTEST_TOKENS_PATH
if (!TOKENS_PATH) throw new Error('LOADTEST_TOKENS_PATH env var is required')

const fixture = JSON.parse(open(TOKENS_PATH))
const users = new SharedArray('users', () => fixture.users)

const QUIZ_ID = '1deae4e5-0d92-43dc-a201-255957412942' // "Fluency Check"
// One correct, one wrong answer on purpose — a real mixed-result attempt,
// not every VU faking a perfect score.
const ANSWERS = [
  { questionId: '9292f83c-5665-4d38-9e71-59c1b9ba8bd4', selectedOptionId: '91785f0e-6a90-4f05-bccb-c47e49717d63' }, // correct
  { questionId: 'be0e659f-88f2-4dfc-9f8b-28e0c7cce6af', selectedOptionId: '09c7f3e1-c10d-4311-a400-f328b01c2fc7' }, // wrong
]

export const options = {
  vus: users.length,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    checks: ['rate>0.95'],
  },
}

export default function () {
  const me = users[(__VU - 1) % users.length]
  const headers = {
    apikey: fixture.anonKey,
    Authorization: `Bearer ${me.access_token}`,
    'Content-Type': 'application/json',
  }

  const res = http.post(
    `${fixture.supabaseUrl}/rest/v1/rpc/submit_quiz_attempt`,
    JSON.stringify({ p_quiz_id: QUIZ_ID, p_answers: ANSWERS }),
    { headers, tags: { name: 'submit_quiz_attempt' } },
  )
  const ok = check(res, {
    'rpc: 200 OK': (r) => r.status === 200,
    'graded (score_pct present)': (r) => {
      try { return typeof JSON.parse(r.body).score_pct === 'number' } catch { return false }
    },
  })
  if (!ok) console.error(`FAILURE user=${me.email} status=${res.status} body=${res.body}`)

  sleep(Math.random() * 1.2 + 0.3)
}
