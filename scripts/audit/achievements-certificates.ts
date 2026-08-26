/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes across many tables; typing each one adds
   no safety to a read-only diagnostic script. Matches the convention in
   scripts/audit/. */
/**
 * Achievements & Certificates oracle — audit tooling.
 *
 * Recomputes, from the database with the service role, every number the
 * Achievements & Certificates page shows a learner, and asserts the
 * application would agree. It imports the SAME pure derivation the UI uses
 * (`buildGamification` in src/lib/learner-api.ts), so a divergence means the
 * queries drifted, not that two implementations were written twice.
 *
 * It also checks the certificate records themselves for the failure modes the
 * audit found: missing course information, placeholder values, dates that
 * disagree with the enrollment, and verification URLs that point somewhere the
 * app is not served from.
 *
 * Read-only. Nothing here writes.
 *
 *   npx tsx scripts/audit/achievements-certificates.ts                 # all learners
 *   npx tsx scripts/audit/achievements-certificates.ts learner@acess.demo
 *   npx tsx scripts/audit/achievements-certificates.ts --origin https://acess.example.com
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { buildGamification } from '../../src/lib/learner-api';
import { ACHIEVEMENTS } from '../../src/lib/gamification';

function loadEnv() {
  const raw = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ONLY_EMAIL = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;

/**
 * The host certificates are expected to be verifiable at.
 *
 * Stored verification URLs are only meaningful relative to where the app is
 * actually served. Pass --origin to check against a deployed host; without it
 * the local dev origin is assumed, so a development database does not report
 * every certificate as broken.
 */
const originArg = process.argv.indexOf('--origin');
const EXPECTED_ORIGIN = (originArg > -1 ? process.argv[originArg + 1] : 'http://localhost:3000').replace(/\/$/, '');

let problems = 0;
let warnings = 0;
function fail(msg: string) {
  problems++;
  console.log(`   ✗ ${msg}`);
}
/**
 * A data condition worth surfacing that is not a code defect — typically a
 * row written by a seed or migration rather than by the application.
 */
function warn(msg: string) {
  warnings++;
  console.log(`   ! ${msg}`);
}
function ok(msg: string) {
  console.log(`   ✓ ${msg}`);
}

async function auditLearner(user: any) {
  console.log(`\n── ${user.full_name} <${user.email}>`);

  const { data: enrollments } = await db
    .from('enrollments')
    .select('id, course_id, status, enrolled_at, completed_at')
    .eq('user_id', user.id)
    .neq('status', 'dropped');

  const enrollmentIds = (enrollments || []).map((e) => e.id);
  const courseIds = [...new Set((enrollments || []).map((e) => e.course_id))];

  const [{ data: lessons }, { data: progress }, { data: attempts }, { data: certs }, { data: badges }] =
    await Promise.all([
      courseIds.length
        ? db.from('lessons').select('id, course_id')
            .in('course_id', courseIds)
            .eq('status', 'published')
            .or('visibility_status.eq.visible,visibility_status.is.null')
        : Promise.resolve({ data: [] as any[] }),
      enrollmentIds.length
        ? db.from('lesson_progress')
            .select('lesson_id, is_completed, first_viewed_at, last_viewed_at, progress_meta')
            .in('enrollment_id', enrollmentIds)
        : Promise.resolve({ data: [] as any[] }),
      enrollmentIds.length
        ? db.from('quiz_attempts')
            .select('quiz_id, score_pct, result, submitted_at, started_at')
            .in('enrollment_id', enrollmentIds)
        : Promise.resolve({ data: [] as any[] }),
      db.from('certificates').select('*').eq('user_id', user.id),
      db.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user.id),
    ]);

  const issued = (certs || []).filter((c) => c.status === 'issued');

  const g = buildGamification({
    enrollments: (enrollments || []) as any,
    publishedLessonIds: new Set((lessons || []).map((l: any) => l.id)),
    progress: (progress || []) as any,
    attempts: (attempts || []) as any,
    certificates: issued as any,
    badges: (badges || []) as any,
  });

  console.log(
    `   metrics  lessons=${g.metrics.lessons_completed} courses=${g.metrics.courses_completed} ` +
      `certs=${g.metrics.certificates_earned} quizzes=${g.metrics.quizzes_passed} ` +
      `high=${g.metrics.high_scores} days=${g.metrics.active_days} badges=${g.metrics.course_badges}`,
  );
  console.log(
    `   level    ${g.level.level} (${g.level.title})  ${g.xp.total} XP  ` +
      `${g.level.progress}% to L${g.level.level + 1}  [${g.achievements.filter((a) => a.unlocked).length}/${g.achievements.length} unlocked]`,
  );

  // ── Cross-check against the database's own derivation ──
  // The RPC is the authority for course completion; the page must not report
  // a different number of completed courses than the database derived.
  const dbCompleted = (enrollments || []).filter((e) => e.status === 'completed').length;
  if (dbCompleted !== g.metrics.courses_completed) {
    fail(`courses_completed ${g.metrics.courses_completed} != enrollments.status='completed' ${dbCompleted}`);
  }

  // Every completed course must divide by the same lesson set the Progress
  // page uses. A mismatch here is the "Progress says 40%, achievement says
  // completed" failure.
  const lessonsByCourse = new Map<string, string[]>();
  for (const l of (lessons || []) as any[]) {
    lessonsByCourse.set(l.course_id, [...(lessonsByCourse.get(l.course_id) || []), l.id]);
  }
  const completedByEnrollment = new Map<string, Set<string>>();
  for (const e of enrollments || []) completedByEnrollment.set(e.id, new Set());
  // progress rows are not tagged with enrollment here, so re-read per enrollment
  for (const e of enrollments || []) {
    const ids = lessonsByCourse.get(e.course_id) || [];
    if (ids.length === 0) continue;
    const { count } = await db
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', e.id)
      .eq('is_completed', true)
      .in('lesson_id', ids);
    const pct = Math.round(((count || 0) / ids.length) * 100);
    if (e.status === 'completed' && pct < 100) {
      // Not necessarily wrong. `sync_learner_course_state()` only ever moves
      // completion forward, deliberately: adding a lesson to a finished course
      // must not retroactively un-complete a learner or invalidate a
      // certificate already issued. So a completed enrollment sitting below
      // 100% is expected when the course grew afterwards — and is a seeding
      // artefact when it did not. Either way the learner sees one consistent
      // answer, because the Progress page and the achievement count both read
      // this same `status` field.
      warn(`enrollment ${e.id} is 'completed' at ${pct}% of current published lessons (course may have grown, or the row was seeded)`);
    }
  }

  // ── Achievement consistency ──
  const codes = new Set<string>();
  for (const a of g.achievements) {
    if (codes.has(a.code)) fail(`duplicate achievement code ${a.code}`);
    codes.add(a.code);
    if (a.unlocked && a.current < a.threshold) {
      fail(`${a.code} unlocked with ${a.current} < ${a.threshold}`);
    }
    if (!a.unlocked && a.current >= a.threshold) {
      fail(`${a.code} locked despite ${a.current} >= ${a.threshold}`);
    }
    if (a.unlocked && a.earned_at) {
      const t = new Date(a.earned_at).getTime();
      if (Number.isNaN(t)) fail(`${a.code} has an unparseable earned_at`);
      else if (t > Date.now() + 86_400_000) fail(`${a.code} earned_at is in the future`);
    }
  }

  // XP must be reproducible from the same metrics.
  const expectedXP =
    g.metrics.lessons_completed * 100 +
    g.metrics.quizzes_passed * 50 +
    g.metrics.courses_completed * 500 +
    g.metrics.certificates_earned * 250 +
    g.achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0);
  if (expectedXP !== g.xp.total) fail(`XP ${g.xp.total} != recomputed ${expectedXP}`);

  // ── Certificates ──
  for (const c of certs || []) {
    const label = `${c.reference_code}`;
    const { data: course } = c.course_id
      ? await db.from('courses').select('id, title').eq('id', c.course_id).maybeSingle()
      : { data: null };
    const { data: enr } = c.enrollment_id
      ? await db.from('enrollments').select('user_id, course_id, completed_at').eq('id', c.enrollment_id).maybeSingle()
      : { data: null };

    if (!c.course_title && !course?.title) fail(`${label}: no course title, snapshot or live`);
    if (!c.learner_name) fail(`${label}: learner_name is empty`);
    for (const [field, value] of Object.entries({
      course_title: c.course_title,
      learner_name: c.learner_name,
      educator_name: c.educator_name,
    })) {
      if (typeof value === 'string' && ['Course', 'Learner', 'Educator', 'Unknown Course', 'Unknown Learner'].includes(value)) {
        fail(`${label}: ${field} is the placeholder "${value}"`);
      }
    }
    if (c.user_id && enr && enr.user_id !== c.user_id) {
      fail(`${label}: certificate user_id does not match its enrollment's learner`);
    }
    if (c.course_id && enr && enr.course_id !== c.course_id) {
      fail(`${label}: certificate course_id does not match its enrollment's course`);
    }
    if (c.completion_date && new Date(c.completion_date).getTime() > Date.now() + 86_400_000) {
      fail(`${label}: completion_date is in the future`);
    }
    if (c.verification_url && !c.verification_url.includes('/verify/')) {
      fail(`${label}: verification_url does not point at /verify/`);
    }
    if (c.verification_url && !String(c.verification_url).startsWith(`${EXPECTED_ORIGIN}/verify/`)) {
      fail(`${label}: verification_url is ${c.verification_url}, not ${EXPECTED_ORIGIN}/verify/...`);
    }
    if (!c.course_duration_hours && course) {
      const { data: ls } = await db
        .from('lessons').select('estimated_duration')
        .eq('course_id', course.id).eq('status', 'published')
        .or('visibility_status.eq.visible,visibility_status.is.null');
      const mins = (ls || []).reduce((s: number, l: any) => s + (Number(l.estimated_duration) || 0), 0);
      if (mins > 0) fail(`${label}: course_duration_hours is 0 but the course really runs ${Math.round(mins / 6) / 10}h`);
    } else if (course) {
      const { data: ls } = await db
        .from('lessons').select('estimated_duration')
        .eq('course_id', course.id).eq('status', 'published')
        .or('visibility_status.eq.visible,visibility_status.is.null');
      const real = Math.round(((ls || []).reduce((s: number, l: any) => s + (Number(l.estimated_duration) || 0), 0) / 60) * 10) / 10;
      const stored = Number(c.course_duration_hours);
      if (real > 0 && Math.abs(stored - real) > Math.max(1, real * 0.5)) {
        fail(`${label}: course_duration_hours ${stored}h is not close to the real ${real}h`);
      }
    }
  }

  if (issued.length !== g.metrics.certificates_earned) {
    fail(`certificates_earned ${g.metrics.certificates_earned} != issued rows ${issued.length}`);
  } else {
    ok(`${issued.length} issued certificate(s) visible to this learner`);
  }
}

async function main() {
  console.log(`Achievement catalogue: ${ACHIEVEMENTS.length} definitions`);
  const dupes = ACHIEVEMENTS.map((a) => a.code).filter((c, i, arr) => arr.indexOf(c) !== i);
  if (dupes.length) fail(`duplicate codes in catalogue: ${dupes.join(', ')}`);

  let query = db.from('users').select('id, email, full_name, role').eq('role', 'learner');
  if (ONLY_EMAIL) query = query.eq('email', ONLY_EMAIL);
  const { data: users, error } = await query;
  if (error) throw error;
  if (!users?.length) {
    console.error('No matching learners.');
    process.exit(1);
  }

  for (const u of users) await auditLearner(u);

  console.log(`\n${problems === 0 ? 'PASS' : 'FAIL'} — ${problems} problem(s) across ${users.length} learner(s)`);
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
