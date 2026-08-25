'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  School,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { fetchAdminAnalytics, getInstructorApplicationStats, formatDuration, formatRelative } from '@/lib/admin-api';
import type { AdminAnalyticsPayload, RangeKey } from '@/lib/admin-api';
import { supabase } from '@/lib/supabase';
import { BarList, DataNote, KpiCard, Panel, RangePicker, describeChange } from './analytics/AdminAnalyticsUI';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  learner: '#2563eb',
  educator: '#0d9488',
  admin: '#7c3aed',
  disabled: '#94a3b8',
};

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [range, setRange] = useState<RangeKey>('all');
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructorStats, setInstructorStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: auth }) => {
      const name = auth?.user?.user_metadata?.full_name;
      if (name) setAdminName(name);
    });
    getInstructorApplicationStats().then(setInstructorStats).catch(console.error);
  }, []);

  // The effect only starts the request; state is set from its callbacks.
  // `loading` and `error` are moved by the event handlers that cause a refetch,
  // so nothing calls setState synchronously during an effect and triggers a
  // cascading render.
  const load = useCallback((key: RangeKey, signal: AbortSignal) => {
    fetchAdminAnalytics(key, signal)
      .then((payload) => {
        if (signal.aborted) return;
        setData(payload);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError' || signal.aborted) return;
        setError(err.message);
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

  const retry = () => {
    setLoading(true);
    setError(null);
    load(range, new AbortController().signal);
  };

  const kpis = data?.kpis;

  // Derived once per payload rather than on every render.
  const roleData = useMemo(
    () => (data?.composition.roles ?? []).map((r) => ({ ...r, fill: ROLE_COLORS[r.label] ?? '#94a3b8' })),
    [data]
  );

  const hasTrendData = useMemo(
    () => (data?.trends ?? []).some((t) => t.enrollments || t.completions || t.registrations),
    [data]
  );

  const hasLessonActivity = useMemo(
    () => (data?.trends ?? []).some((t) => t.lessonActivity || t.adaptations),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="sr-only">Loading dashboard</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-lg font-bold text-red-900">Could not load the dashboard</h2>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <button
            onClick={retry}
            className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h2 className="mb-1 text-3xl font-bold text-gray-900">Welcome back, {adminName}</h2>
          <p className="text-gray-600">
            Platform activity for <strong>{data?.range.label.toLowerCase()}</strong>
          </p>
        </header>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <RangePicker value={range} onChange={changeRange} disabled={loading} />
          {loading && (
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating…
            </span>
          )}
        </div>

        {/* ─── KPIs ─────────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total users"
            value={kpis?.totalUsers ?? 0}
            sublabel={`${kpis?.newUsers ?? 0} joined in this range`}
            changeNote={describeChange(data?.changes.newUsers, 'joined')}
            icon={Users}
            tone="blue"
          />
          <KpiCard
            label="Active users"
            value={kpis?.activeUsers ?? 0}
            sublabel="With recorded activity"
            change={data?.changes.activeUsers}
            icon={Activity}
            tone="teal"
          />
          <KpiCard
            label="Courses"
            value={kpis?.totalCourses ?? 0}
            sublabel={`${kpis?.publishedCourses ?? 0} published · ${kpis?.draftCourses ?? 0} draft`}
            changeNote={describeChange(data?.changes.newCourses, 'created')}
            icon={BookOpen}
            tone="green"
          />
          <KpiCard
            label="Enrollments"
            value={kpis?.totalEnrollments ?? 0}
            sublabel={`${kpis?.activeEnrollments ?? 0} currently active`}
            changeNote={describeChange(data?.changes.newEnrollments, 'enrolled')}
            icon={GraduationCap}
            tone="purple"
          />
          <KpiCard
            label="Marked complete"
            value={`${kpis?.markedCompleteRate ?? 0}%`}
            sublabel={`${kpis?.markedComplete ?? 0} of ${kpis?.totalEnrollments ?? 0} enrollments`}
            icon={CheckCircle2}
            tone="amber"
          />
        </div>

        {/* ─── Two completion measures ──────────────────────────────── */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-bold text-gray-900">How much of the content is finished?</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Two separate measures. They are reported apart because the records disagree.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {kpis?.markedComplete ?? 0}
                <span className="ml-1 text-base font-medium text-gray-500">
                  / {kpis?.totalEnrollments ?? 0}
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-gray-700">Enrollments marked complete</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${kpis?.markedCompleteRate ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">From the enrollment record&apos;s status.</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {kpis?.fullyProgressed ?? 0}
                <span className="ml-1 text-base font-medium text-gray-500">
                  / {kpis?.totalEnrollments ?? 0}
                </span>
              </p>
              <p className="mt-1 text-sm font-medium text-gray-700">Finished every lesson</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${kpis?.fullyProgressedRate ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Derived from lesson progress. Average across all enrollments:{' '}
                {kpis?.averageProgress ?? 0}%.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {kpis?.lessonCompletionRate ?? 0}%
              </p>
              <p className="mt-1 text-sm font-medium text-gray-700">Lessons finished once opened</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{ width: `${kpis?.lessonCompletionRate ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {kpis?.lessonsCompleted ?? 0} completed of {kpis?.lessonsStarted ?? 0} opened ·{' '}
                {formatDuration(kpis?.totalLearningSeconds ?? 0)} spent.
              </p>
            </div>
          </div>
          {(kpis?.markedComplete ?? 0) > 0 && (kpis?.fullyProgressed ?? 0) === 0 && (
            <DataNote>
              No enrollment marked complete has finished every published lesson. The two figures
              measure different things and must not be averaged together.
            </DataNote>
          )}
        </section>

        {/* ─── Trends ───────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title="Enrollments and completions"
            question="Is the platform gaining or losing momentum?"
            loading={loading && !data}
            isEmpty={!hasTrendData}
            emptyMessage={`No enrollments or completions were recorded in ${data?.range.label.toLowerCase()}. Try a wider range.`}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.trends ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradComplete" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" />
                  <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#2563eb" strokeWidth={2} fill="url(#gradEnroll)" />
                  <Area type="monotone" dataKey="completions" name="Completions" stroke="#0d9488" strokeWidth={2} fill="url(#gradComplete)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Users by role"
            question="Who is on the platform?"
            isEmpty={roleData.length === 0}
          >
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {roleData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    formatter={(value: number, name: string) => [`${value} users`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-1.5">
              {roleData.map((r) => (
                <li key={r.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize text-gray-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.fill }} />
                    {r.label}
                  </span>
                  <span className="font-semibold tabular-nums text-gray-900">{r.count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* ─── Learner activity + top courses ───────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel
            title="Learner activity"
            question="Are learners still showing up?"
            isEmpty={(data?.learners.totalLearners ?? 0) === 0}
            emptyMessage="No learner accounts yet."
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.learners.bands ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" width={150} axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    formatter={(value: number) => [`${value} learners`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataNote>
              Activity is the most recent of: sign-in, lesson view, quiz attempt, accessibility
              adaptation or enrollment. It is not the account-enabled flag.
            </DataNote>
          </Panel>

          <Panel
            title="Most enrolled courses"
            question="Where are learners going?"
            isEmpty={(data?.courses.topByEnrollment.length ?? 0) === 0}
            emptyMessage="No course has any enrollments yet."
            action={
              <button
                onClick={() => onNavigate('analytics')}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Full breakdown
              </button>
            }
          >
            <BarList
              items={(data?.courses.topByEnrollment ?? []).slice(0, 6).map((c) => ({
                label: c.title,
                value: c.enrollments,
                hint: `${c.markedComplete} marked complete · ${c.averageProgress}% average progress`,
              }))}
              valueLabel="enrolled"
            />
          </Panel>
        </div>

        {/* ─── Accessibility ────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel
            title="Accessibility feature usage"
            question="Which adaptations do learners actually turn on?"
            isEmpty={(data?.accessibility.adaptationUsage.length ?? 0) === 0}
            emptyMessage={`No accessibility adaptations were recorded in ${data?.range.label.toLowerCase()}.`}
          >
            <BarList
              items={(data?.accessibility.adaptationUsage ?? []).map((a) => ({
                label: a.label,
                value: a.events,
                hint: `${a.users} ${a.users === 1 ? 'learner' : 'learners'}`,
              }))}
              valueLabel="uses"
            />
            <DataNote>
              Counted from recorded adaptation events. Reached{' '}
              {data?.accessibility.reach.usersWithEvents ?? 0} of{' '}
              {data?.accessibility.reach.learnerTotal ?? 0} learners.
            </DataNote>
          </Panel>

          <Panel
            title="Accessibility activity over time"
            question="Is adaptation use growing?"
            isEmpty={!hasLessonActivity}
            emptyMessage={`No lesson or adaptation activity in ${data?.range.label.toLowerCase()}.`}
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trends ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <Legend verticalAlign="top" height={32} iconType="circle" />
                  <Line type="monotone" dataKey="adaptations" name="Adaptations used" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lessonActivity" name="Lessons opened" stroke="#0d9488" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* ─── Quick actions ────────────────────────────────────────── */}
        <section className="mb-8">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">Quick actions</h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            {[
              { title: 'Manage users', description: 'Review accounts, roles and access', icon: Users, view: 'users', color: 'bg-blue-600' },
              { title: 'Review courses', description: 'Approve and publish submissions', icon: BookOpen, view: 'courses', color: 'bg-green-600' },
              { title: 'Generate reports', description: 'Export platform data as PDF or CSV', icon: TrendingUp, view: 'reports', color: 'bg-purple-600' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={() => onNavigate(action.view)}
                  className="rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <h4 className="font-semibold text-gray-900">{action.title}</h4>
                  <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
            <button
              onClick={() => onNavigate('instructor-applications')}
              className="rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600">
                <School className="h-5 w-5 text-white" />
              </span>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900">
                Educator applications
                {instructorStats.pending > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {instructorStats.pending}
                  </span>
                )}
              </h4>
              <p className="mt-1 text-sm text-gray-600">
                {instructorStats.pending > 0
                  ? `${instructorStats.pending} awaiting review`
                  : 'No pending applications'}
              </p>
            </button>
          </div>
        </section>

        {/* ─── Recent activity ──────────────────────────────────────── */}
        <Panel
          title="Recent platform activity"
          isEmpty={(data?.recentActivity.length ?? 0) === 0}
          emptyMessage="Nothing has happened on the platform yet."
        >
          <ul className="divide-y divide-gray-100">
            {(data?.recentActivity ?? []).map((item, idx) => {
              const meta = {
                user_registration: { icon: Users, tone: 'bg-blue-50 text-blue-700' },
                course_created: { icon: BookOpen, tone: 'bg-green-50 text-green-700' },
                certificate_issued: { icon: Award, tone: 'bg-purple-50 text-purple-700' },
              }[item.type];
              const Icon = meta.icon;
              return (
                <li key={`${item.type}-${idx}`} className="flex items-center gap-4 py-3">
                  <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.detail}</p>
                    <p className="text-sm text-gray-500">{item.name}</p>
                  </div>
                  <time className="flex-none text-sm text-gray-500" dateTime={item.at}>
                    {formatRelative(item.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
