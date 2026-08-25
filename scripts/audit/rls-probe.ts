/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes across many tables; typing each one adds
   no safety to a read-only diagnostic script. Matches the existing
   convention in scripts/. */
/**
 * Cross-learner isolation probe — audit tooling.
 *
 * The Learner Portal reads Supabase directly from the browser with the anon
 * key (see src/lib/learner-api.ts), so RLS is the ONLY authorization boundary
 * that exists. Hiding a button in the UI proves nothing. This script signs in
 * as learner A with the anon key — exactly what the browser holds — and then
 * attempts to READ and WRITE learner B's rows in every learner-facing table.
 *
 * Any row returned, or any write accepted, is a real data-isolation defect.
 *
 *   npx tsx scripts/audit/rls-probe.ts
 *   npx tsx scripts/audit/rls-probe.ts --write   (also runs write probes)
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
const RUN_WRITES = process.argv.includes('--write');

const A_EMAIL = process.env.PROBE_A_EMAIL || 'learner@acess.demo';
const A_PASSWORD = process.env.PROBE_A_PASSWORD || 'AcessDemo2026!';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Result = { table: string; probe: string; verdict: 'PASS' | 'LEAK' | 'ERROR'; detail: string };
const results: Result[] = [];

function record(table: string, probe: string, verdict: Result['verdict'], detail: string) {
  results.push({ table, probe, verdict, detail });
  const tag = verdict === 'PASS' ? 'PASS' : verdict === 'LEAK' ? '*** LEAK ***' : 'ERR ';
  console.log(`  [${tag}] ${table.padEnd(32)} ${probe} — ${detail}`);
}

async function main() {
  // ─── Identify learner A and a victim learner B who actually has data ───
  const { data: a } = await admin.from('users').select('id, email').eq('email', A_EMAIL).single();
  const { data: learners } = await admin.from('users').select('id, email').eq('role', 'learner').neq('id', a.id).limit(200);

  let b: any = null;
  for (const cand of learners || []) {
    const { count } = await admin.from('enrollments').select('*', { count: 'exact', head: true }).eq('user_id', cand.id);
    if ((count ?? 0) > 0) {
      const { count: pc } = await admin.from('course_favorites').select('*', { count: 'exact', head: true }).eq('user_id', cand.id);
      b = { ...cand, enrollments: count, favorites: pc ?? 0 };
      if ((pc ?? 0) > 0) break; // prefer a victim with favourites too
    }
  }
  if (!b) throw new Error('No second learner with data found to probe against');

  // Collect B's actual row ids so we probe real targets, not guesses.
  const { data: bEnrollments } = await admin.from('enrollments').select('id, course_id').eq('user_id', b.id).limit(5);
  const bEnrollmentIds = (bEnrollments || []).map((e: any) => e.id);
  const { data: bProgress } = bEnrollmentIds.length
    ? await admin.from('lesson_progress').select('id, enrollment_id, lesson_id').in('enrollment_id', bEnrollmentIds).limit(5)
    : ({ data: [] } as any);
  const { data: bAttempts } = bEnrollmentIds.length
    ? await admin.from('quiz_attempts').select('id, enrollment_id').in('enrollment_id', bEnrollmentIds).limit(5)
    : ({ data: [] } as any);
  const { data: bCerts } = await admin.from('certificates').select('id, reference_code').eq('user_id', b.id).limit(5);
  const { data: bFavs } = await admin.from('course_favorites').select('id, course_id').eq('user_id', b.id).limit(5);
  const { data: bAch } = await admin.from('user_achievements').select('id').eq('user_id', b.id).limit(5);
  const { data: bProfile } = await admin.from('user_profiles').select('id').eq('user_id', b.id).maybeSingle();

  console.log(`\n=== RLS PROBE ===`);
  console.log(`Attacker (A): ${a.email}  ${a.id}`);
  console.log(`Victim   (B): ${b.email}  ${b.id}  (enrollments=${b.enrollments}, favorites=${b.favorites})`);
  console.log(`B rows available to target: enrollments=${bEnrollmentIds.length} progress=${(bProgress || []).length} attempts=${(bAttempts || []).length} certs=${(bCerts || []).length} favs=${(bFavs || []).length} achievements=${(bAch || []).length}`);

  // ─── Sign in as A with the ANON key — exactly what the browser has ───
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({ email: A_EMAIL, password: A_PASSWORD });
  if (signInErr) throw new Error(`Sign-in as A failed: ${signInErr.message}`);
  console.log(`Signed in as A: ${session.user.id}\n`);
  if (session.user.id !== a.id) console.log(`  !! auth uid ${session.user.id} != users.id ${a.id}`);

  console.log('--- READ probes (A attempting to read B) ---');

  const readProbes: Array<[string, () => PromiseLike<any>, string]> = [
    ['enrollments', () => anon.from('enrollments').select('id, user_id, course_id').eq('user_id', b.id), 'by user_id'],
    ['course_favorites', () => anon.from('course_favorites').select('id, user_id, course_id').eq('user_id', b.id), 'by user_id'],
    ['user_achievements', () => anon.from('user_achievements').select('id, user_id').eq('user_id', b.id), 'by user_id'],
    ['certificates', () => anon.from('certificates').select('id, user_id, learner_name').eq('user_id', b.id), 'by user_id'],
    ['user_profiles', () => anon.from('user_profiles').select('id, user_id, accessibility_prefs').eq('user_id', b.id), 'by user_id'],
    ['users', () => anon.from('users').select('id, email, full_name').eq('id', b.id), 'by id'],
    ['user_accessibility_preferences', () => anon.from('user_accessibility_preferences').select('id, user_id').eq('user_id', b.id), 'by user_id'],
    ['notifications', () => anon.from('notifications').select('id').eq('user_id', b.id), 'by user_id'],
  ];
  if (bEnrollmentIds.length) {
    readProbes.push(['lesson_progress', () => anon.from('lesson_progress').select('id, enrollment_id').in('enrollment_id', bEnrollmentIds), "by B's enrollment_id"]);
    readProbes.push(['quiz_attempts', () => anon.from('quiz_attempts').select('id, enrollment_id, score_pct').in('enrollment_id', bEnrollmentIds), "by B's enrollment_id"]);
    readProbes.push(['learner_checkpoints', () => anon.from('learner_checkpoints').select('id, enrollment_id').in('enrollment_id', bEnrollmentIds), "by B's enrollment_id"]);
    readProbes.push(['recommendations', () => anon.from('recommendations').select('id, enrollment_id').in('enrollment_id', bEnrollmentIds), "by B's enrollment_id"]);
  }
  if ((bCerts || []).length) {
    readProbes.push(['certificates', () => anon.from('certificates').select('id, user_id, learner_name').eq('id', bCerts[0].id), "by B's certificate id (IDOR)"]);
  }

  // Unfiltered sweeps — the classic "select everything" check. RLS should
  // silently narrow these to A's own rows.
  const sweeps: Array<[string, string]> = [
    ['enrollments', 'user_id'],
    ['course_favorites', 'user_id'],
    ['user_achievements', 'user_id'],
    ['certificates', 'user_id'],
    ['user_profiles', 'user_id'],
  ];

  for (const [table, fn, label] of readProbes) {
    const { data, error } = await fn();
    if (error) record(table, label, 'ERROR', `${error.code ?? ''} ${error.message}`);
    else if ((data || []).length > 0) record(table, label, 'LEAK', `${data.length} of B's rows readable`);
    else record(table, label, 'PASS', '0 rows');
  }

  console.log('\n--- UNFILTERED sweeps (A selecting whole table) ---');
  for (const [table, col] of sweeps) {
    const { data, error } = await anon.from(table).select(`id, ${col}`).limit(1000);
    if (error) {
      record(table, 'unfiltered select', 'ERROR', `${error.code ?? ''} ${error.message}`);
      continue;
    }
    const foreign = (data || []).filter((r: any) => r[col] !== a.id);
    if (foreign.length) record(table, 'unfiltered select', 'LEAK', `${foreign.length}/${data.length} rows belong to other users`);
    else record(table, 'unfiltered select', 'PASS', `${data.length} rows, all A's`);
  }

  // lesson_progress / quiz_attempts have no user_id — verify via enrollment join
  const { data: myEnr } = await anon.from('enrollments').select('id');
  const myEnrIds = new Set((myEnr || []).map((e: any) => e.id));
  for (const table of ['lesson_progress', 'quiz_attempts', 'learner_checkpoints']) {
    const { data, error } = await anon.from(table).select('id, enrollment_id').limit(2000);
    if (error) {
      record(table, 'unfiltered select', 'ERROR', `${error.code ?? ''} ${error.message}`);
      continue;
    }
    const foreign = (data || []).filter((r: any) => !myEnrIds.has(r.enrollment_id));
    if (foreign.length) record(table, 'unfiltered select', 'LEAK', `${foreign.length}/${data.length} rows outside A's enrollments`);
    else record(table, 'unfiltered select', 'PASS', `${data.length} rows, all A's`);
  }

  if (RUN_WRITES) {
    console.log("\n--- WRITE probes (A attempting to modify B) — USING without WITH CHECK ---");

    if ((bFavs || []).length) {
      const { data, error } = await anon.from('course_favorites').delete().eq('id', bFavs[0].id).select();
      if (error) record('course_favorites', "DELETE B's favourite", 'PASS', `blocked: ${error.code} ${error.message}`);
      else if ((data || []).length) record('course_favorites', "DELETE B's favourite", 'LEAK', 'DELETED B row — restoring');
      else record('course_favorites', "DELETE B's favourite", 'PASS', '0 rows affected');
      if ((data || []).length) await admin.from('course_favorites').insert(data);
    }

    if ((bProgress || []).length) {
      const target = bProgress[0];
      const { data, error } = await anon.from('lesson_progress').update({ is_completed: true }).eq('id', target.id).select();
      if (error) record('lesson_progress', "UPDATE B's progress", 'PASS', `blocked: ${error.code} ${error.message}`);
      else if ((data || []).length) record('lesson_progress', "UPDATE B's progress", 'LEAK', 'MODIFIED B row');
      else record('lesson_progress', "UPDATE B's progress", 'PASS', '0 rows affected');
    }

    // Insert a row that claims to belong to B — the WITH CHECK test.
    const { data: anyCourse } = await admin.from('courses').select('id').eq('status', 'published').limit(1).single();
    const { data: ins, error: insErr } = await anon.from('course_favorites').insert({ user_id: b.id, course_id: anyCourse.id }).select();
    if (insErr) record('course_favorites', "INSERT row owned by B", 'PASS', `blocked: ${insErr.code} ${insErr.message}`);
    else if ((ins || []).length) {
      record('course_favorites', "INSERT row owned by B", 'LEAK', 'inserted a row attributed to B — cleaning up');
      await admin.from('course_favorites').delete().eq('id', ins[0].id);
    }

    const { data: enrIns, error: enrErr } = await anon.from('enrollments').insert({ user_id: b.id, course_id: anyCourse.id, status: 'active' }).select();
    if (enrErr) record('enrollments', "INSERT enrollment owned by B", 'PASS', `blocked: ${enrErr.code} ${enrErr.message}`);
    else if ((enrIns || []).length) {
      record('enrollments', "INSERT enrollment owned by B", 'LEAK', 'created enrollment for B — cleaning up');
      await admin.from('enrollments').delete().eq('id', enrIns[0].id);
    }

    // Privilege escalation: can a learner promote themselves?
    const { data: esc, error: escErr } = await anon.from('users').update({ role: 'admin' }).eq('id', a.id).select();
    if (escErr) record('users', 'self-promote to admin', 'PASS', `blocked: ${escErr.code} ${escErr.message}`);
    else if ((esc || []).length) {
      record('users', 'self-promote to admin', 'LEAK', 'ROLE CHANGED — reverting');
      await admin.from('users').update({ role: 'learner' }).eq('id', a.id);
    } else record('users', 'self-promote to admin', 'PASS', '0 rows affected');
  }

  const leaks = results.filter((r) => r.verdict === 'LEAK');
  console.log(`\n=== SUMMARY: ${results.length} probes, ${leaks.length} LEAKS ===`);
  for (const l of leaks) console.log(`  LEAK  ${l.table} — ${l.probe}: ${l.detail}`);
  // scope: 'local' — the default 'global' revokes every refresh token for the
  // account, which would silently sign the audit's browser session out too.
  await anon.auth.signOut({ scope: 'local' });
  if (leaks.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
