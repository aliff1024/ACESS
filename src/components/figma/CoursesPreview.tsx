'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Clock } from 'lucide-react';

export function CoursesPreview() {
  const courses = [
    {
      title: 'Introduction to Web Accessibility',
      difficulty: 'Easy',
      progress: 45,
      duration: '4 hours',
      lessons: 12,
      color: 'green',
    },
    {
      title: 'Reading Comprehension Strategies',
      difficulty: 'Medium',
      progress: 68,
      duration: '6 hours',
      lessons: 18,
      color: 'blue',
    },
    {
      title: 'Advanced Math Problem Solving',
      difficulty: 'Hard',
      progress: 23,
      duration: '8 hours',
      lessons: 24,
      color: 'purple',
    },
    {
      title: 'Effective Study Techniques',
      difficulty: 'Easy',
      progress: 92,
      duration: '3 hours',
      lessons: 10,
      color: 'green',
    },
  ];

  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700 border-green-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Hard: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <section className="py-20 px-6 bg-gray-50" id="courses">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Popular Courses
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our accessible learning courses designed for diverse learning needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <Card
              key={index}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="mb-4">
                <Badge
                  className={`${difficultyColors[course.difficulty as keyof typeof difficultyColors]} border mb-3`}
                >
                  {course.difficulty}
                </Badge>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">
                  {course.title}
                </h3>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.lessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  View Course
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Browse All Courses
          </Button>
        </div>
      </div>
    </section>
  );
}
