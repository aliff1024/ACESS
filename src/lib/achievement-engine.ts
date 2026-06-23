import { supabase } from './supabase'
import { createNotification } from './notifications'

export async function evaluateAchievements(userId: string, courseId: string): Promise<void> {
  try {
    // 1. Fetch available achievements for the course
    const { data: achievements, error: achErr } = await supabase
      .from('course_achievements')
      .select('*')
      .eq('course_id', courseId)
    
    if (achErr || !achievements || achievements.length === 0) return

    // 2. Fetch user's already earned achievements
    const { data: earned, error: earnErr } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    if (earnErr) return

    const earnedIds = new Set(earned?.map(e => e.achievement_id) || [])

    // Filter achievements the user has NOT earned yet
    const toEvaluate = achievements.filter(ach => !earnedIds.has(ach.id))
    if (toEvaluate.length === 0) return

    // 3. Fetch user progress
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()

    if (!enrollment) return

    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('is_viewed, last_viewed_at')
      .eq('enrollment_id', enrollment.id)

    const completedLessons = lessonProgress?.filter(lp => lp.is_viewed).length || 0

    const { data: courseLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      
    const totalLessons = courseLessons?.length || 0
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // b. Quiz Average
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('score_pct')
      .eq('enrollment_id', enrollment.id)
    
    let avgScore = 0
    if (quizAttempts && quizAttempts.length > 0) {
      const totalScore = quizAttempts.reduce((acc, q) => acc + (q.score_pct || 0), 0)
      avgScore = Math.round(totalScore / quizAttempts.length)
    }

    // c. Streak Calculation
    let streak = 0
    if (lessonProgress && lessonProgress.length > 0) {
      const dates = lessonProgress
        .map(p => p.last_viewed_at)
        .filter(Boolean)
        .map(d => new Date(d!).setHours(0,0,0,0))
        .sort((a, b) => b - a)

      if (dates.length > 0) {
        const uniqueDates = [...new Set(dates)]
        streak = 1
        const oneDay = 86400000
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          if ((uniqueDates[i] as number) - (uniqueDates[i+1] as number) === oneDay) {
            streak++
          } else {
            break
          }
        }
      }
    }

    // 4. Evaluate each remaining achievement
    for (const ach of toEvaluate) {
      let earnedBadge = false
      const type = ach.requirement_type
      const threshold = ach.requirement_threshold

      if (type === 'progress' && progressPct >= threshold) earnedBadge = true
      if (type === 'lesson' && completedLessons >= threshold) earnedBadge = true
      if (type === 'quiz' && avgScore >= threshold) earnedBadge = true
      if (type === 'streak' && streak >= threshold) earnedBadge = true

      if (earnedBadge) {
        // Award badge
        const { error: insertErr } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: ach.id
          })

        if (!insertErr) {
          // Trigger Notification
          await createNotification({
            user_id: userId,
            type: 'badge_earned',
            title: 'Badge Unlocked!',
            body: `You just earned the "${ach.name}" badge.`,
            metadata: { achievement_id: ach.id, course_id: courseId }
          })
        }
      }
    }

  } catch (err) {
    console.error('Failed to evaluate achievements:', err)
  }
}
