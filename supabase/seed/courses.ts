/**
 * ACESS demo catalogue.
 *
 * Eleven courses covering every state the UI can show: published, draft,
 * pending review, archived, popular, brand new and one with no learners at all.
 *
 * Lessons carry an explicit accessibility `tier`. That tier decides which of
 * the fields the real audit engine reads (transcript, learning objectives,
 * simplified summary, accessibility notes, focus/chunking toggles, estimated
 * duration) actually get filled in — so the compliance checker produces genuine
 * variation instead of a uniform score. See supabase/seed/run.ts, which feeds
 * every seeded lesson through auditLesson() from src/lib/accessibility-audit.ts
 * and stores the score it returns.
 */

import { STOCK_COURSE_THUMBNAILS } from '../../src/lib/course-thumbnails';

/** 'strong' ≈ 80-100, 'partial' ≈ 50-79, 'weak' < 50 once audited. */
export type AccessibilityTier = 'strong' | 'partial' | 'weak';

export interface QuizOptionDef {
  text: string;
  correct: boolean;
}
export interface QuizQuestionDef {
  text: string;
  type: 'multiple_choice' | 'scenario';
  options: QuizOptionDef[];
}
export interface QuizDef {
  title: string;
  passPct: number;
  maxAttempts: number;
  timeLimitSeconds: number;
  questions: QuizQuestionDef[];
}

export interface ActivityDef {
  type: 'flashcards' | 'drag_drop' | 'fill_blanks' | 'memory_game' | 'timeline';
  title: string;
  data: Record<string, unknown>;
}

export interface VideoQuestionDef {
  title: string;
  atSeconds: number;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface CheckpointDef {
  title: string;
  description: string;
  type: 'reflection' | 'practice' | 'quiz' | 'activity' | 'milestone';
  required: boolean;
}

export interface MaterialDef {
  title: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  url: string;
}

export interface LessonDef {
  title: string;
  type: 'standard' | 'video' | 'quiz' | 'practice' | 'reading' | 'assessment';
  layout?: 'standard' | 'focus' | 'two_column' | 'wide' | 'slideshow';
  minutes: number;
  tier: AccessibilityTier;
  html: string;
  objectives?: string[];
  simplifiedSummary?: string;
  accessibilityNotes?: string;
  /** YouTube id — every one of these was checked against the oEmbed API. */
  videoId?: string;
  transcript?: string;
  quiz?: QuizDef;
  activity?: ActivityDef;
  videoQuestions?: VideoQuestionDef[];
  checkpoints?: CheckpointDef[];
  materials?: MaterialDef[];
  summaryActivity?: { wordTarget: number; keyPoints: string[]; reflection: string[] };
  /** Draft lessons stay hidden from learners. */
  draft?: boolean;
}

export interface ChapterDef {
  title: string;
  description: string;
  lessons: LessonDef[];
}

export interface AchievementDef {
  name: string;
  description: string;
  requirement: 'progress' | 'lesson' | 'quiz' | 'streak';
  threshold: number;
  icon: string;
}

export interface MilestoneDef {
  title: string;
  description: string;
  pct: number;
  icon: string;
}

export interface CourseDef {
  key: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  courseType: 'educator' | 'system';
  ownerKey: string;
  ownerRole: 'educator' | 'admin';
  createdAt: string;
  publishedAt: string | null;
  /** Set only on the archived course. */
  deletedAt?: string | null;
  thumbnail: string;
  tags: string[];
  focus: 'adhd' | 'autism' | 'dyslexia' | 'general';
  secondaryFocus: string[];
  accessibilityCategories: string[];
  targetReadingAge: number | null;
  recommendedAgeGroup: string;
  supports: {
    tts: boolean;
    focusMode: boolean;
    chunked: boolean;
    transcripts: boolean;
    streaks: boolean;
    chapters: boolean;
    milestones: boolean;
    guided: boolean;
  };
  certificateEnabled: boolean;
  layoutType: 'standard' | 'guided' | 'simplified' | 'focused';
  chapters: ChapterDef[];
  achievements: AchievementDef[];
  milestones: MilestoneDef[];
}

const T = STOCK_COURSE_THUMBNAILS;

// ── Reusable prose helpers ────────────────────────────────────────────────
const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('');
const h = (level: 2 | 3, text: string) => `<h${level}>${text}</h${level}>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

// ══════════════════════════════════════════════════════════════════════════
export const COURSES: CourseDef[] = [
  // ═══════════ 1. Foundations of Accessible Learning (system, popular) ═══════════
  {
    key: 'c_foundations',
    title: 'Foundations of Accessible Learning',
    slug: 'foundations-of-accessible-learning',
    description:
      'The starting point for every ACESS learner. Understand how accessible learning works, set up the tools that suit you, and build a study routine you can keep.',
    category: 'Accessibility',
    difficulty: 'beginner',
    status: 'published',
    courseType: 'system',
    ownerKey: 'admin_aliff',
    ownerRole: 'admin',
    createdAt: '2026-01-18T09:00:00+08:00',
    publishedAt: '2026-01-25T10:00:00+08:00',
    thumbnail: T[1],
    tags: ['accessibility', 'onboarding', 'study skills', 'foundation'],
    focus: 'general',
    secondaryFocus: ['adhd', 'dyslexia'],
    accessibilityCategories: ['adhd', 'dyslexia', 'autism'],
    targetReadingAge: 12,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: true, streaks: true, chapters: true, milestones: true, guided: true },
    certificateEnabled: true,
    layoutType: 'guided',
    chapters: [
      {
        title: 'Getting Started',
        description: 'What accessible learning means and how ACESS supports it.',
        lessons: [
          {
            title: 'What Accessible Learning Means',
            type: 'standard',
            minutes: 10,
            tier: 'strong',
            objectives: [
              'Explain what accessible learning means in your own words',
              'Name three barriers that stop people from learning',
              'Describe one adjustment that would help you personally',
            ],
            simplifiedSummary:
              'Accessible learning means the lesson changes to fit you. You can make text bigger, listen instead of read, or take one step at a time.',
            accessibilityNotes:
              'Short paragraphs, one idea per heading. No colour-only meaning. All examples use plain language at roughly a Year 7 reading level.',
            html:
              h(2, 'What Accessible Learning Means') +
              p(
                'Accessible learning means the lesson changes to fit the learner. It does not mean the lesson is easier. It means the barriers are removed.',
                'Think about a ramp next to a set of stairs. The ramp does not shorten the journey. It just makes the door reachable for more people.',
              ) +
              h(3, 'Three Common Barriers') +
              ul([
                '<strong>Text that is hard to read.</strong> Small fonts, tight spacing and long paragraphs slow everyone down.',
                '<strong>Too much at once.</strong> A page with twenty things on it hides the one thing that matters now.',
                '<strong>No second route.</strong> If a video has no transcript, anyone who cannot use audio gets nothing.',
              ]) +
              h(3, 'What You Can Change Here') +
              p(
                'In ACESS you can set the font, the text size, the line spacing and the background tint. You can turn on text to speech. You can switch a long lesson into small chunks.',
                'Try one change now. Open your accessibility settings and make the text one step bigger. If it feels better, keep it.',
              ),
            summaryActivity: {
              wordTarget: 60,
              keyPoints: ['Accessible learning removes barriers', 'It does not make content easier', 'Settings are personal'],
              reflection: ['Which barrier affects you most?', 'Which setting will you try first?'],
            },
            checkpoints: [
              { title: 'Set your text size', description: 'Open settings and pick a comfortable text size.', type: 'practice', required: true },
            ],
          },
          {
            title: 'Setting Up Your Learning Profile',
            type: 'video',
            minutes: 12,
            tier: 'strong',
            videoId: 'JC82Il2cjqA',
            objectives: ['Choose an accessibility preset', 'Adjust font and spacing', 'Save your preferences'],
            simplifiedSummary: 'Pick a preset that matches how you learn. Then change any single setting you want. Your choice is saved.',
            accessibilityNotes: 'Video is captioned by the publisher and a full transcript is provided below the player.',
            transcript:
              'You can learn anything. Your brain is like a muscle. The more you use it, the stronger it gets. Every time you learn something new, your brain grows new connections. ' +
              'When a task feels hard, that feeling of difficulty is your brain building those connections. Struggle is not a sign that you cannot do it. Struggle is the work itself. ' +
              'In this course we will set up the tools that make that work easier to sustain: the size of the text you read, the pace you move at, and the way each lesson is broken up. ' +
              'Start by choosing a preset. A preset is a bundle of settings that suits a common way of working. If you find long pages overwhelming, the chunked preset shows one section at a time. ' +
              'If letters swim on the page, the dyslexia preset changes the typeface, widens the spacing and tints the background. ' +
              'None of these choices are permanent. Change one setting, see how it feels, and change it again tomorrow. The goal is a setup you forget about because it simply works.',
            html:
              h(2, 'Setting Up Your Learning Profile') +
              p(
                'Your learning profile controls how every lesson in ACESS is presented to you. It follows you from course to course.',
                'Watch the short video, then work through the three steps below.',
              ) +
              h(3, 'Step 1 — Choose a Preset') +
              p('A preset is a starting bundle. Pick the one that sounds closest to you. You can change any part of it afterwards.') +
              ul([
                '<strong>ADHD</strong> — one section at a time, fewer distractions, a checklist down the side.',
                '<strong>Dyslexia</strong> — a rounded typeface, wider spacing, a soft cream background and a reading spotlight.',
                '<strong>Autism</strong> — muted colours, no animation, a predictable page order and a visual schedule.',
              ]) +
              h(3, 'Step 2 — Fine Tune') +
              p('Change one setting at a time and read a paragraph after each change. Keep what helps.') +
              h(3, 'Step 3 — Save') +
              p('Your settings save automatically and apply to every course you open from now on.'),
            videoQuestions: [
              {
                title: 'Checkpoint: growth',
                atSeconds: 45,
                text: 'What does the video say the feeling of difficulty means?',
                options: ['You should stop', 'Your brain is building connections', 'The lesson is broken', 'You picked the wrong course'],
                correctIndex: 1,
              },
            ],
            checkpoints: [
              { title: 'Choose a preset', description: 'Apply one accessibility preset.', type: 'practice', required: true },
              { title: 'Reflect', description: 'Note which single setting made the biggest difference.', type: 'reflection', required: false },
            ],
          },
          {
            title: 'Tools You Can Use in Every Lesson',
            type: 'standard',
            minutes: 9,
            tier: 'partial',
            // partial: has objectives, but no simplified summary and no accessibility notes
            objectives: ['Locate the text-to-speech control', 'Switch a lesson into chunked mode'],
            html:
              h(2, 'Tools You Can Use in Every Lesson') +
              p(
                'Every lesson page carries the same toolbar. Once you know it, you know it everywhere.',
                'The speaker icon reads the lesson aloud. You can change the speed in your settings, and the reader will highlight the sentence it is currently speaking so you can follow along.',
                'The layout control switches between a single scrolling page and a chunked view that shows one section at a time with a next button.',
              ) +
              h(3, 'Focus Mode') +
              p(
                'Focus mode hides the sidebar, the progress rail and the comment thread, leaving only the lesson body. It is useful when a page feels busy.',
              ),
            activity: {
              type: 'flashcards',
              title: 'Toolbar controls',
              data: {
                mode: 'study',
                cards: [
                  { id: 'f1', front: 'Speaker icon', back: 'Reads the lesson aloud and highlights the current sentence.' },
                  { id: 'f2', front: 'Layout control', back: 'Switches between one long page and one chunk at a time.' },
                  { id: 'f3', front: 'Focus mode', back: 'Hides everything except the lesson body.' },
                  { id: 'f4', front: 'Reading spotlight', back: 'Dims everything except the line you are reading.' },
                ],
              },
            },
          },
        ],
      },
      {
        title: 'Building a Routine',
        description: 'Turning good intentions into a study habit that survives a bad week.',
        lessons: [
          {
            title: 'Planning a Realistic Study Week',
            type: 'reading',
            minutes: 14,
            tier: 'strong',
            objectives: ['Build a weekly study plan', 'Identify your best two study slots', 'Plan for a missed session'],
            simplifiedSummary: 'Pick two or three short slots each week. Keep them small. Plan what happens when you miss one.',
            accessibilityNotes: 'Uses a numbered structure and a worked example. Sentences kept under 20 words.',
            html:
              h(2, 'Planning a Realistic Study Week') +
              p(
                'Most study plans fail because they are too ambitious. A plan you keep is better than a plan that looks good.',
                'Start with two slots a week. Each slot is twenty five minutes. That is fifty minutes total. It sounds small. It works because you will actually do it.',
              ) +
              h(3, 'Find Your Slots') +
              ul([
                'Look for a time you are already free and already awake.',
                'Attach it to something fixed, like straight after dinner on Tuesday.',
                'Write both slots down where you will see them.',
              ]) +
              h(3, 'Plan the Miss') +
              p(
                'You will miss a session. Everybody does. Decide now what happens next. The rule is simple: skip it, do not double up. Doubling up turns one bad week into two.',
              ) +
              h(3, 'A Worked Example') +
              p(
                'Amir studies Tuesday and Thursday at 8pm for twenty five minutes. In week three he misses Thursday because of football. He does not add it to Saturday. He simply starts again on Tuesday.',
              ),
            summaryActivity: {
              wordTarget: 80,
              keyPoints: ['Two short slots beat one long one', 'Attach study to an existing habit', 'Skip, do not double up'],
              reflection: ['When are your two slots?', 'What will you do the first time you miss one?'],
            },
            materials: [
              {
                title: 'Weekly study planner (PDF)',
                fileName: 'acess-weekly-planner.pdf',
                fileType: 'application/pdf',
                sizeBytes: 184320,
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              },
            ],
          },
          {
            title: 'Foundations Review Quiz',
            type: 'assessment',
            minutes: 10,
            tier: 'strong',
            objectives: ['Check your understanding of the first four lessons'],
            simplifiedSummary: 'A short quiz. You can try it up to three times. You need 70% to pass.',
            accessibilityNotes: 'No time pressure beyond a generous limit. Questions use plain language and one idea each.',
            html:
              h(2, 'Foundations Review') +
              p(
                'This quiz checks the main ideas from this course. There are four questions. You need 70% to pass and you may attempt it up to three times.',
                'There is no penalty for a wrong answer. If you are unsure, choose the answer that sounds most like the lessons.',
              ),
            quiz: {
              title: 'Foundations Review Quiz',
              passPct: 70,
              maxAttempts: 3,
              timeLimitSeconds: 900,
              questions: [
                {
                  text: 'What does accessible learning mean?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'The lesson changes to fit the learner', correct: true },
                    { text: 'The lesson is made easier for everyone', correct: false },
                    { text: 'The lesson is shorter', correct: false },
                    { text: 'The lesson is only for some learners', correct: false },
                  ],
                },
                {
                  text: 'Why does a video need a transcript?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'So the file downloads faster', correct: false },
                    { text: 'So anyone who cannot use the audio still gets the content', correct: true },
                    { text: 'Because videos are always too long', correct: false },
                    { text: 'To make the page look fuller', correct: false },
                  ],
                },
                {
                  text: 'You planned two study slots a week and missed one. What does this course recommend?',
                  type: 'scenario',
                  options: [
                    { text: 'Double up the next session to catch up', correct: false },
                    { text: 'Skip it and continue with the next planned slot', correct: true },
                    { text: 'Restart the course from the beginning', correct: false },
                    { text: 'Add three extra slots that week', correct: false },
                  ],
                },
                {
                  text: 'What does chunked mode do to a lesson?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'Deletes the harder sections', correct: false },
                    { text: 'Shows one section at a time with a next button', correct: true },
                    { text: 'Reads the lesson aloud', correct: false },
                    { text: 'Changes the font to OpenDyslexic', correct: false },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    achievements: [
      { name: 'First Steps', description: 'Complete your first lesson in Foundations.', requirement: 'lesson', threshold: 1, icon: '👣' },
      { name: 'Halfway There', description: 'Reach 50% of the Foundations course.', requirement: 'progress', threshold: 50, icon: '⛰️' },
      { name: 'Foundation Built', description: 'Complete every lesson in Foundations.', requirement: 'progress', threshold: 100, icon: '🏛️' },
      { name: 'Sharp Start', description: 'Average 80% or better across your quizzes.', requirement: 'quiz', threshold: 80, icon: '🎯' },
      { name: 'Consistent', description: 'Study on three different days.', requirement: 'streak', threshold: 3, icon: '🔥' },
    ],
    milestones: [
      { title: 'Profile configured', description: 'Accessibility settings chosen and saved.', pct: 20, icon: '⚙️' },
      { title: 'Routine planned', description: 'A weekly study plan written down.', pct: 60, icon: '🗓️' },
      { title: 'Foundations complete', description: 'Ready to move on to a subject course.', pct: 100, icon: '🎓' },
    ],
  },

  // ═══════════ 2. Reading Fluency with Dyslexia Support ═══════════
  {
    key: 'c_reading',
    title: 'Reading Fluency with Dyslexia Support',
    slug: 'reading-fluency-dyslexia-support',
    description:
      'Practical decoding and fluency strategies for readers with dyslexia. Built around short passages, repeated reading and text-to-speech support.',
    category: 'Reading & Literacy',
    difficulty: 'beginner',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_siti',
    ownerRole: 'educator',
    createdAt: '2026-01-28T11:30:00+08:00',
    publishedAt: '2026-02-05T09:00:00+08:00',
    thumbnail: T[2],
    tags: ['dyslexia', 'reading', 'fluency', 'phonics'],
    focus: 'dyslexia',
    secondaryFocus: ['general'],
    accessibilityCategories: ['dyslexia'],
    targetReadingAge: 11,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: true, streaks: true, chapters: true, milestones: true, guided: false },
    certificateEnabled: true,
    layoutType: 'simplified',
    chapters: [
      {
        title: 'Decoding',
        description: 'Breaking unfamiliar words into parts you can already read.',
        lessons: [
          {
            title: 'Why Reading Feels Different with Dyslexia',
            type: 'video',
            minutes: 11,
            tier: 'strong',
            videoId: 'zafiGBrFkRM',
            objectives: ['Describe what dyslexia affects', 'Explain why effort is not the problem', 'Name two supports that help'],
            simplifiedSummary:
              'Dyslexia changes how the brain links letters to sounds. It is not about effort or intelligence. The right tools make reading work.',
            accessibilityNotes:
              'Full transcript supplied. Text set at a Year 6 reading level with wide spacing. No justified text.',
            transcript:
              'Dyslexia affects up to one in five people. It is a learning difference that makes it harder to connect the letters on a page with the sounds they make. ' +
              'It has nothing to do with intelligence, and nothing to do with how hard someone is trying. Brain imaging shows that readers with dyslexia use different pathways when they decode a word. ' +
              'The work is real, and it is happening, it is just taking a different route. Two things help most. The first is explicit, structured practice with the sound patterns of the language, taught directly rather than picked up by exposure. ' +
              'The second is removing the parts of reading that are pure friction: making the text larger, spacing the words further apart, tinting the background so the letters stop shimmering, and offering audio alongside the text. ' +
              'Neither of these is a shortcut. Both let the reader spend their effort on meaning rather than on decoding.',
            videoQuestions: [
              {
                title: 'Checkpoint: what dyslexia is',
                atSeconds: 30,
                text: 'According to the video, dyslexia is mainly about:',
                options: ['Effort', 'Intelligence', 'Linking letters to sounds', 'Eyesight'],
                correctIndex: 2,
              },
            ],
            html:
              h(2, 'Why Reading Feels Different with Dyslexia') +
              p(
                'Dyslexia changes how the brain links letters to the sounds they make. That link is the core of reading.',
                'It is not about effort. It is not about intelligence. Many strong thinkers read slowly.',
              ) +
              h(3, 'What Helps') +
              ul([
                'Direct practice with sound patterns, taught step by step.',
                'Bigger text, wider spacing and a soft background tint.',
                'Audio alongside the text so meaning arrives while decoding catches up.',
              ]),
            summaryActivity: {
              wordTarget: 70,
              keyPoints: ['Dyslexia affects letter-sound links', 'Effort is not the issue', 'Structure plus tools help'],
              reflection: ['Which of the two supports would help you most?'],
            },
          },
          {
            title: 'Breaking Words into Syllables',
            type: 'practice',
            minutes: 13,
            tier: 'strong',
            objectives: ['Split a long word into syllables', 'Read a three-syllable word confidently'],
            simplifiedSummary: 'Long words are short words joined together. Find the vowel sounds. Each vowel sound is one beat.',
            accessibilityNotes: 'Every example word is also given split with hyphens. Practice items increase in length gradually.',
            html:
              h(2, 'Breaking Words into Syllables') +
              p(
                'A long word is not one hard thing. It is several easy things joined together.',
                'Every syllable has one vowel sound. Count the vowel sounds and you have counted the syllables.',
              ) +
              h(3, 'Try These') +
              ul([
                '<strong>fantastic</strong> → fan-tas-tic (3 beats)',
                '<strong>computer</strong> → com-pu-ter (3 beats)',
                '<strong>accessibility</strong> → ac-ces-si-bil-i-ty (6 beats)',
              ]) +
              p('Say each part out loud. Then say the whole word. The whole word is easier once the parts are familiar.'),
            activity: {
              type: 'fill_blanks',
              title: 'Split the word',
              data: {
                mode: 'word_bank',
                raw_text: 'A syllable always contains one [vowel] sound. The word "fantastic" has [three] syllables. Reading the parts before the whole word makes it [easier].',
                segments: [
                  { text: 'A syllable always contains one ', isBlank: false },
                  { text: '', isBlank: true, answer: 'vowel' },
                  { text: ' sound. The word "fantastic" has ', isBlank: false },
                  { text: '', isBlank: true, answer: 'three' },
                  { text: ' syllables. Reading the parts before the whole word makes it ', isBlank: false },
                  { text: '', isBlank: true, answer: 'easier' },
                  { text: '.', isBlank: false },
                ],
                extra_words: ['consonant', 'five', 'harder'],
              },
            },
            checkpoints: [
              { title: 'Read aloud', description: 'Read three of the practice words out loud.', type: 'practice', required: true },
            ],
          },
          {
            title: 'Common Letter Patterns',
            type: 'standard',
            minutes: 10,
            tier: 'partial',
            objectives: ['Recognise five common letter patterns'],
            // partial: no simplified summary, no accessibility notes, focus/chunk left off
            html:
              h(2, 'Common Letter Patterns') +
              p(
                'English reuses the same letter groups constantly, and once a reader can recognise those groups on sight rather than sounding out each individual letter in sequence, the speed of reading improves considerably across almost every kind of text they will encounter.',
                'The patterns below appear in thousands of words.',
              ) +
              ul(['<strong>-tion</strong> as in station, nation, action', '<strong>-igh</strong> as in night, light, sight', '<strong>ch-</strong> as in chair, cheese, chase', '<strong>-ould</strong> as in could, would, should', '<strong>-ear</strong> as in hear, near, year']),
            activity: {
              type: 'memory_game',
              title: 'Match the pattern to a word',
              data: {
                mode: 'term_match',
                cards: [
                  { id: 'm1', pairId: 'p1', text: '-tion' },
                  { id: 'm2', pairId: 'p1', text: 'station' },
                  { id: 'm3', pairId: 'p2', text: '-igh' },
                  { id: 'm4', pairId: 'p2', text: 'night' },
                  { id: 'm5', pairId: 'p3', text: '-ould' },
                  { id: 'm6', pairId: 'p3', text: 'could' },
                  { id: 'm7', pairId: 'p4', text: '-ear' },
                  { id: 'm8', pairId: 'p4', text: 'near' },
                ],
              },
            },
          },
        ],
      },
      {
        title: 'Fluency',
        description: 'Reading smoothly enough that meaning survives.',
        lessons: [
          {
            title: 'Repeated Reading',
            type: 'practice',
            minutes: 15,
            tier: 'strong',
            objectives: ['Run a repeated reading cycle', 'Track your own improvement across three reads'],
            simplifiedSummary: 'Read the same short passage three times. It gets smoother each time. That smoothness carries to new text.',
            accessibilityNotes: 'Passage is 90 words at a Year 6 level. Timing is optional and self-recorded.',
            html:
              h(2, 'Repeated Reading') +
              p(
                'Repeated reading is exactly what it sounds like. You read one short passage three times.',
                'The first read is slow. The second is smoother. By the third, the words are familiar and your attention is free for meaning.',
              ) +
              h(3, 'The Cycle') +
              ul([
                'Read the passage once. Do not worry about speed.',
                'Read it again. Notice which words slowed you down.',
                'Read it a third time. Aim for a natural, speaking rhythm.',
              ]) +
              h(3, 'Why It Works') +
              p('You are not memorising the passage. You are practising the act of reading smoothly, and that skill transfers to text you have never seen.'),
            quiz: {
              title: 'Fluency Check',
              passPct: 60,
              maxAttempts: 0,
              timeLimitSeconds: 600,
              questions: [
                {
                  text: 'How many times do you read the passage in a repeated reading cycle?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'Once', correct: false },
                    { text: 'Twice', correct: false },
                    { text: 'Three times', correct: true },
                    { text: 'Until memorised', correct: false },
                  ],
                },
                {
                  text: 'What is the point of the third read?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'To memorise the passage', correct: false },
                    { text: 'To read with a natural rhythm so attention is free for meaning', correct: true },
                    { text: 'To read as fast as possible', correct: false },
                    { text: 'To find spelling mistakes', correct: false },
                  ],
                },
              ],
            },
            summaryActivity: {
              wordTarget: 60,
              keyPoints: ['Three reads', 'Smoothness transfers', 'Not memorisation'],
              reflection: ['Did the third read feel different from the first?'],
            },
          },
          {
            title: 'Reading with Text-to-Speech',
            type: 'standard',
            minutes: 8,
            tier: 'weak',
            // weak: no objectives, no summary, no notes, dense single block, video without transcript
            videoId: 'IlU-zDU6aQ0',
            html:
              h(2, 'Reading with Text-to-Speech') +
              p(
                'Text to speech is an assistive technology which converts written text into synthesised audio output and it can be utilised in conjunction with visual reading in order to facilitate improved comprehension outcomes for readers who experience decoding difficulties, and the empirical literature broadly indicates that bimodal presentation yields measurable benefits particularly where the orthographic processing burden is elevated relative to the reader\'s current automaticity threshold, though practitioners should note that the magnitude of such effects is moderated by numerous individual difference variables including working memory capacity and prior exposure to the modality.',
              ),
          },
        ],
      },
    ],
    achievements: [
      { name: 'Decoder', description: 'Complete your first decoding lesson.', requirement: 'lesson', threshold: 1, icon: '🔤' },
      { name: 'Syllable Splitter', description: 'Reach 40% of the course.', requirement: 'progress', threshold: 40, icon: '✂️' },
      { name: 'Fluent Reader', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '📖' },
      { name: 'Steady Practice', description: 'Study on four different days.', requirement: 'streak', threshold: 4, icon: '🔥' },
    ],
    milestones: [
      { title: 'Decoding basics', description: 'Syllable splitting practised.', pct: 50, icon: '🧩' },
      { title: 'Fluency reached', description: 'Repeated reading cycle completed.', pct: 100, icon: '🏅' },
    ],
  },

  // ═══════════ 3. Focus and Study Skills for ADHD Learners ═══════════
  {
    key: 'c_adhd',
    title: 'Focus and Study Skills for ADHD Learners',
    slug: 'focus-study-skills-adhd',
    description:
      'Attention is a resource, not a character trait. Build a study system that works with an ADHD brain instead of against it.',
    category: 'Study Skills',
    difficulty: 'intermediate',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_siti',
    ownerRole: 'educator',
    createdAt: '2026-02-20T10:00:00+08:00',
    publishedAt: '2026-03-02T09:30:00+08:00',
    thumbnail: T[4],
    tags: ['adhd', 'focus', 'executive function', 'study skills'],
    focus: 'adhd',
    secondaryFocus: ['general'],
    accessibilityCategories: ['adhd'],
    targetReadingAge: 13,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: true, streaks: true, chapters: true, milestones: true, guided: true },
    certificateEnabled: true,
    layoutType: 'focused',
    chapters: [
      {
        title: 'Understanding Attention',
        description: 'How attention actually works, and why willpower is the wrong lever.',
        lessons: [
          {
            title: 'Attention Is a Resource',
            type: 'video',
            minutes: 14,
            tier: 'strong',
            videoId: 'hFL6qRIJZ_Y',
            objectives: ['Explain attention as a limited resource', 'Identify your own peak focus window', 'Name two ways to protect attention'],
            simplifiedSummary:
              'Attention runs out like battery. Work in short blocks. Protect the block by removing what interrupts it.',
            accessibilityNotes: 'Transcript provided. Content chunked into short sections with a checklist. No autoplay.',
            transcript:
              'Attention is not a fixed trait that some people have and others lack. It is a resource that depletes and recovers. ' +
              'For an ADHD brain the depletion curve is steeper, and the recovery needs to be deliberate rather than incidental. ' +
              'The single most useful change most people can make is to shorten the working block. Twenty five minutes of genuine attention beats two hours of drifting. ' +
              'The second change is to remove the interruption before it arrives rather than resisting it when it does. Resisting a notification costs attention even when you win. ' +
              'Put the phone in another room. Close the other tabs. Decide what you are doing before you sit down, so the first five minutes are not spent choosing. ' +
              'Finally, protect the recovery. A break spent scrolling is not a break; it spends the same resource you are trying to restore. Walk, drink water, look out of a window.',
            html:
              h(2, 'Attention Is a Resource') +
              p(
                'Attention behaves like a battery. It drains as you use it and it recharges when you rest properly.',
                'This matters because most study advice assumes attention is infinite and failure is a choice. It is neither.',
              ) +
              h(3, 'Work in Blocks') +
              p('Twenty five minutes of real attention beats two hours of drifting. Set a timer. When it ends, stop.') +
              h(3, 'Remove, Do Not Resist') +
              p('Resisting a notification costs attention even when you win. Put the phone in another room instead.') +
              h(3, 'Protect the Recovery') +
              p('A break spent scrolling is not a break. Walk, drink water, look out of a window.'),
            videoQuestions: [
              {
                title: 'Checkpoint: breaks',
                atSeconds: 60,
                text: 'Why is a break spent scrolling not a real break?',
                options: [
                  'It is too short',
                  'It spends the same resource you are trying to restore',
                  'It is against the rules',
                  'It makes you sleepy',
                ],
                correctIndex: 1,
              },
            ],
            checkpoints: [
              { title: 'Find your window', description: 'Note the time of day you focus best.', type: 'reflection', required: true },
              { title: 'Remove one interruption', description: 'Pick one distraction and remove it before your next session.', type: 'practice', required: true },
            ],
            summaryActivity: {
              wordTarget: 80,
              keyPoints: ['Attention depletes', 'Short blocks', 'Remove rather than resist', 'Protect recovery'],
              reflection: ['When is your peak focus window?', 'Which interruption will you remove first?'],
            },
          },
          {
            title: 'Beating the Starting Problem',
            type: 'video',
            minutes: 16,
            tier: 'partial',
            videoId: 'arj7oStGLkU',
            objectives: ['Describe why starting is harder than continuing'],
            // partial: video present but NO transcript -> the audit's transcript rule fails
            html:
              h(2, 'Beating the Starting Problem') +
              p(
                'Starting is the hardest part. Once you are three minutes in, the task is usually fine.',
                'The trick is to make the first action absurdly small. Not "write the essay". Open the document and type the title.',
              ) +
              h(3, 'The Two Minute Version') +
              p('Every task has a two minute version. Do that instead. Most of the time you will keep going.'),
            activity: {
              type: 'drag_drop',
              title: 'Sort the tasks',
              data: {
                mode: 'categories',
                categories: ['Two-minute start', 'Full task'],
                items: [
                  { id: 'd1', text: 'Open the document and type the title', category: 'Two-minute start' },
                  { id: 'd2', text: 'Write the whole essay', category: 'Full task' },
                  { id: 'd3', text: 'Put one textbook on the desk', category: 'Two-minute start' },
                  { id: 'd4', text: 'Revise the entire chapter', category: 'Full task' },
                  { id: 'd5', text: 'Read only the first question', category: 'Two-minute start' },
                  { id: 'd6', text: 'Complete every practice paper', category: 'Full task' },
                ],
              },
            },
          },
        ],
      },
      {
        title: 'Systems That Hold',
        description: 'External structure so you do not have to remember everything.',
        lessons: [
          {
            title: 'Externalise Everything',
            type: 'standard',
            minutes: 12,
            tier: 'strong',
            objectives: ['Set up a single capture list', 'Move deadlines out of your head into a calendar'],
            simplifiedSummary: 'Do not hold tasks in your head. Write everything in one place. Check that place at a fixed time.',
            accessibilityNotes: 'Checklist structure, one instruction per line, generous spacing.',
            html:
              h(2, 'Externalise Everything') +
              p(
                'Working memory is expensive and unreliable. Every task you hold in your head is attention you are not spending on the work.',
                'The fix is boring and it works: one list, one calendar, one review time.',
              ) +
              h(3, 'One Capture List') +
              ul([
                'Everything goes in the same place. Not three apps. One.',
                'Capture it the moment you think of it, in whatever words come out.',
                'Do not organise while capturing. Organising is a separate job.',
              ]) +
              h(3, 'One Review Time') +
              p('Pick a fixed slot, once a day. Read the list. Decide what happens today. Close it.'),
            activity: {
              type: 'timeline',
              title: 'Order the daily review',
              data: {
                mode: 'process',
                events: [
                  { id: 't1', date: 'Step 1', title: 'Capture', description: 'Write down every task as it occurs to you, without sorting.' },
                  { id: 't2', date: 'Step 2', title: 'Review', description: 'At a fixed time, read the whole list once.' },
                  { id: 't3', date: 'Step 3', title: 'Choose', description: 'Pick the two or three items that will actually happen today.' },
                  { id: 't4', date: 'Step 4', title: 'Schedule', description: 'Put those items into a specific time slot in the calendar.' },
                  { id: 't5', date: 'Step 5', title: 'Close', description: 'Shut the list. Do not reopen it until the next review.' },
                ],
              },
            },
            summaryActivity: {
              wordTarget: 70,
              keyPoints: ['One list', 'One review time', 'Capture without organising'],
              reflection: ['Where will your single list live?'],
            },
          },
          {
            title: 'ADHD Study Skills Assessment',
            type: 'assessment',
            minutes: 12,
            tier: 'strong',
            objectives: ['Check your understanding of the attention and systems lessons'],
            simplifiedSummary: 'Three questions. 70% to pass. Two attempts allowed.',
            accessibilityNotes: 'Plain language, no time pressure, one idea per question.',
            html: h(2, 'ADHD Study Skills Assessment') + p('Three questions covering attention management and external systems. You need 70% to pass.'),
            quiz: {
              title: 'ADHD Study Skills Assessment',
              passPct: 70,
              maxAttempts: 2,
              timeLimitSeconds: 720,
              questions: [
                {
                  text: 'Why does this course recommend removing a distraction rather than resisting it?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'Resisting costs attention even when you succeed', correct: true },
                    { text: 'Resisting is against school rules', correct: false },
                    { text: 'Distractions are always harmless', correct: false },
                    { text: 'It saves battery', correct: false },
                  ],
                },
                {
                  text: 'You need to write a 1,500 word essay and cannot start. What does the course suggest?',
                  type: 'scenario',
                  options: [
                    { text: 'Block out four hours tonight', correct: false },
                    { text: 'Open the document and type the title', correct: true },
                    { text: 'Wait until you feel motivated', correct: false },
                    { text: 'Ask for an extension first', correct: false },
                  ],
                },
                {
                  text: 'What is the rule for the single capture list?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'Use a different app for each subject', correct: false },
                    { text: 'Everything goes in one place, and you organise later', correct: true },
                    { text: 'Only write down urgent tasks', correct: false },
                    { text: 'Keep it in your head to save time', correct: false },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    achievements: [
      { name: 'Focus Found', description: 'Complete your first lesson.', requirement: 'lesson', threshold: 1, icon: '🎯' },
      { name: 'System Builder', description: 'Reach 60% of the course.', requirement: 'progress', threshold: 60, icon: '🧰' },
      { name: 'Attention Master', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '🧠' },
      { name: 'High Scorer', description: 'Average 85% or better across quizzes.', requirement: 'quiz', threshold: 85, icon: '⭐' },
    ],
    milestones: [
      { title: 'Attention understood', description: 'First chapter complete.', pct: 50, icon: '🔍' },
      { title: 'System in place', description: 'Capture list and review time set up.', pct: 100, icon: '✅' },
    ],
  },

  // ═══════════ 4. Numeracy for Daily Living (published, NO learners) ═══════════
  {
    key: 'c_numeracy',
    title: 'Numeracy for Daily Living',
    slug: 'numeracy-for-daily-living',
    description:
      'Money, time and measurement for independent living. Published but not yet promoted — no learners have enrolled.',
    category: 'Mathematics',
    difficulty: 'beginner',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_marcus',
    ownerRole: 'educator',
    createdAt: '2026-03-10T14:00:00+08:00',
    publishedAt: '2026-03-18T09:00:00+08:00',
    thumbnail: T[5],
    tags: ['mathematics', 'money', 'independent living'],
    focus: 'general',
    secondaryFocus: [],
    accessibilityCategories: ['dyslexia'],
    targetReadingAge: 10,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: false, chunked: true, transcripts: false, streaks: false, chapters: true, milestones: false, guided: false },
    certificateEnabled: false,
    layoutType: 'simplified',
    chapters: [
      {
        title: 'Money',
        description: 'Counting, change and simple budgeting.',
        lessons: [
          {
            title: 'Counting Change',
            type: 'standard',
            minutes: 9,
            tier: 'partial',
            objectives: ['Work out change from RM10'],
            html:
              h(2, 'Counting Change') +
              p(
                'When you pay with a note, the change is the difference between what you gave and what it cost.',
                'A quick method is to count up. If something costs RM6.40 and you pay RM10, count up from 6.40 to 7 (that is 60 sen), then 7 to 10 (that is RM3). Your change is RM3.60.',
              ),
            activity: {
              type: 'fill_blanks',
              title: 'Change practice',
              data: {
                mode: 'typing',
                raw_text: 'An item costs RM6.40. You pay with RM10. Counting up from RM6.40 to RM7.00 gives [60] sen. From RM7.00 to RM10.00 gives RM[3]. Total change is RM[3.60].',
                segments: [
                  { text: 'An item costs RM6.40. You pay with RM10. Counting up from RM6.40 to RM7.00 gives ', isBlank: false },
                  { text: '', isBlank: true, answer: '60' },
                  { text: ' sen. From RM7.00 to RM10.00 gives RM', isBlank: false },
                  { text: '', isBlank: true, answer: '3' },
                  { text: '. Total change is RM', isBlank: false },
                  { text: '', isBlank: true, answer: '3.60' },
                  { text: '.', isBlank: false },
                ],
              },
            },
          },
          {
            title: 'A Simple Weekly Budget',
            type: 'standard',
            minutes: 11,
            tier: 'weak',
            html:
              h(2, 'A Simple Weekly Budget') +
              p(
                'Budgeting is the practice of allocating anticipated income across anticipated expenditure categories over a defined period, and the fundamental principle underlying all budgeting methodologies is that total planned outflow must not exceed total expected inflow, a constraint which sounds trivially obvious when stated in the abstract but which in practice requires the individual to maintain an accurate and continuously updated mental or written model of both quantities simultaneously.',
              ),
          },
        ],
      },
    ],
    achievements: [
      { name: 'Money Sense', description: 'Complete your first numeracy lesson.', requirement: 'lesson', threshold: 1, icon: '💰' },
      { name: 'Budget Ready', description: 'Complete the course.', requirement: 'progress', threshold: 100, icon: '📊' },
    ],
    milestones: [{ title: 'Course complete', description: 'All numeracy lessons done.', pct: 100, icon: '🏁' }],
  },

  // ═══════════ 5. Structured Routines for Autistic Learners ═══════════
  {
    key: 'c_autism',
    title: 'Structured Routines for Autistic Learners',
    slug: 'structured-routines-autistic-learners',
    description:
      'Predictable structure, clear expectations and low sensory load. Built with visual schedules and step-by-step task breakdowns.',
    category: 'Study Skills',
    difficulty: 'intermediate',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_siti',
    ownerRole: 'educator',
    createdAt: '2026-03-28T09:15:00+08:00',
    publishedAt: '2026-04-08T10:00:00+08:00',
    thumbnail: T[6],
    tags: ['autism', 'routine', 'structure', 'sensory'],
    focus: 'autism',
    secondaryFocus: ['general'],
    accessibilityCategories: ['autism'],
    targetReadingAge: 12,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: true, streaks: false, chapters: true, milestones: true, guided: true },
    certificateEnabled: true,
    layoutType: 'guided',
    chapters: [
      {
        title: 'Predictability',
        description: 'Knowing what comes next, every time.',
        lessons: [
          {
            title: 'Why Routine Reduces Load',
            type: 'standard',
            minutes: 11,
            tier: 'strong',
            objectives: ['Explain why predictability lowers cognitive load', 'Build a three-step lesson routine'],
            simplifiedSummary: 'When you know what happens next, your brain does not have to guess. That saves energy for learning.',
            accessibilityNotes: 'Fixed page order, no surprise elements, muted palette, no animation. Every step is numbered.',
            html:
              h(2, 'Why Routine Reduces Load') +
              p(
                'Uncertainty costs energy. If you do not know what happens next, part of your attention stays busy guessing.',
                'A routine answers that question in advance, so the energy goes into the work instead.',
              ) +
              h(3, 'A Three-Step Lesson Routine') +
              ul([
                '<strong>1. Preview.</strong> Read the lesson objectives before anything else.',
                '<strong>2. Work.</strong> Move through the sections in order, top to bottom.',
                '<strong>3. Close.</strong> Write one sentence about what you learned, then stop.',
              ]) +
              p('Use the same three steps in every lesson. The sameness is the point.'),
            checkpoints: [
              { title: 'Preview', description: 'Read the objectives before starting.', type: 'milestone', required: true },
              { title: 'Close', description: 'Write one closing sentence.', type: 'reflection', required: true },
            ],
            summaryActivity: {
              wordTarget: 60,
              keyPoints: ['Uncertainty costs energy', 'Routine answers "what next" in advance', 'Sameness is the benefit'],
              reflection: ['Which step will you find hardest to keep?'],
            },
          },
          {
            title: 'Building a Visual Schedule',
            type: 'practice',
            minutes: 13,
            tier: 'strong',
            objectives: ['Create a visual schedule for one study session', 'Include a defined finish point'],
            simplifiedSummary: 'Draw your session as boxes in order. Include a clear last box so you know when you are done.',
            accessibilityNotes: 'Uses shape and position, never colour alone, to convey order. Example is provided in full.',
            html:
              h(2, 'Building a Visual Schedule') +
              p(
                'A visual schedule turns a session into a row of boxes you can see. Each box is one step. You move along the row.',
                'The last box matters most. A session with no defined end has no rest at the other side of it.',
              ) +
              h(3, 'Worked Example') +
              ul([
                'Box 1 — Read objectives (2 min)',
                'Box 2 — Read section one (8 min)',
                'Box 3 — Short break, stand up (3 min)',
                'Box 4 — Read section two (8 min)',
                'Box 5 — Write closing sentence (2 min) — FINISHED',
              ]),
            activity: {
              type: 'timeline',
              title: 'Order your study session',
              data: {
                mode: 'sorting',
                events: [
                  { id: 'v1', date: 'Box 1', title: 'Read objectives', description: 'Two minutes. Know what the lesson is for.' },
                  { id: 'v2', date: 'Box 2', title: 'Read section one', description: 'Eight minutes of focused reading.' },
                  { id: 'v3', date: 'Box 3', title: 'Stand and break', description: 'Three minutes away from the screen.' },
                  { id: 'v4', date: 'Box 4', title: 'Read section two', description: 'Eight more minutes of reading.' },
                  { id: 'v5', date: 'Box 5', title: 'Write and finish', description: 'One closing sentence, then stop for the day.' },
                ],
              },
            },
          },
          {
            title: 'Managing Sensory Load',
            type: 'standard',
            minutes: 10,
            tier: 'partial',
            objectives: ['Identify two sensory triggers in your study space'],
            html:
              h(2, 'Managing Sensory Load') +
              p(
                'Sensory load is everything your senses are processing that is not the work.',
                'Common sources are fluorescent flicker, background chatter, a bright white screen and an uncomfortable chair. Each one is small. Together they are not.',
              ) +
              h(3, 'Reduce What You Can') +
              p('Change the screen to a muted tint. Use ear defenders or instrumental sound. Sit somewhere with the same light every time.'),
            activity: {
              type: 'drag_drop',
              title: 'Sort the sensory inputs',
              data: {
                mode: 'categories',
                categories: ['Increases load', 'Reduces load'],
                items: [
                  { id: 's1', text: 'Flickering fluorescent light', category: 'Increases load' },
                  { id: 's2', text: 'Muted background tint', category: 'Reduces load' },
                  { id: 's3', text: 'Background conversation', category: 'Increases load' },
                  { id: 's4', text: 'Ear defenders', category: 'Reduces load' },
                  { id: 's5', text: 'Bright white screen at night', category: 'Increases load' },
                  { id: 's6', text: 'Sitting in the same spot each day', category: 'Reduces load' },
                ],
              },
            },
          },
        ],
      },
    ],
    achievements: [
      { name: 'Routine Started', description: 'Complete your first lesson.', requirement: 'lesson', threshold: 1, icon: '🔁' },
      { name: 'Schedule Built', description: 'Reach 60% of the course.', requirement: 'progress', threshold: 60, icon: '🗒️' },
      { name: 'Structure Secured', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '🧱' },
    ],
    milestones: [
      { title: 'Routine understood', description: 'First lesson complete.', pct: 34, icon: '🔂' },
      { title: 'Schedule in use', description: 'Visual schedule built.', pct: 100, icon: '📐' },
    ],
  },

  // ═══════════ 6. Everyday Mathematics: Number Sense ═══════════
  {
    key: 'c_maths',
    title: 'Everyday Mathematics: Number Sense',
    slug: 'everyday-mathematics-number-sense',
    description:
      'Estimation, place value and mental strategies you can use in a shop, a kitchen or an exam hall.',
    category: 'Mathematics',
    difficulty: 'beginner',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_marcus',
    ownerRole: 'educator',
    createdAt: '2026-04-12T11:00:00+08:00',
    publishedAt: '2026-04-22T09:00:00+08:00',
    thumbnail: T[0],
    tags: ['mathematics', 'number sense', 'estimation', 'mental maths'],
    focus: 'general',
    secondaryFocus: ['dyslexia'],
    accessibilityCategories: ['dyslexia', 'adhd'],
    targetReadingAge: 11,
    recommendedAgeGroup: '13-17',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: true, streaks: true, chapters: true, milestones: true, guided: false },
    certificateEnabled: true,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Number Sense',
        description: 'Knowing roughly what the answer should be before you calculate.',
        lessons: [
          {
            title: 'Estimating Before You Calculate',
            type: 'standard',
            minutes: 12,
            tier: 'strong',
            objectives: ['Round numbers to estimate a total', 'Use an estimate to check a calculation'],
            simplifiedSummary: 'Round the numbers first. Get a rough answer. Then check your exact answer is close to it.',
            accessibilityNotes: 'Worked examples use both words and digits. Short sentences, one operation per line.',
            html:
              h(2, 'Estimating Before You Calculate') +
              p(
                'An estimate is a rough answer you work out in your head before doing the real sum.',
                'It is not laziness. It is a safety check. If your exact answer is far from your estimate, something went wrong.',
              ) +
              h(3, 'How to Estimate') +
              ul([
                'Round each number to something easy.',
                'Do the easy sum in your head.',
                'Compare it to your exact answer afterwards.',
              ]) +
              h(3, 'Worked Example') +
              p('You buy items at RM4.85, RM12.10 and RM7.95. Round to RM5, RM12 and RM8. That is RM25. So the till should say roughly RM25. If it says RM250, check again.'),
            quiz: {
              title: 'Estimation Check',
              passPct: 60,
              maxAttempts: 3,
              timeLimitSeconds: 600,
              questions: [
                {
                  text: 'Estimate the total of RM9.90, RM4.05 and RM6.10.',
                  type: 'multiple_choice',
                  options: [
                    { text: 'About RM20', correct: true },
                    { text: 'About RM12', correct: false },
                    { text: 'About RM45', correct: false },
                    { text: 'About RM200', correct: false },
                  ],
                },
                {
                  text: 'Your estimate was RM25 and your calculator says RM250. What should you do?',
                  type: 'scenario',
                  options: [
                    { text: 'Trust the calculator, it is never wrong', correct: false },
                    { text: 'Check the calculation again — the gap suggests an error', correct: true },
                    { text: 'Change the estimate to RM250', correct: false },
                    { text: 'Ignore both numbers', correct: false },
                  ],
                },
                {
                  text: 'Why estimate before calculating?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'It replaces the real calculation', correct: false },
                    { text: 'It gives you a safety check on the exact answer', correct: true },
                    { text: 'It is faster than using a calculator always', correct: false },
                    { text: 'It is required by the syllabus', correct: false },
                  ],
                },
              ],
            },
            summaryActivity: {
              wordTarget: 60,
              keyPoints: ['Round first', 'Estimate is a safety check', 'Large gaps signal an error'],
              reflection: ['Where could you use estimation this week?'],
            },
          },
          {
            title: 'Place Value in Practice',
            type: 'video',
            minutes: 13,
            tier: 'strong',
            videoId: 'MFzDaBzBlL0',
            objectives: ['Explain what each digit position means', 'Multiply and divide by ten confidently'],
            simplifiedSummary: 'Each place is ten times the one to its right. Moving a digit left multiplies by ten.',
            accessibilityNotes: 'Transcript supplied. Numeric examples repeated in words for text-to-speech clarity.',
            transcript:
              'Knowledge is not the same as understanding. You can know a fact and still not be able to use it. ' +
              'The demonstration in this video takes a bicycle whose handlebars turn the wheel the wrong way, and shows that knowing exactly how it works does not let you ride it. ' +
              'Understanding has to be built through practice, not transferred by explanation. Place value works the same way. ' +
              'You can be told that each position is ten times the one to its right, and still hesitate when asked what happens to three hundred and forty when you divide it by ten. ' +
              'The knowing is instant. The fluency takes repetition. So do the practice items even when the rule seems obvious, because the rule being obvious is not the same as the answer being automatic.',
            html:
              h(2, 'Place Value in Practice') +
              p(
                'Each position in a number is worth ten times the position to its right.',
                'In 3,470 the 3 means three thousand, the 4 means four hundred, and the 7 means seventy.',
              ) +
              h(3, 'Multiplying by Ten') +
              p('Every digit shifts one place to the left. 340 becomes 3,400. Nothing is "adding a zero" — the digits are moving.') +
              h(3, 'Dividing by Ten') +
              p('Every digit shifts one place right. 340 becomes 34.'),
            videoQuestions: [
              {
                title: 'Checkpoint: knowing vs doing',
                atSeconds: 90,
                text: 'What is the main point of the bicycle demonstration?',
                options: [
                  'Bicycles are hard to build',
                  'Knowing how something works is not the same as being able to do it',
                  'Practice is unnecessary',
                  'Everyone learns at the same speed',
                ],
                correctIndex: 1,
              },
            ],
            materials: [
              {
                title: 'Place value chart (PDF)',
                fileName: 'place-value-chart.pdf',
                fileType: 'application/pdf',
                sizeBytes: 96256,
                url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              },
            ],
          },
          {
            title: 'Mental Strategies',
            type: 'practice',
            minutes: 10,
            tier: 'partial',
            objectives: ['Use partitioning to add two-digit numbers'],
            html:
              h(2, 'Mental Strategies') +
              p(
                'Partitioning means splitting a number into parts that are easier to handle.',
                'To add 47 and 36, split 36 into 30 and 6. Add 30 to 47 to get 77. Then add 6 to get 83.',
              ),
            activity: {
              type: 'flashcards',
              title: 'Mental maths drills',
              data: {
                mode: 'carousel',
                cards: [
                  { id: 'n1', front: '47 + 36', back: '83  (47 + 30 = 77, then + 6)' },
                  { id: 'n2', front: '68 + 25', back: '93  (68 + 20 = 88, then + 5)' },
                  { id: 'n3', front: '340 ÷ 10', back: '34  (every digit moves one place right)' },
                  { id: 'n4', front: '56 × 10', back: '560  (every digit moves one place left)' },
                  { id: 'n5', front: 'Estimate 9.90 + 4.05', back: 'About 14' },
                ],
              },
            },
          },
        ],
      },
    ],
    achievements: [
      { name: 'Estimator', description: 'Complete your first maths lesson.', requirement: 'lesson', threshold: 1, icon: '🔢' },
      { name: 'Place Value Pro', description: 'Reach 60% of the course.', requirement: 'progress', threshold: 60, icon: '📏' },
      { name: 'Number Sense', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '🧮' },
      { name: 'Accurate', description: 'Average 75% or better across quizzes.', requirement: 'quiz', threshold: 75, icon: '✔️' },
    ],
    milestones: [
      { title: 'Estimation learned', description: 'First lesson complete.', pct: 34, icon: '📐' },
      { title: 'Number sense complete', description: 'All lessons finished.', pct: 100, icon: '🎓' },
    ],
  },

  // ═══════════ 7. Digital Tools for Independent Learning ═══════════
  {
    key: 'c_digital',
    title: 'Digital Tools for Independent Learning',
    slug: 'digital-tools-independent-learning',
    description:
      'Screen readers, dictation, note capture and browser extensions — the software that makes independent study realistic.',
    category: 'Technology',
    difficulty: 'intermediate',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_marcus',
    ownerRole: 'educator',
    createdAt: '2026-06-01T10:30:00+08:00',
    publishedAt: '2026-06-12T09:00:00+08:00',
    thumbnail: T[7],
    tags: ['technology', 'assistive technology', 'tools', 'independence'],
    focus: 'general',
    secondaryFocus: ['dyslexia', 'adhd'],
    accessibilityCategories: ['dyslexia', 'adhd', 'autism'],
    targetReadingAge: 13,
    recommendedAgeGroup: '18+',
    supports: { tts: true, focusMode: true, chunked: false, transcripts: true, streaks: false, chapters: true, milestones: false, guided: false },
    certificateEnabled: true,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Reading and Writing Tools',
        description: 'Getting text in and out without friction.',
        lessons: [
          {
            title: 'Dictation and Voice Typing',
            type: 'video',
            minutes: 15,
            tier: 'strong',
            videoId: 'Unzc731iCUY',
            objectives: ['Set up voice typing', 'Dictate a paragraph and correct it', 'Know when dictation is the wrong tool'],
            simplifiedSummary: 'Speak instead of typing. Fix mistakes afterwards. Good for first drafts, poor for maths.',
            accessibilityNotes: 'Full transcript below the player. Instructions given as numbered steps.',
            transcript:
              'The most valuable skill you can develop is the ability to communicate clearly, and that applies as much to how you get your own ideas onto a page as it does to speaking in front of a room. ' +
              'Dictation changes the shape of that problem. When you type, the mechanical act competes with the thinking. When you speak, the sentence arrives whole. ' +
              'Start by choosing a quiet space and a decent microphone; a headset is better than a laptop microphone. Speak in complete sentences and say the punctuation aloud. ' +
              'Do not stop to correct as you go, because stopping breaks the flow that makes dictation worth using in the first place. Get the whole draft down, then read it back and fix it. ' +
              'Dictation is excellent for first drafts, for reflective writing and for long-form answers. It is poor for mathematics, for code, and for anything where the exact symbols matter more than the words.',
            html:
              h(2, 'Dictation and Voice Typing') +
              p(
                'Typing competes with thinking. Dictation removes that competition — the sentence arrives whole.',
                'Every major operating system now includes voice typing at no cost.',
              ) +
              h(3, 'Setting Up') +
              ul([
                'Find a quiet space. A headset beats a laptop microphone.',
                'Speak in full sentences and say the punctuation out loud.',
                'Do not correct as you go. Get the draft down first.',
              ]) +
              h(3, 'When Not to Use It') +
              p('Dictation is poor for mathematics, code, or anything where exact symbols matter more than words.'),
            summaryActivity: {
              wordTarget: 70,
              keyPoints: ['Speak, do not stop to fix', 'Say punctuation aloud', 'Wrong tool for maths and code'],
              reflection: ['Which piece of work would you try dictating first?'],
            },
          },
          {
            title: 'Capturing Notes That You Will Actually Reread',
            type: 'standard',
            minutes: 11,
            tier: 'partial',
            objectives: ['Adopt one note capture system'],
            html:
              h(2, 'Capturing Notes That You Will Actually Reread') +
              p(
                'Most notes are never reopened. The problem is rarely the app — it is that the notes were written to feel productive rather than to be useful later.',
                'Write notes as if for someone else who missed the lesson. Include why the idea matters, not just what it says.',
              ) +
              h(3, 'One Rule') +
              p('Every note gets a title that is a full sentence stating the idea. "Estimation" is a bad title. "Estimating first catches large calculation errors" is a good one.'),
          },
        ],
      },
    ],
    achievements: [
      { name: 'Tooled Up', description: 'Complete your first tools lesson.', requirement: 'lesson', threshold: 1, icon: '🛠️' },
      { name: 'Independent', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '🚀' },
    ],
    milestones: [{ title: 'Toolkit ready', description: 'All tool lessons complete.', pct: 100, icon: '🧑‍💻' }],
  },

  // ═══════════ 8. Advanced Comprehension Strategies (recent, few learners) ═══════════
  {
    key: 'c_comprehension',
    title: 'Advanced Comprehension Strategies',
    slug: 'advanced-comprehension-strategies',
    description:
      'For readers who decode fluently but lose the thread in longer texts. Inference, structure mapping and critical questioning.',
    category: 'Reading & Literacy',
    difficulty: 'advanced',
    status: 'published',
    courseType: 'educator',
    ownerKey: 'edu_siti',
    ownerRole: 'educator',
    createdAt: '2026-07-10T13:00:00+08:00',
    publishedAt: '2026-07-20T09:00:00+08:00',
    thumbnail: T[3],
    tags: ['reading', 'comprehension', 'inference', 'advanced'],
    focus: 'general',
    secondaryFocus: [],
    accessibilityCategories: ['dyslexia'],
    targetReadingAge: 15,
    recommendedAgeGroup: '18+',
    supports: { tts: true, focusMode: true, chunked: true, transcripts: false, streaks: true, chapters: true, milestones: true, guided: false },
    certificateEnabled: true,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Reading Beyond the Line',
        description: 'Inference and structure.',
        lessons: [
          {
            title: 'Making Inferences',
            type: 'reading',
            minutes: 14,
            tier: 'strong',
            objectives: ['Distinguish a stated fact from an inference', 'Support an inference with textual evidence'],
            simplifiedSummary: 'An inference is a conclusion the text points to but does not say. You must be able to show the words that led you there.',
            accessibilityNotes: 'Worked example marked up explicitly. Evidence and conclusion visually separated.',
            html:
              h(2, 'Making Inferences') +
              p(
                'An inference is a conclusion the text supports but never states outright.',
                'The test of a good inference is simple: can you point at the words that led you to it?',
              ) +
              h(3, 'Worked Example') +
              p('"She pulled her coat tighter and glanced at the darkening sky." The text never says it is cold or that rain is coming. Both are reasonable inferences, and the evidence is "pulled her coat tighter" and "darkening sky".') +
              h(3, 'A Bad Inference') +
              p('"She is unhappy." Nothing in the sentence supports that. It is a guess, not an inference.'),
            quiz: {
              title: 'Inference Check',
              passPct: 75,
              maxAttempts: 2,
              timeLimitSeconds: 900,
              questions: [
                {
                  text: 'What makes an inference valid rather than a guess?',
                  type: 'multiple_choice',
                  options: [
                    { text: 'It feels right', correct: false },
                    { text: 'You can point to the words in the text that support it', correct: true },
                    { text: 'It is stated directly in the text', correct: false },
                    { text: 'Most readers agree with it', correct: false },
                  ],
                },
                {
                  text: '"He checked his watch for the third time and stood by the door." Which is the strongest inference?',
                  type: 'scenario',
                  options: [
                    { text: 'He is waiting for someone and is impatient', correct: true },
                    { text: 'He dislikes the person he is meeting', correct: false },
                    { text: 'He owns an expensive watch', correct: false },
                    { text: 'He is about to leave the country', correct: false },
                  ],
                },
              ],
            },
            summaryActivity: {
              wordTarget: 90,
              keyPoints: ['Inference is supported, guessing is not', 'Always cite the evidence'],
              reflection: ['Write one inference from a text you read this week and the evidence for it.'],
            },
          },
          {
            title: 'Mapping the Structure of an Argument',
            type: 'standard',
            minutes: 16,
            tier: 'partial',
            objectives: ['Identify claim, evidence and counter-argument'],
            html:
              h(2, 'Mapping the Structure of an Argument') +
              p(
                'Most non-fiction follows a shape: a claim, evidence for it, an acknowledged objection, and a response.',
                'Once you can see the shape, you can hold a long text in mind without rereading it.',
              ) +
              ul(['<strong>Claim</strong> — what the writer wants you to accept.', '<strong>Evidence</strong> — why you should.', '<strong>Counter</strong> — the strongest objection.', '<strong>Response</strong> — why the objection does not sink the claim.']),
            activity: {
              type: 'drag_drop',
              title: 'Label the argument parts',
              data: {
                mode: 'matching',
                categories: ['Claim', 'Evidence', 'Counter-argument', 'Response'],
                items: [
                  { id: 'a1', text: 'Homework should be reduced in lower secondary.', category: 'Claim' },
                  { id: 'a2', text: 'Three studies show no attainment gain below Form 3.', category: 'Evidence' },
                  { id: 'a3', text: 'But homework teaches independent time management.', category: 'Counter-argument' },
                  { id: 'a4', text: 'Time management can be taught in timetabled study periods instead.', category: 'Response' },
                ],
              },
            },
          },
        ],
      },
    ],
    achievements: [
      { name: 'Inferencer', description: 'Complete your first comprehension lesson.', requirement: 'lesson', threshold: 1, icon: '🔎' },
      { name: 'Critical Reader', description: 'Complete the whole course.', requirement: 'progress', threshold: 100, icon: '🧭' },
    ],
    milestones: [{ title: 'Comprehension complete', description: 'All lessons finished.', pct: 100, icon: '📚' }],
  },

  // ═══════════ 9. Introduction to Assistive Technology (DRAFT) ═══════════
  {
    key: 'c_assistive_draft',
    title: 'Introduction to Assistive Technology',
    slug: 'introduction-to-assistive-technology',
    description:
      'A survey of assistive hardware and software for education. Still being written — not yet submitted for review.',
    category: 'Technology',
    difficulty: 'beginner',
    status: 'draft',
    courseType: 'educator',
    ownerKey: 'edu_farah',
    ownerRole: 'educator',
    createdAt: '2026-07-02T15:20:00+08:00',
    publishedAt: null,
    thumbnail: T[7],
    tags: ['assistive technology', 'hardware', 'draft'],
    focus: 'general',
    secondaryFocus: [],
    accessibilityCategories: [],
    targetReadingAge: null,
    recommendedAgeGroup: '18+',
    supports: { tts: false, focusMode: false, chunked: false, transcripts: false, streaks: false, chapters: false, milestones: false, guided: false },
    certificateEnabled: false,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Draft outline',
        description: 'Work in progress.',
        lessons: [
          {
            title: 'What Counts as Assistive Technology',
            type: 'standard',
            minutes: 0,
            tier: 'weak',
            draft: true,
            html: h(2, 'What Counts as Assistive Technology') + p('TODO: define the category, give three examples, explain the low-tech/high-tech split.'),
          },
        ],
      },
    ],
    achievements: [],
    milestones: [],
  },

  // ═══════════ 10. Inclusive Classroom Basics (PENDING REVIEW) ═══════════
  {
    key: 'c_inclusive_pending',
    title: 'Inclusive Classroom Basics',
    slug: 'inclusive-classroom-basics',
    description:
      'Practical adjustments any teacher can make tomorrow. Submitted for admin review and awaiting approval.',
    category: 'Accessibility',
    difficulty: 'beginner',
    status: 'pending_review',
    courseType: 'educator',
    ownerKey: 'edu_farah',
    ownerRole: 'educator',
    createdAt: '2026-06-25T11:45:00+08:00',
    publishedAt: null,
    thumbnail: T[1],
    tags: ['accessibility', 'teaching', 'inclusion'],
    focus: 'general',
    secondaryFocus: ['autism'],
    accessibilityCategories: ['autism', 'adhd'],
    targetReadingAge: 14,
    recommendedAgeGroup: '18+',
    supports: { tts: true, focusMode: false, chunked: false, transcripts: false, streaks: false, chapters: true, milestones: false, guided: false },
    certificateEnabled: false,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Quick Wins',
        description: 'Adjustments that cost nothing.',
        lessons: [
          {
            title: 'Five Adjustments You Can Make Tomorrow',
            type: 'standard',
            minutes: 10,
            tier: 'partial',
            objectives: ['List five no-cost classroom adjustments'],
            html:
              h(2, 'Five Adjustments You Can Make Tomorrow') +
              ul([
                'Write the lesson plan on the board and leave it there.',
                'Say instructions aloud and also write them down.',
                'Give a two minute warning before any transition.',
                'Allow headphones during independent work.',
                'Never use colour alone to convey meaning on a handout.',
              ]),
          },
        ],
      },
    ],
    achievements: [],
    milestones: [],
  },

  // ═══════════ 11. Study Habits (ARCHIVED, older course) ═══════════
  {
    key: 'c_archived',
    title: 'Study Habits That Stick',
    slug: 'study-habits-that-stick',
    description:
      'An early ACESS course, replaced by "Focus and Study Skills for ADHD Learners". Archived in June 2026 and kept for the learners who completed it.',
    category: 'Study Skills',
    difficulty: 'beginner',
    status: 'archived',
    courseType: 'educator',
    ownerKey: 'edu_marcus',
    ownerRole: 'educator',
    createdAt: '2026-01-30T09:00:00+08:00',
    publishedAt: '2026-02-10T09:00:00+08:00',
    deletedAt: '2026-06-30T17:00:00+08:00',
    thumbnail: T[5],
    tags: ['study skills', 'habits', 'archived'],
    focus: 'general',
    secondaryFocus: [],
    accessibilityCategories: [],
    targetReadingAge: 12,
    recommendedAgeGroup: '13-17',
    supports: { tts: false, focusMode: false, chunked: false, transcripts: false, streaks: false, chapters: false, milestones: false, guided: false },
    certificateEnabled: false,
    layoutType: 'standard',
    chapters: [
      {
        title: 'Habits',
        description: 'The original habit-building material.',
        lessons: [
          {
            title: 'Anchoring a New Habit',
            type: 'standard',
            minutes: 9,
            tier: 'partial',
            objectives: ['Attach a new habit to an existing one'],
            html:
              h(2, 'Anchoring a New Habit') +
              p(
                'A new habit sticks best when it is attached to something you already do without thinking.',
                'The formula is: after I [existing habit], I will [new habit]. For example: after I put my dinner plate in the sink, I will open my study notes.',
              ),
          },
          {
            title: 'Tracking Without Guilt',
            type: 'standard',
            minutes: 8,
            tier: 'weak',
            html:
              h(2, 'Tracking Without Guilt') +
              p(
                'Habit tracking systems frequently fail not because the underlying behavioural principles are unsound but because the affective response elicited by a visible record of non-compliance tends to be disproportionately punitive relative to the informational value of that record, with the consequence that the tracker itself becomes an aversive stimulus which the individual then avoids, thereby terminating both the tracking and the habit it was intended to support.',
              ),
          },
        ],
      },
    ],
    achievements: [
      { name: 'Habit Started', description: 'Complete your first lesson.', requirement: 'lesson', threshold: 1, icon: '🌱' },
    ],
    milestones: [],
  },
];

export const courseByKey = (key: string): CourseDef => {
  const c = COURSES.find((x) => x.key === key);
  if (!c) throw new Error(`Unknown course: ${key}`);
  return c;
};
