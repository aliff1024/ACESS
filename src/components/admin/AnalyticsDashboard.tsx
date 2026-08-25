'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  BookOpen,
  Download,
  Layers,
  Loader2,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchAdminAnalytics, formatDuration, formatRelative } from '@/lib/admin-api';
import type { AdminAnalyticsPayload, CoursePerformance, RangeKey } from '@/lib/admin-api';
import { BarList, DataNote, KpiCard, Panel, RangePicker } from './analytics/AdminAnalyticsUI';

type Tab = 'users' | 'courses' | 'learners' | 'accessibility';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'learners', label: 'Learners', icon: Layers },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
];

const STATUS_COLORS: Record<string, string> = {
  published: '#0d9488',
  draft: '#94a3b8',
  pending_review: '#d97706',
  archived: '#64748b',
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function courseRows(courses: CoursePerformance[]): Record<string, unknown>[] {
  return courses.map((c) => ({
    Course: c.title,
    Status: c.status,
    Type: c.courseType,
    Category: c.category ?? 'Uncategorised',
    Difficulty: c.difficulty ?? 'Unspecified',
    Educator: c.creatorName,
    'Published lessons': c.publishedLessons,
    Enrollments: c.enrollments,
    'Active enrollments': c.activeEnrollments,
    'Marked complete': c.markedComplete,
    'Marked complete %': c.markedCompleteRate,
    'Finished all lessons': c.fullyProgressed,
    'Average progress %': c.averageProgress,
    'Learning time': formatDuration(c.learningSeconds),
    Certificates: c.certificates,
    'Last activity': c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : 'None',
  }));
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>('all');
  const [tab, setTab] = useState<Tab>('users');
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The effect only starts the request; state is set from its callbacks. The
  // handler that changes the range is what moves `loading`, so no setState runs
  // synchronously inside an effect.
  const load = useCallback((key: RangeKey, signal: AbortSignal) => {
    fetchAdminAnalytics(key, signal)
      .then((payload) => {
        if (!signal.aborted) setData(payload);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError' && !signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(range, controller.signal);
    return () => controller.abort();
  }, [range, load]);

  const changeRange = (key: RangeKey) => {
    if (key === range) return;
    setLoading(true);
    setError(null);
    setRange(key);
  };

  const allCourses = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, CoursePerformance>();
    for (const c of [
      ...data.courses.topByEnrollment,
      ...data.courses.topByCompletion,
      ...data.courses.lowEngagement,
    ]) {
      seen.set(c.id, c);
    }
    return Array.from(seen.values()).sort((a, b) => b.enrollments - a.enrollments);
  }, [data]);

  const hasRegistrations = useMemo(
    () => (data?.trends ?? []).some((t) => t.registrations > 0),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="sr-only">Loading analytics</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-lg font-bold text-red-900">Could not load analytics</h2>
          <p className="mt-2 text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const access = data?.accessibility;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-3xl font-bold text-gray-900">Analytics</h2>
            <p className="text-gray-600">
              How the platform is changing over {data?.range.label.toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => downloadCsv(`acess-course-analytics-${range}.csv`, courseRows(allCourses))}
            disabled={allCourses.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export course data
          </button>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <RangePicker value={range} onChange={changeRange} disabled={loading} />
          {!data?.range.comparisonAvailable && (
            <span className="text-sm text-gray-500">
              Pick a bounded range to compare against the previous period.
            </span>
          )}
          {loading && (
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating…
            </span>
          )}
        </div>

        {/* ─── Overview strip ───────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active users" value={kpis?.activeUsers ?? 0} sublabel="With recorded activity" change={data?.changes.activeUsers} icon={Users} tone="teal" />
          <KpiCard label="New enrollments" value={kpis?.newEnrollments ?? 0} sublabel={`${kpis?.totalEnrollments ?? 0} all time`} change={data?.changes.newEnrollments} icon={BookOpen} tone="blue" />
          <KpiCard label="Lessons completed" value={kpis?.lessonsCompleted ?? 0} sublabel={`${kpis?.lessonCompletionRate ?? 0}% of lessons opened`} change={data?.changes.lessonsCompleted} icon={Layers} tone="green" />
          <KpiCard label="Learning time" value={formatDuration(kpis?.totalLearningSeconds ?? 0)} sublabel="Recorded in lessons" icon={Accessibility} tone="purple" />
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────── */}
        <div role="tablist" aria-label="Analytics sections" className="mb-8 flex flex-wrap items-center gap-1 border-b border-gray-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* ─── Users ────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              className="lg:col-span-2"
              title="User registrations"
              question="How is the user base growing?"
              isEmpty={!hasRegistrations}
              emptyMessage={`No accounts were created in ${data?.range.label.toLowerCase()}.`}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trends ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Line type="monotone" dataKey="registrations" name="New accounts" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="coursesCreated" name="Courses created" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Activity recency" question="How many users are still engaged?" isEmpty={(data?.learners.totalLearners ?? 0) === 0}>
              <BarList
                items={(data?.learners.bands ?? []).map((b) => ({ label: b.label, value: b.count }))}
                valueLabel="learners"
              />
              <DataNote>
                Derived from the most recent sign-in, lesson view, quiz attempt, adaptation event or
                enrollment. Sign-in timestamps only begin accumulating from the moment login
                tracking was added, so early figures lean on learning activity.
              </DataNote>
            </Panel>

            <Panel title="Role distribution" question="What is the make-up of the user base?" isEmpty={(data?.composition.roles.length ?? 0) === 0}>
              <BarList
                items={(data?.composition.roles ?? []).map((r) => ({
                  label: r.label.charAt(0).toUpperCase() + r.label.slice(1),
                  value: r.count,
                }))}
                valueLabel="users"
              />
            </Panel>
          </div>
        )}

        {/* ─── Courses ──────────────────────────────────────────────── */}
        {tab === 'courses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Panel title="Course status" question="What is ready for learners?" isEmpty={(data?.composition.courseStatus.length ?? 0) === 0}>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.composition.courseStatus ?? []} dataKey="count" nameKey="label" innerRadius={44} outerRadius={72} paddingAngle={2}>
                        {(data?.composition.courseStatus ?? []).map((s) => (
                          <Cell key={s.label} fill={STATUS_COLORS[s.label] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(v: number, n: string) => [`${v} courses`, n.replace('_', ' ')]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(data?.composition.courseStatus ?? []).map((s) => (
                    <li key={s.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 capitalize text-gray-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.label] ?? '#94a3b8' }} />
                        {s.label.replace('_', ' ')}
                      </span>
                      <span className="font-semibold tabular-nums text-gray-900">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="By difficulty" question="Is the catalogue balanced?" isEmpty={(data?.composition.difficulty.length ?? 0) === 0}>
                <BarList items={(data?.composition.difficulty ?? []).map((d) => ({ label: d.label, value: d.count }))} valueLabel="courses" />
              </Panel>

              <Panel title="By category" question="What subjects are covered?" isEmpty={(data?.composition.categories.length ?? 0) === 0}>
                <BarList items={(data?.composition.categories ?? []).slice(0, 6).map((c) => ({ label: c.label, value: c.count }))} valueLabel="courses" />
              </Panel>
            </div>

            <Panel
              title="Course performance"
              question="Which courses work, and which need attention?"
              isEmpty={allCourses.length === 0}
              emptyMessage="No courses have enrollments yet."
            >
              <div className="-mx-6 overflow-x-auto px-6">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-3 pr-4 font-semibold text-gray-700">Course</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Lessons</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Enrolled</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Marked complete</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Avg progress</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Learning time</th>
                      <th className="pb-3 text-right font-semibold text-gray-700">Last activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-gray-900">{c.title}</span>
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-600">
                            {c.courseType}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-gray-600">{c.publishedLessons}</td>
                        <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{c.enrollments}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                          {c.markedComplete}
                          <span className="ml-1 text-xs text-gray-400">({c.markedCompleteRate}%)</span>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-gray-600">{c.averageProgress}%</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-gray-600">{formatDuration(c.learningSeconds)}</td>
                        <td className="py-3 text-right text-gray-500">{formatRelative(c.lastActivity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DataNote>
                &ldquo;Marked complete&rdquo; comes from the enrollment record. &ldquo;Avg
                progress&rdquo; is derived from completed published lessons. They are shown side by
                side because they do not agree on this data.
              </DataNote>
            </Panel>

            {(data?.courses.lowEngagement.length ?? 0) > 0 && (
              <Panel
                title="Published courses with no enrollments"
                question="What is live but unused?"
                isEmpty={false}
              >
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(data?.courses.lowEngagement ?? []).map((c) => (
                    <li key={c.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="truncate text-sm font-medium text-gray-900" title={c.title}>{c.title}</p>
                      <p className="text-xs text-gray-600">
                        {c.publishedLessons} lessons · {c.creatorName}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        )}

        {/* ─── Learners ─────────────────────────────────────────────── */}
        {tab === 'learners' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              className="lg:col-span-2"
              title="Progress distribution"
              question="Where do learners stall?"
              isEmpty={(kpis?.totalEnrollments ?? 0) === 0}
              emptyMessage="No enrollments yet."
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.learners.progressDistribution ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(v: number) => [`${v} enrollments`, 'Count']} />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataNote>
                Each bar counts enrollments, not learners — one learner enrolled in three courses
                appears three times. Progress is completed published lessons over published lessons.
              </DataNote>
            </Panel>

            <Panel title="Quiz performance" question="Are assessments passable?" isEmpty={(kpis?.quizAttempts ?? 0) === 0} emptyMessage={`No quiz attempts in ${data?.range.label.toLowerCase()}.`}>
              <dl className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm text-gray-600">Attempts</dt>
                  <dd className="text-2xl font-bold tabular-nums text-gray-900">{kpis?.quizAttempts ?? 0}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm text-gray-600">Pass rate</dt>
                  <dd className="text-2xl font-bold tabular-nums text-gray-900">
                    {kpis?.quizPassRate != null ? `${kpis.quizPassRate}%` : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm text-gray-600">Average score</dt>
                  <dd className="text-2xl font-bold tabular-nums text-gray-900">
                    {kpis?.averageQuizScore != null ? `${kpis.averageQuizScore}%` : '—'}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Lesson funnel" question="How much of what is opened gets finished?" isEmpty={(kpis?.lessonsStarted ?? 0) === 0} emptyMessage={`No lesson activity in ${data?.range.label.toLowerCase()}.`}>
              <BarList
                items={[
                  { label: 'Lessons opened', value: kpis?.lessonsStarted ?? 0 },
                  { label: 'Lessons completed', value: kpis?.lessonsCompleted ?? 0 },
                ]}
              />
              <p className="mt-4 text-sm text-gray-600">
                <strong className="text-gray-900">{kpis?.lessonCompletionRate ?? 0}%</strong> of
                opened lessons were finished, over{' '}
                {formatDuration(kpis?.totalLearningSeconds ?? 0)} of recorded learning time.
              </p>
            </Panel>
          </div>
        )}

        {/* ─── Accessibility ────────────────────────────────────────── */}
        {tab === 'accessibility' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              title="Adaptation usage"
              question="Which accessibility features get used?"
              isEmpty={(access?.adaptationUsage.length ?? 0) === 0}
              emptyMessage={`No adaptation events recorded in ${data?.range.label.toLowerCase()}.`}
            >
              <BarList
                items={(access?.adaptationUsage ?? []).map((a) => ({
                  label: a.label,
                  value: a.events,
                  hint: `${a.users} ${a.users === 1 ? 'learner' : 'learners'} · last used ${formatRelative(a.lastUsed).toLowerCase()}`,
                }))}
                valueLabel="uses"
              />
              <DataNote>
                Reached {access?.reach.usersWithEvents ?? 0} of {access?.reach.learnerTotal ?? 0}{' '}
                learners. Only features instrumented in the learner interface produce events, so
                absence here means &ldquo;not recorded&rdquo;, not &ldquo;not needed&rdquo;.
              </DataNote>
            </Panel>

            <Panel
              title="Preset adoption"
              question="Which accessibility profiles do learners choose?"
              isEmpty={(access?.presetAdoption.length ?? 0) === 0}
              emptyMessage="No preset has been applied in this range."
            >
              <BarList
                items={(access?.presetAdoption ?? []).map((p) => ({
                  label: p.preset === 'none' ? 'Cleared preset' : p.preset.toUpperCase(),
                  value: p.events,
                  hint: `${p.users} ${p.users === 1 ? 'learner' : 'learners'}`,
                }))}
                valueLabel="times"
              />
            </Panel>

            <Panel
              title="Saved accessibility settings"
              question="What have learners turned on and kept?"
              isEmpty={(access?.settingsAdoption.denominator ?? 0) === 0}
              emptyMessage="No learner has saved accessibility preferences yet."
            >
              <BarList
                items={(access?.settingsAdoption.features ?? [])
                  .filter((f) => f.users > 0)
                  .map((f) => ({ label: f.label, value: f.users }))}
                valueLabel="users"
              />
              <DataNote>
                Measured across the {access?.settingsAdoption.denominator ?? 0} of{' '}
                {access?.settingsAdoption.populationTotal ?? 0} users who have saved any
                preferences. Percentages against the whole user base are not shown, because an
                absent record is not the same fact as a disabled setting.
              </DataNote>
            </Panel>

            <Panel title="Catalogue accessibility coverage" question="How accessible is the content itself?" isEmpty={false}>
              <div className="space-y-5">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Courses ({access?.coverage.courses.total ?? 0})
                  </h4>
                  <BarList
                    items={[
                      { label: 'Text-to-speech support', value: access?.coverage.courses.supportsTts ?? 0 },
                      { label: 'Transcript support', value: access?.coverage.courses.supportsTranscripts ?? 0 },
                      { label: 'Focus mode', value: access?.coverage.courses.supportsFocusMode ?? 0 },
                      { label: 'Chunked learning', value: access?.coverage.courses.supportsChunkedLearning ?? 0 },
                      { label: 'Declared disability focus', value: access?.coverage.courses.withDisabilityFocus ?? 0 },
                    ]}
                    valueLabel="courses"
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Lessons ({access?.coverage.lessons.total ?? 0})
                  </h4>
                  <BarList
                    items={[
                      { label: 'Chunked content', value: access?.coverage.lessons.chunkedContent ?? 0 },
                      { label: 'Simplified summary', value: access?.coverage.lessons.simplifiedSummary ?? 0 },
                      { label: 'Focus mode', value: access?.coverage.lessons.focusMode ?? 0 },
                      { label: 'Video', value: access?.coverage.lessons.withVideo ?? 0 },
                      { label: 'Quiz', value: access?.coverage.lessons.withQuiz ?? 0 },
                      { label: 'PDF material', value: access?.coverage.lessons.withPdf ?? 0 },
                      { label: 'Transcript text', value: access?.coverage.lessons.withTranscriptContent ?? 0 },
                    ]}
                    valueLabel="lessons"
                  />
                </div>
              </div>
              <DataNote>
                Transcript coverage counts lessons with actual transcript text, not the
                <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs">has_transcript</code>
                flag, which is set on every lesson regardless of content. Lesson accessibility
                scores are excluded entirely: every row holds the column default.
              </DataNote>
            </Panel>

            <Panel className="lg:col-span-2" title="Courses by disability focus" question="Who is the catalogue built for?" isEmpty={(access?.coverage.disabilityFocus.length ?? 0) === 0}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={access?.coverage.disabilityFocus ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="focus" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(v: number) => [`${v} courses`, 'Courses']} />
                    <Bar dataKey="courses" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
