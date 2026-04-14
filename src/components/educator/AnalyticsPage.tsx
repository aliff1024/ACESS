'use client';

import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { TrendingUp, TrendingDown, Users, BookOpen, Award, Target } from 'lucide-react';

export function AnalyticsPage() {
  const courseAnalytics = [
    {
      title: 'Introduction to Web Accessibility',
      enrolled: 89,
      completed: 67,
      avgCompletion: 84,
      avgScore: 87,
      completionTrend: 'up',
    },
    {
      title: 'Reading Comprehension Strategies',
      enrolled: 67,
      completed: 42,
      avgCompletion: 72,
      avgScore: 79,
      completionTrend: 'down',
    },
    {
      title: 'Inclusive Design Principles',
      enrolled: 45,
      completed: 28,
      avgCompletion: 68,
      avgScore: 82,
      completionTrend: 'up',
    },
  ];

  const lessonAnalytics = [
    { lesson: 'What is Web Accessibility?', avgScore: 90, completionRate: 98 },
    { lesson: 'WCAG Guidelines Overview', avgScore: 85, completionRate: 95 },
    { lesson: 'Semantic HTML Basics', avgScore: 88, completionRate: 92 },
    { lesson: 'ARIA Attributes', avgScore: 82, completionRate: 89 },
    { lesson: 'Screen Reader Compatibility', avgScore: 80, completionRate: 86 },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600 mt-1">Track performance and engagement across your courses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Enrollments</p>
              <p className="text-3xl font-bold text-gray-900">247</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">+12% this month</p>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completions</p>
              <p className="text-3xl font-bold text-gray-900">137</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">+8% this month</p>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">78%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-red-600">
            <TrendingDown className="w-4 h-4" />
            <p className="text-sm font-semibold">-3% this month</p>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Quiz Score</p>
              <p className="text-3xl font-bold text-gray-900">83%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">+5% this month</p>
          </div>
        </Card>
      </div>

      <Card className="p-8 rounded-2xl border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h3>
        <div className="space-y-6">
          {courseAnalytics.map((course, index) => (
            <div key={index} className="p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h4>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Enrolled</p>
                      <p className="text-xl font-bold text-gray-900">{course.enrolled}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-gray-900">{course.completed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                      <p className="text-xl font-bold text-gray-900">
                        {Math.round((course.completed / course.enrolled) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    course.completionTrend === 'up'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {course.completionTrend === 'up' ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span className="font-semibold">
                    {course.completionTrend === 'up' ? 'Trending Up' : 'Trending Down'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-600">Average Completion</p>
                    <p className="text-lg font-bold text-gray-900">{course.avgCompletion}%</p>
                  </div>
                  <Progress value={course.avgCompletion} className="h-3" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-600">Average Score</p>
                    <p className="text-lg font-bold text-gray-900">{course.avgScore}%</p>
                  </div>
                  <Progress value={course.avgScore} className="h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 rounded-2xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Performing Lessons</h3>
          <div className="space-y-4">
            {lessonAnalytics.map((lesson, index) => (
              <div key={index} className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="font-semibold text-gray-900 flex-1">{lesson.lesson}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-green-700">{lesson.avgScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-700">{lesson.completionRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 rounded-2xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Engagement Insights</h3>
          <div className="space-y-4">
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Peak Activity Time</p>
                  <p className="text-xl font-bold text-gray-900">6 PM - 9 PM</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Most students are active in the evening hours</p>
            </div>

            <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Time per Lesson</p>
                  <p className="text-xl font-bold text-gray-900">28 minutes</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Students spend adequate time on content</p>
            </div>

            <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quiz Retry Rate</p>
                  <p className="text-xl font-bold text-gray-900">32%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Students are motivated to improve their scores</p>
            </div>

            <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Certificate Downloads</p>
                  <p className="text-xl font-bold text-gray-900">94%</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">High engagement with completion rewards</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
