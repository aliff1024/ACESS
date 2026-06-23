'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Loader2, Trophy, Award, Lock, Star } from 'lucide-react';
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

export default function AchievementsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [courseAchievements, setCourseAchievements] = useState<CourseAchievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch enrollments to know which courses to fetch achievements for
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.user.id);
        
      const courseIds = enrollments?.map(e => e.course_id) || [];

      if (courseIds.length > 0) {
        // Fetch all potential achievements
        const { data: caData } = await supabase
          .from('course_achievements')
          .select('*')
          .in('course_id', courseIds);
        setCourseAchievements(caData || []);
      }

      // Fetch earned achievements
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" /> 
          Achievement Center
        </h1>
        <p className="text-gray-600 text-lg">
          Track your progress, earn badges, and showcase your learning milestones.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" /> Earned Badges ({earned.length})
        </h2>
        {earned.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No badges earned yet</p>
            <p className="text-sm text-gray-400 mt-1">Keep learning to unlock your first achievement!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {earned.map(ach => {
              const ua = userAchievements.find(u => u.achievement_id === ach.id);
              return (
                <Card key={ach.id} className="p-6 flex flex-col items-center text-center relative overflow-hidden group border-yellow-200 bg-gradient-to-b from-white to-yellow-50/30">
                  <div className="absolute top-0 right-0 p-3">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="w-20 h-20 mb-4 rounded-full bg-yellow-100 flex items-center justify-center shadow-inner">
                    {ach.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ach.icon_url} alt={ach.name} className="w-14 h-14 object-contain" />
                    ) : (
                      <Award className="w-10 h-10 text-yellow-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{ach.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{ach.description}</p>
                  <div className="mt-auto pt-4 border-t border-yellow-100 w-full">
                    <p className="text-xs font-medium text-yellow-700">
                      Earned {new Date(ua?.earned_at || '').toLocaleDateString()}
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
          <Lock className="w-5 h-5 text-gray-400" /> Locked Badges ({locked.length})
        </h2>
        {locked.length === 0 ? (
          <p className="text-gray-500 italic">You have unlocked all available badges! Great job.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            {locked.map(ach => (
              <Card key={ach.id} className="p-6 flex flex-col items-center text-center bg-gray-50 border-gray-200">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                  {ach.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ach.icon_url} alt={ach.name} className="w-10 h-10 object-contain opacity-50" />
                  ) : (
                    <Award className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">{ach.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{ach.description}</p>
                <div className="mt-auto pt-3 w-full">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    Requires: {ach.requirement_type} {ach.requirement_threshold}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
