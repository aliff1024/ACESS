'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createCourse } from '@/lib/educator-api';
import type { DifficultyLevel } from '@/lib/educator-api';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCourseModal({ isOpen, onClose }: CreateCourseModalProps) {
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [category, setCategory] = useState('Accessibility');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!courseTitle.trim()) { toast.error('Course title is required'); return }
    if (!courseDescription.trim()) { toast.error('Course description is required'); return }
    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const course = await createCourse(user.user.id, {
        title: courseTitle,
        description: courseDescription,
        status: 'draft',
        difficulty_level: difficulty,
        category,
      });

      toast.success('Course created! Now add lessons and quizzes.');
      onClose();
      setCourseTitle('');
      setCourseDescription('');
      router.push(`/educator/courses/${course.id}`);
    } catch (err) {
      toast.error('Failed to create course');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl mb-2">Create New Course</DialogTitle>
          <DialogDescription className="text-gray-600">
            Set up your course details. You can add lessons and quizzes after creation.
          </DialogDescription>
        </DialogHeader>

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
            <label className="block text-sm font-semibold text-gray-900 mb-2">Course Description *</label>
            <Textarea
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="Provide a clear and concise description of what learners will gain"
              rows={5}
              className="text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none text-base"
            >
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
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`p-4 rounded-lg font-semibold capitalize border-2 transition-all ${
                    difficulty === level
                      ? 'border-purple-600 bg-purple-50 text-purple-600'
                      : 'border-gray-300 text-gray-600 hover:border-purple-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="px-8 py-6">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSaving || !courseTitle || !courseDescription}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 ml-auto"
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><CheckCircle className="w-5 h-5 mr-2" /> Create Course</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
