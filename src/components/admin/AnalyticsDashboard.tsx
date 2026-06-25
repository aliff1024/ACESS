'use client';

import { useState, useEffect } from 'react';
import { Download, TrendingUp, AlertTriangle, Users, Award, Loader2, BookOpen, UserCheck, PlayCircle, BarChart, Settings, Layout } from 'lucide-react';
import { fetchAllAdminAnalytics } from '@/lib/admin-api';
import type { AdminAnalytics, EnrollmentTrend, CompletionTrend, DataTrend } from '@/lib/admin-api';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [trends, setTrends] = useState<EnrollmentTrend[]>([]);
  const [completionTrends, setCompletionTrends] = useState<CompletionTrend[]>([]);
  const [userTrends, setUserTrends] = useState<DataTrend[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<DataTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'system' | 'content'>('overview');

  useEffect(() => {
    fetchAllAdminAnalytics()
      .then((data) => { 
        setAnalytics(data.analytics); 
        setTrends(data.enrollmentTrends); 
        setCompletionTrends(data.completionTrends); 
        setUserTrends(data.userTrends);
        setAgeDistribution(data.ageDistribution);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderBarChart = (data: { label: string; count: number }[], color: string, title: string, subtitle: string) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      {data.length > 0 ? (
        <div className="h-80 flex items-end gap-2">
          {data.map((t) => {
            const maxCount = Math.max(...data.map(x => x.count), 1)
            const heightPct = Math.max((t.count / maxCount) * 100, 4)
            return (
              <div key={t.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-medium text-gray-500">{t.count}</span>
                <div
                  className={`w-full ${color} rounded-t transition-all duration-500 cursor-pointer`}
                  style={{ height: `${heightPct}%`, minHeight: '4px' }}
                  title={`${t.label}: ${t.count}`}
                />
                <span className="text-[10px] text-gray-500 -rotate-45 origin-left whitespace-nowrap">{t.label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
          <div className="text-center">
            <p className="text-gray-600 font-medium">Bar Chart Visualization</p>
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
            <p className="text-gray-600">Platform-wide performance metrics and insights</p>
          </div>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-4 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
          >
            <Layout className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
          >
            <Settings className="w-4 h-4" /> System & Users
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'content' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
          >
            <BookOpen className="w-4 h-4" /> Content & Courses
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.totalActiveLearners?.toLocaleString() ?? '--'}</p>
                <p className="text-sm text-gray-600">Total Active Learners</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.avgCompletionRate != null ? `${analytics.avgCompletionRate}%` : '--'}</p>
                <p className="text-sm text-gray-600">Avg. Completion Rate</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.avgQuizScore != null ? `${analytics.avgQuizScore}%` : '--'}</p>
                <p className="text-sm text-gray-600">Avg. Quiz Score</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.atRiskLearners ?? '--'}</p>
                <p className="text-sm text-gray-600">At-Risk Learners</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderBarChart(
                trends.map(t => ({ label: t.month, count: t.count })), 
                'bg-blue-500 hover:bg-blue-600', 
                'Course Enrollment Trends', 
                'Enrollment trends over time'
              )}

              {renderBarChart(
                completionTrends.map(t => ({ label: t.month, count: t.rate })), 
                'bg-green-500 hover:bg-green-600', 
                'Completion Rate Over Time (%)', 
                'Course completion trends'
              )}
            </div>
          </div>
        )}

        {/* SYSTEM & USERS TAB */}
        {activeTab === 'system' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderBarChart(
                userTrends, 
                'bg-indigo-500 hover:bg-indigo-600', 
                'User Registration Trends', 
                'New users over the last 12 months'
              )}

              {renderBarChart(
                ageDistribution, 
                'bg-rose-500 hover:bg-rose-600', 
                'Age Distribution', 
                'Learner age demographic breakdown'
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Accessibility Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Keyboard Navigation</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{analytics?.accessibilityMetrics?.keyboardNavigation ?? 0}%</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: `${analytics?.accessibilityMetrics?.keyboardNavigation ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">High Contrast Mode</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{analytics?.accessibilityMetrics?.highContrastMode ?? 0}%</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600" style={{ width: `${analytics?.accessibilityMetrics?.highContrastMode ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT & COURSES TAB */}
        {activeTab === 'content' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.totalCourses?.toLocaleString() ?? 0}</p>
                <p className="text-sm text-gray-600">Total Courses Available</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.totalEducators?.toLocaleString() ?? 0}</p>
                <p className="text-sm text-gray-600">Active Educators</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.totalInteractiveActivities?.toLocaleString() ?? 0}</p>
                <p className="text-sm text-gray-600">Interactive Activities</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
