'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Accessibility, Activity, ArrowLeft, Award, BookOpen,
  Calendar, CheckCircle2, Clock, Loader2, Mail, Shield,
  Users, UserCog, Power, Edit3, ExternalLink, Bell,
  FileText, Sparkles, Check, AlertTriangle, Phone, Globe, User
} from 'lucide-react';
import { formatDuration, formatRelative } from '@/lib/admin-api';
import type { UserDetail } from '@/lib/admin-analytics';
import { DataNote, Panel } from './analytics/AdminAnalyticsUI';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ConfirmAction } from '../ui/ConfirmAction';
import RoleEditModal from './RoleEditModal';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

interface AdminUserProfileProps {
  userId: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  educator: 'bg-teal-100 text-teal-800 border-teal-200',
  learner: 'bg-blue-100 text-blue-800 border-blue-200',
  disabled: 'bg-gray-100 text-gray-700 border-gray-200',
};

const BAND_STYLES: Record<string, string> = {
  'active-7': 'bg-green-50 text-green-700 border-green-200',
  'active-30': 'bg-teal-50 text-teal-700 border-teal-200',
  'dormant-90': 'bg-amber-50 text-amber-800 border-amber-200',
  never: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ENROLLMENT_STYLES: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  dropped: 'bg-gray-100 text-gray-600 border-gray-200',
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
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'certificates' | 'settings'>('overview');

  // Modal States
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editBio, setEditBio] = useState('');

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load user');
      setUser(body as UserDetail);

      // Populate edit fields
      setEditFullName(body.fullName || '');
      setEditUsername(body.profile?.username || '');
      setEditPhone(body.profile?.phoneNumber || '');
      setEditCountry(body.profile?.country || '');
      setEditBio(body.profile?.bio || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRoleChange = async (targetId: string, newRole: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      toast.success('User role updated successfully');
      setRoleModalOpen(false);
      loadUserData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    setActionLoading(true);
    const action = user.isActive ? 'suspend' : 'activate';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user`);

      toast.success(`User ${user.isActive ? 'suspended' : 'activated'} successfully`);
      setConfirmToggleOpen(false);
      loadUserData();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editFullName,
          username: editUsername,
          phone_number: editPhone,
          country: editCountry,
          bio: editBio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      toast.success('User profile updated successfully');
      setEditModalOpen(false);
      loadUserData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="text-xs text-gray-500 font-medium">Loading administrative profile...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">
          {error === 'User not found' ? 'User not found' : 'Could not load this profile'}
        </h2>
        {error && error !== 'User not found' && <p className="mt-1 text-xs text-gray-500">{error}</p>}
        <Button onClick={() => router.push('/admin/users')} className="mt-4" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to user directory
        </Button>
      </div>
    );
  }

  const { learner, educator, accessibility, profile, notifications } = user;
  const isSelf = currentUser?.id === user.id;

  const initials = (user.fullName || user.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Top Header & Administrative Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            aria-label="Back to users"
            className="rounded-xl p-2.5 transition-colors hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm overflow-hidden">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName || user.email}</h1>
              <Badge className={`border text-xs capitalize ${ROLE_STYLES[user.role] || ROLE_STYLES.disabled}`}>
                {user.role}
              </Badge>
              <Badge className={`border text-xs ${BAND_STYLES[user.activityBand]}`}>
                {user.activityBandLabel}
              </Badge>
              {!user.isActive && (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-bold">
                  Suspended
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span>{user.email}</span>
              <span>•</span>
              <span>Joined {formatDate(user.createdAt)}</span>
              <span>•</span>
              <span>Account ID: {user.id.slice(0, 8)}…</span>
            </p>
          </div>
        </div>

        {/* Administrative Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditModalOpen(true)}
            className="text-xs border-gray-300 gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setRoleModalOpen(true)}
            className="text-xs border-gray-300 gap-1.5"
          >
            <UserCog className="w-3.5 h-3.5 text-purple-600" /> Change Role
          </Button>

          {!isSelf ? (
            <Button
              size="sm"
              variant={user.isActive ? 'destructive' : 'default'}
              onClick={() => setConfirmToggleOpen(true)}
              className="text-xs gap-1.5 shadow-xs"
            >
              <Power className="w-3.5 h-3.5" />
              {user.isActive ? 'Suspend Account' : 'Activate Account'}
            </Button>
          ) : (
            <span className="text-xs text-gray-400 italic px-2">Your Account</span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          Overview & Activity
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'courses'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          {user.role === 'educator' ? 'Authored Courses' : 'Enrolled Courses'} (
          {user.role === 'educator' ? educator?.coursesCreated || 0 : learner?.totalEnrollments || 0})
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'certificates'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-600" />
          Certificates ({learner?.earnedCertificates?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-purple-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Accessibility className="w-3.5 h-3.5 text-teal-600" />
          Settings & Preferences
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ACTIVITY */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Identity & Account Card */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" /> Account Profile
              </h3>

              <dl className="space-y-3.5 text-xs text-gray-700">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Username</dt>
                  <dd className="font-semibold text-gray-900">{profile.username || 'Not set'}</dd>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-semibold text-gray-900">{profile.phoneNumber || 'Not provided'}</dd>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Country</dt>
                  <dd className="font-semibold text-gray-900">{profile.country || 'Not specified'}</dd>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Preferred Language</dt>
                  <dd className="font-semibold uppercase text-gray-900">{profile.preferredLanguage || 'EN'}</dd>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Last Active</dt>
                  <dd className="font-semibold text-gray-900">{formatRelative(user.lastActive)}</dd>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <dt className="text-gray-500">Last Sign-in</dt>
                  <dd className="font-semibold text-gray-900">{user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Not recorded'}</dd>
                </div>
              </dl>

              {profile.bio && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">Bio / Summary</span>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    &ldquo;{profile.bio}&rdquo;
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Activity Column */}
          <div className="space-y-6 lg:col-span-2">
            {learner && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                          <p className="truncate text-xs font-semibold text-gray-900">{l.lessonTitle}</p>
                          <p className="truncate text-[11px] text-gray-500">
                            {l.courseTitle} · viewed {l.viewCount}×
                            {l.timeSpentSeconds > 0 && ` · ${formatDuration(l.timeSpentSeconds)}`}
                          </p>
                        </div>
                        <span className="flex-none text-[11px] text-gray-400">
                          {formatRelative(l.lastViewedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel
                  title="Quiz & Assessment history"
                  isEmpty={learner.quizzes.length === 0}
                  emptyMessage="No quiz attempts recorded."
                >
                  <ul className="divide-y divide-gray-100">
                    {learner.quizzes.map((q) => (
                      <li key={`${q.quizId}-${q.lastAttemptAt}`} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-900">{q.courseTitle}</p>
                          <p className="text-[11px] text-gray-500">
                            {q.attempts} {q.attempts === 1 ? 'attempt' : 'attempts'} ·{' '}
                            {formatRelative(q.lastAttemptAt)}
                          </p>
                        </div>
                        <div className="flex-none text-right">
                          <p className="text-xs font-bold tabular-nums text-gray-900">
                            {q.bestScore != null ? `${q.bestScore}%` : '—'}
                          </p>
                          <p
                            className={`text-[10px] font-semibold capitalize ${
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
            )}

            {!learner && (!educator || educator.coursesCreated === 0) && (
              <Card className="p-12 text-center rounded-2xl border-0 ring-1 ring-gray-200 bg-white">
                <Shield className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900">System Administrator Account</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  This user holds full administrative management privileges across platform governance and users.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COURSES & LEARNING / TEACHING */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {learner && (
            <>
              {/* Learning Overview Strip */}
              <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
                <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
                  <BookOpen className="h-4 w-4 text-blue-600" /> Learning Overview
                </h3>
                <p className="mb-5 text-xs text-gray-500">
                  Progress and time spent across {learner.totalEnrollments}{' '}
                  {learner.totalEnrollments === 1 ? 'course' : 'courses'}
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
              </Card>

              {/* Course Roster Table */}
              <Panel
                title="Course activity & enrollments"
                question="What has this learner worked on?"
                isEmpty={learner.courses.length === 0}
                emptyMessage="This learner has not enrolled in any course."
              >
                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-left font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Course</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Progress</th>
                        <th className="pb-3 pr-4 text-right">Time Spent</th>
                        <th className="pb-3 pr-4 text-right">Last Activity</th>
                        <th className="pb-3 text-right">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {learner.courses.map((c) => (
                        <tr key={c.enrollmentId} className="hover:bg-gray-50">
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-gray-900">{c.courseTitle}</p>
                            <p className="text-[11px] text-gray-500">
                              {c.category ?? 'General'}
                              {c.difficulty ? ` · ${c.difficulty}` : ''}
                            </p>
                          </td>
                          <td className="py-3.5 pr-4">
                            <Badge className={`border capitalize text-[10px] ${ENROLLMENT_STYLES[c.enrollmentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                              {c.enrollmentStatus}
                            </Badge>
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 w-8">{c.progress}%</span>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${c.progress}%` }} />
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {c.lessonsCompleted} of {c.publishedLessons} lessons
                            </p>
                          </td>
                          <td className="py-3.5 pr-4 text-right tabular-nums text-gray-600">
                            {formatDuration(c.learningSeconds)}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-gray-500">
                            {formatRelative(c.lastActivity)}
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {c.completedAt ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {formatDate(c.completedAt)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">In progress</span>
                              )}
                              {c.certificateId && (
                                <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                                  <Award className="h-3 w-3 mr-1" /> Certified
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}

          {educator && educator.coursesCreated > 0 && (
            <>
              {/* Teaching Impact */}
              <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
                <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900">
                  <Users className="h-4 w-4 text-teal-600" /> Teaching Impact & Authored Courses
                </h3>
                <p className="mb-5 text-xs text-gray-500">
                  Outcomes across {educator.coursesCreated} authored {educator.coursesCreated === 1 ? 'course' : 'courses'}
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
                    hint={`${educator.totalMarkedComplete} completed`}
                  />
                  <Stat
                    label="Average progress"
                    value={`${educator.averageProgress}%`}
                    hint={`${educator.certificatesIssued} certs issued`}
                  />
                </div>
              </Card>

              {/* Authored Courses Table */}
              <Panel
                title="Authored course directory"
                question="Performance of courses authored by this user"
                isEmpty={educator.courses.length === 0}
                emptyMessage="No courses authored yet."
              >
                <div className="-mx-6 overflow-x-auto px-6">
                  <table className="w-full min-w-[680px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-left font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Course Title</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4 text-right">Published Lessons</th>
                        <th className="pb-3 pr-4 text-right">Enrolled Students</th>
                        <th className="pb-3 pr-4 text-right">Completion Rate</th>
                        <th className="pb-3 text-right">Avg Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {educator.courses.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="py-3.5 pr-4 font-semibold text-gray-900">{c.title}</td>
                          <td className="py-3.5 pr-4">
                            <Badge className={c.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 pr-4 text-right tabular-nums text-gray-600">
                            {c.publishedLessons}
                          </td>
                          <td className="py-3.5 pr-4 text-right tabular-nums font-bold text-gray-900">
                            {c.enrollments}
                          </td>
                          <td className="py-3.5 pr-4 text-right tabular-nums text-gray-600">
                            {c.markedCompleteRate}% ({c.markedComplete})
                          </td>
                          <td className="py-3.5 text-right tabular-nums font-bold text-purple-700">
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
        </div>
      )}

      {/* TAB 3: CERTIFICATES & ACHIEVEMENTS */}
      {activeTab === 'certificates' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" /> Earned Certificates
                </h3>
                <p className="text-xs text-gray-500">Verified course completion credentials issued to this user.</p>
              </div>
            </div>

            {(!learner?.earnedCertificates || learner.earnedCertificates.length === 0) ? (
              <div className="p-12 text-center">
                <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-gray-900">No certificates earned yet</h4>
                <p className="text-xs text-gray-500 mt-0.5">Certificates will appear here once earned upon 100% course completion.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learner.earnedCertificates.map((cert) => (
                  <div key={cert.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between gap-3 hover:border-purple-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px] font-bold">
                          VERIFIED CREDENTIAL
                        </Badge>
                        <span className="text-[11px] text-gray-400">{formatDate(cert.issuedAt)}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mt-2">{cert.courseTitle}</h4>
                      {cert.referenceCode && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Code: <strong className="text-purple-700">{cert.referenceCode}</strong>
                        </p>
                      )}
                    </div>

                    {cert.referenceCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/verify/${cert.referenceCode}`, '_blank')}
                        className="text-xs w-fit border-gray-300 text-purple-700 hover:bg-purple-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Public Verification Link
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: SETTINGS & PREFERENCES */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
          {/* Accessibility Settings */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 mb-1">
              <Accessibility className="w-5 h-5 text-purple-600" /> Accessibility Profile
            </h3>
            <p className="text-xs text-gray-500 mb-4">Adaptive features and preferences configured by the user.</p>

            {accessibility.hasSavedPreferences ? (
              <div className="space-y-4 text-xs">
                {accessibility.activePreset && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="text-gray-500 block font-semibold uppercase text-[10px]">Active Preset</span>
                    <strong className="text-purple-800 text-sm capitalize">{accessibility.activePreset}</strong>
                  </div>
                )}

                {accessibility.declaredDisability && (
                  <div>
                    <span className="text-gray-400 block uppercase text-[10px] font-semibold">Declared Need</span>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{accessibility.declaredDisability}</p>
                  </div>
                )}

                <div>
                  <span className="text-gray-400 block uppercase text-[10px] font-semibold mb-1.5">Enabled Features</span>
                  {accessibility.enabledFeatures.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {accessibility.enabledFeatures.map((f) => (
                        <Badge key={f.key} variant="outline" className="text-xs bg-gray-50 text-gray-700">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No adaptive toggles active.</p>
                  )}
                </div>

                {accessibility.adaptationTotals.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-gray-400 block uppercase text-[10px] font-semibold mb-2">Adaptations Logged</span>
                    <div className="space-y-1">
                      {accessibility.adaptationTotals.map((a) => (
                        <div key={a.type} className="flex justify-between text-xs">
                          <span className="text-gray-600">{a.label}</span>
                          <strong className="text-gray-900">{a.events} events</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
                No custom accessibility preferences configured.
              </div>
            )}
          </Card>

          {/* Notification Preferences (Read-Only Admin View) */}
          <Card className="p-6 rounded-2xl border-0 shadow-sm ring-1 ring-gray-200 bg-white">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-indigo-600" /> Notification Delivery Preferences
            </h3>
            <p className="text-xs text-gray-500 mb-4">Read-only administrative view of user alert channels.</p>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">In-App Notifications</span>
                <Badge className={notifications?.in_app_notifications !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.in_app_notifications !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Email Notifications</span>
                <Badge className={notifications?.email_notifications !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.email_notifications !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Course & Lesson Updates</span>
                <Badge className={notifications?.course_updates !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.course_updates !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Certificate Notifications</span>
                <Badge className={notifications?.certificate_notifications !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.certificate_notifications !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Achievement & Badge Alerts</span>
                <Badge className={notifications?.achievement_notifications !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.achievement_notifications !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-700">Educator & Feedback Messages</span>
                <Badge className={notifications?.feedback_notifications !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {notifications?.feedback_notifications !== false ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user details. Changes will synchronize immediately across the database and user session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Full Name</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Username</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Phone Number</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Country / Region</Label>
              <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} className="rounded-xl text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Bio</Label>
              <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="rounded-xl text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Edit Modal */}
      {roleModalOpen && (
        <RoleEditModal
          user={{
            id: user.id,
            full_name: user.fullName || user.email,
            email: user.email,
            role: user.role,
          }}
          onClose={() => setRoleModalOpen(false)}
          onSave={handleRoleChange}
          loading={actionLoading}
        />
      )}

      {/* Confirm Suspend/Activate Modal */}
      <ConfirmAction
        title={user.isActive ? 'Suspend User Account' : 'Activate User Account'}
        description={
          user.isActive
            ? `Are you sure you want to suspend access for ${user.fullName || user.email}? They will be immediately blocked from signing in.`
            : `Are you sure you want to restore access for ${user.fullName || user.email}?`
        }
        confirmText={user.isActive ? 'Suspend Account' : 'Activate Account'}
        confirmClassName={
          user.isActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }
        icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        onConfirm={handleToggleStatus}
        open={confirmToggleOpen}
        onOpenChange={setConfirmToggleOpen}
        loading={actionLoading}
        loadingText={user.isActive ? 'Suspending...' : 'Activating...'}
      />
    </div>
  );
}
