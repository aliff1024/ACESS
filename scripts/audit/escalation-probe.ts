/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes across many tables; typing each one adds
   no safety to a diagnostic script. Matches the convention in scripts/. */
/**
 * Privilege-escalation and sensitive-data sweep — audit tooling.
 *
 * The original audit found one escalation path (`users.role`) by testing that
 * one column. This script generalises the question: for EVERY table a learner
 * can reach through the public anon key, can they
 *
 *   1. read rows that belong to other people (enumeration / PII exposure), and
 *   2. write a column that grants themselves privilege, approval, publication,
 *      completion or a credential?
 *
 * It signs in as a real learner with the anon key — exactly what the browser
 * holds — so anything it can do here, a learner can do from devtools.
 *
 * Every write probe restores whatever it changed via the service role.
 *
 *   npx tsx scripts/audit/escalation-probe.ts
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const LEARNER_EMAIL = process.env.PROBE_EMAIL || 'learner@acess.demo';
const LEARNER_PASSWORD = process.env.PROBE_PASSWORD || 'AcessDemo2026!';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Verdict = 'PASS' | 'FAIL' | 'INFO';
const results: Array<{ area: string; probe: string; verdict: Verdict; detail: string }> = [];
function rec(area: string, probe: string, verdict: Verdict, detail: string) {
  results.push({ area, probe, verdict, detail });
  const tag = verdict === 'PASS' ? 'PASS' : verdict === 'FAIL' ? '*** FAIL ***' : 'info';
  console.log(`  [${tag}] ${area.padEnd(30)} ${probe.padEnd(42)} ${detail}`);
}

async function main() {
  const { data: me, error: signInErr } = await anon.auth.signInWithPassword({
    email: LEARNER_EMAIL,
    password: LEARNER_PASSWORD,
  });
  if (signInErr) throw new Error(`sign-in failed: ${signInErr.message}`);
  const uid = me.user.id;
  console.log(`\n=== ESCALATION PROBE — acting as ${LEARNER_EMAIL} (${uid}) ===\n`);

  // ─────────────────────────────────────────────────────────────────────
  console.log('--- A. Self privilege escalation on public.users ---');
  const { data: before } = await admin.from('users').select('*').eq('id', uid).single();
  const selfWrites: Array<[string, any]> = [
    ['role -> admin', { role: 'admin' }],
    ['role -> educator', { role: 'educator' }],
    ['role -> superadmin', { role: 'superadmin' }],
    ['is_active -> false', { is_active: false }],
    ['deleted_at -> now', { deleted_at: new Date().toISOString() }],
    ['email -> attacker', { email: 'attacker@example.com' }],
    ['email_verified_at -> now', { email_verified_at: new Date().toISOString() }],
    ['instructor_application_status -> approved', { instructor_application_status: 'approved' }],
    ['instructor_application_status -> rejected', { instructor_application_status: 'rejected' }],
  ];
  for (const [label, patch] of selfWrites) {
    const { data, error } = await anon.from('users').update(patch).eq('id', uid).select();
    const accepted = !error && (data || []).length > 0;
    rec('users (self)', label, accepted ? 'FAIL' : 'PASS', accepted ? 'ACCEPTED' : `blocked ${error?.code ?? 'no-op'}`);
    if (accepted) await admin.from('users').update({ [Object.keys(patch)[0]]: (before as any)[Object.keys(patch)[0]] }).eq('id', uid);
  }
  // legitimate writes must still work
  for (const [label, patch] of [
    ['full_name (legit)', { full_name: before.full_name }],
    ['last_login_at (legit)', { last_login_at: new Date().toISOString() }],
    ['instructor_application_status -> pending (legit)', { instructor_application_status: 'pending' }],
  ] as Array<[string, any]>) {
    const { data, error } = await anon.from('users').update(patch).eq('id', uid).select();
    const accepted = !error && (data || []).length > 0;
    rec('users (self)', label, accepted ? 'PASS' : 'FAIL', accepted ? 'accepted as intended' : `BROKEN ${error?.code} ${error?.message?.slice(0, 50)}`);
  }
  await admin.from('users').update({ instructor_application_status: before.instructor_application_status }).eq('id', uid);

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- B. Credential / token tables ---');
  const { data: prt, error: prtErr } = await anon.from('password_reset_tokens').select('*').limit(50);
  if (prtErr) rec('password_reset_tokens', 'read any reset token', 'PASS', `blocked ${prtErr.code}`);
  else rec('password_reset_tokens', 'read any reset token', (prt || []).length ? 'FAIL' : 'PASS', `${(prt || []).length} rows readable`);

  const { data: signed, error: signedErr } = await anon.from('certificates').select('id, user_id, signed_token').limit(200);
  if (signedErr) rec('certificates', 'read signed_token', 'PASS', `blocked ${signedErr.code}`);
  else {
    const foreign = (signed || []).filter((c: any) => c.user_id !== uid);
    rec('certificates', "read other learners' signed_token", foreign.length ? 'FAIL' : 'PASS', `${foreign.length} foreign rows of ${(signed || []).length}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- C. Self-approval / self-issuance ---');
  const { data: apps, error: appsErr } = await anon.from('instructor_applications').select('*').limit(50);
  if (appsErr) rec('instructor_applications', 'read all applications', 'PASS', `blocked ${appsErr.code}`);
  else {
    const foreign = (apps || []).filter((a: any) => a.user_id && a.user_id !== uid);
    rec('instructor_applications', 'read all applications', foreign.length ? 'FAIL' : 'INFO', `${(apps || []).length} rows, ${foreign.length} not mine`);
    const mine = (apps || []).find((a: any) => a.user_id === uid);
    if (mine) {
      const { data: up, error: upErr } = await anon.from('instructor_applications').update({ status: 'approved' }).eq('id', mine.id).select();
      const accepted = !upErr && (up || []).length > 0;
      rec('instructor_applications', 'approve OWN application', accepted ? 'FAIL' : 'PASS', accepted ? 'ACCEPTED' : `blocked ${upErr?.code ?? 'no-op'}`);
      if (accepted) await admin.from('instructor_applications').update({ status: mine.status }).eq('id', mine.id);
    } else {
      rec('instructor_applications', 'approve OWN application', 'INFO', 'learner has no application row');
    }
  }

  // Self-issue a certificate for a course they have not finished
  const { data: anyCourse } = await admin.from('courses').select('id, title').eq('status', 'published').limit(1).single();
  const { data: myEnr } = await admin.from('enrollments').select('id, course_id, status').eq('user_id', uid).eq('status', 'active').limit(1).maybeSingle();
  const { error: certInsErr, data: certIns } = await anon.from('certificates').insert({
    user_id: uid,
    course_id: anyCourse.id,
    enrollment_id: myEnr?.id ?? null,
    reference_code: 'PROBE-' + Date.now(),
    status: 'issued',
    learner_name: 'Probe',
    course_title: anyCourse.title,
  }).select();
  if (certInsErr) rec('certificates', 'self-issue a certificate', 'PASS', `blocked ${certInsErr.code}`);
  else {
    rec('certificates', 'self-issue a certificate', (certIns || []).length ? 'FAIL' : 'PASS', (certIns || []).length ? 'ACCEPTED — cleaning up' : 'no-op');
    if ((certIns || []).length) await admin.from('certificates').delete().eq('id', certIns[0].id);
  }

  // Mark own enrollment completed without doing the work
  if (myEnr) {
    const { data: eu, error: euErr } = await anon.from('enrollments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', myEnr.id).select();
    const accepted = !euErr && (eu || []).length > 0;
    rec('enrollments', 'self-mark course completed', accepted ? 'FAIL' : 'PASS', accepted ? 'ACCEPTED — reverting' : `blocked ${euErr?.code ?? 'no-op'}`);
    if (accepted) await admin.from('enrollments').update({ status: myEnr.status, completed_at: null }).eq('id', myEnr.id);
  }

  // Award themselves an achievement
  const { data: anyAch } = await admin.from('course_achievements').select('id, course_id').limit(1).maybeSingle();
  if (anyAch) {
    const { data: ai, error: aiErr } = await anon.from('user_achievements').insert({ user_id: uid, achievement_id: anyAch.id, course_id: anyAch.course_id }).select();
    if (aiErr) rec('user_achievements', 'self-award an achievement', 'PASS', `blocked ${aiErr.code}`);
    else {
      rec('user_achievements', 'self-award an achievement', (ai || []).length ? 'FAIL' : 'PASS', (ai || []).length ? 'ACCEPTED — cleaning up' : 'no-op');
      if ((ai || []).length) await admin.from('user_achievements').delete().eq('id', ai[0].id);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- D. Authoring surfaces (learner must not author) ---');
  const authorProbes: Array<[string, () => PromiseLike<any>, () => Promise<void>]> = [
    ['courses INSERT (become an author)', () => anon.from('courses').insert({ title: 'probe', created_by: uid, status: 'published', slug: 'probe-' + Date.now() }).select(), async () => { await admin.from('courses').delete().eq('slug', 'probe'); }],
    ['courses UPDATE others (publish)', () => anon.from('courses').update({ status: 'published' }).eq('id', anyCourse.id).select(), async () => {}],
    ['lessons INSERT', () => anon.from('lessons').insert({ course_id: anyCourse.id, title: 'probe', sequence_order: 999, status: 'published' }).select(), async () => { await admin.from('lessons').delete().eq('title', 'probe'); }],
    ['lessons UPDATE (unpublish a lesson)', () => anon.from('lessons').update({ status: 'draft' }).eq('course_id', anyCourse.id).select(), async () => {}],
    ['quizzes INSERT', () => anon.from('quizzes').insert({ lesson_id: null, title: 'probe' }).select(), async () => {}],
    ['quiz_answers read (answer key)', () => anon.from('quiz_answers').select('id, is_correct').limit(20), async () => {}],
  ];
  for (const [label, fn, cleanup] of authorProbes) {
    const { data, error } = await fn();
    if (error) rec('authoring', label, 'PASS', `blocked ${error.code}`);
    else if ((data || []).length > 0) {
      const isRead = label.includes('read');
      rec('authoring', label, isRead ? 'INFO' : 'FAIL', `${data.length} rows ${isRead ? 'readable' : 'WRITTEN — cleaning up'}`);
      if (!isRead) await cleanup();
    } else rec('authoring', label, 'PASS', '0 rows affected');
  }

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- E. PII exposure across learner-readable tables ---');
  const piiProbes: Array<[string, string]> = [
    ['users', 'id, email, full_name, role'],
    ['user_profiles', 'id, user_id, phone_number'],
    ['contact_messages', 'id, email'],
    ['instructor_applications', 'id, email'],
    ['certificates', 'id, user_id, learner_name'],
    ['notifications', 'id, user_id'],
  ];
  for (const [table, sel] of piiProbes) {
    const { data, error } = await anon.from(table).select(sel).limit(500);
    if (error) { rec('pii', `${table} enumeration`, 'PASS', `blocked ${error.code}`); continue; }
    const rows = data || [];
    const ownerCol = table === 'users' ? 'id' : 'user_id';
    const foreign = rows.filter((r: any) => r[ownerCol] !== undefined && r[ownerCol] !== uid);
    const emails = rows.filter((r: any) => r.email).length;
    if (table === 'users') {
      // learners legitimately need educator/admin names for course-creator labels
      const nonStaff = rows.filter((r: any) => r.id !== uid && !['educator', 'admin'].includes(r.role));
      rec('pii', 'users enumeration', nonStaff.length ? 'FAIL' : 'PASS', `${rows.length} rows visible, ${nonStaff.length} other learners, ${emails} with email`);
    } else {
      rec('pii', `${table} enumeration`, foreign.length ? 'FAIL' : 'PASS', `${rows.length} rows, ${foreign.length} belong to others`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- F. Assessment integrity ---');
  const { data: myQuizEnr } = await admin.from('enrollments').select('id').eq('user_id', uid).limit(1).single();
  const { data: someQuiz } = await admin.from('quizzes').select('id').limit(1).single();
  const { data: fakeAttempt, error: fakeErr } = await anon.from('quiz_attempts').insert({
    enrollment_id: myQuizEnr.id, quiz_id: someQuiz.id, attempt_number: 999, score_pct: 100, result: 'pass',
  }).select();
  if (fakeErr) rec('quiz_attempts', 'insert a forged 100% score', 'PASS', `blocked ${fakeErr.code}`);
  else {
    rec('quiz_attempts', 'insert a forged 100% score', (fakeAttempt || []).length ? 'FAIL' : 'PASS', (fakeAttempt || []).length ? 'ACCEPTED — cleaning up' : 'no-op');
    if ((fakeAttempt || []).length) await admin.from('quiz_attempts').delete().eq('id', fakeAttempt[0].id);
  }
  const { data: bump, error: bumpErr } = await anon.from('quiz_attempts').update({ score_pct: 100, result: 'pass' }).eq('enrollment_id', myQuizEnr.id).select();
  if (bumpErr) rec('quiz_attempts', 'raise an existing score to 100', 'PASS', `blocked ${bumpErr.code}`);
  else rec('quiz_attempts', 'raise an existing score to 100', (bump || []).length ? 'FAIL' : 'PASS', (bump || []).length ? 'ACCEPTED' : 'no-op');

  // Revealing the key for a quiz the learner has ALREADY submitted is the
  // intended answer-review behaviour. Leaking it for a quiz they have not
  // attempted is the defect. Separate the two rather than counting both.
  const { data: myEnrIds } = await admin.from('enrollments').select('id').eq('user_id', uid);
  const { data: myAttempts } = await admin.from('quiz_attempts').select('quiz_id').in('enrollment_id', (myEnrIds || []).map((e: any) => e.id));
  const attemptedQuizIds = new Set((myAttempts || []).map((a: any) => a.quiz_id));
  const { data: allQuestions } = await admin.from('quiz_questions').select('id, quiz_id');
  const unattemptedQuestionIds = (allQuestions || []).filter((q: any) => !attemptedQuizIds.has(q.quiz_id)).map((q: any) => q.id);

  const { data: keyRows, error: keyErr } = await anon.from('quiz_options').select('id, question_id, is_correct').eq('is_correct', true).limit(1000);
  if (keyErr) {
    rec('quiz_options', 'read the answer key', 'PASS', `blocked ${keyErr.code}`);
  } else {
    const unearned = (keyRows || []).filter((o: any) => unattemptedQuestionIds.includes(o.question_id));
    rec('quiz_options', 'key for NOT-yet-attempted quizzes', unearned.length ? 'FAIL' : 'PASS',
      `${unearned.length} leaked of ${unattemptedQuestionIds.length} unattempted questions`);
    rec('quiz_options', 'key for already-attempted quizzes', 'INFO',
      `${(keyRows || []).length - unearned.length} visible (intended: answer review)`);
  }
  const { data: viewRows } = await anon.from('quiz_options_scoped').select('question_id, is_correct').limit(1000);
  const leakedViaView = (viewRows || []).filter((o: any) => o.is_correct !== null && unattemptedQuestionIds.includes(o.question_id));
  rec('quiz_options_scoped', 'view withholds key pre-attempt', leakedViaView.length ? 'FAIL' : 'PASS',
    `${leakedViaView.length} leaked via the learner view`);

  const fails = results.filter((r) => r.verdict === 'FAIL');
  console.log(`\n=== SUMMARY: ${results.length} probes, ${fails.length} FAILURES ===`);
  for (const f of fails) console.log(`  FAIL  ${f.area} — ${f.probe}: ${f.detail}`);
  await anon.auth.signOut({ scope: 'local' });
  if (fails.length) process.exitCode = 2;
}

main().catch((e) => { console.error(e); process.exit(1); });
