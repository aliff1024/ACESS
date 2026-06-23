import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('=== FINAL VERIFICATION ===\n');

  // 1. Users by role
  for (const role of ['admin', 'educator', 'learner']) {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', role);
    console.log(`Users (${role}): ${count ?? 0}`);
  }

  // 2. Course status distribution
  for (const status of ['published', 'draft', 'pending_review', 'archived']) {
    const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', status);
    console.log(`Courses (${status}): ${count ?? 0}`);
  }

  // 3. Enrollment status
  for (const status of ['active', 'completed', 'dropped']) {
    const { count } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', status);
    console.log(`Enrollments (${status}): ${count ?? 0}`);
  }

  // 4. Certificate status
  for (const status of ['issued', 'revoked']) {
    const { count } = await supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', status);
    console.log(`Certificates (${status}): ${count ?? 0}`);
  }

  // 5. Notifications by type
  const { data: notifTypes } = await supabase.from('notifications').select('type, count', { count: 'exact' });
  const { data: notifData, error: notifErr } = await supabase.rpc('get_notification_counts');
  if (notifErr) {
    // Manual grouping
    const { data: notifs } = await supabase.from('notifications').select('type');
    const groups: Record<string, number> = {};
    notifs?.forEach(n => { groups[n.type] = (groups[n.type] || 0) + 1; });
    console.log('Notifications by type:', JSON.stringify(groups));
  }

  // 6. Demo users check
  const { data: demoUsers } = await supabase.from('users').select('email, role').like('email', '%@acess.demo');
  console.log(`\nDemo users: ${demoUsers?.length ?? 0}`);
  if (demoUsers) {
    for (const u of demoUsers) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  }

  // 7. Content check
  const { count: lessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
  const { count: quizzes } = await supabase.from('quizzes').select('*', { count: 'exact', head: true });
  const { count: questions } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true });
  const { count: options } = await supabase.from('quiz_options').select('*', { count: 'exact', head: true });
  console.log(`\nContent: ${lessons ?? 0} lessons, ${quizzes ?? 0} quizzes, ${questions ?? 0} questions, ${options ?? 0} options`);

  // 8. Learner progress
  const { count: lp } = await supabase.from('lesson_progress').select('*', { count: 'exact', head: true });
  const { count: qa } = await supabase.from('quiz_attempts').select('*', { count: 'exact', head: true });
  const { count: ans } = await supabase.from('quiz_answers').select('*', { count: 'exact', head: true });
  console.log(`Progress: ${lp ?? 0} lessons, ${qa ?? 0} quiz attempts, ${ans ?? 0} answers`);

  // 9. Support data
  const { count: apps } = await supabase.from('instructor_applications').select('*', { count: 'exact', head: true });
  const { count: msgs } = await supabase.from('contact_messages').select('*', { count: 'exact', head: true });
  const { count: recs } = await supabase.from('recommendations').select('*', { count: 'exact', head: true });
  console.log(`Support: ${apps ?? 0} applications, ${msgs ?? 0} messages, ${recs ?? 0} recommendations`);

  // 10. Accessibility features
  const { count: ai } = await supabase.from('adaptive_interactions').select('*', { count: 'exact', head: true });
  const { count: up } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
  console.log(`Accessibility: ${ai ?? 0} interactions, ${up ?? 0} profiles`);

  // 11. User with most achievements
  const { count: favs } = await supabase.from('course_favorites').select('*', { count: 'exact', head: true });
  const { count: certs } = await supabase.from('certificates').select('*', { count: 'exact', head: true });
  console.log(`Engagement: ${favs ?? 0} favorites, ${certs ?? 0} certificates`);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

main().catch(console.error);
