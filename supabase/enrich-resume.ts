/**
 * Resume enrichment: completes milestones, video questions, comments, notifications
 * Uses bulk queries to avoid timeouts.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function daysAgo(d: number): Date {
  const d2 = new Date(); d2.setDate(d2.getDate() - d); return d2;
}
function randomDate(s: Date, e: Date): Date {
  return new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime()));
}
function randInt(mn: number, mx: number): number { return Math.floor(Math.random() * (mx - mn + 1)) + mn; }

async function main() {
  // ── Remaining milestones (4 of 8 were done) ──
  console.log('🏅 Creating remaining milestones...');
  const remaining: { slug: string; title: string; desc: string; pct: number; icon: string }[] = [
    { slug: 'healthy-habits', title: 'Health Starter', desc: 'Complete 50% of Healthy Habits', pct: 50, icon: 'heart' },
    { slug: 'intro-reading', title: 'Reading Journey', desc: 'Complete 50% of Introduction to Reading', pct: 50, icon: 'book' },
    { slug: 'intro-coding', title: 'Coding Basics', desc: 'Complete 50% of Introduction to Coding', pct: 50, icon: 'code' },
    { slug: 'digital-literacy', title: 'Digital Citizen', desc: 'Complete 50% of Digital Literacy', pct: 50, icon: 'shield' },
  ];
  let msCount = 0, lmCount = 0;
  for (const md of remaining) {
    const { data: course } = await supabase.from('courses').select('id').eq('slug', md.slug).maybeSingle();
    if (!course) continue;
    const { data: existing } = await supabase.from('course_milestones').select('id').eq('course_id', course.id).eq('title', md.title).maybeSingle();
    if (existing) continue;

    const { data: milestone } = await supabase.from('course_milestones').insert({
      course_id: course.id, title: md.title, description: md.desc,
      required_completion_pct: md.pct, icon: md.icon, sequence_order: 0,
    }).select().single();
    if (!milestone) continue;
    msCount++;

    // Bulk: get all enrollments and their completed lesson counts
    const { data: enrollments } = await supabase.from('enrollments').select('id').eq('course_id', course.id);
    if (!enrollments) continue;

    const { count: total } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', course.id);
    const lessonCount = total || 1;

    // Build bulk progress query
    for (const enr of enrollments) {
      const { count: completed } = await supabase.from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enr.id).eq('is_completed', true);
      if (((completed ?? 0) / lessonCount) * 100 >= md.pct) {
        await supabase.from('learner_milestones').upsert({
          enrollment_id: enr.id, milestone_id: milestone.id,
          achieved: true, achieved_at: randomDate(daysAgo(90), daysAgo(1)).toISOString(),
        }, { onConflict: 'enrollment_id,milestone_id' });
        lmCount++;
      }
    }
  }
  console.log(`  ✅ ${msCount} more milestones + ${lmCount} learner milestones`);

  // ── Video questions ──
  console.log('\n🎬 Creating video questions...');
  let vqCount = 0;
  const { data: lessons } = await supabase.from('lessons').select('id, title').eq('has_video', true);
  if (lessons) {
    for (const lesson of lessons) {
      const { data: existing } = await supabase.from('video_questions').select('id').eq('lesson_id', lesson.id).limit(1).maybeSingle();
      if (existing) continue;
      const qc = randInt(1, 3);
      const batch: any[] = [];
      for (let i = 0; i < qc; i++) {
        batch.push({
          lesson_id: lesson.id, title: `Question ${i + 1}`,
          timestamp_seconds: (i + 1) * randInt(15, 60),
          question_text: `What concept is demonstrated in this video about "${lesson.title}"?`,
          options: JSON.stringify([`Answer A`, `Answer B`, `Answer C`, `Answer D`]),
          correct_option_index: 0, sequence_order: i + 1,
        });
      }
      await supabase.from('video_questions').insert(batch);
      vqCount += batch.length;
    }
  }
  console.log(`  ✅ ${vqCount} video questions created`);

  // ── Comment replies ──
  console.log('\n💬 Adding comment replies...');
  const eduEmails = ['educator@acess.demo', 'new_ed@acess.demo', 'fatimah.ed@acess.demo'];
  const { data: topComments } = await supabase.from('lesson_comments').select('id, lesson_id').is('parent_id', null).limit(6);
  let replyCount = 0;
  if (topComments) {
    const replies = [
      "Great question! Happy to help you learn more.",
      "Wonderful observation! Keep up the great work.",
      "That's a fantastic insight. Thanks for sharing!",
      "I'm glad the accessibility features are helping. Let me know if you need anything else.",
      "Excellent progress! You're doing really well in this course.",
      "Thanks for the kind words! We're always improving the platform.",
    ];
    for (let ci = 0; ci < topComments.length; ci++) {
      const { data: existing } = await supabase.from('lesson_comments').select('id').eq('parent_id', topComments[ci].id).limit(1).maybeSingle();
      if (existing) continue;
      const { data: edu } = await supabase.from('users').select('id').eq('email', eduEmails[ci % eduEmails.length]).maybeSingle();
      if (!edu) continue;
      await supabase.from('lesson_comments').insert({
        lesson_id: topComments[ci].lesson_id, user_id: edu.id, parent_id: topComments[ci].id,
        content: replies[ci], created_at: randomDate(daysAgo(15), daysAgo(1)).toISOString(),
      });
      replyCount++;
    }
  }
  console.log(`  ✅ ${replyCount} comment replies added`);

  // ── Mark old notifications as read ──
  console.log('\n🔔 Updating notification read status...');
  const { data: notifs } = await supabase.from('notifications').select('id, created_at, is_read').order('created_at', { ascending: false }).limit(200);
  let readCount = 0;
  if (notifs) {
    for (const n of notifs) {
      if (n.is_read) continue;
      if (new Date(n.created_at) < daysAgo(7)) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
        readCount++;
      }
    }
  }
  console.log(`  ✅ ${readCount} notifications marked as read`);

  console.log('\n📊 Final counts:');
  const tables = ['user_achievements', 'learner_checkpoints', 'course_milestones', 'learner_milestones', 'video_questions', 'lesson_comments', 'notifications'];
  for (const t of tables) {
    const { count } = await supabase.from(t as any).select('*', { count: 'exact', head: true });
    console.log(`  ${t.padEnd(25)} ${count ?? 0} rows`);
  }
  console.log('\n✨ Enrichment complete!');
}
main().catch(console.error);
