'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Plus, BookOpen, FileText, HelpCircle, X, CheckCircle } from 'lucide-react';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
  onAddLesson: () => void;
  onAddQuiz: () => void;
}

type Step = 'details' | 'lessons' | 'review';

export function CreateCourseModal({
  isOpen,
  onClose,
  onPublish,
  onAddLesson,
  onAddQuiz,
}: CreateCourseModalProps) {
  const [step, setStep] = useState<Step>('details');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [lessons, setLessons] = useState<{ title: string; hasQuiz: boolean }[]>([]);

  const handleAddLesson = () => {
    onAddLesson();
  };

  const handleNext = () => {
    if (step === 'details') {
      setStep('lessons');
    } else if (step === 'lessons') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'lessons') {
      setStep('details');
    } else if (step === 'review') {
      setStep('lessons');
    }
  };

  const handlePublish = () => {
    onPublish();
    onClose();
    setCourseTitle('');
    setCourseDescription('');
    setLessons([]);
    setStep('details');
  };

  const mockLessons = [
    { title: 'What is Web Accessibility?', hasQuiz: true },
    { title: 'WCAG Guidelines Overview', hasQuiz: true },
    { title: 'Semantic HTML Basics', hasQuiz: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl mb-2">Create New Course</DialogTitle>
          <DialogDescription className="text-gray-600">
            Follow the steps to create and publish your course
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'details'
                  ? 'bg-purple-600 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              {step === 'details' ? '1' : <CheckCircle className="w-5 h-5" />}
            </div>
            <span className={`text-sm font-semibold ${step === 'details' ? 'text-purple-600' : 'text-gray-900'}`}>
              Course Details
            </span>
          </div>

          <div className="w-16 h-1 bg-gray-300"></div>

          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'lessons'
                  ? 'bg-purple-600 text-white'
                  : step === 'review'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {step === 'review' ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span className={`text-sm font-semibold ${step === 'lessons' ? 'text-purple-600' : 'text-gray-900'}`}>
              Add Content
            </span>
          </div>

          <div className="w-16 h-1 bg-gray-300"></div>

          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
            >
              3
            </div>
            <span className={`text-sm font-semibold ${step === 'review' ? 'text-purple-600' : 'text-gray-600'}`}>
              Review & Publish
            </span>
          </div>
        </div>

        {step === 'details' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Course Title *</label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g., Introduction to Web Accessibility"
                className="text-lg py-6"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Course Description *
              </label>
              <Textarea
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="Provide a clear and concise description of what learners will gain from this course"
                rows={5}
                className="text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
              <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-base">
                <option>Accessibility</option>
                <option>Reading & Literacy</option>
                <option>Mathematics</option>
                <option>Study Skills</option>
                <option>Technology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-3">
                <button className="p-4 border-2 border-purple-600 bg-purple-50 rounded-lg font-semibold text-purple-600">
                  Beginner
                </button>
                <button className="p-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-600 hover:border-purple-600 hover:bg-purple-50 hover:text-purple-600">
                  Intermediate
                </button>
                <button className="p-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-600 hover:border-purple-600 hover:bg-purple-50 hover:text-purple-600">
                  Advanced
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'lessons' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Add Lessons and Quizzes</p>
                <p className="text-sm text-gray-600">
                  Each lesson should contain educational content. You can add a quiz after each lesson to test
                  understanding.
                </p>
              </div>
            </div>

            {mockLessons.length > 0 && (
              <div className="space-y-3">
                {mockLessons.map((lesson, index) => (
                  <div key={index} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lesson.title}</p>
                        <p className="text-sm text-gray-600">
                          {lesson.hasQuiz ? 'Includes quiz' : 'No quiz'}
                        </p>
                      </div>
                    </div>
                    <button className="text-red-600 hover:bg-red-50 p-2 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleAddLesson}
                variant="outline"
                className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 py-6"
              >
                <FileText className="w-5 h-5 mr-2" />
                Add Lesson
              </Button>
              <Button
                onClick={onAddQuiz}
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-6"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Add Quiz
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{courseTitle || 'Untitled Course'}</h3>
              <p className="text-gray-700 mb-4">
                {courseDescription || 'No description provided'}
              </p>
              <div className="flex gap-4">
                <span className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold">
                  Accessibility
                </span>
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                  Beginner
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">Course Content</h4>
              <div className="space-y-2">
                {mockLessons.map((lesson, index) => (
                  <div key={index} className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center gap-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{lesson.title}</p>
                    </div>
                    {lesson.hasQuiz && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        Quiz
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Total: {mockLessons.length} lessons
              </p>
            </div>

            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Ready to publish!</span> Once published, students will be able to
                enroll in this course. You can always edit the course content later.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          {step !== 'details' && (
            <Button onClick={handleBack} variant="outline" className="px-8 py-6">
              Back
            </Button>
          )}
          {step !== 'review' ? (
            <Button
              onClick={handleNext}
              disabled={step === 'details' && (!courseTitle || !courseDescription)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 ml-auto"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 ml-auto"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Publish Course
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
