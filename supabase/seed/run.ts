/**
 * ACESS database seeder.
 *
 *   npm run seed
 *
 * Rebuilds the entire dataset from scratch against whatever
 * NEXT_PUBLIC_SUPABASE_URL points at in .env.local. Safe to re-run.
 *
 * Design notes
 * ────────────
 * • Auth accounts are created through the GoTrue admin API so passwords are
 *   hashed correctly and the on_auth_user_created trigger provisions the
 *   public.users / user_profiles rows. Those rows are then updated with the
 *   real role, join date and profile.
 *
 * • Lesson accessibility scores are NOT invented. Every lesson is run through
 *   auditLesson() from src/lib/accessibility-audit.ts — the same engine the
 *   educator's compliance checker uses — and the score it returns is stored.
 *   The `tier` on each lesson decides which audited fields get filled, so the
 *   spread of scores is a real consequence of the content.
 *
 * • Achievements are NOT inserted directly. After the progress history is in
 *   place, the seeder signs in as each learner and calls the real
 *   sync_learner_course_state() RPC, which derives course completion and
 *   awards whatever course_achievements the learner has genuinely earned.
 *   Only the *timestamps* are corrected afterwards, to the date the
 *   requirement was actually met.
 */

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

import { PERSONAS, DEMO_PASSWORD, AVATAR, type Persona } from './personas';
import { COURSES, type CourseDef, type LessonDef } from './courses';
import { ENROLMENTS, FAVOURITES, CUSTOM_CERTIFICATES, type EnrolPlan } from './enrolments';
import { auditLesson, type LessonAuditSubject, type CourseAccessibilitySupport } from '../../src/lib/accessibility-audit';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DB_URL = process.env.SEED_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const db = new Client({ connectionString: DB_URL });

// ── tiny helpers ──────────────────────────────────────────────────────────
const q = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows;
const one = async <T = any>(sql: string, params: unknown[] = []): Promise<T> => (await db.query(sql, params)).rows[0] as T;
const iso = (d: Date) => d.toISOString();
const D = (s: string) => new Date(s);
/**
 * Normalise a literal date to a UTC ISO string.
 *
 * The content files write times as `+08:00` local, but most timestamp columns
 * in this schema are `timestamp without time zone`, so Postgres silently drops
 * the offset and stores the wall-clock reading. Everything the seeder computes
 * goes through `iso()` and is therefore UTC. Mixing the two made lessons look
 * as though they had been viewed eight hours before the enrolment that
 * contained them. Every literal date is pushed through TS() so both sides of
 * every comparison are the same instant.
 */
const TS = (s: string) => new Date(s).toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const addHours = (d: Date, n: number) => new Date(d.getTime() + n * 3_600_000);
const addMin = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);

/** Deterministic PRNG so re-running the seed produces the same dataset. */
let _s = 20260826;
const rnd = () => {
  _s = (_s * 1664525 + 1013904223) % 4294967296;
  return _s / 4294967296;
};
const rint = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** Evenly spread `count` moments between two dates, with a little jitter. */
function spread(from: Date, to: Date, count: number): Date[] {
  if (count <= 0) return [];
  if (count === 1) return [from];
  const span = to.getTime() - from.getTime();
  return Array.from({ length: count }, (_, i) => {
    const base = from.getTime() + (span * i) / (count - 1);
    const jitter = i === 0 || i === count - 1 ? 0 : (rnd() - 0.5) * (span / (count * 2));
    return new Date(base + jitter);
  });
}

const log = (msg: string) => console.log(msg);
const step = (msg: string) => console.log(`\n▸ ${msg}`);

// ══════════════════════════════════════════════════════════════════════════
// 1. WIPE
// ══════════════════════════════════════════════════════════════════════════
async function wipe() {
  step('Wiping existing data');
  const rows = await q(
    `select string_agg(format('%I.%I', schemaname, tablename), ', ') as list
       from pg_tables where schemaname = 'public'`
  );
  const list = rows[0]?.list as string | null;
  if (list) {
    await q(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    log(`  truncated ${list.split(',').length} public tables`);
  }
  // auth.identities / sessions / refresh tokens cascade from auth.users
  const del = await q(`DELETE FROM auth.users RETURNING id`);
  log(`  removed ${del.length} auth users`);
  // storage.objects rejects direct SQL deletes; the seed uploads no files, so
  // there is nothing to clear there.
}

// ══════════════════════════════════════════════════════════════════════════
// 2. USERS
// ══════════════════════════════════════════════════════════════════════════
const userIds = new Map<string, string>();

async function seedUsers() {
  step('Creating accounts');
  for (const p of PERSONAS) {
    // The client reads the role from auth metadata (src/providers/AuthProvider.tsx
    // line 31) and src/proxy.ts gates every /admin and /educator route on it, so
    // the metadata has to mirror public.users.role or the account cannot reach
    // its own dashboard. The database-side authority is still public.users —
    // that is what RLS (current_user_role) and requireAdmin() read.
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: p.fullName, role: p.role, is_active: true },
    });
    if (error || !data.user) throw new Error(`createUser(${p.email}): ${error?.message}`);
    const id = data.user.id;
    userIds.set(p.key, id);

    // Keep auth.users' own timestamp consistent with the profile join date.
    await q(`UPDATE auth.users SET created_at = $2, updated_at = $2, last_sign_in_at = $3 WHERE id = $1`, [
      id,
      TS(p.joined),
      TS(p.lastActive),
    ]);

    // The trigger already inserted a bare row; fill in the real values.
    await q(
      `UPDATE public.users
          SET email = $2, full_name = $3, role = $4, is_active = true,
              email_verified_at = $5, created_at = $5, updated_at = $6, last_login_at = $6,
              instructor_application_status = $7
        WHERE id = $1`,
      [
        id,
        p.email,
        p.fullName,
        p.role,
        TS(p.joined),
        TS(p.lastActive),
        p.role === 'educator' ? 'approved' : null,
      ]
    );

    await q(
      `UPDATE public.user_profiles
          SET username = $2, bio = $3, avatar_url = $4, phone_number = $5, country = $6,
              birth_date = $7, preferred_language = $8, disability_type = $9,
              accessibility_prefs = $10::jsonb, notification_prefs = $11::jsonb,
              created_at = $12, updated_at = $13
        WHERE user_id = $1`,
      [
        id,
        p.username,
        p.bio,
        AVATAR(p.username),
        p.phone,
        p.country,
        p.birthDate,
        p.preferredLanguage,
        p.disabilityType,
        JSON.stringify(p.accessibilityPrefs),
        JSON.stringify(p.notificationPrefs),
        TS(p.joined),
        TS(p.lastActive),
      ]
    );
    log(`  ${p.role.padEnd(8)} ${p.email}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 3. COURSES / CHAPTERS / LESSONS / ACTIVITIES
// ══════════════════════════════════════════════════════════════════════════
interface SeededLesson {
  id: string;
  def: LessonDef;
  order: number;
  visible: boolean;
  quizId?: string;
  quizQuestionIds?: { id: string; correctOptionId: string; wrongOptionId: string }[];
  score: number;
}
interface SeededCourse {
  id: string;
  def: CourseDef;
  lessons: SeededLesson[];
  quizIds: string[];
  achievementIds: { id: string; name: string; requirement: string; threshold: number }[];
}
const courses = new Map<string, SeededCourse>();

/** Build the audit subject exactly as the educator's checker would. */
function auditSubjectFor(l: LessonDef, activeTier: boolean): LessonAuditSubject {
  const strong = l.tier === 'strong';
  const partial = l.tier === 'partial';
  return {
    title: l.title,
    content_html: l.html,
    video_url: l.videoId ? `https://www.youtube.com/watch?v=${l.videoId}` : '',
    transcript: strong ? l.transcript ?? '' : '',
    estimated_duration: l.tier === 'weak' ? 0 : l.minutes,
    learning_objectives: strong || partial ? (l.objectives ?? []).join('\n') : '',
    accessibility_notes: strong ? l.accessibilityNotes ?? '' : '',
    simplified_summary: strong ? l.simplifiedSummary ?? '' : '',
    focus_mode_enabled: strong,
    chunked_content_enabled: strong,
    has_summary_activity: !!l.summaryActivity,
    has_quiz: !!l.quiz,
    interactiveCount: l.activity ? 1 : 0,
    videoQuestionCount: l.videoQuestions?.length ?? 0,
    videoSeconds: l.videoId ? 600 : null,
  };
}

async function seedCourses() {
  step('Creating courses, lessons and activities');
  for (const c of COURSES) {
    const owner = userIds.get(c.ownerKey)!;
    const support: CourseAccessibilitySupport = {
      supports_tts: c.supports.tts,
      supports_focus_mode: c.supports.focusMode,
      supports_chunked_learning: c.supports.chunked,
      learning_streaks_enabled: c.supports.streaks,
      chapter_organization_enabled: c.supports.chapters,
      target_reading_age: c.targetReadingAge,
    };

    const course = await one<{ id: string }>(
      `INSERT INTO public.courses
         (title, slug, description, category, difficulty_level, status, course_type,
          created_by, created_by_role, created_at, updated_at, published_at, deleted_at,
          thumbnail_url, tags, primary_disability_focus, secondary_disability_focuses,
          accessibility_categories, target_reading_age, recommended_age_group,
          supports_tts, supports_focus_mode, supports_chunked_learning, supports_transcripts,
          learning_streaks_enabled, chapter_organization_enabled, milestone_tracking_enabled,
          guided_learning_enabled, certificate_enabled, certificate_settings,
          course_layout_type, system_course, built_in_course, managed_by_admin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::text[],$16,$17::text[],
               $18::text[],$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,$31,$32,$33,$34)
       RETURNING id`,
      [
        c.title, c.slug, c.description, c.category, c.difficulty, c.status, c.courseType,
        owner, c.ownerRole, TS(c.createdAt), TS(c.publishedAt ?? c.createdAt), c.publishedAt ? TS(c.publishedAt) : null, c.deletedAt ? TS(c.deletedAt) : null,
        c.thumbnail, c.tags, c.focus, c.secondaryFocus,
        c.accessibilityCategories, c.targetReadingAge, c.recommendedAgeGroup,
        c.supports.tts, c.supports.focusMode, c.supports.chunked, c.supports.transcripts,
        c.supports.streaks, c.supports.chapters, c.supports.milestones,
        c.supports.guided, c.certificateEnabled,
        JSON.stringify({
          institution_name: 'ACESS Platform',
          course_duration_hours: Math.max(1, Math.round(c.chapters.flatMap((ch) => ch.lessons).reduce((s, l) => s + l.minutes, 0) / 60)),
          skills: c.tags.slice(0, 3),
          allow_custom_certificates: c.ownerRole === 'educator',
        }),
        c.layoutType, c.courseType === 'system', c.courseType === 'system', c.ownerRole === 'admin',
      ]
    );

    for (const cat of c.accessibilityCategories) {
      await q(
        `INSERT INTO public.course_accessibility_categories (course_id, accessibility_category, created_at)
         VALUES ($1,$2,$3)`,
        [course.id, cat, TS(c.createdAt)]
      );
    }

    const seeded: SeededCourse = { id: course.id, def: c, lessons: [], quizIds: [], achievementIds: [] };
    let order = 0;

    for (const [ci, ch] of c.chapters.entries()) {
      const chapter = await one<{ id: string }>(
        `INSERT INTO public.course_chapters (course_id, title, description, sequence_order, created_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [course.id, ch.title, ch.description, ci + 1, TS(c.createdAt)]
      );

      for (const l of ch.lessons) {
        order += 1;
        const strong = l.tier === 'strong';
        const partial = l.tier === 'partial';
        const subject = auditSubjectFor(l, true);
        const result = auditLesson(subject, c.focus, support);

        // Lessons appear a little after the course was created.
        const lessonCreated = iso(addHours(D(c.createdAt), 2 + order * 5));

        const lesson = await one<{ id: string }>(
          `INSERT INTO public.lessons
             (course_id, chapter_id, title, content_html, video_url, transcript, sequence_order,
              status, visibility_status, created_at, updated_at, estimated_duration,
              simplified_summary, accessibility_notes, learning_objectives,
              focus_mode_enabled, chunked_content_enabled, lesson_type, lesson_layout,
              checkpoints_enabled, adaptive_learning_enabled,
              has_video, has_pdf, has_quiz, has_transcript, has_h5p, has_summary_activity,
              summary_source, summary_word_target, summary_key_points, summary_reflection_questions,
              summary_ai_feedback_enabled, accessibility_score, allow_discussions, allow_download)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                   $22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,$31::jsonb,$32,$33,$34,$35)
           RETURNING id`,
          [
            course.id, chapter.id, l.title, l.html, subject.video_url || null, subject.transcript || null, order,
            l.draft ? 'draft' : 'published', l.draft ? 'hidden' : 'visible', lessonCreated, lessonCreated,
            subject.estimated_duration || null,
            subject.simplified_summary || null, subject.accessibility_notes || null,
            subject.learning_objectives || null,
            subject.focus_mode_enabled, subject.chunked_content_enabled, l.type, l.layout ?? 'standard',
            (l.checkpoints?.length ?? 0) > 0, strong,
            !!l.videoId, (l.materials?.length ?? 0) > 0, !!l.quiz, !!subject.transcript, false, !!l.summaryActivity,
            'entire_lesson', l.summaryActivity?.wordTarget ?? 100,
            JSON.stringify(l.summaryActivity?.keyPoints ?? []),
            JSON.stringify(l.summaryActivity?.reflection ?? []),
            strong, result.score, strong || partial, (l.materials?.length ?? 0) > 0,
          ]
        );

        const sl: SeededLesson = { id: lesson.id, def: l, order, visible: !l.draft, score: result.score };

        // ── quiz ──
        if (l.quiz) {
          const quiz = await one<{ id: string }>(
            `INSERT INTO public.quizzes (lesson_id, title, pass_threshold_pct, max_attempts, time_limit_seconds, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id`,
            [lesson.id, l.quiz.title, l.quiz.passPct, l.quiz.maxAttempts, l.quiz.timeLimitSeconds, lessonCreated]
          );
          sl.quizId = quiz.id;
          seeded.quizIds.push(quiz.id);
          sl.quizQuestionIds = [];
          for (const [qi, qq] of l.quiz.questions.entries()) {
            const question = await one<{ id: string }>(
              `INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, sequence_order, created_at)
               VALUES ($1,$2,$3,$4,$5) RETURNING id`,
              [quiz.id, qq.text, qq.type, qi + 1, lessonCreated]
            );
            let correctId = '';
            let wrongId = '';
            for (const [oi, op] of qq.options.entries()) {
              const opt = await one<{ id: string }>(
                `INSERT INTO public.quiz_options (question_id, option_text, is_correct, sequence_order)
                 VALUES ($1,$2,$3,$4) RETURNING id`,
                [question.id, op.text, op.correct, oi + 1]
              );
              if (op.correct) correctId = opt.id;
              else if (!wrongId) wrongId = opt.id;
            }
            sl.quizQuestionIds.push({ id: question.id, correctOptionId: correctId, wrongOptionId: wrongId });
          }
        }

        // ── interactive activity ──
        if (l.activity) {
          await q(
            `INSERT INTO public.lesson_interactive_content
               (lesson_id, content_type, title, content_data, accessibility_settings, sequence_order,
                is_draft, created_by, created_at, updated_at)
             VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,false,$7,$8,$8)`,
            [
              lesson.id, l.activity.type, l.activity.title,
              JSON.stringify(l.activity.data),
              JSON.stringify({
                keyboard_navigable: true,
                reduced_motion: c.focus === 'autism',
                text_alternatives: strong,
              }),
              1, owner, lessonCreated,
            ]
          );
        }

        // ── in-video questions ──
        for (const [vi, vq] of (l.videoQuestions ?? []).entries()) {
          await q(
            `INSERT INTO public.video_questions
               (lesson_id, title, timestamp_seconds, question_text, options, correct_option_index, sequence_order, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$8)`,
            [lesson.id, vq.title, vq.atSeconds, vq.text, JSON.stringify(vq.options), vq.correctIndex, vi + 1, lessonCreated]
          );
        }

        // ── checkpoints ──
        for (const [chi, cp] of (l.checkpoints ?? []).entries()) {
          await q(
            `INSERT INTO public.lesson_checkpoints (lesson_id, title, description, checkpoint_type, required, sequence_order, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [lesson.id, cp.title, cp.description, cp.type, cp.required, chi + 1, lessonCreated]
          );
        }

        // ── downloadable materials ──
        for (const m of l.materials ?? []) {
          await q(
            `INSERT INTO public.media_assets (course_id, lesson_id, user_id, title, file_name, file_type, size_bytes, url, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [course.id, lesson.id, owner, m.title, m.fileName, m.fileType, m.sizeBytes, m.url, lessonCreated]
          );
        }

        seeded.lessons.push(sl);
      }
    }

    // ── achievements & milestones ──
    for (const a of c.achievements) {
      const row = await one<{ id: string }>(
        `INSERT INTO public.course_achievements (course_id, name, description, requirement_type, requirement_threshold, icon_url, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [course.id, a.name, a.description, a.requirement, a.threshold, a.icon, TS(c.createdAt)]
      );
      seeded.achievementIds.push({ id: row.id, name: a.name, requirement: a.requirement, threshold: a.threshold });
    }
    for (const [mi, m] of c.milestones.entries()) {
      await q(
        `INSERT INTO public.course_milestones (course_id, title, description, required_completion_pct, sequence_order, icon, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [course.id, m.title, m.description, m.pct, mi + 1, m.icon, TS(c.createdAt)]
      );
    }

    courses.set(c.key, seeded);
    const visible = seeded.lessons.filter((l) => l.visible).length;
    const scores = seeded.lessons.map((l) => l.score);
    log(
      `  ${c.status.padEnd(14)} ${c.title}  (${visible} lessons, a11y ${Math.min(...scores)}–${Math.max(...scores)})`
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 4. ENROLMENTS, PROGRESS, QUIZ HISTORY
// ══════════════════════════════════════════════════════════════════════════
interface EnrolResult {
  plan: EnrolPlan;
  enrollmentId: string;
  learnerId: string;
  course: SeededCourse;
  lessonCompletionDates: Date[];
  studyDayDates: Date[];
  quizAttempts: { date: Date; score: number }[];
  completedAt: Date | null;
}
const enrolResults: EnrolResult[] = [];

async function seedEnrolments() {
  step('Enrolling learners and building progress history');
  for (const plan of ENROLMENTS) {
    const learnerId = userIds.get(plan.learner)!;
    const course = courses.get(plan.course)!;
    const visible = course.lessons.filter((l) => l.visible);
    const nComplete = plan.completed === 'all' ? visible.length : Math.min(plan.completed, visible.length);
    const nViewed = Math.min(nComplete + plan.viewedOnly, visible.length);

    const enrolment = await one<{ id: string }>(
      `INSERT INTO public.enrollments (user_id, course_id, status, enrolled_at)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [learnerId, course.id, plan.status === 'dropped' ? 'dropped' : 'active', TS(plan.enrolledAt)]
    );

    const from = D(plan.firstActivity);
    const to = D(plan.lastActivity);
    const moments = spread(from, to, Math.max(nViewed, 1));
    const completionDates: Date[] = [];

    for (let i = 0; i < nViewed; i++) {
      const lesson = visible[i];
      const firstView = moments[i];
      const isDone = i < nComplete;
      // A completed lesson is finished a little after it was first opened.
      const lastView = isDone ? addMin(firstView, rint(6, 28)) : addMin(firstView, rint(2, 9));
      if (isDone) completionDates.push(lastView);

      await q(
        `INSERT INTO public.lesson_progress
           (enrollment_id, lesson_id, is_viewed, is_completed, first_viewed_at, last_viewed_at,
            view_count, time_spent_learning, summary_completed, progress_meta)
         VALUES ($1,$2,true,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [
          enrolment.id,
          lesson.id,
          isDone,
          iso(firstView),
          iso(lastView),
          isDone ? rint(1, 4) : 1,
          Math.round((lastView.getTime() - firstView.getTime()) / 1000),
          isDone && !!lesson.def.summaryActivity,
          JSON.stringify({ scroll_pct: isDone ? 100 : rint(15, 70), device: rnd() > 0.5 ? 'mobile' : 'desktop' }),
        ]
      );

      // Learners who wrote a summary leave the text in learner_checkpoints,
      // which is where the app actually stores it.
      if (isDone && lesson.def.summaryActivity) {
        await q(
          `INSERT INTO public.learner_checkpoints (enrollment_id, lesson_id, checkpoint_id, completed, completed_at, response_data, created_at)
           VALUES ($1,$2,NULL,true,$3,$4::jsonb,$3)`,
          [
            enrolment.id,
            lesson.id,
            iso(lastView),
            JSON.stringify({
              content: `What I took from "${lesson.def.title}": ${lesson.def.simplifiedSummary ?? 'the main idea was clearer once I worked through the examples.'}`,
              word_count: rint(55, 120),
              status: 'submitted',
            }),
          ]
        );
      }
    }

    // ── quiz attempts ──
    const attemptsOut: { date: Date; score: number }[] = [];
    for (const qp of plan.quizzes ?? []) {
      const quizLesson = course.lessons.filter((l) => l.quizId)[qp.quizIndex];
      if (!quizLesson?.quizId || !quizLesson.quizQuestionIds) continue;
      const questions = quizLesson.quizQuestionIds;

      for (const [ai, target] of qp.attempts.entries()) {
        const nCorrect = Math.round((target / 100) * questions.length);
        const scorePct = Math.round((nCorrect / questions.length) * 100);
        const quizDef = quizLesson.def.quiz!;
        const passed = scorePct >= quizDef.passPct;
        // Attempts happen after the lesson was worked through.
        const base = completionDates.length ? completionDates[completionDates.length - 1] : to;
        const startedAt = addHours(base, 1 + ai * 26);
        const submittedAt = addMin(startedAt, rint(4, 14));

        const attempt = await one<{ id: string }>(
          `INSERT INTO public.quiz_attempts (enrollment_id, quiz_id, attempt_number, score_pct, result, started_at, submitted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [enrolment.id, quizLesson.quizId, ai + 1, scorePct, passed ? 'pass' : 'fail', iso(startedAt), iso(submittedAt)]
        );

        for (const [qi, question] of questions.entries()) {
          const gotItRight = qi < nCorrect;
          const chosen = gotItRight ? question.correctOptionId : question.wrongOptionId || question.correctOptionId;
          await q(
            `INSERT INTO public.quiz_answers (attempt_id, question_id, selected_option_id, is_correct)
             VALUES ($1,$2,$3,$4)`,
            [attempt.id, question.id, chosen, gotItRight]
          );
        }
        attemptsOut.push({ date: submittedAt, score: scorePct });
      }
    }

    // Distinct study days, used for the 'streak' achievement rule.
    const studyDayDates = spread(from, to, plan.studyDays);

    enrolResults.push({
      plan,
      enrollmentId: enrolment.id,
      learnerId,
      course,
      lessonCompletionDates: completionDates,
      studyDayDates,
      quizAttempts: attemptsOut,
      completedAt: null,
    });

    log(`  ${plan.learner.replace('learner_', '').padEnd(8)} → ${course.def.title.slice(0, 42).padEnd(44)} ${nComplete}/${visible.length} lessons`);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 5. DERIVE COMPLETION + ACHIEVEMENTS THROUGH THE REAL RPC
// ══════════════════════════════════════════════════════════════════════════
async function deriveStateAsLearners() {
  step('Deriving completion and achievements via sync_learner_course_state()');
  const learnerKeys = [...new Set(ENROLMENTS.map((e) => e.learner))];

  for (const key of learnerKeys) {
    const persona = PERSONAS.find((p) => p.key === key)!;
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: persona.email,
      password: DEMO_PASSWORD,
    });
    if (signInErr) throw new Error(`signIn(${persona.email}): ${signInErr.message}`);

    for (const r of enrolResults.filter((x) => x.plan.learner === key)) {
      if (r.plan.status === 'dropped') continue;
      const { data, error } = await client.rpc('sync_learner_course_state', { p_course_id: r.course.id });
      if (error) throw new Error(`sync(${persona.email}, ${r.course.def.title}): ${error.message}`);
      const res = data as { status: string; progress_pct: number; newly_awarded: { id: string; name: string }[] };
      if (res.status === 'completed') {
        r.completedAt = r.lessonCompletionDates[r.lessonCompletionDates.length - 1] ?? D(r.plan.lastActivity);
      }
      log(
        `  ${persona.username.padEnd(12)} ${r.course.def.title.slice(0, 38).padEnd(40)} ${String(res.progress_pct).padStart(3)}%  ${res.status.padEnd(9)} +${res.newly_awarded.length} achievement(s)`
      );
    }
    await client.auth.signOut();
  }
}

/** The RPC stamps everything with now(); move it back onto the real timeline. */
async function backdateDerivedState() {
  step('Backdating derived completion and achievement timestamps');
  let fixedEnrol = 0;
  let fixedAch = 0;

  for (const r of enrolResults) {
    if (r.completedAt) {
      await q(`UPDATE public.enrollments SET status='completed', completed_at=$2 WHERE id=$1`, [
        r.enrollmentId,
        iso(r.completedAt),
      ]);
      fixedEnrol++;
    }

    const total = r.course.lessons.filter((l) => l.visible).length;
    const awarded = await q(
      `SELECT ua.id, ca.requirement_type, ca.requirement_threshold
         FROM public.user_achievements ua
         JOIN public.course_achievements ca ON ca.id = ua.achievement_id
        WHERE ua.user_id = $1 AND ua.course_id = $2`,
      [r.learnerId, r.course.id]
    );

    for (const a of awarded) {
      let when: Date | null = null;
      const th = Number(a.requirement_threshold);
      if (a.requirement_type === 'lesson') {
        when = r.lessonCompletionDates[th - 1] ?? r.lessonCompletionDates.at(-1) ?? null;
      } else if (a.requirement_type === 'progress') {
        const needed = Math.ceil((th / 100) * total);
        when = r.lessonCompletionDates[needed - 1] ?? r.lessonCompletionDates.at(-1) ?? null;
      } else if (a.requirement_type === 'quiz') {
        when = r.quizAttempts.at(-1)?.date ?? r.lessonCompletionDates.at(-1) ?? null;
      } else if (a.requirement_type === 'streak') {
        when = r.studyDayDates[th - 1] ?? r.studyDayDates.at(-1) ?? null;
      }
      if (!when) when = D(r.plan.lastActivity);
      // An achievement can never predate the enrolment.
      if (when < D(r.plan.enrolledAt)) when = addHours(D(r.plan.enrolledAt), 1);
      await q(`UPDATE public.user_achievements SET earned_at=$2 WHERE id=$1`, [a.id, iso(when)]);
      fixedAch++;
    }
  }
  log(`  ${fixedEnrol} completions and ${fixedAch} achievements moved onto the real timeline`);
}

// ══════════════════════════════════════════════════════════════════════════
// 6. CERTIFICATES
// ══════════════════════════════════════════════════════════════════════════
function refCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(rnd() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}
const signToken = (code: string, at: number) =>
  crypto.createHash('sha256').update(`${code}:${at}:acess-cert`).digest('hex').slice(0, 32);

async function seedCertificates() {
  step('Issuing certificates');
  let system = 0;
  let custom = 0;
  let revoked = 0;

  // certificates.enrollment_id is UNIQUE: the platform keeps exactly one
  // certificate row per enrolment, and metadata.is_custom records whether the
  // educator replaced the generated one with their own upload (see
  // /api/certificates/custom, which updates the existing row rather than
  // inserting a second). So an enrolment earmarked for an educator-issued
  // certificate does not also get a system one.
  const customEnrolKeys = new Set(CUSTOM_CERTIFICATES.map((c) => `${c.learner}|${c.course}`));

  // ── System certificates: every completed enrolment on a certificate course
  for (const r of enrolResults) {
    if (!r.completedAt || !r.course.def.certificateEnabled) continue;
    if (customEnrolKeys.has(`${r.plan.learner}|${r.plan.course}`)) continue;
    const persona = PERSONAS.find((p) => p.key === r.plan.learner)!;
    const educator = PERSONAS.find((p) => p.key === r.course.def.ownerKey)!;
    const issuedAt = addHours(r.completedAt, rint(2, 30)); // always after completion
    const code = refCode();
    const hours = Math.max(
      1,
      Math.round(r.course.def.chapters.flatMap((c) => c.lessons).reduce((s, l) => s + l.minutes, 0) / 60)
    );

    await q(
      `INSERT INTO public.certificates
         (enrollment_id, course_id, user_id, learner_name, course_title, educator_name,
          institution_name, reference_code, status, issued_at, completion_date,
          verification_url, skills_earned, course_duration_hours, signed_token,
          template_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'issued',$9,$10,$11,$12::text[],$13,$14,'default',$15::jsonb)`,
      [
        r.enrollmentId, r.course.id, r.learnerId, persona.fullName, r.course.def.title, educator.fullName,
        'ACESS Platform', code, iso(issuedAt), iso(r.completedAt),
        `${APP_ORIGIN}/verify/${code}`, r.course.def.tags.slice(0, 3), hours,
        signToken(code, issuedAt.getTime()),
        JSON.stringify({ is_custom: false, educator_role: r.course.def.ownerRole }),
      ]
    );
    system++;
  }

  // ── Educator-issued ("unique") certificates
  for (const cc of CUSTOM_CERTIFICATES) {
    const learnerId = userIds.get(cc.learner)!;
    const course = courses.get(cc.course)!;
    const persona = PERSONAS.find((p) => p.key === cc.learner)!;
    const educator = PERSONAS.find((p) => p.key === cc.educator)!;
    const enrol = enrolResults.find((r) => r.plan.learner === cc.learner && r.plan.course === cc.course);
    if (!enrol) continue;

    const code = refCode();
    const issuedAt = D(cc.issuedAt);
    // An educator can issue against an enrolment that is not finished (the
    // /api/certificates/custom route allows it), so the "completion date"
    // printed on the certificate is the last lesson the learner had actually
    // finished by the time it was issued — never a date in its future.
    const before = enrol.lessonCompletionDates.filter((d) => d <= issuedAt);
    const completion = enrol.completedAt && enrol.completedAt <= issuedAt
      ? enrol.completedAt
      : before.at(-1) ?? D(enrol.plan.enrolledAt);

    await q(
      `INSERT INTO public.certificates
         (enrollment_id, course_id, user_id, learner_name, course_title, educator_name,
          institution_name, reference_code, status, issued_at, completion_date,
          verification_url, skills_earned, course_duration_hours, signed_token,
          template_id, metadata, pdf_url, revoked_at, revoke_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::text[],$14,$15,'custom',$16::jsonb,$17,$18,$19)`,
      [
        enrol.enrollmentId, course.id, learnerId, persona.fullName, cc.title, educator.fullName,
        'ACESS Platform', code, cc.revokedAt ? 'revoked' : 'issued', iso(issuedAt), iso(completion),
        `${APP_ORIGIN}/verify/${code}`, cc.skills, 0, signToken(code, issuedAt.getTime()),
        JSON.stringify({ is_custom: true, educator_role: 'educator', issued_by: educator.fullName }),
        `${SUPABASE_URL}/storage/v1/object/public/certificates/custom_certs/${code}.pdf`,
        cc.revokedAt ? TS(cc.revokedAt) : null,
        cc.revokeReason ?? null,
      ]
    );
    if (cc.revokedAt) revoked++;
    else custom++;
  }

  log(`  ${system} system, ${custom} educator-issued, ${revoked} revoked`);
}

// ══════════════════════════════════════════════════════════════════════════
// 7. SUPPORTING CONTENT
// ══════════════════════════════════════════════════════════════════════════
async function seedSupporting() {
  step('Adding favourites, comments, recommendations and platform records');

  for (const f of FAVOURITES) {
    await q(`INSERT INTO public.course_favorites (user_id, course_id, created_at) VALUES ($1,$2,$3)`, [
      userIds.get(f.learner),
      courses.get(f.course)!.id,
      TS(f.at),
    ]);
  }

  // ── Lesson discussion ──
  const commentSeeds: { learner: string; course: string; lessonIdx: number; body: string; at: string; replyFrom?: string; reply?: string; replyAt?: string }[] = [
    {
      learner: 'learner_mei', course: 'c_reading', lessonIdx: 1,
      body: 'The syllable clapping trick finally made "accessibility" readable for me. Six beats and it stopped looking like a wall.',
      at: '2026-04-12T20:10:00+08:00',
      replyFrom: 'edu_siti',
      reply: 'That is exactly the idea, Mei. Try it on any word longer than three syllables and it will keep working.',
      replyAt: '2026-04-13T09:05:00+08:00',
    },
    {
      learner: 'learner_amir', course: 'c_adhd', lessonIdx: 0,
      body: 'Putting my phone in another room instead of face-down made more difference than anything else I have tried.',
      at: '2026-03-12T20:40:00+08:00',
      replyFrom: 'edu_siti',
      reply: 'Removing beats resisting every time. Glad it landed.',
      replyAt: '2026-03-12T21:30:00+08:00',
    },
    {
      learner: 'learner_priya', course: 'c_autism', lessonIdx: 1,
      body: 'The "last box" idea is the part I needed. Sessions used to have no ending so I never felt finished.',
      at: '2026-05-18T15:30:00+08:00',
    },
    {
      learner: 'learner_aisyah', course: 'c_maths', lessonIdx: 0,
      body: 'Estimating first caught a decimal point error in my homework this week. Genuinely useful.',
      at: '2026-05-20T18:05:00+08:00',
    },
    {
      learner: 'learner_daniel', course: 'c_foundations', lessonIdx: 1,
      body: 'I keep losing track after the second lesson. Is there a shorter path through this course?',
      at: '2026-04-10T21:50:00+08:00',
      replyFrom: 'admin_aliff',
      reply: 'Try chunked mode from the layout control — it shows one section at a time. The course is only five lessons, you are further than you think.',
      replyAt: '2026-04-11T09:20:00+08:00',
    },
  ];

  for (const cs of commentSeeds) {
    const course = courses.get(cs.course)!;
    const lesson = course.lessons.filter((l) => l.visible)[cs.lessonIdx];
    if (!lesson) continue;
    const parent = await one<{ id: string }>(
      `INSERT INTO public.lesson_comments (lesson_id, user_id, content, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$4) RETURNING id`,
      [lesson.id, userIds.get(cs.learner), cs.body, TS(cs.at)]
    );
    if (cs.reply && cs.replyFrom) {
      await q(
        `INSERT INTO public.lesson_comments (lesson_id, user_id, parent_id, content, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$5)`,
        [lesson.id, userIds.get(cs.replyFrom), parent.id, cs.reply, TS(cs.replyAt!)]
      );
    }
  }

  // ── Adaptive interaction telemetry (drives the accessibility analytics) ──
  // The admin "preset adoption" panel reads events shaped `preset_applied:<id>`
  // out of adaptive_interactions.adaptation_used (see splitAdaptation() in
  // src/lib/admin-analytics.ts) — saving a preset on the profile is not enough
  // on its own. Each learner who runs a preset records applying it, shortly
  // after they joined.
  let interactions = 0;
  for (const p of PERSONAS) {
    const preset = p.accessibilityPrefs.active_preset as string | undefined;
    if (!preset || preset === 'none') continue;
    const firstCourse = enrolResults.find((r) => r.plan.learner === p.key);
    await q(
      `INSERT INTO public.adaptive_interactions (user_id, lesson_id, course_id, adaptation_used, duration_seconds, session_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userIds.get(p.key),
        null,
        firstCourse?.course.id ?? null,
        `preset_applied:${preset}`,
        rint(30, 180),
        crypto.randomUUID(),
        iso(addHours(D(p.joined), 1)),
      ]
    );
    interactions++;
  }

  const interactionTypes = ['tts', 'focus_mode', 'chunked_content', 'simplified_summary', 'reading_spotlight', 'distraction_free', 'high_contrast'];
  for (const r of enrolResults) {
    const persona = PERSONAS.find((p) => p.key === r.plan.learner)!;
    if (!persona.disabilityType) continue;
    const preferred =
      persona.disabilityType === 'dyslexia' ? ['tts', 'reading_spotlight', 'simplified_summary']
      : persona.disabilityType === 'adhd' ? ['chunked_content', 'distraction_free', 'focus_mode']
      : ['focus_mode', 'high_contrast'];
    const visible = r.course.lessons.filter((l) => l.visible);
    for (const [i, when] of r.lessonCompletionDates.entries()) {
      const lesson = visible[i];
      if (!lesson) continue;
      const kind = preferred[i % preferred.length] ?? interactionTypes[0];
      await q(
        `INSERT INTO public.adaptive_interactions (user_id, lesson_id, course_id, adaptation_used, duration_seconds, session_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.learnerId, lesson.id, r.course.id, kind, rint(90, 900), crypto.randomUUID(), iso(when)]
      );
      interactions++;
    }
  }

  // ── Recommendations for the learners who stalled ──
  for (const r of enrolResults) {
    const stalled = r.plan.status === 'active' && r.lessonCompletionDates.length > 0 &&
      r.lessonCompletionDates.length < r.course.lessons.filter((l) => l.visible).length;
    const failedQuiz = r.quizAttempts.some((a) => a.score < 60);
    if (!stalled && !failedQuiz) continue;
    const visible = r.course.lessons.filter((l) => l.visible);
    const next = visible[r.lessonCompletionDates.length];
    if (!next) continue;
    await q(
      `INSERT INTO public.recommendations (enrollment_id, recommended_lesson_id, trigger_reason, difficulty_tier, is_acknowledged, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        r.enrollmentId,
        next.id,
        failedQuiz ? 'Quiz score below the pass mark — revisit this lesson before retrying.' : 'No activity for several weeks — pick up here.',
        failedQuiz ? 'revision' : 'standard',
        rnd() > 0.6,
        iso(addDays(D(r.plan.lastActivity), 3)),
      ]
    );
  }

  // ── Referral codes ──
  for (const key of ['edu_siti', 'edu_marcus', 'admin_aliff']) {
    const p = PERSONAS.find((x) => x.key === key)!;
    await q(
      `INSERT INTO public.referral_codes (user_id, code, is_active, max_uses, usage_count, created_at)
       VALUES ($1,$2,true,$3,$4,$5)`,
      [userIds.get(key), `ACESS-${p.username.split('.')[0].toUpperCase()}-26`, 25, rint(1, 9), TS(p.joined)]
    );
  }

  // ── Instructor applications (one of them became Farah's account) ──
  const apps = [
    {
      user: 'edu_farah', full: 'Farah Nadhirah Idris', email: 'farah.educator@acess.edu.my',
      status: 'approved', reason: 'I train teachers on assistive technology and want to reach learners directly.',
      experience: 'Six years as an AT trainer with the state special education unit.',
      created: '2026-06-10T10:00:00+08:00', reviewed: '2026-06-18T12:30:00+08:00', reviewer: 'admin_aliff',
      notes: 'Strong AT background. Approved.',
    },
    {
      user: null, full: 'Tan Chee Meng', email: 'cheemeng.tan@example.com',
      status: 'pending', reason: 'I would like to publish a course on note-taking for deaf learners.',
      experience: 'Four years teaching in a deaf education programme.',
      created: '2026-08-14T09:20:00+08:00', reviewed: null, reviewer: null, notes: null,
    },
    {
      user: null, full: 'Zulaikha Hamid', email: 'zulaikha.h@example.com',
      status: 'request_info', reason: 'Proposing a numeracy course for adult learners.',
      experience: 'Adult education tutor, two years.',
      created: '2026-08-02T16:45:00+08:00', reviewed: '2026-08-06T11:10:00+08:00', reviewer: 'admin_rajesh',
      notes: 'Asked for a sample lesson plan before approving.',
    },
    {
      user: null, full: 'Gopal Krishnan', email: 'gopal.k@example.com',
      status: 'rejected', reason: 'Want to sell my revision notes on the platform.',
      experience: 'None in accessible education.',
      created: '2026-05-19T14:00:00+08:00', reviewed: '2026-05-22T10:00:00+08:00', reviewer: 'admin_aliff',
      notes: 'Out of scope — ACESS is not a marketplace.',
    },
  ];
  for (const a of apps) {
    await q(
      `INSERT INTO public.instructor_applications
         (user_id, full_name, email, reason, experience, status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        a.user ? userIds.get(a.user) : null, a.full, a.email, a.reason, a.experience, a.status,
        a.notes, a.reviewer ? userIds.get(a.reviewer) : null, a.reviewed ? TS(a.reviewed) : null, TS(a.created), TS(a.reviewed ?? a.created),
      ]
    );
  }

  // ── Contact messages ──
  const messages = [
    { name: 'Siti Khadijah', email: 'k.siti@example.com', subject: 'Text-to-speech stops mid-lesson', category: 'technical', status: 'replied', body: 'The read-aloud stops when I scroll on my phone. It works on the laptop.', at: '2026-06-08T11:20:00+08:00' },
    { name: 'Lim Boon Huat', email: 'bh.lim@example.com', subject: 'Can I use ACESS with my class?', category: 'general', status: 'read', body: 'I teach a class of 22 and would like to enrol them together. Is there a bulk option?', at: '2026-07-15T09:05:00+08:00' },
    { name: 'Anonymous', email: 'reader@example.com', subject: 'OpenDyslexic font request', category: 'accessibility', status: 'replied', body: 'Could you add letter-spacing control as well as the dyslexia font? The font alone is not quite enough for me.', at: '2026-05-02T19:40:00+08:00' },
    { name: 'Nur Hidayah', email: 'nur.h@example.com', subject: 'Applying to teach', category: 'instructor_application', status: 'unread', body: 'How long does the instructor application usually take to review?', at: '2026-08-20T14:30:00+08:00' },
    { name: 'Ravi Chandran', email: 'ravi.c@example.com', subject: 'Loved the ADHD course', category: 'feedback', status: 'read', body: 'The two-minute-version idea got me through a whole term of coursework. Thank you.', at: '2026-08-11T21:15:00+08:00' },
  ];
  for (const m of messages) {
    await q(
      `INSERT INTO public.contact_messages (name, email, subject, category, message, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [m.name, m.email, m.subject, m.category, m.body, m.status, TS(m.at)]
    );
  }

  // ── Lesson templates (educator reuse) ──
  const templates = [
    { by: 'edu_siti', title: 'Structured reading lesson', type: 'reading', desc: 'Objectives, short passage, three comprehension prompts, closing summary.', mins: 15, pub: true },
    { by: 'edu_siti', title: 'Video + transcript lesson', type: 'video', desc: 'Video embed with a full transcript block and two in-video checkpoints.', mins: 12, pub: true },
    { by: 'edu_marcus', title: 'Worked example lesson', type: 'practice', desc: 'One worked example, three graded practice items, an answer key.', mins: 10, pub: false },
  ];
  for (const t of templates) {
    await q(
      `INSERT INTO public.lesson_templates (title, description, lesson_type, content_html, estimated_duration, is_public, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        t.title, t.desc, t.type,
        `<h2>${t.title}</h2><p>Replace this with your lesson introduction.</p><h3>Objectives</h3><ul><li>...</li></ul><h3>Content</h3><p>...</p>`,
        t.mins, t.pub, userIds.get(t.by), TS(PERSONAS.find((p) => p.key === t.by)!.joined),
      ]
    );
  }

  // ── Accessibility templates (course design presets) ──
  const a11yTemplates = [
    { name: 'Dyslexia-friendly lesson', target: 'dyslexia', structure: { font: 'opendyslexic', line_spacing: 1.6, background_tint: 'cream', max_paragraph_words: 60, require_transcript: true } },
    { name: 'ADHD-friendly lesson', target: 'adhd', structure: { chunked: true, max_section_words: 180, checklist: true, distraction_free: true } },
    { name: 'Autism-friendly lesson', target: 'autism', structure: { fixed_order: true, animation: 'none', muted_colors: true, visual_schedule: true } },
  ];
  for (const t of a11yTemplates) {
    await q(
      `INSERT INTO public.accessibility_templates (name, description, target_disability, content_structure, created_at)
       VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [t.name, `Course design preset tuned for ${t.target} learners.`, t.target, JSON.stringify(t.structure), TS('2026-02-01T09:00:00+08:00')]
    );
  }

  // ── Lesson version history + AI summaries on a few lessons ──
  const foundations = courses.get('c_foundations')!;
  for (const l of foundations.lessons.slice(0, 2)) {
    await q(
      `INSERT INTO public.lesson_versions (lesson_id, version_name, content_html, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [l.id, 'v1 — before plain-language pass', l.def.html.replace(/<h3>/g, '<p><strong>').replace(/<\/h3>/g, '</strong></p>'), userIds.get('admin_aliff'), TS('2026-01-20T10:00:00+08:00')]
    );
  }
  for (const key of ['c_foundations', 'c_adhd', 'c_reading']) {
    const c = courses.get(key)!;
    const l = c.lessons.find((x) => x.visible && x.def.tier === 'strong');
    if (!l) continue;
    await q(
      `INSERT INTO public.lesson_ai_summaries (lesson_id, summary, suggested_questions, model, source_content_hash, created_at, updated_at)
       VALUES ($1,$2,$3::text[],$4,$5,$6,$6)`,
      [
        l.id,
        l.def.simplifiedSummary ?? `A short overview of "${l.def.title}".`,
        [`What is the main idea of ${l.def.title}?`, 'Which part would you explain to a friend?', 'What would you try first?'],
        'gemini-2.0-flash',
        crypto.createHash('sha256').update(l.def.html).digest('hex').slice(0, 32),
        TS('2026-08-01T10:00:00+08:00'),
      ]
    );
  }

  // ── H5P embeds on two lessons ──
  for (const key of ['c_maths', 'c_reading']) {
    const c = courses.get(key)!;
    const l = c.lessons.find((x) => x.visible)!;
    await q(
      `INSERT INTO public.h5p_contents (lesson_id, title, description, embed_url, source_url, thumbnail_url, width, height, sequence_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$9)`,
      [
        l.id,
        `${c.def.category} interactive practice`,
        'Embedded H5P practice set with immediate feedback.',
        'https://h5p.org/h5p/embed/611',
        'https://h5p.org/interactive-video',
        c.def.thumbnail,
        1090, 610,
        TS(c.def.createdAt),
      ]
    );
  }

  log(`  ${FAVOURITES.length} favourites, ${commentSeeds.length} comment threads, ${interactions} adaptive interactions`);
}

// ══════════════════════════════════════════════════════════════════════════
// 8. NOTIFICATIONS — backdate what the triggers generated
// ══════════════════════════════════════════════════════════════════════════
async function backdateNotifications() {
  step('Backdating trigger-generated notifications');

  // Enrolment notifications carry the enrolment id in their metadata.
  const a = await q(`
    UPDATE public.notifications n
       SET created_at = e.enrolled_at
      FROM public.enrollments e
     WHERE n.metadata->>'enrollment_id' = e.id::text
    RETURNING n.id`);

  // Quiz notifications carry the attempt id.
  const b = await q(`
    UPDATE public.notifications n
       SET created_at = qa.submitted_at
      FROM public.quiz_attempts qa
     WHERE n.metadata->>'attempt_id' = qa.id::text
    RETURNING n.id`);

  // Lesson-progress notifications carry lesson_id; match them to the learner's
  // own first view of that lesson.
  const c = await q(`
    UPDATE public.notifications n
       SET created_at = lp.first_viewed_at
      FROM public.lesson_progress lp
     WHERE n.metadata->>'lesson_id' = lp.lesson_id::text
       AND n.type = 'progress'
    RETURNING n.id`);

  // "New lesson added" notifications belong to the course build phase.
  const d = await q(`
    UPDATE public.notifications n
       SET created_at = l.created_at
      FROM public.lessons l
     WHERE n.metadata->>'lesson_id' = l.id::text
       AND n.created_at > now() - interval '1 hour'
    RETURNING n.id`);

  // Anything the triggers produced that we could not match is still stamped
  // "now" — spread it across the last eight weeks so nothing clumps on today.
  const e = await q(`
    UPDATE public.notifications
       SET created_at = now() - (random() * interval '56 days')
     WHERE created_at > now() - interval '1 hour'
    RETURNING id`);

  // Older notifications have mostly been read.
  await q(`UPDATE public.notifications SET is_read = (created_at < now() - interval '10 days')`);

  log(`  ${a.length} enrolment, ${b.length} quiz, ${c.length} progress, ${d.length} lesson, ${e.length} spread`);
}

// ══════════════════════════════════════════════════════════════════════════
// 9. INTEGRITY VERIFICATION
// ══════════════════════════════════════════════════════════════════════════
async function verify() {
  step('Verifying data integrity');
  const checks: { label: string; sql: string }[] = [
    { label: 'orphaned lessons (no course)', sql: `select count(*) from lessons l left join courses c on c.id=l.course_id where c.id is null` },
    { label: 'orphaned enrolments', sql: `select count(*) from enrollments e left join users u on u.id=e.user_id left join courses c on c.id=e.course_id where u.id is null or c.id is null` },
    { label: 'orphaned lesson_progress', sql: `select count(*) from lesson_progress lp left join enrollments e on e.id=lp.enrollment_id left join lessons l on l.id=lp.lesson_id where e.id is null or l.id is null` },
    { label: 'orphaned quiz_answers', sql: `select count(*) from quiz_answers qa left join quiz_attempts a on a.id=qa.attempt_id where a.id is null` },
    { label: 'orphaned certificates', sql: `select count(*) from certificates c left join enrollments e on e.id=c.enrollment_id where e.id is null` },
    { label: 'users without a profile', sql: `select count(*) from users u left join user_profiles p on p.user_id=u.id where p.id is null` },
    { label: 'duplicate enrolments (user+course)', sql: `select coalesce(sum(n-1),0) from (select count(*) n from enrollments group by user_id, course_id having count(*)>1) x` },
    { label: 'duplicate progress rows', sql: `select coalesce(sum(n-1),0) from (select count(*) n from lesson_progress group by enrollment_id, lesson_id having count(*)>1) x` },
    { label: 'duplicate certificate codes', sql: `select coalesce(sum(n-1),0) from (select count(*) n from certificates group by reference_code having count(*)>1) x` },
    { label: 'completed before enrolled', sql: `select count(*) from enrollments where completed_at is not null and completed_at < enrolled_at` },
    { label: 'certificate issued before completion', sql: `select count(*) from certificates where completion_date is not null and issued_at < completion_date` },
    { label: 'certificate without a completed enrolment', sql: `select count(*) from certificates c join enrollments e on e.id=c.enrollment_id where (c.metadata->>'is_custom')::boolean is not true and e.status <> 'completed'` },
    { label: 'progress completed but not viewed', sql: `select count(*) from lesson_progress where is_completed and not is_viewed` },
    { label: 'lesson viewed before enrolment', sql: `select count(*) from lesson_progress lp join enrollments e on e.id=lp.enrollment_id where lp.first_viewed_at < e.enrolled_at` },
    { label: 'quiz attempt before enrolment', sql: `select count(*) from quiz_attempts qa join enrollments e on e.id=qa.enrollment_id where qa.started_at < e.enrolled_at` },
    { label: 'achievement earned before enrolment', sql: `select count(*) from user_achievements ua join enrollments e on e.user_id=ua.user_id and e.course_id=ua.course_id where ua.earned_at < e.enrolled_at` },
    { label: 'achievement for an un-enrolled course', sql: `select count(*) from user_achievements ua left join enrollments e on e.user_id=ua.user_id and e.course_id=ua.course_id where e.id is null` },
    { label: 'quiz score disagrees with stored answers', sql: `select count(*) from (select a.id, a.score_pct, round(100.0*count(*) filter (where qa.is_correct)/nullif(count(*),0)) calc from quiz_attempts a join quiz_answers qa on qa.attempt_id=a.id group by a.id, a.score_pct) x where score_pct <> calc` },
    { label: 'revoked certificate without a reason', sql: `select count(*) from certificates where status='revoked' and (revoked_at is null or revoke_reason is null)` },
    { label: 'courses owned by a non-educator/admin', sql: `select count(*) from courses c join users u on u.id=c.created_by where u.role not in ('educator','admin')` },
    { label: 'published course with zero lessons', sql: `select count(*) from courses c where c.status='published' and not exists (select 1 from lessons l where l.course_id=c.id and l.status='published')` },
  ];

  let failures = 0;
  for (const c of checks) {
    const n = Number((await one<{ count: string }>(`select (${c.sql}) as count`)).count);
    if (n !== 0) {
      failures++;
      console.log(`  ✗ ${c.label}: ${n}`);
    } else {
      console.log(`  ✓ ${c.label}`);
    }
  }
  if (failures > 0) throw new Error(`${failures} integrity check(s) failed`);
}

// ══════════════════════════════════════════════════════════════════════════
// 10. SUMMARY
// ══════════════════════════════════════════════════════════════════════════
async function summary() {
  step('Summary');
  const rows = await q(`
    select 'users (admin)'      as k, count(*)::int n from users where role='admin'
    union all select 'users (educator)', count(*)::int from users where role='educator'
    union all select 'users (learner)',  count(*)::int from users where role='learner'
    union all select 'courses (published)', count(*)::int from courses where status='published'
    union all select 'courses (draft)', count(*)::int from courses where status='draft'
    union all select 'courses (pending_review)', count(*)::int from courses where status='pending_review'
    union all select 'courses (archived)', count(*)::int from courses where status='archived'
    union all select 'chapters', count(*)::int from course_chapters
    union all select 'lessons (published)', count(*)::int from lessons where status='published'
    union all select 'lessons (draft)', count(*)::int from lessons where status='draft'
    union all select 'quizzes', count(*)::int from quizzes
    union all select 'quiz questions', count(*)::int from quiz_questions
    union all select 'quiz options', count(*)::int from quiz_options
    union all select 'interactive activities', count(*)::int from lesson_interactive_content
    union all select 'video questions', count(*)::int from video_questions
    union all select 'lesson checkpoints', count(*)::int from lesson_checkpoints
    union all select 'h5p embeds', count(*)::int from h5p_contents
    union all select 'media assets', count(*)::int from media_assets
    union all select 'enrolments', count(*)::int from enrollments
    union all select 'lesson_progress rows', count(*)::int from lesson_progress
    union all select 'quiz attempts', count(*)::int from quiz_attempts
    union all select 'quiz answers', count(*)::int from quiz_answers
    union all select 'learner checkpoints', count(*)::int from learner_checkpoints
    union all select 'adaptive interactions', count(*)::int from adaptive_interactions
    union all select 'achievements defined', count(*)::int from course_achievements
    union all select 'achievements earned', count(*)::int from user_achievements
    union all select 'course milestones', count(*)::int from course_milestones
    union all select 'certificates (system)', count(*)::int from certificates where (metadata->>'is_custom')::boolean is not true
    union all select 'certificates (educator)', count(*)::int from certificates where (metadata->>'is_custom')::boolean is true
    union all select 'certificates (revoked)', count(*)::int from certificates where status='revoked'
    union all select 'notifications', count(*)::int from notifications
    union all select 'recommendations', count(*)::int from recommendations
    union all select 'favourites', count(*)::int from course_favorites
    union all select 'lesson comments', count(*)::int from lesson_comments
    union all select 'contact messages', count(*)::int from contact_messages
    union all select 'instructor applications', count(*)::int from instructor_applications
    union all select 'lesson templates', count(*)::int from lesson_templates
    union all select 'accessibility templates', count(*)::int from accessibility_templates
    union all select 'lesson versions', count(*)::int from lesson_versions
    union all select 'lesson ai summaries', count(*)::int from lesson_ai_summaries
    union all select 'referral codes', count(*)::int from referral_codes
  `);
  for (const r of rows) console.log(`  ${String(r.k).padEnd(28)} ${String(r.n).padStart(5)}`);

  const bands = await q(`
    select case when accessibility_score >= 80 then 'good (80-100)'
                when accessibility_score >= 50 then 'warning (50-79)'
                else 'critical (<50)' end as band,
           count(*)::int n, min(accessibility_score)::int lo, max(accessibility_score)::int hi
      from lessons group by 1 order by 3 desc`);
  console.log('\n  Accessibility score bands (computed by the real audit engine):');
  for (const b of bands) console.log(`    ${String(b.band).padEnd(18)} ${String(b.n).padStart(3)} lessons  (${b.lo}–${b.hi})`);

  const range = await one<{ lo: string; hi: string }>(`
    select min(t)::text lo, max(t)::text hi from (
      select created_at t from users
      union all select created_at from courses
      union all select enrolled_at from enrollments
      union all select first_viewed_at from lesson_progress
      union all select submitted_at from quiz_attempts
      union all select earned_at from user_achievements
      union all select issued_at from certificates
    ) x`);
  console.log(`\n  Data spans ${range.lo?.slice(0, 10)} → ${range.hi?.slice(0, 10)}`);
}

// ══════════════════════════════════════════════════════════════════════════
async function main() {
  const t0 = Date.now();
  console.log(`ACESS seed → ${SUPABASE_URL}`);
  await db.connect();
  try {
    await wipe();
    await seedUsers();
    await seedCourses();
    await seedEnrolments();
    await deriveStateAsLearners();
    await backdateDerivedState();
    await seedCertificates();
    await seedSupporting();
    await backdateNotifications();
    await verify();
    await summary();
    console.log(`\n✅ Seed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(`   All demo accounts use the password: ${DEMO_PASSWORD}`);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error('\n❌ Seed failed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
