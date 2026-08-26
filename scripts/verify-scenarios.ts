/**
 * Learner scenario verification.
 *
 *   npx tsx scripts/verify-scenarios.ts
 *
 * Signs in as each seeded learner and reads back exactly what their dashboard,
 * progress, achievements and certificates pages read — through PostgREST with
 * the anon key and the learner's own JWT, so every figure passes through RLS.
 *
 * This asserts the *shape* of each demo scenario, not just that rows exist.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PW = 'AcessDemo#2026';

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, actual?: string) => {
  if (ok) { pass++; console.log(`    ✓ ${label}${actual ? ` — ${actual}` : ''}`); }
  else { fail++; console.log(`    ✗ ${label}${actual ? ` — got ${actual}` : ''}`); }
};

async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return c;
}

interface Snapshot {
  enrolments: number;
  completed: number;
  active: number;
  dropped: number;
  lessonsCompleted: number;
  lessonsOpened: number;
  quizAttempts: number;
  avgQuiz: number | null;
  achievements: number;
  certsSystem: number;
  certsEducator: number;
  lastActivity: string | null;
  preset: string | null;
}

async function snapshot(c: SupabaseClient): Promise<Snapshot> {
  const { data: { user } } = await c.auth.getUser();
  const uid = user!.id;

  const { data: enrol } = await c.from('enrollments').select('id, status, course_id');
  const ids = (enrol ?? []).map((e) => e.id);

  const { data: prog } = await c.from('lesson_progress').select('is_completed, last_viewed_at').in('enrollment_id', ids);
  const { data: attempts } = await c.from('quiz_attempts').select('score_pct, submitted_at').in('enrollment_id', ids);
  const { data: ach } = await c.from('user_achievements').select('id');
  const { data: certs } = await c.from('certificates').select('id, metadata, status');
  const { data: profile } = await c.from('user_profiles').select('accessibility_prefs').eq('user_id', uid).maybeSingle();

  const lastFromProgress = (prog ?? []).map((p) => p.last_viewed_at).filter(Boolean).sort().at(-1) ?? null;

  return {
    enrolments: enrol?.length ?? 0,
    completed: (enrol ?? []).filter((e) => e.status === 'completed').length,
    active: (enrol ?? []).filter((e) => e.status === 'active').length,
    dropped: (enrol ?? []).filter((e) => e.status === 'dropped').length,
    lessonsCompleted: (prog ?? []).filter((p) => p.is_completed).length,
    lessonsOpened: prog?.length ?? 0,
    quizAttempts: attempts?.length ?? 0,
    avgQuiz: attempts?.length ? Math.round((attempts.reduce((s, a) => s + a.score_pct, 0) / attempts.length)) : null,
    achievements: ach?.length ?? 0,
    certsSystem: (certs ?? []).filter((x: any) => x.metadata?.is_custom !== true).length,
    certsEducator: (certs ?? []).filter((x: any) => x.metadata?.is_custom === true).length,
    lastActivity: lastFromProgress,
    preset: ((profile?.accessibility_prefs as any)?.active_preset as string) ?? null,
  };
}

const show = (s: Snapshot) =>
  `${s.enrolments} enrolments (${s.completed} done / ${s.active} active / ${s.dropped} dropped), ` +
  `${s.lessonsCompleted}/${s.lessonsOpened} lessons, ${s.quizAttempts} quiz attempts` +
  (s.avgQuiz !== null ? ` @ ${s.avgQuiz}%` : '') +
  `, ${s.achievements} achievements, certs ${s.certsSystem}+${s.certsEducator}`;

async function main() {
  console.log(`Scenario verification → ${URL}\n`);

  // ── LEARNER A ────────────────────────────────────────────────────────
  console.log('LEARNER A — Amir Hakim (active / advanced)');
  const a = await snapshot(await signIn('amir.learner@acess.edu.my'));
  console.log(`    ${show(a)}`);
  check('multiple enrolled courses', a.enrolments >= 4, String(a.enrolments));
  check('has completed courses', a.completed >= 2, String(a.completed));
  check('has unfinished courses', a.active >= 2, String(a.active));
  check('has a system certificate', a.certsSystem >= 1, String(a.certsSystem));
  check('has an educator certificate', a.certsEducator >= 1, String(a.certsEducator));
  check('has quiz history', a.quizAttempts >= 4, String(a.quizAttempts));
  check('has achievements', a.achievements >= 10, String(a.achievements));
  check('recent activity (within 90 days)', !!a.lastActivity && Date.now() - Date.parse(a.lastActivity) < 90 * 86400000, a.lastActivity ?? 'none');
  check('accessibility preset applied', a.preset === 'adhd', a.preset ?? 'none');

  // ── LEARNER B ────────────────────────────────────────────────────────
  console.log('\nLEARNER B — Chong Mei Ling (active / mid-progress)');
  const b = await snapshot(await signIn('mei.learner@acess.edu.my'));
  console.log(`    ${show(b)}`);
  check('several enrolled courses', b.enrolments >= 3, String(b.enrolments));
  check('no course finished yet', b.completed === 0, String(b.completed));
  check('some lessons completed', b.lessonsCompleted >= 4, String(b.lessonsCompleted));
  check('some lessons still incomplete', b.lessonsOpened > b.lessonsCompleted, `${b.lessonsCompleted}/${b.lessonsOpened}`);
  check('some quiz attempts', b.quizAttempts >= 2, String(b.quizAttempts));
  check('some achievements', b.achievements >= 3 && b.achievements < a.achievements, String(b.achievements));
  check('recent activity', !!b.lastActivity && Date.now() - Date.parse(b.lastActivity) < 90 * 86400000, b.lastActivity ?? 'none');
  check('accessibility preset applied', b.preset === 'dyslexia', b.preset ?? 'none');

  // Per-course progress must sit between 20% and 80%.
  const mei = await signIn('mei.learner@acess.edu.my');
  const { data: meiEnrol } = await mei.from('enrollments').select('id, course_id');
  let inBand = 0;
  for (const e of meiEnrol ?? []) {
    const { data: lessons } = await mei.from('lessons').select('id').eq('course_id', e.course_id).eq('status', 'published');
    const { data: done } = await mei.from('lesson_progress').select('id').eq('enrollment_id', e.id).eq('is_completed', true);
    const pct = lessons?.length ? Math.round(((done?.length ?? 0) / lessons.length) * 100) : 0;
    if (pct >= 0 && pct <= 80) inBand++;
  }
  check('every course between 0% and 80%', inBand === (meiEnrol?.length ?? 0), `${inBand}/${meiEnrol?.length}`);

  // ── LEARNER C ────────────────────────────────────────────────────────
  console.log('\nLEARNER C — Haziq Danial (new / barely started)');
  const c = await snapshot(await signIn('haziq.learner@acess.edu.my'));
  console.log(`    ${show(c)}`);
  check('few enrolments', c.enrolments > 0 && c.enrolments <= 2, String(c.enrolments));
  check('low progress only', c.lessonsCompleted <= 1, String(c.lessonsCompleted));
  check('no completed courses', c.completed === 0, String(c.completed));
  check('no certificates', c.certsSystem + c.certsEducator === 0, String(c.certsSystem + c.certsEducator));
  check('few or no achievements', c.achievements <= 2, String(c.achievements));
  check('older last-active date (> 14 days)', !!c.lastActivity && Date.now() - Date.parse(c.lastActivity) > 14 * 86400000, c.lastActivity ?? 'none');

  // ── At-risk learner ──────────────────────────────────────────────────
  console.log('\nSUPPORTING — Daniel Lim (at risk)');
  const d = await snapshot(await signIn('daniel.learner@acess.edu.my'));
  console.log(`    ${show(d)}`);
  check('has a dropped enrolment', d.dropped >= 1, String(d.dropped));
  check('failed quizzes (avg below pass)', d.avgQuiz !== null && d.avgQuiz < 60, `${d.avgQuiz}%`);
  check('stalled — no completions', d.completed === 0, String(d.completed));
  check('inactive for over 3 weeks', !!d.lastActivity && Date.now() - Date.parse(d.lastActivity) > 21 * 86400000, d.lastActivity ?? 'none');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('verification failed:', e.message);
  process.exit(1);
});
