'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Upload, Plus, ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createCourse, uploadThumbnail } from '@/lib/educator-api';
import type { DifficultyLevel } from '@/lib/educator-api';

export default function AdminCourseCreate() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    difficulty: 'beginner' as DifficultyLevel,
    category: 'Accessibility',
    status: 'draft' as 'draft' | 'published',
  });
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    setUploadingThumbnail(true);
    try {
      const url = await uploadThumbnail(file, 'temp-' + Date.now());
      setCourseData({ ...courseData, thumbnail: url });
      toast.success('Thumbnail uploaded');
    } catch (err) {
      toast.error('Failed to upload thumbnail');
      console.error(err);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const course = await createCourse(user.user.id, {
        title: courseData.title,
        description: courseData.description,
        status: courseData.status,
        difficulty_level: courseData.difficulty,
        category: courseData.category,
      });

      if (courseData.thumbnail && thumbnailInputRef.current?.files?.[0]) {
        try {
          const thumbnailUrl = await uploadThumbnail(thumbnailInputRef.current.files[0], course.id);
          await supabase.from('courses').update({ thumbnail_url: thumbnailUrl }).eq('id', course.id);
        } catch (err) {
          console.error('Thumbnail upload failed (non-fatal):', err);
        }
      }

      toast.success('Course created successfully!');
      router.push(`/admin/courses/${course.id}`);
    } catch (err) {
      toast.error('Failed to create course');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/admin/courses')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Courses
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Course</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Course Title *</label>
              <input
                type="text"
                value={courseData.title}
                onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                placeholder="e.g., Introduction to Web Accessibility"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
              <select
                value={courseData.category}
                onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>Accessibility</option>
                <option>Reading & Literacy</option>
                <option>Mathematics</option>
                <option>Study Skills</option>
                <option>Technology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Description *</label>
              <textarea
                value={courseData.description}
                onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                placeholder="Describe what students will learn in this course..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-3 gap-4">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setCourseData({ ...courseData, difficulty: level })}
                    className={`p-4 rounded-lg border-2 transition-all capitalize ${
                      courseData.difficulty === level
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{level}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Course Thumbnail</label>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleThumbnailUpload(file);
                }}
              />
              {courseData.thumbnail ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img src={courseData.thumbnail} alt="Thumbnail preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => {
                      setCourseData({ ...courseData, thumbnail: '' });
                      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white shadow"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                >
                  {uploadingThumbnail ? (
                    <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  )}
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Course Status</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCourseData({ ...courseData, status: 'draft' })}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    courseData.status === 'draft'
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900 mb-1">Save as Draft</p>
                  <p className="text-sm text-gray-600">Work on it later before publishing</p>
                </button>
                <button
                  onClick={() => setCourseData({ ...courseData, status: 'published' })}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    courseData.status === 'published'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900 mb-1">Publish Now</p>
                  <p className="text-sm text-gray-600">Make it available to learners</p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin/courses')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !courseData.title.trim() || !courseData.description.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                'Create Course'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
