'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Trophy, Award, ArrowRight, Zap } from 'lucide-react';
import { fetchLearnerGamification, fetchCertificates } from '@/lib/learner-api';
import { recentAchievements, CATEGORY_COLORS, type ResolvedAchievement, type LevelInfo } from '@/lib/gamification';
import { AchievementIcon } from '@/components/achievements/icons';

/**
 * The Dashboard's one small section about achievements and certificates.
 *
 * Deliberately small. The Dashboard's job is "what should I do next", and a
 * full gamification panel there competes with the thing the learner actually
 * came to do. This shows where they stand, the single most recent milestone,
 * and how many certificates they hold — then gets out of the way with a link
 * to the full Achievements & Certificates page.
 *
 * It renders nothing at all until the data has loaded and nothing if the read
 * fails, rather than showing zeroes: a brand-new learner seeing "Level 1 · 0
 * XP · 0 certificates" on their first visit is being told what they lack
 * before they have had a chance to start.
 *
 * COLOUR NOTE: panel backgrounds here are `bg-muted`/`bg-card` (theme
 * tokens, safe under every preset and both alternate themes) with a small
 * gradient ICON CHIP for colour — never a gradient panel with body text
 * baked on top of it. A `from-x to-y` gradient utility isn't one of the
 * classes the dark/high-contrast safety net in globals.css rewrites (only
 * solid `bg-*-50/100` are), so a gradient panel would stay pale under a
 * black high-contrast page; a solid icon chip carrying only a white icon has
 * no such problem.
 */
export function AchievementsSummary({ showHeading = true }: { showHeading?: boolean } = {}) {
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [recent, setRecent] = useState<ResolvedAchievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLearnerGamification(), fetchCertificates()])
      .then(([g, certs]) => {
        if (cancelled) return;
        setLevel(g.level);
        setRecent(recentAchievements(g.achievements, 1));
        setUnlockedCount(g.achievements.filter((a) => a.unlocked).length);
        setCertCount(certs.length);
        setReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!ready || !level) return null;

  // Nothing earned yet: a single encouraging line rather than a panel of noughts.
  if (unlockedCount === 0 && certCount === 0) {
    return (
      <Card className="p-5 border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 simplifiable"
              aria-hidden="true"
            >
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your learning milestones will appear here as you progress. Finish a lesson to unlock
              your first one.
            </p>
          </div>
          <Link
            href="/learner/achievements"
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1.5 shrink-0"
          >
            See what you can earn
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    );
  }

  const latest = recent[0];
  const latestColors = latest ? CATEGORY_COLORS[latest.category] : null;

  return (
    <Card className="p-5 border-border bg-card">
      {/* The heading is suppressed where the page already supplies one — the
          Autism dashboard numbers its own sections, and repeating the title
          immediately underneath is exactly the redundancy that preset
          exists to remove. */}
      <div className={`flex items-center gap-4 mb-4 ${showHeading ? 'justify-between' : 'justify-end'}`}>
        {showHeading && (
          <h2 className="text-lg font-bold text-foreground">Achievements &amp; Certificates</h2>
        )}
        <Link
          href="/learner/achievements"
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1.5 shrink-0"
        >
          View all
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
          <div
            className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"
            aria-hidden="true"
          >
            <span className="text-base font-bold">{level.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-700 truncate">{level.title}</p>
            <div
              className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden mt-1"
              role="progressbar"
              aria-valuenow={level.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${level.progress}% of the way to level ${level.level + 1}`}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${level.progress}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-1 flex items-center gap-1 opacity-90">
              <Zap className="w-3 h-3" aria-hidden="true" />
              {level.isMax ? `${level.xp.toLocaleString()} XP` : `${level.xpRemaining.toLocaleString()} XP to next level`}
            </p>
          </div>
        </div>

        {/* Latest achievement */}
        <div className="p-3 rounded-xl bg-muted/50 border border-transparent">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Latest milestone
          </p>
          {latest && latestColors ? (
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${latestColors.gradient}`}
                aria-hidden="true"
              >
                <AchievementIcon name={latest.icon} className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground truncate">{latest.name}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None yet — keep going.</p>
          )}
        </div>

        {/* Certificates */}
        <Link
          href="/learner/achievements?tab=certificates"
          className="flex items-center gap-3 rounded-xl p-3 bg-amber-50 border border-amber-200 hover:shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm"
            aria-hidden="true"
          >
            <Award className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-amber-700 tabular-nums leading-tight">
              {certCount}
            </p>
            <p className="text-sm text-amber-700 opacity-90">
              {certCount === 1 ? 'certificate earned' : 'certificates earned'}
            </p>
          </div>
        </Link>
      </div>
    </Card>
  );
}
