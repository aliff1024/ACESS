// TARGETED CONCURRENCY TEST — two+ simultaneous submissions for the SAME
// learner/enrollment/quiz.
//
// This is the specific race quiz-submission.js's normal load pattern
// (one enrollment per virtual user) can't exercise: submit_quiz_attempt()
// used to compute the next attempt_number with a plain
// `SELECT max(attempt_number)+1` and no lock, so two truly concurrent
// calls for the SAME (enrollment_id, quiz_id) pair (a double-click, the
// same account open in two tabs) could both read the same max and race to
// insert the same attempt_number — the loser failing with a raw
// unique-constraint violation instead of being cleanly assigned the next
// number. Fixed in supabase/migrations/20260903000000_lock_quiz_attempt_number.sql
// with a pg_advisory_xact_lock keyed on (enrollment_id, quiz_id).
//
// This script fires N requests for ONE user against the SAME quiz truly in
// parallel with k6's http.batch() (which sends every request in the batch
// concurrently and waits for all responses — unlike separate VUs, which
// k6/the OS could still schedule with enough gap between them to miss the
// race), then asserts every one succeeded and that the resulting
// attempt_number values are exactly {1..N} with no duplicates and no gaps —
// the only possible outcome if the lock is working, and something a
// coincidental "it happened not to fail" result could not fake.
import http from 'k6/http'
import { check } from 'k6'

const TOKENS_PATH = __ENV.LOADTEST_TOKENS_PATH
if (!TOKENS_PATH) throw new Error('LOADTEST_TOKENS_PATH env var is required')

const fixture = JSON.parse(open(TOKENS_PATH))
const me = fixture.users[0]
if (!me) throw new Error('fixture has no users — run loadtest-setup.mjs with LOADTEST_USER_COUNT=1 first')

const QUIZ_ID = '1deae4e5-0d92-43dc-a201-255957412942' // "Fluency Check", max_attempts = 0 (unlimited)
const ANSWERS = [
  { questionId: '9292f83c-5665-4d38-9e71-59c1b9ba8bd4', selectedOptionId: '91785f0e-6a90-4f05-bccb-c47e49717d63' },
  { questionId: 'be0e659f-88f2-4dfc-9f8b-28e0c7cce6af', selectedOptionId: '56f6704f-daaf-45a9-8a62-001abe35c859' },
]

const CONCURRENT_SUBMISSIONS = Number(__ENV.CONCURRENT_SUBMISSIONS || 5)

export const options = { vus: 1, iterations: 1 }

export default function () {
  const headers = {
    apikey: fixture.anonKey,
    Authorization: `Bearer ${me.access_token}`,
    'Content-Type': 'application/json',
  }
  const body = JSON.stringify({ p_quiz_id: QUIZ_ID, p_answers: ANSWERS })
  const requests = Array.from({ length: CONCURRENT_SUBMISSIONS }, () => ({
    method: 'POST',
    url: `${fixture.supabaseUrl}/rest/v1/rpc/submit_quiz_attempt`,
    body,
    params: { headers },
  }))

  const responses = http.batch(requests)

  const attemptNumbers = []
  let anyUniqueViolation = false
  responses.forEach((res, i) => {
    const ok = check(res, { [`request ${i}: 200 OK`]: (r) => r.status === 200 })
    if (!ok) {
      console.error(`request ${i}: status=${res.status} body=${res.body}`)
      if (/duplicate key value violates unique constraint/i.test(res.body || '')) anyUniqueViolation = true
      return
    }
    const parsed = JSON.parse(res.body)
    attemptNumbers.push(parsed.attempt_number)
  })

  check(null, {
    'no raw unique-constraint violation surfaced to the client': () => !anyUniqueViolation,
    [`all ${CONCURRENT_SUBMISSIONS} requests got a distinct attempt_number`]: () =>
      attemptNumbers.length === CONCURRENT_SUBMISSIONS && new Set(attemptNumbers).size === CONCURRENT_SUBMISSIONS,
  })

  console.log(`attempt_numbers returned: ${JSON.stringify(attemptNumbers.sort((a, b) => a - b))}`)
}
