'use client';

import { useState, useEffect } from 'react';
import { Download, TrendingUp, AlertTriangle, Users, Award, Loader2 } from 'lucide-react';
import { fetchAdminAnalytics, fetchEnrollmentTrends, fetchCompletionTrends } from '@/lib/admin-api';
import type { AdminAnalytics, EnrollmentTrend, CompletionTrend } from '@/lib/admin-api';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [trends, setTrends] = useState<EnrollmentTrend[]>([]);
  const [completionTrends, setCompletionTrends] = useState<CompletionTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdminAnalytics(),
      fetchEnrollmentTrends(),
      fetchCompletionTrends(),
    ])
      .then(([a, t, c]) => { setAnalytics(a); setTrends(t); setCompletionTrends(c); })
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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
            <p className="text-gray-600">Platform-wide performance metrics and insights</p>
          </div>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.totalActiveLearners?.toLocaleString() ?? 0}</p>
            <p className="text-sm text-gray-600">Total Active Learners</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.avgCompletionRate ?? 0}%</p>
            <p className="text-sm text-gray-600">Avg. Completion Rate</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.avgQuizScore ?? 0}%</p>
            <p className="text-sm text-gray-600">Avg. Quiz Score</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{analytics?.atRiskLearners ?? 0}</p>
            <p className="text-sm text-gray-600">At-Risk Learners</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Enrollment Trends</h3>
            {trends.length > 0 ? (
              <div className="h-80 flex items-end gap-2">
                {trends.map((t) => {
                  const maxCount = Math.max(...trends.map(x => x.count), 1)
                  const heightPct = Math.max((t.count / maxCount) * 100, 4)
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] font-medium text-gray-500">{t.count}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                        style={{ height: `${heightPct}%`, minHeight: '4px' }}
                        title={`${t.month}: ${t.count} enrollments`}
                      />
                      <span className="text-[10px] text-gray-500 -rotate-45 origin-left whitespace-nowrap">{t.month}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-80 bg-blue-50 rounded-lg flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Bar Chart Visualization</p>
                  <p className="text-sm text-gray-500 mt-2">Enrollment trends over time</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Completion Rate Over Time</h3>
            {completionTrends.length > 0 ? (
              <div className="h-80 flex items-end gap-2">
                {completionTrends.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-medium text-gray-500">{t.rate}%</span>
                    <div
                      className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer relative group"
                      style={{ height: `${Math.max(t.rate, 4)}%`, minHeight: '4px' }}
                      title={`${t.month}: ${t.rate}% (${t.completed}/${t.total})`}
                    />
                    <span className="text-[10px] text-gray-500 -rotate-45 origin-left whitespace-nowrap">{t.month}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 bg-blue-50 rounded-lg flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Bar Chart Visualization</p>
                  <p className="text-sm text-gray-500 mt-2">Course completion trends</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Accessibility Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Screen Reader Usage</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{analytics?.accessibilityMetrics?.screenReaderUsage ?? 0}%</p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${analytics?.accessibilityMetrics?.screenReaderUsage ?? 0}%` }} />
              </div>
            </div>
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
    </div>
  );
}
