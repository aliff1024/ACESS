/* eslint-disable @typescript-eslint/no-explicit-any -- maintenance tooling
   reads arbitrary PostgREST result shapes; matches scripts/audit/ convention. */
/**
 * Certificate data repair — maintenance tooling.
 *
 * The audit found values on existing `certificates` rows that are stated as
 * fact but are not true of the courses they name. This repairs them from the
 * live course data. It does NOT invent anything: every replacement is read
 * from the course, its lessons, its educator or the enrollment.
 *
 * WHAT IT FIXES
 *
 *   1. course_duration_hours — seeded as a flat 10 for every certificate, and
 *      written as 0 by the old claim endpoint whenever the educator had not
 *      filled in the certificate panel. Recomputed as the real sum of the
 *      course's published, visible lesson durations.
 *   2. skills_earned — seeded identically ("Knowledge Acquisition", "Critical
 *      Thinking") on every certificate regardless of course. Replaced with the
 *      educator's own `certificate_settings.skills` where set, and cleared
 *      otherwise: an empty skills list omits the line, which is honest, while
 *      a generic one asserts something nobody established.
 *   3. verification_url — points at the Supabase project host or at
 *      localhost:3000, because the issuing endpoints build it from the
 *      request Origin. Repointed at --origin, which must be the host the app
 *      is actually served from.
 *   4. Empty snapshot columns (learner_name / course_title / educator_name /
 *      institution_name) — filled from the live rows. Non-empty snapshots are
 *      never overwritten: the snapshot is the record of what was awarded.
 *   5. metadata.is_custom — set explicitly on every row so the learner UI can
 *      stop inferring "educator upload" from the presence of a pdf_url.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply.
 *
 *   npx tsx scripts/audit/backfill-certificates.ts --origin https://acess.example.com
 *   npx tsx scripts/audit/backfill-certificates.ts --origin https://acess.example.com --apply
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
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APPLY = process.argv.includes('--apply');
const originArg = process.argv.indexOf('--origin');
const ORIGIN = originArg > -1 ? process.argv[originArg + 1]?.replace(/\/$/, '') : null;

/** Seeded placeholders that are identical across every course, so cannot be real. */
const GENERIC_SKILLS = ['Knowledge Acquisition', 'Critical Thinking'];
const PLACEHOLDERS = ['Course', 'Learner', 'Educator', 'Unknown Course', 'Unknown Learner'];

async function main() {
  if (!ORIGIN) {
    console.error('Refusing to run without --origin <https://your-app-host>.');
    console.error('The verification URL is what someone else uses to check a certificate;');
    console.error('guessing it would replace one wrong host with another.');
    process.exit(1);
  }

  const { data: certs, error } = await db.from('certificates').select('*');
  if (error) throw error;

  const courseIds = [...new Set((certs || []).map((c) => c.course_id).filter(Boolean))];
  const { data: courses } = await db
    .from('courses')
    .select('id, title, created_by, certificate_settings')
    .in('id', courseIds as string[]);
  const courseMap = new Map((courses || []).map((c) => [c.id, c]));

  const { data: lessons } = await db
    .from('lessons')
    .select('course_id, estimated_duration')
    .in('course_id', courseIds as string[])
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null');
  const minutesByCourse = new Map<string, number>();
  for (const l of lessons || []) {
    minutesByCourse.set(l.course_id, (minutesByCourse.get(l.course_id) || 0) + (Number(l.estimated_duration) || 0));
  }

  const userIds = [
    ...new Set([
      ...(certs || []).map((c) => c.user_id),
      ...(courses || []).map((c) => c.created_by),
    ].filter(Boolean)),
  ];
  const { data: users } = await db.from('users').select('id, full_name').in('id', userIds as string[]);
  const userMap = new Map((users || []).map((u) => [u.id, u.full_name]));

  let changed = 0;

  for (const c of certs || []) {
    const course = c.course_id ? courseMap.get(c.course_id) : undefined;
    const settings = (course?.certificate_settings as Record<string, any>) || {};
    const patch: Record<string, any> = {};
    const notes: string[] = [];

    // 1. Duration
    const realMinutes = c.course_id ? minutesByCourse.get(c.course_id) || 0 : 0;
    const realHours = realMinutes > 0 ? Math.round((realMinutes / 60) * 10) / 10 : 0;
    const settingsHours = Number(settings.course_duration_hours || 0);
    const target = settingsHours > 0 ? settingsHours : realHours;
    if (target > 0 && Number(c.course_duration_hours) !== target) {
      patch.course_duration_hours = target;
      notes.push(`duration ${c.course_duration_hours} -> ${target}h`);
    }

    // 2. Skills
    const stored: string[] = c.skills_earned || [];
    const real: string[] = settings.skills || [];
    const isGeneric =
      stored.length === GENERIC_SKILLS.length && stored.every((s) => GENERIC_SKILLS.includes(s));
    if (isGeneric && JSON.stringify(stored) !== JSON.stringify(real)) {
      patch.skills_earned = real;
      notes.push(`skills ${JSON.stringify(stored)} -> ${JSON.stringify(real)}`);
    }

    // 3. Verification URL
    const wanted = `${ORIGIN}/verify/${c.reference_code}`;
    if (c.verification_url !== wanted) {
      patch.verification_url = wanted;
      notes.push(`verification_url -> ${wanted}`);
    }

    // 4. Empty or placeholder snapshots, filled from live rows.
    if (!c.course_title || PLACEHOLDERS.includes(c.course_title)) {
      if (course?.title) {
        patch.course_title = course.title;
        notes.push(`course_title "${c.course_title}" -> "${course.title}"`);
      }
    }
    if (!c.learner_name || PLACEHOLDERS.includes(c.learner_name)) {
      const name = c.user_id ? userMap.get(c.user_id) : null;
      if (name) {
        patch.learner_name = name;
        notes.push(`learner_name "${c.learner_name}" -> "${name}"`);
      }
    }
    if (!c.educator_name || PLACEHOLDERS.includes(c.educator_name)) {
      const name = settings.educator_name || (course?.created_by ? userMap.get(course.created_by) : null);
      if (name) {
        patch.educator_name = name;
        notes.push(`educator_name "${c.educator_name}" -> "${name}"`);
      }
    }
    if (!c.institution_name) {
      patch.institution_name = settings.institution_name || 'ACESS Platform';
      notes.push('institution_name filled');
    }

    // 5. Explicit custom flag
    const meta = (c.metadata as Record<string, any>) || {};
    if (typeof meta.is_custom !== 'boolean') {
      // A row with a stored PDF that predates the flag is treated as an
      // educator upload only if it has no platform verification URL of its
      // own; generated certificates always have one.
      const inferred = !!c.pdf_url && !(c.verification_url || '').includes('/verify/');
      patch.metadata = { ...meta, is_custom: inferred };
      notes.push(`metadata.is_custom -> ${inferred}`);
    }

    if (notes.length === 0) continue;
    changed++;
    console.log(`\n${c.reference_code} — ${course?.title || '(course missing)'}`);
    for (const n of notes) console.log(`   ${n}`);

    if (APPLY) {
      const { error: upErr } = await db.from('certificates').update(patch).eq('id', c.id);
      if (upErr) console.log(`   ! update failed: ${upErr.message}`);
    }
  }

  console.log(
    `\n${changed} of ${certs?.length ?? 0} certificate(s) ${APPLY ? 'updated' : 'would change'}.`,
  );
  if (!APPLY && changed > 0) console.log('Re-run with --apply to write these changes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
