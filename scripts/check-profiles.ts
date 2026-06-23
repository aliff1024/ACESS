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
  // Check user_profiles columns by getting one row (or trying)
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('user_profiles columns:', Object.keys(data[0]).join(', '));
    console.log('Sample row:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('user_profiles exists but is empty');
    console.log('Inserting test row...');
    const { error: insErr } = await supabase.from('user_profiles').insert({});
    if (insErr) {
      console.log('Insert error:', insErr.message);
      // Try with specific columns
      const { data: cols } = await supabase.rpc('get_profile_columns');
      console.log('RPC not available');
    } else {
      const { data: d2 } = await supabase.from('user_profiles').select('*').limit(1);
      if (d2) {
        console.log('Columns:', Object.keys(d2[0]).join(', '));
        await supabase.from('user_profiles').delete().eq('id', d2[0].id);
      }
    }
  }

  // Check users table columns
  const { data: uData } = await supabase.from('users').select('*').limit(1);
  if (uData && uData.length > 0) {
    console.log('users columns:', Object.keys(uData[0]).join(', '));
  } else {
    // Check empty table structure
    const { data: uCols } = await supabase.from('users').select('*').limit(0);
    console.log('Error getting users');
  }
}
main().catch(console.error);
