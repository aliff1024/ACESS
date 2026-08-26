'use client';

import { Lock, Check } from 'lucide-react';
import { AchievementIcon } from './icons';
import { CATEGORY_COLORS, type ResolvedAchievement } from '@/lib/gamification';

export function formatEarned(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface AchievementCardProps {
  achievement: ResolvedAchievement
  onSelect: (achievement: ResolvedAchievement) => void
}

/**
 * One achievement, unlocked or not.
 *
 * A locked achievement shows the same information as an unlocked one plus how
 * far along the learner is — never just "Locked" with no context. Colour
 * comes from the achievement's category (see CATEGORY_COLORS) so the four
 * kinds of milestone are visually distinct, not just four rows of identical
 * grey cards; the colour is always paired with the icon and the category
 * name in the detail view, never the only way to tell them apart.
 *
 * It is a real <button>, so it is reachable by keyboard and announced as
 * activatable — the version this replaces used unfocusable <div>s.
 */
export function AchievementCard({ achievement, onSelect }: AchievementCardProps) {
  const { unlocked, current, threshold, progress_pct, category } = achievement;
  const colors = CATEGORY_COLORS[category];

  return (
    <button
      type="button"
      onClick={() => onSelect(achievement)}
      data-composite=""
      aria-label={
        unlocked
          ? `${achievement.name}, unlocked. ${achievement.criteria}. View details.`
          : `${achievement.name}, locked. ${achievement.criteria}. Progress ${current} of ${threshold}. View details.`
      }
      className={`group text-left w-full h-full rounded-2xl border p-5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        unlocked
          ? `${colors.border} bg-card hover:shadow-md hover:-translate-y-0.5`
          : 'border-border bg-muted/40 hover:bg-accent'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            unlocked
              ? `bg-gradient-to-br ${colors.gradient} text-white shadow-sm`
              : 'bg-muted text-muted-foreground'
          }`}
          aria-hidden="true"
        >
          {unlocked ? (
            <AchievementIcon name={achievement.icon} className="w-6 h-6" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-foreground leading-tight">{achievement.name}</h3>
            <span
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                unlocked
                  ? `${colors.chipBg} ${colors.chipText} ${colors.border}`
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
            >
              {achievement.xp} XP
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{achievement.criteria}</p>
        </div>
      </div>

      <div className="mt-4">
        {unlocked ? (
          <p className={`text-sm font-medium flex items-center gap-1.5 ${colors.chipText}`}>
            <Check className="w-4 h-4" aria-hidden="true" />
            {achievement.earned_at ? `Earned ${formatEarned(achievement.earned_at)}` : 'Earned'}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground tabular-nums">
                {current} / {threshold}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={threshold}
              aria-label={`${current} of ${threshold}`}
            >
              <div
                className={`h-full rounded-full ${colors.bar} transition-[width] duration-500 motion-reduce:transition-none`}
                style={{ width: `${progress_pct}%` }}
              />
            </div>
          </>
        )}
      </div>
    </button>
  );
}
