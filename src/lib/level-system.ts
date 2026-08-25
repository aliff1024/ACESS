export interface LevelInfo {
  level: number
  title: string
  xp: number
  /** Size of the current level band, i.e. total XP between this level and the
   *  next. NOT the amount the learner still has to earn — see xpRemaining. */
  xpToNext: number
  xpForCurrent: number
  /** XP the learner still needs to reach the next level. The achievements page
   *  used to display xpToNext here, which told a learner sitting at 39% of the
   *  way through a level that they needed the whole level's worth again. */
  xpRemaining: number
  progress: number
}

const LEVEL_TITLES: Record<number, string> = {
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

const MAX_LEVEL = 50

export function computeXP(stats: {
  lessons_completed: number
  avg_score: number
  courses_completed: number
  certificates_count: number
}): number {
  const lessonXP = stats.lessons_completed * 100
  const quizXP = Math.round((stats.avg_score / 100) * stats.lessons_completed * 50)
  const courseXP = stats.courses_completed * 500
  const certXP = stats.certificates_count * 200
  return lessonXP + quizXP + courseXP + certXP
}

export function xpForLevel(level: number): number {
  return 100 * level * (level - 1) / 2
}

export function getLevelInfo(totalXP: number): LevelInfo {
  let level = 1
  while (level < MAX_LEVEL && totalXP >= xpForLevel(level + 1)) {
    level++
  }
  const xpForCurrent = xpForLevel(level)
  const xpToNext = xpForLevel(level + 1) - xpForCurrent
  const progress = xpToNext > 0
    ? Math.min(100, Math.round(((totalXP - xpForCurrent) / xpToNext) * 100))
    : 100
  return {
    level,
    title: LEVEL_TITLES[level] || `Level ${level}`,
    xp: totalXP,
    xpToNext,
    xpForCurrent,
    xpRemaining: Math.max(0, xpForCurrent + xpToNext - totalXP),
    progress,
  }
}
