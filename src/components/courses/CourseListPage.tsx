'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Filter, BookOpen, Loader2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { fetchAvailableCourses, fetchEnrolledCourses } from '@/lib/learner-api';
import type { AvailableCourse, EnrolledCourse } from '@/lib/learner-api';

interface CourseListPageProps {
  onViewCourse: (courseId: string) => void;
  onBack: () => void;
}

const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];
const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export function CourseListPage({ onViewCourse, onBack }: CourseListPageProps) {
  const [allCourses, setAllCourses] = useState<(AvailableCourse | EnrolledCourse)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  useEffect(() => {
    Promise.all([
      fetchAvailableCourses(),
      fetchEnrolledCourses(),
    ])
      .then(([available, enrolled]) => {
        const combined = [
          ...enrolled.map((e) => ({ ...e, isEnrolled: true as const })),
          ...available,
        ]
        setAllCourses(combined);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'All' ||
      course.difficulty_level?.toLowerCase() === selectedDifficulty.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

  const categories = [...new Set(allCourses.map((c) => c.category).filter(Boolean))] as string[];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            &larr; Back to Dashboard
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
                  <option value="All">All Levels</option>
                  {difficultyLevels.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isEnrolled = 'isEnrolled' in course && course.isEnrolled;
            const progress = isEnrolled ? (course as EnrolledCourse).progress : undefined;
            const lessonCount = isEnrolled
              ? (course as EnrolledCourse).total_lessons
              : (course as AvailableCourse).lesson_count;
            const diffKey = course.difficulty_level?.toLowerCase() || 'beginner';

            return (
              <Card
                key={course.id}
                className="p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-blue-600" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`${difficultyColors[diffKey] || difficultyColors.beginner} border`}>
                    {course.difficulty_level || 'Beginner'}
                  </Badge>
                  {course.category && (
                    <Badge variant="outline" className="text-gray-600">
                      {course.category}
                    </Badge>
                  )}
                  {isEnrolled && (
                    <Badge className="bg-blue-600 text-white">Enrolled</Badge>
                  )}
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
                    <span>{lessonCount} lessons</span>
                  </div>
                </div>

                {progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <div className="mt-auto">
                  <Button
                    onClick={() => onViewCourse(course.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isEnrolled ? 'Continue Course' : 'View Course'}
                  </Button>
                </div>
              </Card>
            );
          })}
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
