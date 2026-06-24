'use client';

import { useState, useEffect } from 'react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  BarChart3, Users, TrendingUp, BookOpen,
  AlertCircle, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  fetchCourseDetailData, CourseDetailData
} from '@/lib/educator-analytics-api';

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function DaysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function StudentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    'at-risk': { label: 'At Risk', variant: 'destructive' },
    inactive: { label: 'Inactive', variant: 'secondary' }
  };
  const s = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function CourseDetailDialog({
  courseId,
  educatorId,
  open,
  onOpenChange
}: {
  courseId: string;
  educatorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !courseId) return;
    queueMicrotask(() => { setLoading(true); setError(null); });
    fetchCourseDetailData(courseId, educatorId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId, educatorId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {data ? (
          <DialogHeader className="p-6 pb-2 border-b border-gray-100">
            <DialogTitle className="text-xl">{data.title}</DialogTitle>
            <DialogDescription>
              {data.students.length} enrolled &middot; {data.lessons.length} lessons &middot; {data.timeline.length} days of activity
            </DialogDescription>
          </DialogHeader>
        ) : (
          <VisuallyHidden.Root>
            <DialogTitle>Course Detail</DialogTitle>
          </VisuallyHidden.Root>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <p className="text-gray-500">Loading course detail...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center flex-1 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        ) : data ? (
          <Tabs defaultValue="lessons" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 border-b border-gray-100">
              <TabsList>
                <TabsTrigger value="lessons">
                  <BarChart3 className="w-4 h-4" /> Lessons
                </TabsTrigger>
                <TabsTrigger value="students">
                  <Users className="w-4 h-4" /> Students
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <TrendingUp className="w-4 h-4" /> Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="lessons" className="h-full m-0">
                <ScrollArea className="h-full p-6 pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Lesson</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Completed</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Skipped</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Avg Time</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Quiz</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lessons.map((lesson, i) => (
                        <tr key={lesson.lessonId} className={i < data.lessons.length - 1 ? 'border-b border-gray-100' : ''}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="font-medium text-gray-900">{lesson.title}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {lesson.completedCount}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> {lesson.skippedCount}
                            </span>
                          </td>
                          <td className="py-3 text-center text-gray-600">{formatTime(lesson.avgTimeSpentSeconds)}</td>
                          <td className="py-3 text-center text-gray-600 max-w-[140px] truncate">{lesson.quizTitle || '—'}</td>
                          <td className="py-3 text-center">
                            {lesson.avgQuizScore !== null ? (
                              <span className={`font-semibold ${lesson.avgQuizScore >= 70 ? 'text-green-700' : lesson.avgQuizScore >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                                {lesson.avgQuizScore}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.lessons.length === 0 && (
                    <p className="text-center text-gray-400 py-12">No lessons found.</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="students" className="h-full m-0">
                <ScrollArea className="h-full p-6 pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs">Student</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Progress</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Lessons Done</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Avg Quiz</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Last Active</th>
                        <th className="pb-3 font-semibold text-gray-500 uppercase tracking-wider text-xs text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((s, i) => (
                        <tr key={s.enrollmentId} className={i < data.students.length - 1 ? 'border-b border-gray-100' : ''}>
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium text-gray-900">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="font-semibold text-gray-900">{s.progress}%</span>
                          </td>
                          <td className="py-3 text-center text-gray-600">
                            {s.completedLessons}/{s.totalLessons}
                          </td>
                          <td className="py-3 text-center">
                            {s.avgQuizScore > 0 ? (
                              <span className={`font-semibold ${s.avgQuizScore >= 70 ? 'text-green-700' : s.avgQuizScore >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                                {s.avgQuizScore}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-center text-gray-600 text-xs">{DaysAgo(s.lastActive)}</td>
                          <td className="py-3 text-center">
                            <StudentStatusBadge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.students.length === 0 && (
                    <p className="text-center text-gray-400 py-12">No enrollments found.</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="timeline" className="h-full m-0">
                <ScrollArea className="h-full p-6 pt-4">
                  {data.timeline.length === 0 ? (
                    <p className="text-center text-gray-400 py-12">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {data.timeline.map(bucket => {
                        const total = bucket.lessonViews + bucket.quizAttempts;
                        const maxInView = Math.max(...data.timeline.map(t => t.lessonViews + t.quizAttempts), 1);
                        return (
                          <div key={bucket.date} className="flex items-center gap-3 py-1.5">
                            <span className="text-xs text-gray-500 w-24 shrink-0 font-mono">{bucket.date}</span>
                            <div className="flex-1 flex gap-1 h-6 items-center">
                              <div
                                className="h-4 rounded bg-purple-500 transition-all"
                                style={{ width: `${(bucket.lessonViews / maxInView) * 100}%`, minWidth: bucket.lessonViews > 0 ? '4px' : 0 }}
                                title={`${bucket.lessonViews} lesson views`}
                              />
                              <div
                                className="h-4 rounded bg-orange-400 transition-all"
                                style={{ width: `${(bucket.quizAttempts / maxInView) * 100}%`, minWidth: bucket.quizAttempts > 0 ? '4px' : 0 }}
                                title={`${bucket.quizAttempts} quiz attempts`}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right shrink-0">{total}</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-4 pt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> Lesson views</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Quiz attempts</span>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
