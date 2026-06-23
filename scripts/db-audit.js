import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TABLES_TO_CHECK = [
  'course_achievements',
  'user_achievements',
  'course_accessibility_categories',
  'accessibility_templates',
  'h5p_contents',
  'h5p_responses',
  'user_accessibility_preferences',
  'course_milestones',
  'learner_milestones',
  'certificate_verifications',
  'lesson_templates',
  'lesson_summaries',
  'learner_profiles',
  'password_reset_tokens',
];

const CORE_TABLES = [
  'users', 'user_profiles', 'courses', 'course_chapters', 'course_favorites',
  'enrollments', 'lessons', 'lesson_progress', 'lesson_checkpoints',
  'learner_checkpoints', 'lesson_comments', 'lesson_versions',
  'lesson_interactive_content', 'video_questions', 'quizzes', 'quiz_questions',
  'quiz_options', 'quiz_attempts', 'quiz_answers', 'certificates',
  'certificate_templates', 'instructor_applications', 'contact_messages',
  'referral_codes', 'notifications', 'recommendations',
  'adaptive_interactions', 'media_assets'
];

async function main() {
  console.log('=== SUPABASE DATABASE AUDIT ===\n');

  // 1. Check applied migrations
  console.log('--- Applied Migrations ---');
  const { data: migrations, error: migErr } = await supabase
    .from('schema_migrations')
    .select('version, name, inserted_at')
    .order('version', { ascending: false })
    .limit(50);
  
  if (migErr && migErr.code === 'PGRST116') {
    // Table might be in supabase_migrations schema
    const { data: m2, error: e2 } = await supabase.rpc('get_migrations');
    if (e2) {
      // Try direct query
      const result = await supabase.from('schema_migrations').select('version').limit(1);
      if (result.error) {
        console.log('Cannot query schema_migrations directly. Trying information_schema...');
        const { data: info, error: infoErr } = await supabase.rpc('', {});
        console.log(`  Info schema error: ${infoErr?.message || 'N/A'}`);
      } else {
        console.log(`  schema_migrations exists but query failed: ${migErr.message}`);
      }
    } else {
      console.log('Migrations via RPC:', JSON.stringify(m2, null, 2));
    }
  } else if (migErr) {
    console.log(`  Query error: ${migErr.message}`);
  } else if (migrations) {
    migrations.forEach(m => {
      console.log(`  ${m.version} | ${m.name || ''} | ${m.inserted_at || ''}`);
    });
  }

  // 2. Check dropped/critical tables via information_schema
  console.log('\n--- Tables That May Have Been Dropped (EXIST CHECK) ---');
  for (const table of TABLES_TO_CHECK) {
    const { data, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`  ❌ ${table} — DOES NOT EXIST (dropped by cleanup)`);
    } else if (error) {
      console.log(`  ⚠️  ${table} — RLS/no access: ${error.message}`);
    } else {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      console.log(`  ✅ ${table} — EXISTS (${count ?? 0} rows)`);
    }
  }

  // 3. Core tables — row counts
  console.log('\n--- Core Table Row Counts ---');
  for (const table of CORE_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') {
      console.log(`  ❌ ${table} — DOES NOT EXIST`);
    } else if (error) {
      console.log(`  ⚠️  ${table} — ${error.message}`);
    } else {
      console.log(`  ${table}: ${count ?? 0} rows`);
    }
  }

  // 4. User count by role
  console.log('\n--- Users By Role ---');
  const { data: roles, error: roleErr } = await supabase
    .from('users')
    .select('role, count', { count: 'exact', head: false });
  
  // Alternative: manual query
  for (const role of ['admin', 'educator', 'learner']) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', role);
    console.log(`  ${role}: ${count ?? 0}`);
  }

  // 5. Demo accounts
  console.log('\n--- Demo Accounts (@acess.demo) ---');
  const { data: demoUsers, error: demErr } = await supabase
    .from('users')
    .select('id, email, role, full_name, created_at')
    .like('email', '%@acess.demo');
  
  if (demErr) {
    console.log(`  Error: ${demErr.message}`);
  } else if (demoUsers) {
    console.log(`  Total demo users: ${demoUsers.length}`);
    demoUsers.forEach(u => {
      console.log(`  ${u.role.padEnd(10)} ${(u.full_name || '').padEnd(20)} ${u.email.padEnd(30)} created=${(u.created_at || '').substring(0, 10)}`);
    });
  }

  // 6. Auth users count
  console.log('\n--- Auth Users ---');
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.log(`  Error: ${authErr.message}`);
  } else {
    console.log(`  Total auth users: ${authUsers.users.length}`);
    const demoAuth = authUsers.users.filter(u => u.email?.endsWith('@acess.demo'));
    console.log(`  Demo auth users: ${demoAuth.length}`);
  }

  // 7. Check storage buckets
  console.log('\n--- Storage Buckets ---');
  const { data: buckets, error: buckErr } = await supabase.storage.listBuckets();
  if (buckErr) {
    console.log(`  Error: ${buckErr.message}`);
  } else if (buckets) {
    buckets.forEach(b => console.log(`  ${b.name} (${b.public ? 'public' : 'private'})`));
  }

  // 8. Course status distribution
  console.log('\n--- Course Status Distribution ---');
  for (const status of ['draft', 'pending_review', 'published', 'archived']) {
    const { count } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (count !== null) console.log(`  ${status}: ${count}`);
  }

  // 9. Enrollment status distribution
  console.log('\n--- Enrollment Status Distribution ---');
  for (const status of ['active', 'completed', 'dropped']) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (count !== null) console.log(`  ${status}: ${count}`);
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch(console.error);
