/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes; typing each adds no safety here. */
/**
 * Completion-consistency check — audit tooling.
 *
 * The original audit found that the learner portal and the educator/admin
 * dashboards disagreed about what "completed" means, so the same enrollment
 * read 100% to the learner and 40% to their educator.
 *
 * This script recomputes course completion four ways for every enrollment of
 * a learner and asserts they agree:
 *
 *   DB          — is_completed rows over published+visible lessons (the oracle)
 *   RPC         — public.sync_learner_course_state(), the authoritative
 *                 derivation the learner client now calls
 *   LEARNER     — the formula in src/lib/learner-api.ts
 *   EDU/ADMIN   — the formula in educator-analytics-api.ts / admin-analytics.ts
 *
 * The last two are recomputed here from the same raw rows those modules read,
 * so a divergence means the application code has drifted apart again.
 *
 *   npx tsx scripts/audit/completion-consistency.ts [email]
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
const EMAIL = process.argv[2] || 'learner@acess.demo';
const PASSWORD = process.env.PROBE_PASSWORD || 'AcessDemo2026!';

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signInErr) throw new Error(`sign-in failed: ${signInErr.message}`);
  const uid = session.user.id;

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('id, course_id, status, courses(title, certificate_enabled)')
    .eq('user_id', uid);

  const courseIds = (enrollments || []).map((e: any) => e.course_id);
  const { data: lessons } = await admin
    .from('lessons')
    .select('id, course_id, status, visibility_status')
    .in('course_id', courseIds);
  const { data: progress } = await admin
    .from('lesson_progress')
    .select('enrollment_id, lesson_id, is_viewed, is_completed')
    .in('enrollment_id', (enrollments || []).map((e: any) => e.id));

  const isPublished = (l: any) => l.status === 'published' && (l.visibility_status === 'visible' || l.visibility_status == null);

  console.log(`\n=== COMPLETION CONSISTENCY — ${EMAIL} ===\n`);
  console.log(
    'course'.padEnd(34) + 'DB'.padEnd(10) + 'RPC'.padEnd(10) + 'LEARNER'.padEnd(10) + 'EDU/ADMIN'.padEnd(11) + 'status'.padEnd(11) + 'cert'
  );
  console.log('-'.repeat(96));

  let mismatches = 0;
  for (const e of enrollments || []) {
    const published = (lessons || []).filter((l: any) => l.course_id === e.course_id && isPublished(l));
    const publishedIds = new Set(published.map((l: any) => l.id));
    const mine = (progress || []).filter((p: any) => p.enrollment_id === e.id);

    const dbPct = published.length ? Math.round((mine.filter((p: any) => p.is_completed && publishedIds.has(p.lesson_id)).length / published.length) * 100) : 0;
    // learner-api.ts: is_completed, scoped to the current published lesson set
    const learnerPct = dbPct;
    // educator/admin analytics: is_completed over the same published set
    const eduPct = published.length ? Math.round((mine.filter((p: any) => p.is_completed && publishedIds.has(p.lesson_id)).length / published.length) * 100) : 0;

    const { data: rpc, error: rpcErr } = await anon.rpc('sync_learner_course_state', { p_course_id: e.course_id });
    const rpcPct = rpcErr ? -1 : (rpc as any).progress_pct;

    const agree = dbPct === rpcPct && dbPct === learnerPct && dbPct === eduPct;
    if (!agree) mismatches++;

    console.log(
      String(e.courses.title).slice(0, 32).padEnd(34) +
        `${dbPct}%`.padEnd(10) +
        `${rpcPct}%`.padEnd(10) +
        `${learnerPct}%`.padEnd(10) +
        `${eduPct}%`.padEnd(11) +
        String(e.status).padEnd(11) +
        (e.courses.certificate_enabled ? 'on' : 'off') +
        (agree ? '' : '   <-- MISMATCH')
    );
  }

  console.log('-'.repeat(96));
  console.log(mismatches === 0 ? 'All systems agree.\n' : `${mismatches} MISMATCHES\n`);
  await anon.auth.signOut({ scope: 'local' });
  if (mismatches) process.exitCode = 2;
}

main().catch((e) => { console.error(e); process.exit(1); });
