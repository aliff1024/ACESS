/**
 * ACESS LMS — Comprehensive Demo Data Seeder
 *
 * Generates a production-like dataset across all 28+ tables.
 * Safe to run multiple times (wipes existing demo data first).
 *
 * Usage: npx tsx supabase/seed-comprehensive.ts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { jsPDF } from 'jspdf';

dotenv.config({ path: path.resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PW = 'AcessDemo2026!';
const DEMO_DOMAIN = '@acess.demo';

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

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Personas ──────────────────────────────────────────────────────────
interface Persona {
  email: string;
  name: string;
  role: 'learner' | 'educator' | 'admin';
  type: string;
  ageGroup: '6-12' | '13-17' | '18+';
  accessPrefs?: Record<string, any>;
  createdAt: Date;
  loginAt: Date;
  phone?: string;
  country?: string;
  avatar_url?: string;
}

const PERSONAS: Persona[] = [
  // Admin
  { email: 'admin@acess.demo', name: 'Aliff Admin', role: 'admin', type: 'admin', ageGroup: '18+', createdAt: daysAgo(240), loginAt: new Date(), phone: '+60-12-345-6789', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  // Educators
  { email: 'educator@acess.demo', name: 'Dr. Sarah Chen', role: 'educator', type: 'active_edu', ageGroup: '18+', createdAt: daysAgo(180), loginAt: new Date(), phone: '+60-12-345-6790', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' },
  { email: 'new_ed@acess.demo', name: 'Prof. Mark Rivera', role: 'educator', type: 'new_edu', ageGroup: '18+', createdAt: daysAgo(60), loginAt: daysAgo(3), phone: '+60-12-345-6791', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mark' },
  { email: 'fatimah.ed@acess.demo', name: 'Mrs. Fatimah Hassan', role: 'educator', type: 'risk_edu', ageGroup: '18+', createdAt: daysAgo(120), loginAt: daysAgo(1), phone: '+60-12-345-6792', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatimah' },
  // Learners
  { email: 'learner@acess.demo', name: 'Leo Learner', role: 'learner', type: 'active', ageGroup: '13-17', createdAt: daysAgo(150), loginAt: new Date(), phone: '+60-12-345-6793', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leo' },
  { email: 'high_performer@acess.demo', name: 'Mia Performer', role: 'learner', type: 'high', ageGroup: '13-17', createdAt: daysAgo(180), loginAt: new Date(), phone: '+60-12-345-6794', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mia' },
  { email: 'at_risk@acess.demo', name: 'Noah AtRisk', role: 'learner', type: 'risk', ageGroup: '13-17', createdAt: daysAgo(120), loginAt: daysAgo(16), phone: '+60-12-345-6795', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=noah' },
  { email: 'adhd_alex@acess.demo', name: 'Alex ADHD', role: 'learner', type: 'accessibility', ageGroup: '13-17', createdAt: daysAgo(90), loginAt: daysAgo(2),
    accessPrefs: { active_preset: 'adhd', chunked_content_mode: true, distraction_free_mode: true, font_family: 'Arial', font_size_px: 18 },
    phone: '+60-12-345-6796', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' },
  { email: 'dyslexia_sam@acess.demo', name: 'Sam Dyslexia', role: 'learner', type: 'accessibility', ageGroup: '13-17', createdAt: daysAgo(120), loginAt: daysAgo(1),
    accessPrefs: { active_preset: 'dyslexia', dyslexia_friendly_font: true, text_to_speech_enabled: true, background_tint: 'cream', line_spacing_multiplier: 1.5, font_family: 'OpenDyslexic' },
    phone: '+60-12-345-6797', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sam' },
  { email: 'visual_jordan@acess.demo', name: 'Jordan Visual', role: 'learner', type: 'accessibility', ageGroup: '18+', createdAt: daysAgo(150), loginAt: daysAgo(5),
    accessPrefs: { active_preset: 'visual', high_contrast: true, font_size_px: 24, reduced_motion_enabled: true, simplified_navigation_enabled: true },
    phone: '+60-12-345-6798', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan' },
  { email: 'emma_student@acess.demo', name: 'Emma Student', role: 'learner', type: 'active', ageGroup: '13-17', createdAt: daysAgo(90), loginAt: new Date(), phone: '+60-12-345-6799', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' },
  { email: 'oliver_student@acess.demo', name: 'Oliver Student', role: 'learner', type: 'inactive', ageGroup: '13-17', createdAt: daysAgo(180), loginAt: daysAgo(3), phone: '+60-12-345-6800', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver' },
  { email: 'sophia_student@acess.demo', name: 'Sophia Student', role: 'learner', type: 'high', ageGroup: '13-17', createdAt: daysAgo(120), loginAt: new Date(), phone: '+60-12-345-6801', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophia' },
  // Extra active learners (for better active/inactive ratio)
  { email: 'danial.active@acess.demo', name: 'Danial Bin Hassan', role: 'learner', type: 'active', ageGroup: '6-12', createdAt: daysAgo(60), loginAt: daysAgo(1), phone: '+60-12-345-6802', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=danial' },
  { email: 'aina.active@acess.demo', name: 'Aina Binti Ismail', role: 'learner', type: 'active', ageGroup: '13-17', createdAt: daysAgo(45), loginAt: new Date(), phone: '+60-12-345-6803', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aina' },
  { email: 'wei.active@acess.demo', name: 'Wei Chen Lim', role: 'learner', type: 'high', ageGroup: '6-12', createdAt: daysAgo(30), loginAt: new Date(), phone: '+60-12-345-6804', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wei' },
  // Instructor applicants (role: learner until approved)
  { email: 'applicant1@acess.demo', name: 'Alice Johnson', role: 'learner', type: 'applicant', ageGroup: '18+', createdAt: daysAgo(14), loginAt: daysAgo(14), phone: '+60-12-345-6805', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alicej' },
  { email: 'applicant2@acess.demo', name: 'Bob Williams', role: 'learner', type: 'applicant', ageGroup: '18+', createdAt: daysAgo(30), loginAt: daysAgo(30), phone: '+60-12-345-6806', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bobw' },
  { email: 'applicant3@acess.demo', name: 'Carol Davis', role: 'learner', type: 'applicant', ageGroup: '18+', createdAt: daysAgo(21), loginAt: daysAgo(21), phone: '+60-12-345-6807', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carold' },
  { email: 'applicant4@acess.demo', name: 'David Lee', role: 'learner', type: 'applicant', ageGroup: '18+', createdAt: daysAgo(7), loginAt: daysAgo(7), phone: '+60-12-345-6808', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=davidl' },
  { email: 'applicant5@acess.demo', name: 'Eve Martinez', role: 'learner', type: 'applicant', ageGroup: '18+', createdAt: daysAgo(2), loginAt: daysAgo(2), phone: '+60-12-345-6809', country: 'Malaysia', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=evem' },
];

// ─── Courses ───────────────────────────────────────────────────────────
interface CourseDef {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  category: string;
  ageGroup: string;
  thumbIdx: number;
  chapters: { title: string; desc: string; lessons: LessonDef[] }[];
  accessCats: string[];
}

interface LessonDef {
  title: string;
  type: string;
  duration: number;
  objectives: string[];
  html: string;
  summary: string;
  videoUrl?: string;
  hasInteractive?: boolean;
  isDraft?: boolean;
}

const THUMBS = [
  'https://images.unsplash.com/photo-1474511320723-9a56873864b5?q=80&w=800',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800',
  'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=800',
  'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=800',
  'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800',
  'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800',
  'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=800',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800',
];

// Course definitions with rich lesson content
const COURSES: CourseDef[] = [
  // ═══════════════════════════════════════════════════════════════════
  // C1: Learning Numbers 1-20 (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Learning Numbers 1-20', slug: 'learning-numbers', description: 'A fun journey through numbers! Learn to count, recognize, and write numbers from 1 to 20.', difficulty: 'beginner', category: 'Mathematics', ageGroup: '6-12', thumbIdx: 0,
    accessCats: ['adhd', 'dyslexia'],
    chapters: [
      {
        title: 'Counting Basics', desc: 'Learn what numbers look like and how to count.',
        lessons: [
          { title: 'Meet the Numbers 1-5', type: 'standard', duration: 8, objectives: ['Recognize numbers 1 to 5', 'Count objects up to 5'],
            html: '<h2>Meet the Numbers 1-5</h2><p>Numbers are everywhere! Let\'s meet the first five numbers.</p><h3>Number 1</h3><p>One is the first number. One sun, one moon, one nose! Look around — can you find one thing?</p><h3>Number 2</h3><p>Two eyes, two ears, two hands. Many things come in pairs!</p><h3>Number 3</h3><p>Three little pigs, three corners on a triangle. Can you count to three?</p><h3>Number 4</h3><p>A square has four sides. A table has four legs.</p><h3>Number 5</h3><p>Five fingers on one hand. Five toes on one foot!</p><p><strong>Try This:</strong> Count five things in your room right now.</p>',
            summary: 'You learned numbers 1 to 5 and what they look like.' },
          { title: 'Numbers 6-10', type: 'standard', duration: 8, objectives: ['Recognize numbers 6 to 10', 'Count objects up to 10'],
            html: '<h2>Numbers 6-10</h2><p>Let\'s keep counting! Numbers 6 through 10 are just as fun.</p><h3>Number 6</h3><p>Six is like a ball with a tail. A half-dozen eggs is 6!</p><h3>Number 7</h3><p>Seven days in a week. Rainbow has seven colors.</p><h3>Number 8</h3><p>Eight looks like a snowman. An octopus has eight arms!</p><h3>Number 9</h3><p>Nine is like a balloon on a string.</p><h3>Number 10</h3><p>Ten is a one and a zero together. Ten fingers, ten toes!</p>',
            summary: 'You learned numbers 6 through 10.' },
          { title: 'Counting to 20', type: 'standard', duration: 10, objectives: ['Count from 1 to 20', 'Recognize numbers 11-20'],
            html: '<h2>Counting All the Way to 20</h2><p>Now let\'s count all the way to 20! After 10 comes 11, 12, 13, 14, 15, 16, 17, 18, 19, and then 20!</p><p>Notice that numbers 11-19 have a pattern. They end in "teen"! Thirteen (3), fourteen (4), fifteen (5), sixteen (6), seventeen (7), eighteen (8), nineteen (9).</p><p>Number 20 is special — it\'s two groups of ten!</p>',
            summary: 'You can now count from 1 to 20.' },
          { title: 'Number Patterns', type: 'standard', duration: 10, objectives: ['Recognize number patterns', 'Complete simple sequences'],
            html: '<h2>Spot the Pattern!</h2><p>Numbers love to follow <strong>patterns</strong>! A pattern is something that repeats in a predictable way.</p><h3>Counting Up</h3><p>1, 2, 3, 4, 5 — what comes next? That\'s right, 6! Counting up by 1 is the simplest pattern.</p><h3>Skip Counting Patterns</h3><p>Try this: 2, 4, 6, 8 — what comes next? Yes, 10! This is skip counting by 2s.</p><h3>Try It Yourself</h3><p>What comes next in each pattern?</p><ul><li>5, 10, 15, ___</li><li>10, 20, 30, ___</li><li>1, 3, 5, 7, ___</li></ul><p><strong>Great job!</strong> You are a pattern detective!</p>',
            summary: 'You learned to spot and continue number patterns.',
            hasInteractive: true },
          { title: 'Even and Odd Numbers', type: 'video', duration: 12, objectives: ['Identify even numbers up to 20', 'Identify odd numbers up to 20'],
            html: '<h2>Even and Odd — Number Teams!</h2><p>Numbers play on two teams: <strong>Even</strong> and <strong>Odd</strong>.</p><h3>Even Numbers</h3><p>Even numbers end in 0, 2, 4, 6, or 8. They can be split into two equal groups. <em>Examples: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20</em></p><h3>Odd Numbers</h3><p>Odd numbers end in 1, 3, 5, 7, or 9. They always have one left over. <em>Examples: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19</em></p><p><strong>Try This:</strong> Look at 7 — it ends in 7, so it is odd! Look at 14 — it ends in 4, so it is even!</p>',
            summary: 'You learned how to tell even and odd numbers apart.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
        ]
      },
      {
        title: 'Number Fun', desc: 'Play with numbers through activities.',
        lessons: [
          { title: 'Bigger and Smaller', type: 'standard', duration: 8, objectives: ['Compare numbers', 'Understand bigger and smaller'],
            html: '<h2>Which Number is Bigger?</h2><p>Some numbers are bigger than others. 5 is bigger than 2. 10 is bigger than 7.</p><p>Think of it like this: if you have 5 cookies and your friend has 2, you have more! The bigger number means more things.</p><p><strong>Practice:</strong> Which is bigger — 8 or 3? 12 or 9?</p>',
            summary: 'You learned how to compare numbers.' },
          { title: 'Counting by 2s, 5s, and 10s', type: 'video', duration: 10, objectives: ['Count by twos up to 20', 'Count by fives up to 20', 'Count by tens up to 20'],
            html: '<h2>Skip Counting Fun!</h2><p>Skip counting means jumping over numbers! It is a fast way to count.</p><h3>Count by 2s</h3><p>2, 4, 6, 8, 10, 12, 14, 16, 18, 20!</p><h3>Count by 5s</h3><p>5, 10, 15, 20!</p><h3>Count by 10s</h3><p>10, 20!</p><p><strong>Practice:</strong> Count the fingers on two hands by 2s: 2, 4, 6, 8, 10! Now count your toes by 5s!</p>',
            summary: 'You can now skip count by 2s, 5s, and 10s.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Number Writing Practice', type: 'practice', duration: 15, objectives: ['Write numbers 1 to 20 correctly', 'Practice proper number formation'],
            html: '<h2>Let\'s Write Numbers!</h2><p>Practice makes perfect! Let\'s practice writing numbers 1 through 20.</p><h3>Writing Tips</h3><ul><li>Start at the top</li><li>Go down slowly</li><li>Stay between the lines</li></ul><p><strong>Number 1:</strong> A straight line down.</p><p><strong>Number 2:</strong> Around and around, then flat.</p><p><strong>Number 3:</strong> Two bumps — like a sideways smile!</p><p><strong>Number 4:</strong> Down, across, down.</p><p><strong>Number 5:</strong> Down, around, then a hat on top!</p><p>Keep practicing until you can write each number without looking!</p>',
            summary: 'You practiced writing numbers 1 to 20.',
            hasInteractive: true },
        ]
      },
      {
        title: 'Numbers in Action', desc: 'Play games and sing songs with numbers.',
        lessons: [
          { title: 'Number Games', type: 'practice', duration: 12, objectives: ['Apply counting skills in games', 'Practice quick number recognition'],
            html: '<h2>Let\'s Play with Numbers!</h2><p>Learning is more fun with games! Here are some number games to try.</p><h3>Number Hunt</h3><p>Find numbers 1-20 around your house. Look on clocks, phones, books, and doors!</p><h3>What\'s Missing?</h3><p>Have a friend hide one number from a line. Which number is missing?</p><h3>Number Bingo</h3><p>Draw a 3x3 grid. Write a different number in each box. First to get three in a row wins!</p><p><strong>Have fun playing with numbers!</strong></p>',
            summary: 'You played fun games to practice your number skills.',
            hasInteractive: true },
          { title: 'Number Songs', type: 'video', duration: 8, objectives: ['Sing along with counting songs', 'Remember numbers through music'],
            html: '<h2>Sing and Count!</h2><p>Music helps us remember! Let\'s sing some number songs.</p><h3>Ten Little Numbers</h3><p>One little, two little, three little numbers... count along to 10!</p><h3>The Counting Song</h3><p>1, 2, 3, 4, 5 — I caught a fish alive! 6, 7, 8, 9, 10 — I let it go again!</p><h3>Count to 20 and Back</h3><p>Sing numbers going up, then sing them coming back down. 20, 19, 18... can you do it?</p>',
            summary: 'You sang number songs to help remember your counting.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C2: Learning Shapes & Colors (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Learning Shapes & Colors', slug: 'shapes-colors', description: 'Discover the colorful world of shapes! Circles, squares, triangles and more.', difficulty: 'beginner', category: 'Art & Creativity', ageGroup: '6-12', thumbIdx: 1,
    accessCats: ['visual', 'adhd'],
    chapters: [
      {
        title: 'Basic Shapes', desc: 'Meet the most common shapes.',
        lessons: [
          { title: 'Circles and Squares', type: 'standard', duration: 8, objectives: ['Identify circles', 'Identify squares', 'Find shapes in the world'],
            html: '<h2>Circles and Squares</h2><p>A <strong>circle</strong> is round like a ball. It has no corners. A wheel is a circle!</p><p>A <strong>square</strong> has four equal sides. A window is often a square.</p><p>Look around — can you find circles and squares in your room?</p>',
            summary: 'You learned about circles and squares.' },
          { title: 'Triangles and Rectangles', type: 'standard', duration: 8, objectives: ['Identify triangles', 'Identify rectangles'],
            html: '<h2>Triangles and Rectangles</h2><p>A <strong>triangle</strong> has three sides. A pizza slice is a triangle!</p><p>A <strong>rectangle</strong> has four sides — two short and two long. A book is a rectangle.</p>',
            summary: 'You learned about triangles and rectangles.' },
          { title: 'Star and Diamond Shapes', type: 'standard', duration: 8, objectives: ['Identify star shapes', 'Identify diamond shapes'],
            html: '<h2>Stars and Diamonds</h2><p>A <strong>star</strong> has five points that stick out. Stars are in the sky at night! You can draw a star by making a pointy shape.</p><p>A <strong>diamond</strong> looks like a square that is sitting on its corner. It has four sides, just like a square, but it is tilted!</p><p><strong>Try This:</strong> Draw a star and a diamond on paper. Then find something in your house shaped like each one!</p>',
            summary: 'You learned about star and diamond shapes.',
            hasInteractive: true },
          { title: 'Oval and Heart Shapes', type: 'video', duration: 8, objectives: ['Identify oval shapes', 'Identify heart shapes'],
            html: '<h2>Ovals and Hearts</h2><p>An <strong>oval</strong> is like a stretched-out circle. An egg is an oval!</p><p>A <strong>heart</strong> shape has two bumps on top and a point at the bottom. Hearts show love and friendship!</p><p>Look for ovals and hearts in your home. An oval mirror? A heart-shaped cookie?</p>',
            summary: 'You learned about oval and heart shapes.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
      {
        title: 'Colors', desc: 'Explore the colorful world around us.',
        lessons: [
          { title: 'Colors of the Rainbow', type: 'standard', duration: 10, objectives: ['Name rainbow colors in order', 'Identify each color'],
            html: '<h2>The Rainbow Colors</h2><p>The rainbow has 7 beautiful colors! Remember them with the name <strong>ROY G. BIV</strong>:</p><ul><li><strong>R</strong>ed</li><li><strong>O</strong>range</li><li><strong>Y</strong>ellow</li><li><strong>G</strong>reen</li><li><strong>B</strong>lue</li><li><strong>I</strong>ndigo</li><li><strong>V</strong>iolet</li></ul><p>Rainbows appear when sunlight shines through raindrops. Next time it rains, look for a rainbow!</p>',
            summary: 'You learned the seven colors of the rainbow.',
            hasInteractive: true },
          { title: 'Mixing Colors', type: 'video', duration: 12, objectives: ['Understand primary colors', 'Mix colors to make new ones'],
            html: '<h2>Color Mixing Magic!</h2><p>Did you know you can make new colors by mixing? There are three <strong>primary colors</strong>: red, blue, and yellow. You cannot make these by mixing — but you can mix them to get others!</p><ul><li><strong>Red + Blue</strong> = Purple</li><li><strong>Red + Yellow</strong> = Orange</li><li><strong>Blue + Yellow</strong> = Green</li></ul><p><strong>Try This:</strong> Use finger paints or colored water to mix your own colors!</p>',
            summary: 'You learned how to mix colors to make new ones.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Color Matching Game', type: 'practice', duration: 10, objectives: ['Match colors correctly', 'Recognize color shades'],
            html: '<h2>Match the Colors!</h2><p>Can you match colors that are the same? Here are some fun color games:</p><h3>Color Hunt</h3><p>Find five things that are red. Now find five things that are blue. Can you find something for every color of the rainbow?</p><h3>Color Sorting</h3><p>Gather toys, crayons, or clothes. Sort them into piles by color. How many piles do you have?</p><h3>Shade Spotting</h3><p>Light blue and dark blue are both blue! Find two things that are the same color but different shades.</p>',
            summary: 'You practiced matching and sorting colors.',
            hasInteractive: true },
        ]
      },
      {
        title: 'Shape Activities', desc: 'Use shapes in creative ways.',
        lessons: [
          { title: 'Shape Hunt Activity', type: 'practice', duration: 12, objectives: ['Find shapes in everyday objects', 'Classify objects by shape'],
            html: '<h2>Shape Hunt!</h2><p>Shapes are everywhere if you look closely! Let\'s go on a <strong>shape hunt</strong>.</p><h3>In Your Room</h3><ul><li>Clock — circle!</li><li>Book — rectangle!</li><li>Pizza slice — triangle!</li></ul><h3>Outside</h3><p>Windows are squares or rectangles. Street signs are circles, triangles, or rectangles. Stop signs are octagons (8 sides)!</p><p><strong>Challenge:</strong> Find and draw 5 different shapes you see today.</p>',
            summary: 'You went on a shape hunt and found shapes everywhere!',
            hasInteractive: true },
          { title: 'Drawing with Shapes', type: 'video', duration: 15, objectives: ['Combine shapes to draw pictures', 'Use shapes creatively'],
            html: '<h2>Draw Using Shapes!</h2><p>Everything can be drawn using simple shapes! A house is a square with a triangle on top. A cat is circles and ovals.</p><h3>Try These:</h3><ul><li><strong>House:</strong> Square + Triangle</li><li><strong>Sun:</strong> Circle + Small triangles (rays)</li><li><strong>Tree:</strong> Rectangle (trunk) + Circle (leaves)</li><li><strong>Car:</strong> Rectangle + Two circles (wheels)</li></ul><p>Draw a picture using only circles, squares, triangles, and rectangles!</p>',
            summary: 'You learned to draw pictures using basic shapes.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Shape Patterns', type: 'standard', duration: 10, objectives: ['Create patterns with shapes', 'Extend shape sequences'],
            html: '<h2>Patterns with Shapes</h2><p>Shapes can make patterns too! A pattern is something that repeats.</p><p><strong>Example:</strong> Circle, Square, Circle, Square — what comes next? Circle! The pattern repeats every two shapes.</p><p><strong>Try these patterns:</strong></p><ul><li>Triangle, Triangle, Circle — Triangle, Triangle, ___</li><li>Big circle, small circle, big circle, small circle — ___</li></ul><p><strong>Create Your Own:</strong> Draw a pattern with 3 different shapes and ask a friend to continue it!</p>',
            summary: 'You learned to make and extend shape patterns.',
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C3: Animal Adventures (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Animal Adventures', slug: 'animal-adventures', description: 'Explore the amazing world of animals! From farm to jungle, meet creatures big and small.', difficulty: 'beginner', category: 'Science', ageGroup: '6-12', thumbIdx: 0,
    accessCats: ['dyslexia', 'asd'],
    chapters: [
      {
        title: 'Farm Animals', desc: 'Meet animals that live on a farm.',
        lessons: [
          { title: 'Cows, Sheep, and Horses', type: 'standard', duration: 10, objectives: ['Identify farm animals', 'Learn animal sounds', 'Understand what farms are'],
            html: '<h2>Farm Friends</h2><p>Farms are home to many friendly animals. Cows give us milk. Sheep give us wool. Horses help us travel.</p><p>The cow says "Moo!" The sheep says "Baa!" The horse says "Neigh!"</p>',
            summary: 'You met cows, sheep, and horses.' },
          { title: 'Chickens, Ducks, and Pigs', type: 'standard', duration: 8, objectives: ['Identify more farm animals', 'Learn what they eat'],
            html: '<h2>More Farm Friends</h2><p>Chickens lay eggs. Ducks love water. Pigs love to roll in mud!</p>',
            summary: 'You learned about chickens, ducks, and pigs.' },
        ]
      },
      {
        title: 'Wild Animals', desc: 'Discover animals in the wild.',
        lessons: [
          { title: 'Lions, Tigers, and Bears', type: 'standard', duration: 10, objectives: ['Identify wild animals', 'Learn where they live'],
            html: '<h2>Wild and Free</h2><p>Lions are called the kings of the jungle. Tigers have beautiful stripes. Bears love honey and fish.</p>',
            summary: 'You learned about lions, tigers, and bears.' },
          { title: 'Ocean Animals', type: 'video', duration: 12, objectives: ['Identify ocean animals', 'Learn about sea life'],
            html: '<h2>Under the Sea</h2><p>The ocean is full of amazing animals! <strong>Dolphins</strong> are smart and playful. <strong>Whales</strong> are the biggest animals on Earth. <strong>Turtles</strong> swim slowly and live a very long time.</p><ul><li>Fish come in every color of the rainbow!</li><li>Octopuses have eight arms and are very clever.</li><li>Starfish can grow back lost arms!</li></ul><p>The ocean is home to millions of animals. We need to keep it clean and safe for them.</p>',
            summary: 'You explored the amazing animals that live in the ocean.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Birds in the Sky', type: 'standard', duration: 10, objectives: ['Identify common birds', 'Learn about bird features'],
            html: '<h2>Beautiful Birds</h2><p>Birds have <strong>feathers</strong>, <strong>wings</strong>, and <strong>beaks</strong>. Most birds can fly!</p><h3>Birds You Might See</h3><ul><li><strong>Sparrows</strong> — small brown birds that hop on the ground</li><li><strong>Robins</strong> — have a red chest and sing beautiful songs</li><li><strong>Eagles</strong> — large birds that soar high in the sky</li><li><strong>Parrots</strong> — colorful birds that can mimic human speech</li></ul><p>Look outside! How many birds can you spot today?</p>',
            summary: 'You learned about different kinds of birds.',
            hasInteractive: true },
        ]
      },
      {
        title: 'More About Animals', desc: 'Learn about insects, bugs, and where animals live.',
        lessons: [
          { title: 'Insects and Bugs', type: 'practice', duration: 12, objectives: ['Identify common insects', 'Learn insect body parts'],
            html: '<h2>Insects Are Everywhere!</h2><p>Insects are small animals with <strong>six legs</strong> and <strong>three body parts</strong>. They are the most numerous animals on Earth!</p><h3>Common Insects</h3><ul><li><strong>Ants</strong> — live in big groups called colonies</li><li><strong>Bees</strong> — make honey and help flowers grow</li><li><strong>Butterflies</strong> — have beautiful colorful wings</li><li><strong>Ladybugs</strong> — red with black spots, eat garden pests</li></ul><p><strong>Activity:</strong> Go outside and look for insects. Count how many you find in 5 minutes!</p>',
            summary: 'You learned about insects and their body parts.',
            hasInteractive: true },
          { title: 'Animal Habitats', type: 'video', duration: 12, objectives: ['Understand what a habitat is', 'Match animals to their habitats'],
            html: '<h2>Where Do Animals Live?</h2><p>A <strong>habitat</strong> is the natural home of an animal. Different animals need different habitats to survive.</p><ul><li><strong>Forests</strong> — home to deer, bears, squirrels, and owls</li><li><strong>Oceans</strong> — home to fish, whales, dolphins, and crabs</li><li><strong>Deserts</strong> — home to camels, lizards, and snakes</li><li><strong>Arctic</strong> — home to polar bears, penguins, and seals</li></ul><p>Every animal has a home that gives it food, water, and shelter!</p>',
            summary: 'You learned about different animal habitats around the world.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
      {
        title: 'Animal Life', desc: 'Discover animal babies, food, and tracks.',
        lessons: [
          { title: 'Animal Babies', type: 'standard', duration: 10, objectives: ['Name baby animals', 'Match babies to parents'],
            html: '<h2>Cute Animal Babies!</h2><p>Baby animals have special names! Some are different from their parents\' names.</p><ul><li>A baby <strong>cat</strong> is a <strong>kitten</strong></li><li>A baby <strong>dog</strong> is a <strong>puppy</strong></li><li>A baby <strong>cow</strong> is a <strong>calf</strong></li><li>A baby <strong>horse</strong> is a <strong>foal</strong></li><li>A baby <strong>sheep</strong> is a <strong>lamb</strong></li><li>A baby <strong>duck</strong> is a <strong>duckling</strong></li></ul><p>Most animal parents take care of their babies until they are big enough to survive on their own!</p>',
            summary: 'You learned the names of baby animals.',
            hasInteractive: true },
          { title: 'What Animals Eat', type: 'standard', duration: 10, objectives: ['Classify animals by diet', 'Understand food chains'],
            html: '<h2>Animal Dinner Time!</h2><p>Different animals eat different foods. Scientists group animals by what they eat.</p><h3>Herbivores</h3><p>Animals that eat only plants. Cows, horses, rabbits, and deer are herbivores.</p><h3>Carnivores</h3><p>Animals that eat only meat. Lions, tigers, wolves, and sharks are carnivores.</p><h3>Omnivores</h3><p>Animals that eat both plants and meat. Bears, pigs, chickens, and humans are omnivores!</p><p><strong>Activity:</strong> What do you eat for dinner? Are you an herbivore, carnivore, or omnivore?</p>',
            summary: 'You learned what different animals eat.' },
          { title: 'Animal Tracks', type: 'practice', duration: 8, objectives: ['Recognize animal tracks', 'Learn what tracks tell us'],
            html: '<h2>Follow the Tracks!</h2><p>Animals leave footprints called <strong>tracks</strong>. You can tell which animal passed by looking at its tracks!</p><ul><li><strong>Dog tracks</strong> — four round toes and a pad</li><li><strong>Bird tracks</strong> — three long toes pointing forward</li><li><strong>Cat tracks</strong> — four round toes, no claw marks (cats hide their claws!)</li><li><strong>Rabbit tracks</strong> — two big back feet, two small front feet</li></ul><p><strong>Activity:</strong> Next time it snows or rains, look for animal tracks in the mud or snow!</p>',
            summary: 'You learned how to recognize different animal tracks.',
            hasInteractive: true,
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C4: My First Science Experiments (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'My First Science Experiments', slug: 'first-science', description: 'Fun and safe science experiments you can try at home!', difficulty: 'beginner', category: 'Science', ageGroup: '6-12', thumbIdx: 7,
    accessCats: ['adhd', 'asd'],
    chapters: [
      {
        title: 'Water Wonders', desc: 'Discover what water can do.',
        lessons: [
          { title: 'Sink or Float?', type: 'standard', duration: 10, objectives: ['Predict if objects sink or float', 'Understand density'],
            html: '<h2>Sink or Float?</h2><p>Why do some things float and others sink? A rock sinks because it is heavy for its size. A rubber duck floats because it is light.</p><p><strong>Try this:</strong> Fill a bowl with water. Drop in a coin. Now drop in a crayon. Which floats?</p>',
            summary: 'You learned why things sink or float.' },
          { title: 'Making Rainbows', type: 'standard', duration: 10, objectives: ['Understand how rainbows form', 'Mix colors'],
            html: '<h2>Making Rainbows</h2><p>Rainbows happen when sunlight passes through water drops. You can make your own rainbow with a glass of water and a sunny window!</p>',
            summary: 'You learned how rainbows are made.' },
        ]
      },
      {
        title: 'Science Magic', desc: 'Exciting experiments that look like magic!',
        lessons: [
          { title: 'Magnetic Attraction', type: 'standard', duration: 12, objectives: ['Understand how magnets work', 'Test magnetic vs non-magnetic objects'],
            html: '<h2>Magnet Magic!</h2><p>Magnets create an invisible force called <strong>magnetism</strong>. They pull on things made of iron or steel.</p><h3>What Magnets Do</h3><ul><li>Attract (pull) metal objects like paperclips and nails</li><li>Have two ends called <strong>north</strong> and <strong>south</strong></li><li>Opposite ends attract, same ends push apart</li></ul><p><strong>Try This:</strong> Walk around your house with a magnet. Which things stick to it? Make two piles: magnetic and not magnetic!</p>',
            summary: 'You learned how magnets work and tested what they attract.',
            hasInteractive: true },
          { title: 'Making Volcanoes', type: 'video', duration: 15, objectives: ['Create a chemical reaction', 'Understand acid-base reactions'],
            html: '<h2>Erupting Volcano!</h2><p>You can make a volcano erupt using <strong>baking soda</strong> and <strong>vinegar</strong>! When they mix, they create a gas called carbon dioxide that bubbles up!</p><h3>What You Need</h3><ul><li>A small plastic bottle</li><li>Baking soda</li><li>Vinegar</li><li>A tray to catch the mess!</li></ul><p><strong>Steps:</strong> Put 2 spoonfuls of baking soda in the bottle. Add a few drops of dish soap. Pour in some vinegar and watch it erupt!</p><p><em>Always do this with a grown-up nearby!</em></p>',
            summary: 'You created a baking soda and vinegar volcano!',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Balloon Rocket', type: 'practice', duration: 12, objectives: ['Understand thrust and motion', 'Build a balloon rocket'],
            html: '<h2>Balloon Rocket!</h2><p>Air rushing out of a balloon can push it forward! This is called <strong>thrust</strong>. Real rockets use thrust to fly into space!</p><h3>Make Your Own Rocket</h3><ol><li>Tie a string across the room</li><li>Thread a straw onto the string</li><li>Tape a blown-up balloon to the straw</li><li>Let go and watch it zoom!</li></ol><p>The air pushes out the back and the balloon zooms forward. That\'s science in action!</p>',
            summary: 'You built a balloon rocket and learned about thrust!',
            hasInteractive: true },
        ]
      },
      {
        title: 'Exploring Science', desc: 'More fun experiments to try!',
        lessons: [
          { title: 'Plant Growth', type: 'standard', duration: 15, objectives: ['Understand what plants need to grow', 'Observe plant growth stages'],
            html: '<h2>Watch Plants Grow!</h2><p>Plants need four things to grow: <strong>water</strong>, <strong>sunlight</strong>, <strong>air</strong>, and <strong>soil</strong>.</p><h3>Try This Experiment</h3><p>Take two identical seeds. Plant one in soil with water and sunlight. Put the other in a dark closet with no water. What happens?</p><p>After one week, check both. The one with sun and water will have sprouted! Plants need care to grow strong, just like you!</p>',
            summary: 'You learned what plants need to grow healthy.',
            hasInteractive: true },
          { title: 'Shadow Puppets', type: 'standard', duration: 10, objectives: ['Understand how shadows form', 'Create shadow shapes'],
            html: '<h2>Shadow Puppet Theater!</h2><p>Shadows happen when <strong>light</strong> is blocked by an <strong>object</strong>. The object stops the light and a dark shape appears behind it.</p><h3>Make Shadow Puppets</h3><ol><li>Turn on a flashlight and point it at a wall</li><li>Put your hand between the light and the wall</li><li>Move your fingers to make shapes!</li></ol><p>Try making a dog, a bird, or a spider using just your hands!</p>',
            summary: 'You learned how shadows form and made hand shadow puppets.' },
          { title: 'Sound Vibrations', type: 'video', duration: 12, objectives: ['Understand that sound comes from vibrations', 'See vibrations in action'],
            html: '<h2>Sound is a Vibration!</h2><p>All sounds come from <strong>vibrations</strong>. When something moves back and forth very fast, it creates sound waves.</p><h3>Experiments</h3><p><strong>Rubber Band Guitar:</strong> Stretch a rubber band around a box. Pluck it — can you see it vibrate?</p><p><strong>Dancing Rice:</strong> Put rice on a balloon stretched over a bowl. Tap the bowl and watch the rice jump!</p><p>The harder you tap, the bigger the vibration — the louder the sound!</p>',
            summary: 'You learned that sound comes from vibrations.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Ice Melting', type: 'practice', duration: 10, objectives: ['Observe phase change from solid to liquid', 'Test what makes ice melt faster'],
            html: '<h2>Ice Melting Race!</h2><p>Ice is water in <strong>solid</strong> form. When it warms up, it <strong>melts</strong> and becomes liquid water.</p><h3>Melting Race Experiment</h3><p>Get three ice cubes. Put each on a different surface:</p><ul><li>One in a sunny window</li><li>One in the shade</li><li>One in a bowl of warm water</li></ul><p>Which melts first? The warm water one will win! Heat makes ice melt faster.</p>',
            summary: 'You observed ice melting and learned what makes it melt faster.',
            hasInteractive: true },
          { title: 'Color Chromatography', type: 'standard', duration: 12, objectives: ['Separate colors using paper', 'Understand chromatography'],
            html: '<h2>Hidden Colors Revealed!</h2><p>Did you know black ink is actually made of many colors? <strong>Chromatography</strong> is a way to separate them.</p><h3>Try This</h3><ol><li>Draw a dot with a black marker on a coffee filter</li><li>Dip the edge in water (don\'t wet the dot!)</li><li>Watch as water climbs up and separates the colors!</li></ol><p>You might see blue, red, yellow, and purple appear! Different ink brands have different color recipes.</p>',
            summary: 'You used chromatography to reveal hidden colors in ink.',
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C5: Healthy Habits for Kids (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Healthy Habits for Kids', slug: 'healthy-habits', description: 'Learn how to stay healthy, strong, and happy!', difficulty: 'beginner', category: 'Health', ageGroup: '6-12', thumbIdx: 2,
    accessCats: ['asd', 'dyslexia'],
    chapters: [
      {
        title: 'Eating Well', desc: 'Learn about good foods.',
        lessons: [
          { title: 'Colors on Your Plate', type: 'standard', duration: 8, objectives: ['Identify healthy foods', 'Understand food groups'],
            html: '<h2>Eat the Rainbow</h2><p>Healthy food comes in many colors! Green vegetables, red fruits, orange carrots, yellow corn, purple grapes.</p><p>Try to eat different colors every day!</p>',
            summary: 'You learned about eating colorful, healthy foods.' },
        ]
      },
      {
        title: 'Staying Active', desc: 'Why moving your body is important.',
        lessons: [
          { title: 'Move and Play', type: 'standard', duration: 8, objectives: ['Understand why exercise matters', 'Learn fun ways to move'],
            html: '<h2>Move Your Body!</h2><p>Running, jumping, dancing — all these activities make your heart strong. Try to play outside for at least 30 minutes every day!</p>',
            summary: 'You learned why exercise is important.' },
        ]
      },
      {
        title: 'Taking Care of You', desc: 'Daily habits for a healthy body.',
        lessons: [
          { title: 'Brushing Teeth', type: 'video', duration: 8, objectives: ['Learn proper tooth brushing technique', 'Understand why brushing matters'],
            html: '<h2>Brush for a Bright Smile!</h2><p>Brushing your teeth keeps them strong and healthy! You should brush <strong>twice a day</strong> — morning and night.</p><h3>How to Brush</h3><ol><li>Put a pea-sized amount of toothpaste on your brush</li><li>Brush in small circles for 2 minutes</li><li>Brush the front, back, and top of every tooth</li><li>Don\'t forget your tongue!</li><li>Rinse and smile!</li></ol><p>Sing the ABC song twice while brushing — that\'s 2 minutes!</p>',
            summary: 'You learned how to brush your teeth properly.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Washing Hands', type: 'video', duration: 8, objectives: ['Learn proper hand washing', 'Understand germ prevention'],
            html: '<h2>Wash Away Germs!</h2><p>Germs are tiny living things that can make you sick. Washing your hands with soap and water kills germs!</p><h3>When to Wash</h3><ul><li>Before eating</li><li>After using the bathroom</li><li>After playing outside</li><li>After coughing or sneezing</li><li>After touching pets</li></ul><h3>How to Wash</h3><p>Wet your hands, add soap, scrub for 20 seconds (sing "Happy Birthday" twice!), rinse, and dry!</p>',
            summary: 'You learned when and how to wash your hands.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Drinking Water', type: 'standard', duration: 8, objectives: ['Understand why water is important', 'Know how much water to drink'],
            html: '<h2>Water is Amazing!</h2><p>Your body is about <strong>60% water</strong>! Water helps you think, play, and stay healthy.</p><h3>Why Water Matters</h3><ul><li>Gives you energy</li><li>Helps your brain work</li><li>Keeps your skin healthy</li><li>Helps your body digest food</li></ul><p><strong>Tip:</strong> Drink a glass of water when you wake up, with every meal, and after playing outside. Aim for 6-8 glasses a day!</p>',
            summary: 'You learned why drinking water keeps you healthy.' },
          { title: 'Sleep Time', type: 'standard', duration: 8, objectives: ['Understand why sleep is important', 'Build good bedtime habits'],
            html: '<h2>Time for Sweet Dreams!</h2><p>Sleep is when your body rests and grows. Kids need <strong>9-11 hours</strong> of sleep every night!</p><h3>Sleep Helps You</h3><ul><li>Learn better at school</li><li>Have more energy to play</li><li>Stay healthy and strong</li><li>Feel happy</li></ul><h3>Good Bedtime Habits</h3><p>Go to bed at the same time every night. Turn off screens 30 minutes before bed. Read a calm book or listen to soft music.</p>',
            summary: 'You learned why sleep is important for growing kids.' },
        ]
      },
      {
        title: 'Safety and Feelings', desc: 'Stay safe and understand your emotions.',
        lessons: [
          { title: 'Safety Rules', type: 'video', duration: 10, objectives: ['Learn important safety rules', 'Know what to do in emergencies'],
            html: '<h2>Stay Safe!</h2><p>Safety rules protect you and your family. Here are the most important ones:</p><h3>At Home</h3><ul><li>Never touch electrical outlets</li><li>Don\'t play with matches or lighters</li><li>Keep sharp objects away from little kids</li></ul><h3>Outside</h3><ul><li>Look both ways before crossing the street</li><li>Never go anywhere with a stranger</li><li>Wear a helmet when riding a bike</li></ul><h3>Emergency Numbers</h3><p>Know your home address and your parents\' phone numbers. In an emergency, call 911 (or your local emergency number).</p>',
            summary: 'You learned important safety rules at home and outside.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Feelings and Emotions', type: 'practice', duration: 12, objectives: ['Identify different emotions', 'Learn healthy ways to express feelings'],
            html: '<h2>All Feelings Are OK!</h2><p>Everyone has feelings! <strong>Happy</strong>, <strong>sad</strong>, <strong>angry</strong>, <strong>scared</strong>, <strong>excited</strong> — they are all normal.</p><h3>Name Your Feeling</h3><p>When you have a strong feeling, stop and name it. "I feel frustrated." "I feel happy!" Naming it helps you understand it.</h3><h3>Healthy Ways to Express</h3><ul><li><strong>Angry:</strong> Take deep breaths, count to 10</li><li><strong>Sad:</strong> Talk to a grown-up, get a hug</li><li><strong>Scared:</strong> Tell someone, turn on a nightlight</li><li><strong>Happy:</strong> Share your joy with others!</li></ul><p>Remember: All feelings are OK. It\'s what you DO with them that matters!</p>',
            summary: 'You learned to identify feelings and express them in healthy ways.',
            hasInteractive: true },
          { title: 'Helping at Home', type: 'practice', duration: 10, objectives: ['Learn age-appropriate chores', 'Understand responsibility'],
            html: '<h2>Teamwork Makes It Work!</h2><p>Helping at home makes you a great family <strong>team player</strong>! Here are ways kids can help:</p><h3>Chores You Can Do</h3><ul><li>Make your bed every morning</li><li>Put toys away when done playing</li><li>Set the table for dinner</li><li>Feed pets</li><li>Water plants</li><li>Sort laundry by color</li></ul><p>Helping makes you feel proud and responsible. Ask your parent what chore you can do today!</p>',
            summary: 'You learned how helping at home builds responsibility.',
            hasInteractive: true },
          { title: 'Sun Safety', type: 'standard', duration: 8, objectives: ['Understand sun protection', 'Learn sun-safe habits'],
            html: '<h2>Fun in the Sun — Stay Safe!</h2><p>The sun feels warm and nice, but too much sun can hurt your skin. Follow these <strong>sun safety</strong> tips:</p><ul><li>Wear sunscreen with SPF 30 or higher</li><li>Reapply every 2 hours and after swimming</li><li>Wear a hat and sunglasses</li><li>Stay in the shade when the sun is strongest (10 AM to 4 PM)</li><li>Drink lots of water</li></ul><p>Protect your skin today so it stays healthy forever!</p>',
            summary: 'You learned how to stay safe while having fun in the sun.',
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C6: Introduction to Reading (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Introduction to Reading', slug: 'intro-reading', description: 'Begin your reading adventure! Learn letters, sounds, and simple words.', difficulty: 'beginner', category: 'Reading & Literacy', ageGroup: '6-12', thumbIdx: 1,
    accessCats: ['dyslexia', 'adhd'],
    chapters: [
      {
        title: 'Phonics Fun', desc: 'Learn the sounds letters make.',
        lessons: [
          { title: 'Letter Sounds A-M', type: 'standard', duration: 10, objectives: ['Recognize letters A-M', 'Learn letter sounds'],
            html: '<h2>Letters and Their Sounds</h2><p>A says "ah" like apple. B says "buh" like ball. C says "cuh" like cat.</p><p>Let\'s practice: A is for Apple. B is for Ball. C is for Cat. D is for Dog.</p>',
            summary: 'You learned the sounds of letters A through M.' },
          { title: 'Letter Sounds N-Z', type: 'standard', duration: 10, objectives: ['Recognize letters N-Z', 'Learn letter sounds'],
            html: '<h2>More Letter Sounds</h2><p>N says "nn" like nose. O says "oh" like octopus. P says "puh" like puppy.</p>',
            summary: 'You learned letters N through Z.' },
        ]
      },
      {
        title: 'First Words', desc: 'Put letters together to read!',
        lessons: [
          { title: 'Three-Letter Words', type: 'standard', duration: 10, objectives: ['Read simple words', 'Sound out letters'],
            html: '<h2>Reading Simple Words</h2><p>Let\'s put sounds together: C-A-T = Cat! D-O-G = Dog!</p><p>Try these: HAT, SUN, RUN, BIG, RED.</p>',
            summary: 'You read your first words!' },
          { title: 'Sight Words', type: 'video', duration: 10, objectives: ['Recognize common sight words', 'Read sight words by memory'],
            html: '<h2>Words You Know by Sight!</h2><p><strong>Sight words</strong> are common words that you learn to recognize without sounding them out. Many of them don\'t follow the usual phonics rules!</p><h3>Top Sight Words</h3><p>the, and, is, it, in, to, a, I, you, that, he, she, was, for, on, are, with, they, this</p><p><strong>Practice:</strong> Write each sight word on a card. Flip through them and say each word as fast as you can!</p>',
            summary: 'You learned to recognize common sight words.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Word Families', type: 'standard', duration: 10, objectives: ['Recognize word families', 'Read words with similar patterns'],
            html: '<h2>Word Families!</h2><p>Word families are groups of words that share the same ending sound. Learning one helps you read many!</p><h3>The "-at" Family</h3><p>c + at = cat, h + at = hat, b + at = bat, r + at = rat, s + at = sat, m + at = mat</p><h3>The "-og" Family</h3><p>d + og = dog, l + og = log, h + og = hog, f + og = fog</p><p><strong>Try it:</strong> Can you read all of these? Notice how just the first letter changes!</p>',
            summary: 'You learned about word families — groups of words with the same ending.',
            hasInteractive: true },
        ]
      },
      {
        title: 'Reading Together', desc: 'Build reading confidence with stories and sentences.',
        lessons: [
          { title: 'Simple Sentences', type: 'standard', duration: 10, objectives: ['Read short sentences', 'Understand sentence structure'],
            html: '<h2>Let\'s Read Sentences!</h2><p>A <strong>sentence</strong> is a group of words that tells a complete idea. It starts with a capital letter and ends with a period.</p><h3>Try Reading These</h3><ul><li><strong>The cat sat on the mat.</strong></li><li><strong>I see a red ball.</strong></li><li><strong>She can run fast.</strong></li><li><strong>The dog is big and brown.</strong></li></ul><p>Read each sentence slowly at first, then try to read it faster. You are reading!</p>',
            summary: 'You learned to read simple sentences.' },
          { title: 'Rhyming Words', type: 'video', duration: 10, objectives: ['Identify rhyming words', 'Create rhyming pairs'],
            html: '<h2>Words That Rhyme!</h2><p>Rhyming words have the same ending sound. <strong>Cat</strong> and <strong>hat</strong> rhyme. <strong>Sun</strong> and <strong>fun</strong> rhyme!</p><h3>Read and Rhyme</h3><p>Can you finish these rhymes?</p><ul><li>The sky is so ___ (blue / red)</li><li>I see a mouse in my ___ (house / car)</li><li>A little bee sits on a ___ (tree / rug)</li></ul><p>Making rhymes is fun and helps you become a better reader!</p>',
            summary: 'You learned to find and create rhyming words.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Story Time', type: 'practice', duration: 15, objectives: ['Read a short story', 'Answer questions about the story'],
            html: '<h2>Let\'s Read a Story!</h2><p>Reading stories is the most fun part of learning to read! Let\'s read <strong>"The Cat and the Rat"</strong>.</p><p><em>A cat sat on a mat. A rat ran to the mat. The cat saw the rat. The rat ran away. The cat is sad. The rat is glad!</em></p><p><strong>Questions:</strong></p><ul><li>Who sat on the mat?</li><li>Who ran to the mat?</li><li>How does the cat feel at the end?</li></ul><p>You read an entire story! Great work!</p>',
            summary: 'You read and understood a short story.',
            hasInteractive: true },
          { title: 'Blends and Digraphs', type: 'standard', duration: 12, objectives: ['Recognize consonant blends', 'Recognize digraphs'],
            html: '<h2>Blends and Digraphs</h2><p>Sometimes two letters come together to make a special sound.</p><h3>Consonant Blends</h3><p>Two consonants whose sounds blend together: <strong>bl</strong> (blue), <strong>cr</strong> (crab), <strong>st</strong> (star), <strong>tr</strong> (tree), <strong>fl</strong> (flag)</p><h3>Digraphs</h3><p>Two letters that make one new sound: <strong>sh</strong> (ship), <strong>ch</strong> (chip), <strong>th</strong> (this), <strong>wh</strong> (whale), <strong>ph</strong> (phone)</p><p><strong>Practice:</strong> Read these words: shop, chat, thin, whip, blue, crab, stop, tree</p>',
            summary: 'You learned about consonant blends and digraphs.',
            hasInteractive: true },
          { title: 'Reading Comprehension', type: 'standard', duration: 12, objectives: ['Understand what you read', 'Answer comprehension questions'],
            html: '<h2>Understanding What You Read</h2><p>Reading is not just saying words — it\'s understanding them too! That\'s called <strong>comprehension</strong>.</p><h3>Tips for Understanding</h3><ul><li>Read slowly and think about each sentence</li><li>Picture the story in your mind</li><li>Ask yourself: Who? What? Where? When? Why?</li></ul><h3>Practice Passage</h3><p><em>Tom has a pet frog. The frog is green and small. It lives in a tank with water and rocks. Tom feeds it bugs every day.</em></p><p><strong>Questions:</strong> What color is the frog? Where does it live? What does Tom feed it?</p>',
            summary: 'You practiced understanding what you read.',
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C7: Fun With Nature (age 6-12)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Fun With Nature', slug: 'fun-nature', description: 'Explore the natural world around us. Trees, weather, seasons and more!', difficulty: 'beginner', category: 'Science', ageGroup: '6-12', thumbIdx: 4,
    accessCats: ['visual', 'adhd'],
    chapters: [
      {
        title: 'Weather and Seasons', desc: 'Learn about the weather.',
        lessons: [
          { title: 'Sun, Rain, and Snow', type: 'standard', duration: 8, objectives: ['Identify weather types', 'Understand seasons'],
            html: '<h2>What\'s the Weather?</h2><p>The sun gives us warm, bright days. Rain helps plants grow. Snow covers the ground like a white blanket.</p><p>Spring is warm, Summer is hot, Fall is cool, Winter is cold!</p>',
            summary: 'You learned about weather and seasons.' },
          { title: 'Weather Instruments', type: 'video', duration: 10, objectives: ['Learn about weather tools', 'Understand what each tool measures'],
            html: '<h2>Weather Watching Tools!</h2><p>Scientists use special tools to measure and predict the weather.</p><ul><li><strong>Thermometer</strong> — measures temperature</li><li><strong>Rain gauge</strong> — measures rainfall</li><li><strong>Wind vane</strong> — shows wind direction</li><li><strong>Anemometer</strong> — measures wind speed</li><li><strong>Barometer</strong> — measures air pressure</li></ul><p>Look outside — can you guess the temperature today?</p>',
            summary: 'You learned about weather measuring tools.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Seasons Changing', type: 'standard', duration: 10, objectives: ['Identify the four seasons', 'Describe seasonal changes'],
            html: '<h2>The Four Seasons</h2><p>Each year goes through <strong>four seasons</strong>.</p><h3>Spring</h3><p>Flowers bloom, baby animals are born, weather gets warmer.</p><h3>Summer</h3><p>Hottest season! Lots of sunshine for swimming and playing outside.</p><h3>Fall (Autumn)</h3><p>Leaves change color and fall off trees.</p><h3>Winter</h3><p>Coldest season! Snow falls in many places.</p><p><strong>Activity:</strong> Draw a picture of your favorite season!</p>',
            summary: 'You learned about the four seasons.',
            hasInteractive: true },
          { title: 'The Water Cycle', type: 'video', duration: 12, objectives: ['Understand the water cycle', 'Name evaporation, condensation, precipitation'],
            html: '<h2>Water Goes in a Circle!</h2><p>Water is always moving in a never-ending circle called the <strong>water cycle</strong>.</p><h3>3 Steps</h3><ol><li><strong>Evaporation:</strong> Sun heats water, turns to vapor, rises</li><li><strong>Condensation:</strong> Vapor cools and forms clouds</li><li><strong>Precipitation:</strong> Clouds get heavy, water falls as rain or snow</li></ol><p>Then water goes back into lakes and the cycle starts again!</p>',
            summary: 'You learned how water moves through the water cycle.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
      {
        title: 'Plants and Trees', desc: 'Discover the plant world.',
        lessons: [
          { title: 'Trees and Leaves', type: 'standard', duration: 10, objectives: ['Identify parts of a tree', 'Identify leaf shapes'],
            html: '<h2>Wonderful Trees!</h2><p>Trees give us shade, fruit, and clean air!</p><h3>Parts of a Tree</h3><ul><li><strong>Roots:</strong> Hold the tree and drink water</li><li><strong>Trunk:</strong> Strong middle part</li><li><strong>Branches:</strong> Arms that reach out</li><li><strong>Leaves:</strong> Make food from sunlight</li></ul><p>Collect different leaves and compare their shapes!</p>',
            summary: 'You learned about trees and leaves.',
            hasInteractive: true },
          { title: 'Flowers and Plants', type: 'standard', duration: 10, objectives: ['Identify parts of a flower', 'Understand how plants grow'],
            html: '<h2>Beautiful Flowers!</h2><p>Flowers come in every color and smell wonderful!</p><h3>Parts of a Flower</h3><ul><li><strong>Petal:</strong> Colorful part that attracts bees</li><li><strong>Stem:</strong> Holds the flower up</li><li><strong>Leaf:</strong> Catches sunlight</li><li><strong>Roots:</strong> In the ground, drink water</li></ul><p>Bees visit flowers for nectar and spread pollen so new flowers grow!</p>',
            summary: 'You learned about flowers and how plants grow.' },
        ]
      },
      {
        title: 'Earth and Sky', desc: 'Explore rocks, sky, and space.',
        lessons: [
          { title: 'Rock Types', type: 'standard', duration: 10, objectives: ['Identify three rock types', 'Understand how rocks form'],
            html: '<h2>Rocks Rock!</h2><p><strong>Three types</strong> of rocks:</p><ul><li><strong>Igneous:</strong> Formed when melted rock cools (granite, obsidian)</li><li><strong>Sedimentary:</strong> Sand and mud squished together (sandstone, limestone)</li><li><strong>Metamorphic:</strong> Changed by heat and pressure (marble)</li></ul><p>Start a rock collection — how many types can you find?</p>',
            summary: 'You learned about igneous, sedimentary, and metamorphic rocks.',
            hasInteractive: true },
          { title: 'Day and Night', type: 'video', duration: 10, objectives: ['Understand day and night', 'Learn about Earth rotation'],
            html: '<h2>Why Is It Dark at Night?</h2><p>The Earth <strong>spins</strong> like a top! It takes 24 hours to spin once.</p><p>When your side faces the sun, it is <strong>day</strong>. When your side faces away, it is <strong>night</strong>.</p><p>On the other side of the world, children are sleeping while you learn!</p>',
            summary: 'You learned why the sun rises and sets.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { title: 'Moon Phases', type: 'standard', duration: 12, objectives: ['Identify moon phases', 'Understand why the moon changes shape'],
            html: '<h2>The Moon Changes Shape!</h2><h3>8 Phases</h3><ol><li>New Moon</li><li>Waxing Crescent</li><li>First Quarter</li><li>Waxing Gibbous</li><li>Full Moon</li><li>Waning Gibbous</li><li>Last Quarter</li><li>Waning Crescent</li></ol><p>The moon doesn\'t change shape — we see different parts lit by the sun!</p>',
            summary: 'You learned about moon phases.',
            isDraft: true },
        ]
      },
      {
        title: 'Animal Nature', desc: 'Where animals make their homes.',
        lessons: [
          { title: 'Animal Homes', type: 'practice', duration: 10, objectives: ['Identify animal homes', 'Match animals to homes'],
            html: '<h2>Animal Houses!</h2><ul><li><strong>Birds</strong> build nests in trees</li><li><strong>Bears</strong> live in caves or dens</li><li><strong>Bees</strong> build hives</li><li><strong>Spiders</strong> spin webs</li><li><strong>Rabbits</strong> dig burrows</li><li><strong>Beavers</strong> build dams</li></ul><p><strong>Activity:</strong> Go outside and look for animal homes!</p>',
            summary: 'You explored animal homes.',
            hasInteractive: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C8: Introduction to Coding (age 13-17)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Introduction to Coding', slug: 'intro-coding', description: 'Learn the basics of coding! Understand logic, sequences, and how to give instructions.', difficulty: 'intermediate', category: 'Technology', ageGroup: '13-17', thumbIdx: 7,
    accessCats: ['adhd', 'asd'],
    chapters: [
      {
        title: 'What is Code?', desc: 'Understanding what coding means.',
        lessons: [
          { title: 'Code is Everywhere', type: 'standard', duration: 12, objectives: ['Understand what code is', 'See examples of code in daily life'],
            html: '<h2>Code is Everywhere</h2><p>Code is a set of instructions that tells a computer what to do. When you play a video game, code makes it work. When you visit a website, code shows you the page.</p><p>Think of code like a recipe. A recipe tells you step-by-step how to bake a cake. Code tells the computer step-by-step what to do.</p><h3>Everyday Examples</h3><ul><li>Traffic lights use code to change colors</li><li>Washing machines use code for cycles</li><li>Phones use code for apps</li></ul>',
            summary: 'You learned that code is a set of instructions for computers.' },
          { title: 'Algorithms — Step by Step', type: 'standard', duration: 12, objectives: ['Understand what an algorithm is', 'Create simple instructions'],
            html: '<h2>What is an Algorithm?</h2><p>An algorithm is a step-by-step plan for solving a problem. Brushing your teeth follows an algorithm: pick up brush, add toothpaste, brush, rinse, smile!</p><p>Computers follow algorithms millions of times faster than humans.</p>',
            summary: 'You learned what algorithms are and how they work.' },
        ]
      },
      {
        title: 'Simple Commands', desc: 'Learn how to give instructions.',
        lessons: [
          { title: 'Commands and Sequences', type: 'standard', duration: 10, objectives: ['Write simple commands', 'Put commands in sequence'],
            html: '<h2>Giving Commands</h2><p>A command tells the computer what to do. "MOVE FORWARD", "TURN LEFT", "SAY HELLO" are all commands.</p><p>When you put commands in order, that\'s a sequence.</p>',
            summary: 'You learned about commands and sequences.' },
        ]
      },
      {
        title: 'Coding Concepts', desc: 'Core programming concepts explained.',
        lessons: [
          { title: 'Variables', type: 'video', duration: 15, objectives: ['Understand what a variable is', 'Create and use variables'],
            html: '<h2>Variables — Containers for Data</h2><p>A <strong>variable</strong> is like a labeled box that stores information.</p><h3>Code Example</h3><pre><code>playerScore = 100\nplayerName = "Alex"\nlives = 3</code></pre><p>Variables can hold numbers, text, true/false values, and more!</p>',
            summary: 'You learned what variables are and how they store data.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Conditionals', type: 'standard', duration: 15, objectives: ['Understand if/else logic', 'Write conditional statements'],
            html: '<h2>Making Decisions with Code</h2><p><strong>Conditionals</strong> let code make decisions. The most common is the <strong>if/else</strong> statement.</p><h3>Pseudo-code</h3><pre><code>IF score >= 100 THEN\n    print("You win!")\nELSE\n    print("Try again!")\nEND IF</code></pre>',
            summary: 'You learned how conditionals let code make decisions.',
            hasInteractive: true },
          { title: 'Loops', type: 'video', duration: 15, objectives: ['Understand loop structures', 'Write for and while loops'],
            html: '<h2>Loops — Do It Again!</h2><p><strong>Loops</strong> let you repeat actions without writing the same code over and over.</p><h3>While Loops</h3><pre><code>WHILE lives > 0\n    playGame()\n    lives = lives - 1\nEND WHILE</code></pre>',
            summary: 'You learned how loops repeat actions in code.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
      {
        title: 'Applied Coding', desc: 'Put your coding knowledge to work.',
        lessons: [
          { title: 'Functions', type: 'standard', duration: 15, objectives: ['Understand function purpose', 'Define and call functions'],
            html: '<h2>Functions — Code You Can Reuse</h2><p>A <strong>function</strong> is a block of code that does one specific task.</p><h3>Example</h3><pre><code>FUNCTION greet(name)\n    print("Hello, " + name + "!")\nEND FUNCTION\n\ngreet("Alice")\ngreet("Bob")</code></pre>',
            summary: 'You learned how functions help you reuse code.',
            hasInteractive: true },
          { title: 'Debugging', type: 'video', duration: 15, objectives: ['Understand debugging', 'Learn debugging techniques'],
            html: '<h2>Fixing Bugs</h2><p><strong>Debugging</strong> is finding and fixing errors in code.</p><h3>Debugging Tips</h3><ol><li>Read the error message carefully</li><li>Add print statements to see what\'s happening</li><li>Check your assumptions</li><li>Take a break and come back fresh</li></ol>',
            summary: 'You learned techniques for finding code bugs.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Pseudo-code', type: 'standard', duration: 12, objectives: ['Write pseudo-code', 'Plan programs before coding'],
            html: '<h2>Planning with Pseudo-code</h2><p><strong>Pseudo-code</strong> is a way to plan your program using plain English mixed with simple code-like structures.</p><h3>Example: Guessing Game</h3><pre><code>SET secretNumber = random(1, 10)\nWHILE guess != secretNumber\n    ASK user for guess\n    IF guess < secretNumber THEN SAY "Too low!"</code></pre>',
            summary: 'You learned to plan programs using pseudo-code.' },
          { title: 'Flowcharts', type: 'practice', duration: 12, objectives: ['Read a flowchart', 'Create a flowchart'],
            html: '<h2>Visualizing Code with Flowcharts</h2><p>A <strong>flowchart</strong> shows steps in a process using shapes and arrows.</p><h3>Symbols</h3><ul><li><strong>Oval:</strong> Start/End</li><li><strong>Rectangle:</strong> Action</li><li><strong>Diamond:</strong> Decision</li><li><strong>Arrow:</strong> Flow direction</li></ul>',
            summary: 'You learned to create and read flowcharts.',
            hasInteractive: true,
            isDraft: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C9: Digital Literacy & Internet Safety (age 13-17)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Digital Literacy & Internet Safety', slug: 'digital-literacy', description: 'Learn to use the internet safely and wisely. Spot scams, protect your privacy, and be a good digital citizen.', difficulty: 'intermediate', category: 'Technology', ageGroup: '13-17', thumbIdx: 3,
    accessCats: ['dyslexia', 'adhd', 'visual'],
    chapters: [
      {
        title: 'Using the Web', desc: 'How the internet works.',
        lessons: [
          { title: 'What is the Internet?', type: 'standard', duration: 12, objectives: ['Understand the internet', 'Know how websites work'],
            html: '<h2>The Internet Explained</h2><p>The internet is a global network connecting millions of computers.</p>',
            summary: 'You learned what the internet and web browsers are.' },
        ]
      },
      {
        title: 'Staying Safe Online', desc: 'Protect yourself online.',
        lessons: [
          { title: 'Spotting Scams', type: 'standard', duration: 15, objectives: ['Identify common online scams', 'Know what to do'],
            html: '<h2>Don\'t Get Scammed!</h2><p>Not everything online is true.</p><h3>Red Flags</h3><ul><li>"You won a prize!" messages</li><li>Emails asking for your password</li><li>Links that look strange</li></ul>',
            summary: 'You learned how to spot online scams.' },
          { title: 'Protecting Your Privacy', type: 'standard', duration: 12, objectives: ['Understand privacy online', 'Keep information safe'],
            html: '<h2>Keep Your Information Safe</h2><p>Never share your full name, address, phone number, or passwords online without permission.</p>',
            summary: 'You learned how to protect your privacy online.' },
        ]
      },
      {
        title: 'Digital Citizenship', desc: 'Being a good digital citizen.',
        lessons: [
          { title: 'Social Media Safety', type: 'video', duration: 15, objectives: ['Use social media safely', 'Manage privacy settings'],
            html: '<h2>Staying Safe on Social Media</h2><p>Set accounts to <strong>private</strong>. Think before you post — once online, it can last forever.</p><p>Only accept friend requests from people you know in real life.</p>',
            summary: 'You learned how to stay safe on social media.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Cyberbullying', type: 'video', duration: 15, objectives: ['Recognize cyberbullying', 'Know how to respond'],
            html: '<h2>Cyberbullying</h2><p><strong>Cyberbullying</strong> is bullying that happens online.</p><h3>What to Do</h3><ol><li>Don\'t respond</li><li>Save evidence (screenshots)</li><li>Block the person</li><li>Tell a trusted adult</li></ol>',
            summary: 'You learned to recognize cyberbullying and how to respond.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Digital Footprint', type: 'standard', duration: 12, objectives: ['Understand digital footprint', 'Manage online reputation'],
            html: '<h2>Your Digital Footprint</h2><p>Everything you do online leaves a <strong>digital footprint</strong>.</p><p>Colleges and employers often search for applicants online. A positive footprint helps you.</p>',
            summary: 'You learned about digital footprints.',
            hasInteractive: true },
        ]
      },
      {
        title: 'Smart Online Skills', desc: 'Advanced internet skills.',
        lessons: [
          { title: 'Copyright Basics', type: 'standard', duration: 12, objectives: ['Understand copyright', 'Respect intellectual property'],
            html: '<h2>Copyright</h2><p><strong>Copyright</strong> protects creative work.</p><ul><li>Don\'t download music/movies without paying</li><li>Use Creative Commons licensed content</li><li>Cite your sources and give credit!</li></ul>',
            summary: 'You learned the basics of copyright.' },
          { title: 'Evaluating Sources', type: 'practice', duration: 15, objectives: ['Evaluate online sources', 'Distinguish facts from opinions'],
            html: '<h2>Is It True?</h2><p>Use the <strong>CRAAP</strong> test: Currency, Relevance, Authority, Accuracy, Purpose.</p>',
            summary: 'You learned to evaluate sources using CRAAP.',
            hasInteractive: true },
          { title: 'Online Shopping Safety', type: 'video', duration: 12, objectives: ['Shop safely online', 'Recognize fake stores'],
            html: '<h2>Safe Online Shopping</h2><ul><li>Check for <strong>HTTPS</strong></li><li>Read reviews from multiple sources</li><li>Use a credit card (better fraud protection)</li><li>Be wary of too-good-to-be-true prices</li></ul>',
            summary: 'You learned how to shop safely online.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C10: Problem Solving Skills (age 13-17)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Problem Solving Skills', slug: 'problem-solving', description: 'Develop critical thinking skills! Learn to identify problems and find creative solutions.', difficulty: 'intermediate', category: 'Study Skills', ageGroup: '13-17', thumbIdx: 4,
    accessCats: ['asd', 'adhd'],
    chapters: [
      {
        title: 'Identifying Problems', desc: 'Learn to spot problems.',
        lessons: [
          { title: 'What is a Problem?', type: 'standard', duration: 10, objectives: ['Define what a problem is', 'Categorize problems'],
            html: '<h2>Understanding Problems</h2><p>A problem is something that needs solving. Simple (hungry — eat food) or complex (climate change).</p>',
            summary: 'You learned what problems are and how to identify them.' },
        ]
      },
      {
        title: 'Finding Solutions', desc: 'Creative problem solving.',
        lessons: [
          { title: 'Brainstorming Solutions', type: 'standard', duration: 12, objectives: ['Generate solutions', 'Evaluate best solution'],
            html: '<h2>Brainstorming</h2><p>Think of as many solutions as possible — even silly ones! Then pick the best.</p>',
            summary: 'You learned how to brainstorm solutions.' },
        ]
      },
      {
        title: 'Problem Solving Tools', desc: 'Structured approaches.',
        lessons: [
          { title: 'Root Cause Analysis', type: 'video', duration: 15, objectives: ['Find root causes', 'Use 5 Whys'],
            html: '<h2>Finding the Root Cause</h2><h3>The 5 Whys</h3><p>Ask "Why?" repeatedly to find the underlying cause.</p><ol><li>Why? ...</li><li>Why? ...</li><li>Why? ...</li><li>Why? ...</li><li>Why? Root cause!</li></ol>',
            summary: 'You learned the 5 Whys technique.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Decision Making', type: 'standard', duration: 12, objectives: ['Make informed decisions', 'Use pros/cons'],
            html: '<h2>Making Good Decisions</h2><p>Use a <strong>decision matrix</strong>: list options, rate criteria, add scores, pick the winner!</p>',
            summary: 'You learned structured decision-making.',
            hasInteractive: true },
          { title: 'Critical Thinking', type: 'video', duration: 15, objectives: ['Apply critical thinking', 'Question assumptions'],
            html: '<h2>Think Critically!</h2><p>Analyze information objectively.</p><ul><li>What\'s the source?</li><li>What evidence supports it?</li><li>What assumptions am I making?</li></ul>',
            summary: 'You learned critical thinking skills.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
      {
        title: 'Advanced Problem Solving', desc: 'Take it to the next level.',
        lessons: [
          { title: 'Collaboration', type: 'standard', duration: 12, objectives: ['Work in teams', 'Use collaborative techniques'],
            html: '<h2>Solving Problems Together</h2><p><strong>Teamwork:</strong> Divide and conquer, listen actively, build on ideas.</p>',
            summary: 'You learned to collaborate effectively.',
            hasInteractive: true },
          { title: 'Creative Thinking', type: 'practice', duration: 15, objectives: ['Think creatively', 'Use lateral thinking'],
            html: '<h2>Outside the Box</h2><p><strong>SCAMPER:</strong> Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse</p>',
            summary: 'You learned creative thinking techniques.',
            hasInteractive: true },
          { title: 'Evaluating Outcomes', type: 'standard', duration: 10, objectives: ['Evaluate solutions', 'Learn from failure'],
            html: '<h2>Did It Work?</h2><p>Evaluate: Did it solve the problem? What would I do differently? What did I learn?</p>',
            summary: 'You learned to evaluate solutions.' },
          { title: 'Real-World Problems', type: 'practice', duration: 15, objectives: ['Apply problem-solving cycle', 'Practice real scenarios'],
            html: '<h2>Putting It Together</h2><p><strong>Scenario:</strong> Litter in schoolyard. Identify → Root cause → Brainstorm → Decide → Plan → Evaluate.</p>',
            summary: 'You practiced the full problem-solving cycle.',
            hasInteractive: true },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C11: Web Development Fundamentals (age 18+)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Web Development Fundamentals', slug: 'web-dev-fundamentals', description: 'Build your first website! Learn HTML, CSS, and how the web works.', difficulty: 'advanced', category: 'Technology', ageGroup: '18+', thumbIdx: 5,
    accessCats: ['dyslexia', 'visual'],
    chapters: [
      {
        title: 'HTML Basics', desc: 'The building blocks of web pages.',
        lessons: [
          { title: 'Your First HTML Page', type: 'standard', duration: 20, objectives: ['Write basic HTML', 'Understand HTML tags'],
            html: '<h2>Hello, HTML!</h2><p>HTML stands for HyperText Markup Language.</p><pre><code>&lt;!DOCTYPE html&gt;\n&lt;html&gt;\n  &lt;head&gt;&lt;title&gt;My Page&lt;/title&gt;&lt;/head&gt;\n  &lt;body&gt;\n    &lt;h1&gt;Hello World!&lt;/h1&gt;\n    &lt;p&gt;This is my first webpage.&lt;/p&gt;\n  &lt;/body&gt;\n&lt;/html&gt;</code></pre>',
            summary: 'You created your first HTML page.' },
          { title: 'Headings, Paragraphs, and Links', type: 'standard', duration: 15, objectives: ['Use heading tags', 'Create paragraphs', 'Add links'],
            html: '<h2>Structuring Content</h2><p>Use <code>&lt;h1&gt;</code> to <code>&lt;h6&gt;</code> for headings. <code>&lt;p&gt;</code> for paragraphs. <code>&lt;a&gt;</code> for links!</p>',
            summary: 'You learned to structure content with HTML.' },
        ]
      },
      {
        title: 'CSS Styling', desc: 'Make your pages look great.',
        lessons: [
          { title: 'Adding Colors and Fonts', type: 'standard', duration: 15, objectives: ['Add CSS', 'Change colors', 'Change fonts'],
            html: '<h2>Making Things Beautiful</h2><p>CSS controls how HTML looks.</p><p><code>body { font-family: Arial; background-color: #f0f0f0; }</code></p>',
            summary: 'You learned to style web pages with CSS.' },
        ]
      },
      {
        title: 'HTML Advanced', desc: 'More HTML elements.',
        lessons: [
          { title: 'Images and Media', type: 'video', duration: 20, objectives: ['Embed images', 'Add video and audio'],
            html: '<h2>Adding Images</h2><pre><code>&lt;img src="photo.jpg" alt="Description" width="500"&gt;</code></pre><p>Always provide <code>alt</code> text for accessibility!</p>',
            summary: 'You learned to add images and media.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'HTML Tables', type: 'standard', duration: 15, objectives: ['Create HTML tables', 'Use headers'],
            html: '<h2>Tables</h2><pre><code>&lt;table&gt;\n  &lt;tr&gt;&lt;th&gt;Month&lt;/th&gt;&lt;th&gt;Sales&lt;/th&gt;&lt;/tr&gt;\n  &lt;tr&gt;&lt;td&gt;Jan&lt;/td&gt;&lt;td&gt;$5,000&lt;/td&gt;&lt;/tr&gt;\n&lt;/table&gt;</code></pre>',
            summary: 'You learned to create HTML tables.' },
          { title: 'HTML Forms', type: 'standard', duration: 20, objectives: ['Create forms', 'Use input types'],
            html: '<h2>Building Forms</h2><pre><code>&lt;form&gt;\n  &lt;label for="name"&gt;Name:&lt;/label&gt;\n  &lt;input type="text" id="name" required&gt;\n  &lt;button type="submit"&gt;Send&lt;/button&gt;\n&lt;/form&gt;</code></pre>',
            summary: 'You learned to create HTML forms.',
            hasInteractive: true },
        ]
      },
      {
        title: 'CSS Layout', desc: 'Modern CSS layout techniques.',
        lessons: [
          { title: 'CSS Flexbox', type: 'video', duration: 25, objectives: ['Understand Flexbox', 'Create flexible layouts'],
            html: '<h2>Flexbox</h2><pre><code>.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n}</code></pre>',
            summary: 'You learned Flexbox for layouts.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'CSS Grid', type: 'standard', duration: 25, objectives: ['Understand CSS Grid', 'Create 2D layouts'],
            html: '<h2>CSS Grid</h2><pre><code>.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}</code></pre>',
            summary: 'You learned CSS Grid for layouts.' },
          { title: 'Responsive Design', type: 'video', duration: 20, objectives: ['Create responsive layouts', 'Use media queries'],
            html: '<h2>Responsive Design</h2><pre><code>@media (min-width: 768px) {\n  .container { grid-template-columns: repeat(2, 1fr); }\n}</code></pre>',
            summary: 'You learned responsive design.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        ]
      },
    ]
  },
  // ═══════════════════════════════════════════════════════════════════
  // C12: Mastering Web Accessibility (age 18+)
  // ═══════════════════════════════════════════════════════════════════
  {
    title: 'Mastering Web Accessibility (W3C Standard)', slug: 'mastering-accessibility', description: 'Learn to create inclusive digital experiences that comply with WCAG 2.2 standards. Covers the four POUR principles.', difficulty: 'advanced', category: 'Accessibility', ageGroup: '18+', thumbIdx: 5,
    accessCats: ['adhd', 'dyslexia', 'asd', 'visual'],
    chapters: [
      {
        title: 'Foundations of Accessibility', desc: 'Understanding why accessibility matters.',
        lessons: [
          { title: 'What is Web Accessibility?', type: 'standard', duration: 15, objectives: ['Define accessibility', 'Understand why it matters'],
            html: '<h2>What is Web Accessibility?</h2><p>Web accessibility means designing websites that people with disabilities can use. Over 1 billion people worldwide have some form of disability.</p><h3>Business Case</h3><ul><li>Legal compliance</li><li>Wider audience</li><li>Better SEO</li><li>Improved usability for everyone</li></ul>',
            summary: 'You learned what web accessibility is and why it matters.' },
          { title: 'The 4 POUR Principles', type: 'standard', duration: 20, objectives: ['Understand POUR', 'Apply to web design'],
            html: '<h2>The POUR Principles</h2><h3>Perceivable</h3><p>Users must perceive content.</p><h3>Operable</h3><p>Users must operate the interface.</p><h3>Understandable</h3><p>Users must understand content.</p><h3>Robust</h3><p>Content works with current and future tech.</p>',
            summary: 'You learned the four POUR principles.' },
        ]
      },
      {
        title: 'WCAG in Practice', desc: 'Applying accessibility standards.',
        lessons: [
          { title: 'ARIA Roles and Landmarks', type: 'standard', duration: 20, objectives: ['Understand ARIA roles', 'Use landmarks'],
            html: '<h2>ARIA</h2><p>ARIA enhances HTML semantics. Common roles: <code>role="navigation"</code>, <code>role="main"</code>.</p>',
            summary: 'You learned about ARIA roles and landmarks.' },
        ]
      },
      {
        title: 'Accessibility Techniques', desc: 'Practical accessibility skills.',
        lessons: [
          { title: 'Color Contrast', type: 'video', duration: 20, objectives: ['Understand contrast ratios', 'Choose accessible colors'],
            html: '<h2>Color Contrast</h2><ul><li><strong>AA:</strong> 4.5:1 for normal text</li><li><strong>AAA:</strong> 7:1 for normal text</li></ul><p>Never rely on color alone to convey information.</p>',
            summary: 'You learned WCAG color contrast requirements.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Keyboard Navigation', type: 'video', duration: 20, objectives: ['Ensure keyboard accessibility', 'Manage focus'],
            html: '<h2>Keyboard Navigation</h2><p>All functionality must work via keyboard. Focus order must be logical. Focus indicator must be visible.</p>',
            summary: 'You learned keyboard navigation techniques.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'Screen Reader Testing', type: 'standard', duration: 25, objectives: ['Test with screen readers', 'Interpret output'],
            html: '<h2>Testing with Screen Readers</h2><p>Popular: NVDA (free, Windows), JAWS (paid), VoiceOver (macOS), TalkBack (Android).</p><p>Navigate by headings, landmarks, links. Verify alt text.</p>',
            summary: 'You learned to test with screen readers.',
            hasInteractive: true },
        ]
      },
      {
        title: 'Advanced Accessibility', desc: 'Comprehensive implementation.',
        lessons: [
          { title: 'Accessible Forms', type: 'standard', duration: 20, objectives: ['Build accessible forms', 'Implement error validation'],
            html: '<h2>Accessible Forms</h2><pre><code>&lt;label for="email"&gt;Email&lt;/label&gt;\n&lt;input type="email" id="email" aria-required="true"&gt;</code></pre>',
            summary: 'You learned to build accessible forms.',
            isDraft: true },
          { title: 'Video Captions and Transcripts', type: 'video', duration: 15, objectives: ['Add captions', 'Provide transcripts'],
            html: '<h2>Captions and Transcripts</h2><pre><code>&lt;track kind="captions" src="captions.vtt" srclang="en"&gt;</code></pre>',
            summary: 'You learned to add captions to video.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            hasInteractive: true },
          { title: 'WCAG 2.2 Checklist', type: 'standard', duration: 25, objectives: ['Use WCAG checklist', 'Prioritize issues'],
            html: '<h2>WCAG 2.2 Checklist</h2><p>Level A: alt text, captions, keyboard, skip links, contrast (AA).</p><p>Level AA: reflow, text spacing, focus visible, error suggestion.</p><p>Target AA conformance.</p>',
            summary: 'You reviewed the WCAG 2.2 checklist.',
            hasInteractive: true },
          { title: 'Accessibility Auditing', type: 'practice', duration: 30, objectives: ['Conduct audit', 'Write report'],
            html: '<h2>Accessibility Audit</h2><p>Process: 1) Choose page 2) Automated testing 3) Manual testing 4) Assistive tech testing 5) Document findings</p>',
            summary: 'You learned the accessibility audit process.',
            hasInteractive: true,
            isDraft: true },
        ]
      },
    ]
  },
];

// ─── Application Statuses ──────────────────────────────────────────────
const APP_STATUSES = [
  { email: 'applicant1@acess.demo', status: 'pending', notes: null, quals: '5 years teaching experience at local primary school.' },
  { email: 'applicant2@acess.demo', status: 'approved', notes: 'Strong background in special education.' },
  { email: 'applicant3@acess.demo', status: 'rejected', notes: 'Insufficient teaching experience. Please reapply after gaining more classroom experience.' },
  { email: 'applicant4@acess.demo', status: 'request_info', notes: 'Please provide your teaching certification and portfolio.' },
  { email: 'applicant5@acess.demo', status: 'pending', notes: null, quals: 'Fresh graduate in Education Technology.' },
];

const CONTACT_MSGS = [
  { name: 'Amina Rashid', email: 'amina@example.com', category: 'general', subject: 'Question about course enrollment', message: 'Hi, I would like to know how to enroll my child in multiple courses at once. Is that possible?', status: 'unread' },
  { name: 'Ben Lim', email: 'ben@example.com', category: 'technical', subject: 'Video not loading', message: 'The lesson videos are not loading on my tablet. I tried refreshing but it still does not work.', status: 'read' },
  { name: 'Chen Wei', email: 'chen@example.com', category: 'feedback', subject: 'Great platform!', message: 'My daughter loves learning on this platform. The accessibility features are amazing for her dyslexia.', status: 'replied' },
  { name: 'Diana Kumar', email: 'diana@example.com', category: 'accessibility', subject: 'TTS not working', message: 'The text-to-speech feature stopped working after the latest update. Can you help?', status: 'unread' },
  { name: 'Emma Thompson', email: 'emma@example.com', category: 'instructor_application', subject: 'Instructor application', message: 'I applied to become an instructor two weeks ago but haven\'t heard back.', status: 'read' },
  { name: 'Farid Osman', email: 'farid@example.com', category: 'general', subject: 'Certificate verification', message: 'I need to verify a certificate for a job application. How do I look up a certificate code?', status: 'replied' },
];

// ─── Enrollment Plans ──────────────────────────────────────────────────
interface EnrollPlan {
  userIdx: number;
  courseIdx: number;
  status: 'active' | 'completed' | 'dropped';
  enrolledDaysAgo: number;
  completedDaysAgo?: number;
  lessonsDone: number[];
  quizScores: { idx: number; score: number; passed: boolean; attempts: number }[];
}

const ENROLLMENTS: EnrollPlan[] = [
  // Leo Learner — active, 2 completed courses
  { userIdx: 4, courseIdx: 0, status: 'completed', enrolledDaysAgo: 140, completedDaysAgo: 100, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:85,passed:true,attempts:1},{idx:1,score:90,passed:true,attempts:1}] },
  { userIdx: 4, courseIdx: 2, status: 'completed', enrolledDaysAgo: 120, completedDaysAgo: 80, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:80,passed:true,attempts:1},{idx:1,score:75,passed:true,attempts:2}] },
  { userIdx: 4, courseIdx: 5, status: 'active', enrolledDaysAgo: 60, lessonsDone: [0,1], quizScores: [{idx:0,score:70,passed:true,attempts:1}] },
  { userIdx: 4, courseIdx: 8, status: 'active', enrolledDaysAgo: 30, lessonsDone: [0], quizScores: [] },
  // Mia Performer — high performer, 4 completed
  { userIdx: 5, courseIdx: 0, status: 'completed', enrolledDaysAgo: 170, completedDaysAgo: 140, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:100,passed:true,attempts:1},{idx:1,score:95,passed:true,attempts:1}] },
  { userIdx: 5, courseIdx: 2, status: 'completed', enrolledDaysAgo: 150, completedDaysAgo: 110, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:98,passed:true,attempts:1},{idx:1,score:92,passed:true,attempts:1}] },
  { userIdx: 5, courseIdx: 4, status: 'completed', enrolledDaysAgo: 130, completedDaysAgo: 100, lessonsDone: [0,1,2], quizScores: [{idx:0,score:100,passed:true,attempts:1}] },
  { userIdx: 5, courseIdx: 8, status: 'completed', enrolledDaysAgo: 90, completedDaysAgo: 50, lessonsDone: [0,1,2,3,4], quizScores: [{idx:0,score:96,passed:true,attempts:1},{idx:1,score:94,passed:true,attempts:1}] },
  { userIdx: 5, courseIdx: 10, status: 'active', enrolledDaysAgo: 30, lessonsDone: [0,1], quizScores: [{idx:0,score:90,passed:true,attempts:1}] },
  // Noah AtRisk — at risk, failing
  { userIdx: 6, courseIdx: 0, status: 'active', enrolledDaysAgo: 100, lessonsDone: [0], quizScores: [{idx:0,score:30,passed:false,attempts:2}] },
  { userIdx: 6, courseIdx: 4, status: 'active', enrolledDaysAgo: 80, lessonsDone: [0,1], quizScores: [{idx:0,score:25,passed:false,attempts:1}] },
  { userIdx: 6, courseIdx: 8, status: 'active', enrolledDaysAgo: 50, lessonsDone: [0], quizScores: [{idx:0,score:45,passed:false,attempts:1}] },
  // Alex ADHD
  { userIdx: 7, courseIdx: 2, status: 'completed', enrolledDaysAgo: 85, completedDaysAgo: 50, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:75,passed:true,attempts:1},{idx:1,score:70,passed:true,attempts:1}] },
  { userIdx: 7, courseIdx: 7, status: 'active', enrolledDaysAgo: 40, lessonsDone: [0,1,2], quizScores: [{idx:0,score:80,passed:true,attempts:1}] },
  { userIdx: 7, courseIdx: 0, status: 'active', enrolledDaysAgo: 60, lessonsDone: [0,1,2], quizScores: [{idx:0,score:65,passed:false,attempts:1}] },
  // Sam Dyslexia
  { userIdx: 8, courseIdx: 1, status: 'completed', enrolledDaysAgo: 110, completedDaysAgo: 70, lessonsDone: [0,1,2], quizScores: [{idx:0,score:80,passed:true,attempts:1}] },
  { userIdx: 8, courseIdx: 5, status: 'completed', enrolledDaysAgo: 90, completedDaysAgo: 50, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:78,passed:true,attempts:1},{idx:1,score:72,passed:true,attempts:1}] },
  { userIdx: 8, courseIdx: 8, status: 'active', enrolledDaysAgo: 50, lessonsDone: [0,1], quizScores: [{idx:0,score:55,passed:false,attempts:1}] },
  { userIdx: 8, courseIdx: 10, status: 'active', enrolledDaysAgo: 30, lessonsDone: [0], quizScores: [{idx:0,score:70,passed:true,attempts:1}] },
  // Jordan Visual
  { userIdx: 9, courseIdx: 1, status: 'completed', enrolledDaysAgo: 130, completedDaysAgo: 90, lessonsDone: [0,1,2], quizScores: [{idx:0,score:90,passed:true,attempts:1}] },
  { userIdx: 9, courseIdx: 4, status: 'active', enrolledDaysAgo: 60, lessonsDone: [0], quizScores: [{idx:0,score:85,passed:true,attempts:1}] },
  // Emma Student
  { userIdx: 10, courseIdx: 0, status: 'completed', enrolledDaysAgo: 80, completedDaysAgo: 50, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:85,passed:true,attempts:1},{idx:1,score:80,passed:true,attempts:1}] },
  { userIdx: 10, courseIdx: 2, status: 'active', enrolledDaysAgo: 40, lessonsDone: [0,1], quizScores: [{idx:0,score:70,passed:true,attempts:1}] },
  { userIdx: 10, courseIdx: 9, status: 'active', enrolledDaysAgo: 20, lessonsDone: [0], quizScores: [] },
  // Oliver Student — was inactive, now active again (login 3 days ago)
  { userIdx: 11, courseIdx: 0, status: 'dropped', enrolledDaysAgo: 150, lessonsDone: [0], quizScores: [{idx:0,score:40,passed:false,attempts:1}] },
  { userIdx: 11, courseIdx: 6, status: 'active', enrolledDaysAgo: 20, lessonsDone: [0,1], quizScores: [{idx:0,score:55,passed:false,attempts:1}] },
  // Sophia Student — high performer 2
  { userIdx: 12, courseIdx: 2, status: 'completed', enrolledDaysAgo: 100, completedDaysAgo: 70, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:90,passed:true,attempts:1},{idx:1,score:88,passed:true,attempts:1}] },
  { userIdx: 12, courseIdx: 8, status: 'completed', enrolledDaysAgo: 80, completedDaysAgo: 50, lessonsDone: [0,1,2,3,4], quizScores: [{idx:0,score:92,passed:true,attempts:1},{idx:1,score:95,passed:true,attempts:1}] },
  { userIdx: 12, courseIdx: 9, status: 'completed', enrolledDaysAgo: 60, completedDaysAgo: 30, lessonsDone: [0,1,2], quizScores: [{idx:0,score:85,passed:true,attempts:1}] },
  { userIdx: 12, courseIdx: 7, status: 'active', enrolledDaysAgo: 20, lessonsDone: [0], quizScores: [] },
  // Danial Bin Hassan — new active learner (age 6-12)
  { userIdx: 13, courseIdx: 0, status: 'active', enrolledDaysAgo: 30, lessonsDone: [0,1,2], quizScores: [{idx:0,score:80,passed:true,attempts:1}] },
  { userIdx: 13, courseIdx: 2, status: 'active', enrolledDaysAgo: 20, lessonsDone: [0,1], quizScores: [{idx:0,score:75,passed:true,attempts:1}] },
  { userIdx: 13, courseIdx: 4, status: 'active', enrolledDaysAgo: 10, lessonsDone: [0], quizScores: [] },
  { userIdx: 13, courseIdx: 1, status: 'active', enrolledDaysAgo: 5, lessonsDone: [], quizScores: [] },
  // Aina Binti Ismail — new active learner (age 13-17)
  { userIdx: 14, courseIdx: 8, status: 'active', enrolledDaysAgo: 30, lessonsDone: [0], quizScores: [{idx:0,score:88,passed:true,attempts:1}] },
  { userIdx: 14, courseIdx: 7, status: 'active', enrolledDaysAgo: 15, lessonsDone: [0,1], quizScores: [{idx:0,score:92,passed:true,attempts:1}] },
  { userIdx: 14, courseIdx: 9, status: 'active', enrolledDaysAgo: 10, lessonsDone: [0], quizScores: [] },
  { userIdx: 14, courseIdx: 10, status: 'active', enrolledDaysAgo: 5, lessonsDone: [], quizScores: [] },
  // Wei Chen Lim — new high performer (age 6-12)
  { userIdx: 15, courseIdx: 0, status: 'completed', enrolledDaysAgo: 25, completedDaysAgo: 10, lessonsDone: [0,1,2,3], quizScores: [{idx:0,score:95,passed:true,attempts:1},{idx:1,score:90,passed:true,attempts:1}] },
  { userIdx: 15, courseIdx: 1, status: 'active', enrolledDaysAgo: 15, lessonsDone: [0,1,2], quizScores: [{idx:0,score:100,passed:true,attempts:1}] },
  { userIdx: 15, courseIdx: 4, status: 'active', enrolledDaysAgo: 5, lessonsDone: [0], quizScores: [] },
];

// ─── Seed Function ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 ACESS Comprehensive Demo Data Seeder');
  console.log(`📅 Base date: ${new Date().toISOString().split('T')[0]}\n`);

  // Step 0: Wipe existing demo data
  await wipeAll();
  
  // Step 1: Create auth users + profiles
  const userIds = await createUsers();
  
  // Step 2: Support data
  await seedSupportData(userIds);
  
  // Step 3: Courses, chapters, lessons
  const courseData = await createCourses(userIds);
  
  // Step 4: Quizzes
  const quizData = await createQuizzes(courseData);
  
  // Step 5: Enrollments + progress + quiz attempts
  await createEnrollmentsAndProgress(userIds, courseData, quizData);

  // Step 6: Certificates
  await createCertificates(userIds, courseData);

  // Step 7: Achievements
  await createAchievements(userIds, courseData);

  // Step 8: Notifications
  await createNotifications(userIds, courseData);

  // Step 9: Recommendations
  await createRecommendations(userIds, courseData);

  // Step 10: Adaptive interactions
  await createAdaptiveInteractions(userIds, courseData);

  // Step 11: Favorites
  await createFavorites(userIds, courseData);

  // Step 12: Lesson comments
  await createComments(userIds, courseData);

  // Step 13: Supplementary data (media, admin courses, interactive content, quizzes)
  await createSupplementaryData(userIds, courseData, quizData);

  console.log('\n✨ Demo data generation complete!');
  printSummary();
}

// ─── Wipe ──────────────────────────────────────────────────────────────
async function wipeAll() {
  console.log('🧹 Wiping existing demo data...');

  const tables = [
    'adaptive_interactions', 'recommendations', 'notifications', 'user_achievements',
    'course_achievements', 'certificates', 'quiz_answers', 'quiz_attempts',
    'learner_checkpoints', 'lesson_checkpoints', 'lesson_progress', 'lesson_comments',
    'lesson_interactive_content', 'media_assets', 'video_questions', 'h5p_responses', 'h5p_contents',
    'quiz_options', 'quiz_questions', 'quizzes', 'lesson_versions', 'lessons',
    'course_chapters', 'course_favorites', 'enrollments', 'course_accessibility_categories',
    'courses', 'media_assets', 'referral_codes', 'instructor_applications', 'contact_messages',
    'user_accessibility_preferences', 'user_profiles', 'users',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && error.code !== '42P01') {
      // Some tables may not exist - that's OK
    }
  }

  // Wipe auth users (demo accounts only)
  const { data: authList, error: listErr } = await supabase.auth.admin.listUsers();
  if (!listErr && authList?.users) {
    for (const u of authList.users) {
      if (u.email?.endsWith(DEMO_DOMAIN)) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }
  console.log('  ✅ Demo data wiped');
}

// ─── Create Users ──────────────────────────────────────────────────────
async function createUsers(): Promise<Map<string, { id: string; email: string; role: string; name: string; type: string }>> {
  console.log('👥 Creating users...');
  const map = new Map();

  for (const p of PERSONAS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: p.email, password: PW, email_confirm: true,
      user_metadata: { full_name: p.name, role: p.role },
    });
    if (error) { console.error(`  ❌ ${p.email}: ${error.message}`); continue; }

    const uid = data.user.id;
    console.log(`  ✅ ${p.role.padEnd(10)} ${p.name.padEnd(20)} ${p.email}`);

    // Manually insert user_profiles (trigger may not fire)
    await supabase.from('user_profiles').upsert({
      user_id: uid, accessibility_prefs: p.accessPrefs ? JSON.stringify(p.accessPrefs) : '{}',
      notification_prefs: '{}', age_group: p.ageGroup, onboarded_at: p.createdAt.toISOString(),
      phone_number: p.phone || null, country: p.country || null,
      avatar_url: p.avatar_url || null,
      // Profile bio based on role
      bio: p.role === 'educator' ? `Experienced educator at ACESS platform.` :
           p.role === 'admin' ? `Platform administrator.` :
           `Student at ACESS Learning Platform.`,
    });

    // Set accessibility preferences (table may not exist)
      if (p.accessPrefs) {
        const { error: apErr } = await supabase.from('user_accessibility_preferences').upsert({
          user_id: uid, ...p.accessPrefs, created_at: p.createdAt.toISOString(), updated_at: p.createdAt.toISOString(),
        });
        if (apErr) { /* table may not exist */ }
      }

    map.set(p.email, { id: uid, email: p.email, role: p.role, name: p.name, type: p.type });
    map.set(p.name, { id: uid, email: p.email, role: p.role, name: p.name, type: p.type });
  }

  return map;
}

// ─── Support Data ──────────────────────────────────────────────────────
async function seedSupportData(users: Map<string, any>) {
  console.log('📋 Creating support data...');

  // Contact messages
  await supabase.from('contact_messages').insert(CONTACT_MSGS.map(m => ({
    ...m, created_at: randomDate(daysAgo(60), daysAgo(1)).toISOString(),
  })));
  console.log('  ✅ Contact messages');

  // Instructor applications
  for (const app of APP_STATUSES) {
    const persona = PERSONAS.find(p => p.email === app.email);
    if (!persona) continue;
    const { data: u } = await supabase.from('users').select('id').eq('email', app.email).maybeSingle();
    if (u) {
      await supabase.from('instructor_applications').insert({
        user_id: u.id, full_name: persona.name, email: app.email,
        experience: app.quals || 'Experienced educator.',
        status: app.status, admin_notes: app.notes,
        created_at: persona.createdAt.toISOString(),
        reviewed_at: app.status !== 'pending' ? randomDate(persona.createdAt, new Date()).toISOString() : null,
      });
    }
  }
  console.log('  ✅ Instructor applications');

  // Referral codes
  for (const edu of ['educator@acess.demo', 'new_ed@acess.demo', 'fatimah.ed@acess.demo']) {
    const u = users.get(edu);
    if (u) {
      const code = `REF-${u.name.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await supabase.from('referral_codes').insert({ user_id: u.id, code });
    }
  }
  console.log('  ✅ Referral codes');
}

// ─── Courses ───────────────────────────────────────────────────────────
async function createCourses(users: Map<string, any>) {
  console.log('📚 Creating courses...');
  const educatorId = users.get('educator@acess.demo')?.id;
  const newEducatorId = users.get('new_ed@acess.demo')?.id;
  const fatimahId = users.get('fatimah.ed@acess.demo')?.id;
  
  if (!educatorId || !newEducatorId || !fatimahId) throw new Error('Missing educator IDs');
  
  const result: { 
    course: any; 
    chapters: any[]; 
    lessons: any[]; 
    interactive: any[]; 
    checkpoints: any[];
    quizIds: string[];
  }[] = [];

  for (let ci = 0; ci < COURSES.length; ci++) {
    const def = COURSES[ci];
    const isDraft = false;
    const isPending = false;
    const owner = ci < 4 ? educatorId : (ci < 8 ? newEducatorId : fatimahId);
    const status = isDraft ? 'draft' : isPending ? 'pending_review' : 'published';

    const { data: course, error: cErr } = await supabase.from('courses').insert({
      title: def.title, slug: def.slug, description: def.description,
      category: def.category, difficulty_level: def.difficulty,
      thumbnail_url: THUMBS[def.thumbIdx], status, created_by: owner,
      tags: [def.category, def.difficulty], accessibility_categories: def.accessCats,
      certificate_enabled: status === 'published',
      recommended_age_group: def.ageGroup,
      guided_learning_enabled: true, chapter_organization_enabled: true,
      supports_tts: def.accessCats.includes('dyslexia') || def.accessCats.includes('visual'),
      supports_transcripts: true, supports_focus_mode: def.accessCats.includes('adhd'),
      supports_chunked_learning: def.accessCats.includes('adhd') || def.accessCats.includes('asd'),
      primary_disability_focus: def.accessCats[0] || null,
      secondary_disability_focuses: def.accessCats.slice(1),
      created_at: randomDate(daysAgo(180), daysAgo(30)).toISOString(),
    }).select().single();

    if (cErr) { console.error(`  ❌ Course ${def.title}: ${cErr.message}`); continue; }

    const entry: any = { course, chapters: [], lessons: [], interactive: [], checkpoints: [], quizIds: [] };

    // Chapters + Lessons
    let lessonOrder = 0;
    for (let chi = 0; chi < def.chapters.length; chi++) {
      const ch = def.chapters[chi];
      const { data: chapter } = await supabase.from('course_chapters').insert({
        course_id: course!.id, title: ch.title, description: ch.desc,
        sequence_order: chi + 1,
      }).select().single();

      if (chapter) {
        entry.chapters.push(chapter);
        
        // Accessibility categories linking
          for (const cat of def.accessCats) {
            const { error: acErr } = await supabase.from('course_accessibility_categories').insert({
              course_id: course!.id, accessibility_category: cat,
            });
            if (acErr) { /* table may not exist, skip */ }
          }

        for (let li = 0; li < ch.lessons.length; li++) {
          const l = ch.lessons[li];
          const lessonStatus = l.isDraft ? 'draft' : (status === 'published' ? 'published' : 'draft');
          const { data: lesson } = await supabase.from('lessons').insert({
            course_id: course!.id, chapter_id: chapter.id,
            title: l.title, content_html: l.html, sequence_order: ++lessonOrder,
            status: lessonStatus,
            visibility_status: 'visible', lesson_type: l.type,
            estimated_duration: l.duration,
            learning_objectives: l.objectives,
            simplified_summary: l.summary,
            focus_mode_enabled: def.accessCats.includes('adhd'),
            chunked_content_enabled: def.accessCats.includes('adhd') || def.accessCats.includes('asd'),
            accessibility_notes: `This lesson supports ${def.accessCats.join(', ')} accessibility needs.`,
            has_video: !!l.videoUrl, video_url: l.videoUrl || null,
            has_pdf: false, has_quiz: li === ch.lessons.length - 1,
            created_at: randomDate(daysAgo(170), daysAgo(30)).toISOString(),
          }).select().single();

          if (lesson) {
            entry.lessons.push(lesson);

            // Checkpoints for last lesson of each chapter
            if (li === ch.lessons.length - 1) {
              const { data: cp } = await supabase.from('lesson_checkpoints').insert({
                lesson_id: lesson.id, title: `${ch.title} Checkpoint`,
                description: `Review what you learned in ${ch.title}.`,
                checkpoint_type: 'reflection', sequence_order: 1, required: true,
              }).select().single();
              if (cp) entry.checkpoints.push(cp);
            }
          }
        }
      }
    }

    console.log(`  ✅ ${status.padEnd(14)} ${def.title}`);
    result.push(entry);
  }

  // Create pending review course
  const { data: pendingCourse } = await supabase.from('courses').insert({
    title: 'Introduction to Physics for Kids', slug: 'intro-physics',
    description: 'Fun physics concepts explained for young learners.', category: 'Science',
    difficulty_level: 'beginner', status: 'pending_review',
    thumbnail_url: THUMBS[3], created_by: fatimahId,
    tags: ['Science', 'beginner'], accessibility_categories: ['asd', 'adhd'],
  }).select().single();
  if (pendingCourse) console.log('  ✅ Pending review   Introduction to Physics for Kids');

  return result;
}

// ─── Quizzes ───────────────────────────────────────────────────────────
async function createQuizzes(courseData: any[]) {
  console.log('🧠 Creating quizzes...');
  const result: Map<string, { quizId: string; questionIds: string[] }> = new Map();

  const quizTemplates: Record<string, { questions: { q: string; opts: { t: string; c: boolean }[] }[] }> = {
    'Learning Numbers 1-20': {
      questions: [
        { q: 'What number comes after 5?', opts: [{t:'6',c:true},{t:'4',c:false},{t:'7',c:false},{t:'3',c:false}] },
        { q: 'How many sides does a triangle have?', opts: [{t:'3',c:true},{t:'4',c:false},{t:'2',c:false},{t:'5',c:false}] },
        { q: 'What is 5 + 3?', opts: [{t:'8',c:true},{t:'7',c:false},{t:'9',c:false},{t:'6',c:false}] },
        { q: 'Which number is 10 + 5?', opts: [{t:'15',c:true},{t:'12',c:false},{t:'20',c:false},{t:'10',c:false}] },
        { q: 'How many fingers are on one hand?', opts: [{t:'5',c:true},{t:'4',c:false},{t:'6',c:false},{t:'3',c:false}] },
      ]
    },
    'Learning Shapes & Colors': {
      questions: [
        { q: 'Which shape is round with no corners?', opts: [{t:'Circle',c:true},{t:'Square',c:false},{t:'Triangle',c:false},{t:'Rectangle',c:false}] },
        { q: 'How many sides does a square have?', opts: [{t:'4',c:true},{t:'3',c:false},{t:'5',c:false},{t:'6',c:false}] },
        { q: 'Red and blue make which color?', opts: [{t:'Purple',c:true},{t:'Green',c:false},{t:'Orange',c:false},{t:'Brown',c:false}] },
      ]
    },
    'Animal Adventures': {
      questions: [
        { q: 'What sound does a cow make?', opts: [{t:'Moo',c:true},{t:'Baa',c:false},{t:'Neigh',c:false},{t:'Oink',c:false}] },
        { q: 'Where do lions live?', opts: [{t:'The jungle',c:true},{t:'The farm',c:false},{t:'The ocean',c:false},{t:'The Arctic',c:false}] },
        { q: 'What do chickens lay?', opts: [{t:'Eggs',c:true},{t:'Milk',c:false},{t:'Wool',c:false},{t:'Honey',c:false}] },
      ]
    },
    'Healthy Habits for Kids': {
      questions: [
        { q: 'How many minutes should you play outside each day?', opts: [{t:'30 minutes',c:true},{t:'5 minutes',c:false},{t:'2 hours',c:false},{t:'10 minutes',c:false}] },
        { q: 'Which food is healthy?', opts: [{t:'Apple',c:true},{t:'Candy',c:false},{t:'Chips',c:false},{t:'Soda',c:false}] },
        { q: 'Why is sleep important?', opts: [{t:'It helps your body rest',c:true},{t:'It makes you hungry',c:false},{t:'It stops you from growing',c:false},{t:'It makes you tired',c:false}] },
      ]
    },
    'Introduction to Reading': {
      questions: [
        { q: 'What sound does the letter C make?', opts: [{t:'"cuh" like cat',c:true},{t:'"sss" like snake',c:false},{t:'"buh" like ball',c:false},{t:'"duh" like dog',c:false}] },
        { q: 'What is the first letter of "Apple"?', opts: [{t:'A',c:true},{t:'B',c:false},{t:'C',c:false},{t:'D',c:false}] },
        { q: 'C-A-T spells...', opts: [{t:'Cat',c:true},{t:'Car',c:false},{t:'Can',c:false},{t:'Cap',c:false}] },
        { q: 'D-O-G spells...', opts: [{t:'Dog',c:true},{t:'Doll',c:false},{t:'Door',c:false},{t:'Dot',c:false}] },
      ]
    },
    'Digital Literacy & Internet Safety': {
      questions: [
        { q: 'What should you do if a stranger online asks for your address?', opts: [{t:'Say no and tell a parent',c:true},{t:'Give them your address',c:false},{t:'Ask them why',c:false},{t:'Ignore it',c:false}] },
        { q: 'A strong password should have...', opts: [{t:'Letters, numbers, and symbols',c:true},{t:'Only your name',c:false},{t:'Your birthday',c:false},{t:'Just numbers',c:false}] },
        { q: 'What is a browser?', opts: [{t:'A tool to view websites',c:true},{t:'A type of virus',c:false},{t:'A computer part',c:false},{t:'An email program',c:false}] },
        { q: 'What does HTTPS mean?', opts: [{t:'Secure connection',c:true},{t:'Fast connection',c:false},{t:'Free website',c:false},{t:'Hidden page',c:false}] },
      ]
    },
  };

  for (const entry of courseData) {
    const course = entry.course;
    const templ = quizTemplates[course.title];
    if (!templ) continue;

    // For courses with multiple chapters, create per-chapter quizzes
    for (let chi = 0; chi < entry.chapters.length; chi++) {
      const qsPerChapter = Math.ceil(templ.questions.length / entry.chapters.length);
      const start = chi * qsPerChapter;
      const chapterQs = templ.questions.slice(start, start + qsPerChapter);
      if (chapterQs.length === 0) continue;

      const lastLesson = entry.lessons.filter((l: any) => l.chapter_id === entry.chapters[chi]?.id).pop();
      if (!lastLesson) continue;

      const { data: quiz } = await supabase.from('quizzes').insert({
        lesson_id: lastLesson.id, title: `${course.title} — Chapter ${chi + 1}`,
        pass_threshold_pct: 70, time_limit_seconds: 600,
      }).select().single();

      if (!quiz) continue;
      entry.quizIds.push(quiz.id);
      const qIds: string[] = [];

      for (let qi = 0; qi < chapterQs.length; qi++) {
        const qd = chapterQs[qi];
        const { data: question } = await supabase.from('quiz_questions').insert({
          quiz_id: quiz.id, question_text: qd.q, question_type: 'multiple_choice', sequence_order: qi + 1,
        }).select().single();

        if (!question) continue;
        qIds.push(question.id);

        for (let oi = 0; oi < qd.opts.length; oi++) {
          await supabase.from('quiz_options').insert({
            question_id: question.id, option_text: qd.opts[oi].t,
            is_correct: qd.opts[oi].c, sequence_order: oi + 1,
          });
        }
      }

      result.set(quiz.id, { quizId: quiz.id, questionIds: qIds });
    }
  }

  console.log('  ✅ Quizzes created');
  return result;
}

// ─── Enrollments + Progress ────────────────────────────────────────────
async function createEnrollmentsAndProgress(users: Map<string, any>, courseData: any[], quizData: Map<string, any>) {
  console.log('🎓 Creating enrollments and progress...');

  for (const plan of ENROLLMENTS) {
    const learner = PERSONAS[plan.userIdx];
    const user = users.get(learner.email);
    const courseEntry = courseData[plan.courseIdx];
    if (!user || !courseEntry) continue;

    const enrolledAt = daysAgo(plan.enrolledDaysAgo);
    const { data: enrollment } = await supabase.from('enrollments').insert({
      user_id: user.id, course_id: courseEntry.course.id,
      status: plan.status, enrolled_at: enrolledAt.toISOString(),
      completed_at: plan.completedDaysAgo ? daysAgo(plan.completedDaysAgo).toISOString() : null,
    }).select().single();

    if (!enrollment) continue;

    // Lesson progress
      for (const lessonIdx of plan.lessonsDone) {
        const lesson = courseEntry.lessons[lessonIdx];
        if (!lesson) continue;
        const progressDate = randomDate(enrolledAt, plan.completedDaysAgo ? daysAgo(plan.completedDaysAgo) : new Date());
        const timeSpent = lesson.estimated_duration ? lesson.estimated_duration * 60 : 300;

        await supabase.from('lesson_progress').insert({
          enrollment_id: enrollment.id, lesson_id: lesson.id,
          is_viewed: true, last_viewed_at: progressDate.toISOString(),
          first_viewed_at: progressDate.toISOString(),
          time_spent_learning: timeSpent + randInt(-60, 120),
        });
      }

      // Quiz attempts
      const quizIds = courseEntry.quizIds || [];
      for (const qs of plan.quizScores) {
        const quizId = quizIds[qs.idx];
        if (!quizId) continue;
        const quizInfo = quizData.get(quizId);
        if (!quizInfo) continue;

        for (let a = 0; a < qs.attempts; a++) {
          const attemptDate = randomDate(enrolledAt, new Date());
          const isLast = a === qs.attempts - 1;
          const score = isLast ? qs.score : qs.score - randInt(15, 40);

          const { data: attempt, error: qaErr } = await supabase.from('quiz_attempts').insert({
            enrollment_id: enrollment.id, quiz_id: quizId,
            attempt_number: a + 1, score_pct: Math.max(score, 0),
            result: isLast && qs.passed ? 'pass' : 'fail',
            started_at: attemptDate.toISOString(),
            submitted_at: attemptDate.toISOString(),
          }).select().single();
          if (qaErr) { console.error(`  QA insert error: ${qaErr.message}`); continue; }

          // Quiz answers (randomly select options)
          if (attempt && quizInfo.questionIds) {
            for (const qId of quizInfo.questionIds) {
              const { data: opts } = await supabase.from('quiz_options')
                .select('id').eq('question_id', qId).limit(4);
              if (opts && opts.length > 0) {
                const { error: ansErr } = await supabase.from('quiz_answers').insert({
                  attempt_id: attempt.id, question_id: qId,
                  selected_option_id: pick(opts).id,
                });
                if (ansErr) { /* skip answer errors */ }
              }
            }
          }
        }
      }
  }

  console.log('  ✅ Enrollments and progress created');
}

// ─── Certificate PDF generation ─────────────────────────────────────────
function generateCertPDFBlob(d: { learnerName: string; courseTitle: string; educatorName: string; institutionName: string; completionDate: string; referenceCode: string; verificationUrl: string }): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const primaryBlue: [number, number, number] = [30, 64, 175];
  const lightBlue: [number, number, number] = [59, 130, 246];
  const gold: [number, number, number] = [245, 158, 11];
  const gray800: [number, number, number] = [31, 41, 55];
  const gray600: [number, number, number] = [75, 85, 99];
  const gray400: [number, number, number] = [156, 163, 175];

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, 'F');
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(2);
  doc.rect(8, 8, pw - 16, ph - 16, 'S');
  doc.setDrawColor(...lightBlue);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pw - 24, ph - 24, 'S');
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(40, 28, pw - 40, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryBlue);
  doc.text('Certificate of Completion', pw / 2, 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...gray600);
  doc.text(d.institutionName, pw / 2, 51, { align: 'center' });
  doc.setFontSize(12);
  doc.text('This certificate is proudly awarded to', pw / 2, 66, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...gray800);
  doc.text(d.learnerName, pw / 2, 84, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...gray600);
  doc.text('for successfully completing the course', pw / 2, 96, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...lightBlue);
  doc.text(d.courseTitle, pw / 2, 110, { align: 'center' });

  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(40, 125, pw - 40, 125);

  const detailY = 140;
  const colW = (pw - 60) / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gray800);
  doc.text('COMPLETION DATE', 30, detailY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray600);
  doc.text(new Date(d.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 30, detailY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gray800);
  doc.text('CERTIFICATE CODE', 30 + colW, detailY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gray600);
  doc.text(d.referenceCode, 30 + colW, detailY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gray800);
  doc.text('EDUCATOR', 30 + colW * 2, detailY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray600);
  doc.text(d.educatorName, 30 + colW * 2, detailY + 6);

  const sigY = ph - 45;
  doc.setDrawColor(...gray400);
  doc.setLineWidth(0.5);
  doc.line(30, sigY, 80, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gray800);
  doc.text('Platform Director', 55, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray400);
  doc.text(d.institutionName, 55, sigY + 12, { align: 'center' });

  doc.line(pw - 80, sigY, pw - 30, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...gray800);
  doc.text('Education Lead', pw - 55, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray400);
  doc.text(d.institutionName, pw - 55, sigY + 12, { align: 'center' });

  if (d.verificationUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray400);
    doc.text(`Verify at: ${d.verificationUrl}`, pw / 2, ph - 18, { align: 'center' });
  }

  return doc.output('blob');
}

// ─── Certificates ──────────────────────────────────────────────────────
async function createCertificates(users: Map<string, any>, courseData: any[]) {
  console.log('📜 Creating certificates...');

  const certData = [
    { user: 'learner@acess.demo', course: 2, days: 80 },
    { user: 'learner@acess.demo', course: 5, days: 50 },
    { user: 'high_performer@acess.demo', course: 0, days: 140 },
    { user: 'high_performer@acess.demo', course: 2, days: 110 },
    { user: 'high_performer@acess.demo', course: 4, days: 100 },
    { user: 'high_performer@acess.demo', course: 8, days: 50 },
    { user: 'dyslexia_sam@acess.demo', course: 1, days: 70 },
    { user: 'dyslexia_sam@acess.demo', course: 5, days: 50 },
    { user: 'visual_jordan@acess.demo', course: 1, days: 90 },
    { user: 'emma_student@acess.demo', course: 0, days: 50 },
    { user: 'sophia_student@acess.demo', course: 2, days: 70 },
    { user: 'sophia_student@acess.demo', course: 8, days: 50 },
    { user: 'sophia_student@acess.demo', course: 9, days: 30 },
  ];

  for (const cert of certData) {
    const user = users.get(cert.user);
    const courseEntry = courseData[cert.course];
    if (!user || !courseEntry) continue;

    const issuedAt = daysAgo(cert.days);
    const refCode = `${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

    const { data: enrollmentRow } = await supabase.from('enrollments')
      .select('id').eq('user_id', user.id).eq('course_id', courseEntry.course.id).limit(1).maybeSingle();

    const { data: certRecord } = await supabase.from('certificates').insert({
      user_id: user.id, course_id: courseEntry.course.id,
      enrollment_id: enrollmentRow?.id || '00000000-0000-0000-0000-000000000000',
      learner_name: user.name, course_title: courseEntry.course.title,
      educator_name: 'Dr. Sarah Chen', institution_name: 'ACESS Platform',
      completion_date: issuedAt.toISOString(), issued_at: issuedAt.toISOString(),
      status: 'issued', reference_code: refCode,
      verification_url: `${SUPABASE_URL}/verify/${refCode}`,
      skills_earned: ['Knowledge Acquisition', 'Critical Thinking'],
      course_duration_hours: 10,
    }).select('id').single();

    if (certRecord) {
      const pdfBlob = generateCertPDFBlob({
        learnerName: user.name, courseTitle: courseEntry.course.title,
        educatorName: 'Dr. Sarah Chen', institutionName: 'ACESS Platform',
        completionDate: issuedAt.toISOString(), referenceCode: refCode,
        verificationUrl: `${SUPABASE_URL}/verify/${refCode}`,
      });
      const filePath = `${user.id}/${courseEntry.course.id}.pdf`;
      const { error: uploadErr } = await supabase.storage.from('certificates').upload(filePath, pdfBlob, { upsert: true, contentType: 'application/pdf' });
      if (uploadErr) {
        console.error(`  ⚠ Upload failed for ${refCode}: ${uploadErr.message}`);
      } else {
        const pdfUrl = `${SUPABASE_URL}/storage/v1/object/public/certificates/${filePath}`;
        await supabase.from('certificates').update({ pdf_url: pdfUrl }).eq('id', certRecord.id);
      }
    }
  }

  // One revoked certificate (no enrollment_id — FK requires valid enrollment)
  const jordan = users.get('visual_jordan@acess.demo');
  const course4 = courseData[4];
  if (jordan && course4) {
    const { data: jordanEnroll } = await supabase.from('enrollments')
      .select('id').eq('user_id', jordan.id).eq('course_id', course4.course.id).limit(1).maybeSingle();
    const { error: revErr } = await supabase.from('certificates').insert({
      user_id: jordan.id, course_id: course4.course.id,
      enrollment_id: jordanEnroll?.id,
      learner_name: 'Jordan Visual', course_title: course4.course.title,
      educator_name: 'Dr. Sarah Chen', institution_name: 'ACESS Platform',
      completion_date: daysAgo(60).toISOString(), issued_at: daysAgo(60).toISOString(),
      revoked_at: daysAgo(10).toISOString(), status: 'revoked',
      reference_code: `REVOKE-TEST-001`,
      verification_url: `${SUPABASE_URL}/verify/REVOKE-TEST-001`,
    });
    if (revErr) console.error(`  ❌ Revoked cert: ${revErr.message}`);
  }

  console.log('  ✅ Certificates created');
}

// ─── Achievements ──────────────────────────────────────────────────────
async function createAchievements(users: Map<string, any>, courseData: any[]) {
  console.log('🏆 Creating achievements...');

  // Course achievements for published courses
  const achDefs = [
    { course: 0, name: 'Number Whiz', desc: 'Complete all lessons in Learning Numbers.', type: 'progress', threshold: 100 },
    { course: 0, name: 'Counting Star', desc: 'Score 90% or higher on Numbers quiz.', type: 'quiz', threshold: 90 },
    { course: 2, name: 'Animal Expert', desc: 'Complete all Animal Adventure lessons.', type: 'progress', threshold: 100 },
    { course: 5, name: 'Bookworm', desc: 'Complete all Reading lessons.', type: 'lesson', threshold: 8 },
    { course: 7, name: 'Code Master', desc: 'Score 90% on Coding quiz.', type: 'quiz', threshold: 90 },
    { course: 10, name: 'Web Pioneer', desc: 'Complete Web Development Fundamentals.', type: 'progress', threshold: 100 },
    { course: 11, name: 'A11y Champion', desc: 'Complete Web Accessibility course.', type: 'progress', threshold: 100 },
  ];

  for (const ad of achDefs) {
    const ce = courseData[ad.course];
    if (!ce) continue;
    await supabase.from('course_achievements').insert({
      course_id: ce.course.id, name: ad.name, description: ad.desc,
      requirement_type: ad.type, requirement_threshold: ad.threshold,
    });
  }

  console.log('  ✅ Achievement definitions created');
}

// ─── Notifications ─────────────────────────────────────────────────────
async function createNotifications(users: Map<string, any>, courseData: any[]) {
  console.log('🔔 Creating notifications...');

  const notifs: any[] = [];

  // Enrollment confirmations
  for (const plan of ENROLLMENTS) {
    const learner = PERSONAS[plan.userIdx];
    const user = users.get(learner.email);
    const ce = courseData[plan.courseIdx];
    if (!user || !ce) continue;

    notifs.push({
      user_id: user.id, type: 'enrollment',
      title: `Enrolled in ${ce.course.title}`,
      body: `You have been enrolled in ${ce.course.title}. Start learning today!`,
      is_read: plan.status === 'completed', created_at: daysAgo(plan.enrolledDaysAgo).toISOString(),
    });
  }

  // Achievement unlocks (for high performers and active users)
  const achievers = [4, 5, 8, 10, 12];
  for (const ui of achievers) {
    const learner = PERSONAS[ui];
    const user = users.get(learner.email);
    if (!user) continue;

    notifs.push({
      user_id: user.id, type: 'badge_earned', title: 'Badge Unlocked!',
      body: `You earned the "Quick Learner" badge!`, is_read: false,
      created_at: randomDate(daysAgo(100), daysAgo(5)).toISOString(),
    });
    notifs.push({
      user_id: user.id, type: 'badge_earned', title: 'Badge Unlocked!',
      body: `You earned the "Course Master" badge!`, is_read: false,
      created_at: randomDate(daysAgo(80), daysAgo(5)).toISOString(),
    });
  }

  // Course completed notifications
  for (const plan of ENROLLMENTS.filter(e => e.status === 'completed')) {
    const learner = PERSONAS[plan.userIdx];
    const user = users.get(learner.email);
    const ce = courseData[plan.courseIdx];
    if (!user || !ce || !plan.completedDaysAgo) continue;

    notifs.push({
      user_id: user.id, type: 'lesson_completed',
      title: `Course Completed: ${ce.course.title}`,
      body: `Congratulations! You completed all lessons in ${ce.course.title}.`,
      is_read: true, created_at: daysAgo(plan.completedDaysAgo).toISOString(),
    });
  }

  // Quiz results
  for (const plan of ENROLLMENTS) {
    const learner = PERSONAS[plan.userIdx];
    const user = users.get(learner.email);
    if (!user) continue;
    for (const qs of plan.quizScores) {
      const ce = courseData[plan.courseIdx];
      if (!ce) continue;
      notifs.push({
        user_id: user.id, type: 'quiz_completed',
        title: qs.passed ? `Quiz Passed: ${ce.course.title}` : `Quiz Failed: ${ce.course.title}`,
        body: qs.passed ? `Great job! You scored ${qs.score}%.` : `You scored ${qs.score}%. Keep trying!`,
        is_read: false, created_at: randomDate(daysAgo(plan.enrolledDaysAgo), new Date()).toISOString(),
      });
    }
  }

  // Notifications for educators
  const educatorUsers = ['educator@acess.demo', 'new_ed@acess.demo', 'fatimah.ed@acess.demo'];
  for (const eduEmail of educatorUsers) {
    const user = users.get(eduEmail);
    if (!user) continue;
    notifs.push({
      user_id: user.id, type: 'course_published',
      title: 'Course Published Successfully',
      body: 'Your course has been reviewed and published.',
      is_read: false, created_at: randomDate(daysAgo(60), daysAgo(10)).toISOString(),
    });
    notifs.push({
      user_id: user.id, type: 'lesson_completed',
      title: 'New Student Enrollment',
      body: 'A new student has enrolled in your course.',
      is_read: false, created_at: randomDate(daysAgo(40), daysAgo(5)).toISOString(),
    });
  }

  // Batch insert
  const batchSize = 50;
  for (let i = 0; i < notifs.length; i += batchSize) {
    await supabase.from('notifications').insert(notifs.slice(i, i + batchSize));
  }

  console.log(`  ✅ ${notifs.length} notifications created`);
}

// ─── Recommendations ──────────────────────────────────────────────────
async function createRecommendations(users: Map<string, any>, courseData: any[]) {
  console.log('💡 Creating recommendations...');

  const atRisk = ['at_risk@acess.demo', 'oliver_student@acess.demo'];
  for (const email of atRisk) {
    const user = users.get(email);
    if (!user) continue;
    // Find their enrollments
    const { data: userEnrolls } = await supabase.from('enrollments')
      .select('id, course_id').eq('user_id', user.id);
    if (!userEnrolls) continue;
    for (const enr of userEnrolls) {
      const ce = courseData.find(c => c.course.id === enr.course_id);
      if (!ce || ce.lessons.length === 0) continue;
      await supabase.from('recommendations').insert({
        enrollment_id: enr.id,
        recommended_lesson_id: ce.lessons[0].id,
        difficulty_tier: 'revision',
        trigger_reason: 'Based on your current progress, this lesson is recommended for revision.',
      });
    }
  }

  // Cross-course recommendations for active learners
  for (const email of ['learner@acess.demo', 'high_performer@acess.demo', 'sophia_student@acess.demo']) {
    const user = users.get(email);
    if (!user) continue;
    const { data: userEnrolls } = await supabase.from('enrollments')
      .select('id, course_id').eq('user_id', user.id).limit(3);
    if (!userEnrolls) continue;
    for (const enr of userEnrolls) {
      const ce = courseData.find(c => c.course.id === enr.course_id);
      if (!ce || ce.lessons.length < 2) continue;
      await supabase.from('recommendations').insert({
        enrollment_id: enr.id,
        recommended_lesson_id: ce.lessons[1].id,
        difficulty_tier: 'standard',
        trigger_reason: 'You might enjoy this lesson based on your interests.',
      });
    }
  }

  console.log('  ✅ Recommendations created');
}

// ─── Adaptive Interactions ─────────────────────────────────────────────
async function createAdaptiveInteractions(users: Map<string, any>, courseData: any[]) {
  console.log('📊 Creating adaptive interaction analytics...');

  const interactionTypes = ['tts', 'focus_mode', 'chunked_content', 'simplified_summary', 'reading_spotlight', 'distraction_free', 'high_contrast'];
  const accessUsers = PERSONAS.filter(p => p.type === 'accessibility');

  for (const p of accessUsers) {
    const user = users.get(p.email);
    if (!user) continue;
    const count = randInt(5, 15);
    for (let i = 0; i < count; i++) {
      const ce = courseData[randInt(0, courseData.length - 1)];
      if (!ce) continue;
      await supabase.from('adaptive_interactions').insert({
        user_id: user.id, adaptation_used: pick(interactionTypes),
        course_id: ce.course.id, lesson_id: (pick(ce.lessons) as any)?.id || null,
        created_at: randomDate(daysAgo(60), new Date()).toISOString(),
      });
    }
  }

  console.log('  ✅ Adaptive interactions created');
}

// ─── Favorites ─────────────────────────────────────────────────────────
async function createFavorites(users: Map<string, any>, courseData: any[]) {
  console.log('⭐ Creating favorites...');

  const favs = [
    { user: 'learner@acess.demo', courses: [0, 2, 7] },
    { user: 'high_performer@acess.demo', courses: [2, 4, 8, 10] },
    { user: 'dyslexia_sam@acess.demo', courses: [1, 5] },
    { user: 'sophia_student@acess.demo', courses: [2, 7, 8, 9] },
    { user: 'emma_student@acess.demo', courses: [0, 2] },
  ];

  for (const fav of favs) {
    const user = users.get(fav.user);
    if (!user) continue;
    for (const ci of fav.courses) {
      const ce = courseData[ci];
      if (!ce) continue;
      await supabase.from('course_favorites').insert({
        user_id: user.id, course_id: ce.course.id,
      });
    }
  }

  console.log('  ✅ Favorites created');
}

// ─── Comments ──────────────────────────────────────────────────────────
async function createComments(users: Map<string, any>, courseData: any[]) {
  console.log('💬 Creating lesson comments...');

  const commentData = [
    { user: 'learner@acess.demo', lesson: 0, text: 'This was really helpful! I can count to 20 now.' },
    { user: 'high_performer@acess.demo', lesson: 0, text: 'Great lesson. The pictures made it easy to understand.' },
    { user: 'adhd_alex@acess.demo', lesson: 4, text: 'I liked the animal facts! Can we learn more about dolphins?' },
    { user: 'dyslexia_sam@acess.demo', lesson: 10, text: 'The TTS feature really helped me read this lesson.' },
    { user: 'sophia_student@acess.demo', lesson: 8, text: 'I never knew coding could be so fun! Ready for the next lesson.' },
    { user: 'learner@acess.demo', lesson: 8, text: 'Same here! The drag-and-drop activity was cool.' },
  ];

  for (const c of commentData) {
    const user = users.get(c.user);
    if (!user) continue;
    // Find the lesson across all courses
    let targetLesson = null;
    for (const ce of courseData) {
      if (ce.lessons[c.lesson]) {
        targetLesson = ce.lessons[c.lesson];
        break;
      }
    }
    if (!targetLesson) continue;

    await supabase.from('lesson_comments').insert({
      lesson_id: targetLesson.id, user_id: user.id, content: c.text,
      created_at: randomDate(daysAgo(30), daysAgo(1)).toISOString(),
    });
  }

  console.log('  ✅ Lesson comments created');
}

// ─── Supplementary Data ──────────────────────────────────────────────
async function createSupplementaryData(users: Map<string, any>, courseData: any[], quizData: Map<string, any>) {
  console.log('\n📎 Adding supplementary data...');

  const adminId = users.get('admin@acess.demo')?.id;
  const educatorId = users.get('educator@acess.demo')?.id;
  const newEdId = users.get('new_ed@acess.demo')?.id;
  const fatimahId = users.get('fatimah.ed@acess.demo')?.id;

  // ── 1. Media assets for courses ──
  const mediaAssets = [
    { courseIdx: 0, url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=800', alt: 'Numbers on chalkboard', type: 'image' },
    { courseIdx: 1, url: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?q=80&w=800', alt: 'Colorful shapes', type: 'image' },
    { courseIdx: 2, url: 'https://images.unsplash.com/photo-1474511320723-9a56873864b5?q=80&w=800', alt: 'Fox in forest', type: 'image' },
    { courseIdx: 3, url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800', alt: 'Science experiment', type: 'image' },
    { courseIdx: 4, url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800', alt: 'Healthy food plate', type: 'image' },
    { courseIdx: 5, url: 'https://images.unsplash.com/photo-1529992191707-3e7a7b6f0a0b?q=80&w=800', alt: 'Books and reading', type: 'image' },
    { courseIdx: 6, url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800', alt: 'Nature landscape', type: 'image' },
    { courseIdx: 7, url: 'https://images.unsplash.com/photo-1515879218367-8466d9108924?q=80&w=800', alt: 'Code on screen', type: 'image' },
    { courseIdx: 8, url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=800', alt: 'Digital safety', type: 'image' },
    { courseIdx: 9, url: 'https://images.unsplash.com/photo-1456401264171-6ac44bcf4d3e?q=80&w=800', alt: 'Problem solving', type: 'image' },
    { courseIdx: 10, url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=800', alt: 'Web development', type: 'image' },
    { courseIdx: 11, url: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?q=80&w=800', alt: 'Accessibility icons', type: 'image' },
  ];
  for (const m of mediaAssets) {
    const ce = courseData[m.courseIdx];
    if (!ce) continue;
    await supabase.from('media_assets').insert({
      course_id: ce.course.id, user_id: educatorId || ce.course.created_by,
      file_name: m.alt, file_type: m.type,
      url: m.url, size_bytes: randInt(50000, 500000),
      created_at: randomDate(daysAgo(60), new Date()).toISOString(),
    });
  }
  console.log('  ✅ Media assets created');

  // ── 2. Admin/system courses ──
  if (adminId) {
    const adminCourseTemplates = [
      {
        title: 'Platform Orientation Guide', slug: 'platform-orientation',
        description: 'Learn how to navigate the ACESS platform, use key features, and get the most out of your learning experience.', difficulty: 'beginner',
        category: 'Orientation', ageGroup: '18+', chCount: 3, lessPerCh: 3,
        thumbIdx: 5, status: 'published',
      },
      {
        title: 'ACESS Community Guidelines', slug: 'community-guidelines',
        description: 'Understand the rules and best practices for being a positive member of the ACESS learning community.', difficulty: 'beginner',
        category: 'Orientation', ageGroup: '13-17', chCount: 2, lessPerCh: 3,
        thumbIdx: 6, status: 'published',
      },
    ];
    for (const ct of adminCourseTemplates) {
      const { data: course } = await supabase.from('courses').insert({
        title: ct.title, slug: ct.slug, description: ct.description,
        category: ct.category, difficulty_level: ct.difficulty,
        thumbnail_url: THUMBS[ct.thumbIdx], status: ct.status, created_by: adminId,
        tags: [ct.category, ct.difficulty], accessibility_categories: ['asd', 'dyslexia'],
        certificate_enabled: true, recommended_age_group: ct.ageGroup,
        created_at: randomDate(daysAgo(120), daysAgo(60)).toISOString(),
      }).select().single();
      if (!course) continue;
      console.log(`  ✅ ${ct.status.padEnd(14)} ${ct.title}`);

      const courseEntry: any = { course, chapters: [], lessons: [], interactive: [], checkpoints: [], quizIds: [] };
      let supLessonOrder = 0;
      for (let chi = 0; chi < ct.chCount; chi++) {
        const { data: chapter } = await supabase.from('course_chapters').insert({
          course_id: course.id, title: `${ct.title} — Part ${chi + 1}`,
          description: `Chapter ${chi + 1} of ${ct.title}.`,
          sequence_order: chi + 1,
        }).select().single();
        if (!chapter) continue;
        courseEntry.chapters.push(chapter);
        for (let li = 0; li < ct.lessPerCh; li++) {
          const lessonTitle = `${ct.title} — Lesson ${chi * ct.lessPerCh + li + 1}`;
          const { data: lesson } = await supabase.from('lessons').insert({
            course_id: course.id, chapter_id: chapter.id,
            title: lessonTitle,
            content_html: `<h2>${lessonTitle}</h2><p>Welcome to this lesson from ${ct.title}. This content covers important information to help you succeed on the ACESS platform.</p><p>Please review the materials carefully and complete any associated activities.</p>`,
            sequence_order: ++supLessonOrder, status: 'published', visibility_status: 'visible',
            lesson_type: 'standard', estimated_duration: 10,
            learning_objectives: [`Understand ${ct.title} concepts`, 'Apply key takeaways'],
            simplified_summary: `Summary of ${lessonTitle}.`,
            has_video: false, has_pdf: false, has_quiz: li === ct.lessPerCh - 1,
            created_at: randomDate(daysAgo(110), daysAgo(60)).toISOString(),
          }).select().single();
          if (lesson) {
            courseEntry.lessons.push(lesson);
            // Add simple interactive
            if (li % 2 === 0) {
              const { data: ic } = await supabase.from('lesson_interactive_content').insert({
                lesson_id: lesson.id, content_type: pick(['flashcards', 'drag_drop', 'fill_blanks']),
                title: `Activity: ${lessonTitle}`, content_data: JSON.stringify({ difficulty: 'easy' }),
                sequence_order: 1,
              }).select().single();
              if (ic) courseEntry.interactive.push(ic);
            }
          }
        }
      }
      courseData.push(courseEntry);
    }
  }

  // ── 3. Interactive content for existing course lessons ──
  // Activity types from DB: flashcards, drag_drop, fill_blanks, memory_game, timeline
  for (const ce of courseData) {
    if (!ce.lessons) continue;
    for (const lesson of ce.lessons) {
      // 50% chance of having an interactive activity
      if (Math.random() > 0.5 || !lesson.id) continue;
      const { data: existing } = await supabase.from('lesson_interactive_content')
        .select('id').eq('lesson_id', lesson.id).limit(1).maybeSingle();
      if (existing) continue;
      await supabase.from('lesson_interactive_content').insert({
        lesson_id: lesson.id,
        content_type: pick(['flashcards', 'drag_drop', 'fill_blanks', 'memory_game']),
        title: `Interactive: ${lesson.title}`,
        content_data: JSON.stringify({ difficulty: 'easy', max_attempts: 3 }),
        sequence_order: 1,
      });
    }
  }
  console.log('  ✅ Interactive content created');

  // ── 4. Quizzes for courses that don't have them ──
  for (const ce of courseData) {
    if (ce.quizIds && ce.quizIds.length > 0) continue;
    // Create per-chapter quizzes
    for (const chapter of ce.chapters) {
      const chapterLessons = ce.lessons.filter((l: any) => l.chapter_id === chapter.id);
      if (chapterLessons.length === 0) continue;
      const lastLesson = chapterLessons[chapterLessons.length - 1];
      if (!lastLesson) continue;
      const { data: quiz } = await supabase.from('quizzes').insert({
        lesson_id: lastLesson.id, title: `${ce.course.title} — Ch.${chapter.sequence_order}`,
        pass_threshold_pct: 70, time_limit_seconds: 600,
      }).select().single();
      if (!quiz) continue;
      ce.quizIds = ce.quizIds || [];
      ce.quizIds.push(quiz.id);
      // Create 3 generic questions per quiz
      const qIds: string[] = [];
      for (let qi = 0; qi < 3; qi++) {
        const { data: question } = await supabase.from('quiz_questions').insert({
          quiz_id: quiz.id,
          question_text: `Question ${qi + 1} for ${ce.course.title} Chapter ${chapter.sequence_order}`,
          question_type: 'multiple_choice', sequence_order: qi + 1,
        }).select().single();
        if (!question) continue;
        qIds.push(question.id);
        for (let oi = 0; oi < 4; oi++) {
          await supabase.from('quiz_options').insert({
            question_id: question.id,
            option_text: `Option ${String.fromCharCode(65 + oi)}`,
            is_correct: oi === 0, sequence_order: oi + 1,
          });
        }
      }
      quizData.set(quiz.id, { quizId: quiz.id, questionIds: qIds });
    }
  }
  console.log('  ✅ Additional quizzes created');
}

// ─── Summary ───────────────────────────────────────────────────────────
async function printSummary() {
  console.log('\n📊 Data Summary:');
  const tables = [
    'users', 'user_profiles', 'courses', 'course_chapters', 'lessons',
    'enrollments', 'lesson_progress', 'quizzes', 'quiz_questions',
    'quiz_options', 'quiz_attempts', 'quiz_answers', 'certificates',
    'notifications', 'recommendations', 'lesson_comments',
    'course_favorites', 'instructor_applications', 'contact_messages',
    'adaptive_interactions', 'lesson_interactive_content', 'media_assets',
  ];
  for (const table of tables) {
    const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(25)} ${count ?? 0} rows`);
  }
}

main().catch(console.error);
