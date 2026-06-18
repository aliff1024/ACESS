const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'user_accessibility_preferences',
  'course_achievements',
  'user_achievements',
  'h5p_content_dependencies',
  'h5p_libraries',
  'h5p_library_dependencies',
  'h5p_user_data',
  'learner_profiles',
  'password_reset_tokens',
  'lesson_summaries',
  'lesson_assets',
  'user_profiles',
  'learner_checkpoints',
  'media_assets'
];

async function check() {
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`Error on ${table}:`, error.message);
      } else {
        console.log(`Table: ${table} | Row Count: ${count}`);
      }
    } catch (e) {
      console.log(`Exception on ${table}:`, e.message);
    }
  }
}

check();
