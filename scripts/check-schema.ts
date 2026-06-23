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
  // Check lesson_progress by inserting with known-good columns
  const { data: lp } = await supabase.from('lesson_progress').insert({
    user_id: (await supabase.from('users').select('id').limit(1).single()).data?.id,
    lesson_id: (await supabase.from('lessons').select('id').limit(1).single()).data?.id,
  }).select('*');

  if (lp && lp.length > 0) {
    console.log('lesson_progress columns:', Object.keys(lp[0]).join(', '));
    await supabase.from('lesson_progress').delete().eq('id', lp[0].id);
  } else {
    // Try with only user_id and lesson_id
    const test = await supabase.from('lesson_progress').select('*').limit(1);
    console.log('LP query:', test.error?.message || 'no data');
  }

  // Also check enrollments
  const { data: enr } = await supabase.from('enrollments').select('id, user_id, course_id, status').limit(3);
  console.log('\nenrollments sample:', JSON.stringify(enr, null, 2));

  // Check lesson_progress count
  const { count: lpCount } = await supabase.from('lesson_progress').select('*', { count: 'exact', head: true });
  console.log('lp count:', lpCount ?? 0);

  // Check certificate columns
  const { data: cert } = await supabase.from('certificates').insert({
    user_id: (await supabase.from('users').select('id').limit(1).single()).data?.id,
    course_id: (await supabase.from('courses').select('id').limit(1).single()).data?.id,
  }).select('*');
  if (cert && cert.length > 0) {
    console.log('certificate columns:', Object.keys(cert[0]).join(', '));
    await supabase.from('certificates').delete().eq('id', cert[0].id);
  }
}

main().catch(console.error);
