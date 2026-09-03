// LOAD TEST 1 — concurrent course-catalogue reads.
//
// ACESS has no separate REST API layer for course reads: learner-api.ts
// (fetchLearnerCourses, src/lib/learner-api.ts:444) queries PostgREST
// directly with supabase-js, and "Public can view published courses" (RLS)
// has no role restriction, so this is the exact query + auth model the real
// app uses for the catalogue — this script sends it straight to PostgREST
// with the anon key rather than through a Next.js page, so response times
// reflect the DB/PostgREST layer specifically (Next.js SSR/render time is a
// separate, additive cost not measured here).
//
// VU/duration choice: ACESS is a small institutional deployment (12 seeded
// accounts in this environment; the seed docs describe a 30-learner class
// shape). 50 VUs approximates an entire class plus a few staff opening the
// catalogue at the same moment (e.g. the start of a lesson period), which is
// the realistic worst-case burst for this table rather than steady-state
// traffic. 30s ramp-up / 30s hold / 10s ramp-down gives PostgREST's
// connection pool time to reach a steady state before we read percentiles.
import http from 'k6/http'
import { check, sleep } from 'k6'

const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON_KEY = __ENV.SUPABASE_ANON_KEY
if (!ANON_KEY) throw new Error('SUPABASE_ANON_KEY env var is required')

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
}

const SELECT = 'id,title,description,difficulty_level,category,thumbnail_url,course_type,system_course,certificate_enabled,created_by,updated_at,primary_disability_focus,lessons(estimated_duration)'

export default function () {
  const url = `${SUPABASE_URL}/rest/v1/courses?select=${encodeURIComponent(SELECT)}&status=eq.published&deleted_at=is.null&order=created_at.desc`
  const res = http.get(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    tags: { name: 'courses_catalogue' },
  })
  check(res, {
    'status is 200': (r) => r.status === 200,
    'returned an array': (r) => {
      try { return Array.isArray(JSON.parse(r.body)) } catch { return false }
    },
  })
  sleep(Math.random() * 1.5 + 0.5)
}
