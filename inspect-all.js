const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  const userId = 'ba551b57-753a-4cb7-91e1-0c1aa3e40531';

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id, course_id, status, completed_at, enrolled_at,
      courses(id, title, course_type, system_course, certificate_enabled, certificate_settings, created_by)
    `)
    .eq('user_id', userId);

  console.log('--- LEO ALL ENROLLMENTS WITH COURSES ---');
  console.log(JSON.stringify(enrollments, null, 2));

  const { data: allCerts } = await supabase
    .from('certificates')
    .select('*');

  console.log('--- ALL CERTIFICATES IN DB ---');
  console.log(JSON.stringify(allCerts, null, 2));
}

inspectAll();
