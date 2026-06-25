import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: users, error } = await supabase.from('users').select('*').limit(1);
  console.log('Users schema:', users, error);

  const { data: profiles, error2 } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('Profiles schema:', profiles, error2);
}

main().catch(console.error);
