import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { BookOpen, Clock } from 'lucide-react';

interface MyCoursesSectionProps {
  onContinue: (courseTitle: string) => void;
}

export function MyCoursesSection({ onContinue }: MyCoursesSectionProps) {
  const courses = [
    {
      title: 'Introduction to Web Accessibility',
      progress: 45,
      lessons: 12,
      completedLessons: 5,
      timeRemaining: '2h 30m',
      color: 'blue',
    },
    {
      title: 'Reading Comprehension Strategies',
      progress: 68,
      lessons: 18,
      completedLessons: 12,
      timeRemaining: '1h 45m',
      color: 'purple',
    },
    {
      title: 'Mathematics Fundamentals',
      progress: 23,
      lessons: 24,
      completedLessons: 6,
      timeRemaining: '4h 15m',
      color: 'green',
    },
    {
      title: 'Effective Study Techniques',
      progress: 92,
      lessons: 10,
      completedLessons: 9,
      timeRemaining: '20m',
      color: 'orange',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Courses in Progress</h2>
          <p className="text-gray-600">Continue where you left off</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.map((course, index) => (
          <Card
            key={index}
            className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
          >
            <div className="mb-4">
              <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-blue-600" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">
                {course.title}
              </h3>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <span>{course.completedLessons}/{course.lessons} lessons</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.timeRemaining} left</span>
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

              <Button
                onClick={() => onContinue(course.title)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
