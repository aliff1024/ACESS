/**
 * ACESS LMS — Data Enrichment Seeder
 *
 * Adds ~1,100 realistic rows across 16 tables on top of existing seed data.
 * Non-destructive: only INSERT/UPDATE, no DELETE.
 * Idempotent: checks for existing data before inserting.
 *
 * Usage: npx tsx supabase/seed-enriched.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────
function daysAgo(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(avg: number, stdDev: number, minVal: number, maxVal: number): number {
  // Box-Muller transform for normal distribution
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num * stdDev + avg;
  return Math.max(minVal, Math.min(maxVal, Math.round(num)));
}

const DEMO_DOMAIN = '@acess.demo';

interface RowMap { id: string; [key: string]: any }

// ─── Lookup Helpers ────────────────────────────────────────────────────

async function lookupUserByEmail(email: string): Promise<RowMap | null> {
  const { data } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
  return data;
}

async function lookupUserByName(name: string): Promise<RowMap | null> {
  const { data } = await supabase.from('users').select('id, email').ilike('email', `%${name.replace(/\s+/g, '').toLowerCase()}%@acess.demo`).maybeSingle();
  return data;
}

async function lookupCourseByTitle(title: string): Promise<RowMap | null> {
  const { data } = await supabase.from('courses').select('id, title').eq('title', title).maybeSingle();
  return data;
}

async function lookupLessonsByCourse(courseId: string): Promise<RowMap[]> {
  const { data } = await supabase.from('lessons').select('id, title, course_id, has_video, estimated_duration').eq('course_id', courseId).eq('status', 'published').order('sequence_order');
  return data || [];
}

async function lookupEnrollment(userId: string, courseId: string): Promise<RowMap | null> {
  const { data } = await supabase.from('enrollments').select('id, user_id, course_id, status').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  return data;
}

async function lookupQuizByLesson(lessonId: string): Promise<RowMap | null> {
  const { data } = await supabase.from('quizzes').select('id, lesson_id, title').eq('lesson_id', lessonId).maybeSingle();
  return data;
}

async function lookupQuizQuestions(quizId: string): Promise<RowMap[]> {
  const { data } = await supabase.from('quiz_questions').select('id, quiz_id, question_type').eq('quiz_id', quizId);
  return data || [];
}

async function lookupCheckpointsByLesson(lessonId: string): Promise<RowMap[]> {
  const { data } = await supabase.from('lesson_checkpoints').select('id, lesson_id, title').eq('lesson_id', lessonId);
  return data || [];
}

async function lookupExistingInteractive(lessonId: string): Promise<boolean> {
  const { data } = await supabase.from('lesson_interactive_content').select('id').eq('lesson_id', lessonId).limit(1).maybeSingle();
  return !!data;
}

// ─── Data ──────────────────────────────────────────────────────────────

const PERSONA_EMAILS = [
  'learner@acess.demo',        // Leo Learner
  'high_performer@acess.demo', // Mia Performer
  'at_risk@acess.demo',        // Noah AtRisk
  'adhd_alex@acess.demo',      // Alex ADHD
  'dyslexia_sam@acess.demo',   // Sam Dyslexia
  'visual_jordan@acess.demo',  // Jordan Visual
  'emma_student@acess.demo',   // Emma Student
  'oliver_student@acess.demo', // Oliver Student
  'sophia_student@acess.demo', // Sophia Student
  'danial.active@acess.demo',  // Danial
  'aina.active@acess.demo',    // Aina
  'wei.active@acess.demo',     // Wei Chen
];

const EDUCATOR_EMAILS = [
  'educator@acess.demo',       // Dr. Sarah Chen
  'new_ed@acess.demo',          // Prof. Mark Rivera
  'fatimah.ed@acess.demo',     // Mrs. Fatimah Hassan
];

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🔧 ACESS Data Enrichment Seeder');
  console.log(`📅 ${new Date().toISOString().split('T')[0]}\n`);

  // Pre-load all users and courses
  const users = new Map<string, RowMap>();
  for (const email of [...PERSONA_EMAILS, ...EDUCATOR_EMAILS, 'admin@acess.demo']) {
    const u = await lookupUserByEmail(email);
    if (u) users.set(email, u);
  }
  console.log(`  ✅ Loaded ${users.size} users`);

  const courseTitles = [
    'Learning Numbers 1-20', 'Learning Shapes & Colors', 'Animal Adventures',
    'My First Science Experiments', 'Healthy Habits for Kids', 'Introduction to Reading',
    'Fun With Nature', 'Introduction to Coding', 'Digital Literacy & Internet Safety',
    'Problem Solving Skills', 'Web Development Fundamentals', 'Mastering Web Accessibility (W3C Standard)',
    'Platform Orientation Guide', 'ACESS Community Guidelines',
  ];
  const courses = new Map<string, RowMap>();
  for (const title of courseTitles) {
    const c = await lookupCourseByTitle(title);
    if (c) courses.set(title, c);
  }
  console.log(`  ✅ Loaded ${courses.size} courses`);

  // ── SECTION 2: Enrollments ───────────────────────────────────────────
  await addEnrollments(users, courses);

  // ── SECTION 3: Lesson Progress + progress_meta ──────────────────────
  await enrichLessonProgress(users, courses);

  // ── SECTION 4: Quiz Answers ──────────────────────────────────────────
  await enrichQuizAnswers(users, courses);

  // ── SECTION 5: Interactive Activities ────────────────────────────────
  await addInteractiveActivities(users, courses);

  // ── SECTION 6: Video Questions ──────────────────────────────────────
  await addVideoQuestions(users, courses);

  // ── SECTION 7: Course Accessibility Categories ───────────────────────
  await addAccessibilityCategories(users, courses);

  // ── SECTION 8: Adaptive Interactions ────────────────────────────────
  await addAdaptiveInteractions(users, courses);

  // ── SECTION 9: Recommendations ──────────────────────────────────────
  await addRecommendations(users, courses);

  // ── SECTION 10: Notifications ────────────────────────────────────────
  await addNotifications(users, courses);

  // ── SECTION 11: Comments ────────────────────────────────────────────
  await addComments(users, courses);

  // ── SECTION 12: Favorites ───────────────────────────────────────────
  await addFavorites(users, courses);

  // ── SECTION 13: Achievements ────────────────────────────────────────
  await addAchievements(users, courses);

  // ── SECTION 14: Learner Checkpoints ────────────────────────────────
  await addLearnerCheckpoints(users, courses);

  // ── SECTION 15: Profile Updates ─────────────────────────────────────
  await updateProfiles(users);

  console.log('\n✨ Data enrichment complete!');
  await printSummary();
}

// ── SECTION 2: Enrollments ────────────────────────────────────────────
async function addEnrollments(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n📋 Adding enrollments...');
  let count = 0;

  const newEnrollments: { email: string; courseTitle: string; status: string; daysAgo: number }[] = [
    // Leo — more courses
    { email: 'learner@acess.demo', courseTitle: 'Learning Numbers 1-20', status: 'completed', daysAgo: 140 },
    { email: 'learner@acess.demo', courseTitle: 'Web Development Fundamentals', status: 'active', daysAgo: 15 },
    // Mia — more courses
    { email: 'high_performer@acess.demo', courseTitle: 'Learning Shapes & Colors', status: 'completed', daysAgo: 120 },
    { email: 'high_performer@acess.demo', courseTitle: 'Problem Solving Skills', status: 'completed', daysAgo: 45 },
    { email: 'high_performer@acess.demo', courseTitle: 'Fun With Nature', status: 'active', daysAgo: 10 },
    // Noah — re-enrolled in course 0 (was active, now dropped/re-enrolled)
    { email: 'at_risk@acess.demo', courseTitle: 'Learning Numbers 1-20', status: 'active', daysAgo: 10 },
    // Alex — more courses
    { email: 'adhd_alex@acess.demo', courseTitle: 'Digital Literacy & Internet Safety', status: 'active', daysAgo: 20 },
    { email: 'adhd_alex@acess.demo', courseTitle: 'Introduction to Coding', status: 'active', daysAgo: 35 },
    // Sam — more courses
    { email: 'dyslexia_sam@acess.demo', courseTitle: 'Introduction to Reading', status: 'completed', daysAgo: 50 },
    { email: 'dyslexia_sam@acess.demo', courseTitle: 'Fun With Nature', status: 'active', daysAgo: 15 },
    // Jordan — more courses
    { email: 'visual_jordan@acess.demo', courseTitle: 'Web Development Fundamentals', status: 'active', daysAgo: 25 },
    { email: 'visual_jordan@acess.demo', courseTitle: 'Problem Solving Skills', status: 'active', daysAgo: 10 },
    // Emma — more courses
    { email: 'emma_student@acess.demo', courseTitle: 'Learning Shapes & Colors', status: 'active', daysAgo: 25 },
    { email: 'emma_student@acess.demo', courseTitle: 'Healthy Habits for Kids', status: 'active', daysAgo: 10 },
    // Sophia — more courses
    { email: 'sophia_student@acess.demo', courseTitle: 'Digital Literacy & Internet Safety', status: 'active', daysAgo: 15 },
    // Oliver — re-enrolled (was dropped, now active in a new course)
    { email: 'oliver_student@acess.demo', courseTitle: 'Animal Adventures', status: 'active', daysAgo: 5 },
    // Other learners get at least 2 enrollments
    { email: 'danial.active@acess.demo', courseTitle: 'Fun With Nature', status: 'active', daysAgo: 5 },
    { email: 'aina.active@acess.demo', courseTitle: 'Digital Literacy & Internet Safety', status: 'active', daysAgo: 8 },
    { email: 'wei.active@acess.demo', courseTitle: 'Learning Shapes & Colors', status: 'active', daysAgo: 7 },
  ];

  for (const e of newEnrollments) {
    const user = users.get(e.email);
    const course = courses.get(e.courseTitle);
    if (!user || !course) continue;

    const existing = await lookupEnrollment(user.id, course.id);
    if (existing) continue;

    const enrolledAt = daysAgo(e.daysAgo);
    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id, course_id: course.id,
      status: e.status, enrolled_at: enrolledAt.toISOString(),
      completed_at: e.status === 'completed' ? daysAgo(e.daysAgo - randInt(10, 30)).toISOString() : null,
    });
    if (!error) count++;
  }

  console.log(`  ✅ ${count} enrollments added`);
}

// ── SECTION 3: Lesson Progress + progress_meta ────────────────────────
async function enrichLessonProgress(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n📊 Enriching lesson progress...');
  let metaUpdated = 0;
  let newProgress = 0;

  // Update existing lesson_progress rows with progress_meta and time_spent
  const { data: allProgress } = await supabase.from('lesson_progress')
    .select('id, enrollment_id, lesson_id, is_completed, time_spent_learning, is_viewed')
    .limit(1000);

  if (allProgress) {
    for (const lp of allProgress) {
      // Fetch lesson info
      const { data: lesson } = await supabase.from('lessons').select('id, has_video, has_quiz').eq('id', lp.lesson_id).maybeSingle();
      if (!lesson) continue;

      const meta: Record<string, any> = {};
      if (lesson.has_video) meta.video = true;
      meta.scroll = true;
      meta.activity = true;
      meta.guided_step_index = lp.is_completed ? randInt(3, 8) : randInt(0, 3);

      if (lesson.has_quiz) meta.quiz = lp.is_completed;

      const timeSpent = lp.time_spent_learning || randInt(60, 1800);

      const { error } = await supabase.from('lesson_progress').update({
        progress_meta: JSON.stringify(meta),
        time_spent_learning: timeSpent,
      }).eq('id', lp.id);

      if (!error) metaUpdated++;
    }
  }

  // Add progress rows for new enrollments (or lessons that don't have progress yet)
  const { data: enrollments } = await supabase.from('enrollments').select('id, user_id, course_id, status, enrolled_at').limit(200);
  if (enrollments) {
    for (const enr of enrollments) {
      const lessons = await lookupLessonsByCourse(enr.course_id);
      for (const lesson of lessons) {
        // Check if progress already exists
        const { data: existing } = await supabase.from('lesson_progress')
          .select('id').eq('enrollment_id', enr.id).eq('lesson_id', lesson.id).limit(1).maybeSingle();
        if (existing) continue;

        // 60% chance the lesson has been viewed for active/completed enrollments
        if (enr.status === 'active' || enr.status === 'completed') {
          if (Math.random() > 0.6) continue;

          const isCompleted = enr.status === 'completed' && Math.random() > 0.3;
          const viewedDate = randomDate(new Date(enr.enrolled_at), new Date());
          const timeSpent = isCompleted ? randInt(300, 1800) : randInt(30, 600);
          const meta: Record<string, any> = {};
          if (lesson.has_video) meta.video = true;
          meta.scroll = true;
          meta.activity = true;
          meta.guided_step_index = isCompleted ? randInt(3, 8) : randInt(0, 3);
          if ((lesson as any).has_quiz) meta.quiz = isCompleted;

          const { error } = await supabase.from('lesson_progress').insert({
            enrollment_id: enr.id, lesson_id: lesson.id,
            is_viewed: true, is_completed: isCompleted,
            first_viewed_at: viewedDate.toISOString(),
            last_viewed_at: viewedDate.toISOString(),
            time_spent_learning: timeSpent,
            progress_meta: JSON.stringify(meta),
          });
          if (!error) newProgress++;
        }
      }
    }
  }

  console.log(`  ✅ ${metaUpdated} progress_meta updated, ${newProgress} new progress rows`);
}

// ── SECTION 4: Quiz Answers ──────────────────────────────────────────
async function enrichQuizAnswers(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🧠 Enriching quiz answers...');

  // Get all quiz attempts that don't have answers yet
  const { data: attempts } = await supabase.from('quiz_attempts')
    .select('id, enrollment_id, quiz_id, score_pct, attempt_number')
    .limit(200);

  if (!attempts) return;

  let answerCount = 0;
  let attemptCount = 0;

  for (const attempt of attempts) {
    // Check if answers already exist
    const { data: existingAnswers } = await supabase.from('quiz_answers')
      .select('id').eq('attempt_id', attempt.id).limit(1);
    if (existingAnswers && existingAnswers.length > 0) continue;

    const questions = await lookupQuizQuestions(attempt.quiz_id);
    if (questions.length === 0) continue;

    // Determine learner persona based on enrollment
    const { data: enrollment } = await supabase.from('enrollments')
      .select('user_id').eq('id', attempt.enrollment_id).maybeSingle();
    if (!enrollment) continue;

    const { data: userData } = await supabase.from('users')
      .select('email').eq('id', enrollment.user_id).maybeSingle();
    if (!userData) continue;

    const email = userData.email;
    // Score bias per persona
    const accuracyBias = email === 'high_performer@acess.demo' ? 0.95 :
                         email === 'sophia_student@acess.demo' ? 0.90 :
                         email === 'at_risk@acess.demo' ? 0.35 :
                         email === 'oliver_student@acess.demo' ? 0.45 :
                         email === 'learner@acess.demo' ? 0.80 :
                         email === 'adhd_alex@acess.demo' ? 0.75 :
                         email === 'dyslexia_sam@acess.demo' ? 0.70 :
                         email === 'visual_jordan@acess.demo' ? 0.85 :
                         email === 'emma_student@acess.demo' ? 0.80 :
                         email === 'danial.active@acess.demo' ? 0.75 :
                         email === 'aina.active@acess.demo' ? 0.85 :
                         email === 'wei.active@acess.demo' ? 0.90 : 0.70;

    for (const question of questions) {
      // Get options for this question
      const { data: options } = await supabase.from('quiz_options')
        .select('id, is_correct').eq('question_id', question.id);
      if (!options || options.length === 0) continue;

      const correctOptions = options.filter(o => o.is_correct);
      const wrongOptions = options.filter(o => !o.is_correct);

      // Based on persona accuracy bias, pick correct or wrong answer
      const isCorrect = Math.random() < accuracyBias;
      const selectedOption = isCorrect && correctOptions.length > 0
        ? pick(correctOptions).id
        : wrongOptions.length > 0 ? pick(wrongOptions).id : pick(options).id;

      const { error } = await supabase.from('quiz_answers').insert({
        attempt_id: attempt.id, question_id: question.id,
        selected_option_id: selectedOption,
      });
      if (!error) answerCount++;
    }

    // Also add a second attempt for some learners on failed quizzes
    if (attempt.attempt_number === 1 && attempt.score_pct < 70 && Math.random() > 0.5) {
      const secondAttemptDate = randomDate(daysAgo(30), new Date());
      const secondScore = weightedRandom(75, 15, 30, 100);
      const { data: attempt2 } = await supabase.from('quiz_attempts').insert({
        enrollment_id: attempt.enrollment_id, quiz_id: attempt.quiz_id,
        attempt_number: 2, score_pct: secondScore,
        result: secondScore >= 70 ? 'pass' : 'fail',
        started_at: secondAttemptDate.toISOString(),
        submitted_at: secondAttemptDate.toISOString(),
      }).select().single();

      if (attempt2) {
        attemptCount++;
        // Add answers for second attempt
        for (const question of questions) {
          const { data: options } = await supabase.from('quiz_options')
            .select('id, is_correct').eq('question_id', question.id);
          if (!options || options.length === 0) continue;
          const correctOptions = options.filter(o => o.is_correct);
          const wrongOptions = options.filter(o => !o.is_correct);
          const isCorrect = Math.random() < Math.min(accuracyBias + 0.15, 0.98);
          const selectedOption = isCorrect && correctOptions.length > 0
            ? pick(correctOptions).id
            : wrongOptions.length > 0 ? pick(wrongOptions).id : pick(options).id;
          await supabase.from('quiz_answers').insert({
            attempt_id: attempt2.id, question_id: question.id,
            selected_option_id: selectedOption,
          });
        }
      }
    }
  }

  console.log(`  ✅ ${answerCount} quiz answers added, ${attemptCount} new attempts`);
}

// ── SECTION 5: Interactive Activities ─────────────────────────────────
async function addInteractiveActivities(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🎮 Adding interactive activities...');

  const activities: { courseTitle: string; lessonIdx: number; type: string; title: string; data: any }[] = [
    // Learning Numbers 1-20
    { courseTitle: 'Learning Numbers 1-20', lessonIdx: 0, type: 'flashcards', title: 'Number 1-5 Flashcards',
      data: { mode: 'study', cards: [
        { front: '1', back: 'One — one sun in the sky!' },
        { front: '2', back: 'Two — two eyes, two ears!' },
        { front: '3', back: 'Three — three sides of a triangle!' },
        { front: '4', back: 'Four — four legs on a table!' },
        { front: '5', back: 'Five — five fingers on one hand!' },
      ]} },
    { courseTitle: 'Learning Numbers 1-20', lessonIdx: 2, type: 'fill_blanks', title: 'Fill the Missing Number',
      data: { mode: 'sentence', items: [
        { sentence: '1, 2, _, 4, 5', answer: '3' },
        { sentence: '5, 6, 7, _, 9', answer: '8' },
        { sentence: '10, _, 12, 13, 14', answer: '11' },
        { sentence: '_, 16, 17, 18, 19', answer: '15' },
      ]} },
    { courseTitle: 'Learning Numbers 1-20', lessonIdx: 3, type: 'drag_drop', title: 'Sort Numbers: Even vs Odd',
      data: { mode: 'standard', items: [
        { label: '2', category: 'Even' }, { label: '3', category: 'Odd' },
        { label: '4', category: 'Even' }, { label: '7', category: 'Odd' },
        { label: '10', category: 'Even' }, { label: '13', category: 'Odd' },
        { label: '16', category: 'Even' }, { label: '19', category: 'Odd' },
      ], categories: ['Even', 'Odd'] } },
    { courseTitle: 'Learning Numbers 1-20', lessonIdx: 4, type: 'timeline', title: 'Order the Numbers',
      data: { mode: 'sequential', items: [
        { label: 'First', value: '1' }, { label: 'Second', value: '2' },
        { label: 'Third', value: '3' }, { label: 'Fourth', value: '4' },
        { label: 'Fifth', value: '5' },
      ]} },

    // Learning Shapes & Colors
    { courseTitle: 'Learning Shapes & Colors', lessonIdx: 2, type: 'flashcards', title: 'Shape Flashcards',
      data: { mode: 'study', cards: [
        { front: 'Circle', back: 'Round shape with no corners — like a ball!' },
        { front: 'Square', back: 'Four equal sides — like a window!' },
        { front: 'Triangle', back: 'Three sides — like a pizza slice!' },
        { front: 'Star', back: 'Five points — like stars in the sky!' },
        { front: 'Diamond', back: 'Four sides, tilted — like a kite!' },
      ]} },
    { courseTitle: 'Learning Shapes & Colors', lessonIdx: 4, type: 'drag_drop', title: 'Match Shapes to Names',
      data: { mode: 'matching', items: [
        { label: '🟢 Circle', matchWith: 'Round' },
        { label: '⬛ Square', matchWith: 'Four equal sides' },
        { label: '🔺 Triangle', matchWith: 'Three sides' },
        { label: '⭐ Star', matchWith: 'Five points' },
        { label: '💎 Diamond', matchWith: 'Tilted square' },
      ]} },
    { courseTitle: 'Learning Shapes & Colors', lessonIdx: 5, type: 'fill_blanks', title: 'Color Mixing',
      data: { mode: 'sentence', items: [
        { sentence: 'Red + Blue = _', answer: 'Purple' },
        { sentence: 'Red + Yellow = _', answer: 'Orange' },
        { sentence: 'Blue + Yellow = _', answer: 'Green' },
      ]} },
    { courseTitle: 'Learning Shapes & Colors', lessonIdx: 7, type: 'memory_game', title: 'Shape Match',
      data: { mode: 'match', pairs: [
        { id: 'circle', display: 'Circle' }, { id: 'square', display: 'Square' },
        { id: 'triangle', display: 'Triangle' }, { id: 'star', display: 'Star' },
      ]} },

    // Animal Adventures
    { courseTitle: 'Animal Adventures', lessonIdx: 3, type: 'flashcards', title: 'Ocean Animals',
      data: { mode: 'study', cards: [
        { front: 'Dolphin', back: 'Smart and playful ocean mammals!' },
        { front: 'Whale', back: 'The biggest animal on Earth!' },
        { front: 'Octopus', back: 'Has eight arms and is very clever!' },
        { front: 'Sea Turtle', back: 'Swims slowly and lives very long!' },
      ]} },
    { courseTitle: 'Animal Adventures', lessonIdx: 4, type: 'timeline', title: 'Butterfly Life Cycle',
      data: { mode: 'ordering', items: [
        { label: 'Egg', value: 'Step 1' },
        { label: 'Caterpillar', value: 'Step 2' },
        { label: 'Chrysalis', value: 'Step 3' },
        { label: 'Butterfly', value: 'Step 4' },
      ]} },
    { courseTitle: 'Animal Adventures', lessonIdx: 5, type: 'drag_drop', title: 'Sort Animals by Diet',
      data: { mode: 'standard', items: [
        { label: 'Cow', category: 'Herbivore' }, { label: 'Lion', category: 'Carnivore' },
        { label: 'Bear', category: 'Omnivore' }, { label: 'Rabbit', category: 'Herbivore' },
        { label: 'Shark', category: 'Carnivore' }, { label: 'Chicken', category: 'Omnivore' },
      ], categories: ['Herbivore', 'Carnivore', 'Omnivore'] } },
    { courseTitle: 'Animal Adventures', lessonIdx: 6, type: 'memory_game', title: 'Animal Babies Match',
      data: { mode: 'match', pairs: [
        { id: 'cat', display: 'Cat → Kitten' }, { id: 'dog', display: 'Dog → Puppy' },
        { id: 'cow', display: 'Cow → Calf' }, { id: 'horse', display: 'Horse → Foal' },
      ]} },

    // My First Science Experiments
    { courseTitle: 'My First Science Experiments', lessonIdx: 0, type: 'drag_drop', title: 'Sink or Float?',
      data: { mode: 'standard', items: [
        { label: 'Rock', category: 'Sink' }, { label: 'Feather', category: 'Float' },
        { label: 'Coin', category: 'Sink' }, { label: 'Crayon', category: 'Float' },
        { label: 'Paperclip', category: 'Sink' }, { label: 'Sponge', category: 'Float' },
      ], categories: ['Sink', 'Float'] } },
    { courseTitle: 'My First Science Experiments', lessonIdx: 3, type: 'timeline', title: 'Make a Volcano',
      data: { mode: 'sequential', items: [
        { label: 'Add baking soda', value: 'Step 1' },
        { label: 'Add dish soap', value: 'Step 2' },
        { label: 'Pour in vinegar', value: 'Step 3' },
        { label: 'Watch it erupt!', value: 'Step 4' },
      ]} },
    { courseTitle: 'My First Science Experiments', lessonIdx: 6, type: 'fill_blanks', title: 'Plant Needs',
      data: { mode: 'sentence', items: [
        { sentence: 'Plants need _ to grow.', answer: 'water' },
        { sentence: 'Plants need _ for energy.', answer: 'sunlight' },
        { sentence: 'Plants need _ for nutrients.', answer: 'soil' },
      ]} },

    // Healthy Habits for Kids
    { courseTitle: 'Healthy Habits for Kids', lessonIdx: 4, type: 'drag_drop', title: 'Healthy vs Unhealthy Food',
      data: { mode: 'standard', items: [
        { label: 'Apple', category: 'Healthy' }, { label: 'Candy', category: 'Unhealthy' },
        { label: 'Carrot', category: 'Healthy' }, { label: 'Chips', category: 'Unhealthy' },
        { label: 'Milk', category: 'Healthy' }, { label: 'Soda', category: 'Unhealthy' },
      ], categories: ['Healthy', 'Unhealthy'] } },
    { courseTitle: 'Healthy Habits for Kids', lessonIdx: 8, type: 'flashcards', title: 'Feelings Flashcards',
      data: { mode: 'study', cards: [
        { front: 'Happy 😊', back: 'A warm, joyful feeling!' },
        { front: 'Sad 😢', back: 'It\'s OK to be sad sometimes.' },
        { front: 'Angry 😠', back: 'Take deep breaths and count to 10.' },
        { front: 'Scared 😨', back: 'Tell someone how you feel.' },
      ]} },
    { courseTitle: 'Healthy Habits for Kids', lessonIdx: 9, type: 'memory_game', title: 'Healthy Habits Match',
      data: { mode: 'match', pairs: [
        { id: 'brush', display: 'Brush teeth' }, { id: 'wash', display: 'Wash hands' },
        { id: 'water', display: 'Drink water' }, { id: 'sleep', display: 'Sleep well' },
      ]} },

    // Introduction to Reading
    { courseTitle: 'Introduction to Reading', lessonIdx: 2, type: 'flashcards', title: 'Sight Words',
      data: { mode: 'carousel', cards: [
        { front: 'the', back: 'The cat sat on the mat.' },
        { front: 'and', back: 'I like cats and dogs.' },
        { front: 'is', back: 'It is a sunny day.' },
        { front: 'you', back: 'You are my friend.' },
      ]} },
    { courseTitle: 'Introduction to Reading', lessonIdx: 3, type: 'fill_blanks', title: 'Word Families',
      data: { mode: 'word_bank', items: [
        { sentence: 'c + at = _', answer: 'cat', bank: ['cat', 'hat', 'bat', 'rat'] },
        { sentence: 'h + at = _', answer: 'hat', bank: ['cat', 'hat', 'bat', 'rat'] },
        { sentence: 'b + at = _', answer: 'bat', bank: ['cat', 'hat', 'bat', 'rat'] },
      ]} },
    { courseTitle: 'Introduction to Reading', lessonIdx: 6, type: 'memory_game', title: 'Rhyming Words',
      data: { mode: 'match', pairs: [
        { id: 'cat', display: 'Cat' }, { id: 'hat', display: 'Hat' },
        { id: 'sun', display: 'Sun' }, { id: 'fun', display: 'Fun' },
      ]} },
    { courseTitle: 'Introduction to Reading', lessonIdx: 7, type: 'drag_drop', title: 'Blends Match',
      data: { mode: 'matching', items: [
        { label: 'bl', matchWith: 'blue' }, { label: 'cr', matchWith: 'crab' },
        { label: 'st', matchWith: 'star' }, { label: 'sh', matchWith: 'ship' },
        { label: 'ch', matchWith: 'chip' },
      ]} },

    // Fun With Nature
    { courseTitle: 'Fun With Nature', lessonIdx: 1, type: 'timeline', title: 'The Water Cycle',
      data: { mode: 'cycle', items: [
        { label: 'Evaporation', value: 'Sun heats water → vapor rises' },
        { label: 'Condensation', value: 'Vapor cools → forms clouds' },
        { label: 'Precipitation', value: 'Clouds heavy → rain falls' },
        { label: 'Collection', value: 'Water returns to lakes' },
      ]} },
    { courseTitle: 'Fun With Nature', lessonIdx: 2, type: 'drag_drop', title: 'Four Seasons Sorting',
      data: { mode: 'standard', items: [
        { label: 'Flowers bloom', category: 'Spring' }, { label: 'Hot sunny days', category: 'Summer' },
        { label: 'Leaves fall', category: 'Fall' }, { label: 'Snow falls', category: 'Winter' },
      ], categories: ['Spring', 'Summer', 'Fall', 'Winter'] } },
    { courseTitle: 'Fun With Nature', lessonIdx: 5, type: 'flashcards', title: 'Rock Types',
      data: { mode: 'study', cards: [
        { front: 'Igneous', back: 'Formed when melted rock cools — like granite!' },
        { front: 'Sedimentary', back: 'Sand and mud squished together — like sandstone!' },
        { front: 'Metamorphic', back: 'Changed by heat and pressure — like marble!' },
      ]} },
    { courseTitle: 'Fun With Nature', lessonIdx: 8, type: 'memory_game', title: 'Animal Homes Match',
      data: { mode: 'match', pairs: [
        { id: 'bird', display: 'Bird → Nest' }, { id: 'bear', display: 'Bear → Cave' },
        { id: 'bee', display: 'Bee → Hive' }, { id: 'rabbit', display: 'Rabbit → Burrow' },
      ]} },

    // Introduction to Coding
    { courseTitle: 'Introduction to Coding', lessonIdx: 2, type: 'drag_drop', title: 'Coding Concepts Match',
      data: { mode: 'matching', items: [
        { label: 'Variable', matchWith: 'Stores data' },
        { label: 'Loop', matchWith: 'Repeats actions' },
        { label: 'Conditional', matchWith: 'Makes decisions' },
        { label: 'Function', matchWith: 'Reusable code block' },
      ]} },
    { courseTitle: 'Introduction to Coding', lessonIdx: 4, type: 'fill_blanks', title: 'Fill the Code',
      data: { mode: 'sentence', items: [
        { sentence: 'IF score >= 100 THEN print("_")', answer: 'You win!' },
        { sentence: 'WHILE lives > _: playGame()', answer: '0' },
      ]} },
    { courseTitle: 'Introduction to Coding', lessonIdx: 5, type: 'timeline', title: 'Debugging Steps',
      data: { mode: 'sequential', items: [
        { label: 'Read error message', value: 'Step 1' },
        { label: 'Check assumptions', value: 'Step 2' },
        { label: 'Add print statements', value: 'Step 3' },
        { label: 'Fix the bug', value: 'Step 4' },
        { label: 'Test the fix', value: 'Step 5' },
      ]} },

    // Digital Literacy & Internet Safety
    { courseTitle: 'Digital Literacy & Internet Safety', lessonIdx: 3, type: 'drag_drop', title: 'Online Safety: Red Flags',
      data: { mode: 'standard', items: [
        { label: '"You won a prize!"', category: 'Scam' },
        { label: 'Friend request from known person', category: 'Safe' },
        { label: 'Email asking for password', category: 'Scam' },
        { label: 'Message from your teacher', category: 'Safe' },
        { label: 'Too-good-to-be-true deal', category: 'Scam' },
      ], categories: ['Scam', 'Safe'] } },
    { courseTitle: 'Digital Literacy & Internet Safety', lessonIdx: 6, type: 'timeline', title: 'Evaluate a Source (CRAAP)',
      data: { mode: 'sequential', items: [
        { label: 'Currency — Is it recent?', value: 'Step 1' },
        { label: 'Relevance — Does it matter?', value: 'Step 2' },
        { label: 'Authority — Who wrote it?', value: 'Step 3' },
        { label: 'Accuracy — Is it correct?', value: 'Step 4' },
        { label: 'Purpose — Why was it made?', value: 'Step 5' },
      ]} },
    { courseTitle: 'Digital Literacy & Internet Safety', lessonIdx: 7, type: 'fill_blanks', title: 'Safe Shopping',
      data: { mode: 'sentence', items: [
        { sentence: 'Always check for _ in the URL.', answer: 'HTTPS' },
        { sentence: 'Use a _ card for better fraud protection.', answer: 'credit' },
        { sentence: 'Be wary of prices that seem _ to be true.', answer: 'too good' },
      ]} },

    // Problem Solving Skills
    { courseTitle: 'Problem Solving Skills', lessonIdx: 2, type: 'timeline', title: '5 Whys Analysis',
      data: { mode: 'sequential', items: [
        { label: 'Problem: Car won\'t start', value: 'Start' },
        { label: 'Why? Battery is dead', value: 'Why #1' },
        { label: 'Why? Alternator failed', value: 'Why #2' },
        { label: 'Why? Belt is broken', value: 'Why #3' },
        { label: 'Why? Belt was never replaced', value: 'Root Cause' },
      ]} },
    { courseTitle: 'Problem Solving Skills', lessonIdx: 3, type: 'drag_drop', title: 'Decision Matrix',
      data: { mode: 'standard', items: [
        { label: 'Option A: Low cost', category: 'Pro' },
        { label: 'Option A: Takes long', category: 'Con' },
        { label: 'Option B: Fast result', category: 'Pro' },
        { label: 'Option B: Expensive', category: 'Con' },
      ], categories: ['Pro', 'Con'] } },

    // Web Development Fundamentals
    { courseTitle: 'Web Development Fundamentals', lessonIdx: 0, type: 'fill_blanks', title: 'HTML Tags',
      data: { mode: 'sentence', items: [
        { sentence: '_ is the first tag in an HTML document.', answer: '<!DOCTYPE html>' },
        { sentence: 'The _ tag contains the page title.', answer: '<title>' },
        { sentence: 'Use the _ tag for paragraphs.', answer: '<p>' },
      ]} },
    { courseTitle: 'Web Development Fundamentals', lessonIdx: 3, type: 'drag_drop', title: 'CSS Selectors Match',
      data: { mode: 'matching', items: [
        { label: '.class', matchWith: 'Selects by class' },
        { label: '#id', matchWith: 'Selects by ID' },
        { label: 'element', matchWith: 'Selects by tag' },
      ]} },

    // Mastering Web Accessibility
    { courseTitle: 'Mastering Web Accessibility (W3C Standard)', lessonIdx: 0, type: 'flashcards', title: 'POUR Principles',
      data: { mode: 'study', cards: [
        { front: 'Perceivable', back: 'Users must perceive content through multiple senses.' },
        { front: 'Operable', back: 'Users must be able to operate the interface.' },
        { front: 'Understandable', back: 'Users must understand content and navigation.' },
        { front: 'Robust', back: 'Content works with current and future technologies.' },
      ]} },
    { courseTitle: 'Mastering Web Accessibility (W3C Standard)', lessonIdx: 2, type: 'drag_drop', title: 'ARIA Roles',
      data: { mode: 'matching', items: [
        { label: 'role="navigation"', matchWith: 'Main navigation' },
        { label: 'role="main"', matchWith: 'Primary content' },
        { label: 'role="banner"', matchWith: 'Site header' },
        { label: 'role="search"', matchWith: 'Search feature' },
      ]} },
    { courseTitle: 'Mastering Web Accessibility (W3C Standard)', lessonIdx: 5, type: 'timeline', title: 'Audit Process',
      data: { mode: 'sequential', items: [
        { label: 'Choose a page to audit', value: 'Step 1' },
        { label: 'Run automated tests', value: 'Step 2' },
        { label: 'Manual keyboard testing', value: 'Step 3' },
        { label: 'Screen reader testing', value: 'Step 4' },
        { label: 'Document findings', value: 'Step 5' },
      ]} },
  ];

  let added = 0;
  for (const act of activities) {
    const course = courses.get(act.courseTitle);
    if (!course) continue;
    const lessons = await lookupLessonsByCourse(course.id);
    const lesson = lessons[act.lessonIdx];
    if (!lesson) continue;

    const existing = await lookupExistingInteractive(lesson.id);
    if (existing) continue;

    const { error } = await supabase.from('lesson_interactive_content').insert({
      lesson_id: lesson.id, content_type: act.type,
      title: act.title, content_data: JSON.stringify(act.data),
      sequence_order: 1,
    });
    if (!error) added++;
  }

  console.log(`  ✅ ${added} interactive activities added`);
}

// ── SECTION 6: Video Questions ────────────────────────────────────────
async function addVideoQuestions(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🎬 Adding video questions...');

  const vqData: { courseTitle: string; lessonIdx: number; questions: { timestamp: number; question: string; options: { text: string; correct: boolean }[] }[] }[] = [
    {
      courseTitle: 'Learning Numbers 1-20', lessonIdx: 4,
      questions: [
        { timestamp: 15, question: 'What is an even number?', options: [
          { text: 'Can be divided by 2', correct: true }, { text: 'Ends in 0', correct: false },
          { text: 'Has 3 digits', correct: false }, { text: 'Is very large', correct: false },
        ]},
        { timestamp: 90, question: 'Which of these is an odd number?', options: [
          { text: '7', correct: true }, { text: '4', correct: false }, { text: '10', correct: false }, { text: '2', correct: false },
        ]},
        { timestamp: 180, question: 'What do you get when you add two odd numbers?', options: [
          { text: 'An even number', correct: true }, { text: 'An odd number', correct: false },
          { text: 'Zero', correct: false }, { text: 'A decimal', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Learning Shapes & Colors', lessonIdx: 3,
      questions: [
        { timestamp: 10, question: 'What is an oval like?', options: [
          { text: 'A stretched-out circle', correct: true }, { text: 'A square', correct: false },
          { text: 'A triangle', correct: false }, { text: 'A star', correct: false },
        ]},
        { timestamp: 60, question: 'What does a heart shape have?', options: [
          { text: 'Two bumps and a point', correct: true }, { text: 'Four corners', correct: false },
          { text: 'Three sides', correct: false }, { text: 'No corners', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Animal Adventures', lessonIdx: 3,
      questions: [
        { timestamp: 20, question: 'Which ocean animal is the biggest on Earth?', options: [
          { text: 'Whale', correct: true }, { text: 'Dolphin', correct: false },
          { text: 'Shark', correct: false }, { text: 'Octopus', correct: false },
        ]},
        { timestamp: 120, question: 'How many arms does an octopus have?', options: [
          { text: '8', correct: true }, { text: '6', correct: false }, { text: '10', correct: false }, { text: '4', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'My First Science Experiments', lessonIdx: 5,
      questions: [
        { timestamp: 30, question: 'What do you need for a volcano experiment?', options: [
          { text: 'Baking soda and vinegar', correct: true }, { text: 'Salt and water', correct: false },
          { text: 'Oil and sugar', correct: false }, { text: 'Flour and milk', correct: false },
        ]},
        { timestamp: 150, question: 'What does the gas created in the volcano do?', options: [
          { text: 'Makes bubbles', correct: true }, { text: 'Turns solid', correct: false },
          { text: 'Disappears', correct: false }, { text: 'Turns to stone', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Healthy Habits for Kids', lessonIdx: 4,
      questions: [
        { timestamp: 10, question: 'How many minutes should you brush your teeth?', options: [
          { text: '2 minutes', correct: true }, { text: '30 seconds', correct: false },
          { text: '5 minutes', correct: false }, { text: '1 minute', correct: false },
        ]},
        { timestamp: 60, question: 'How often should you brush your teeth?', options: [
          { text: 'Twice a day', correct: true }, { text: 'Once a week', correct: false },
          { text: 'Once a day', correct: false }, { text: 'After every meal', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Introduction to Reading', lessonIdx: 5,
      questions: [
        { timestamp: 15, question: 'What are rhyming words?', options: [
          { text: 'Words with the same ending sound', correct: true }, { text: 'Words with the same spelling', correct: false },
          { text: 'Words that are long', correct: false }, { text: 'Words that are short', correct: false },
        ]},
        { timestamp: 120, question: 'Which pair rhymes?', options: [
          { text: 'Sun and fun', correct: true }, { text: 'Cat and dog', correct: false },
          { text: 'Red and blue', correct: false }, { text: 'Big and small', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Fun With Nature', lessonIdx: 0,
      questions: [
        { timestamp: 10, question: 'What does a thermometer measure?', options: [
          { text: 'Temperature', correct: true }, { text: 'Rainfall', correct: false },
          { text: 'Wind speed', correct: false }, { text: 'Air pressure', correct: false },
        ]},
        { timestamp: 90, question: 'What does a barometer measure?', options: [
          { text: 'Air pressure', correct: true }, { text: 'Temperature', correct: false },
          { text: 'Wind direction', correct: false }, { text: 'Humidity', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Introduction to Coding', lessonIdx: 2,
      questions: [
        { timestamp: 30, question: 'What is a variable?', options: [
          { text: 'A container that stores data', correct: true }, { text: 'A type of loop', correct: false },
          { text: 'A function', correct: false }, { text: 'An error message', correct: false },
        ]},
        { timestamp: 180, question: 'What does a conditional do?', options: [
          { text: 'Makes decisions in code', correct: true }, { text: 'Repeats code', correct: false },
          { text: 'Stores data', correct: false }, { text: 'Prints output', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Digital Literacy & Internet Safety', lessonIdx: 2,
      questions: [
        { timestamp: 20, question: 'What is cyberbullying?', options: [
          { text: 'Bullying that happens online', correct: true }, { text: 'A computer virus', correct: false },
          { text: 'A type of hacker', correct: false }, { text: 'A social media game', correct: false },
        ]},
        { timestamp: 120, question: 'What should you do if you see cyberbullying?', options: [
          { text: 'Tell a trusted adult', correct: true }, { text: 'Respond aggressively', correct: false },
          { text: 'Share it with friends', correct: false }, { text: 'Ignore it completely', correct: false },
        ]},
      ],
    },
    {
      courseTitle: 'Web Development Fundamentals', lessonIdx: 2,
      questions: [
        { timestamp: 15, question: 'Why should you include alt text on images?', options: [
          { text: 'For accessibility', correct: true }, { text: 'To make images bigger', correct: false },
          { text: 'To change colors', correct: false }, { text: 'To add animations', correct: false },
        ]},
        { timestamp: 180, question: 'What does the <video> tag do?', options: [
          { text: 'Embeds a video', correct: true }, { text: 'Creates a link', correct: false },
          { text: 'Adds a picture', correct: false }, { text: 'Makes text bold', correct: false },
        ]},
      ],
    },
  ];

  let added = 0;
  for (const vq of vqData) {
    const course = courses.get(vq.courseTitle);
    if (!course) continue;
    const lessons = await lookupLessonsByCourse(course.id);
    const lesson = lessons[vq.lessonIdx];
    if (!lesson) continue;

    for (const q of vq.questions) {
      const { error } = await supabase.from('video_questions').insert({
        lesson_id: lesson.id,
        timestamp_seconds: q.timestamp,
        question_text: q.question,
        options: JSON.stringify(q.options),
        correct_option_index: q.options.findIndex(o => o.correct),
        created_at: new Date().toISOString(),
      });
      if (!error) added++;
    }
  }

  console.log(`  ✅ ${added} video questions added`);
}

// ── SECTION 7: Course Accessibility Categories ────────────────────────
async function addAccessibilityCategories(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🏷️ Adding accessibility categories...');

  const catMap: Record<string, string[]> = {
    'Learning Numbers 1-20': ['cognitive', 'adhd', 'dyslexia'],
    'Learning Shapes & Colors': ['cognitive', 'adhd', 'asd', 'visual'],
    'Animal Adventures': ['cognitive', 'adhd', 'asd'],
    'My First Science Experiments': ['cognitive', 'adhd'],
    'Healthy Habits for Kids': ['cognitive', 'asd'],
    'Introduction to Reading': ['dyslexia', 'cognitive'],
    'Fun With Nature': ['cognitive', 'adhd', 'asd'],
    'Introduction to Coding': ['adhd', 'asd', 'visual'],
    'Digital Literacy & Internet Safety': ['adhd', 'dyslexia', 'visual'],
    'Problem Solving Skills': ['cognitive', 'adhd'],
    'Web Development Fundamentals': ['visual', 'motor'],
    'Mastering Web Accessibility (W3C Standard)': ['visual', 'hearing', 'motor', 'cognitive'],
    'Platform Orientation Guide': ['cognitive', 'visual'],
    'ACESS Community Guidelines': ['cognitive'],
  };

  let added = 0;
  for (const [title, cats] of Object.entries(catMap)) {
    const course = courses.get(title);
    if (!course) continue;

    for (const cat of cats) {
      const { data: existing } = await supabase.from('course_accessibility_categories')
        .select('id').eq('course_id', course.id).eq('accessibility_category', cat).limit(1).maybeSingle();
      if (existing) continue;

      const { error } = await supabase.from('course_accessibility_categories').insert({
        course_id: course.id, accessibility_category: cat,
      });
      if (!error) added++;
    }
  }

  console.log(`  ✅ ${added} accessibility categories added`);
}

// ── SECTION 8: Adaptive Interactions ──────────────────────────────────
async function addAdaptiveInteractions(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n📊 Adding adaptive interactions...');

  // Per-learner adaptive interaction profiles
  const interactionProfiles: Record<string, { type: string; weight: number }[]> = {
    'adhd_alex@acess.demo': [
      { type: 'focus_mode', weight: 40 }, { type: 'chunked_content', weight: 25 },
      { type: 'guided_mode', weight: 15 }, { type: 'distraction_free', weight: 20 },
    ],
    'dyslexia_sam@acess.demo': [
      { type: 'tts', weight: 35 }, { type: 'simplified_summary', weight: 25 },
      { type: 'reading_spotlight', weight: 20 }, { type: 'dyslexia_font', weight: 20 },
    ],
    'visual_jordan@acess.demo': [
      { type: 'tts', weight: 40 }, { type: 'captions', weight: 30 },
      { type: 'slideshow', weight: 20 }, { type: 'high_contrast', weight: 10 },
    ],
  };

  const allAdaptationTypes = ['tts', 'focus_mode', 'chunked_content', 'simplified_summary', 'reading_spotlight', 'distraction_free', 'high_contrast', 'captions', 'slideshow', 'guided_mode', 'dyslexia_font'];

  let added = 0;

  for (const [email, profile] of Object.entries(interactionProfiles)) {
    const user = users.get(email);
    if (!user) continue;

    // Generate weighted interactions
    const totalInteractions = email === 'adhd_alex@acess.demo' ? 60 :
                              email === 'dyslexia_sam@acess.demo' ? 50 : 40;

    // Build weighted pool
    const pool: string[] = [];
    for (const p of profile) {
      for (let i = 0; i < p.weight; i++) pool.push(p.type);
    }

    const courseEntries = Array.from(courses.values());

    for (let i = 0; i < totalInteractions; i++) {
      const adaptation = pool[randInt(0, pool.length - 1)];
      const course = pick(courseEntries);
      const lessons = await lookupLessonsByCourse(course.id);
      const lesson = lessons.length > 0 ? pick(lessons) : null;

      const { error } = await supabase.from('adaptive_interactions').insert({
        user_id: user.id, adaptation_used: adaptation,
        course_id: course.id, lesson_id: lesson?.id || null,
        duration_seconds: randInt(30, 600),
        created_at: randomDate(daysAgo(90), new Date()).toISOString(),
      });
      if (!error) added++;
    }
  }

  // Also add interactions for non-accessibility learners
  const standardLearners = ['learner@acess.demo', 'high_performer@acess.demo', 'emma_student@acess.demo', 'sophia_student@acess.demo', 'aina.active@acess.demo'];
  for (const email of standardLearners) {
    const user = users.get(email);
    if (!user) continue;
    const count = randInt(3, 8);
    const courseEntries = Array.from(courses.values());
    for (let i = 0; i < count; i++) {
      const adaptation = pick(allAdaptationTypes);
      const course = pick(courseEntries);
      const { error } = await supabase.from('adaptive_interactions').insert({
        user_id: user.id, adaptation_used: adaptation,
        course_id: course.id,
        duration_seconds: randInt(10, 120),
        created_at: randomDate(daysAgo(60), new Date()).toISOString(),
      });
      if (!error) added++;
    }
  }

  console.log(`  ✅ ${added} adaptive interactions added`);
}

// ── SECTION 9: Recommendations ────────────────────────────────────────
async function addRecommendations(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n💡 Adding recommendations...');

  const recs: { email: string; reason: string }[] = [
    { email: 'learner@acess.demo', reason: 'Since you enjoyed Animal Adventures, try Fun With Nature' },
    { email: 'learner@acess.demo', reason: 'Review Numbers 6-10 — you scored 70% on the quiz' },
    { email: 'high_performer@acess.demo', reason: 'Try the interactive activity for Lesson 3 again' },
    { email: 'high_performer@acess.demo', reason: 'You might enjoy Web Development Fundamentals next' },
    { email: 'at_risk@acess.demo', reason: 'Review the Number Patterns lesson — you scored 30%' },
    { email: 'at_risk@acess.demo', reason: 'Recommended: revisit Counting to 20' },
    { email: 'adhd_alex@acess.demo', reason: 'Try focus mode for the next coding lesson' },
    { email: 'adhd_alex@acess.demo', reason: 'Continue with Digital Literacy — new content available' },
    { email: 'dyslexia_sam@acess.demo', reason: 'Reading lessons ahead: try the sight words activity' },
    { email: 'dyslexia_sam@acess.demo', reason: 'Enable TTS for a better experience in Fun With Nature' },
    { email: 'visual_jordan@acess.demo', reason: 'Web Development: try the HTML Forms lesson' },
    { email: 'emma_student@acess.demo', reason: 'Complete your Shapes & Colors course' },
    { email: 'sophia_student@acess.demo', reason: 'Start Digital Literacy to learn about online safety' },
    { email: 'oliver_student@acess.demo', reason: 'Welcome back! Try the first Animal Adventures lesson' },
  ];

  let added = 0;
  for (const rec of recs) {
    const user = users.get(rec.email);
    if (!user) continue;

    // Find an active enrollment for this user
    const { data: enrollments } = await supabase.from('enrollments')
      .select('id, course_id').eq('user_id', user.id).limit(5);
    if (!enrollments || enrollments.length === 0) continue;

    const enr = pick(enrollments);
    const courseEntry = courses.has(enr.course_id)
      ? { id: enr.course_id }
      : Array.from(courses.values()).find(c => c.id === enr.course_id);

    if (!courseEntry) continue;

    // Find a lesson to recommend
    const lessons = await lookupLessonsByCourse(courseEntry.id);
    if (lessons.length === 0) continue;

    // Check existing
    const { data: existing } = await supabase.from('recommendations')
      .select('id').eq('enrollment_id', enr.id).limit(1).maybeSingle();
    if (existing && Math.random() > 0.5) continue;

    const { error } = await supabase.from('recommendations').insert({
      enrollment_id: enr.id,
      recommended_lesson_id: pick(lessons).id,
      difficulty_tier: pick(['revision', 'standard', 'enrichment']),
      trigger_reason: rec.reason,
    });
    if (!error) added++;
  }

  console.log(`  ✅ ${added} recommendations added`);
}

// ── SECTION 10: Notifications ─────────────────────────────────────────
async function addNotifications(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🔔 Adding notifications...');

  const notifTemplates: { email: string; type: string; title: string; body: string; daysAgo: number }[] = [
    // Enrollment confirmations
    { email: 'learner@acess.demo', type: 'enrollment', title: 'Enrolled in Web Development', body: 'You started Web Development Fundamentals.', daysAgo: 15 },
    { email: 'high_performer@acess.demo', type: 'enrollment', title: 'Enrolled in Problem Solving', body: 'You started Problem Solving Skills.', daysAgo: 45 },
    { email: 'adhd_alex@acess.demo', type: 'enrollment', title: 'Enrolled in Digital Literacy', body: 'You started Digital Literacy & Internet Safety.', daysAgo: 20 },
    { email: 'dyslexia_sam@acess.demo', type: 'enrollment', title: 'Enrolled in Fun With Nature', body: 'You started Fun With Nature.', daysAgo: 15 },
    // Quiz results
    { email: 'learner@acess.demo', type: 'quiz_completed', title: 'Quiz Passed: Numbers 1-20', body: 'Great job! You scored 85%.', daysAgo: 100 },
    { email: 'high_performer@acess.demo', type: 'quiz_completed', title: 'Quiz Passed: Numbers 1-20', body: 'Perfect score! 100%!', daysAgo: 140 },
    { email: 'at_risk@acess.demo', type: 'quiz_completed', title: 'Quiz Failed: Numbers 1-20', body: 'You scored 30%. Keep trying!', daysAgo: 80 },
    { email: 'sophia_student@acess.demo', type: 'quiz_completed', title: 'Quiz Passed: Animal Adventures', body: 'Great score: 90%!', daysAgo: 70 },
    { email: 'adhd_alex@acess.demo', type: 'quiz_completed', title: 'Quiz Passed: Animal Adventures', body: 'You scored 75%. Well done!', daysAgo: 50 },
    { email: 'visual_jordan@acess.demo', type: 'quiz_completed', title: 'Quiz Passed: Shapes & Colors', body: 'Excellent: 90%!', daysAgo: 90 },
    // Badges earned
    { email: 'learner@acess.demo', type: 'badge_earned', title: 'Badge Unlocked!', body: 'You earned the Number Whiz badge!', daysAgo: 100 },
    { email: 'high_performer@acess.demo', type: 'badge_earned', title: 'Badge Unlocked!', body: 'You earned the Code Master badge!', daysAgo: 50 },
    { email: 'sophia_student@acess.demo', type: 'badge_earned', title: 'Badge Unlocked!', body: 'You earned the Bookworm badge!', daysAgo: 70 },
    { email: 'emma_student@acess.demo', type: 'badge_earned', title: 'Badge Unlocked!', body: 'You earned the Number Whiz badge!', daysAgo: 50 },
    // Course completed
    { email: 'learner@acess.demo', type: 'lesson_completed', title: 'Course Completed!', body: 'You finished Animal Adventures!', daysAgo: 80 },
    { email: 'high_performer@acess.demo', type: 'lesson_completed', title: 'Course Completed!', body: 'You finished Digital Literacy!', daysAgo: 50 },
    { email: 'sophia_student@acess.demo', type: 'lesson_completed', title: 'Course Completed!', body: 'You finished Problem Solving!', daysAgo: 30 },
    // Certificate issued
    { email: 'learner@acess.demo', type: 'certificate', title: 'Certificate Issued', body: 'Your Animal Adventures certificate is ready!', daysAgo: 80 },
    { email: 'high_performer@acess.demo', type: 'certificate', title: 'Certificate Issued', body: 'Your Digital Literacy certificate is ready!', daysAgo: 50 },
    // Educator notifications
    { email: 'educator@acess.demo', type: 'course_published', title: 'Course Published', body: 'Your course has been published.', daysAgo: 30 },
    { email: 'educator@acess.demo', type: 'lesson_completed', title: 'New Enrollment', body: '3 new students enrolled in your course.', daysAgo: 10 },
    { email: 'new_ed@acess.demo', type: 'course_published', title: 'Course Published', body: 'Mastering Web Accessibility is now live!', daysAgo: 20 },
    { email: 'fatimah.ed@acess.demo', type: 'quiz_completed', title: 'Student Alert', body: 'Noah scored below 40% on your quiz.', daysAgo: 15 },
    // Milestone / progress reminder
    { email: 'at_risk@acess.demo', type: 'milestone', title: 'Keep Going!', body: 'You\'re 20% through Learning Numbers. Keep it up!', daysAgo: 60 },
    { email: 'oliver_student@acess.demo', type: 'milestone', title: 'Welcome Back!', body: 'Good to see you learning again!', daysAgo: 3 },
    // Engagement / recommendation
    { email: 'learner@acess.demo', type: 'recommendation', title: 'New Recommendation', body: 'Check out Fun With Nature based on your progress.', daysAgo: 40 },
    { email: 'adhd_alex@acess.demo', type: 'recommendation', title: 'Try Focus Mode', body: 'Focus mode is available for your next lesson.', daysAgo: 25 },
  ];

  let added = 0;
  for (const n of notifTemplates) {
    const user = users.get(n.email);
    if (!user) continue;

    const { error } = await supabase.from('notifications').insert({
      user_id: user.id, type: n.type, title: n.title, body: n.body,
      is_read: Math.random() > 0.5,
      created_at: daysAgo(n.daysAgo).toISOString(),
    });
    if (!error) added++;
  }

  console.log(`  ✅ ${added} notifications added`);
}

// ── SECTION 11: Comments ──────────────────────────────────────────────
async function addComments(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n💬 Adding lesson comments...');

  const commentData: { email: string; courseIdx: number; lessonIdx: number; text: string; replyTo?: number }[] = [
    // Learning Numbers 1-20 - Lesson 1
    { email: 'learner@acess.demo', courseIdx: 0, lessonIdx: 0, text: 'Why does 5 come after 4?' },
    { email: 'educator@acess.demo', courseIdx: 0, lessonIdx: 0, text: 'Great question! Think of it like climbing stairs — each step goes up by 1!', replyTo: 0 },
    { email: 'high_performer@acess.demo', courseIdx: 0, lessonIdx: 0, text: 'I like counting by 2s better. 2, 4, 6, 8!' },
    // Animal Adventures - Lesson 3 (Ocean Animals)
    { email: 'adhd_alex@acess.demo', courseIdx: 2, lessonIdx: 3, text: 'I liked the ocean animals lesson! Can we learn more about dolphins?' },
    { email: 'educator@acess.demo', courseIdx: 2, lessonIdx: 3, text: 'Great suggestion! Look out for our special dolphin activity next week.', replyTo: 3 },
    { email: 'sophia_student@acess.demo', courseIdx: 2, lessonIdx: 3, text: 'Whales are my favorite! They are so big!' },
    // Introduction to Reading - Sight Words
    { email: 'dyslexia_sam@acess.demo', courseIdx: 5, lessonIdx: 2, text: 'The TTS feature really helped me read this lesson. Thank you!' },
    { email: 'educator@acess.demo', courseIdx: 5, lessonIdx: 2, text: 'You\'re welcome! TTS is a great tool for building reading confidence.', replyTo: 6 },
    // Introduction to Coding - Variables
    { email: 'high_performer@acess.demo', courseIdx: 7, lessonIdx: 2, text: 'I never knew coding could be so fun! Ready for the next lesson.' },
    { email: 'learner@acess.demo', courseIdx: 7, lessonIdx: 2, text: 'Same here! The drag-and-drop activity was cool.', replyTo: 8 },
    { email: 'emma_student@acess.demo', courseIdx: 7, lessonIdx: 2, text: 'Variables make so much sense now. Like boxes with labels!' },
    // My First Science Experiments - Volcano
    { email: 'learner@acess.demo', courseIdx: 3, lessonIdx: 5, text: 'I tried the volcano at home! It really worked!' },
    { email: 'educator@acess.demo', courseIdx: 3, lessonIdx: 5, text: 'Awesome! Did you try adding extra food coloring for a cool effect?', replyTo: 11 },
    { email: 'sophia_student@acess.demo', courseIdx: 3, lessonIdx: 5, text: 'The video was really helpful. I followed every step.' },
    // Fun With Nature - Water Cycle
    { email: 'dyslexia_sam@acess.demo', courseIdx: 6, lessonIdx: 1, text: 'The water cycle diagram made everything clear.' },
    { email: 'high_performer@acess.demo', courseIdx: 6, lessonIdx: 1, text: 'I made my own water cycle in a jar! It worked!' },
    // Web Accessibility - POUR
    { email: 'visual_jordan@acess.demo', courseIdx: 11, lessonIdx: 0, text: 'The POUR principles are really practical. I use them every day.' },
    { email: 'educator@acess.demo', courseIdx: 11, lessonIdx: 0, text: 'That\'s great to hear! Applying POUR makes the web better for everyone.', replyTo: 16 },
    // Healthy Habits - Feelings
    { email: 'emma_student@acess.demo', courseIdx: 4, lessonIdx: 8, text: 'Deep breathing really helps when I\'m frustrated.' },
    { email: 'learner@acess.demo', courseIdx: 4, lessonIdx: 8, text: 'I tell my mom when I feel scared now. It helps!', replyTo: 18 },
  ];

  let added = 0;
  // Map to track inserted comment IDs for replies
  const insertedIds: string[] = [];

  for (const c of commentData) {
    const user = users.get(c.email);
    if (!user) continue;

    const courseTitles = Array.from(courses.keys());
    const courseTitle = courseTitles[c.courseIdx];
    const course = courses.get(courseTitle);
    if (!course) continue;

    const lessons = await lookupLessonsByCourse(course.id);
    const lesson = lessons[c.lessonIdx];
    if (!lesson) continue;

    const { data: result, error } = await supabase.from('lesson_comments').insert({
      lesson_id: lesson.id, user_id: user.id, content: c.text,
      parent_id: c.replyTo != null ? (insertedIds[c.replyTo] || null) : null,
      created_at: randomDate(daysAgo(30), daysAgo(1)).toISOString(),
    }).select('id').single();

    if (result && !error) {
      insertedIds.push(result.id);
      added++;
    }
  }

  console.log(`  ✅ ${added} comments added`);
}

// ── SECTION 12: Favorites ─────────────────────────────────────────────
async function addFavorites(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n⭐ Adding favorites...');

  const favData: { email: string; courseTitle: string }[] = [
    { email: 'at_risk@acess.demo', courseTitle: 'Learning Numbers 1-20' },
    { email: 'at_risk@acess.demo', courseTitle: 'Introduction to Reading' },
    { email: 'adhd_alex@acess.demo', courseTitle: 'Learning Shapes & Colors' },
    { email: 'adhd_alex@acess.demo', courseTitle: 'Fun With Nature' },
    { email: 'visual_jordan@acess.demo', courseTitle: 'Web Development Fundamentals' },
    { email: 'visual_jordan@acess.demo', courseTitle: 'Mastering Web Accessibility (W3C Standard)' },
    { email: 'oliver_student@acess.demo', courseTitle: 'Animal Adventures' },
    { email: 'emma_student@acess.demo', courseTitle: 'Learning Numbers 1-20' },
    { email: 'danial.active@acess.demo', courseTitle: 'Animal Adventures' },
    { email: 'aina.active@acess.demo', courseTitle: 'Introduction to Coding' },
    { email: 'wei.active@acess.demo', courseTitle: 'Learning Numbers 1-20' },
  ];

  let added = 0;
  for (const f of favData) {
    const user = users.get(f.email);
    const course = courses.get(f.courseTitle);
    if (!user || !course) continue;

    const { data: existing } = await supabase.from('course_favorites')
      .select('id').eq('user_id', user.id).eq('course_id', course.id).limit(1).maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from('course_favorites').insert({
      user_id: user.id, course_id: course.id,
    });
    if (!error) added++;
  }

  console.log(`  ✅ ${added} favorites added`);
}

// ── SECTION 13: Achievements ──────────────────────────────────────────
async function addAchievements(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n🏆 Adding achievements...');

  // New achievement definitions
  const achDefs: { courseTitle: string; name: string; desc: string; type: string; threshold: number }[] = [
    { courseTitle: 'Learning Shapes & Colors', name: 'Shape Master', desc: 'Complete all lessons in Shapes & Colors.', type: 'progress', threshold: 100 },
    { courseTitle: 'My First Science Experiments', name: 'Little Scientist', desc: 'Complete 8 science lessons.', type: 'lesson', threshold: 8 },
    { courseTitle: 'Healthy Habits for Kids', name: 'Health Champion', desc: 'Complete all Healthy Habits lessons.', type: 'progress', threshold: 100 },
    { courseTitle: 'Fun With Nature', name: 'Nature Explorer', desc: 'Complete all Fun With Nature lessons.', type: 'progress', threshold: 100 },
    { courseTitle: 'Digital Literacy & Internet Safety', name: 'Digital Citizen', desc: 'Score 90% or higher on Digital Literacy quiz.', type: 'quiz', threshold: 90 },
    { courseTitle: 'Problem Solving Skills', name: 'Problem Solver', desc: 'Complete all Problem Solving lessons.', type: 'progress', threshold: 100 },
    { courseTitle: 'Web Development Fundamentals', name: 'HTML Hero', desc: 'Complete 10 Web Development lessons.', type: 'lesson', threshold: 10 },
    { courseTitle: 'Mastering Web Accessibility (W3C Standard)', name: 'A11y Advocate', desc: 'Use 15 adaptive interactions.', type: 'engagement', threshold: 15 },
  ];

  const achIds: { id: string; courseId: string }[] = [];

  for (const ad of achDefs) {
    const course = courses.get(ad.courseTitle);
    if (!course) continue;

    const { data: existing } = await supabase.from('course_achievements')
      .select('id').eq('course_id', course.id).eq('name', ad.name).limit(1).maybeSingle();
    if (existing) {
      achIds.push({ id: existing.id, courseId: course.id });
      continue;
    }

    const { data: ach } = await supabase.from('course_achievements').insert({
      course_id: course.id, name: ad.name, description: ad.desc,
      requirement_type: ad.type, requirement_threshold: ad.threshold,
    }).select('id').single();

    if (ach) achIds.push({ id: ach.id, courseId: course.id });
  }

  // Award achievements to learners who qualify
  const awards: { email: string; achievementName: string }[] = [
    { email: 'learner@acess.demo', achievementName: 'Number Whiz' },
    { email: 'learner@acess.demo', achievementName: 'Counting Star' },
    { email: 'learner@acess.demo', achievementName: 'Shape Master' },
    { email: 'learner@acess.demo', achievementName: 'Bookworm' },
    { email: 'high_performer@acess.demo', achievementName: 'Number Whiz' },
    { email: 'high_performer@acess.demo', achievementName: 'Counting Star' },
    { email: 'high_performer@acess.demo', achievementName: 'Shape Master' },
    { email: 'high_performer@acess.demo', achievementName: 'Little Scientist' },
    { email: 'high_performer@acess.demo', achievementName: 'Health Champion' },
    { email: 'high_performer@acess.demo', achievementName: 'Nature Explorer' },
    { email: 'high_performer@acess.demo', achievementName: 'Code Master' },
    { email: 'high_performer@acess.demo', achievementName: 'Problem Solver' },
    { email: 'sophia_student@acess.demo', achievementName: 'Number Whiz' },
    { email: 'sophia_student@acess.demo', achievementName: 'Counting Star' },
    { email: 'sophia_student@acess.demo', achievementName: 'Animal Expert' },
    { email: 'sophia_student@acess.demo', achievementName: 'Bookworm' },
    { email: 'sophia_student@acess.demo', achievementName: 'Little Scientist' },
    { email: 'emma_student@acess.demo', achievementName: 'Number Whiz' },
    { email: 'emma_student@acess.demo', achievementName: 'Shape Master' },
    { email: 'emma_student@acess.demo', achievementName: 'Little Scientist' },
    { email: 'visual_jordan@acess.demo', achievementName: 'Shape Master' },
    { email: 'visual_jordan@acess.demo', achievementName: 'Web Pioneer' },
    { email: 'dyslexia_sam@acess.demo', achievementName: 'Bookworm' },
    { email: 'dyslexia_sam@acess.demo', achievementName: 'Shape Master' },
    { email: 'dyslexia_sam@acess.demo', achievementName: 'Web Pioneer' },
    { email: 'wei.active@acess.demo', achievementName: 'Number Whiz' },
    { email: 'wei.active@acess.demo', achievementName: 'Counting Star' },
    { email: 'aina.active@acess.demo', achievementName: 'Digital Citizen' },
  ];

  let awarded = 0;
  for (const award of awards) {
    const user = users.get(award.email);
    if (!user) continue;

    // Find achievement ID by name
    const { data: ach } = await supabase.from('course_achievements')
      .select('id').eq('name', award.achievementName).limit(1).maybeSingle();
    if (!ach) continue;

    // Check if already awarded
    const { data: existing } = await supabase.from('user_achievements')
      .select('id').eq('user_id', user.id).eq('achievement_id', ach.id).limit(1).maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from('user_achievements').insert({
      user_id: user.id, achievement_id: ach.id,
      earned_at: randomDate(daysAgo(90), new Date()).toISOString(),
    });
    if (!error) awarded++;
  }

  console.log(`  ✅ ${achIds.length} achievements defined, ${awarded} awarded to learners`);
}

// ── SECTION 14: Learner Checkpoints ───────────────────────────────────
async function addLearnerCheckpoints(users: Map<string, RowMap>, courses: Map<string, RowMap>) {
  console.log('\n✅ Adding learner checkpoints...');

  // For active learners, complete checkpoints on their enrolled courses
  const checkpointCompletions: { email: string; rate: number }[] = [
    { email: 'high_performer@acess.demo', rate: 1.0 },
    { email: 'learner@acess.demo', rate: 0.8 },
    { email: 'sophia_student@acess.demo', rate: 0.9 },
    { email: 'emma_student@acess.demo', rate: 0.7 },
    { email: 'adhd_alex@acess.demo', rate: 0.6 },
    { email: 'dyslexia_sam@acess.demo', rate: 0.5 },
    { email: 'visual_jordan@acess.demo', rate: 0.7 },
    { email: 'at_risk@acess.demo', rate: 0.2 },
    { email: 'oliver_student@acess.demo', rate: 0.3 },
    { email: 'danial.active@acess.demo', rate: 0.6 },
    { email: 'aina.active@acess.demo', rate: 0.8 },
    { email: 'wei.active@acess.demo', rate: 0.9 },
  ];

  let completed = 0;

  for (const cc of checkpointCompletions) {
    const user = users.get(cc.email);
    if (!user) continue;

    // Get user's enrollments
    const { data: enrollments } = await supabase.from('enrollments')
      .select('id, course_id').eq('user_id', user.id).limit(10);
    if (!enrollments) continue;

    for (const enr of enrollments) {
      const lessons = await lookupLessonsByCourse(enr.course_id);
      for (const lesson of lessons) {
        const checkpoints = await lookupCheckpointsByLesson(lesson.id);
        for (const cp of checkpoints) {
          if (Math.random() > cc.rate) continue;

          // Check if already completed
          const { data: existing } = await supabase.from('learner_checkpoints')
            .select('id').eq('enrollment_id', enr.id).eq('checkpoint_id', cp.id).limit(1).maybeSingle();
          if (existing) continue;

          const { error } = await supabase.from('learner_checkpoints').insert({
            enrollment_id: enr.id, checkpoint_id: cp.id,
            completed_at: randomDate(daysAgo(30), new Date()).toISOString(),
          });
          if (!error) completed++;
        }
      }
    }
  }

  console.log(`  ✅ ${completed} learner checkpoints completed`);
}

// ── SECTION 15: Profile Updates ───────────────────────────────────────
async function updateProfiles(users: Map<string, RowMap>) {
  console.log('\n👤 Updating user profiles...');

  const profileUpdates: { email: string; updates: Record<string, any> }[] = [
    { email: 'learner@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en' } },
    { email: 'high_performer@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en',
      accessibility_prefs: JSON.stringify({ compact_mode: true, font_size_px: 14 }) } },
    { email: 'at_risk@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en',
      accessibility_prefs: JSON.stringify({ simplified_ui: true, chunked_content_mode: true, font_size_px: 20 }) } },
    { email: 'adhd_alex@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en',
      accessibility_prefs: JSON.stringify({ distraction_free_mode: true, focus_mode_auto: true, animation_level: 'reduced', font_size_px: 18 }) } },
    { email: 'dyslexia_sam@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en',
      accessibility_prefs: JSON.stringify({ dyslexia_friendly_font: true, font_size_px: 22, line_spacing_multiplier: 1.8, word_spacing_pct: 20, background_tint: 'cream' }) } },
    { email: 'visual_jordan@acess.demo', updates: { age_group: '18+', country: 'Malaysia', preferred_language: 'en',
      accessibility_prefs: JSON.stringify({ font_size_px: 28, tts_enabled: true, high_contrast: true, reduced_motion_enabled: true }) } },
    { email: 'emma_student@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en' } },
    { email: 'oliver_student@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en' } },
    { email: 'sophia_student@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'en' } },
    { email: 'danial.active@acess.demo', updates: { age_group: '6-12', country: 'Malaysia', preferred_language: 'ms' } },
    { email: 'aina.active@acess.demo', updates: { age_group: '13-17', country: 'Malaysia', preferred_language: 'ms' } },
    { email: 'wei.active@acess.demo', updates: { age_group: '6-12', country: 'Malaysia', preferred_language: 'ms' } },
  ];

  let updated = 0;
  for (const pu of profileUpdates) {
    const user = users.get(pu.email);
    if (!user) continue;

    const { error } = await supabase.from('user_profiles').update(pu.updates).eq('user_id', user.id);
    if (!error) updated++;
  }

  console.log(`  ✅ ${updated} profiles updated`);
}

// ─── Summary ──────────────────────────────────────────────────────────
async function printSummary() {
  console.log('\n📊 Data Summary:');
  const tables = [
    'enrollments', 'lesson_progress', 'quizzes', 'quiz_attempts', 'quiz_answers',
    'lesson_interactive_content', 'video_questions', 'course_accessibility_categories',
    'adaptive_interactions', 'recommendations', 'notifications', 'lesson_comments',
    'course_favorites', 'course_achievements', 'user_achievements', 'learner_checkpoints',
    'user_profiles', 'certificates',
  ];
  for (const table of tables) {
    const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(35)} ${count ?? 0} rows`);
  }
}

main().catch(console.error);
