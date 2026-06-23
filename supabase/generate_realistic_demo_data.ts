// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
// @ts-nocheck
import * as dotenv from 'dotenv';
// @ts-nocheck
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEFAULT_PW = 'AcessDemo2026!';

const PERSONAS = [
  { email: 'admin@acess.demo', role: 'admin', name: 'Aliff Admin', type: 'admin' },
  { email: 'educator@acess.demo', role: 'educator', name: 'Dr. Sarah Educator', type: 'active' },
  { email: 'new_ed@acess.demo', role: 'educator', name: 'Prof. Mark Drafts', type: 'new' },
  { email: 'learner@acess.demo', role: 'learner', name: 'Leo Learner', type: 'active' },
  { email: 'high_performer@acess.demo', role: 'learner', name: 'Mia Performer', type: 'high' },
  { email: 'at_risk@acess.demo', role: 'learner', name: 'Noah AtRisk', type: 'risk' },
  { email: 'adhd_alex@acess.demo', role: 'learner', name: 'Alex ADHD', type: 'accessibility' },
  { email: 'dyslexia_sam@acess.demo', role: 'learner', name: 'Sam Dyslexia', type: 'accessibility' },
  { email: 'visual_jordan@acess.demo', role: 'learner', name: 'Jordan Visual', type: 'accessibility' },
  { email: 'student_7@acess.demo', role: 'learner', name: 'Emma Student', type: 'active' },
  { email: 'student_8@acess.demo', role: 'learner', name: 'Oliver Student', type: 'inactive' },
  { email: 'student_9@acess.demo', role: 'learner', name: 'Ava Student', type: 'active' },
  { email: 'student_10@acess.demo', role: 'learner', name: 'Liam Student', type: 'risk' },
  { email: 'student_11@acess.demo', role: 'learner', name: 'Sophia Student', type: 'high' },
  { email: 'student_12@acess.demo', role: 'learner', name: 'Jackson Student', type: 'new' },
];

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function dateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function wipeData() {
  console.log("🧹 Wiping database...");
  
  // Wipe dependent tables
  const tables = ['lesson_interactive_content', 'quiz_options', 'quiz_questions', 'quiz_attempts', 'lesson_progress', 'enrollments', 'notifications', 'certificates', 'user_achievements', 'lessons', 'quizzes', 'course_chapters'];
  for (const t of tables) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Wipe courses created by demo educators
  const { data: edUsers } = await supabase.from('users').select('id').like('email', '%@acess.demo');
  if (edUsers && edUsers.length > 0) {
    const ids = edUsers.map(u => u.id);
    await supabase.from('courses').delete().in('created_by', ids);
  }

  // Wipe public.users
  await supabase.from('users').delete().like('email', '%@acess.demo');

  // Wipe auth.users
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const demoIds = existingUsers.users.filter(u => u.email?.endsWith('@acess.demo')).map(u => u.id);
  for (const id of demoIds) {
    await supabase.auth.admin.deleteUser(id);
  }
}
async function createUsers() {
  console.log("👥 Creating 15 Personas...");
  const map = new Map<string, any>();
  for (const p of PERSONAS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: p.email, password: DEFAULT_PW, email_confirm: true,
      user_metadata: { full_name: p.name, role: p.role }
    });
    if (error) { console.error("Err", p.email, error.message); continue; }
    
    await supabase.from('users').update({ role: p.role, full_name: p.name }).eq('id', data.user.id);
    map.set(p.email, { id: data.user.id, ...p });
    
    // Accessibility presets
    if (p.type === 'accessibility') {
      let prefs = {};
      if (p.email.includes('adhd')) prefs = { chunked_content_enabled: true, distraction_free_enabled: true };
      if (p.email.includes('dyslexia')) prefs = { dyslexia_font_enabled: true, tts_enabled: true };
      if (p.email.includes('visual')) prefs = { high_contrast_enabled: true, reduced_motion_enabled: true, fontSize: 'large' };
      await supabase.from('user_profiles').update({ accessibility_prefs: prefs }).eq('id', data.user.id);
    }
  }
  return map;
}

const COURSES = [
  { slug: 'animal-adventures', title: 'Animal Adventures', diff: 'beginner', cat: 'Science', thumb: 'https://images.unsplash.com/photo-1474511320723-9a56873864b5?q=80&w=800' },
  { slug: 'colors-objects', title: 'Colors and Objects', diff: 'beginner', cat: 'Art', thumb: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800' },
  { slug: 'healthy-habits', title: 'Healthy Habits for Kids', diff: 'beginner', cat: 'Health', thumb: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=800' },
  { slug: 'internet-safety', title: 'Internet Safety for Beginners', diff: 'intermediate', cat: 'Technology', thumb: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=800' },
  { slug: 'digital-literacy', title: 'Digital Literacy 101', diff: 'intermediate', cat: 'Technology', thumb: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800' },
  { slug: 'mastering-a11y', title: 'Mastering Web Accessibility (W3C)', diff: 'advanced', cat: 'Technology', thumb: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800' },
  { slug: 'intro-databases', title: 'Introduction to Databases', diff: 'advanced', cat: 'Technology', thumb: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800' },
];

async function createCourses(educatorId: string, draftId: string) {
  console.log("📚 Creating Courses...");
  const res = [];
  for (let i = 0; i < COURSES.length; i++) {
    const c = COURSES[i];
    const { data } = await supabase.from('courses').insert({
      title: c.title, slug: c.slug, description: `A fantastic course about ${c.title}.`,
      thumbnail_url: c.thumb, category: c.cat, difficulty_level: c.diff, status: 'published', created_by: educatorId
    }).select().single();
    res.push(data);
    
    // Chapters
    const { data: ch1 } = await supabase.from('course_chapters').insert({ course_id: data.id, title: 'Basics', sequence_order: 1 }).select().single();
    
    // Lessons
    const { data: l1 } = await supabase.from('lessons').insert({ course_id: data.id, chapter_id: ch1.id, title: `Intro to ${c.title}`, sequence_order: 1, content_html: `<p>Welcome to ${c.title}.</p>`, status: 'published' }).select().single();
    const { data: l2 } = await supabase.from('lessons').insert({ course_id: data.id, chapter_id: ch1.id, title: `Core Concepts`, sequence_order: 2, content_html: `<p>Here are the core concepts.</p>`, status: 'published' }).select().single();

    // Interactivity for Flagship
    if (c.slug === 'mastering-a11y') {
      await supabase.from('lesson_interactive_content').insert({ lesson_id: l2.id, title: 'ARIA Roles', content_type: 'flashcards', content_data: { cards: [{ id: '1', front: 'role="button"', back: 'Clickable element' }] } });
    }

    // Quiz
    const { data: quiz } = await supabase.from('quizzes').insert({ lesson_id: l2.id, title: `${c.title} Exam`, pass_threshold_pct: 70, time_limit_seconds: 600 }).select().single();
    const { data: q1 } = await supabase.from('quiz_questions').insert({ quiz_id: quiz.id, question_text: 'What is the most important concept?', question_type: 'multiple_choice', sequence_order: 1 }).select().single();
    await supabase.from('quiz_options').insert([
      { question_id: q1.id, option_text: 'Everything', is_correct: true, sequence_order: 1 },
      { question_id: q1.id, option_text: 'Nothing', is_correct: false, sequence_order: 2 }
    ]);

    data.lessons = [l1, l2];
    data.quiz = quiz;
  }

  // Add 1 Draft course for the new educator
  await supabase.from('courses').insert({ title: 'Draft Secrets', slug: 'draft-secrets', status: 'draft', created_by: draftId });

  return res;
}
async function simulateAnalytics(userMap: Map<string, any>, courses: any[]) {
  console.log("📈 Simulating 6 Months of Analytics...");
  
  const learners = PERSONAS.filter(p => p.role === 'learner');
  
  for (const learner of learners) {
    const uId = userMap.get(learner.email).id;
    const numCourses = learner.type === 'new' ? 1 : learner.type === 'high' ? 4 : learner.type === 'risk' ? 2 : 3;
    const myCourses = courses.sort(() => 0.5 - Math.random()).slice(0, numCourses);

    for (let c = 0; c < myCourses.length; c++) {
      const course = myCourses[c];
      const startDaysAgo = learner.type === 'new' ? 5 : learner.type === 'inactive' ? 150 : Math.floor(Math.random() * 120 + 10);
      const enrolledAt = dateDaysAgo(startDaysAgo);
      
      // Enroll
      await supabase.from('enrollments').insert({ user_id: uId, course_id: course.id, enrolled_at: enrolledAt.toISOString(), status: 'active' });
      await supabase.from('notifications').insert({ user_id: uId, type: 'enrollment', title: `Enrolled in ${course.title}`, created_at: enrolledAt.toISOString() });

      // Progress
      const isRisk = learner.type === 'risk' || learner.type === 'inactive';
      const lessonsToComplete = isRisk ? 1 : 2;
      let lastProgressDate = enrolledAt;

      for (let i = 0; i < lessonsToComplete; i++) {
        const l = course.lessons[i];
        lastProgressDate = randomDate(lastProgressDate, new Date());
        if (learner.type === 'inactive' && lastProgressDate > dateDaysAgo(40)) lastProgressDate = dateDaysAgo(40);

        await supabase.from('lesson_progress').insert({ user_id: uId, lesson_id: l.id, is_completed: true, completed_at: lastProgressDate.toISOString(), last_position_seconds: 120 });
      }

      // Quiz
      if (!isRisk) {
        const pass = learner.type === 'high' ? 100 : 80;
        await supabase.from('quiz_attempts').insert({ quiz_id: course.quiz.id, user_id: uId, score_pct: pass, is_passed: true, completed_at: lastProgressDate.toISOString() });
        await supabase.from('enrollments').update({ status: 'completed', completed_at: lastProgressDate.toISOString() }).eq('user_id', uId).eq('course_id', course.id);
        await supabase.from('certificates').insert({ user_id: uId, course_id: course.id, certificate_url: 'https://example.com/cert.pdf', issued_at: lastProgressDate.toISOString() });
        await supabase.from('notifications').insert({ user_id: uId, type: 'quiz_completed', title: `Passed ${course.title}!`, created_at: lastProgressDate.toISOString() });
      } else if (learner.type === 'risk') {
        // Failed attempt
        await supabase.from('quiz_attempts').insert({ quiz_id: course.quiz.id, user_id: uId, score_pct: 40, is_passed: false, completed_at: lastProgressDate.toISOString() });
      }
    }
    
    // Streaks
    if (learner.type === 'high' || learner.type === 'active') {
      await supabase.from('user_achievements').insert({ user_id: uId, achievement_id: 'streak-7', unlocked_at: dateDaysAgo(2).toISOString() });
    }
  }
}

async function main() {
  try {
    console.log("🚀 Starting Massive LMS Demo Data Generation...");
    await wipeData();
    const userMap = await createUsers();
    const courses = await createCourses(userMap.get('educator@acess.demo').id, userMap.get('new_ed@acess.demo').id);
    await simulateAnalytics(userMap, courses);
    console.log("✨ Demo Data Generation Complete! Have a great presentation!");
  } catch (error) {
    console.error("Critical error:", error);
  }
}

main();
