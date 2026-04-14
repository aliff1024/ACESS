'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BookOpen, Users, TrendingUp, AlertTriangle, Plus, ArrowRight } from 'lucide-react';

interface EducatorDashboardOverviewProps {
  onCreateCourse: () => void;
  onViewCourses: () => void;
  onViewStudents: () => void;
}

export function EducatorDashboardOverview({
  onCreateCourse,
  onViewCourses,
  onViewStudents,
}: EducatorDashboardOverviewProps) {
  const recentActivity = [
    { type: 'enrollment', student: 'Emma Davis', course: 'Introduction to Web Accessibility', time: '2 hours ago' },
    { type: 'completion', student: 'Michael Chen', course: 'Reading Comprehension Strategies', time: '5 hours ago' },
    { type: 'quiz', student: 'Sarah Miller', course: 'Introduction to Web Accessibility', score: 92, time: '1 day ago' },
    { type: 'enrollment', student: 'James Wilson', course: 'Reading Comprehension Strategies', time: '1 day ago' },
  ];

  const atRiskStudents = [
    { name: 'Alex Thompson', course: 'Introduction to Web Accessibility', progress: 23, lastActive: '5 days ago' },
    { name: 'Maria Garcia', course: 'Reading Comprehension Strategies', progress: 35, lastActive: '3 days ago' },
    { name: 'David Lee', course: 'Introduction to Web Accessibility', progress: 18, lastActive: '1 week ago' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, Prof. Johnson!</h2>
          <p className="text-gray-600 mt-1">Here's what's happening with your courses today</p>
        </div>
        <Button onClick={onCreateCourse} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 text-lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Students Enrolled</p>
              <p className="text-3xl font-bold text-gray-900">247</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-3xl font-bold text-gray-900">78%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">At-Risk Learners</p>
              <p className="text-3xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'enrollment'
                      ? 'bg-blue-100 text-blue-600'
                      : activity.type === 'completion'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  {activity.type === 'enrollment' ? (
                    <Users className="w-5 h-5" />
                  ) : activity.type === 'completion' ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{activity.student}</span>{' '}
                    {activity.type === 'enrollment'
                      ? 'enrolled in'
                      : activity.type === 'completion'
                      ? 'completed'
                      : 'scored'}{' '}
                    {activity.type === 'quiz' && <span className="font-semibold">{activity.score}% on</span>}{' '}
                    <span className="text-purple-600">{activity.course}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">At-Risk Learners</h3>
            </div>
            <Button
              onClick={onViewStudents}
              variant="ghost"
              className="text-orange-600 hover:text-orange-700"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Students who haven't been active recently or are struggling with progress
          </p>
          <div className="space-y-3">
            {atRiskStudents.map((student, index) => (
              <div key={index} className="p-4 bg-white border-2 border-orange-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                    {student.progress}% Complete
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{student.course}</p>
                <p className="text-xs text-gray-500">Last active: {student.lastActive}</p>
              </div>
            ))}
          </div>
          <Button onClick={onViewStudents} className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white">
            Reach Out to Students
          </Button>
        </Card>
      </div>

      <Card className="p-6 rounded-2xl border-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Your Courses</h3>
          <Button onClick={onViewCourses} variant="ghost" className="text-purple-600 hover:text-purple-700">
            View All Courses <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Introduction to Web Accessibility',
              students: 89,
              completion: 84,
              status: 'published',
            },
            {
              title: 'Reading Comprehension Strategies',
              students: 67,
              completion: 72,
              status: 'published',
            },
            {
              title: 'Advanced ARIA Techniques',
              students: 0,
              completion: 0,
              status: 'draft',
            },
          ].map((course, index) => (
            <div key={index} className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    course.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {course.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-3">{course.title}</h4>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{course.students} students</span>
                {course.status === 'published' && <span>{course.completion}% avg completion</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
