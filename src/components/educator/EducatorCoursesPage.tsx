'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BookOpen, Users, BarChart3, Edit, Trash2, Eye, Plus } from 'lucide-react';

interface EducatorCoursesPageProps {
  onCreateCourse: () => void;
  onEditCourse: (courseId: string) => void;
  onViewCourse: (courseId: string) => void;
}

const courses = [
  {
    id: '1',
    title: 'Introduction to Web Accessibility',
    description: 'Learn the fundamentals of creating accessible web content for all users',
    status: 'published',
    students: 89,
    lessons: 12,
    avgCompletion: 84,
    avgScore: 87,
    lastUpdated: 'March 28, 2026',
  },
  {
    id: '2',
    title: 'Reading Comprehension Strategies',
    description: 'Develop effective reading techniques for better understanding and retention',
    status: 'published',
    students: 67,
    lessons: 18,
    avgCompletion: 72,
    avgScore: 79,
    lastUpdated: 'March 25, 2026',
  },
  {
    id: '3',
    title: 'Advanced ARIA Techniques',
    description: 'Master complex ARIA patterns for dynamic web applications',
    status: 'draft',
    students: 0,
    lessons: 8,
    avgCompletion: 0,
    avgScore: 0,
    lastUpdated: 'April 1, 2026',
  },
  {
    id: '4',
    title: 'Inclusive Design Principles',
    description: 'Create designs that work for everyone, regardless of ability',
    status: 'published',
    students: 45,
    lessons: 10,
    avgCompletion: 68,
    avgScore: 82,
    lastUpdated: 'March 20, 2026',
  },
];

export function EducatorCoursesPage({ onCreateCourse, onEditCourse, onViewCourse }: EducatorCoursesPageProps) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          <p className="text-gray-600 mt-1">Manage and track all your courses</p>
        </div>
        <Button onClick={onCreateCourse} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 text-lg">
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-all">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-10 h-10 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{course.title}</h3>
                      <Badge
                        className={
                          course.status === 'published'
                            ? 'bg-green-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }
                      >
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{course.description}</p>
                    <p className="text-sm text-gray-500">Last updated: {course.lastUpdated}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{course.students}</p>
                  </div>

                  <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <p className="text-xs text-gray-600">Lessons</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{course.lessons}</p>
                  </div>

                  {course.status === 'published' && (
                    <>
                      <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-gray-600">Avg Completion</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{course.avgCompletion}%</p>
                      </div>

                      <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-orange-600" />
                          <p className="text-xs text-gray-600">Avg Score</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{course.avgScore}%</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => onEditCourse(course.id)}
                    variant="outline"
                    className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Course
                  </Button>
                  <Button
                    onClick={() => onViewCourse(course.id)}
                    variant="outline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View as Learner
                  </Button>
                  <Button variant="ghost" className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
