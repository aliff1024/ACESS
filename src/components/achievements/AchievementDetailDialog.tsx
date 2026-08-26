'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Lock } from 'lucide-react';
import { AchievementIcon } from './icons';
import { formatEarned } from './AchievementCard';
import { CATEGORY_LABELS, CATEGORY_COLORS, type ResolvedAchievement } from '@/lib/gamification';

interface AchievementDetailDialogProps {
  achievement: ResolvedAchievement | null
  onClose: () => void
}

/**
 * What an achievement actually means, and what to do about it.
 *
 * Locked achievements answer "what next" concretely — "2 more courses to go" —
 * rather than leaving the learner to subtract the numbers themselves.
 */
export function AchievementDetailDialog({ achievement, onClose }: AchievementDetailDialogProps) {
  if (!achievement) return null;

  const { unlocked, current, threshold, remaining, progress_pct, category } = achievement;
  const unit = unitFor(achievement.metric);
  const colors = CATEGORY_COLORS[category];

  return (
    <Dialog open={!!achievement} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                unlocked
                  ? `bg-gradient-to-br ${colors.gradient} text-white shadow-sm`
                  : 'bg-muted text-muted-foreground'
              }`}
              aria-hidden="true"
            >
              {unlocked ? (
                <AchievementIcon name={achievement.icon} className="w-7 h-7" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-xl leading-tight">{achievement.name}</DialogTitle>
              <p
                className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mt-1.5 px-2 py-0.5 rounded-full border ${
                  unlocked
                    ? `${colors.chipBg} ${colors.chipText} ${colors.border}`
                    : 'bg-muted text-muted-foreground border-transparent'
                }`}
              >
                {CATEGORY_LABELS[category]} · {achievement.xp} XP
              </p>
            </div>
          </div>
          <DialogDescription className="text-left text-base text-foreground">
            {achievement.description}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-4 pt-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              How it is earned
            </dt>
            <dd className="text-sm text-foreground">{achievement.criteria}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Your progress
            </dt>
            <dd>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {current} of {threshold} {unit}
                </span>
                <span className="font-semibold text-foreground tabular-nums">{progress_pct}%</span>
              </div>
              <div
                className="w-full h-2.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={threshold}
                aria-label={`${current} of ${threshold} ${unit}`}
              >
                <div
                  className={`h-full rounded-full ${colors.bar} transition-[width] duration-500 motion-reduce:transition-none`}
                  style={{ width: `${progress_pct}%` }}
                />
              </div>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Status
            </dt>
            <dd className="text-sm text-foreground">
              {unlocked ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {achievement.earned_at
                    ? `Earned on ${formatEarned(achievement.earned_at)}`
                    : 'Earned'}
                </span>
              ) : (
                <>
                  Not yet earned — {remaining} more {remaining === 1 ? unitSingular(unit) : unit} to
                  go. It will unlock on its own as soon as you get there.
                </>
              )}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function unitFor(metric: ResolvedAchievement['metric']): string {
  switch (metric) {
    case 'lessons_completed': return 'lessons';
    case 'courses_completed': return 'courses';
    case 'certificates_earned': return 'certificates';
    case 'quizzes_passed': return 'quizzes passed';
    case 'high_scores': return 'high scores';
    case 'active_days': return 'learning days';
    case 'course_badges': return 'course badges';
    default: return 'steps';
  }
}

function unitSingular(unit: string): string {
  if (unit === 'quizzes passed') return 'quiz to pass';
  if (unit === 'high scores') return 'high score';
  return unit.replace(/s$/, '');
}
