'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, Award, Activity, TrendingUp, ArrowRight, Loader2, School } from 'lucide-react';
import { fetchAdminDashboardStats, fetchRecentActivity, getInstructorApplicationStats } from '@/lib/admin-api';
import type { AdminDashboardStats, RecentActivity } from '@/lib/admin-api';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [instructorStats, setInstructorStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); }, 60000);
    Promise.all([fetchAdminDashboardStats(), fetchRecentActivity(), getInstructorApplicationStats()])
      .then(([s, a, i]) => { setStats(s); setActivities(a); setInstructorStats(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const overviewCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      change: `+${stats?.newUsersThisMonth ?? 0} this month`,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
      trend: 'up',
    },
    {
      label: 'Total Courses',
      value: stats?.totalCourses ?? 0,
      change: `+${stats?.coursesPublishedThisMonth ?? 0} this month`,
      icon: BookOpen,
      color: 'bg-green-100 text-green-700',
      trend: 'up',
    },
    {
      label: 'Certificates Issued',
      value: stats?.totalCertificates ?? 0,
      change: 'All time',
      icon: Award,
      color: 'bg-purple-100 text-purple-700',
      trend: 'neutral',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers ?? 0,
      change: 'Currently active',
      icon: Activity,
      color: 'bg-amber-100 text-amber-700',
      trend: 'neutral',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'Review user accounts and permissions',
      action: () => onNavigate('users'),
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      title: 'Review Courses',
      description: 'Approve pending course submissions',
      action: () => onNavigate('courses'),
      icon: BookOpen,
      color: 'bg-green-600',
    },
    {
      title: 'View Reports',
      description: 'Generate platform analytics reports',
      action: () => onNavigate('reports'),
      icon: TrendingUp,
      color: 'bg-purple-600',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return { icon: Users, color: 'bg-blue-100 text-blue-700' };
      case 'course_submission': return { icon: BookOpen, color: 'bg-green-100 text-green-700' };
      case 'certificate_issued': return { icon: Award, color: 'bg-purple-100 text-purple-700' };
      default: return { icon: Activity, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Admin</h2>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your platform today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {overviewCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {card.trend === 'up' && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-xs text-gray-500 mt-2">{card.change}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={action.action}
                  className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                    {action.title}
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
            <button
              onClick={() => onNavigate('instructor-applications')}
              className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <School className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                Educator Applications
                {instructorStats.pending > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    {instructorStats.pending} pending
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </h4>
              <p className="text-sm text-gray-600">
                {instructorStats.pending > 0
                  ? `${instructorStats.pending} applications need review`
                  : 'No pending applications'}
              </p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Platform Activity</h3>
          <div className="space-y-4">
            {activities.map((activity, idx) => {
              const { icon: Icon, color } = getActivityIcon(activity.type);
              return (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600">{activity.user_name}</p>
                  </div>
                  <span className="text-sm text-gray-500 flex-shrink-0">{timeAgo(activity.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
