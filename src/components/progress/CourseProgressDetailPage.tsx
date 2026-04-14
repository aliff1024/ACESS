import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { CheckCircle, PlayCircle, Lock, Trophy, TrendingUp } from 'lucide-react';

interface CourseProgressDetailPageProps {
  courseId: string;
  onBack: () => void;
  onGenerateCertificate: (courseId: string) => void;
  onStartLesson: (lessonId: string) => void;
}

const courseData = {
  '1': {
    id: '1',
    title: 'Introduction to Web Accessibility',
    description: 'Learn the fundamentals of creating accessible web content for all users',
    progress: 100,
    status: 'completed',
    completionDate: 'March 15, 2026',
    lessons: [
      { id: 'l1', title: 'What is Web Accessibility?', status: 'completed', score: 90 },
      { id: 'l2', title: 'WCAG Guidelines Overview', status: 'completed', score: 85 },
      { id: 'l3', title: 'Semantic HTML Basics', status: 'completed', score: 88 },
      { id: 'l4', title: 'ARIA Attributes', status: 'completed', score: 82 },
      { id: 'l5', title: 'Keyboard Navigation', status: 'completed', score: 95 },
      { id: 'l6', title: 'Screen Reader Compatibility', status: 'completed', score: 80 },
      { id: 'l7', title: 'Color Contrast Requirements', status: 'completed', score: 92 },
      { id: 'l8', title: 'Forms and Labels', status: 'completed', score: 87 },
      { id: 'l9', title: 'Images and Alternative Text', status: 'completed', score: 84 },
      { id: 'l10', title: 'Testing for Accessibility', status: 'completed', score: 89 },
      { id: 'l11', title: 'Common Accessibility Mistakes', status: 'completed', score: 78 },
      { id: 'l12', title: 'Building Accessible Components', status: 'completed', score: 86 },
    ],
  },
  '2': {
    id: '2',
    title: 'Reading Comprehension Strategies',
    description: 'Develop effective reading techniques for better understanding and retention',
    progress: 68,
    status: 'inProgress',
    completionDate: null,
    lessons: [
      { id: 'l1', title: 'Active Reading Techniques', status: 'completed', score: 88 },
      { id: 'l2', title: 'Identifying Main Ideas', status: 'completed', score: 75 },
      { id: 'l3', title: 'Making Inferences', status: 'completed', score: 82 },
      { id: 'l4', title: 'Understanding Context Clues', status: 'completed', score: 79 },
      { id: 'l5', title: 'Summarizing Text', status: 'completed', score: 85 },
      { id: 'l6', title: 'Critical Reading Skills', status: 'completed', score: 72 },
      { id: 'l7', title: 'Reading Different Text Types', status: 'completed', score: 80 },
      { id: 'l8', title: 'Vocabulary Building', status: 'completed', score: 76 },
      { id: 'l9', title: 'Note-Taking Strategies', status: 'completed', score: 83 },
      { id: 'l10', title: 'Speed Reading Basics', status: 'completed', score: 70 },
      { id: 'l11', title: 'Reading Comprehension Practice', status: 'completed', score: 78 },
      { id: 'l12', title: 'Analyzing Arguments', status: 'completed', score: 74 },
      { id: 'l13', title: 'Reading for Research', status: 'inProgress', score: null },
      { id: 'l14', title: 'Digital Reading Skills', status: 'locked', score: null },
      { id: 'l15', title: 'Reading Assessment Strategies', status: 'locked', score: null },
      { id: 'l16', title: 'Advanced Comprehension', status: 'locked', score: null },
      { id: 'l17', title: 'Reading in Different Subjects', status: 'locked', score: null },
      { id: 'l18', title: 'Final Reading Assessment', status: 'locked', score: null },
    ],
  },
};

export function CourseProgressDetailPage({
  courseId,
  onBack,
  onGenerateCertificate,
  onStartLesson,
}: CourseProgressDetailPageProps) {
  const course = courseData[courseId as keyof typeof courseData] || courseData['1'];

  const completedLessons = course.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = course.lessons.length;
  const averageScore =
    Math.round(
      course.lessons
        .filter((l) => l.score !== null)
        .reduce((sum, l) => sum + (l.score || 0), 0) / completedLessons
    ) || 0;

  const isCompleted = course.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2">
          ← Back to Progress
        </button>

        {isCompleted && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  🎉 Congratulations! You have completed this course.
                </h3>
                <p className="text-gray-700">You're now ready to receive your certificate of completion.</p>
              </div>
              <Button
                onClick={() => onGenerateCertificate(course.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              >
                Generate Certificate
              </Button>
            </div>
          </div>
        )}

        <Card className="p-8 rounded-2xl border-2 border-gray-200 mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-lg text-gray-600">{course.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-gray-900">{course.progress}%</p>
                </div>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lessons Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedLessons}/{totalLessons}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson Breakdown</h2>
            <div className="space-y-3">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-xl border-2 flex items-center gap-4 ${
                    lesson.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : lesson.status === 'inProgress'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        lesson.status === 'completed'
                          ? 'bg-green-600'
                          : lesson.status === 'inProgress'
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}
                    >
                      {lesson.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : lesson.status === 'inProgress' ? (
                        <PlayCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-white" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Lesson {index + 1}: {lesson.title}
                        </h3>
                        {lesson.status === 'completed' && (
                          <Badge className="bg-green-600 text-white">Completed</Badge>
                        )}
                        {lesson.status === 'inProgress' && (
                          <Badge className="bg-blue-600 text-white">In Progress</Badge>
                        )}
                        {lesson.status === 'locked' && (
                          <Badge className="bg-gray-400 text-white">Locked</Badge>
                        )}
                      </div>
                      {lesson.score !== null && (
                        <p className="text-sm text-gray-600">Quiz Score: {lesson.score}%</p>
                      )}
                    </div>

                    {lesson.status !== 'locked' && (
                      <Button
                        onClick={() => onStartLesson(lesson.id)}
                        variant={lesson.status === 'completed' ? 'outline' : 'default'}
                        className={
                          lesson.status === 'completed'
                            ? 'border-green-600 text-green-600'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }
                      >
                        {lesson.status === 'completed' ? 'Review' : 'Start'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
