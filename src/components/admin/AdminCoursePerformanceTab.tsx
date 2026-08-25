'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import type { CoursePerformance, LessonFunnelRow } from '@/lib/admin-analytics';
import { formatDuration, formatRelative, labelAdaptation } from '@/lib/admin-analytics';
import { BarList, DataNote, Panel } from './analytics/AdminAnalyticsUI';

interface PerformancePayload {
  performance: CoursePerformance | undefined;
  lessons: LessonFunnelRow[];
  accessibility: {
    course: {
      supportsTts: boolean;
      supportsTranscripts: boolean;
      supportsFocusMode: boolean;
      supportsChunkedLearning: boolean;
      primaryDisabilityFocus: string | null;
      categories: string[];
    };
    lessons: {
      total: number;
      published: number;
      focusMode: number;
      chunkedContent: number;
      simplifiedSummary: number;
      transcriptText: number;
      withVideo: number;
      withPdf: number;
      withQuiz: number;
    };
  };
  adaptations: { type: string; events: number }[];
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function AdminCoursePerformanceTab({ courseId }: { courseId: string }) {
  const [data, setData] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State is set only from the fetch callbacks. `loading` starts true and the
  // workspace keys this tab by course id, so a different course mounts a fresh
  // instance rather than needing a synchronous reset inside the effect.
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/courses/${courseId}/performance`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load performance');
        return body as PerformancePayload;
      })
      .then(setData)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <span className="sr-only">Loading course performance</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-900">Could not load performance data</p>
        {error && <p className="mt-1 text-sm text-red-800">{error}</p>}
      </div>
    );
  }

  const perf = data.performance;
  const a11y = data.accessibility;
  const dropOffIndex = data.lessons.findIndex((l) => l.isDropOffPoint);
  const dropOff = dropOffIndex >= 0 ? data.lessons[dropOffIndex] : undefined;
  const beforeDropOff = dropOffIndex > 0 ? data.lessons[dropOffIndex - 1] : undefined;
  const hasLearners = (perf?.enrollments ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* ─── Reach and outcomes ──────────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-base font-bold text-gray-900">Reach and outcomes</h3>
        <p className="mb-4 text-sm text-gray-500">
          How many learners took this course, and how far they got.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat
            label="Enrolled"
            value={perf?.enrollments ?? 0}
            hint={`${perf?.activeEnrollments ?? 0} still active`}
          />
          <Stat
            label="Marked complete"
            value={perf?.markedComplete ?? 0}
            hint={`${perf?.markedCompleteRate ?? 0}% of enrollments`}
          />
          <Stat
            label="Finished all lessons"
            value={perf?.fullyProgressed ?? 0}
            hint="Derived from lesson progress"
          />
          <Stat label="Average progress" value={`${perf?.averageProgress ?? 0}%`} />
          <Stat
            label="Learning time"
            value={formatDuration(perf?.learningSeconds ?? 0)}
            hint={`Last activity ${formatRelative(perf?.lastActivity).toLowerCase()}`}
          />
        </div>
        {(perf?.markedComplete ?? 0) > 0 && (perf?.fullyProgressed ?? 0) === 0 && (
          <DataNote>
            Learners are marked complete on the enrollment record, but none has finished every
            published lesson. The two are separate measures and are reported separately.
          </DataNote>
        )}
      </section>

      {/* ─── Lesson funnel ───────────────────────────────────────────── */}
      <Panel
        title="Lesson funnel"
        question="Where do learners stop?"
        isEmpty={data.lessons.length === 0}
        emptyMessage="This course has no lessons yet."
      >
        {!hasLearners ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <p className="text-sm text-gray-600">
              No learner has enrolled in this course, so there is no funnel to show.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {data.lessons.length} lessons are ready and waiting.
            </p>
          </div>
        ) : (
          <>
            {dropOff && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <TrendingDown className="mt-0.5 h-5 w-5 flex-none text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Biggest drop-off at lesson {dropOff.sequenceOrder}: {dropOff.title}
                  </p>
                  <p className="text-sm text-amber-800">
                    {beforeDropOff
                      ? `${beforeDropOff.learnersStarted} learners opened the previous lesson; ${dropOff.learnersStarted} reached this one — a fall of ${beforeDropOff.learnersStarted - dropOff.learnersStarted}.`
                      : `${dropOff.learnersStarted} learners reached it.`}
                  </p>
                </div>
              </div>
            )}

            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 pr-4 font-semibold text-gray-700">#</th>
                    <th className="pb-3 pr-4 font-semibold text-gray-700">Lesson</th>
                    <th className="pb-3 pr-4 font-semibold text-gray-700">Type</th>
                    <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Started</th>
                    <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Completed</th>
                    <th className="pb-3 pr-4 font-semibold text-gray-700">Completion</th>
                    <th className="pb-3 text-right font-semibold text-gray-700">Avg time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.lessons.map((l) => (
                    <tr
                      key={l.id}
                      className={l.isDropOffPoint ? 'bg-amber-50/60' : 'hover:bg-gray-50'}
                    >
                      <td className="py-3 pr-4 tabular-nums text-gray-500">{l.sequenceOrder}</td>
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900">{l.title}</span>
                        {l.isDropOffPoint && (
                          <AlertTriangle
                            className="ml-2 inline h-3.5 w-3.5 text-amber-600"
                            aria-label="Biggest drop-off point"
                          />
                        )}
                        {l.status !== 'published' && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-600">
                            {l.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 capitalize text-gray-600">{l.lessonType}</td>
                      <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900">
                        {l.learnersStarted}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                        {l.learnersCompleted}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${l.completionRate}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-700">{l.completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums text-gray-600">
                        {l.averageSeconds > 0 ? formatDuration(l.averageSeconds) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataNote>
              &ldquo;Started&rdquo; counts learners who opened the lesson; &ldquo;completed&rdquo;
              counts those who finished it. Average time is across learners who recorded any time.
            </DataNote>
          </>
        )}
      </Panel>

      {/* ─── Accessibility ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Accessibility coverage" question="What accessibility support does this course carry?">
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { label: 'Text-to-speech', on: a11y.course.supportsTts },
              { label: 'Transcripts', on: a11y.course.supportsTranscripts },
              { label: 'Focus mode', on: a11y.course.supportsFocusMode },
              { label: 'Chunked learning', on: a11y.course.supportsChunkedLearning },
            ].map((f) => (
              <span
                key={f.label}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  f.on ? 'bg-teal-50 text-teal-800' : 'bg-gray-100 text-gray-500 line-through'
                }`}
              >
                {f.label}
              </span>
            ))}
          </div>

          {/* Categories are shown whether or not a primary focus is set — a
              course can declare categories with no primary, and hiding them
              behind the primary made that content invisible to admins. The
              primary is filtered out of the category list because the two
              stores usually repeat it, which reads as a bug. */}
          {(() => {
            const primary = a11y.course.primaryDisabilityFocus;
            const others = a11y.course.categories.filter(
              (c) => c.toLowerCase() !== primary?.toLowerCase()
            );
            if (!primary && others.length === 0) return null;

            return (
              <p className="mb-4 text-sm text-gray-700">
                {primary ? (
                  <>
                    Primary focus: <strong className="uppercase">{primary}</strong>
                    {others.length > 0 && ` · also ${others.join(', ')}`}
                  </>
                ) : (
                  <>
                    Accessibility categories: <strong>{others.join(', ')}</strong>
                    <span className="text-gray-500"> · no primary focus set</span>
                  </>
                )}
              </p>
            );
          })()}

          <BarList
            items={[
              { label: 'Chunked content', value: a11y.lessons.chunkedContent },
              { label: 'Simplified summary', value: a11y.lessons.simplifiedSummary },
              { label: 'Focus mode', value: a11y.lessons.focusMode },
              { label: 'Video', value: a11y.lessons.withVideo },
              { label: 'Quiz', value: a11y.lessons.withQuiz },
              { label: 'PDF material', value: a11y.lessons.withPdf },
              { label: 'Transcript text', value: a11y.lessons.transcriptText },
            ]}
            valueLabel={`of ${a11y.lessons.total}`}
          />
          <DataNote>
            Transcript coverage counts lessons with real transcript text. The stored
            transcript flag is set on every lesson regardless of content, and the lesson
            accessibility score holds a column default, so neither is reported here.
          </DataNote>
        </Panel>

        <Panel
          title="Adaptations used in this course"
          question="Which accessibility features did learners switch on here?"
          isEmpty={data.adaptations.length === 0}
          emptyMessage="No accessibility adaptation has been recorded against this course."
        >
          <BarList
            items={data.adaptations.map((a) => ({
              label: labelAdaptation(a.type),
              value: a.events,
            }))}
            valueLabel="uses"
          />
        </Panel>
      </div>
    </div>
  );
}
