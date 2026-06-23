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
  // Check lessons
  const { data: lessons } = await supabase.from('lessons').select('id, title').limit(30);
  console.log(`lessons in DB: ${lessons?.length ?? 0}`);
  lessons?.forEach(l => console.log(`  ${l.id?.substring(0,8)} ${l.title}`));

  // Check enrollments
  const { data: enrolls } = await supabase.from('enrollments').select('id, user_id, course_id, status').limit(10);
  console.log(`\nenrollments in DB: ${enrolls?.length ?? 0}`);

  // Try inserting lesson_progress
  if (enrolls && enrolls.length > 0 && lessons && lessons.length > 0) {
    const { error } = await supabase.from('lesson_progress').insert({
      enrollment_id: enrolls[0].id,
      lesson_id: lessons[0].id,
      is_viewed: true,
      is_completed: true,
      last_viewed_at: new Date().toISOString(),
      time_spent_learning: 300,
    });
    console.log(`\nlesson_progress insert: ${error ? 'FAILED: ' + error.message : 'OK'}`);
    
    if (!error) {
      // Clean up
      await supabase.from('lesson_progress').delete().eq('enrollment_id', enrolls[0].id).eq('lesson_id', lessons[0].id);
    }
  }

  // Check quizzes
  const { data: quizzes } = await supabase.from('quizzes').select('id, title').limit(10);
  console.log(`\nquizzes in DB: ${quizzes?.length ?? 0}`);
  quizzes?.forEach(q => console.log(`  ${q.id?.substring(0,8)} ${q.title}`));

  // Check certificates table
  const { count: certCount } = await supabase.from('certificates').select('*', { count: 'exact', head: true });
  console.log(`\ncertificates: ${certCount ?? 0}`);

  // Check lesson_progress table
  const { count: lpCount } = await supabase.from('lesson_progress').select('*', { count: 'exact', head: true });
  console.log(`lesson_progress: ${lpCount ?? 0}`);
}

main().catch(console.error);
