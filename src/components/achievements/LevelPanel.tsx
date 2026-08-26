'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  BookOpen,
  ListChecks,
  GraduationCap,
  Award,
  Trophy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Crown,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { LEVEL_LADDER, MAX_LEVEL, type LevelInfo, type XPBreakdown } from '@/lib/gamification';

interface LevelPanelProps {
  level: LevelInfo;
  xp: XPBreakdown;
}

const SOURCE_ROWS = [
  { key: 'lessons', label: 'Lessons', icon: BookOpen, chip: 'bg-blue-50', text: 'text-blue-700' },
  { key: 'quizzes', label: 'Quizzes', icon: ListChecks, chip: 'bg-purple-50', text: 'text-purple-700' },
  { key: 'courses', label: 'Courses', icon: GraduationCap, chip: 'bg-green-50', text: 'text-green-700' },
  { key: 'certificates', label: 'Certificates', icon: Award, chip: 'bg-amber-50', text: 'text-amber-700' },
  { key: 'achievements', label: 'Achievements', icon: Trophy, chip: 'bg-indigo-50', text: 'text-indigo-700' },
] as const;

export function LevelPanel({ level, xp }: LevelPanelProps) {
  const [showLadder, setShowLadder] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const intoBand = Math.max(0, level.xp - level.xpForCurrent);
  const nextTier = LEVEL_LADDER.find((t) => t.level === level.level + 1);
  const maxTier = LEVEL_LADDER[LEVEL_LADDER.length - 1];

  return (
    <Card className="p-6 border-border bg-card shadow-xs rounded-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Current Level Badge */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-sm relative overflow-hidden"
            aria-hidden="true"
          >
            <span className="text-3xl font-extrabold">{level.level}</span>
            {level.level >= 8 && (
              <Crown className="w-4 h-4 text-amber-300 absolute top-1.5 right-1.5" />
            )}
          </div>
          <Badge className="mt-2 text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200">
            {level.title}
          </Badge>
        </div>

        {/* Level Stats & Progress Bar */}
        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground">
              Level {level.level} — {level.title}
            </h2>
            <Badge variant="outline" className="text-[11px] font-medium bg-muted/50">
              Pinnacle Rank: Level {MAX_LEVEL} ({maxTier.title})
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
            <span className="font-semibold text-foreground">{level.xp.toLocaleString()} Total XP</span>
            {level.isMax ? (
              <span className="text-amber-600 font-semibold ml-2">🎉 Pinnacle Rank Reached</span>
            ) : (
              <>
                {' '}· {intoBand.toLocaleString()} / {level.xpBand.toLocaleString()} XP through this level ·{' '}
                <span className="font-semibold text-foreground">
                  {level.xpRemaining.toLocaleString()} XP to Level {level.level + 1} ({nextTier?.title})
                </span>
              </>
            )}
          </p>

          <div
            className="w-full h-3 rounded-full bg-muted overflow-hidden relative"
            role="progressbar"
            aria-valuenow={level.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${level.progress}%` }}
            />
          </div>

          {/* Quick Helper Toggles */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
            <button
              onClick={() => setShowLadder(!showLadder)}
              className="font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showLadder ? 'Hide 10-tier ladder' : 'View all 10 ranks & titles'}
              {showLadder ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <PieChart className="w-3.5 h-3.5 text-purple-600" />
              {showBreakdown ? 'Hide XP breakdown' : 'View XP breakdown'}
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable 10-Tier Level Progression Roadmap */}
      {showLadder && (
        <div className="mt-5 pt-5 border-t border-border animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                ACESS 10-Tier Rank Progression
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Earn XP by completing learning activities to advance your rank.
              </p>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border-0 text-[11px]">
              Current: Level {level.level} ({level.title})
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LEVEL_LADDER.map((tier) => {
              const isCurrent = tier.level === level.level;
              const isUnlocked = tier.level <= level.level;

              return (
                <div
                  key={tier.level}
                  className={`p-2.5 rounded-xl border transition-all text-xs ${
                    isCurrent
                      ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-200 shadow-xs'
                      : isUnlocked
                      ? 'bg-muted/40 border-border text-foreground'
                      : 'bg-muted/10 border-dashed border-border/70 text-muted-foreground opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${isCurrent ? 'text-purple-900 font-extrabold' : 'text-foreground'}`}>
                      Lvl {tier.level}
                    </span>
                    {isCurrent ? (
                      <Badge className="bg-purple-600 text-white text-[9px] px-1 py-0 h-3.5">
                        YOU
                      </Badge>
                    ) : isUnlocked ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`font-semibold ${isCurrent ? 'text-purple-950 font-bold' : 'text-foreground'} truncate`}>
                    {tier.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {tier.minXP.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible XP Source Breakdown */}
      {showBreakdown && (
        <div className="mt-5 pt-5 border-t border-border animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
            Where your XP came from
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {SOURCE_ROWS.map(({ key, label, icon: Icon, chip, text }) => (
              <div key={key} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${chip} border border-black/5`}>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${text}`} aria-hidden="true" />
                <div className="min-w-0">
                  <dt className={`text-[10px] font-medium ${text} opacity-80`}>{label}</dt>
                  <dd className={`text-xs font-bold ${text}`}>
                    {xp[key].toLocaleString()} XP
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}

export function LevelSummary({ level }: { level: LevelInfo }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs"
        aria-hidden="true"
      >
        <span className="text-lg font-bold">{level.level}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          Level {level.level} — {level.title}
        </p>
        <div
          className="w-full h-2 rounded-full bg-muted overflow-hidden mt-1.5 mb-1"
          role="progressbar"
          aria-valuenow={level.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-purple-600 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${level.progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" aria-hidden="true" />
          {level.isMax
            ? `${level.xp.toLocaleString()} XP (Max Rank: Legend)`
            : `${level.xpRemaining.toLocaleString()} XP to Level ${level.level + 1}`}
        </p>
      </div>
    </div>
  );
}
