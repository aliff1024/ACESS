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
  const { data: courses } = await supabase.from('courses').select('id, title');
  for (const c of courses || []) {
    const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
    console.log(`${String(count ?? 0).padStart(3)} lessons - ${c.title}`);
  }
}
main().catch(console.error);
