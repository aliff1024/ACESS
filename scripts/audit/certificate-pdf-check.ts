/* eslint-disable @typescript-eslint/no-explicit-any -- audit tooling reads
   arbitrary PostgREST result shapes; matches scripts/audit/ convention. */
/**
 * Certificate PDF check — audit tooling.
 *
 * Renders the real PDF for every issued certificate, using the same generator
 * the learner's Download button calls and the same field resolution the detail
 * page uses, then reads the text back out of each file and asserts that the
 * learner's name, the course title, the completion date and the certificate ID
 * are all present and are the values the database holds.
 *
 * This exists because "the UI looks right" and "the PDF is right" are
 * different claims: the certificate the learner keeps is the PDF, and the
 * previous generator could silently print `Invalid Date`, `Course Educator`
 * for a course with a real educator, or `Course Duration: 0 hours`.
 *
 * Writes PDFs to scripts/audit/out/ for inspection. Touches no database rows.
 *
 *   npx tsx scripts/audit/certificate-pdf-check.ts
 *   npx tsx scripts/audit/certificate-pdf-check.ts --keep   # leave the files
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

const KEEP = process.argv.includes('--keep');
const OUT = path.resolve('scripts/audit/out');
const ORIGIN = 'https://acess.local';

let problems = 0;
const fail = (m: string) => { problems++; console.log(`   ✗ ${m}`); };

/**
 * Pulls the visible text out of a jsPDF-produced file.
 *
 * jsPDF writes uncompressed content streams by default, with strings drawn as
 * `(text) Tj`. That is enough to assert a field made it onto the page.
 */
function extractText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const out: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1].replace(/\\([()\\])/g, '$1'));
  }
  return out.join('\n');
}

async function main() {
  // Imported lazily: certificate-utils is a 'use client' module, and importing
  // it at the top would run before the DOM shims below are in place.
  const { generatePDFCertificate, buildCertificateRenderData, formatDate } = await import(
    '../../src/lib/certificate-utils'
  );

  fs.mkdirSync(OUT, { recursive: true });

  const { data: certs, error } = await db
    .from('certificates')
    .select('*')
    .eq('status', 'issued')
    .order('issued_at', { ascending: false });
  if (error) throw error;

  const courseIds = [...new Set((certs || []).map((c) => c.course_id).filter(Boolean))] as string[];
  const { data: courses } = await db
    .from('courses')
    .select('id, title, category, created_by, certificate_settings')
    .in('id', courseIds);
  const courseMap = new Map((courses || []).map((c) => [c.id, c]));

  const { data: lessons } = await db
    .from('lessons')
    .select('course_id, estimated_duration')
    .in('course_id', courseIds)
    .eq('status', 'published')
    .or('visibility_status.eq.visible,visibility_status.is.null');
  const lessonStats = new Map<string, { count: number; minutes: number }>();
  for (const l of lessons || []) {
    const s = lessonStats.get(l.course_id) || { count: 0, minutes: 0 };
    s.count += 1;
    s.minutes += Number(l.estimated_duration) || 0;
    lessonStats.set(l.course_id, s);
  }

  console.log(`Rendering ${certs?.length ?? 0} certificate PDF(s)\n`);

  for (const c of certs || []) {
    const course = c.course_id ? courseMap.get(c.course_id) : undefined;
    const settings = (course?.certificate_settings as Record<string, any>) || {};
    const stats = c.course_id ? lessonStats.get(c.course_id) : undefined;

    let hours = Number(c.course_duration_hours || 0);
    if (!hours && stats) hours = Math.round((stats.minutes / 60) * 10) / 10;

    const data = await buildCertificateRenderData({
      learner_name: c.learner_name,
      course_title: c.course_title || course?.title || '',
      course_category: course?.category,
      educator_name: c.educator_name,
      educator_role: (c.metadata as any)?.educator_role || settings.educator_role,
      institution_name: c.institution_name,
      completion_date: c.completion_date || c.issued_at,
      certificate_code: c.reference_code,
      verification_url: `${ORIGIN}/verify/${c.reference_code}`,
      skills_earned: c.skills_earned,
      course_duration_hours: hours,
      lesson_count: stats?.count,
    });

    const blob = (await generatePDFCertificate(data, 'blob')) as Blob;
    const buf = Buffer.from(await blob.arrayBuffer());
    const file = path.join(OUT, `${c.reference_code}.pdf`);
    fs.writeFileSync(file, buf);

    const text = extractText(buf);
    console.log(`${c.reference_code} — ${data.courseTitle}  (${(buf.length / 1024).toFixed(1)} KB)`);

    const required: [string, string][] = [
      ['learner name', data.learnerName],
      ['course title', data.courseTitle.slice(0, 30)],
      ['certificate ID', data.certificateCode],
      ['completion date', formatDate(data.completionDate)],
      ['institution', data.institutionName],
    ];
    for (const [label, value] of required) {
      if (!value) { fail(`${label} is empty`); continue; }
      if (!text.includes(value)) fail(`${label} "${value}" is not on the page`);
    }
    if (data.educatorName && !text.includes(data.educatorName)) {
      fail(`educator "${data.educatorName}" is not on the page`);
    }
    for (const bad of ['Invalid Date', 'undefined', 'NaN']) {
      if (text.includes(bad)) fail(`page contains "${bad}"`);
    }
    // A zero duration must be omitted, not printed. Anchored so that a real
    // "10 hours" does not match on its trailing "0 hours".
    if (/(^|[^\d.])0 hours/.test(text)) fail('page prints a zero course duration');
    if (!data.qrDataUrl) fail('no verification QR code was generated');
    if (!text.includes(data.verificationUrl)) fail('verification URL is not on the page');

    console.log(`   fields ok — ${text.split('\n').length} text runs, QR ${data.qrDataUrl ? 'yes' : 'no'}`);
  }

  if (!KEEP) fs.rmSync(OUT, { recursive: true, force: true });
  else console.log(`\nPDFs kept in ${OUT}`);

  console.log(`\n${problems === 0 ? 'PASS' : 'FAIL'} — ${problems} problem(s)`);
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
