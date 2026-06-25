/**
 * ACESS LMS — Enrichment Data Inserter
 *
 * Adds demo enrichment data (achievements, milestones, progress_meta,
 * video questions, comment replies) WITHOUT wiping existing data.
 *
 * Safe to run multiple times — uses upserts and existence checks.
 *
 * Usage: npx tsx supabase/enrich-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────
function daysAgo(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ACESS Enrichment Data Inserter (no wipe)\n');

  // ── 1. Award user_achievements based on actual progress ──
  console.log('🏆 Awarding user achievements...');
  const { data: achievements } = await supabase.from('course_achievements').select('*');
  let achCount = 0;
  if (achievements && achievements.length > 0) {
    for (const ach of achievements) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id')
        .eq('course_id', ach.course_id)
        .in('status', ['completed', 'active']);
      if (!enrollments) continue;

      for (const enr of enrollments) {
        // Skip if already awarded
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', enr.user_id)
          .eq('achievement_id', ach.id)
          .maybeSingle();
        if (existing) continue;

        let qualifies = false;

        if (ach.requirement_type === 'progress' || ach.requirement_type === 'lesson') {
          const { count: completed } = await supabase
            .from('lesson_progress')
            .select('id', { count: 'exact', head: true })
            .eq('enrollment_id', enr.id)
            .eq('is_completed', true);

          const { count: total } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', ach.course_id);

          const lessonCount = total || 1;
          const pct = ((completed ?? 0) / lessonCount) * 100;
          qualifies = ach.requirement_type === 'lesson'
            ? (completed ?? 0) >= ach.requirement_threshold
            : pct >= ach.requirement_threshold;
        } else if (ach.requirement_type === 'quiz') {
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('score_pct')
            .eq('enrollment_id', enr.id)
            .gte('score_pct', ach.requirement_threshold)
            .limit(1);
          qualifies = (attempts && attempts.length > 0) ?? false;
        }

        if (qualifies) {
          await supabase.from('user_achievements').insert({
            user_id: enr.user_id,
            achievement_id: ach.id,
            course_id: ach.course_id,
            earned_at: randomDate(daysAgo(90), daysAgo(1)).toISOString(),
          });
          achCount++;
        }
      }
    }
    console.log(`  ✅ ${achCount} user achievements awarded`);
  } else {
    console.log('  ⏭ No course_achievements found — run seed-comprehensive.ts first');
  }

  // ── 2. Mark learner_checkpoints for completed lessons ──
  console.log('\n✅ Completing learner checkpoints...');
  const { data: allCheckpoints } = await supabase.from('lesson_checkpoints').select('id, lesson_id');
  let cpCount = 0;
  if (allCheckpoints && allCheckpoints.length > 0) {
    for (const cp of allCheckpoints) {
      const { data: progresses } = await supabase
        .from('lesson_progress')
        .select('enrollment_id')
        .eq('lesson_id', cp.lesson_id)
        .eq('is_completed', true);
      if (!progresses) continue;
      for (const p of progresses) {
        const { data: existing } = await supabase
          .from('learner_checkpoints')
          .select('id')
          .eq('enrollment_id', p.enrollment_id)
          .eq('checkpoint_id', cp.id)
          .maybeSingle();
        if (existing) continue;

        await supabase.from('learner_checkpoints').insert({
          enrollment_id: p.enrollment_id,
          checkpoint_id: cp.id,
          completed: true,
          completed_at: randomDate(daysAgo(90), daysAgo(1)).toISOString(),
        });
        cpCount++;
      }
    }
    console.log(`  ✅ ${cpCount} learner checkpoints completed`);
  } else {
    console.log('  ⏭ No lesson_checkpoints found');
  }

  // ── 3. Populate progress_meta on lesson_progress ──
  console.log('\n📊 Populating progress_meta...');
  const { data: allProgress } = await supabase
    .from('lesson_progress')
    .select('id, is_completed, progress_meta');
  let metaCount = 0;
  if (allProgress && allProgress.length > 0) {
    for (const lp of allProgress) {
      const current = lp.progress_meta as Record<string, unknown> | null;
      if (current && typeof current === 'object' && Object.keys(current).length > 1) continue;

      await supabase.from('lesson_progress').update({
        progress_meta: {
          video: lp.is_completed ? 100 : randInt(0, 95),
          scroll: lp.is_completed ? 100 : randInt(10, 99),
          activity: lp.is_completed,
          quiz: lp.is_completed ? randInt(0, 1) === 1 : false,
        },
      }).eq('id', lp.id);
      metaCount++;
    }
    console.log(`  ✅ progress_meta populated for ${metaCount} records`);
  } else {
    console.log('  ⏭ No lesson_progress records found');
  }

  // ── 4. Course milestones + learner milestones ──
  console.log('\n🏅 Creating course milestones...');
  const milestoneDefs: { courseIdx?: number; courseSlug?: string; title: string; desc: string; pct: number; icon: string }[] = [
    { title: 'First Numbers', desc: 'Complete 50% of Learning Numbers', pct: 50, icon: '123', courseSlug: 'learning-numbers' },
    { title: 'Number Master', desc: 'Complete 100% of Learning Numbers', pct: 100, icon: 'star', courseSlug: 'learning-numbers' },
    { title: 'Animal Explorer', desc: 'Complete 50% of Animal Adventures', pct: 50, icon: 'paw', courseSlug: 'animal-adventures' },
    { title: 'Animal Expert', desc: 'Complete 100% of Animal Adventures', pct: 100, icon: 'trophy', courseSlug: 'animal-adventures' },
    { title: 'Health Starter', desc: 'Complete 50% of Healthy Habits', pct: 50, icon: 'heart', courseSlug: 'healthy-habits' },
    { title: 'Reading Journey', desc: 'Complete 50% of Introduction to Reading', pct: 50, icon: 'book', courseSlug: 'intro-reading' },
    { title: 'Coding Basics', desc: 'Complete 50% of Introduction to Coding', pct: 50, icon: 'code', courseSlug: 'intro-coding' },
    { title: 'Digital Citizen', desc: 'Complete 50% of Digital Literacy', pct: 50, icon: 'shield', courseSlug: 'digital-literacy' },
  ];
  let msCount = 0;
  let lmCount = 0;
  for (const md of milestoneDefs) {
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', md.courseSlug)
      .maybeSingle();
    if (!course) continue;

    // Check if milestone already exists
    const { data: existingMilestone } = await supabase
      .from('course_milestones')
      .select('id')
      .eq('course_id', course.id)
      .eq('title', md.title)
      .maybeSingle();
    if (existingMilestone) continue;

    const { data: milestone } = await supabase.from('course_milestones').insert({
      course_id: course.id, title: md.title, description: md.desc,
      required_completion_pct: md.pct, icon: md.icon,
      sequence_order: md.pct === 50 ? 0 : 1,
    }).select().single();
    if (!milestone) continue;
    msCount++;

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course.id);
    if (!enrollments) continue;

    for (const enr of enrollments) {
      const { count: completed } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enr.id)
        .eq('is_completed', true);
      const { count: total } = await supabase
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id);
      const lessonCount = total || 1;
      const pct = ((completed ?? 0) / lessonCount) * 100;
      if (pct >= md.pct) {
        const { data: existingLM } = await supabase
          .from('learner_milestones')
          .select('id')
          .eq('enrollment_id', enr.id)
          .eq('milestone_id', milestone.id)
          .maybeSingle();
        if (existingLM) continue;

        await supabase.from('learner_milestones').insert({
          enrollment_id: enr.id, milestone_id: milestone.id,
          achieved: true,
          achieved_at: randomDate(daysAgo(90), daysAgo(1)).toISOString(),
        });
        lmCount++;
      }
    }
  }
  console.log(`  ✅ ${msCount} milestones + ${lmCount} learner milestones created`);

  // ── 5. Video questions for lessons with video URLs ──
  console.log('\n🎬 Creating video questions...');
  let vqCount = 0;
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, has_video, video_url')
    .eq('has_video', true);
  if (lessons && lessons.length > 0) {
    for (const lesson of lessons) {
      const { data: existing } = await supabase
        .from('video_questions')
        .select('id')
        .eq('lesson_id', lesson.id)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      const questionCount = randInt(1, 3);
      for (let vqi = 0; vqi < questionCount; vqi++) {
        const ts = (vqi + 1) * randInt(15, 60);
        const options = [
          `Answer A for question ${vqi + 1}`,
          `Answer B for question ${vqi + 1}`,
          `Answer C for question ${vqi + 1}`,
          `Answer D for question ${vqi + 1}`,
        ];
        await supabase.from('video_questions').insert({
          lesson_id: lesson.id,
          title: `Question ${vqi + 1}`,
          timestamp_seconds: ts,
          question_text: `What concept is demonstrated at ${ts} seconds in this video?`,
          options: JSON.stringify(options),
          correct_option_index: 0,
          sequence_order: vqi + 1,
        });
        vqCount++;
      }
    }
    console.log(`  ✅ ${vqCount} video questions created`);
  } else {
    console.log('  ⏭ No lessons with video found');
  }

  // ── 6. Comment replies from educators ──
  console.log('\n💬 Adding comment replies...');
  const educatorEmails = ['educator@acess.demo', 'new_ed@acess.demo', 'fatimah.ed@acess.demo'];
  const { data: topComments } = await supabase
    .from('lesson_comments')
    .select('id, lesson_id')
    .is('parent_id', null)
    .limit(6);
  let replyCount = 0;
  if (topComments && topComments.length > 0) {
    const replyTexts = [
      "Great question! Happy to help you learn more.",
      "Wonderful observation! Keep up the great work.",
      "That's a fantastic insight. Thanks for sharing!",
      "I'm glad the accessibility features are helping. Let me know if you need anything else.",
      "Excellent progress! You're doing really well in this course.",
      "Thanks for the kind words! We're always improving the platform.",
    ];
    for (let ci = 0; ci < topComments.length; ci++) {
      const comment = topComments[ci];
      const { data: educator } = await supabase
        .from('users')
        .select('id')
        .eq('email', educatorEmails[ci % educatorEmails.length])
        .maybeSingle();
      if (!educator) continue;

      // Check if reply already exists
      const { data: existingReply } = await supabase
        .from('lesson_comments')
        .select('id')
        .eq('parent_id', comment.id)
        .limit(1)
        .maybeSingle();
      if (existingReply) continue;

      await supabase.from('lesson_comments').insert({
        lesson_id: comment.lesson_id,
        user_id: educator.id,
        parent_id: comment.id,
        content: replyTexts[ci],
        created_at: randomDate(daysAgo(15), daysAgo(1)).toISOString(),
      });
      replyCount++;
    }
    console.log(`  ✅ ${replyCount} comment replies added`);
  } else {
    console.log('  ⏭ No top-level comments found');
  }

  // ── 7. Mark some notifications as read ──
  console.log('\n🔔 Updating notification read status...');
  const { data: allNotifs } = await supabase
    .from('notifications')
    .select('id, created_at, is_read')
    .order('created_at', { ascending: false })
    .limit(100);
  if (allNotifs && allNotifs.length > 0) {
    let readCount = 0;
    for (const n of allNotifs) {
      if (n.is_read) continue;
      if (new Date(n.created_at) < daysAgo(7)) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
        readCount++;
      }
    }
    console.log(`  ✅ ${readCount} notifications marked as read`);
  } else {
    console.log('  ⏭ No notifications found');
  }

  // ── 8. Print summary of enriched tables ──
  console.log('\n📊 Enrichment Summary:');
  const tables = [
    'user_achievements', 'learner_checkpoints', 'learner_milestones',
    'course_milestones', 'video_questions',
  ];
  for (const table of tables) {
    const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(25)} ${count ?? 0} rows`);
  }

  console.log('\n✨ Enrichment complete!');
}

main().catch(console.error);
