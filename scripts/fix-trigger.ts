import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'learner')
  );

  insert into public.user_profiles (user_id, accessibility_prefs, notification_prefs, age_group)
  values (
    new.id,
    '{}'::jsonb,
    '{}'::jsonb,
    '18+'
  );

  return new;
end;
$$;
`;

async function main() {
  console.log('Attempting to update trigger function via SQL API...');
  
  // Try via Supabase REST API with raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/sql',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: SQL
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text || '(empty)');

  if (response.ok) {
    console.log('✅ Trigger function updated successfully!');
  } else {
    console.log('❌ Direct SQL failed. Trying rpc approach...');
    
    // Try using supabase client to execute a function that creates the trigger
    // This requires pre-existing rpc function
    const { error: rpcErr } = await supabase.rpc('exec_sql', { sql: SQL });
    if (rpcErr) {
      console.log('RPC also failed:', rpcErr.message);
      console.log('\nPlease run this SQL manually in Supabase Dashboard SQL Editor:');
      console.log('---');
      console.log(SQL);
      console.log('---');
    }
  }
}

main().catch(console.error);
