/**
 * Learner DB oracle — audit tooling.
 *
 * Dumps the authoritative database state for one learner so every number
 * rendered in the Learner Portal can be diffed against its real source.
 *
 * Service role is used for READ-ONLY verification here. It must never be
 * imported by application code — this file lives in scripts/ and is not part
 * of any client bundle.
 *
 *   npx tsx scripts/audit/learner-db.ts [email]
 *   npx tsx scripts/audit/learner-db.ts learner@acess.demo --json
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

const EMAIL = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'learner@acess.demo';
const AS_JSON = process.argv.includes('--json');

async function main() {
  const { data: user, error: userErr } = await db
    .from('users')
    .select('id, email, full_name, role, is_active, created_at, deleted_at')
    .eq('email', EMAIL)
    .maybeSingle();

  if (userErr) throw userErr;
  if (!user) {
    console.error(`No user row for ${EMAIL}`);
    process.exit(1);
  }

  const uid = user.id;

  const [profile, enrollments, favorites, achievements, certificates, legacyPrefs] = await Promise.all([
    db.from('user_profiles').select('*').eq('user_id', uid).maybeSingle(),
    db
      .from('enrollments')
      .select('id, course_id, status, enrolled_at, completed_at, courses(id, title, status, deleted_at, certificate_enabled)')
      .eq('user_id', uid),
    db.from('course_favorites').select('id, course_id, created_at').eq('user_id', uid),
    db.from('user_achievements').select('id, achievement_id, course_id, earned_at').eq('user_id', uid),
    db.from('certificates').select('id, enrollment_id, course_id, reference_code, status, issued_at, learner_name, course_title').eq('user_id', uid),
    db.from('user_accessibility_preferences').select('*').eq('user_id', uid).maybeSingle(),
  ]);

  const enrollmentIds = (enrollments.data || []).map((e: any) => e.id);

  const [progress, attempts, checkpoints] = await Promise.all([
    enrollmentIds.length
      ? db
          .from('lesson_progress')
          .select('id, enrollment_id, lesson_id, is_viewed, is_completed, view_count, time_spent_learning, last_viewed_at, checkpoint_completed, summary_completed')
          .in('enrollment_id', enrollmentIds)
      : ({ data: [] } as any),
    enrollmentIds.length
      ? db.from('quiz_attempts').select('id, enrollment_id, quiz_id, attempt_number, score_pct, result, started_at, submitted_at').in('enrollment_id', enrollmentIds)
      : ({ data: [] } as any),
    enrollmentIds.length
      ? db.from('learner_checkpoints').select('id, enrollment_id, lesson_id, checkpoint_id, completed, completed_at').in('enrollment_id', enrollmentIds)
      : ({ data: [] } as any),
  ]);

  // Per-course lesson inventory — the denominator every progress % depends on.
  const courseIds = [...new Set((enrollments.data || []).map((e: any) => e.course_id))];
  const { data: lessons } = courseIds.length
    ? await db.from('lessons').select('id, course_id, title, status, sequence_order, has_quiz, visibility_status').in('course_id', courseIds)
    : ({ data: [] } as any);

  const progressRows = progress.data || [];
  const lessonRows = lessons || [];

  const perCourse = (enrollments.data || []).map((e: any) => {
    const courseLessons = lessonRows.filter((l: any) => l.course_id === e.course_id);
    const publishedLessons = courseLessons.filter((l: any) => l.status === 'published');
    const myProgress = progressRows.filter((p: any) => p.enrollment_id === e.id);
    const completedRows = myProgress.filter((p: any) => p.is_completed);
    // Count completion rows only against the lesson set the percentage is
    // divided by — the PUBLISHED lessons. A progress row can outlive the
    // lesson being unpublished or deleted; counting those against a published
    // denominator is what produces >100% progress.
    const publishedIdSet = new Set(publishedLessons.map((l: any) => l.id));
    const courseIdSet = new Set(courseLessons.map((l: any) => l.id));
    const completedInCourse = completedRows.filter((p: any) => publishedIdSet.has(p.lesson_id));
    // Rows pointing at a lesson of this course that is no longer published.
    const unpublishedCompletions = completedRows.filter(
      (p: any) => courseIdSet.has(p.lesson_id) && !publishedIdSet.has(p.lesson_id),
    );
    // Rows pointing at a lesson that belongs to a different course entirely.
    const orphaned = completedRows.filter((p: any) => !courseIdSet.has(p.lesson_id));
    const denom = publishedLessons.length;
    return {
      enrollment_id: e.id,
      course_id: e.course_id,
      course_title: e.courses?.title,
      course_status: e.courses?.status,
      course_deleted: !!e.courses?.deleted_at,
      certificate_enabled: e.courses?.certificate_enabled,
      enrollment_status: e.status,
      completed_at: e.completed_at,
      lessons_total: courseLessons.length,
      lessons_published: denom,
      progress_rows: myProgress.length,
      viewed: myProgress.filter((p: any) => p.is_viewed).length,
      completed: completedInCourse.length,
      unpublished_completions: unpublishedCompletions.length,
      orphaned_completions: orphaned.length,
      duplicate_lesson_rows: myProgress.length - new Set(myProgress.map((p: any) => p.lesson_id)).size,
      expected_pct: denom > 0 ? Math.round((completedInCourse.length / denom) * 100) : 0,
      quiz_attempts: (attempts.data || []).filter((a: any) => a.enrollment_id === e.id).length,
    };
  });

  const report = {
    user,
    profile_exists: !!profile.data,
    accessibility_prefs_json: profile.data?.accessibility_prefs ?? null,
    legacy_user_accessibility_preferences_row: legacyPrefs.data ?? null,
    counts: {
      enrollments: (enrollments.data || []).length,
      enrollments_active: (enrollments.data || []).filter((e: any) => e.status === 'active').length,
      enrollments_completed: (enrollments.data || []).filter((e: any) => e.status === 'completed').length,
      favorites: (favorites.data || []).length,
      achievements: (achievements.data || []).length,
      certificates: (certificates.data || []).length,
      lesson_progress_rows: progressRows.length,
      lessons_completed_total: progressRows.filter((p: any) => p.is_completed).length,
      quiz_attempts: (attempts.data || []).length,
      checkpoints: (checkpoints.data || []).length,
    },
    per_course: perCourse,
    favorites: favorites.data,
    achievements: achievements.data,
    certificates: certificates.data,
    quiz_attempts: attempts.data,
  };

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n=== LEARNER ORACLE: ${user.email} (${uid}) ===`);
  console.log(`name=${user.full_name} role=${user.role} active=${user.is_active} deleted=${user.deleted_at ?? 'no'}`);
  console.log(`\n-- counts --`);
  for (const [k, v] of Object.entries(report.counts)) console.log(`  ${k.padEnd(28)} ${v}`);
  console.log(`\n-- per course --`);
  for (const c of perCourse) {
    console.log(
      `  [${c.course_status}] ${String(c.course_title).slice(0, 40).padEnd(42)} ` +
        `enr=${c.enrollment_status} lessons=${c.completed}/${c.lessons_published}(of ${c.lessons_total}) ` +
        `pct=${c.expected_pct}% quiz=${c.quiz_attempts}` +
        (c.unpublished_completions ? ` UNPUBLISHED=${c.unpublished_completions}` : '') +
        (c.orphaned_completions ? ` ORPHANED=${c.orphaned_completions}` : '') +
        (c.duplicate_lesson_rows ? ` DUPES=${c.duplicate_lesson_rows}` : '') +
        (c.course_deleted ? ' COURSE_DELETED' : ''),
    );
  }
  console.log(`\n-- accessibility --`);
  console.log(`  user_profiles.accessibility_prefs: ${report.accessibility_prefs_json ? 'present' : 'NULL'}`);
  if (report.accessibility_prefs_json) {
    const a: any = report.accessibility_prefs_json;
    console.log(`    base_preset=${a.base_preset} active_preset=${a.active_preset} font=${a.font_family}/${a.font_size_px}px tint=${a.background_tint}`);
    console.log(`    tts=${a.tts_enabled} chunked=${a.chunked_content_mode} distraction_free=${a.distraction_free_mode} layout=${a.layout_mode}`);
  }
  console.log(`  legacy user_accessibility_preferences row: ${report.legacy_user_accessibility_preferences_row ? 'PRESENT' : 'none'}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
