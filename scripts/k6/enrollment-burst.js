// LOAD TEST 2 — concurrent enrollments.
//
// "Users can enroll themselves" (RLS INSERT policy on public.enrollments,
// supabase/migrations/20260826000000_baseline_schema.sql:3673) is the exact
// path the real enrol button hits (confirmed by reading src/lib and by
// tests/e2e/learner-01-enroll.spec.ts, which drives the same insert through
// the UI). This script calls PostgREST directly with each virtual user's own
// real JWT (from scripts/loadtest-setup.mjs) so RLS is genuinely evaluated
// per request, not bypassed with the service-role key.
//
// A one-shot INSERT can't be sustained for a whole test duration — the
// unique (user_id, course_id) constraint would fail every request after the
// first. So each VU alternates INSERT then DELETE of its own enrollment in
// that course, which is both a legitimate sustained write pattern (mirrors a
// student enrolling, reconsidering, dropping, re-enrolling — all real,
// supported actions per LEARNER-01's own teardown) and one that keeps
// generating fresh write conflicts for Postgres to resolve under load.
//
// VU/duration: 40 VUs (one per load-test account scripts/loadtest-setup.mjs
// creates) for 30s — a small institution's entire cohort hitting "Enroll" on
// the same newly-assigned course within the same half-minute, which is the
// realistic spike shape for this table (course reads are constant traffic;
// enrollment writes spike hard right after an announcement).
import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

const TOKENS_PATH = __ENV.LOADTEST_TOKENS_PATH
if (!TOKENS_PATH) throw new Error('LOADTEST_TOKENS_PATH env var is required')

const fixture = JSON.parse(open(TOKENS_PATH))
const COURSE_ID = __ENV.ENROLL_COURSE_ID || '3b260c23-38ac-4012-9d69-ac7519a1123e' // "Advanced Comprehension Strategies"

const users = new SharedArray('users', () => fixture.users)

export const options = {
  vus: users.length,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.95'],
  },
}

export default function () {
  const me = users[(__VU - 1) % users.length]
  const headers = {
    apikey: fixture.anonKey,
    Authorization: `Bearer ${me.access_token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const insertRes = http.post(
    `${fixture.supabaseUrl}/rest/v1/enrollments`,
    JSON.stringify({ user_id: me.id, course_id: COURSE_ID, status: 'active' }),
    { headers, tags: { name: 'enroll_insert' } },
  )
  check(insertRes, { 'enroll: 201 Created': (r) => r.status === 201 })

  sleep(0.3)

  const delRes = http.del(
    `${fixture.supabaseUrl}/rest/v1/enrollments?user_id=eq.${me.id}&course_id=eq.${COURSE_ID}`,
    null,
    { headers, tags: { name: 'enroll_delete' } },
  )
  check(delRes, { 'drop: 204 No Content': (r) => r.status === 204 })

  sleep(Math.random() * 0.7 + 0.3)
}
