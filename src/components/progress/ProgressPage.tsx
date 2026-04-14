import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Award, TrendingUp, Target } from 'lucide-react';

interface ProgressPageProps {
  onViewCourseProgress: (courseId: string) => void;
  onBrowseCourses: () => void;
}

const coursesData = [
  {
    id: '1',
    title: 'Introduction to Web Accessibility',
    progress: 100,
    status: 'completed',
    lessonsCompleted: 12,
    totalLessons: 12,
    averageScore: 85,
    completionDate: 'March 15, 2026',
  },
  {
    id: '2',
    title: 'Reading Comprehension Strategies',
    progress: 68,
    status: 'inProgress',
    lessonsCompleted: 12,
    totalLessons: 18,
    averageScore: 78,
    completionDate: null,
  },
  {
    id: '3',
    title: 'Mathematics Fundamentals',
    progress: 23,
    status: 'inProgress',
    lessonsCompleted: 6,
    totalLessons: 24,
    averageScore: 72,
    completionDate: null,
  },
  {
    id: '4',
    title: 'Effective Study Techniques',
    progress: 100,
    status: 'completed',
    lessonsCompleted: 10,
    totalLessons: 10,
    averageScore: 92,
    completionDate: 'March 28, 2026',
  },
  {
    id: '5',
    title: 'Digital Literacy Essentials',
    progress: 45,
    status: 'inProgress',
    lessonsCompleted: 7,
    totalLessons: 15,
    averageScore: 80,
    completionDate: null,
  },
];

export function ProgressPage({ onViewCourseProgress, onBrowseCourses }: ProgressPageProps) {
  const enrolledCourses = coursesData.length;
  const completedCourses = coursesData.filter((c) => c.status === 'completed').length;
  const totalScore = coursesData.reduce((sum, c) => sum + c.averageScore, 0);
  const averageScore = Math.round(totalScore / coursesData.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Progress</h1>
          <p className="text-xl text-gray-600">Track your learning journey and achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-blue-600 text-white">Total</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">Courses Enrolled</p>
            <p className="text-5xl font-bold text-gray-900">{enrolledCourses}</p>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
                <Award className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-green-600 text-white">Completed</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">Courses Completed</p>
            <p className="text-5xl font-bold text-gray-900">{completedCourses}</p>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-purple-600 text-white">Score</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">Average Score</p>
            <p className="text-5xl font-bold text-gray-900">{averageScore}%</p>
          </Card>
        </div>

        <Card className="p-8 rounded-2xl border-2 border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Course Progress</h2>
            <Button onClick={onBrowseCourses} variant="outline" className="border-blue-600 text-blue-600">
              Browse More Courses
            </Button>
          </div>

          <div className="space-y-4">
            {coursesData.map((course) => (
              <div
                key={course.id}
                className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                      {course.status === 'completed' ? (
                        <Badge className="bg-green-600 text-white">Completed</Badge>
                      ) : (
                        <Badge className="bg-blue-600 text-white">In Progress</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>
                        Lessons: {course.lessonsCompleted}/{course.totalLessons}
                      </span>
                      <span>Average Score: {course.averageScore}%</span>
                      {course.completionDate && (
                        <span>Completed: {course.completionDate}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => onViewCourseProgress(course.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-4"
                  >
                    View Details
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {course.progress}%
                      </span>
                    </div>
                    <Progress value={course.progress} className="h-3" />
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-gray-200 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{course.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {completedCourses === 0 && (
          <Card className="p-8 rounded-2xl border-2 border-blue-200 bg-blue-50 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Keep Going!</h3>
              <p className="text-gray-700 mb-4">
                Complete your first course to earn a certificate and unlock achievements.
              </p>
              <Button onClick={onBrowseCourses} className="bg-blue-600 hover:bg-blue-700 text-white">
                Continue Learning
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
