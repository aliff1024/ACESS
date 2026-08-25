'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Accessibility,
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Shield,
  Users,
} from 'lucide-react';
import { formatDuration, formatRelative } from '@/lib/admin-api';
import type { UserDetail } from '@/lib/admin-analytics';
import { DataNote, Panel } from './analytics/AdminAnalyticsUI';

interface AdminUserProfileProps {
  userId: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 ring-purple-200',
  educator: 'bg-teal-50 text-teal-700 ring-teal-200',
  learner: 'bg-blue-50 text-blue-700 ring-blue-200',
  disabled: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const BAND_STYLES: Record<string, string> = {
  'active-7': 'bg-green-50 text-green-700 ring-green-200',
  'active-30': 'bg-teal-50 text-teal-700 ring-teal-200',
  'dormant-90': 'bg-amber-50 text-amber-800 ring-amber-200',
  never: 'bg-gray-100 text-gray-600 ring-gray-200',
};

const ENROLLMENT_STYLES: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  dropped: 'bg-gray-100 text-gray-600',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function AdminUserProfile({ userId }: AdminUserProfileProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State is set only from the fetch callbacks. `loading` starts true and the
  // page keys this component by user id, so viewing a different user mounts a
  // fresh instance rather than needing a synchronous reset inside the effect.
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/users/${userId}/details`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load user');
        return body as UserDetail;
      })
      .then(setUser)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {error === 'User not found' ? 'User not found' : 'Could not load this profile'}
        </h2>
        {error && error !== 'User not found' && <p className="mt-2 text-sm text-gray-600">{error}</p>}
        <button
          onClick={() => router.push('/admin/users')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to users
        </button>
      </div>
    );
  }

  const { learner, educator, accessibility } = user;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/admin/users')}
          aria-label="Back to users"
          className="rounded-full p-2 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{user.fullName || user.email}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${
                ROLE_STYLES[user.role] ?? ROLE_STYLES.disabled
              }`}
            >
              {user.role}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                BAND_STYLES[user.activityBand]
              }`}
            >
              {user.activityBandLabel}
            </span>
            {!user.isActive && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                Account disabled
              </span>
            )}
          </div>
          <p className="mt-1 text-gray-500">Administrative profile and platform activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── Identity card ───────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
                {(user.fullName || user.email).slice(0, 2).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{user.fullName || 'No name set'}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Mail className="h-4 w-4" /> {user.email}
              </p>
            </div>

            <dl className="space-y-3 border-t border-gray-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" /> Joined
                </dt>
                <dd className="font-medium text-gray-900">{formatDate(user.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Activity className="h-4 w-4" /> Last active
                </dt>
                <dd className="font-medium text-gray-900">{formatRelative(user.lastActive)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-4 w-4" /> Last sign-in
                </dt>
                <dd className="font-medium text-gray-900">
                  {user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Not recorded'}
                </dd>
              </div>
              {user.profile.country && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Country</dt>
                  <dd className="font-medium text-gray-900">{user.profile.country}</dd>
                </div>
              )}
              {user.profile.preferredLanguage && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Language</dt>
                  <dd className="font-medium uppercase text-gray-900">
                    {user.profile.preferredLanguage}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Shield className="h-4 w-4" /> Account ID
                </dt>
                <dd className="font-mono text-xs text-gray-700">{user.id.slice(0, 8)}…</dd>
              </div>
            </dl>

            {!user.lastLoginAt && (
              <DataNote>
                Sign-in timestamps are recorded from the point login tracking was added. &ldquo;Last
                active&rdquo; is derived from learning activity instead.
              </DataNote>
            )}
          </section>

          {/* ─── Accessibility ─────────────────────────────────────── */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
              <Accessibility className="h-4 w-4 text-purple-600" /> Accessibility
            </h3>
            <p className="mb-4 text-sm text-gray-500">Settings and adaptations in use</p>

            {accessibility.hasSavedPreferences ? (
              <div className="space-y-4">
                {accessibility.activePreset && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Active preset
                    </p>
                    <p className="mt-1 inline-block rounded-md bg-purple-50 px-2.5 py-1 text-sm font-semibold uppercase text-purple-700">
                      {accessibility.activePreset}
                    </p>
                  </div>
                )}
                {accessibility.declaredDisability && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Declared profile
                    </p>
                    <p className="mt-1 text-sm capitalize text-gray-900">
                      {accessibility.declaredDisability}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Enabled features
                  </p>
                  {accessibility.enabledFeatures.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {accessibility.enabledFeatures.map((f) => (
                        <li
                          key={f.key}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                        >
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">
                      Preferences saved, but no adaptive feature switched on.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                No accessibility preferences saved. This is not the same as having them all turned
                off.
              </p>
            )}

            {accessibility.adaptationTotals.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Adaptations used
                </p>
                <ul className="space-y-1.5">
                  {accessibility.adaptationTotals.map((a) => (
                    <li key={a.type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{a.label}</span>
                      <span className="font-semibold tabular-nums text-gray-900">{a.events}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* ─── Role-specific detail ────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {learner && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
                  <BookOpen className="h-4 w-4 text-blue-600" /> Learning overview
                </h3>
                <p className="mb-5 text-sm text-gray-500">
                  Across {learner.totalEnrollments}{' '}
                  {learner.totalEnrollments === 1 ? 'enrollment' : 'enrollments'}
                </p>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Stat label="In progress" value={learner.inProgress} />
                  <Stat
                    label="Marked complete"
                    value={learner.markedComplete}
                    hint={`${learner.fullyProgressed} finished all lessons`}
                  />
                  <Stat label="Average progress" value={`${learner.averageProgress}%`} />
                  <Stat
                    label="Learning time"
                    value={formatDuration(learner.totalLearningSeconds)}
                    hint={`${learner.lessonsCompleted}/${learner.lessonsStarted} lessons finished`}
                  />
                </div>
                {learner.markedComplete > 0 && learner.fullyProgressed === 0 && (
                  <DataNote>
                    Courses marked complete on the enrollment record, but no course has every
                    published lesson finished.
                  </DataNote>
                )}
              </section>

              <Panel
                title="Course activity"
                question="What has this learner worked on?"
                isEmpty={learner.courses.length === 0}
                emptyMessage="This learner has not enrolled in any course."
              >
                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-3 pr-4 font-semibold text-gray-700">Course</th>
                        <th className="pb-3 pr-4 font-semibold text-gray-700">Status</th>
                        <th className="pb-3 pr-4 font-semibold text-gray-700">Progress</th>
                        <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Time</th>
                        <th className="pb-3 pr-4 text-right font-semibold text-gray-700">
                          Last activity
                        </th>
                        <th className="pb-3 text-right font-semibold text-gray-700">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {learner.courses.map((c) => (
                        <tr key={c.enrollmentId} className="hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-gray-900">{c.courseTitle}</p>
                            <p className="text-xs text-gray-500">
                              {c.category ?? 'Uncategorised'}
                              {c.difficulty ? ` · ${c.difficulty}` : ''}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                                ENROLLMENT_STYLES[c.enrollmentStatus] ?? 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.enrollmentStatus}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{ width: `${c.progress}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-gray-700">{c.progress}%</span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {c.lessonsCompleted} of {c.publishedLessons} lessons
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                            {formatDuration(c.learningSeconds)}
                          </td>
                          <td className="py-3 pr-4 text-right text-gray-500">
                            {formatRelative(c.lastActivity)}
                          </td>
                          {/* Completion and certification are separate facts, and
                              the records do not always agree — a certificate can
                              exist against an enrollment that was never marked
                              complete. Showing them apart makes that visible
                              instead of implying one from the other. */}
                          <td className="py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {c.completedAt ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {formatDate(c.completedAt)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Not completed</span>
                              )}
                              {c.certificateId && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                                    c.completedAt
                                      ? 'text-purple-700'
                                      : 'bg-amber-50 text-amber-800'
                                  }`}
                                  title={
                                    c.completedAt
                                      ? 'Certificate issued'
                                      : 'A certificate exists although this enrollment was never marked complete'
                                  }
                                >
                                  <Award className="h-3.5 w-3.5" />
                                  {c.completedAt ? 'Certified' : 'Certified early'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Panel
                  title="Recent lesson activity"
                  isEmpty={learner.recentLessons.length === 0}
                  emptyMessage="No lessons opened yet."
                >
                  <ul className="divide-y divide-gray-100">
                    {learner.recentLessons.map((l) => (
                      <li key={`${l.lessonId}-${l.lastViewedAt}`} className="flex items-center gap-3 py-2.5">
                        <span
                          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                            l.isCompleted ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{l.lessonTitle}</p>
                          <p className="truncate text-xs text-gray-500">
                            {l.courseTitle} · viewed {l.viewCount}×
                            {l.timeSpentSeconds > 0 && ` · ${formatDuration(l.timeSpentSeconds)}`}
                          </p>
                        </div>
                        <span className="flex-none text-xs text-gray-500">
                          {formatRelative(l.lastViewedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel
                  title="Quiz history"
                  isEmpty={learner.quizzes.length === 0}
                  emptyMessage="No quiz attempts recorded."
                >
                  <ul className="divide-y divide-gray-100">
                    {learner.quizzes.map((q) => (
                      <li key={`${q.quizId}-${q.lastAttemptAt}`} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{q.courseTitle}</p>
                          <p className="text-xs text-gray-500">
                            {q.attempts} {q.attempts === 1 ? 'attempt' : 'attempts'} ·{' '}
                            {formatRelative(q.lastAttemptAt)}
                          </p>
                        </div>
                        <div className="flex-none text-right">
                          <p className="text-sm font-bold tabular-nums text-gray-900">
                            {q.bestScore != null ? `${q.bestScore}%` : '—'}
                          </p>
                          <p
                            className={`text-xs font-medium capitalize ${
                              q.lastResult === 'pass' ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {q.lastResult.replace('_', ' ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </>
          )}

          {educator && educator.coursesCreated > 0 && (
            <>
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
                  <Users className="h-4 w-4 text-teal-600" /> Teaching impact
                </h3>
                <p className="mb-5 text-sm text-gray-500">
                  {user.role === 'admin'
                    ? 'Reach and outcomes across courses this admin authored'
                    : 'Reach and outcomes across authored courses'}
                </p>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Stat
                    label="Courses created"
                    value={educator.coursesCreated}
                    hint={`${educator.published} published · ${educator.drafts} draft`}
                  />
                  <Stat
                    label="Enrollments"
                    value={educator.totalEnrollments}
                    hint={`${educator.totalLearners} distinct learners`}
                  />
                  <Stat
                    label="Marked complete"
                    value={`${educator.markedCompleteRate}%`}
                    hint={`${educator.totalMarkedComplete} of ${educator.totalEnrollments}`}
                  />
                  <Stat
                    label="Average progress"
                    value={`${educator.averageProgress}%`}
                    hint={`${educator.certificatesIssued} certificates issued`}
                  />
                </div>
              </section>

              <Panel
                title="Course performance"
                question={
                  user.role === 'admin'
                    ? 'How are the courses this admin authored doing?'
                    : "How are this educator's courses doing?"
                }
                isEmpty={educator.courses.length === 0}
                emptyMessage="No courses authored yet."
              >
                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-3 pr-4 font-semibold text-gray-700">Course</th>
                        <th className="pb-3 pr-4 font-semibold text-gray-700">Status</th>
                        <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Lessons</th>
                        <th className="pb-3 pr-4 text-right font-semibold text-gray-700">Enrolled</th>
                        <th className="pb-3 pr-4 text-right font-semibold text-gray-700">
                          Marked complete
                        </th>
                        <th className="pb-3 text-right font-semibold text-gray-700">Avg progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {educator.courses.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{c.title}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                                c.status === 'published'
                                  ? 'bg-green-50 text-green-700'
                                  : c.status === 'draft'
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {c.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                            {c.publishedLessons}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900">
                            {c.enrollments}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                            {c.markedComplete}
                            <span className="ml-1 text-xs text-gray-400">
                              ({c.markedCompleteRate}%)
                            </span>
                          </td>
                          <td className="py-3 text-right tabular-nums text-gray-600">
                            {c.averageProgress}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}

          {!learner && (!educator || educator.coursesCreated === 0) && (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <div className="py-12 text-center">
                <Shield className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">
                  {user.role === 'admin' ? 'System administrator' : 'No learning activity'}
                </h3>
                <p className="mt-1 text-gray-500">
                  {user.role === 'admin'
                    ? 'This account has full administrative privileges and no enrollments or authored courses.'
                    : 'This account has no enrollments and has not authored any courses.'}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
