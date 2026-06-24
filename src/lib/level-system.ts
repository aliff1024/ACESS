export interface LevelInfo {
  level: number
  title: string
  xp: number
  xpToNext: number
  xpForCurrent: number
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
    progress,
  }
}
