import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PW = 'AcessDemo2026!';

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function wipeData() {
  console.log("🧹 Wiping entire database...");
  
  // Wipe dependent tables first to avoid FK constraints
  const tables = [
    'contact_messages', 'instructor_applications', 'certificates', 'certificate_templates',
    'lesson_comments', 'h5p_responses', 'h5p_contents', 'lesson_interactive_content', 
    'quiz_answers', 'quiz_options', 'quiz_questions', 'quiz_attempts', 'quizzes',
    'lesson_checkpoints', 'learner_checkpoints', 'lesson_progress', 'lesson_versions', 'lesson_templates', 'lessons', 
    'course_chapters', 'course_favorites', 'course_milestones', 'course_achievements', 'enrollments', 
    'course_accessibility_categories', 'courses', 'user_achievements', 'notifications', 
    'recommendations', 'referral_codes', 'user_accessibility_preferences', 'user_profiles'
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error(`Error wiping ${t}:`, error.message);
  }

  // Wipe public.users
  const { error: userError } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (userError) console.error("Error wiping public users:", userError.message);

  // Wipe auth.users (Requires fetching list then deleting)
  console.log("🧹 Wiping Auth users...");
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (!listErr && usersData.users) {
    for (const u of usersData.users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }
}

async function createPersona(email: string, name: string, role: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PW,
    email_confirm: true,
    user_metadata: { full_name: name, role: role }
  });
  if (error) {
    console.error(`Error creating ${email}:`, error.message);
    return null;
  }
  
  // Update explicit role in public users
  await supabase.from('users').update({ role, full_name: name }).eq('id', data.user.id);
  return data.user.id;
}

// -------------------------------------------------------------
// MAIN SEEDING SCRIPT
// -------------------------------------------------------------
async function main() {
  console.log("🚀 Starting Comprehensive Database Seed...");
  await wipeData();

  // 1. CREATE PERSONAS
  console.log("👥 Creating Personas...");
  const adminId = await createPersona('admin_sys@acess.demo', 'Admin Master', 'admin');
  const eduId = await createPersona('educator_sys@acess.demo', 'Dr. System Edu', 'educator');
  const learnerId = await createPersona('learner_sys@acess.demo', 'Learn Every State', 'learner');
  const applicant1Id = await createPersona('applicant1@acess.demo', 'App Pending', 'learner');
  const applicant2Id = await createPersona('applicant2@acess.demo', 'App Approved', 'educator'); // Promoted
  const applicant3Id = await createPersona('applicant3@acess.demo', 'App Rejected', 'learner');
  const applicant4Id = await createPersona('applicant4@acess.demo', 'App Request Info', 'learner');

  if (!adminId || !eduId || !learnerId) {
    console.error("Critical personas failed to create.");
    return;
  }

  // 2. CREATE CONTACT MESSAGES (unread, read, replied)
  console.log("✉️ Creating Contact Messages...");
  await supabase.from('contact_messages').insert([
    { name: 'User Unread', email: 'unread@example.com', message: 'I need help', status: 'unread' },
    { name: 'User Read', email: 'read@example.com', message: 'Read but ignored', status: 'read' },
    { name: 'User Replied', email: 'replied@example.com', message: 'All good now', status: 'replied' }
  ]);

  // 3. CREATE INSTRUCTOR APPLICATIONS (pending, approved, rejected, request_info)
  console.log("📋 Creating Instructor Applications...");
  await supabase.from('instructor_applications').insert([
    { user_id: applicant1Id, qualifications: 'Pending review', status: 'pending' },
    { user_id: applicant2Id, qualifications: 'Approved guy', status: 'approved', review_notes: 'Looks great!' },
    { user_id: applicant3Id, qualifications: 'Rejected guy', status: 'rejected', review_notes: 'Not enough experience.' },
    { user_id: applicant4Id, qualifications: 'Needs info', status: 'request_info', review_notes: 'Please attach CV.' }
  ]);

  // 4. CREATE COURSES (draft, pending_review, published, archived)
  console.log("📚 Creating Courses with all states...");
  
  // Insert courses sequentially to get their IDs
  const cPublished = await supabase.from('courses').insert({
    title: 'Published Complete Course', slug: 'pub-course', description: 'Available for all', 
    status: 'published', created_by: eduId
  }).select('id').single();
  
  const cDraft = await supabase.from('courses').insert({
    title: 'Draft Ongoing Course', slug: 'draft-course', description: 'Not ready yet', 
    status: 'draft', created_by: eduId
  }).select('id').single();
  
  const cPending = await supabase.from('courses').insert({
    title: 'Pending Review Course', slug: 'pending-course', description: 'Waiting for Admin', 
    status: 'pending_review', created_by: eduId
  }).select('id').single();
  
  const cArchived = await supabase.from('courses').insert({
    title: 'Archived Old Course', slug: 'archived-course', description: 'No longer active', 
    status: 'archived', created_by: eduId
  }).select('id').single();

  const coursePubId = cPublished.data!.id;

  // 5. CREATE CHAPTERS AND LESSONS
  console.log("📖 Creating Chapters and Lessons...");
  const { data: chap } = await supabase.from('course_chapters').insert({ course_id: coursePubId, title: 'Chapter 1', sequence_order: 1 }).select('id').single();
  
  // lessons status: draft, published
  // visibility_status: visible, hidden, scheduled
  await supabase.from('lessons').insert([
    { course_id: coursePubId, chapter_id: chap!.id, title: 'Lesson 1 (Pub/Vis)', sequence_order: 1, status: 'published', visibility_status: 'visible' },
    { course_id: coursePubId, chapter_id: chap!.id, title: 'Lesson 2 (Pub/Hid)', sequence_order: 2, status: 'published', visibility_status: 'hidden' },
    { course_id: coursePubId, chapter_id: chap!.id, title: 'Lesson 3 (Pub/Sch)', sequence_order: 3, status: 'published', visibility_status: 'scheduled' },
    { course_id: coursePubId, chapter_id: chap!.id, title: 'Lesson 4 (Draft)', sequence_order: 4, status: 'draft', visibility_status: 'hidden' }
  ]);

  // 6. CREATE ENROLLMENTS (active, completed, dropped)
  console.log("🎓 Creating Enrollments...");
  const l1 = await createPersona('enrolled_active@acess.demo', 'Active Enrollee', 'learner');
  const l2 = await createPersona('enrolled_completed@acess.demo', 'Completed Enrollee', 'learner');
  const l3 = await createPersona('enrolled_dropped@acess.demo', 'Dropped Enrollee', 'learner');

  await supabase.from('enrollments').insert([
    { user_id: l1, course_id: coursePubId, status: 'active', enrolled_at: new Date().toISOString() },
    { user_id: l2, course_id: coursePubId, status: 'completed', enrolled_at: new Date().toISOString(), completed_at: new Date().toISOString() },
    { user_id: l3, course_id: coursePubId, status: 'dropped', enrolled_at: new Date().toISOString() }
  ]);

  // 7. CREATE CERTIFICATES (issued, revoked)
  console.log("📜 Creating Certificates...");
  await supabase.from('certificates').insert([
    { user_id: l2, course_id: coursePubId, certificate_url: 'https://example.com/cert1.pdf', status: 'issued', issued_at: new Date().toISOString() },
    { user_id: l3, course_id: coursePubId, certificate_url: 'https://example.com/cert2.pdf', status: 'revoked', issued_at: new Date().toISOString(), revoked_at: new Date().toISOString() }
  ]);

  console.log("✨ Comprehensive Data Generation Complete!");
}

main().catch(console.error);
