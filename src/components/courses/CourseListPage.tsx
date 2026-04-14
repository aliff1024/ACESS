'use client';

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Filter, BookOpen, Clock } from 'lucide-react';
import { Progress } from '../ui/progress';

interface CourseListPageProps {
  onViewCourse: (courseId: string) => void;
  onBack: () => void;
}

const courses = [
  {
    id: '1',
    title: 'Introduction to Web Accessibility',
    description: 'Learn the fundamentals of making web content accessible to everyone, including people with disabilities.',
    difficulty: 'Easy',
    category: 'Skills',
    progress: 45,
    lessons: 12,
    duration: '6 hours',
    isStarted: true,
  },
  {
    id: '2',
    title: 'Reading Comprehension Strategies',
    description: 'Develop effective reading strategies to improve understanding and retention of written material.',
    difficulty: 'Medium',
    category: 'Education',
    progress: 68,
    lessons: 18,
    duration: '8 hours',
    isStarted: true,
  },
  {
    id: '3',
    title: 'Mathematics Fundamentals',
    description: 'Build a strong foundation in mathematical concepts with adaptive learning techniques.',
    difficulty: 'Easy',
    category: 'Education',
    progress: 23,
    lessons: 24,
    duration: '10 hours',
    isStarted: true,
  },
  {
    id: '4',
    title: 'Effective Study Techniques',
    description: 'Master evidence-based study methods that work with your unique learning style.',
    difficulty: 'Easy',
    category: 'Skills',
    progress: 0,
    lessons: 10,
    duration: '4 hours',
    isStarted: false,
  },
  {
    id: '5',
    title: 'Advanced Problem Solving',
    description: 'Develop critical thinking and problem-solving skills through interactive exercises.',
    difficulty: 'Hard',
    category: 'Skills',
    progress: 0,
    lessons: 15,
    duration: '7 hours',
    isStarted: false,
  },
  {
    id: '6',
    title: 'Writing and Communication',
    description: 'Improve your writing skills and learn to communicate ideas clearly and effectively.',
    difficulty: 'Medium',
    category: 'Education',
    progress: 0,
    lessons: 20,
    duration: '9 hours',
    isStarted: false,
  },
];

export function CourseListPage({ onViewCourse, onBack }: CourseListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Courses</h1>
          <p className="text-xl text-gray-600">Explore accessible learning content tailored to your needs</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="h-12 px-4 rounded-lg border border-gray-300 text-gray-900 bg-white"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-12 px-4 rounded-lg border border-gray-300 text-gray-900 bg-white"
              >
                <option value="All">All Categories</option>
                <option value="Skills">Skills</option>
                <option value="Education">Education</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-blue-600" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${getDifficultyColor(course.difficulty)} border`}>
                  {course.difficulty}
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {course.category}
                </Badge>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-snug">
                {course.title}
              </h3>

              <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                {course.description}
              </p>

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

              {course.isStarted && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>
              )}

              <div className="mt-auto">
                <Button
                  onClick={() => onViewCourse(course.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {course.isStarted ? 'Continue Course' : 'View Course'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
