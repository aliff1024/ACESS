'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  Calendar,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  fetchEducatorDetailForRanking,
  type EducatorDetailForRanking,
  type EducatorRankingCourse,
} from '@/lib/educator-ranking-api';
import { useRouter } from 'next/navigation';

interface EducatorProfileDetailModalProps {
  educatorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; bg: string; text: string; border: string }> = {
    platinum: { label: 'Platinum Tier', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    gold: { label: 'Gold Tier', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    silver: { label: 'Silver Tier', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    bronze: { label: 'Bronze Tier', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };
  const t = map[tier] || map.bronze;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${t.bg} ${t.text} ${t.border}`}>
      {t.label}
    </span>
  );
}

function StudentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    'at-risk': { label: 'At Risk', variant: 'destructive' },
    inactive: { label: 'Inactive', variant: 'secondary' },
    completed: { label: 'Completed', variant: 'default' },
    dropped: { label: 'Dropped', variant: 'secondary' },
  };
  const s = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function EducatorProfileDetailModal({
  educatorId,
  open,
  onOpenChange,
}: EducatorProfileDetailModalProps) {
  const router = useRouter();
  const [data, setData] = useState<EducatorDetailForRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<EducatorRankingCourse | null>(null);

  useEffect(() => {
    if (!open || !educatorId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setSelectedCourse(null);

    fetchEducatorDetailForRanking(educatorId)
      .then((res) => {
        setData(res);
        if (res.courses.length > 0) {
          setSelectedCourse(res.courses[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load educator detail:', err);
        setError(err.message || 'Unable to load educator details');
      })
      .finally(() => setLoading(false));
  }, [open, educatorId]);

  const initials =
    data?.educator.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'ED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Modal Header Strip */}
        <div className="p-6 bg-gradient-to-r from-gray-900 via-purple-950 to-indigo-950 text-white relative">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg ring-2 ring-white/20 overflow-hidden shrink-0">
                  {data?.educator.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.educator.avatarUrl}
                      alt={data.educator.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl font-bold text-white">
                      {data?.educator.fullName || 'Educator Profile'}
                    </DialogTitle>
                    {data && <TierBadge tier={data.educator.tier} />}
                    {data?.educator.isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white">
                        You
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-gray-300 text-xs mt-1 max-w-xl line-clamp-2">
                    {data?.educator.bio || 'Educator at ACESS Platform'}
                  </DialogDescription>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Joined {data ? new Date(data.educator.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '...'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Rank #{data?.educator.rank || '-'} &bull; {data?.educator.overallScore || 0} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-xs text-gray-500 font-medium">Loading educator details and course insights...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-red-500 space-y-2">
              <AlertCircle className="w-8 h-8" />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* 5-Indicator Performance Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 font-medium">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Overall Score
                  </div>
                  <p className="text-xl font-bold text-gray-900">{data.educator.overallScore}<span className="text-xs text-gray-400 font-normal"> / 100</span></p>
                  <Progress value={data.educator.overallScore} className="h-1.5 mt-2 bg-amber-100" />
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Courses
                  </div>
                  <p className="text-xl font-bold text-gray-900">{data.educator.coursesCreated}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{data.courses.reduce((s, c) => s + c.lessonCount, 0)} total lessons</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Total Students
                  </div>
                  <p className="text-xl font-bold text-gray-900">{data.educator.totalStudents}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">{data.educator.positiveStudentsCount} positive</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 font-medium">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> Completion Rate
                  </div>
                  <p className="text-xl font-bold text-gray-900">{data.educator.completionRate}%</p>
                  <Progress value={data.educator.completionRate} className="h-1.5 mt-2 bg-emerald-100" />
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Retention Rate
                  </div>
                  <p className="text-xl font-bold text-gray-900">{data.educator.scoreBreakdown.retentionRate}%</p>
                  <p className="text-[11px] text-gray-400 mt-1">{data.educator.atRiskStudentsCount} at-risk</p>
                </div>
              </div>

              {/* Earned Badges */}
              {data.educator.badges.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Teaching Milestones & Badges</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {data.educator.badges.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-50/80 border border-purple-100 rounded-xl"
                        title={b.description}
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-purple-950">{b.label}</p>
                          <p className="text-[10px] text-purple-700">{b.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Courses & Student Information Section */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Published Courses ({data.courses.length})</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Explore course structure and authorized student progress
                    </p>
                  </div>
                  {!data.canViewStudentPii && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Privacy Protected (Aggregated Student Metrics)</span>
                    </div>
                  )}
                </div>

                {data.courses.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No published courses available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    {/* Course List Column */}
                    <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                      {data.courses.map((course) => {
                        const isSelected = selectedCourse?.id === course.id;
                        return (
                          <button
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className={`w-full text-left p-3 rounded-xl transition-all border ${
                              isSelected
                                ? 'bg-purple-50/70 border-purple-200 shadow-xs ring-1 ring-purple-400/20'
                                : 'bg-white border-gray-200/80 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                                {course.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                ) : (
                                  <BookOpen className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-gray-900 truncate">{course.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                                  <span>{course.lessonCount} lessons</span>
                                  <span>&bull;</span>
                                  <span>{course.studentCount} students</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Course Details & Student Insights */}
                    <div className="md:col-span-2 p-5 space-y-4">
                      {selectedCourse ? (
                        <>
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-bold text-base text-gray-900">{selectedCourse.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {selectedCourse.category && (
                                    <Badge variant="outline" className="text-[10px]">{selectedCourse.category}</Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10px]">{selectedCourse.difficultyLevel}</Badge>
                                </div>
                              </div>
                              {selectedCourse.isOwner && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    onOpenChange(false);
                                    router.push(`/educator/courses/${selectedCourse.id}`);
                                  }}
                                  className="text-xs shrink-0"
                                >
                                  Edit Course <ExternalLink className="w-3 h-3 ml-1.5" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {selectedCourse.description || 'No description provided.'}
                            </p>
                          </div>

                          {/* Course Metric Highlights */}
                          <div className="grid grid-cols-3 gap-2.5 pt-1">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <p className="text-[11px] font-semibold text-gray-500">Enrolled Learners</p>
                              <p className="text-base font-bold text-gray-900 mt-0.5">{selectedCourse.studentCount}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <p className="text-[11px] font-semibold text-gray-500">Avg Completion</p>
                              <p className="text-base font-bold text-emerald-600 mt-0.5">{selectedCourse.completionRate}%</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <p className="text-[11px] font-semibold text-gray-500">Positive Status</p>
                              <p className="text-base font-bold text-blue-600 mt-0.5">{selectedCourse.positiveStatusRate}%</p>
                            </div>
                          </div>

                          {/* Student Information Section */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                {selectedCourse.isOwner ? 'Enrolled Student Roster' : 'Cohort Engagement Information'}
                              </h5>
                              <span className="text-[11px] text-gray-400">
                                {selectedCourse.isOwner ? 'Full Access' : 'Authorized Public Summary'}
                              </span>
                            </div>

                            {selectedCourse.isOwner && selectedCourse.students ? (
                              selectedCourse.students.length === 0 ? (
                                <p className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded-xl">No students enrolled yet.</p>
                              ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                      <tr>
                                        <th className="py-2 px-3">Student</th>
                                        <th className="py-2 px-3">Progress</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Completed</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {selectedCourse.students.map((st) => (
                                        <tr key={st.id} className="hover:bg-gray-50/60">
                                          <td className="py-2 px-3">
                                            <p className="font-semibold text-gray-900">{st.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{st.email}</p>
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                              <Progress value={st.progress} className="w-16 h-1.5" />
                                              <span className="text-[11px] font-medium">{st.progress}%</span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3">
                                            <StudentStatusBadge status={st.status} />
                                          </td>
                                          <td className="py-2 px-3 text-gray-500 text-[11px]">
                                            {st.completedLessons} / {st.totalLessons}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            ) : (
                              // Authorized aggregate summary for peer courses
                              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-gray-600 space-y-2">
                                <div className="flex items-center gap-2 text-purple-900 font-semibold">
                                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                                  Authorized Course Metrics
                                </div>
                                <p className="text-gray-600 leading-relaxed text-[11px]">
                                  This course has an active cohort of <strong className="text-gray-900">{selectedCourse.studentCount} enrolled students</strong> with an average completion progress of <strong className="text-gray-900">{selectedCourse.completionRate}%</strong>.
                                  {selectedCourse.positiveStatusRate >= 70 ? ' The majority of learners maintain strong active progress.' : ' Engagement is monitored across lesson checkpoints.'}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Personal student names and contact info are restricted to the course educator in compliance with platform privacy policies.
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-gray-400 text-xs">
                          Select a course on the left to view details
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
