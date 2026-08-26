const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLearnerCerts() {
  const { data: certs } = await supabase
    .from('certificates')
    .select(`
      id, user_id, course_id, reference_code, course_title, educator_name,
      pdf_url, verification_url, metadata, status,
      courses:course_id(id, title, course_type, system_course, certificate_enabled, certificate_settings)
    `);

  console.log('ALL CERTIFICATES IN DB WITH COURSE DETAILS:');
  console.log(JSON.stringify(certs, null, 2));

  const { data: users } = await supabase.from('users').select('id, full_name, email, role');
  console.log('USERS:');
  console.log(JSON.stringify(users, null, 2));
}

checkLearnerCerts();
