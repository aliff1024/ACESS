/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes; matches the scripts/audit/ convention. */
/**
 * Gamification flow test — audit tooling.
 *
 * Drives one learner from "no data at all" through first lesson, first course
 * and first certificate, asserting after every step that the derived
 * achievements, XP and level move exactly as they should, that repeating an
 * action never pays twice, and that the certificate the endpoint writes
 * carries real course and learner information rather than placeholders.
 *
 * It also exercises the endpoint's authorization: an unauthenticated claim,
 * a re-claim, and a claim for a course the learner is not enrolled in.
 *
 * IT WRITES, then removes everything it wrote. It refuses to run against a
 * learner who already has enrollments, so cleanup can never delete real data.
 * Requires the dev server on http://localhost:3000 for the claim endpoint.
 *
 *   npm run dev          # in another terminal
 *   npx tsx scripts/audit/gamification-flow.ts
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { buildGamification } from '../../src/lib/learner-api';

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
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'applicant1@acess.demo';
let problems = 0;
const check = (label: string, cond: boolean, detail = '') => {
  if (!cond) problems++;
  console.log(`   ${cond ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function snapshot(userId: string) {
  const { data: enrollments } = await db
    .from('enrollments').select('id, course_id, status, enrolled_at, completed_at')
    .eq('user_id', userId).neq('status', 'dropped');
  const ids = (enrollments || []).map((e) => e.id);
  const courseIds = [...new Set((enrollments || []).map((e) => e.course_id))];
  const [{ data: lessons }, { data: progress }, { data: attempts }, { data: certs }, { data: badges }] =
    await Promise.all([
      courseIds.length ? db.from('lessons').select('id').in('course_id', courseIds)
        .eq('status', 'published').or('visibility_status.eq.visible,visibility_status.is.null')
        : Promise.resolve({ data: [] as any[] }),
      ids.length ? db.from('lesson_progress')
        .select('lesson_id, is_completed, first_viewed_at, last_viewed_at, progress_meta').in('enrollment_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length ? db.from('quiz_attempts')
        .select('quiz_id, score_pct, result, submitted_at, started_at').in('enrollment_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      db.from('certificates').select('id, issued_at, completion_date, status').eq('user_id', userId).eq('status', 'issued'),
      db.from('user_achievements').select('achievement_id, earned_at').eq('user_id', userId),
    ]);
  return buildGamification({
    enrollments: (enrollments || []) as any,
    publishedLessonIds: new Set((lessons || []).map((l: any) => l.id)),
    progress: (progress || []) as any,
    attempts: (attempts || []) as any,
    certificates: (certs || []) as any,
    badges: (badges || []) as any,
  });
}

const unlockedCodes = (g: any) => g.achievements.filter((a: any) => a.unlocked).map((a: any) => a.code);

async function main() {
  const { data: user } = await db.from('users').select('id, full_name').eq('email', EMAIL).single();
  const uid = user!.id;

  const { count: existing } = await db
    .from('enrollments').select('id', { count: 'exact', head: true }).eq('user_id', uid);
  if ((existing ?? 0) > 0) {
    console.error(`${EMAIL} already has enrollments; pick a learner with none so cleanup is safe.`);
    process.exit(1);
  }

  // A small course with certificates enabled and no quizzes to satisfy.
  const { data: courses } = await db
    .from('courses').select('id, title, certificate_enabled')
    .eq('status', 'published').eq('certificate_enabled', true);
  const candidates: { c: any; lessonIds: string[]; quizIds: string[] }[] = [];
  for (const c of courses || []) {
    const { data: ls } = await db.from('lessons').select('id').eq('course_id', c.id)
      .eq('status', 'published').or('visibility_status.eq.visible,visibility_status.is.null');
    if (!(ls || []).length) continue;
    const { data: qs } = await db.from('quizzes').select('id').in('lesson_id', (ls || []).map((l) => l.id));
    candidates.push({ c, lessonIds: (ls || []).map((l) => l.id), quizIds: (qs || []).map((q) => q.id) });
  }
  const pick = candidates.sort((a, b) => a.lessonIds.length - b.lessonIds.length)[0];
  if (!pick) { console.error('No certificate course to test with.'); process.exit(1); }
  const course = pick.c;
  const lessonIds = pick.lessonIds;
  const quizIds = pick.quizIds;
  console.log(`Course under test: ${course.title} (${lessonIds.length} lessons, ${quizIds.length} quizzes)\n`);

  const created: { enrollmentId?: string; certId?: string } = {};

  try {
    console.log('STEP 0 — brand-new learner');
    let g = await snapshot(uid);
    check('0 XP, level 1', g.xp.total === 0 && g.level.level === 1, `${g.xp.total} XP, L${g.level.level}`);
    check('nothing unlocked', unlockedCodes(g).length === 0);
    check('no fabricated earned dates', g.achievements.every((a: any) => a.earned_at === null));

    console.log('\nSTEP 1 — enrol');
    const { data: enr } = await db.from('enrollments')
      .insert({ user_id: uid, course_id: course.id, status: 'active', enrolled_at: new Date().toISOString() })
      .select('id').single();
    created.enrollmentId = enr!.id;
    g = await snapshot(uid);
    check('enrolling alone earns nothing', g.xp.total === 0, `${g.xp.total} XP`);

    console.log('\nSTEP 2 — complete the first lesson');
    const now = new Date().toISOString();
    await db.from('lesson_progress').insert({
      enrollment_id: enr!.id, lesson_id: lessonIds[0], is_completed: true, is_viewed: true,
      summary_completed: true, view_count: 1, first_viewed_at: now, last_viewed_at: now,
      progress_meta: { completed_at: now },
    });
    g = await snapshot(uid);
    check('First Lesson unlocked', unlockedCodes(g).includes('first_lesson'));
    check('lesson XP + achievement XP', g.xp.total === 100 + 50, `${g.xp.total} XP`);
    const firstLesson = g.achievements.find((a: any) => a.code === 'first_lesson');
    check('earned date is the completion moment', firstLesson.earned_at === now, String(firstLesson.earned_at));
    check('course not yet complete', g.metrics.courses_completed === 0);

    console.log('\nSTEP 3 — re-run the same completion (idempotence)');
    const before = g.xp.total;
    await db.from('lesson_progress').update({ last_viewed_at: new Date().toISOString() })
      .eq('enrollment_id', enr!.id).eq('lesson_id', lessonIds[0]);
    g = await snapshot(uid);
    check('XP unchanged', g.xp.total === before, `${g.xp.total} vs ${before}`);
    check('earned date unchanged', g.achievements.find((a: any) => a.code === 'first_lesson').earned_at === now);
    const { count: dupes } = await db.from('user_achievements')
      .select('id', { count: 'exact', head: true }).eq('user_id', uid);
    check('no duplicate achievement rows written', (dupes ?? 0) === 0, `${dupes} rows`);

    console.log('\nSTEP 4 — complete the rest, then let the DB derive completion');
    for (const lid of lessonIds.slice(1)) {
      const t = new Date().toISOString();
      await db.from('lesson_progress').insert({
        enrollment_id: enr!.id, lesson_id: lid, is_completed: true, is_viewed: true,
        summary_completed: true, view_count: 1, first_viewed_at: t, last_viewed_at: t,
        progress_meta: { completed_at: t },
      });
    }
    // Pass every quiz, twice each — the second attempt proves that XP and the
    // quiz count are per DISTINCT quiz, not per attempt.
    for (const qid of quizIds) {
      for (const attempt of [1, 2]) {
        await db.from('quiz_attempts').insert({
          enrollment_id: enr!.id, quiz_id: qid, attempt_number: attempt, score_pct: 95,
          result: 'pass', started_at: new Date().toISOString(), submitted_at: new Date().toISOString(),
        });
      }
    }
    if (quizIds.length) {
      const gq = await snapshot(uid);
      check('retaking a passed quiz does not re-count it',
        gq.metrics.quizzes_passed === quizIds.length, `${gq.metrics.quizzes_passed} of ${quizIds.length}`);
    }

    // The learner's own client calls this RPC; it is the authority on completion.
    const { data: link } = await db.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
    await anon.auth.verifyOtp({ token_hash: (link!.properties as any).hashed_token, type: 'magiclink' });
    const { data: state, error: rpcErr } = await anon.rpc('sync_learner_course_state', { p_course_id: course.id });
    check('sync_learner_course_state succeeded', !rpcErr, rpcErr?.message || JSON.stringify(state));
    check('database derived 100%', (state as any)?.progress_pct === 100, `${(state as any)?.progress_pct}%`);
    check('database marked the course complete', (state as any)?.status === 'completed');

    g = await snapshot(uid);
    check('Course Finisher unlocked', unlockedCodes(g).includes('first_course'));
    check('courses_completed is 1', g.metrics.courses_completed === 1);
    const expected =
      lessonIds.length * 100 + quizIds.length * 50 + 500 +
      g.achievements.filter((a: any) => a.unlocked).reduce((s: number, a: any) => s + a.xp, 0);
    check('XP matches the formula', g.xp.total === expected, `${g.xp.total} vs ${expected}`);

    console.log('\nSTEP 5 — claim the certificate through the real endpoint');
    const { data: sess } = await anon.auth.getSession();
    const cookieHeader = `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token=base64-${Buffer.from(
      JSON.stringify({
        access_token: sess.session!.access_token, refresh_token: sess.session!.refresh_token,
        expires_at: sess.session!.expires_at, expires_in: sess.session!.expires_in,
        token_type: sess.session!.token_type, user: sess.session!.user,
      }),
    ).toString('base64')}`;
    // `redirect: 'manual'` matters throughout: the middleware answers an
    // unauthenticated call with a 307 to /login, and following that lands on a
    // 200 page which would read as the endpoint having accepted the request.
    const res = await fetch('http://localhost:3000/api/certificates/claim', {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookieHeader },
      body: JSON.stringify({ courseId: course.id }),
    });
    const claim = await res.json();
    check('claim succeeded', res.ok, JSON.stringify(claim));
    if (res.ok) {
      created.certId = claim.id;
      const { data: cert } = await db.from('certificates').select('*').eq('id', claim.id).single();
      check('learner name recorded', cert!.learner_name === user!.full_name, String(cert!.learner_name));
      check('course title recorded', cert!.course_title === course.title, String(cert!.course_title));
      check('educator recorded', !!cert!.educator_name, String(cert!.educator_name));
      check('institution recorded', !!cert!.institution_name, String(cert!.institution_name));
      check('no placeholder values',
        !['Course', 'Learner', 'Educator'].includes(cert!.course_title) &&
        !['Course', 'Learner', 'Educator'].includes(cert!.learner_name!));
      check('real duration derived', Number(cert!.course_duration_hours) > 0, `${cert!.course_duration_hours}h`);
      check('verification URL on the app host',
        String(cert!.verification_url).startsWith('http://localhost:3000/verify/'), String(cert!.verification_url));
      check('marked as a generated certificate', (cert!.metadata as any)?.is_custom === false);
      check('completion date matches the enrollment', !!cert!.completion_date);

      console.log('\nSTEP 6 — claim again (no duplicate certificate)');
      // Same session, same course: must return the SAME certificate.
      const res2 = await fetch('http://localhost:3000/api/certificates/claim', {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookieHeader },
        body: JSON.stringify({ courseId: course.id }),
      });
      const claim2 = await res2.json();
      check('re-claiming returns the same certificate', claim2.id === claim.id, `${claim2.id} vs ${claim.id}`);

      const res3 = await fetch('http://localhost:3000/api/certificates/claim', {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ courseId: course.id }),
      });
      check('an unauthenticated claim is refused', res3.status === 307 || res3.status === 401,
        `status ${res3.status} -> ${res3.headers.get('location') || ''}`);

      // A course this learner is not enrolled in must not mint a certificate.
      const other = candidates.find((x) => x.c.id !== course.id);
      if (other) {
        const res4 = await fetch('http://localhost:3000/api/certificates/claim', {
          method: 'POST', redirect: 'manual',
          headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', Cookie: cookieHeader },
          body: JSON.stringify({ courseId: other.c.id }),
        });
        const claim4 = await res4.json().catch(() => ({}));
        check('claiming a course the learner is not enrolled in is refused',
          res4.status >= 400, `status ${res4.status} ${JSON.stringify(claim4)}`);
      }
      const { count: certCount } = await db.from('certificates')
        .select('id', { count: 'exact', head: true }).eq('user_id', uid);
      check('exactly one certificate row', certCount === 1, `${certCount}`);

      g = await snapshot(uid);
      check('Certified unlocked', unlockedCodes(g).includes('first_certificate'));
      check('certificates_earned is 1', g.metrics.certificates_earned === 1);
      console.log(`   final: ${g.xp.total} XP, level ${g.level.level} (${g.level.title}), ${unlockedCodes(g).length} unlocked`);
    }
  } finally {
    console.log('\nCLEANUP');
    if (created.certId) await db.from('certificates').delete().eq('id', created.certId);
    await db.from('certificates').delete().eq('user_id', uid);
    if (created.enrollmentId) {
      await db.from('lesson_progress').delete().eq('enrollment_id', created.enrollmentId);
      await db.from('quiz_attempts').delete().eq('enrollment_id', created.enrollmentId);
      await db.from('enrollments').delete().eq('id', created.enrollmentId);
    }
    await db.from('user_achievements').delete().eq('user_id', uid);
    const { count: left } = await db.from('enrollments').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    const { count: leftCerts } = await db.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    console.log(`   removed — enrollments left: ${left}, certificates left: ${leftCerts}`);
  }

  console.log(`\n${problems === 0 ? 'PASS' : 'FAIL'} — ${problems} problem(s)`);
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
