'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trophy,
  Award,
  ArrowRight,
  ArrowLeft,
  Medal,
  Check,
  Search,
  Target,
  Sparkles,
  Zap,
  Play,
  Calendar,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  GraduationCap,
  Layers,
  ChevronRight,
  ChevronLeft,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import {
  fetchLearnerGamification,
  fetchCertificates,
  type LearnerGamification,
  type Certificate,
} from '@/lib/learner-api';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_COLORS,
  recentAchievements,
  nextAchievements,
  type ResolvedAchievement,
  type AchievementCategory,
} from '@/lib/gamification';
import { LevelPanel } from './LevelPanel';
import { AchievementCard } from './AchievementCard';
import { AchievementDetailDialog } from './AchievementDetailDialog';
import { CertificatesPanel } from './CertificatesPanel';
import { GamificationGuideButton } from './GamificationGuide';
import { AchievementIcon } from './icons';

type TabId = 'overview' | 'achievements' | 'certificates';
const TABS: TabId[] = ['overview', 'achievements', 'certificates'];

export function AchievementsCertificatesPage({
  initialTab = 'overview',
}: {
  initialTab?: TabId;
}) {
  const router = useRouter();
  const { settings } = useAccessibility();
  const activePreset = settings?.base_preset || settings?.active_preset || 'none';
  const isPresetUser = activePreset !== 'none' || settings?.simplified_ui === true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<LearnerGamification | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selected, setSelected] = useState<ResolvedAchievement | null>(null);
  const [tab, setTab] = useState<TabId>(TABS.includes(initialTab) ? initialTab : 'overview');

  // Mode: Preset users get section-by-section low-stimulation mode by default; standard users get full view
  const [viewMode, setViewMode] = useState<'sectioned' | 'full'>(isPresetUser ? 'sectioned' : 'full');

  // Section-by-section state for Overview tab
  const [overviewSection, setOverviewSection] = useState<number>(0);
  // Section-by-section category index for Achievements tab
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);

  // Achievements sub-filters (for full view)
  const [categoryFilter, setCategoryFilter] = useState<'all' | AchievementCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep viewMode synced if user changes preset in settings
  useEffect(() => {
    if (isPresetUser) {
      setViewMode('sectioned');
    }
  }, [isPresetUser]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLearnerGamification(), fetchCertificates()])
      .then(([gamification, certs]) => {
        if (cancelled) return;
        setData(gamification);
        setCertificates(certs);
      })
      .catch((err) => {
        console.error('Failed to load achievements and certificates:', err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unlocked = useMemo(
    () => (data?.achievements ?? []).filter((a) => a.unlocked),
    [data]
  );
  const recent = useMemo(() => recentAchievements(data?.achievements ?? [], 3), [data]);
  const next = useMemo(() => nextAchievements(data?.achievements ?? [], 3), [data]);
  const topGoal = next[0] || null;

  // Filtered achievements for the Achievements Tab
  const filteredAchievements = useMemo(() => {
    return (data?.achievements ?? []).filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter === 'unlocked' && !a.unlocked) return false;
      if (statusFilter === 'locked' && a.unlocked) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = a.name.toLowerCase().includes(query);
        const matchDesc = a.description.toLowerCase().includes(query);
        const matchCriteria = a.criteria.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCriteria) return false;
      }
      return true;
    });
  }, [data, categoryFilter, statusFilter, searchQuery]);

  const changeTab = (value: string) => {
    const id = (TABS.includes(value as TabId) ? value : 'overview') as TabId;
    setTab(id);
    router.replace(`/learner/achievements?tab=${id}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-muted-foreground text-xs" role="status">
          Loading your achievements &amp; certificates…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto readable-content">
        <Card className="p-8 text-center border-border bg-card">
          <h1 className="text-xl font-bold text-foreground mb-2">
            We could not load your achievements
          </h1>
          <p className="text-muted-foreground mb-5 text-sm">
            Nothing has been lost — this is a temporary network problem.
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </Card>
      </div>
    );
  }

  const { metrics, level, xp, achievements } = data;
  const unlockPct = Math.round((unlocked.length / Math.max(1, achievements.length)) * 100);

  const overviewSectionsList = [
    { id: 'goal', label: '🎯 Focus Goal', title: 'Your Next Milestone Target' },
    { id: 'level', label: '⚡ Level & Progress', title: 'Your Current Rank & Level' },
    { id: 'stats', label: '📈 Learning Numbers', title: 'Activity Summary' },
    { id: 'recent', label: '🏆 Recent Wins', title: 'Latest Badges & Certificates' },
  ];

  const currentCategory = CATEGORY_ORDER[activeCategoryIndex];
  const badgesInCurrentCategory = achievements.filter((a) => a.category === currentCategory);
  const unlockedInCurrentCategory = badgesInCurrentCategory.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 readable-content space-y-6">
      {/* Header with Mode Indicator */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="w-7 h-7 text-primary shrink-0 simplifiable" aria-hidden="true" />
              Achievements &amp; Certificates
            </h1>
            {isPresetUser && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-semibold uppercase">
                {activePreset.replace('_', ' ')} Preset Active
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {viewMode === 'sectioned'
              ? 'Section-by-section view — low stimulation and step-by-step progress tracking.'
              : 'Track milestones, level progression, and verified course completion certificates.'}
          </p>
        </div>

        {/* Action Controls & Guide Button */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Preset View Mode Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'sectioned' ? 'full' : 'sectioned')}
            className="text-xs h-8 gap-1.5 border-border bg-card hover:bg-muted"
            title="Toggle between Section-by-Section mode and Full view"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
            {viewMode === 'sectioned' ? 'Show Full Page' : 'Show by Section'}
          </Button>

          <GamificationGuideButton activeTab={tab} />
        </div>
      </header>

      {/* Main Tab Bar */}
      <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto w-full gap-2 p-1.5 bg-muted rounded-2xl border border-border">
          <TabsTrigger
            value="overview"
            className="flex-1 min-w-32 py-2 px-3 rounded-xl text-xs md:text-sm font-semibold"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="achievements"
            className="flex-1 min-w-32 py-2 px-3 rounded-xl text-xs md:text-sm font-semibold"
          >
            Achievements
            <Badge className="ml-2 text-[11px] bg-purple-100 text-purple-800 border-0 font-bold">
              {unlocked.length}/{achievements.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="certificates"
            className="flex-1 min-w-32 py-2 px-3 rounded-xl text-xs md:text-sm font-semibold"
          >
            Certificates
            <Badge className="ml-2 text-[11px] bg-blue-100 text-blue-800 border-0 font-bold">
              {certificates.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW
           ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="m-0 space-y-6 animate-in fade-in duration-150">
          {/* SECTION-BY-SECTION MODE (FOR PRESETS: ADHD / AUTISM / LOW STIMULATION) */}
          {viewMode === 'sectioned' ? (
            <div className="space-y-6">
              {/* Section Selector Pills */}
              <div className="flex items-center justify-between gap-3 p-1.5 bg-muted rounded-2xl border border-border overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {overviewSectionsList.map((sec, idx) => (
                    <button
                      key={sec.id}
                      onClick={() => setOverviewSection(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        overviewSection === idx
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-muted-foreground font-medium px-2 shrink-0">
                  Section {overviewSection + 1} of {overviewSectionsList.length}
                </span>
              </div>

              {/* SECTION 0: FOCUS GOAL */}
              {overviewSection === 0 && topGoal && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <Card className="p-6 md:p-8 rounded-3xl border-2 border-purple-300 bg-gradient-to-br from-purple-50/90 via-indigo-50/60 to-white shadow-sm space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-purple-600 text-white text-xs px-3 py-1 font-bold">
                        🎯 CURRENT PRIMARY GOAL
                      </Badge>
                      <Badge variant="outline" className="bg-white text-purple-900 border-purple-200 text-xs font-bold">
                        +{topGoal.xp} XP REWARD
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                        <AchievementIcon name={topGoal.icon} className="w-10 h-10" />
                      </div>

                      <div className="space-y-1 flex-1">
                        <h2 className="text-2xl font-bold text-purple-950">{topGoal.name}</h2>
                        <p className="text-sm text-purple-900 leading-relaxed font-medium">
                          {topGoal.description}
                        </p>
                        <p className="text-xs text-purple-700/90 pt-1">
                          Requirement: <strong>{topGoal.criteria}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Big Progress Bar */}
                    <div className="space-y-2 pt-2 bg-white/70 p-4 rounded-2xl border border-purple-100">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                        <span>Progress to Unlock</span>
                        <span>
                          {topGoal.current} of {topGoal.threshold} completed ({topGoal.progress_pct}%)
                        </span>
                      </div>
                      <div className="w-full h-4 rounded-full bg-purple-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${topGoal.progress_pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-purple-800 font-semibold pt-0.5">
                        {topGoal.remaining === 1
                          ? '✨ Only 1 more step needed to unlock this badge!'
                          : `✨ Only ${topGoal.remaining} more needed to earn this badge!`}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <Button
                        size="lg"
                        onClick={() => router.push('/learner/courses')}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm h-11 px-6 gap-2 shadow-sm rounded-xl"
                      >
                        <Play className="w-4 h-4 fill-current" /> Continue Learning
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => changeTab('achievements')}
                        className="w-full sm:w-auto text-xs h-11 px-5 border-purple-200 text-purple-900 hover:bg-purple-50 rounded-xl"
                      >
                        View All Badges
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* SECTION 1: LEVEL & RANK */}
              {overviewSection === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <LevelPanel level={level} xp={xp} />
                </div>
              )}

              {/* SECTION 2: STATS */}
              {overviewSection === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatTile label="Lessons Completed" value={metrics.lessons_completed} color="blue" />
                    <StatTile label="Courses Completed" value={metrics.courses_completed} color="green" />
                    <StatTile label="Quizzes Passed" value={metrics.quizzes_passed} color="purple" />
                    <StatTile label="Active Learning Days" value={metrics.active_days} color="amber" />
                  </div>
                </div>
              )}

              {/* SECTION 3: RECENT WINS */}
              {overviewSection === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <Card className="p-6 rounded-3xl border-border bg-card shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                        <Medal className="w-4 h-4 text-green-600" />
                        Recently Unlocked Milestones
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => changeTab('achievements')}
                        className="text-xs text-primary gap-1"
                      >
                        See All Badges
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {recent.map((a) => (
                        <div
                          key={a.code}
                          onClick={() => setSelected(a)}
                          className="p-3.5 hover:bg-muted/60 transition-colors rounded-2xl border border-border/80 bg-muted/20 cursor-pointer flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-foreground">{a.name}</p>
                              <p className="text-[11px] text-muted-foreground">{a.criteria}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-bold shrink-0">
                            +{a.xp} XP
                          </Badge>
                        </div>
                      ))}

                      {recent.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                          Complete your first lesson to earn achievements!
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Section Stepper Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={overviewSection === 0}
                  onClick={() => setOverviewSection(Math.max(0, overviewSection - 1))}
                  className="text-xs h-9 px-4 gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Section
                </Button>

                <span className="text-xs font-semibold text-muted-foreground">
                  {overviewSectionsList[overviewSection].title}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={overviewSection === overviewSectionsList.length - 1}
                  onClick={() => setOverviewSection(Math.min(overviewSectionsList.length - 1, overviewSection + 1))}
                  className="text-xs h-9 px-4 gap-1.5"
                >
                  Next Section <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* FULL STANDARD VIEW (FOR STANDARD / HIGH CAPACITY USERS) */
            <div className="space-y-6 animate-in fade-in duration-150">
              <LevelPanel level={level} xp={xp} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Lessons Completed" value={metrics.lessons_completed} color="blue" />
                <StatTile label="Courses Completed" value={metrics.courses_completed} color="green" />
                <StatTile label="Quizzes Passed" value={metrics.quizzes_passed} color="purple" />
                <StatTile label="Active Learning Days" value={metrics.active_days} color="amber" />
              </div>

              {/* Recent Achievements Strip */}
              <section aria-labelledby="recent-achievements" className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 id="recent-achievements" className="text-base font-bold text-foreground">
                      Recent Achievements
                    </h2>
                    <p className="text-xs text-muted-foreground">Milestones you have recently unlocked</p>
                  </div>
                  {unlocked.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => changeTab('achievements')} className="text-xs text-primary gap-1">
                      View All ({unlocked.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {recent.length === 0 ? (
                  <EmptyNote
                    icon={<Medal className="w-6 h-6 text-white" aria-hidden="true" />}
                    iconBg="bg-gradient-to-br from-blue-400 to-indigo-600"
                    title="Your learning milestones will appear here as you progress."
                    body="Finish a lesson to unlock your first badge."
                  />
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
                    {recent.map((a) => (
                      <li key={a.code}>
                        <AchievementCard achievement={a} onSelect={setSelected} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Next Up */}
              {next.length > 0 && (
                <section aria-labelledby="next-achievements" className="space-y-3">
                  <div>
                    <h2 id="next-achievements" className="text-base font-bold text-foreground">
                      What You Can Work Toward Next
                    </h2>
                    <p className="text-xs text-muted-foreground">The milestones you are nearest to reaching</p>
                  </div>
                  <Card className="p-2 border-border bg-card divide-y divide-border rounded-2xl shadow-xs">
                    {next.map((a) => (
                      <NextUpRow key={a.code} achievement={a} onSelect={setSelected} />
                    ))}
                  </Card>
                </section>
              )}

              {/* Latest Certificates Preview */}
              <section aria-labelledby="recent-certificates" className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 id="recent-certificates" className="text-base font-bold text-foreground">
                      Latest Certificates
                    </h2>
                    <p className="text-xs text-muted-foreground">Verified credentials awarded to you</p>
                  </div>
                  {certificates.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => changeTab('certificates')} className="text-xs text-primary gap-1">
                      View All ({certificates.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {certificates.length === 0 ? (
                  <EmptyNote
                    icon={<Award className="w-6 h-6 text-white" aria-hidden="true" />}
                    iconBg="bg-gradient-to-br from-amber-400 to-orange-600"
                    title="Complete a course to earn your first certificate."
                    body="Certificates record the courses you have finished, with a code anyone can verify."
                  />
                ) : (
                  <CertificatesPanel
                    certificates={certificates}
                    limit={3}
                    onViewCertificate={(id) => router.push(`/learner/certificates?id=${id}`)}
                    onBrowseCourses={() => router.push('/learner/courses')}
                  />
                )}
              </section>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: ACHIEVEMENTS
           ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="achievements" className="m-0 space-y-6 animate-in fade-in duration-150">
          {/* Progress Banner */}
          <Card className="p-5 border-border bg-card rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs"
                aria-hidden="true"
              >
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Learning Badges &amp; Milestones</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Milestones unlock automatically as you learn. Track your progress across all 20 badges.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="font-bold text-foreground text-sm">
                  {unlocked.length} of {achievements.length} Unlocked
                </span>
                <span className="text-xs text-muted-foreground block">{unlockPct}% complete</span>
              </div>
              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${unlockPct}%` }}
                />
              </div>
            </div>
          </Card>

          {/* SECTION-BY-SECTION CATEGORY MODE (FOR PRESETS: ONE CATEGORY AT A TIME) */}
          {viewMode === 'sectioned' ? (
            <div className="space-y-5">
              {/* Category Step Navigator */}
              <div className="flex items-center justify-between gap-3 p-1.5 bg-muted rounded-2xl border border-border overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
                  {CATEGORY_ORDER.map((cat, idx) => {
                    const total = achievements.filter((a) => a.category === cat).length;
                    const count = achievements.filter((a) => a.category === cat && a.unlocked).length;
                    const isSelected = activeCategoryIndex === idx;

                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]} ({count}/{total})
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs text-muted-foreground font-medium px-2 shrink-0">
                  Category {activeCategoryIndex + 1} of {CATEGORY_ORDER.length}
                </span>
              </div>

              {/* Current Category Card & Badges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-base">
                      {CATEGORY_LABELS[currentCategory]} Badges ({unlockedInCurrentCategory}/{badgesInCurrentCategory.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORY_DESCRIPTIONS[currentCategory]}
                    </p>
                  </div>
                </div>

                {/* 5 Badges in Current Category */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
                  {badgesInCurrentCategory.map((a) => (
                    <li key={a.code} className="h-full">
                      <AchievementCard achievement={a} onSelect={setSelected} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Category Stepper Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeCategoryIndex === 0}
                  onClick={() => setActiveCategoryIndex(Math.max(0, activeCategoryIndex - 1))}
                  className="text-xs h-9 px-4 gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Category
                </Button>

                <span className="text-xs font-semibold text-muted-foreground">
                  {CATEGORY_LABELS[currentCategory]}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeCategoryIndex === CATEGORY_ORDER.length - 1}
                  onClick={() => setActiveCategoryIndex(Math.min(CATEGORY_ORDER.length - 1, activeCategoryIndex + 1))}
                  className="text-xs h-9 px-4 gap-1.5"
                >
                  Next Category <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* FULL STANDARD ACHIEVEMENTS VIEW */
            <div className="space-y-5">
              {/* Sub-Filters: Categories + Status + Search */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        categoryFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      All Categories (20)
                    </button>

                    {CATEGORY_ORDER.map((cat) => {
                      const totalInCat = achievements.filter((a) => a.category === cat).length;
                      const unlockedInCat = achievements.filter((a) => a.category === cat && a.unlocked).length;
                      const isSelected = categoryFilter === cat;

                      return (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {CATEGORY_LABELS[cat]} ({unlockedInCat}/{totalInCat})
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Toggles & Search */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center p-0.5 bg-muted rounded-xl border border-border text-xs">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          statusFilter === 'all'
                            ? 'bg-card font-bold text-foreground shadow-xs'
                            : 'text-muted-foreground'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setStatusFilter('unlocked')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          statusFilter === 'unlocked'
                            ? 'bg-card font-bold text-foreground shadow-xs'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Unlocked ({unlocked.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('locked')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          statusFilter === 'locked'
                            ? 'bg-card font-bold text-foreground shadow-xs'
                            : 'text-muted-foreground'
                        }`}
                      >
                        In Progress ({achievements.length - unlocked.length})
                      </button>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-44">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search badge..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Results Header */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>
                    Showing {filteredAchievements.length} of {achievements.length} achievement
                    {achievements.length === 1 ? '' : 's'}
                  </span>
                  {(categoryFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setCategoryFilter('all');
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>

              {/* Filtered Grid of Badges */}
              {filteredAchievements.length === 0 ? (
                <Card className="p-10 text-center border-dashed border-border bg-card rounded-2xl">
                  <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <h4 className="font-bold text-foreground text-sm">No badges match your filter</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Try selecting a different category or resetting your search.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCategoryFilter('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                  >
                    Reset Filters
                  </Button>
                </Card>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 list-none p-0 m-0">
                  {filteredAchievements.map((a) => (
                    <li key={a.code} className="h-full">
                      <AchievementCard achievement={a} onSelect={setSelected} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: CERTIFICATES
           ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="certificates" className="m-0 space-y-6 animate-in fade-in duration-150">
          <CertificatesPanel
            certificates={certificates}
            onViewCertificate={(id) => router.push(`/learner/certificates?id=${id}`)}
            onBrowseCourses={() => router.push('/learner/courses')}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Achievement Modal */}
      {selected && (
        <AchievementDetailDialog
          achievement={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const styles = {
    blue: 'bg-blue-50/50 border-blue-200/80 text-blue-900',
    green: 'bg-green-50/50 border-green-200/80 text-green-900',
    purple: 'bg-purple-50/50 border-purple-200/80 text-purple-900',
    amber: 'bg-amber-50/50 border-amber-200/80 text-amber-900',
  };

  return (
    <Card className={`p-4 rounded-2xl border ${styles[color]} shadow-xs`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80 block truncate">
        {label}
      </span>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value.toLocaleString()}</p>
    </Card>
  );
}

function NextUpRow({
  achievement,
  onSelect,
}: {
  achievement: ResolvedAchievement;
  onSelect: (a: ResolvedAchievement) => void;
}) {
  return (
    <div
      onClick={() => onSelect(achievement)}
      className="p-3 hover:bg-muted/50 transition-colors rounded-xl cursor-pointer flex items-center justify-between gap-3 text-xs"
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground truncate">{achievement.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{achievement.criteria}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="font-bold text-foreground">
            {achievement.current}/{achievement.threshold}
          </span>
          <span className="text-[10px] text-muted-foreground block">{achievement.progress_pct}%</span>
        </div>
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${achievement.progress_pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function EmptyNote({
  icon,
  iconBg,
  title,
  body,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-6 border-dashed border-border bg-card rounded-2xl text-center flex flex-col items-center">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-2 shadow-xs`}>
        {icon}
      </div>
      <h3 className="font-bold text-foreground text-xs">{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{body}</p>
    </Card>
  );
}
