'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Settings,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchEducatorLeaderboard,
  setRankingParticipation,
  type LeaderboardResponse,
  type PerformanceTier,
} from '@/lib/educator-ranking-api';
import { EducatorProfileDetailModal } from './EducatorProfileDetailModal';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { toast } from 'sonner';

function TierPill({ tier }: { tier: PerformanceTier }) {
  const map: Record<PerformanceTier, { label: string; bg: string; text: string; border: string }> = {
    platinum: { label: 'Platinum', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    gold: { label: 'Gold', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    silver: { label: 'Silver', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    bronze: { label: 'Bronze', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };
  const t = map[tier] || map.bronze;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${t.bg} ${t.text} ${t.border}`}>
      {t.label}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold shadow-xs">
        🥇 1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold shadow-xs">
        🥈 2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-800 font-bold shadow-xs">
        🥉 3
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs">
      #{rank}
    </div>
  );
}

export function EducatorRankingPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rank');

  // Modals
  const [selectedEducatorId, setSelectedEducatorId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchEducatorLeaderboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load educator ranking:', err);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReEnableParticipation = async () => {
    try {
      await setRankingParticipation(true);
      toast.success('You have joined the Educator Ranking leaderboard!');
      await loadData(true);
    } catch {
      toast.error('Failed to update participation setting');
    }
  };

  const handleOpenEducatorModal = (educatorId: string) => {
    setSelectedEducatorId(educatorId);
    setProfileModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-medium text-gray-500">Calculating educator rankings and performance metrics...</p>
      </div>
    );
  }

  const currentEducator = data?.currentEducator;
  const isParticipating = data?.isParticipating ?? true;

  // Filter and sort leaderboard
  const filteredLeaderboard = (data?.leaderboard || [])
    .filter((entry) => {
      const matchesSearch =
        entry.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || entry.tier === tierFilter;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      if (sortBy === 'completion') return b.completionRate - a.completionRate;
      if (sortBy === 'students') return b.totalStudents - a.totalStudents;
      if (sortBy === 'courses') return b.coursesCreated - a.coursesCreated;
      if (sortBy === 'positive') return b.scoreBreakdown.positiveProgressRate - a.scoreBreakdown.positiveProgressRate;
      return a.rank - b.rank;
    });

  const topThree = (data?.leaderboard || []).slice(0, 3);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              Educator Ranking & Performance
            </h1>
            <span className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <Trophy className="w-5 h-5" />
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Compare teaching impact, student course completion, and positive engagement across the ACESS educator community.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="rounded-xl text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl text-xs font-semibold"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Ranking Settings
          </Button>
        </div>
      </div>

      {/* Opt-out Alert Banner (if educator has disabled ranking participation) */}
      {!isParticipating && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">You are currently hidden from the Public Leaderboard</h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Your performance metrics are calculated privately for your own review. Other educators cannot view your ranking profile.
              </p>
            </div>
          </div>
          <Button
            onClick={handleReEnableParticipation}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Enable Participation
          </Button>
        </div>
      )}

      {/* Hero: Current Educator's Standing Spotlight */}
      {currentEducator && (
        <div className="bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 rounded-3xl text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Overall Standing Summary */}
            <div className="lg:col-span-4 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-xs text-purple-200 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Your Teaching Standing</span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-amber-200">
                  #{currentEducator.rank || 1}
                </span>
                <span className="text-sm text-gray-300 font-medium">
                  of {data?.totalParticipating || 1} participating educators
                </span>
              </div>

              <div className="flex items-center gap-3">
                <TierPill tier={currentEducator.tier} />
                <span className="text-xs text-purple-200 font-medium">
                  Overall Score: <strong className="text-white text-sm">{currentEducator.overallScore}</strong> / 100
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Rankings balance student outcomes, course quality, completion rates, and active retention rather than raw volume alone.
              </p>

              <Button
                size="sm"
                onClick={() => handleOpenEducatorModal(currentEducator.educatorId)}
                className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold shadow-md"
              >
                Inspect My Full Report <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {/* Middle: 5-Indicator Breakdown */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Metric 1: Course Completion */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <GraduationCap className="w-4 h-4 text-emerald-400" /> Course Completion Rate
                  </span>
                  <span className="text-emerald-300 font-bold">{currentEducator.scoreBreakdown.completionPoints} / 30 pts</span>
                </div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-bold text-white">{currentEducator.completionRate}%</span>
                  <span className="text-[11px] text-gray-300">Platform avg: {data?.platformAverages.avgCompletionRate}%</span>
                </div>
                <Progress value={currentEducator.completionRate} className="h-1.5 bg-white/10" />
              </div>

              {/* Metric 2: Positive Student Progress */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> Positive Student Status
                  </span>
                  <span className="text-blue-300 font-bold">{currentEducator.scoreBreakdown.positiveProgressPoints} / 30 pts</span>
                </div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-bold text-white">{currentEducator.scoreBreakdown.positiveProgressRate}%</span>
                  <span className="text-[11px] text-gray-300">{currentEducator.positiveStudentsCount} of {currentEducator.totalStudents} learners</span>
                </div>
                <Progress value={currentEducator.scoreBreakdown.positiveProgressRate} className="h-1.5 bg-white/10" />
              </div>

              {/* Metric 3: Course Catalog Quality */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <BookOpen className="w-4 h-4 text-indigo-400" /> Catalog Quality & Depth
                  </span>
                  <span className="text-indigo-300 font-bold">{currentEducator.scoreBreakdown.courseCatalogPoints} / 20 pts</span>
                </div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-bold text-white">{currentEducator.coursesCreated} Published</span>
                  <span className="text-[11px] text-gray-300">Catalog Depth Score</span>
                </div>
                <Progress value={(currentEducator.scoreBreakdown.courseCatalogPoints / 20) * 100} className="h-1.5 bg-white/10" />
              </div>

              {/* Metric 4: Risk Mitigation & Retention */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-purple-400" /> Retention & Risk Mitigation
                  </span>
                  <span className="text-purple-300 font-bold">{currentEducator.scoreBreakdown.retentionPoints} / 10 pts</span>
                </div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-bold text-white">{currentEducator.scoreBreakdown.retentionRate}%</span>
                  <span className="text-[11px] text-gray-300">{currentEducator.atRiskStudentsCount} at-risk</span>
                </div>
                <Progress value={currentEducator.scoreBreakdown.retentionRate} className="h-1.5 bg-white/10" />
              </div>
            </div>
          </div>

          {/* Motivational Recommendations Strip */}
          {data?.motivationalTips && data.motivationalTips.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Recommended Steps to Boost Your Rank
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.motivationalTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-white">{tip.title}</p>
                        <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                          +{tip.potentialPoints} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{tip.description}</p>
                    </div>
                    {tip.actionPath && (
                      <button
                        onClick={() => router.push(tip.actionPath!)}
                        className="mt-3 text-[11px] font-bold text-purple-300 hover:text-white flex items-center gap-1 transition-colors self-start"
                      >
                        {tip.actionLabel || 'Take Action'} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-500" /> Top Performing Educators
            </h2>
            <span className="text-xs text-gray-500">Platform Leaders</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((entry, idx) => {
              const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              const podiumBorder =
                idx === 0
                  ? 'border-amber-300 bg-gradient-to-b from-amber-50/70 to-white ring-2 ring-amber-400/30'
                  : idx === 1
                  ? 'border-slate-300 bg-gradient-to-b from-slate-50/70 to-white'
                  : 'border-orange-300 bg-gradient-to-b from-orange-50/70 to-white';

              return (
                <Card
                  key={entry.educatorId}
                  className={`p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${podiumBorder}`}
                  onClick={() => handleOpenEducatorModal(entry.educatorId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold overflow-hidden shadow-sm">
                          {entry.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.avatarUrl} alt={entry.fullName} className="w-full h-full object-cover" />
                          ) : (
                            entry.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-sm">{medalEmoji}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-gray-900 truncate max-w-[140px]">{entry.fullName}</p>
                          {entry.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">You</span>
                          )}
                        </div>
                        <TierPill tier={entry.tier} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">{entry.overallScore}</p>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center text-xs">
                    <div>
                      <p className="font-bold text-gray-800">{entry.coursesCreated}</p>
                      <p className="text-[10px] text-gray-500">Courses</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-600">{entry.completionRate}%</p>
                      <p className="text-[10px] text-gray-500">Completion</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">{entry.totalStudents}</p>
                      <p className="text-[10px] text-gray-500">Students</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Community Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-gray-900">Educator Leaderboard</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any educator to inspect their courses and aggregated student engagement
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search educators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl min-w-[120px]">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="platinum">Platinum Tier</SelectItem>
                <SelectItem value="gold">Gold Tier</SelectItem>
                <SelectItem value="silver">Silver Tier</SelectItem>
                <SelectItem value="bronze">Bronze Tier</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 text-xs rounded-xl min-w-[130px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Sort by Rank</SelectItem>
                <SelectItem value="completion">Sort by Completion</SelectItem>
                <SelectItem value="positive">Sort by Engagement</SelectItem>
                <SelectItem value="students">Sort by Students</SelectItem>
                <SelectItem value="courses">Sort by Courses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Body */}
        {filteredLeaderboard.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No educators found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Educator</th>
                  <th className="py-3.5 px-4">Tier</th>
                  <th className="py-3.5 px-4 text-center">Courses</th>
                  <th className="py-3.5 px-4 text-center">Students</th>
                  <th className="py-3.5 px-4">Completion Rate</th>
                  <th className="py-3.5 px-4">Positive Progress</th>
                  <th className="py-3.5 px-4 text-right">Overall Score</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaderboard.map((entry) => (
                  <tr
                    key={entry.educatorId}
                    onClick={() => handleOpenEducatorModal(entry.educatorId)}
                    className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${
                      entry.isCurrentUser ? 'bg-purple-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center">
                        <RankBadge rank={entry.rank} />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-xs">
                          {entry.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.avatarUrl} alt={entry.fullName} className="w-full h-full object-cover" />
                          ) : (
                            entry.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs">{entry.fullName}</span>
                            {entry.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-600 text-white">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">{entry.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <TierPill tier={entry.tier} />
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                      {entry.coursesCreated}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                      {entry.totalStudents}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={entry.completionRate} className="w-16 h-1.5 bg-gray-100" />
                        <span className="font-bold text-emerald-600 text-xs">{entry.completionRate}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={entry.scoreBreakdown.positiveProgressRate} className="w-16 h-1.5 bg-gray-100" />
                        <span className="font-bold text-blue-600 text-xs">{entry.scoreBreakdown.positiveProgressRate}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-base font-black text-gray-900">{entry.overallScore}</span>
                      <span className="text-[10px] text-gray-400 block font-normal">pts</span>
                    </td>

                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEducatorModal(entry.educatorId)}
                        className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg h-8 px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <EducatorProfileDetailModal
        educatorId={selectedEducatorId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />

      <ProfileDialog
        open={settingsOpen}
        onOpenChange={(v) => {
          setSettingsOpen(v);
          if (!v) loadData(true);
        }}
      />
    </div>
  );
}
