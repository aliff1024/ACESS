'use client';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Clock, Check, Lock, Play } from 'lucide-react';

interface CourseDetailPageProps {
  courseId: string;
  onBack: () => void;
  onStartLesson: (lessonId: string) => void;
}

const courseData = {
  '1': {
    title: 'Introduction to Web Accessibility',
    description: 'Learn the fundamentals of making web content accessible to everyone, including people with disabilities. This comprehensive course covers WCAG guidelines, semantic HTML, ARIA attributes, and practical implementation techniques.',
    difficulty: 'Easy',
    category: 'Skills',
    progress: 45,
    totalLessons: 12,
    completedLessons: 5,
    duration: '6 hours',
    tags: ['Accessibility', 'Web Development', 'WCAG', 'Inclusive Design'],
    lessons: [
      { id: 'l1', title: 'Introduction to Web Accessibility', status: 'completed', duration: '25 min' },
      { id: 'l2', title: 'Understanding WCAG Guidelines', status: 'completed', duration: '30 min' },
      { id: 'l3', title: 'Semantic HTML Basics', status: 'completed', duration: '35 min' },
      { id: 'l4', title: 'ARIA Attributes and Roles', status: 'completed', duration: '40 min' },
      { id: 'l5', title: 'Keyboard Navigation', status: 'completed', duration: '30 min' },
      { id: 'l6', title: 'Screen Reader Compatibility', status: 'current', duration: '35 min' },
      { id: 'l7', title: 'Color Contrast and Visual Design', status: 'locked', duration: '30 min' },
      { id: 'l8', title: 'Form Accessibility', status: 'locked', duration: '40 min' },
      { id: 'l9', title: 'Accessible Media Content', status: 'locked', duration: '35 min' },
      { id: 'l10', title: 'Testing for Accessibility', status: 'locked', duration: '30 min' },
      { id: 'l11', title: 'Common Accessibility Issues', status: 'locked', duration: '35 min' },
      { id: 'l12', title: 'Final Project and Certification', status: 'locked', duration: '45 min' },
    ],
  },
};

export function CourseDetailPage({ courseId, onBack, onStartLesson }: CourseDetailPageProps) {
  const course = courseData[courseId as keyof typeof courseData] || courseData['1'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Hard':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLessonIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'current':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getLessonButtonText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Review';
      case 'current':
        return 'Continue';
      case 'locked':
        return 'Locked';
      default:
        return 'Start';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          ← Back to Courses
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-12 h-12 text-blue-600" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${getDifficultyColor(course.difficulty)} border`}>
                  {course.difficulty}
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {course.category}
                </Badge>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <p className="text-xl text-gray-600 leading-relaxed mb-4">{course.description}</p>

              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {course.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-gray-900">Your Progress</span>
              <span className="text-lg font-bold text-blue-600">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-3 mb-2" />
            <p className="text-sm text-gray-600">
              {course.completedLessons} of {course.totalLessons} lessons completed
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Lessons</h2>

          <div className="space-y-3">
            {course.lessons.map((lesson, index) => (
              <Card
                key={lesson.id}
                className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                  lesson.status === 'current'
                    ? 'border-blue-400 bg-blue-50'
                    : lesson.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lesson.status === 'completed'
                        ? 'bg-green-100'
                        : lesson.status === 'current'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {getLessonIcon(lesson.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-500">
                        Lesson {index + 1}
                      </span>
                      {lesson.status === 'current' && (
                        <Badge className="bg-blue-600 text-white text-xs">In Progress</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{lesson.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => onStartLesson(lesson.id)}
                    disabled={lesson.status === 'locked'}
                    className={`${
                      lesson.status === 'current'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : lesson.status === 'completed'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } px-8`}
                  >
                    {getLessonButtonText(lesson.status)}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
