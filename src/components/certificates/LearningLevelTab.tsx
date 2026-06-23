'use client';

import { useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, Star, Target, CheckCircle2, Lock, ArrowUpRight, BookOpen, GraduationCap, Percent, Award } from 'lucide-react';
import type { LearnerStats } from '@/lib/learner-api';

interface LearningLevelTabProps {
  stats: LearnerStats;
}

interface LevelRequirement {
  label: string;
  current: number;
  target: number;
  icon: React.ReactNode;
}

interface LevelDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  requirements: LevelRequirement[];
}

export function LearningLevelTab({ stats }: LearningLevelTabProps) {
  const levels = useMemo<LevelDef[]>(() => [
    {
      id: 'beginner',
      name: 'Beginner',
      description: 'You are just starting your learning journey. Complete some lessons to move up!',
      icon: <Star className="w-6 h-6" />,
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      requirements: [],
    },
    {
      id: 'intermediate',
      name: 'Intermediate',
      description: 'You have shown dedication and are building a solid foundation of knowledge.',
      icon: <Target className="w-6 h-6" />,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
      requirements: [
        { label: 'Lessons Completed', current: stats.lessons_completed, target: 5, icon: <BookOpen className="w-4 h-4" /> },
        { label: 'Courses Completed', current: stats.courses_completed, target: 1, icon: <GraduationCap className="w-4 h-4" /> },
      ],
    },
    {
      id: 'advanced',
      name: 'Advanced',
      description: 'You are tackling complex topics and earning real credentials.',
      icon: <Award className="w-6 h-6" />,
      color: 'text-purple-500',
      bg: 'bg-purple-100',
      requirements: [
        { label: 'Lessons Completed', current: stats.lessons_completed, target: 15, icon: <BookOpen className="w-4 h-4" /> },
        { label: 'Courses Completed', current: stats.courses_completed, target: 3, icon: <GraduationCap className="w-4 h-4" /> },
        { label: 'Certificates Earned', current: stats.certificates_count, target: 1, icon: <Trophy className="w-4 h-4" /> },
      ],
    },
    {
      id: 'expert',
      name: 'Expert',
      description: 'You have mastered multiple disciplines with flying colors.',
      icon: <Trophy className="w-6 h-6" />,
      color: 'text-amber-500',
      bg: 'bg-amber-100',
      requirements: [
        { label: 'Lessons Completed', current: stats.lessons_completed, target: 30, icon: <BookOpen className="w-4 h-4" /> },
        { label: 'Courses Completed', current: stats.courses_completed, target: 5, icon: <GraduationCap className="w-4 h-4" /> },
        { label: 'Certificates Earned', current: stats.certificates_count, target: 3, icon: <Trophy className="w-4 h-4" /> },
        { label: 'Average Quiz Score', current: Math.round(stats.avg_score), target: 80, icon: <Percent className="w-4 h-4" /> },
      ],
    },
  ], [stats]);

  // Calculate current level index
  const currentLevelIndex = useMemo(() => {
    let index = 0;
    for (let i = 1; i < levels.length; i++) {
      const level = levels[i];
      const isMet = level.requirements.every(req => req.current >= req.target);
      if (isMet) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [levels]);

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Overview Card */}
      <Card className="p-6 md:p-8 bg-white border border-gray-200 shadow-sm rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -z-10 opacity-50" />
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between z-10">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${currentLevel.bg} ${currentLevel.color} shrink-0`}>
              {currentLevel.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Level</p>
              <h2 className="text-3xl font-bold text-gray-900">{currentLevel.name}</h2>
              <p className="text-gray-600 mt-1 max-w-md">{currentLevel.description}</p>
            </div>
          </div>
          
          {nextLevel ? (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-w-[240px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Next: {nextLevel.name}</span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" 
                  style={{ 
                    width: `${Math.min(100, Math.max(0, 
                      nextLevel.requirements.reduce((acc, req) => acc + (Math.min(req.current, req.target) / req.target), 0) / nextLevel.requirements.length * 100
                    ))}%` 
                  }} 
                />
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 rounded-xl p-4 border border-amber-100 flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <p className="font-bold">Maximum Level Reached</p>
                <p className="text-sm opacity-90">You are a true master.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Vertical Timeline Roadmap */}
      <div className="relative pl-4 md:pl-8">
        {/* Continuous vertical line */}
        <div className="absolute left-8 md:left-12 top-8 bottom-8 w-1 bg-gray-200 rounded-full" />
        
        <div className="space-y-12">
          {levels.map((level, index) => {
            const isCompleted = index <= currentLevelIndex;
            const isCurrent = index === currentLevelIndex;
            const isNext = index === currentLevelIndex + 1;
            const isLocked = index > currentLevelIndex + 1;

            let statusColor = isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300';
            let cardClasses = isCompleted 
              ? 'border-green-100 bg-white shadow-sm' 
              : isCurrent 
                ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100 shadow-md transform scale-[1.02] transition-transform' 
                : 'border-gray-100 bg-gray-50 opacity-75';

            return (
              <div key={level.id} className="relative flex items-start gap-6 md:gap-10">
                {/* Node icon */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${statusColor} text-white transition-colors duration-500`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <Star className="w-4 h-4 fill-current" /> : <Lock className="w-4 h-4" />}
                </div>

                {/* Level Card */}
                <Card className={`flex-1 p-5 rounded-2xl border ${cardClasses} transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${level.bg} ${level.color}`}>
                        {level.icon}
                      </div>
                      <h3 className={`text-xl font-bold ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{level.name}</h3>
                    </div>
                    {isCompleted && index !== 0 && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Unlocked</Badge>
                    )}
                    {isCurrent && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Current Level</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{level.description}</p>

                  {/* Requirements section */}
                  {level.requirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100/80">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" /> 
                        Requirements to unlock
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {level.requirements.map((req, rIdx) => {
                          const reqCompleted = req.current >= req.target;
                          return (
                            <div key={rIdx} className={`flex flex-col p-3 rounded-xl border ${reqCompleted ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'} transition-colors`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  {req.icon}
                                  {req.label}
                                </div>
                                <span className={`text-xs font-bold ${reqCompleted ? 'text-green-700' : 'text-gray-500'}`}>
                                  {req.current >= req.target ? req.target : req.current} / {req.target}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-1.5 rounded-full ${reqCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, (req.current / req.target) * 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
