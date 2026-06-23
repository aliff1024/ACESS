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
  const checks: [string, string][] = [
    ['certificate_templates', 'name, is_default'],
    ['accessibility_templates', 'name, target_disability'],
    ['course_accessibility_categories', 'accessibility_category'],
    ['course_achievements', 'name'],
    ['course_milestones', 'title'],
    ['lesson_templates', 'title'],
    ['user_accessibility_preferences', 'id'],
    ['h5p_contents', 'id'],
    ['h5p_responses', 'id'],
    ['password_reset_tokens', 'id'],
    ['learner_profiles', 'id'],
    ['lesson_summaries', 'id'],
    ['certificate_verifications', 'id'],
  ];

  for (const [table, select] of checks) {
    const { data, count, error } = await supabase
      .from(table as any)
      .select(select, { count: 'exact', head: !select.includes(',') ? true : false });
    
    if (error) {
      if (error.code === '42P01') console.log(`${table}: ❌ TABLE MISSING`);
      else console.log(`${table}: ⚠️ ${error.message}`);
    } else {
      const rowCount = Array.isArray(data) ? data.length : (count ?? 0);
      console.log(`${table}: ✅ ${rowCount} rows`);
    }
  }
}
main().catch(console.error);
