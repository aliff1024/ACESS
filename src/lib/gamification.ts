/**
 * Achievements, XP and levels — the single derivation.
 *
 * WHY THIS FILE EXISTS
 *
 * Before it, the Learner Portal carried three overlapping and mutually
 * inconsistent notions of "how far have I got":
 *
 *   1. `/learner/achievements` — a 50-level XP ladder in level-system.ts,
 *      fed by a formula that multiplied the learner's *average quiz score*
 *      by their *lesson count* and called the product "quiz XP", so
 *      finishing a lesson that had no quiz raised it.
 *   2. `/learner/certificates` — a completely different four-tier ladder
 *      (Beginner/Intermediate/Advanced/Expert) in LearningLevelTab.tsx.
 *   3. `fetchLearnerBadges()` in learner-api.ts — eight hard-coded badges
 *      computed in the browser, several of which reported
 *      `earnedAt: new Date()`, i.e. "you earned this just now" every time
 *      the page was opened, for a badge earned months ago or not at all.
 *
 * All three are replaced by this module.
 *
 * DERIVED, NOT STORED
 *
 * Nothing here is written to the database and nothing is counted twice,
 * because there is no counter to increment. A platform achievement is a
 * predicate over metrics that are themselves counts of real rows, and the
 * date it was earned is the timestamp of the row that pushed the count over
 * the threshold. Re-running the derivation on the same rows always produces
 * the same answer, so refresh, logout/login and a second browser tab cannot
 * disagree, and a learner cannot "farm" XP by repeating an action — repeating
 * it does not add a row.
 *
 * The definitions below (name, threshold, XP) are application configuration,
 * the same way the level titles are. Everything *factual* — whether a
 * learner reached a threshold and when — comes from the database.
 * Educator-authored, per-course badges remain rows in `course_achievements`
 * and are awarded server-side by `sync_learner_course_state()`; this module
 * reads them, it does not duplicate them.
 *
 * SCOPING RULE
 *
 * Every count is taken over the same lesson set the rest of ACESS divides by:
 * published, visible lessons on non-dropped enrollments. A progress row that
 * outlives its lesson being unpublished must not push an achievement over the
 * line when it does not count towards the course percentage on the Progress
 * page. See `docs/accessibility` and the completion-consistency audit script.
 */

// ─── Metrics ───────────────────────────────────────────────────────────

/** The measurable quantities an achievement can be defined over. */
export type AchievementMetric =
  | 'lessons_completed'
  | 'courses_completed'
  | 'certificates_earned'
  | 'quizzes_passed'
  | 'high_scores'
  | 'active_days'
  | 'course_badges'

export type AchievementCategory = 'learning' | 'consistency' | 'mastery' | 'recognition'

export interface LearnerMetrics {
  /** Completed lessons across every non-dropped enrollment, published+visible only. */
  lessons_completed: number
  /** Enrollments the database has derived to `completed`. */
  courses_completed: number
  /** Certificates with status `issued` held by this learner. */
  certificates_earned: number
  /** Distinct quizzes with at least one passing attempt. */
  quizzes_passed: number
  /** Distinct quizzes whose best attempt scored 90% or higher. */
  high_scores: number
  /** Distinct calendar days on which the learner did something that left a row. */
  active_days: number
  /** Educator-authored course badges earned (rows in `user_achievements`). */
  course_badges: number
  /** Mean of every recorded quiz attempt. Reported, not used for XP. */
  avg_quiz_score: number
}

export const EMPTY_METRICS: LearnerMetrics = {
  lessons_completed: 0,
  courses_completed: 0,
  certificates_earned: 0,
  quizzes_passed: 0,
  high_scores: 0,
  active_days: 0,
  course_badges: 0,
  avg_quiz_score: 0,
}

/**
 * For each metric, the ISO timestamp at which each unit was earned, sorted
 * ascending. `timeline.lessons_completed[4]` is when the 5th lesson was
 * finished, which is exactly the date the "10 Lessons" style achievement
 * with threshold 5 was reached.
 *
 * This is what makes `earned_at` real rather than "now". The alternative —
 * a ledger table written when a threshold is crossed — would need a write
 * path, and every write path is a place a duplicate can appear.
 */
export type MetricTimeline = Record<AchievementMetric, string[]>

export const EMPTY_TIMELINE: MetricTimeline = {
  lessons_completed: [],
  courses_completed: [],
  certificates_earned: [],
  quizzes_passed: [],
  high_scores: [],
  active_days: [],
  course_badges: [],
}

// ─── The catalogue ─────────────────────────────────────────────────────

export interface AchievementDefinition {
  /** Stable identifier. Never reuse one for a different meaning. */
  code: string
  category: AchievementCategory
  name: string
  /** One line, learner-facing, present tense. */
  description: string
  /** The exact rule, shown on the detail view so the bar is never a mystery. */
  criteria: string
  /** A lucide-react icon name; resolved by the UI, not imported here. */
  icon: string
  metric: AchievementMetric
  threshold: number
  xp: number
}

/**
 * ON STREAKS
 *
 * The brief asked for consecutive-day streaks "only if the existing activity
 * data is reliable enough". It is not. `lesson_progress.last_viewed_at` is
 * overwritten every time a lesson is re-opened and there is no per-day
 * activity log anywhere in the schema, so a genuine "3 days in a row" cannot
 * be reconstructed — revisiting one old lesson today would erase the evidence
 * of the day it was originally studied.
 *
 * What *is* reliable is the number of distinct days on which the learner left
 * a first-view, a completion or a quiz attempt. So consistency is rewarded as
 * "learning days", counted honestly, rather than as a streak that would
 * silently be wrong. Days already earned can never be lost, which also makes
 * this the kinder mechanic: missing a day does not reset anything.
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── Learning ──
  {
    code: 'first_lesson',
    category: 'learning',
    name: 'First Lesson',
    description: 'You finished your very first lesson.',
    criteria: 'Complete 1 lesson',
    icon: 'Footprints',
    metric: 'lessons_completed',
    threshold: 1,
    xp: 50,
  },
  {
    code: 'five_lessons',
    category: 'learning',
    name: 'Getting Going',
    description: 'Five lessons finished — the habit is forming.',
    criteria: 'Complete 5 lessons',
    icon: 'BookOpen',
    metric: 'lessons_completed',
    threshold: 5,
    xp: 100,
  },
  {
    code: 'ten_lessons',
    category: 'learning',
    name: 'Ten Lessons',
    description: 'Ten lessons finished across your courses.',
    criteria: 'Complete 10 lessons',
    icon: 'BookMarked',
    metric: 'lessons_completed',
    threshold: 10,
    xp: 150,
  },
  {
    code: 'twenty_five_lessons',
    category: 'learning',
    name: 'Twenty-Five Lessons',
    description: 'Twenty-five lessons finished. That is real ground covered.',
    criteria: 'Complete 25 lessons',
    icon: 'Library',
    metric: 'lessons_completed',
    threshold: 25,
    xp: 300,
  },
  {
    code: 'first_course',
    category: 'learning',
    name: 'Course Finisher',
    description: 'You completed every lesson in a course.',
    criteria: 'Complete 1 course',
    icon: 'GraduationCap',
    metric: 'courses_completed',
    threshold: 1,
    xp: 200,
  },
  {
    code: 'three_courses',
    category: 'learning',
    name: 'Course Explorer',
    description: 'Three courses finished from start to end.',
    criteria: 'Complete 3 courses',
    icon: 'Compass',
    metric: 'courses_completed',
    threshold: 3,
    xp: 400,
  },
  {
    code: 'five_courses',
    category: 'learning',
    name: 'Five Courses',
    description: 'Five completed courses — a broad base of learning.',
    criteria: 'Complete 5 courses',
    icon: 'Layers',
    metric: 'courses_completed',
    threshold: 5,
    xp: 600,
  },

  // ── Consistency ──
  {
    code: 'three_days',
    category: 'consistency',
    name: 'Three Learning Days',
    description: 'You have studied on three separate days.',
    criteria: 'Learn on 3 different days',
    icon: 'CalendarCheck',
    metric: 'active_days',
    threshold: 3,
    xp: 75,
  },
  {
    code: 'seven_days',
    category: 'consistency',
    name: 'Seven Learning Days',
    description: 'Seven separate days of learning. Consistency is the point.',
    criteria: 'Learn on 7 different days',
    icon: 'CalendarRange',
    metric: 'active_days',
    threshold: 7,
    xp: 150,
  },
  {
    code: 'fourteen_days',
    category: 'consistency',
    name: 'Fourteen Learning Days',
    description: 'Fourteen days of coming back to your learning.',
    criteria: 'Learn on 14 different days',
    icon: 'CalendarHeart',
    metric: 'active_days',
    threshold: 14,
    xp: 250,
  },
  {
    code: 'thirty_days',
    category: 'consistency',
    name: 'Thirty Learning Days',
    description: 'Thirty separate days spent learning on ACESS.',
    criteria: 'Learn on 30 different days',
    icon: 'CalendarClock',
    metric: 'active_days',
    threshold: 30,
    xp: 400,
  },

  // ── Mastery ──
  {
    code: 'first_quiz',
    category: 'mastery',
    name: 'First Quiz Passed',
    description: 'You passed your first quiz.',
    criteria: 'Pass 1 quiz',
    icon: 'CircleCheckBig',
    metric: 'quizzes_passed',
    threshold: 1,
    xp: 50,
  },
  {
    code: 'five_quizzes',
    category: 'mastery',
    name: 'Five Quizzes Passed',
    description: 'Five quizzes passed across your lessons.',
    criteria: 'Pass 5 quizzes',
    icon: 'ClipboardCheck',
    metric: 'quizzes_passed',
    threshold: 5,
    xp: 150,
  },
  {
    code: 'ten_quizzes',
    category: 'mastery',
    name: 'Ten Quizzes Passed',
    description: 'Ten quizzes passed. You are checking your own understanding.',
    criteria: 'Pass 10 quizzes',
    icon: 'ListChecks',
    metric: 'quizzes_passed',
    threshold: 10,
    xp: 250,
  },
  {
    code: 'three_high_scores',
    category: 'mastery',
    name: 'Top Marks',
    description: 'Three quizzes scored at 90% or better.',
    criteria: 'Score 90% or higher on 3 quizzes',
    icon: 'Target',
    metric: 'high_scores',
    threshold: 3,
    xp: 200,
  },
  {
    code: 'ten_high_scores',
    category: 'mastery',
    name: 'Consistently Excellent',
    description: 'Ten quizzes scored at 90% or better.',
    criteria: 'Score 90% or higher on 10 quizzes',
    icon: 'Crosshair',
    metric: 'high_scores',
    threshold: 10,
    xp: 400,
  },

  // ── Recognition ──
  {
    code: 'first_certificate',
    category: 'recognition',
    name: 'Certified',
    description: 'You earned your first course certificate.',
    criteria: 'Earn 1 certificate',
    icon: 'Award',
    metric: 'certificates_earned',
    threshold: 1,
    xp: 200,
  },
  {
    code: 'three_certificates',
    category: 'recognition',
    name: 'Three Certificates',
    description: 'Three formal course completions on record.',
    criteria: 'Earn 3 certificates',
    icon: 'ScrollText',
    metric: 'certificates_earned',
    threshold: 3,
    xp: 400,
  },
  {
    code: 'first_course_badge',
    category: 'recognition',
    name: 'Badge Collector',
    description: 'You earned a badge set by one of your educators.',
    criteria: 'Earn 1 course badge',
    icon: 'Medal',
    metric: 'course_badges',
    threshold: 1,
    xp: 100,
  },
  {
    code: 'three_course_badges',
    category: 'recognition',
    name: 'Badge Collection',
    description: 'Three educator-set course badges earned.',
    criteria: 'Earn 3 course badges',
    icon: 'Trophy',
    metric: 'course_badges',
    threshold: 3,
    xp: 250,
  },
]

export const CATEGORY_ORDER: AchievementCategory[] = [
  'learning',
  'consistency',
  'mastery',
  'recognition',
]

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  learning: 'Learning',
  consistency: 'Consistency',
  mastery: 'Mastery',
  recognition: 'Recognition',
}

export const CATEGORY_DESCRIPTIONS: Record<AchievementCategory, string> = {
  learning: 'Lessons and courses you have worked through.',
  consistency: 'Coming back to your learning over time.',
  mastery: 'How well you are checking your own understanding.',
  recognition: 'Certificates and badges awarded to you.',
}

/**
 * Literal Tailwind classes, one palette per category, so Learning /
 * Consistency / Mastery / Recognition read as different things at a glance —
 * not just from their text. Deliberately plain utility classes rather than
 * new CSS custom properties: every one of these families (blue, green,
 * purple, amber) already has a dark-mode / high-contrast override in
 * globals.css, the same safety net the rest of the learner UI relies on, so
 * nothing here needs its own theme-awareness code. Colour is never the only
 * signal anywhere these are used — each spot also carries an icon and a text
 * label (WCAG 1.4.1).
 */
export const CATEGORY_COLORS: Record<
  AchievementCategory,
  { gradient: string; chipBg: string; chipText: string; border: string; ring: string; bar: string }
> = {
  learning: {
    gradient: 'from-blue-400 to-indigo-600',
    chipBg: 'bg-blue-50',
    chipText: 'text-blue-700',
    border: 'border-blue-200',
    ring: 'ring-blue-200',
    bar: 'bg-blue-500',
  },
  consistency: {
    gradient: 'from-green-400 to-emerald-600',
    chipBg: 'bg-green-50',
    chipText: 'text-green-700',
    border: 'border-green-200',
    ring: 'ring-green-200',
    bar: 'bg-green-500',
  },
  mastery: {
    gradient: 'from-purple-400 to-fuchsia-600',
    chipBg: 'bg-purple-50',
    chipText: 'text-purple-700',
    border: 'border-purple-200',
    ring: 'ring-purple-200',
    bar: 'bg-purple-500',
  },
  recognition: {
    gradient: 'from-amber-400 to-orange-600',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-200',
    bar: 'bg-amber-500',
  },
}

// ─── Resolution ────────────────────────────────────────────────────────

export interface ResolvedAchievement extends AchievementDefinition {
  /** Where the learner currently stands on this achievement's metric. */
  current: number
  unlocked: boolean
  /** When the threshold was crossed. Null while locked — never a made-up date. */
  earned_at: string | null
  /** 0-100, capped. */
  progress_pct: number
  /** How many more units are needed. 0 once unlocked. */
  remaining: number
}

/**
 * Turns the catalogue plus one learner's measurements into the list the UI
 * renders. Unlocked achievements come back with the real date the threshold
 * was crossed where the timeline can supply one.
 */
export function resolveAchievements(
  metrics: LearnerMetrics,
  timeline: MetricTimeline,
): ResolvedAchievement[] {
  return ACHIEVEMENTS.map((def) => {
    const current = metrics[def.metric] ?? 0
    const unlocked = current >= def.threshold
    const stamps = timeline[def.metric] ?? []
    // The unit that crossed the line is the threshold-th one, 1-indexed.
    const earned_at = unlocked ? stamps[def.threshold - 1] ?? null : null
    return {
      ...def,
      current,
      unlocked,
      earned_at,
      progress_pct: def.threshold > 0
        ? Math.min(100, Math.round((current / def.threshold) * 100))
        : 0,
      remaining: Math.max(0, def.threshold - current),
    }
  })
}

/**
 * The next few things worth doing, nearest first.
 *
 * Locked achievements the learner has actually started are more motivating
 * than ones they have not touched, so partial progress sorts ahead of zero.
 */
export function nextAchievements(
  resolved: ResolvedAchievement[],
  count = 3,
): ResolvedAchievement[] {
  return resolved
    .filter((a) => !a.unlocked)
    .sort((a, b) => {
      const aStarted = a.current > 0 ? 0 : 1
      const bStarted = b.current > 0 ? 0 : 1
      if (aStarted !== bStarted) return aStarted - bStarted
      if (b.progress_pct !== a.progress_pct) return b.progress_pct - a.progress_pct
      return a.remaining - b.remaining
    })
    .slice(0, count)
}

/** Most recently earned first. Achievements without a date sort last. */
export function recentAchievements(
  resolved: ResolvedAchievement[],
  count = 3,
): ResolvedAchievement[] {
  return resolved
    .filter((a) => a.unlocked)
    .sort((a, b) => {
      if (!a.earned_at) return 1
      if (!b.earned_at) return -1
      return b.earned_at.localeCompare(a.earned_at)
    })
    .slice(0, count)
}

// ─── XP ────────────────────────────────────────────────────────────────

/**
 * What a single unit of each activity is worth.
 *
 * Only actions that leave evidence of learning score. Opening a page, viewing
 * a lesson without finishing it, and retaking a quiz you have already passed
 * are all worth nothing, deliberately: XP that can be farmed by clicking is
 * XP that stops meaning anything.
 */
export const XP_RATES = {
  /** Per completed lesson. */
  lesson: 100,
  /** Per DISTINCT quiz passed — not per attempt, so retries never re-pay. */
  quiz: 50,
  /** Per completed course, on top of its lessons. */
  course: 500,
  /** Per issued certificate. */
  certificate: 250,
} as const

export interface XPBreakdown {
  lessons: number
  quizzes: number
  courses: number
  certificates: number
  achievements: number
  total: number
}

export function computeXP(
  metrics: LearnerMetrics,
  resolved: ResolvedAchievement[],
): XPBreakdown {
  const lessons = metrics.lessons_completed * XP_RATES.lesson
  const quizzes = metrics.quizzes_passed * XP_RATES.quiz
  const courses = metrics.courses_completed * XP_RATES.course
  const certificates = metrics.certificates_earned * XP_RATES.certificate
  const achievements = resolved
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xp, 0)
  return {
    lessons,
    quizzes,
    courses,
    certificates,
    achievements,
    total: lessons + quizzes + courses + certificates + achievements,
  }
}

/** Human-readable list of what earns XP, for the "how this works" panel. */
export const XP_SOURCES: { label: string; value: string }[] = [
  { label: 'Complete a lesson', value: `${XP_RATES.lesson} XP` },
  { label: 'Pass a quiz (first time)', value: `${XP_RATES.quiz} XP` },
  { label: 'Complete a course', value: `${XP_RATES.course} XP` },
  { label: 'Earn a certificate', value: `${XP_RATES.certificate} XP` },
  { label: 'Unlock an achievement', value: '50–600 XP' },
]

// ─── Levels ────────────────────────────────────────────────────────────

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  2: 'Apprentice',
  3: 'Explorer',
  4: 'Scholar',
  5: 'Achiever',
  6: 'Advanced',
  7: 'Expert',
  8: 'Master',
  9: 'Grandmaster',
  10: 'Legend',
}

export interface LevelTier {
  level: number
  title: string
  minXP: number
}

export const LEVEL_LADDER: LevelTier[] = [
  { level: 1, title: 'Beginner', minXP: 0 },
  { level: 2, title: 'Apprentice', minXP: 300 },
  { level: 3, title: 'Explorer', minXP: 900 },
  { level: 4, title: 'Scholar', minXP: 1800 },
  { level: 5, title: 'Achiever', minXP: 3000 },
  { level: 6, title: 'Advanced', minXP: 4500 },
  { level: 7, title: 'Expert', minXP: 6300 },
  { level: 8, title: 'Master', minXP: 8400 },
  { level: 9, title: 'Grandmaster', minXP: 10800 },
  { level: 10, title: 'Legend', minXP: 13500 },
]

export const MAX_LEVEL = 10

/**
 * Total XP required to *reach* a level.
 *
 * 150·n·(n-1): level 2 at 300, 3 at 900, 5 at 3,000, 10 at 13,500.
 */
export function xpForLevel(level: number): number {
  return 150 * level * (level - 1)
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[level] || `Level ${level}`
}

export interface LevelInfo {
  level: number
  title: string
  xp: number
  /** Total XP needed to reach the current level. */
  xpForCurrent: number
  /** Total XP needed to reach the next level. */
  xpForNext: number
  /** Size of the current band — the denominator of the progress bar. */
  xpBand: number
  /** XP still to earn before levelling up. 0 at max level. */
  xpRemaining: number
  /** 0-100 through the current band. */
  progress: number
  isMax: boolean
}

export function getLevelInfo(totalXP: number): LevelInfo {
  let level = 1
  while (level < MAX_LEVEL && totalXP >= xpForLevel(level + 1)) level++

  const xpForCurrent = xpForLevel(level)
  const isMax = level >= MAX_LEVEL
  const xpForNext = isMax ? xpForCurrent : xpForLevel(level + 1)
  const xpBand = Math.max(0, xpForNext - xpForCurrent)

  return {
    level,
    title: levelTitle(level),
    xp: totalXP,
    xpForCurrent,
    xpForNext,
    xpBand,
    xpRemaining: isMax ? 0 : Math.max(0, xpForNext - totalXP),
    progress: isMax
      ? 100
      : xpBand > 0
        ? Math.min(100, Math.max(0, Math.round(((totalXP - xpForCurrent) / xpBand) * 100)))
        : 0,
    isMax,
  }
}
