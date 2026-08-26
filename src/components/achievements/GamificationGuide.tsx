'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Zap,
  Trophy,
  Award,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Layers,
  Sparkles,
  QrCode,
  Lock,
} from 'lucide-react';
import {
  XP_SOURCES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_COLORS,
  LEVEL_LADDER,
  MAX_LEVEL,
} from '@/lib/gamification';

interface GamificationGuideProps {
  activeTab?: 'overview' | 'achievements' | 'certificates';
}

export function GamificationGuideButton({ activeTab = 'overview' }: GamificationGuideProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs h-8 gap-1.5 shadow-xs border-border bg-card hover:bg-muted"
      >
        <HelpCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        How this works
      </Button>
      <GamificationGuideDialog
        open={open}
        onOpenChange={setOpen}
        initialTab={activeTab === 'certificates' ? 'certificates' : activeTab === 'achievements' ? 'achievements' : 'levels'}
      />
    </>
  );
}

export function GamificationGuideDialog({
  open,
  onOpenChange,
  initialTab = 'levels',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'levels' | 'achievements' | 'certificates';
}) {
  const [guideTab, setGuideTab] = useState<'levels' | 'achievements' | 'certificates'>(initialTab);

  useEffect(() => {
    if (open) {
      setGuideTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px] font-bold">
              LEARNER RECOGNITION GUIDE
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 mt-1">
            <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
            How Badges, Levels &amp; Certificates Work
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Learn how your progress is tracked, what each tier represents, and how your credentials are verified.
          </DialogDescription>
        </DialogHeader>

        {/* Guide Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl w-fit text-xs border border-border mt-3">
          <button
            onClick={() => setGuideTab('achievements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              guideTab === 'achievements'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-purple-600" />
            Badges &amp; Achievements
          </button>

          <button
            onClick={() => setGuideTab('levels')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              guideTab === 'levels'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            XP &amp; Level Hierarchy (Max Lvl {MAX_LEVEL})
          </button>

          <button
            onClick={() => setGuideTab('certificates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              guideTab === 'certificates'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-blue-600" />
            System vs Educator Certificates
          </button>
        </div>

        {/* TAB 1: ACHIEVEMENTS & BADGES */}
        {guideTab === 'achievements' && (
          <div className="space-y-5 pt-3 text-xs text-foreground animate-in fade-in duration-150">
            <section className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2 mb-1.5">
                <Trophy className="w-4 h-4 text-purple-600" />
                Automatic Real-Activity Milestones
              </h3>
              <p className="text-purple-900 leading-relaxed">
                Achievements in ACESS represent meaningful milestones you cross in your learning journey.
                They are automatically unlocked when real records (completed lessons, passed quizzes, certificates earned)
                reach target thresholds.
              </p>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Four Achievement Categories
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_ORDER.map((cat) => {
                  const colors = CATEGORY_COLORS[cat];
                  return (
                    <div key={cat} className={`p-3.5 rounded-xl border ${colors.chipBg} ${colors.border} space-y-1`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${colors.gradient}`} />
                        <strong className={`text-xs ${colors.chipText}`}>{CATEGORY_LABELS[cat]}</strong>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: LEVELS, XP & RANKS */}
        {guideTab === 'levels' && (
          <div className="space-y-5 pt-3 text-xs text-foreground animate-in fade-in duration-150">
            <section className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                10-Tier Level Progression System
              </h3>
              <p className="text-amber-900 leading-relaxed text-xs">
                Your Level represents your overall experience and mastery across ACESS.
                Levels range from <strong>Level 1 (Beginner)</strong> up to the maximum pinnacle rank: <strong>Level 10 (Legend)</strong>.
              </p>
            </section>

            {/* 10-Tier Roadmap Table */}
            <section className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Complete Level Ladder &amp; Point Thresholds
              </h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2.5">Level</th>
                      <th className="p-2.5">Title / Rank</th>
                      <th className="p-2.5">Required XP</th>
                      <th className="p-2.5 text-right">Tier Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {LEVEL_LADDER.map((tier) => (
                      <tr key={tier.level} className="hover:bg-muted/30">
                        <td className="p-2.5 font-bold">Level {tier.level}</td>
                        <td className="p-2.5 font-medium">{tier.title}</td>
                        <td className="p-2.5 text-muted-foreground">{tier.minXP.toLocaleString()} XP</td>
                        <td className="p-2.5 text-right">
                          {tier.level === 10 ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                              MAX PINNACLE
                            </Badge>
                          ) : tier.level >= 8 ? (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                              ELITE
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Core Tier</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* How XP is Earned */}
            <section className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                How XP is Awarded
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {XP_SOURCES.map((s) => (
                  <div key={s.label} className="p-2.5 bg-muted/40 rounded-lg border border-border flex items-center justify-between">
                    <span className="text-muted-foreground">{s.label}</span>
                    <strong className="text-foreground">{s.value}</strong>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Note: Retrying already-passed quizzes or repeating viewed lessons does not award duplicate XP.
              </p>
            </section>
          </div>
        )}

        {/* TAB 3: SYSTEM VS EDUCATOR CERTIFICATES */}
        {guideTab === 'certificates' && (
          <div className="space-y-5 pt-3 text-xs text-foreground animate-in fade-in duration-150">
            <section className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
              <h3 className="font-bold text-sm text-blue-950 flex items-center gap-2 mb-1.5">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Understanding Your Credentials
              </h3>
              <p className="text-blue-900 leading-relaxed text-xs">
                Certificates are the formal, verifiable records of courses you have completed.
                ACESS supports two distinct types of certificates based on how the course was authored and certified.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* System Certificates */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <strong className="text-xs text-blue-900 font-bold">System Certificates</strong>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Official ACESS platform records issued automatically upon completing platform or standard courses.
                  They follow the unified ACESS certificate standard with automated score verification.
                </p>
                <div className="pt-2 text-[10px] text-muted-foreground border-t border-border flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Automatically issued on course completion
                </div>
              </div>

              {/* Educator Certificates */}
              <div className="p-4 rounded-2xl border border-green-200 bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <strong className="text-xs text-green-900 font-bold">Educator Certificates</strong>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unique, specialized credentials customized or issued directly by the educator teaching the course.
                  These may feature custom educator signatures, institution branding, or specialized requirements.
                </p>
                <div className="pt-2 text-[10px] text-muted-foreground border-t border-border flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Educator-branded and tailored credential
                </div>
              </div>
            </div>

            {/* Verification */}
            <section className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-1.5">
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-primary" /> Public Verification &amp; PDF Downloads
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Every certificate issued on ACESS carries a unique Reference Code (e.g. <code>GRXL-YQ1W-Q4IX</code>).
                Anyone can verify its authenticity at <code>/verify/[code]</code>. You can also download high-resolution PDF certificates anytime.
              </p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
