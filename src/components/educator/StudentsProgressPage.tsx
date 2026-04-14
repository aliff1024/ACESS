'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Users, TrendingUp, AlertTriangle, Mail, Search } from 'lucide-react';
import { Input } from '../ui/input';

const students = [
  {
    id: '1',
    name: 'Emma Davis',
    email: 'emma.davis@example.com',
    courses: [
      { title: 'Introduction to Web Accessibility', progress: 92, avgScore: 88, status: 'on-track' },
      { title: 'Reading Comprehension Strategies', progress: 78, avgScore: 82, status: 'on-track' },
    ],
    lastActive: '2 hours ago',
    totalProgress: 85,
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    courses: [
      { title: 'Introduction to Web Accessibility', progress: 100, avgScore: 94, status: 'completed' },
      { title: 'Inclusive Design Principles', progress: 65, avgScore: 76, status: 'on-track' },
    ],
    lastActive: '5 hours ago',
    totalProgress: 82,
  },
  {
    id: '3',
    name: 'Alex Thompson',
    email: 'alex.thompson@example.com',
    courses: [
      { title: 'Introduction to Web Accessibility', progress: 23, avgScore: 58, status: 'at-risk' },
    ],
    lastActive: '5 days ago',
    totalProgress: 23,
  },
  {
    id: '4',
    name: 'Sarah Miller',
    email: 'sarah.miller@example.com',
    courses: [
      { title: 'Introduction to Web Accessibility', progress: 88, avgScore: 92, status: 'on-track' },
      { title: 'Reading Comprehension Strategies', progress: 95, avgScore: 89, status: 'on-track' },
    ],
    lastActive: '1 hour ago',
    totalProgress: 91,
  },
  {
    id: '5',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    courses: [
      { title: 'Reading Comprehension Strategies', progress: 35, avgScore: 64, status: 'at-risk' },
    ],
    lastActive: '3 days ago',
    totalProgress: 35,
  },
  {
    id: '6',
    name: 'David Lee',
    email: 'david.lee@example.com',
    courses: [
      { title: 'Introduction to Web Accessibility', progress: 18, avgScore: 52, status: 'at-risk' },
    ],
    lastActive: '1 week ago',
    totalProgress: 18,
  },
];

export function StudentsProgressPage() {
  const atRiskCount = students.filter((s) => s.courses.some((c) => c.status === 'at-risk')).length;
  const activeCount = students.filter((s) => !s.lastActive.includes('day') && !s.lastActive.includes('week')).length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Students Progress</h2>
        <p className="text-gray-600 mt-1">Monitor and support your students' learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Today</p>
              <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">At-Risk Students</p>
              <p className="text-3xl font-bold text-gray-900">{atRiskCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 rounded-2xl border-2 border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">All Students</h3>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search students..." className="pl-10 w-80" />
            </div>
            <select className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none">
              <option>All Status</option>
              <option>On Track</option>
              <option>At Risk</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {students.map((student) => {
            const isAtRisk = student.courses.some((c) => c.status === 'at-risk');
            return (
              <div
                key={student.id}
                className={`p-6 rounded-2xl border-2 ${
                  isAtRisk
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {student.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{student.name}</h4>
                        {isAtRisk && (
                          <Badge className="bg-orange-600 text-white">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            At Risk
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{student.email}</p>
                      <p className="text-sm text-gray-500">Last active: {student.lastActive}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                    <p className="text-3xl font-bold text-gray-900">{student.totalProgress}%</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {student.courses.map((course, index) => (
                    <div key={index} className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{course.title}</p>
                        <Badge
                          className={
                            course.status === 'completed'
                              ? 'bg-green-600 text-white'
                              : course.status === 'at-risk'
                              ? 'bg-orange-600 text-white'
                              : 'bg-blue-600 text-white'
                          }
                        >
                          {course.status === 'completed'
                            ? 'Completed'
                            : course.status === 'at-risk'
                            ? 'At Risk'
                            : 'On Track'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Course Progress</p>
                          <Progress value={course.progress} className="h-2" />
                          <p className="text-sm font-semibold text-gray-900 mt-1">{course.progress}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Average Score</p>
                          <p className="text-2xl font-bold text-gray-900">{course.avgScore}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
