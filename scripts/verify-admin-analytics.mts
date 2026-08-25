/**
 * Reconciles every figure the Admin Portal displays against the database.
 *
 * `admin-analytics.ts` derives the numbers in TypeScript; this script computes
 * the same numbers again with independent SQL and reports any disagreement.
 * Two implementations that agree is the only evidence that either is right.
 *
 *   npm run verify:admin
 */
import fs from 'fs'
import pg from 'pg'
import {
  loadSnapshot,
  buildIndex,
  resolveRange,
  computeKpis,
  computeCoursePerformance,
  computeAccessibilityCoverage,
  computeAdaptationUsage,
  computeSettingsAdoption,
  formatDuration,
  activityBand,
} from '../src/lib/admin-analytics'

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.trim().startsWith('#')) continue
  const i = line.indexOf('=')
  process.env[line.slice(0, i).trim()] = line
    .slice(i + 1)
    .trim()
    .replace(/^"|"$/g, '')
}

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1]
const sql = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(
    process.env.SUPABASE_PASSWORD ?? ''
  )}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

let failures = 0

async function scalar(query: string): Promise<number> {
  const { rows } = await sql.query(query)
  return Number(Object.values(rows[0])[0] ?? 0)
}

function check(label: string, derived: number, expected: number) {
  const ok = derived === expected
  if (!ok) failures++
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(
    `  [${mark}] ${label.padEnd(34)} module=${String(derived).padStart(7)}  sql=${String(
      expected
    ).padStart(7)}`
  )
}

await sql.connect()

const snap = await loadSnapshot()
const index = buildIndex(snap)
const range = resolveRange('all')
const k = computeKpis(snap, index, range)

console.log('\nHeadline counts')
check('total users', k.totalUsers, await scalar("select count(*) from users where deleted_at is null"))
check('total courses', k.totalCourses, await scalar("select count(*) from courses where deleted_at is null"))
check('published courses', k.publishedCourses, await scalar("select count(*) from courses where status='published' and deleted_at is null"))
check('draft courses', k.draftCourses, await scalar("select count(*) from courses where status='draft' and deleted_at is null"))
check('total enrollments', k.totalEnrollments, await scalar('select count(*) from enrollments'))
check('active enrollments', k.activeEnrollments, await scalar("select count(*) from enrollments where status='active'"))
check('marked complete', k.markedComplete, await scalar("select count(*) from enrollments where status='completed'"))
check('certificates issued', k.certificatesIssued, await scalar("select count(*) from certificates where status='issued'"))

console.log('\nLesson funnel')
check('lessons started', k.lessonsStarted, await scalar('select count(*) from lesson_progress where is_viewed'))
check('lessons completed', k.lessonsCompleted, await scalar('select count(*) from lesson_progress where is_completed'))
check('learning seconds', k.totalLearningSeconds, await scalar('select coalesce(sum(time_spent_learning),0) from lesson_progress'))

console.log('\nQuizzes')
check('quiz attempts', k.quizAttempts, await scalar("select count(*) from quiz_attempts where result <> 'in_progress'"))
check('quiz passes', Math.round(((k.quizPassRate ?? 0) / 100) * k.quizAttempts), await scalar("select count(*) from quiz_attempts where result='pass'"))

console.log('\nProgress (derived — completed published lessons / published lessons)')
const progressSql = `
  with pub as (select course_id, count(*) n from lessons where status='published' group by 1),
  done as (
    select e.id eid, e.course_id, count(*) filter (where lp.is_completed) c
    from enrollments e
    left join lesson_progress lp on lp.enrollment_id = e.id
    left join lessons l on l.id = lp.lesson_id and l.status='published'
    group by 1,2
  )
  select round(avg(least(100, 100.0*d.c/nullif(pub.n,0)))) from done d left join pub on pub.course_id=d.course_id`
check('average progress %', k.averageProgress, await scalar(progressSql))
check(
  'enrollments at 100%',
  k.fullyProgressed,
  await scalar(`with pub as (select course_id, count(*) n from lessons where status='published' group by 1),
    done as (select e.id eid, e.course_id, count(*) filter (where lp.is_completed) c
      from enrollments e left join lesson_progress lp on lp.enrollment_id=e.id
      left join lessons l on l.id=lp.lesson_id and l.status='published' group by 1,2)
    select count(*) from done d left join pub on pub.course_id=d.course_id where pub.n is not null and d.c >= pub.n`)
)

console.log('\nAccessibility coverage')
const cov = computeAccessibilityCoverage(snap)
check('courses supporting TTS', cov.courses.supportsTts, await scalar('select count(*) from courses where supports_tts and deleted_at is null'))
check('lessons with focus mode', cov.lessons.focusMode, await scalar('select count(*) from lessons where focus_mode_enabled'))
check('lessons with chunked content', cov.lessons.chunkedContent, await scalar('select count(*) from lessons where chunked_content_enabled'))
check("lessons with real transcript", cov.lessons.withTranscriptContent, await scalar("select count(*) from lessons where transcript is not null and btrim(transcript) <> ''"))
check('published lessons', cov.lessons.published, await scalar("select count(*) from lessons where status='published'"))

console.log('\nAdaptation events')
const usage = computeAdaptationUsage(snap, range)
check(
  'total adaptation events',
  usage.reduce((s, u) => s + u.events, 0),
  await scalar('select count(*) from adaptive_interactions')
)
check(
  'distinct adaptation users',
  new Set(snap.adaptations.map((a) => a.user_id)).size,
  await scalar('select count(distinct user_id) from adaptive_interactions')
)

console.log('\nContext (not assertions — figures needing human judgement)')
const adoption = computeSettingsAdoption(snap)
console.log(`  saved accessibility preferences: ${adoption.denominator} of ${adoption.populationTotal} users`)
console.log(`  total learning time: ${formatDuration(k.totalLearningSeconds)}`)
const bands: Record<string, number> = {}
for (const u of snap.users) {
  if (u.role !== 'learner') continue
  const b = activityBand(index.lastActive.get(u.id))
  bands[b] = (bands[b] ?? 0) + 1
}
console.log(`  learner activity bands: ${JSON.stringify(bands)}`)
const top = computeCoursePerformance(snap, index)
  .filter((c) => c.enrollments > 0)
  .sort((a, b) => b.enrollments - a.enrollments)[0]
if (top) {
  console.log(
    `  top course: ${top.title} — ${top.enrollments} enrolled, ${top.markedCompleteRate}% marked complete, ${top.averageProgress}% avg progress`
  )
}

await sql.end()

console.log(
  failures === 0
    ? '\nAll assertions matched the database.\n'
    : `\n${failures} assertion(s) disagreed with the database.\n`
)
process.exit(failures === 0 ? 0 : 1)
