/**
 * Database Seed Script
 * 
 * WHAT THIS DOES:
 * 1. Deletes ALL existing data from every table (clean slate)
 * 2. Creates 34 users (1 admin, 3 educators, 30 learners) with known passwords
 * 3. Creates 10 courses with 3 chapters/lessons each + quizzes
 * 4. Enrolls ~24 learners across courses, tracks progress
 * 5. Generates docs/SEED_CREDENTIALS.md with login info
 * 
 * HOW TO RUN:
 *   npm run seed
 * 
 * REQUIREMENTS:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── 1. LOAD ENVIRONMENT ─────────────────────────────────────────────
// Read .env.local manually (avoid parsing issues with dotenv)

function loadEnv(): { url: string; serviceKey: string } {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const raw = fs.readFileSync(envPath, 'utf-8')

  const get = (key: string): string => {
    const match = raw.split('\n').find((l) => l.trimStart().startsWith(key + '='))
    if (!match) throw new Error(`Missing ${key} in .env.local`)
    // Extract value after '=', strip optional quotes
    return match.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim()
  }

  return {
    url: get('NEXT_PUBLIC_SUPABASE_URL'),
    serviceKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

const env = loadEnv()

// ─── 2. CREATE SUPABASE ADMIN CLIENT ─────────────────────────────────
// Using the service_role key bypasses RLS — we have full access

const supabase = createClient(env.url, env.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── 3. SEED DATA ────────────────────────────────────────────────────

const ADMIN = { email: 'admin@acess.edu', password: 'Admin@123', name: 'Dr. Admin' }

const EDUCATORS = [
  { email: 'educator1@acess.edu', password: 'Educ@123', name: 'Educator 1' },
  { email: 'educator2@acess.edu', password: 'Educ@123', name: 'Educator 2' },
  { email: 'educator3@acess.edu', password: 'Educ@123', name: 'Educator 3' },
]

const LEARNERS = Array.from({ length: 30 }, (_, i) => ({
  email: `learner${i + 1}@test.com`,
  password: 'Learn@123',
  name: `Learner ${i + 1}`,
}))

// ─── 4. COURSE DATA ──────────────────────────────────────────────────
// Each course has: title, slug, description, difficulty_level, category,
// status, chapters (3 each), 1 lesson per chapter, 1 quiz per course

interface ChapterSeed {
  title: string
  description: string
  lessonTitle: string
  lessonHTML: string
  videoUrl: string
}

interface CourseSeed {
  title: string
  slug: string
  description: string
  difficulty_level: string
  category: string
  educatorIndex: number // which educator created_by (0 = admin, 1-3 = educators)
  chapters: ChapterSeed[]
  quizTitle: string
}

const COURSES: CourseSeed[] = [
  // ── Admin Courses (5) — Child cognitive disability focus ──────────

  // Course 1
  {
    title: 'My Feelings Are Okay',
    slug: 'my-feelings-are-okay',
    description: 'Learn about different feelings and emotions. It is okay to feel happy, sad, angry, or scared. This course helps you understand your feelings and what to do with them.',
    difficulty_level: 'beginner',
    category: 'emotional-regulation',
    educatorIndex: 0,
    chapters: [
      {
        title: 'All Feelings Are Welcome',
        description: 'Meet your feelings — happy, sad, angry, surprised, and more!',
        lessonTitle: 'All Feelings Are Welcome',
        lessonHTML: '<p>Feelings are like visitors. Sometimes they stay for a short time, sometimes longer. There are no bad feelings — all feelings are okay to have!</p><p>In this lesson, we will learn about different feelings and how to name them. When you know the name of a feeling, it gets smaller and easier to handle.</p><p>Try this: look in a mirror and make a happy face. Now a sad face. An angry face. A surprised face! Each feeling has a face. Can you name what you feel right now?</p>',
        videoUrl: 'https://www.youtube.com/watch?v=Po5lHYJJQfw',
      },
      {
        title: 'When I Feel Big Feelings',
        description: 'What to do when feelings feel too big and strong.',
        lessonTitle: 'When I Feel Big Feelings',
        lessonHTML: '<p>Sometimes feelings are so big they feel like a volcano inside! That is okay. Big feelings happen to everyone.</p><p>When you feel a big feeling, try these steps:</p><ul><li>Stop what you are doing</li><li>Take three deep breaths</li><li>Tell a grown-up how you feel</li></ul><p>Big feelings always pass. They are like clouds in the sky — they come and they go.</p>',
        videoUrl: 'https://www.youtube.com/watch?v=Lbizooup9ko',
      },
      {
        title: 'Calm Down Tools',
        description: 'Fun ways to calm your body and mind when you need a break.',
        lessonTitle: 'Calm Down Tools',
        lessonHTML: '<p>Everyone needs help calming down sometimes. Here are some fun tools you can use:</p><ul><li><strong>Balloon breathing:</strong> Breathe in and fill your belly like a balloon, then slowly let the air out</li><li><strong>Five senses check:</strong> Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste</li><li><strong>Hug yourself:</strong> Give yourself a big hug and squeeze tight</li></ul><p>Practice these tools when you are calm, so they are ready when you need them!</p>',
        videoUrl: 'https://www.youtube.com/watch?v=ujLkszl0xT4',
      },
    ],
    quizTitle: 'My Feelings Quiz',
  },

  // Course 2
  {
    title: 'Busy Hands, Happy Me',
    slug: 'busy-hands-happy-me',
    description: 'Fun activities for your hands! Drawing, cutting, puzzles, and more. These activities help your hands get strong and your brain get smart.',
    difficulty_level: 'beginner',
    category: 'motor-skills',
    educatorIndex: 0,
    chapters: [
      {
        title: 'Draw What You See',
        description: 'Learn to draw simple shapes and things around you.',
        lessonTitle: 'Draw What You See',
        lessonHTML: '<p>Drawing is a superpower! When you draw, your hands and eyes work together. This helps your brain grow strong connections.</p><p>Start with simple shapes: a circle, a square, a triangle. Can you draw a face using only circles? Two circles for eyes, one circle for a nose, and a big smile!</p><p>Remember: there is no wrong way to draw. Every artist starts somewhere. The more you practice, the better you get!</p>',
        videoUrl: 'https://www.youtube.com/watch?v=cX1S9jHYEyY',
      },
      {
        title: 'Cut and Create',
        description: 'Practice cutting and making fun crafts with paper.',
        lessonTitle: 'Cut and Create',
        lessonHTML: '<p>Cutting with scissors is a big skill for little hands! It might feel tricky at first, but practice makes it easier.</p><p>Tips for cutting:</p><ul><li>Thumb on top (in the small hole)</li><li>Other fingers in the big hole</li><li>Look at the line you are cutting</li><li>Go slowly</li></ul><p>Try cutting along a straight line first. Then try a zigzag line. Can you cut out a circle? Ask a grown-up for help with scissors.</p>',
        videoUrl: 'https://www.youtube.com/watch?v=CTtIiL_zLhk',
      },
      {
        title: 'Puzzle Time',
        description: 'Solve puzzles and play with building toys.',
        lessonTitle: 'Puzzle Time',
        lessonHTML: '<p>Puzzles are like mysteries for your brain! Each piece has its own special place. When you find the right spot, it feels amazing!</p><p>Start with simple puzzles with big pieces. Look at the colors and shapes to help you find where each piece goes.</p><p>Building with blocks is also a kind of puzzle. Can you build a tower as tall as your chair? What about a house for your favorite toy?</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Busy Hands Quiz',
  },

  // Course 3
  {
    title: 'Everyone Learns in Their Own Way',
    slug: 'everyone-learns-their-own-way',
    description: 'Did you know every brain is different? Some people learn by watching, some by doing, some by listening. Find out how YOU learn best!',
    difficulty_level: 'beginner',
    category: 'learning-styles',
    educatorIndex: 0,
    chapters: [
      {
        title: 'My Brain Is Special',
        description: 'Your brain works in its own wonderful way.',
        lessonTitle: 'My Brain Is Special',
        lessonHTML: '<p>Your brain is like a fingerprint — no one else has one exactly like yours! Some brains are great at remembering facts. Some brains are great at making art. Some are great at building things.</p><p>There is no "right" way to learn. The important thing is to find what works for YOU.</p><p>Some people learn best when they: see pictures, hear songs, move their body, or touch and feel things. Which one sounds like you?</p>',
        videoUrl: '',
      },
      {
        title: 'Finding My Way',
        description: 'Discover the ways you learn best.',
        lessonTitle: 'Finding My Way',
        lessonHTML: '<p>There are many ways to learn something new. Try these different ways and see which one helps you the most:</p><ul><li><strong>Look:</strong> Watch someone show you how</li><li><strong>Listen:</strong> Hear someone explain it</li><li><strong>Try:</strong> Do it yourself, even if it is hard at first</li><li><strong>Move:</strong> Use your body while learning</li></ul><p>You might like a mix of all of them! That is okay too.</p>',
        videoUrl: '',
      },
      {
        title: 'Trying New Things',
        description: 'Build confidence by trying new ways to learn.',
        lessonTitle: 'Trying New Things',
        lessonHTML: '<p>Trying something new can feel scary. But every time you try something new, your brain grows a little bit stronger!</p><p>When something feels hard, say to yourself: "I can not do this YET. But I am learning." The word "yet" is powerful — it means you are on your way.</p><p>Celebrate every small win. Did you finish one page? That is amazing! Did you try even though it was hard? That is brave!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Learning Styles Quiz',
  },

  // Course 4
  {
    title: 'My Daily Super Habits',
    slug: 'my-daily-super-habits',
    description: 'Turn everyday tasks into superpowers! Learn how morning routines, mealtime habits, and bedtime wind-downs can make your day awesome.',
    difficulty_level: 'intermediate',
    category: 'daily-routines',
    educatorIndex: 0,
    chapters: [
      {
        title: 'Morning Super Routine',
        description: 'Start your day strong with a morning routine.',
        lessonTitle: 'Morning Super Routine',
        lessonHTML: '<p>Mornings set the tone for the whole day! A good morning routine helps you feel ready and strong.</p><p>Your morning super routine could include:</p><ul><li>Wake up and stretch your body</li><li>Brush your teeth and wash your face</li><li>Get dressed</li><li>Eat breakfast</li><li>Check your schedule for the day</li></ul><p>Make a picture chart of your morning steps. Check off each one as you finish it!</p>',
        videoUrl: '',
      },
      {
        title: 'My Body, My Rules',
        description: 'Learn about self-care, hygiene, and personal boundaries.',
        lessonTitle: 'My Body, My Rules',
        lessonHTML: '<p>Your body is amazing and it belongs to YOU! Taking care of your body is an important super habit.</p><p>Self-care super habits include:</p><ul><li>Washing your hands before eating</li><li>Brushing your teeth morning and night</li><li>Taking a bath or shower</li><li>Wearing clean clothes</li><li>Drinking water throughout the day</li></ul><p>Your body is your friend. Treat it kindly!</p>',
        videoUrl: '',
      },
      {
        title: 'Ready for Bed',
        description: 'Wind down and get ready for a good night sleep.',
        lessonTitle: 'Ready for Bed',
        lessonHTML: '<p>Sleep is when your brain organizes everything you learned today. A good bedtime routine helps you fall asleep faster and sleep better.</p><p>Try this bedtime routine:</p><ul><li>Put toys away</li><li>Put on pajamas</li><li>Brush teeth</li><li>Read a book (or listen to a story)</li><li>Turn off screens 30 minutes before bed</li><li>Say goodnight to your family</li></ul><p>Sweet dreams!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Super Habits Quiz',
  },

  // Course 5
  {
    title: 'When Things Feel Too Big',
    slug: 'when-things-feel-too-big',
    description: 'Sometimes the world feels too loud, too bright, or too busy. Learn how to recognize sensory overload, ask for help, and use calming exercises to feel better.',
    difficulty_level: 'intermediate',
    category: 'sensory-regulation',
    educatorIndex: 0,
    chapters: [
      {
        title: 'What Is Sensory Overload?',
        description: 'Learn what happens when our senses get overwhelmed.',
        lessonTitle: 'What Is Sensory Overload?',
        lessonHTML: '<p>Our bodies have five senses: sight, sound, touch, taste, and smell. Sometimes, all of these senses get too much information at once. This is called sensory overload.</p><p>Signs of sensory overload:</p><ul><li>Feeling cranky or irritable</li><li>Wanting to cover your ears or eyes</li><li>Feeling like you need to run away</li><li>Getting a headache</li><li>Feeling very tired</li></ul><p>When this happens, it is a sign that your brain needs a break.</p>',
        videoUrl: '',
      },
      {
        title: 'My Calm-Down Kit',
        description: 'Build your own kit of tools to help when things feel too big.',
        lessonTitle: 'My Calm-Down Kit',
        lessonHTML: '<p>A calm-down kit is a collection of things that help you feel better when you are overwhelmed. You can keep it in a box or bag.</p><p>Ideas for your calm-down kit:</p><ul><li>A small toy you like to squeeze</li><li>Earplugs or headphones</li><li>A soft blanket or stuffed animal</li><li>A picture of a happy place</li><li>A bottle of water</li><li>A book you love</li></ul><p>When you feel too big, get your calm-down kit and find a quiet spot.</p>',
        videoUrl: '',
      },
      {
        title: 'Big Feelings, Brave Heart',
        description: 'Breathing exercises and grounding techniques to find your calm.',
        lessonTitle: 'Big Feelings, Brave Heart',
        lessonHTML: '<p>When feelings feel too big, your breath is your superpower. These exercises help your body calm down:</p><p><strong>Star Breathing:</strong> Trace a star with your finger. Breathe in on one line, out on the next.</p><p><strong>Grounding:</strong> Press your feet into the floor. Feel the ground holding you up. You are safe.</p><p><strong>Five Senses Check:</strong> Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.</p><p>You have a brave heart. You can get through this!</p>',
        videoUrl: 'https://www.youtube.com/watch?v=2PcCmxEW5WA',
      },
    ],
    quizTitle: 'Sensory Tools Quiz',
  },

  // ── Educator 1 Courses (2) — Preschool Math & Animals ────────────

  // Course 6
  {
    title: "Let's Count Together!",
    slug: 'lets-count-together',
    description: 'Learn to count numbers 1 to 10 with fun songs, colorful objects, and counting games. Perfect for preschool friends!',
    difficulty_level: 'beginner',
    category: 'math',
    educatorIndex: 1,
    chapters: [
      {
        title: 'Numbers 1 to 5',
        description: 'Learn to count from one to five.',
        lessonTitle: 'Numbers 1 to 5',
        lessonHTML: '<p>Let us learn to count! Numbers are all around us.</p><p>Count with me: 1, 2, 3, 4, 5!</p><p>Can you find 1 nose? 2 eyes? 3 fingers? 4 legs on a dog? 5 toes on your foot?</p><p>Numbers help us understand the world. Every number tells us "how many."</p>',
        videoUrl: 'https://www.youtube.com/watch?v=Yt8GFgxlITs',
      },
      {
        title: 'Numbers 6 to 10',
        description: 'Keep counting from six all the way to ten!',
        lessonTitle: 'Numbers 6 to 10',
        lessonHTML: '<p>Now let us learn bigger numbers! 6, 7, 8, 9, 10!</p><p>Can you count 6 crayons? 7 days in a week? 8 legs on an octopus? 9 balloons? 10 fingers?</p><p>When you know numbers 1 through 10, you can count almost anything!</p>',
        videoUrl: 'https://www.youtube.com/watch?v=Yt8GFgxlITs',
      },
      {
        title: 'Counting All Around',
        description: 'Find numbers and counting in your everyday world.',
        lessonTitle: 'Counting All Around',
        lessonHTML: '<p>Numbers are everywhere! Can you find them?</p><p>Look at a clock — numbers tell us the time. Look at a phone — numbers help us call people. Look at a book — numbers tell us the page.</p><p>Go on a number hunt! Walk around your home and find numbers. Count how many chairs, windows, or spoons you see. Counting is a superpower!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Counting Quiz',
  },

  // Course 7
  {
    title: 'Animal Friends',
    slug: 'animal-friends',
    description: 'Meet farm animals, learn their names and sounds, and discover where they live. A fun adventure for little animal lovers!',
    difficulty_level: 'beginner',
    category: 'animals',
    educatorIndex: 1,
    chapters: [
      {
        title: 'Farm Animals',
        description: 'Meet the animals that live on a farm.',
        lessonTitle: 'Farm Animals',
        lessonHTML: '<p>Farms are home to many friendly animals! Each animal has its own name and special sound.</p><p>Can you make these sounds?</p><ul><li>Cow says MOO</li><li>Pig says OINK OINK</li><li>Sheep says BAA BAA</li><li>Horse says NEIGH</li><li>Duck says QUACK QUACK</li></ul><p>Animal sounds are fun to make! They help us remember each animal.</p>',
        videoUrl: 'https://www.youtube.com/watch?v=zXEq-QO3xTg',
      },
      {
        title: 'Animals and Their Homes',
        description: 'Learn where different animals live.',
        lessonTitle: 'Animals and Their Homes',
        lessonHTML: '<p>Every animal has a home. A home keeps them safe and cozy, just like your home does for you!</p><p>Match each animal to its home:</p><ul><li>A cow lives in a <strong>barn</strong></li><li>A fish lives in <strong>water</strong></li><li>A bird lives in a <strong>nest</strong></li><li>A dog lives in a <strong>doghouse</strong></li></ul><p>Can you think of where a cat lives? A bear? A rabbit?</p>',
        videoUrl: '',
      },
      {
        title: 'Taking Care of Pets',
        description: 'Learn how to be a kind and responsible pet owner.',
        lessonTitle: 'Taking Care of Pets',
        lessonHTML: '<p>Pets are special friends who need our help. Taking care of a pet teaches us to be responsible and kind.</p><p>Pets need:</p><ul><li><strong>Food and water</strong> every day</li><li><strong>A clean home</strong> (cage, tank, or bed)</li><li><strong>Exercise and play</strong></li><li><strong>Love and attention</strong></li><li><strong>Visits to the doctor</strong> (vet)</li></ul><p>Having a pet is a big responsibility, but the love they give back makes it all worth it!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Animal Friends Quiz',
  },

  // ── Educator 2 Courses (2) — Shapes & Colors ────────────────────

  // Course 8
  {
    title: 'Shapes All Around',
    slug: 'shapes-all-around',
    description: 'Discover circles, squares, triangles, and stars! Learn to find shapes in everyday objects and have fun drawing them.',
    difficulty_level: 'beginner',
    category: 'shapes',
    educatorIndex: 2,
    chapters: [
      {
        title: 'Circles and Squares',
        description: 'Learn about circles and squares and where to find them.',
        lessonTitle: 'Circles and Squares',
        lessonHTML: '<p>Shapes are everywhere! Let us learn two important shapes.</p><p><strong>Circle:</strong> A circle is round with no corners. Like a ball, the sun, or a cookie!</p><p><strong>Square:</strong> A square has four sides that are all the same. Like a window, a napkin, or a tile!</p><p>Can you find a circle in your room? Can you find a square?</p>',
        videoUrl: 'https://www.youtube.com/watch?v=TJhfl5vdxp4',
      },
      {
        title: 'Triangles and Stars',
        description: 'Discover triangles and stars in the world around you.',
        lessonTitle: 'Triangles and Stars',
        lessonHTML: '<p>More fun shapes to learn!</p><p><strong>Triangle:</strong> A triangle has three sides and three corners. Like a slice of pizza, a roof, or a sail on a boat!</p><p><strong>Star:</strong> A star has five points. Like the stars in the sky, or a star you draw on paper!</p><p>Can you draw all four shapes: circle, square, triangle, and star?</p>',
        videoUrl: 'https://www.youtube.com/watch?v=OEbRDtCAFdU',
      },
      {
        title: 'Shapes in My World',
        description: 'Go on a shape hunt and find shapes everywhere!',
        lessonTitle: 'Shapes in My World',
        lessonHTML: '<p>Shapes are hiding all around you! Let us go on a shape hunt.</p><p>Look at these objects. What shape are they?</p><ul><li>A clock → <strong>circle</strong></li><li>A book → <strong>rectangle</strong></li><li>A pizza slice → <strong>triangle</strong></li><li>A stop sign → <strong>octagon</strong></li></ul><p>When you learn shapes, you start noticing them everywhere. Shapes help us understand and describe the world!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Shapes Quiz',
  },

  // Course 9
  {
    title: 'Rainbow Colors',
    slug: 'rainbow-colors',
    description: 'Explore the wonderful world of colors! Learn red, blue, yellow, green, and more. Discover how colors mix to make new colors.',
    difficulty_level: 'beginner',
    category: 'colors',
    educatorIndex: 2,
    chapters: [
      {
        title: 'Red and Blue',
        description: 'Learn about the colors red and blue.',
        lessonTitle: 'Red and Blue',
        lessonHTML: '<p>Colors make our world beautiful! Let us start with two amazing colors.</p><p><strong>Red</strong> is the color of apples, strawberries, and hearts. Red can mean love, energy, or stop!</p><p><strong>Blue</strong> is the color of the sky, the ocean, and blueberries. Blue can mean calm, cool, or sky!</p><p>What red things can you see right now? What blue things?</p>',
        videoUrl: 'https://www.youtube.com/watch?v=yu44JRTIxSQ',
      },
      {
        title: 'Yellow and Green',
        description: 'Learn about yellow and green, and how colors mix!',
        lessonTitle: 'Yellow and Green',
        lessonHTML: '<p>Two more beautiful colors!</p><p><strong>Yellow</strong> is the color of the sun, bananas, and happy faces. Yellow is bright and warm!</p><p><strong>Green</strong> is the color of grass, leaves, and frogs. Green is the color of nature!</p><p>Did you know that blue and yellow mixed together make <strong>green</strong>? Color mixing is like magic!</p>',
        videoUrl: 'https://www.youtube.com/watch?v=aMTIm-D1l54',
      },
      {
        title: 'Color Hunt',
        description: 'Find all the colors of the rainbow in your world.',
        lessonTitle: 'Color Hunt',
        lessonHTML: '<p>The rainbow has many colors: red, orange, yellow, green, blue, indigo, violet!</p><p>Go on a color hunt! Find something for each color:</p><ul><li>Red: a toy, a shirt, a fruit</li><li>Orange: a crayon, a flower, a snack</li><li>Yellow: the sun, a book, a sock</li><li>Green: a plant, a vegetable, a pencil</li><li>Blue: the sky, water, a piece of clothing</li></ul><p>Colors make our world bright and wonderful!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'Colors Quiz',
  },

  // ── Educator 3 Course (1) — Body & Senses ──────────────────────

  // Course 10
  {
    title: 'My Amazing Body',
    slug: 'my-amazing-body',
    description: 'Learn about your amazing body! Discover body parts, the five senses, and how to stay healthy and strong.',
    difficulty_level: 'beginner',
    category: 'body-senses',
    educatorIndex: 3,
    chapters: [
      {
        title: 'My Body Parts',
        description: 'Learn the names of your body parts.',
        lessonTitle: 'My Body Parts',
        lessonHTML: '<p>Your body is amazing! It has many parts that work together.</p><p>Let us learn some body parts:</p><ul><li><strong>Head:</strong> Your head holds your brain, which thinks and learns!</li><li><strong>Shoulders:</strong> Your shoulders help you move your arms</li><li><strong>Knees:</strong> Your knees help you bend and jump</li><li><strong>Toes:</strong> Your toes help you balance</li></ul><p>Can you touch your head? Wiggle your shoulders? Bend your knees? Wiggle your toes?</p>',
        videoUrl: 'https://www.youtube.com/watch?v=lMQcwNZVUO8',
      },
      {
        title: 'My Five Senses',
        description: 'Discover how you see, hear, touch, taste, and smell.',
        lessonTitle: 'My Five Senses',
        lessonHTML: '<p>Your body has five special ways to explore the world: your five senses!</p><ul><li><strong>Seeing:</strong> Your eyes let you see colors, shapes, and faces</li><li><strong>Hearing:</strong> Your ears let you hear music, voices, and sounds</li><li><strong>Touching:</strong> Your skin lets you feel soft, hard, hot, cold</li><li><strong>Tasting:</strong> Your tongue lets you taste sweet, sour, salty, bitter</li><li><strong>Smelling:</strong> Your nose lets you smell flowers, food, and fresh air</li></ul><p>Which sense is your favorite?</p>',
        videoUrl: '',
      },
      {
        title: 'Staying Healthy',
        description: 'Learn how to keep your body healthy and strong.',
        lessonTitle: 'Staying Healthy',
        lessonHTML: '<p>A healthy body is a happy body! Here are ways to stay healthy:</p><ul><li><strong>Eat good food:</strong> Fruits, vegetables, grains, and protein help you grow</li><li><strong>Drink water:</strong> Water helps every part of your body work well</li><li><strong>Move your body:</strong> Running, jumping, dancing — it all helps!</li><li><strong>Sleep enough:</strong> Sleep helps your brain and body rest and grow</li><li><strong>Wash your hands:</strong> Hand washing keeps germs away</li></ul><p>Your body takes care of you. Take care of it back!</p>',
        videoUrl: '',
      },
    ],
    quizTitle: 'My Body Quiz',
  },
]

// ─── 5. HELPER FUNCTIONS ─────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── 6. MAIN SEED FUNCTION ───────────────────────────────────────────

async function main() {
  console.log('\n🚀 Starting database seed...\n')

  // ── Step A: Clean everything ────────────────────────────────────
  console.log('🧹 Cleaning existing data...')

  // Delete order: leaf tables first → root tables last
  const deleteTables = [
    'quiz_answers',
    'quiz_attempts',
    'quiz_options',
    'quiz_questions',
    'quizzes',
    'learner_checkpoints',
    'lesson_checkpoints',
    'learner_milestones',
    'course_milestones',
    'certificate_verifications',
    'certificates',
    'certificate_templates',
    'lesson_summaries',
    'lesson_progress',
    'lesson_assets',
    'course_favorites',
    'recommendations',
    'notifications',
    'enrollments',
    'course_tags',
    'course_chapters',
    'lessons',
    'instructor_applications',
    'referral_codes',
    'contact_messages',
    'password_reset_tokens',
    'user_accessibility_settings',
    'user_profiles',
    'user_notification_settings',
    'lesson_templates',
    'learner_profiles',
    'user_accessibility_preferences',
    'courses',
  ]

  for (const table of deleteTables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && !error.message?.includes('does not exist')) {
      console.warn(`  ⚠️  Error deleting ${table}: ${error.message}`)
    }
  }

  // Delete public.users (before auth.users)
  const { error: usersDelErr } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (usersDelErr) console.warn(`  ⚠️  Error deleting users: ${usersDelErr.message}`)

  // Delete existing auth users
  let hasMore = true
  let page = 0
  while (hasMore) {
    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (listErr || !userList) break
    for (const u of userList.users) {
      await supabase.auth.admin.deleteUser(u.id)
    }
    hasMore = userList.users.length === 100
    page++
  }

  console.log('  ✅ All data cleared\n')

  // ── Step B: Create auth users (trigger creates public.users rows) ─
  console.log('👤 Creating users...')

  async function createUser(email: string, password: string, name: string, role: string) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role },
    })
    if (error) {
      console.error(`  ❌ Failed to create ${email}: ${error.message}`)
      return null
    }
    return data.user
  }

  const adminUser = await createUser(ADMIN.email, ADMIN.password, ADMIN.name, 'admin')
  const educatorUsers = await Promise.all(
    EDUCATORS.map((e) => createUser(e.email, e.password, e.name, 'educator'))
  )
  const learnerUsers = await Promise.all(
    LEARNERS.map((l) => createUser(l.email, l.password, l.name, 'learner'))
  )

  const allUsers = [adminUser, ...educatorUsers, ...learnerUsers].filter(Boolean) as NonNullable<typeof adminUser>[]
  console.log(`  ✅ Created ${allUsers.length} users\n`)

  // ── Step C: Create courses + chapters + lessons + quizzes ─────────
  console.log('📚 Creating courses...')

  const createdCourses: { id: string; title: string }[] = []

  for (const course of COURSES) {
    const educatorId = course.educatorIndex === 0
      ? adminUser!.id
      : educatorUsers[course.educatorIndex - 1]!.id

    // Insert course
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .insert({
        created_by: educatorId,
        title: course.title,
        slug: course.slug,
        description: course.description,
        status: 'published',
        difficulty_level: course.difficulty_level,
        category: course.category,
        course_type: 'educator',
        created_by_role: course.educatorIndex === 0 ? 'admin' : 'educator',
      })
      .select('id')
      .single()

    if (courseErr || !courseData) {
      console.error(`  ❌ Failed to create course "${course.title}": ${courseErr?.message}`)
      continue
    }

    const courseId = courseData.id
    createdCourses.push({ id: courseId, title: course.title })

    // Insert chapters + lessons
    for (let ci = 0; ci < course.chapters.length; ci++) {
      const ch = course.chapters[ci]

      const { data: chData, error: chErr } = await supabase
        .from('course_chapters')
        .insert({
          course_id: courseId,
          title: ch.title,
          description: ch.description,
          sequence_order: ci + 1,
        })
        .select('id')
        .single()

      if (chErr || !chData) {
        console.error(`  ❌ Failed to create chapter "${ch.title}": ${chErr?.message}`)
        continue
      }

      const { error: lessonErr } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          chapter_id: chData.id,
          title: ch.lessonTitle,
          content_html: ch.lessonHTML,
          video_url: ch.videoUrl || null,
          sequence_order: ci + 1,
          status: 'published',
          lesson_type: 'standard',
        })

      if (lessonErr) {
        console.error(`  ❌ Failed to create lesson "${ch.lessonTitle}": ${lessonErr.message}`)
      }
    }

    // Get first lesson of this course for quiz attachment
    const { data: firstLesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .order('sequence_order', { ascending: true })
      .limit(1)
      .single()

    // Insert quiz (attached to first lesson)
    const { data: quizData, error: quizErr } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: firstLesson?.id || null,
        title: course.quizTitle,
        time_limit_seconds: 300,
        max_attempts: 3,
        pass_threshold_pct: 60,
      })
      .select('id')
      .single()

    if (quizErr || !quizData) {
      console.error(`  ❌ Failed to create quiz "${course.quizTitle}": ${quizErr?.message}`)
      continue
    }

    // Insert 3 questions per quiz, each with 4 options
    for (let qi = 0; qi < 3; qi++) {
      const { data: qData, error: qErr } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quizData.id,
          question_text: `Sample question ${qi + 1} for "${course.title}"`,
          question_type: 'multiple_choice',
          sequence_order: qi + 1,
        })
        .select('id')
        .single()

      if (qErr || !qData) continue

      for (let oi = 0; oi < 4; oi++) {
        await supabase.from('quiz_options').insert({
          question_id: qData.id,
          option_text: `Option ${oi + 1}`,
          is_correct: oi === 0, // first option is correct
          sequence_order: oi + 1,
        })
      }
    }

    console.log(`  ✅ "${course.title}" (${course.chapters.length} lessons)`)
  }

  console.log(`\n  ✅ ${createdCourses.length} courses created\n`)

  // ── Step D: Fetch all lessons and quizzes for enrollment ─────────
  const { data: allLessons } = await supabase.from('lessons').select('id, course_id, title')
  const { data: allQuizzes } = await supabase.from('quizzes').select('id, title')
  const { data: allQuizQuestions } = await supabase.from('quiz_questions').select('id, quiz_id')
  const { data: allQuizOptions } = await supabase.from('quiz_options').select('id, question_id, is_correct')

  const lessonsByCourse = new Map<string, { id: string; title: string }[]>()
  if (allLessons) {
    for (const l of allLessons) {
      const arr = lessonsByCourse.get(l.course_id) || []
      arr.push(l)
      lessonsByCourse.set(l.course_id, arr)
    }
  }

  // ── Step E: Enroll learners ─────────────────────────────────────
  console.log('📝 Creating enrollments...')

  // 24 learners get enrolled, 6 stay unenrolled
  const enrolledLearners = learnerUsers.slice(0, 24).filter(Boolean)
  const allCourseIds = createdCourses.map((c) => c.id)
  const enrollments: { id: string; userId: string; courseId: string }[] = []

  for (const learner of enrolledLearners) {
    // Each learner gets 2-4 random courses
    const numCourses = randomInt(2, 4)
    const shuffled = [...allCourseIds].sort(() => Math.random() - 0.5)
    const chosen = shuffled.slice(0, numCourses)

    for (const courseId of chosen) {
      const { data: enr, error: enrErr } = await supabase
        .from('enrollments')
        .insert({
          user_id: learner.id,
          course_id: courseId,
          status: pick(['active', 'active', 'active', 'completed']),
          enrolled_at: new Date(Date.now() - randomInt(1, 60) * 86400000).toISOString(),
        })
        .select('id')
        .single()

      if (enrErr) {
        console.error(`  ❌ Enrollment error: ${enrErr.message}`)
        continue
      }
      if (enr) enrollments.push({ id: enr.id, userId: learner.id, courseId })
    }
  }
  console.log(`  ✅ ${enrollments.length} enrollments created\n`)

  // ── Step F: Create lesson progress ──────────────────────────────
  console.log('📖 Creating lesson progress...')

  let progressCount = 0
  for (const enr of enrollments) {
    const courseLessons = lessonsByCourse.get(enr.courseId) || []
    if (courseLessons.length === 0) continue

    // Complete some lessons, partially complete others
    const numToComplete = randomInt(1, courseLessons.length)
    const completedLessons = courseLessons.slice(0, numToComplete)

    for (const lesson of completedLessons) {
      const { error: lpErr } = await supabase
        .from('lesson_progress')
        .insert({
          enrollment_id: enr.id,
          lesson_id: lesson.id,
          is_viewed: true,
          view_count: randomInt(1, 5),
          first_viewed_at: new Date(Date.now() - randomInt(1, 30) * 86400000).toISOString(),
          last_viewed_at: new Date().toISOString(),
          time_spent_learning: randomInt(60, 600),
        })

      if (!lpErr) progressCount++
    }
  }
  console.log(`  ✅ ${progressCount} lesson progress records created\n`)

  // ── Step G: Create quiz attempts ────────────────────────────────
  console.log('🧪 Creating quiz attempts...')

  let attemptCount = 0
  const questionMap = new Map<string, string[]>()
  if (allQuizQuestions) {
    for (const q of allQuizQuestions) {
      const arr = questionMap.get(q.quiz_id) || []
      arr.push(q.id)
      questionMap.set(q.quiz_id, arr)
    }
  }

  // For each enrollment, create some quiz attempts
  for (const enr of enrollments) {
    if (Math.random() > 0.6) continue // only 40% of enrollments have attempts
    const quiz = pick(allQuizzes || [])
    if (!quiz) continue

    const questions = questionMap.get(quiz.id) || []
    if (questions.length === 0) continue

    const { data: attempt, error: attErr } = await supabase
      .from('quiz_attempts')
      .insert({
        enrollment_id: enr.id,
        quiz_id: quiz.id,
        attempt_number: 1,
        score_pct: randomInt(40, 100),
        result: pick(['pass', 'pass', 'pass', 'fail']),
        started_at: new Date(Date.now() - randomInt(1, 10) * 86400000).toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (attErr || !attempt) continue

    for (const questionId of questions) {
      const options = allQuizOptions?.filter((o) => o.question_id === questionId) || []
      const correctOpt = options.find((o) => o.is_correct)
      // 70% chance of picking correct answer
      const chosenOption = Math.random() < 0.7 && correctOpt
        ? correctOpt
        : pick(options)

      if (chosenOption) {
        await supabase.from('quiz_answers').insert({
          attempt_id: attempt.id,
          question_id: questionId,
          selected_option_id: chosenOption.id,
          is_correct: chosenOption.is_correct,
        })
      }
    }
    attemptCount++
  }
  console.log(`  ✅ ${attemptCount} quiz attempts created\n`)

  // ── Step H: Create some certificates for completed enrollments ──
  console.log('🎓 Creating certificates...')

  let certCount = 0
  for (const enr of enrollments) {
    const courseLessons = lessonsByCourse.get(enr.courseId) || []
    if (courseLessons.length === 0) continue

    // Get progress for this enrollment
    const { data: prog } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('enrollment_id', enr.id)

    // If all lessons completed, issue a certificate
    if (prog && prog.length >= courseLessons.length && Math.random() < 0.5) {
      const course = createdCourses.find((c) => c.id === enr.courseId)
      const learner = allUsers.find((u) => u.id === enr.userId)
      if (!course || !learner) continue

      const refCode = `CERT-${enr.id.substring(0, 8).toUpperCase()}`

      const { error: certErr } = await supabase.from('certificates').insert({
        enrollment_id: enr.id,
        user_id: enr.userId,
        course_id: enr.courseId,
        reference_code: refCode,
        status: 'issued',
        learner_name: learner.user_metadata?.full_name || '',
        course_title: course.title,
        completion_date: new Date().toISOString(),
        issued_at: new Date().toISOString(),
      })

      if (!certErr) certCount++
    }
  }
  console.log(`  ✅ ${certCount} certificates created\n`)

  // ── Step I: Generate credentials file ────────────────────────────
  console.log('📄 Writing credentials file...')

  const credsPath = path.resolve(__dirname, '..', 'docs', 'SEED_CREDENTIALS.md')
  const credsDir = path.dirname(credsPath)
  if (!fs.existsSync(credsDir)) fs.mkdirSync(credsDir, { recursive: true })

  const lines: string[] = [
    '# Seed Credentials',
    '',
    '## Login URLs',
    `- App: \`http://localhost:3000/login\``,
    `- Supabase Dashboard: \`https://supabase.com/dashboard/project/${env.url.match(/https:\/\/([^.]+)/)?.[1] || ''}\``,
    '',
    '---',
    '',
    '## Admin',
    '| Email | Password | Name |',
    '|-------|----------|------|',
    `| \`${ADMIN.email}\` | \`${ADMIN.password}\` | ${ADMIN.name} |`,
    '',
    '## Educators',
    '| Email | Password | Name |',
    '|-------|----------|------|',
    ...EDUCATORS.map((e) => `| \`${e.email}\` | \`${e.password}\` | ${e.name} |`),
    '',
    '## Learners (30)',
    '| Email | Password | Name |',
    '|-------|----------|------|',
    ...LEARNERS.map((l) => `| \`${l.email}\` | \`${l.password}\` | ${l.name} |`),
    '',
    '---',
    '',
    '## Seed Data Summary',
    `- **Users:** ${allUsers.length} (1 admin, 3 educators, 30 learners)`,
    `- **Courses:** ${createdCourses.length}`,
    `- **Enrollments:** ${enrollments.length}`,
    `- **Lesson Progress Records:** ${progressCount}`,
    `- **Quiz Attempts:** ${attemptCount}`,
    `- **Certificates Issued:** ${certCount}`,
    '',
    '## How to Log In',
    '1. Start the dev server: `npm run dev`',
    '2. Open http://localhost:3000/login',
    '3. Enter the email and password from above',
    '4. Each role sees a different dashboard:',
    '   - Admin → admin dashboard (/admin)',
    '   - Educators → educator dashboard (/educator)',
    '   - Learners → learner dashboard (/learner)',
  ]

  fs.writeFileSync(credsPath, lines.join('\n'), 'utf-8')
  console.log(`  ✅ Credentials written to ${credsPath}\n`)

  // ── Done ─────────────────────────────────────────────────────────
  console.log('🎉 Seed complete!')
  console.log('   Open docs/SEED_CREDENTIALS.md to see all login details.\n')
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
