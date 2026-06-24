'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, Award, Lock, Star, Zap, BookOpen, Target, ScrollText, Shield } from 'lucide-react';
import { fetchLearnerStats } from '@/lib/learner-api';
import { computeXP, getLevelInfo } from '@/lib/level-system';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/useTranslation';

interface CourseAchievement {
  id: string;
  course_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  requirement_type: string;
  requirement_threshold: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
}

const TIER_COLORS: Record<string, { bg: string; ring: string; text: string; progress: string }> = {
  'Beginner':    { bg: 'from-slate-500 to-slate-600', ring: 'ring-slate-400', text: 'text-slate-600', progress: 'bg-slate-500' },
  'Apprentice':  { bg: 'from-blue-500 to-blue-600', ring: 'ring-blue-400', text: 'text-blue-600', progress: 'bg-blue-500' },
  'Explorer':    { bg: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-400', text: 'text-emerald-600', progress: 'bg-emerald-500' },
  'Scholar':     { bg: 'from-teal-500 to-teal-600', ring: 'ring-teal-400', text: 'text-teal-600', progress: 'bg-teal-500' },
  'Achiever':    { bg: 'from-violet-500 to-violet-600', ring: 'ring-violet-400', text: 'text-violet-600', progress: 'bg-violet-500' },
  'Advanced':    { bg: 'from-purple-500 to-purple-600', ring: 'ring-purple-400', text: 'text-purple-600', progress: 'bg-purple-500' },
  'Expert':      { bg: 'from-amber-500 to-amber-600', ring: 'ring-amber-400', text: 'text-amber-600', progress: 'bg-amber-500' },
  'Master':      { bg: 'from-rose-500 to-rose-600', ring: 'ring-rose-400', text: 'text-rose-600', progress: 'bg-rose-500' },
  'Grandmaster': { bg: 'from-red-600 to-red-700', ring: 'ring-red-500', text: 'text-red-600', progress: 'bg-red-600' },
  'Legend':      { bg: 'from-yellow-500 to-yellow-600', ring: 'ring-yellow-400', text: 'text-yellow-600', progress: 'bg-yellow-500' },
};

export default function AchievementsPage() {
  const { t } = useTranslation();
  const { settings } = useAccessibility();
  const [loading, setLoading] = useState(true);
  const [courseAchievements, setCourseAchievements] = useState<CourseAchievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [levelInfo, setLevelInfo] = useState<{ level: number; title: string; xp: number; xpToNext: number; xpForCurrent: number; progress: number } | null>(null);
  const [breakdown, setBreakdown] = useState({ lessonXP: 0, quizXP: 0, courseXP: 0, certXP: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const [stats] = await Promise.all([
        fetchLearnerStats(),
      ]);

      const totalXP = computeXP(stats);
      setLevelInfo(getLevelInfo(totalXP));
      setBreakdown({
        lessonXP: stats.lessons_completed * 100,
        quizXP: Math.round((stats.avg_score / 100) * stats.lessons_completed * 50),
        courseXP: stats.courses_completed * 500,
        certXP: stats.certificates_count * 200,
      });

      // Fetch enrollments to know which courses to fetch achievements for
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.user.id);

      const courseIds = enrollments?.map(e => e.course_id) || [];

      if (courseIds.length > 0) {
        const { data: caData } = await supabase
          .from('course_achievements')
          .select('*')
          .in('course_id', courseIds);
        setCourseAchievements(caData || []);
      }

      const { data: uaData } = await supabase
        .from('user_achievements')
        .select('id, achievement_id, earned_at')
        .eq('user_id', user.user.id);

      setUserAchievements(uaData || []);
    } catch (err) {
      console.error('Failed to load achievements', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const earned = courseAchievements.filter(ca => earnedIds.has(ca.id));
  const locked = courseAchievements.filter(ca => !earnedIds.has(ca.id));
  const colors = levelInfo && TIER_COLORS[levelInfo.title]
    ? TIER_COLORS[levelInfo.title]
    : TIER_COLORS['Beginner'];

  return (
    <div className="p-8 max-w-7xl mx-auto readable-content">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          {t('achievements.myAchievements')}
        </h1>
        <p className="text-gray-600 text-lg">
          {t('achievements.description')}
        </p>
      </div>

      {settings.chunked_content_mode ? (
        <Tabs defaultValue="level" className="space-y-6">
          <TabsList className="flex h-auto gap-2 p-1 bg-gray-100/50 rounded-xl w-full">
            <TabsTrigger value="level" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">{t('achievements.tabLevel')}</TabsTrigger>
            <TabsTrigger value="earned" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">{t('achievements.tabEarned', { count: earned.length })}</TabsTrigger>
            <TabsTrigger value="locked" className="flex-1 text-sm md:text-base py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">{t('achievements.tabLocked', { count: locked.length })}</TabsTrigger>
          </TabsList>
          <TabsContent value="level" className="m-0">
            {levelInfo && (
              <Card className="p-8 bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${colors.bg} ${colors.ring} ring-4 flex items-center justify-center shadow-lg`}>
                      <span className="text-3xl font-bold text-white">{levelInfo.level}</span>
                    </div>
                    <span className={`mt-2 text-sm font-bold ${colors.text}`}>{levelInfo.title}</span>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-gray-900">{levelInfo.xp.toLocaleString()} XP</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {t('achievements.toLevel', { progress: levelInfo.progress, level: levelInfo.level + 1 })}
                        <span className="text-xs ml-1">{t('achievements.xpNeeded', { xp: levelInfo.xpToNext.toLocaleString() })}</span>
                      </span>
                    </div>
                    <Progress value={levelInfo.progress} className={`h-3 ${colors.progress}`} />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <div><p className="text-xs text-gray-500 font-medium">{t('achievements.lessons')}</p><p className="text-sm font-bold text-gray-900">{breakdown.lessonXP.toLocaleString()} XP</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                    <Target className="w-5 h-5 text-emerald-600" />
                    <div><p className="text-xs text-gray-500 font-medium">{t('achievements.quizzes')}</p><p className="text-sm font-bold text-gray-900">{breakdown.quizXP.toLocaleString()} XP</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50">
                    <ScrollText className="w-5 h-5 text-violet-600" />
                    <div><p className="text-xs text-gray-500 font-medium">{t('achievements.courses')}</p><p className="text-sm font-bold text-gray-900">{breakdown.courseXP.toLocaleString()} XP</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <div><p className="text-xs text-gray-500 font-medium">{t('achievements.certificates')}</p><p className="text-sm font-bold text-gray-900">{breakdown.certXP.toLocaleString()} XP</p></div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="earned" className="m-0">
            {earned.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3 simplifiable" />
                <p className="text-gray-500 font-medium">{t('achievements.noBadges')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('achievements.noBadgesDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {earned.map(ach => {
                  const ua = userAchievements.find(u => u.achievement_id === ach.id);
                  return (
                    <Card key={ach.id} className="p-6 flex flex-col items-center text-center relative overflow-hidden group border-yellow-200 simplifiable bg-gradient-to-b from-white to-yellow-50/30">
                      <div className="absolute top-0 right-0 p-3 simplifiable">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="w-20 h-20 mb-4 rounded-full bg-yellow-100 flex items-center justify-center shadow-inner">
                        {ach.icon_url ? (
                          <img src={ach.icon_url} alt={ach.name} className="w-14 h-14 object-contain" />
                        ) : (
                          <Award className="w-10 h-10 text-yellow-600" />
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{ach.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{ach.description}</p>
                      <div className="mt-auto pt-4 border-t border-yellow-100 w-full">
                        <p className="text-xs font-medium text-yellow-700">
                          {t('achievements.earnedDate', { date: new Date(ua?.earned_at || '').toLocaleDateString() })}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="locked" className="m-0">
            {locked.length === 0 ? (
              <p className="text-gray-500 italic">{t('achievements.allUnlocked')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                {locked.map(ach => (
                  <Card key={ach.id} className="p-6 flex flex-col items-center text-center bg-gray-50 border-gray-200">
                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                      {ach.icon_url ? (
                        <img src={ach.icon_url} alt={ach.name} className="w-10 h-10 object-contain opacity-50" />
                      ) : (
                        <Award className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-2">{ach.name}</h3>
                    <p className="text-xs text-gray-500 mb-4">{ach.description}</p>
                    <div className="mt-auto pt-3 w-full">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {t('achievements.requires', { type: ach.requirement_type, threshold: ach.requirement_threshold })}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {levelInfo && (
            <Card className="p-8 mb-10 bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${colors.bg} ${colors.ring} ring-4 flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl font-bold text-white">{levelInfo.level}</span>
                  </div>
                  <span className={`mt-2 text-sm font-bold ${colors.text}`}>{levelInfo.title}</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900">{levelInfo.xp.toLocaleString()} XP</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {levelInfo.progress}% to Level {levelInfo.level + 1}
                      <span className="text-xs ml-1">({levelInfo.xpToNext.toLocaleString()} XP needed)</span>
                    </span>
                  </div>
                  <Progress value={levelInfo.progress} className={`h-3 ${colors.progress}`} />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div><p className="text-xs text-gray-500 font-medium">{t('achievements.lessons')}</p><p className="text-sm font-bold text-gray-900">{breakdown.lessonXP.toLocaleString()} XP</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <div><p className="text-xs text-gray-500 font-medium">{t('achievements.quizzes')}</p><p className="text-sm font-bold text-gray-900">{breakdown.quizXP.toLocaleString()} XP</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50">
                  <ScrollText className="w-5 h-5 text-violet-600" />
                  <div><p className="text-xs text-gray-500 font-medium">{t('achievements.courses')}</p><p className="text-sm font-bold text-gray-900">{breakdown.courseXP.toLocaleString()} XP</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <div><p className="text-xs text-gray-500 font-medium">{t('achievements.certificates')}</p><p className="text-sm font-bold text-gray-900">{breakdown.certXP.toLocaleString()} XP</p></div>
                </div>
              </div>
            </Card>
          )}

          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> {t('achievements.earnedBadges', { count: earned.length })}
            </h2>
            {earned.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3 simplifiable" />
                <p className="text-gray-500 font-medium">{t('achievements.noBadges')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('achievements.noBadgesDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {earned.map(ach => {
                  const ua = userAchievements.find(u => u.achievement_id === ach.id);
                  return (
                    <Card key={ach.id} className="p-6 flex flex-col items-center text-center relative overflow-hidden group border-yellow-200 simplifiable bg-gradient-to-b from-white to-yellow-50/30">
                      <div className="absolute top-0 right-0 p-3 simplifiable">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="w-20 h-20 mb-4 rounded-full bg-yellow-100 flex items-center justify-center shadow-inner">
                        {ach.icon_url ? (
                          <img src={ach.icon_url} alt={ach.name} className="w-14 h-14 object-contain" />
                        ) : (
                          <Award className="w-10 h-10 text-yellow-600" />
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{ach.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{ach.description}</p>
                      <div className="mt-auto pt-4 border-t border-yellow-100 w-full">
                        <p className="text-xs font-medium text-yellow-700">
                          {t('achievements.earnedDate', { date: new Date(ua?.earned_at || '').toLocaleDateString() })}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" /> {t('achievements.lockedBadges', { count: locked.length })}
            </h2>
            {locked.length === 0 ? (
              <p className="text-gray-500 italic">{t('achievements.allUnlocked')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                {locked.map(ach => (
                  <Card key={ach.id} className="p-6 flex flex-col items-center text-center bg-gray-50 border-gray-200">
                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                      {ach.icon_url ? (
                        <img src={ach.icon_url} alt={ach.name} className="w-10 h-10 object-contain opacity-50" />
                      ) : (
                        <Award className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-2">{ach.name}</h3>
                    <p className="text-xs text-gray-500 mb-4">{ach.description}</p>
                    <div className="mt-auto pt-3 w-full">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {t('achievements.requires', { type: ach.requirement_type, threshold: ach.requirement_threshold })}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
