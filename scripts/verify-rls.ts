/**
 * Row level security probe.
 *
 *   npx tsx scripts/verify-rls.ts
 *
 * Signs in as real seeded accounts and checks that each role only sees what it
 * should. Every assertion runs through PostgREST with the anon key and a user
 * JWT — exactly the path the browser uses — so the policies are what is being
 * tested, not the service role.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PW = 'AcessDemo#2026';

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
  }
};

async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return c;
}

async function main() {
  console.log(`RLS probe → ${URL}\n`);

  // Ground truth from the service role.
  const { data: users } = await svc.from('users').select('id, email, role');
  const amir = users!.find((u) => u.email === 'amir.learner@acess.edu.my')!;
  const mei = users!.find((u) => u.email === 'mei.learner@acess.edu.my')!;
  const siti = users!.find((u) => u.email === 'siti.educator@acess.edu.my')!;
  const marcus = users!.find((u) => u.email === 'marcus.educator@acess.edu.my')!;

  const { count: totalEnrol } = await svc.from('enrollments').select('*', { count: 'exact', head: true });
  const { count: totalCerts } = await svc.from('certificates').select('*', { count: 'exact', head: true });
  const { count: totalProgress } = await svc.from('lesson_progress').select('*', { count: 'exact', head: true });

  // ── Learner isolation ───────────────────────────────────────────────
  console.log('Learner A (Amir) — private data isolation');
  const a = await signIn('amir.learner@acess.edu.my');

  const { data: myEnrol } = await a.from('enrollments').select('id, user_id');
  check(
    `sees only own enrolments (${myEnrol?.length}/${totalEnrol})`,
    !!myEnrol && myEnrol.length > 0 && myEnrol.every((e) => e.user_id === amir.id)
  );

  const { data: otherEnrol } = await a.from('enrollments').select('id').eq('user_id', mei.id);
  check("cannot read another learner's enrolments", (otherEnrol?.length ?? 0) === 0);

  const { data: myCerts } = await a.from('certificates').select('id, user_id');
  check(
    `sees only own certificates (${myCerts?.length}/${totalCerts})`,
    !!myCerts && myCerts.every((c) => c.user_id === amir.id)
  );

  const { data: myProg } = await a.from('lesson_progress').select('id, enrollment_id');
  const myEnrolIds = new Set((myEnrol ?? []).map((e) => e.id));
  check(
    `sees only own lesson_progress (${myProg?.length}/${totalProgress})`,
    !!myProg && myProg.length > 0 && myProg.every((p) => myEnrolIds.has(p.enrollment_id))
  );

  const { data: myAttempts } = await a.from('quiz_attempts').select('id, enrollment_id');
  check(
    'sees only own quiz attempts',
    !!myAttempts && myAttempts.every((x) => myEnrolIds.has(x.enrollment_id))
  );

  const { data: myNotifs } = await a.from('notifications').select('id, user_id');
  check('sees only own notifications', !!myNotifs && myNotifs.every((n) => n.user_id === amir.id));

  const { data: myAch } = await a.from('user_achievements').select('id, user_id');
  check('sees only own achievements', !!myAch && myAch.every((x) => x.user_id === amir.id));

  // ── Write protection ────────────────────────────────────────────────
  console.log('\nLearner A — write protection');

  const { error: roleErr } = await a.from('users').update({ role: 'admin' }).eq('id', amir.id);
  const { data: roleAfter } = await svc.from('users').select('role').eq('id', amir.id).single();
  check('cannot promote self to admin', roleAfter?.role === 'learner', roleErr ? '' : 'update was not rejected');

  const { error: enrolErr } = await a
    .from('enrollments')
    .insert({ user_id: mei.id, course_id: myEnrol![0] ? (await svc.from('enrollments').select('course_id').eq('id', myEnrol![0].id).single()).data!.course_id : null });
  check('cannot enrol another learner', !!enrolErr, enrolErr ? '' : 'insert succeeded');

  const { error: forgeErr } = await a
    .from('quiz_attempts')
    .insert({ enrollment_id: myEnrol![0].id, quiz_id: (await svc.from('quizzes').select('id').limit(1).single()).data!.id, attempt_number: 99, score_pct: 100, result: 'pass' });
  check('cannot forge a quiz score', !!forgeErr, forgeErr ? '' : 'insert succeeded');

  const { error: completeErr } = await a
    .from('enrollments')
    .update({ status: 'completed' })
    .eq('id', myEnrol!.find((e) => true)!.id);
  check('cannot self-declare course completion', !!completeErr, completeErr ? '' : 'update succeeded');

  // ── Quiz answer key ─────────────────────────────────────────────────
  // The rule (migration 20260825001200) is not "never": a learner may see the
  // key for a quiz they have already submitted, because the answer-review
  // screen needs it. What must never leak is the key for a quiz they have not
  // attempted yet.
  console.log('\nLearner A — quiz answer key');

  const { data: allQuizzes } = await svc.from('quizzes').select('id, title');
  const { data: attemptRows } = await svc
    .from('quiz_attempts')
    .select('quiz_id, enrollment_id, enrollments!inner(user_id)')
    .eq('enrollments.user_id', amir.id);
  const attempted = new Set((attemptRows ?? []).map((r: any) => r.quiz_id));
  const unattempted = (allQuizzes ?? []).filter((q) => !attempted.has(q.id));

  const { data: seenOpts } = await a.from('quiz_options').select('id, question_id, is_correct').limit(200);
  const { data: allQuestions } = await svc.from('quiz_questions').select('id, quiz_id');
  const qToQuiz = new Map((allQuestions ?? []).map((q) => [q.id, q.quiz_id]));
  const leakedAhead = (seenOpts ?? []).filter((o) => !attempted.has(qToQuiz.get(o.question_id)!));

  check(
    `answer key readable only for the ${attempted.size} quizzes already submitted (${unattempted.length} not attempted)`,
    unattempted.length > 0 && leakedAhead.length === 0,
    leakedAhead.length ? `${leakedAhead.length} options leaked from un-attempted quizzes` : ''
  );

  // The learner-facing view must null the key for an un-attempted quiz.
  if (unattempted.length > 0) {
    const { data: unattemptedQs } = await svc.from('quiz_questions').select('id').eq('quiz_id', unattempted[0].id);
    const ids = (unattemptedQs ?? []).map((q) => q.id);
    const { data: scoped } = await a.from('quiz_options_scoped').select('id, option_text, is_correct').in('question_id', ids);
    check(
      'quiz_options_scoped still returns the options but with is_correct = NULL',
      (scoped?.length ?? 0) > 0 && (scoped ?? []).every((o) => o.is_correct === null && !!o.option_text)
    );
  }

  // ── Educator scoping ────────────────────────────────────────────────
  console.log('\nEducator (Siti) — cohort scoping');
  const e = await signIn('siti.educator@acess.edu.my');
  const { data: sitiCourses } = await e.from('courses').select('id, created_by, status');
  const ownCourses = (sitiCourses ?? []).filter((c) => c.created_by === siti.id);
  check(`sees own courses (${ownCourses.length})`, ownCourses.length > 0);

  const { data: marcusDrafts } = await e.from('courses').select('id').eq('created_by', marcus.id).neq('status', 'published');
  check("cannot see another educator's unpublished courses", (marcusDrafts?.length ?? 0) === 0);

  const { error: hijackErr } = await e
    .from('courses')
    .update({ title: 'HIJACKED' })
    .eq('created_by', marcus.id);
  const { data: hijacked } = await svc.from('courses').select('id').eq('title', 'HIJACKED');
  check("cannot edit another educator's course", (hijacked?.length ?? 0) === 0, hijackErr ? '' : '');

  // ── Anonymous ───────────────────────────────────────────────────────
  console.log('\nAnonymous visitor');
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: anonCourses } = await anon.from('courses').select('id, status');
  check(
    `can browse published courses (${anonCourses?.length ?? 0})`,
    (anonCourses?.length ?? 0) > 0 && (anonCourses ?? []).every((c) => c.status === 'published')
  );
  const { data: anonUsers } = await anon.from('users').select('id');
  check('cannot list user accounts', (anonUsers?.length ?? 0) === 0);
  const { data: anonProgress } = await anon.from('lesson_progress').select('id');
  check('cannot read anyone\'s progress', (anonProgress?.length ?? 0) === 0);
  const { data: anonCerts } = await anon.from('certificates').select('id');
  check('cannot list certificates', (anonCerts?.length ?? 0) === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('probe failed:', err.message);
  process.exit(1);
});
