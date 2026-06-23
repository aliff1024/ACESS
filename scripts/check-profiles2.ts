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
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) { console.log('No users found'); return; }
  
  const { data, error } = await supabase.from('user_profiles').insert({ user_id: users[0].id }).select('*');
  if (error) {
    console.log('Insert error:', error.message);
    return;
  }
  if (data) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
    await supabase.from('user_profiles').delete().eq('user_id', users[0].id);
  }
}
main().catch(console.error);
