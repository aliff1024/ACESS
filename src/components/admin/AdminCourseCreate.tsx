'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ArrowLeft, Loader2, X, Shield, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createCourse, uploadThumbnail } from '@/lib/educator-api';
import { createSystemCourse } from '@/lib/admin-api';
import type { DifficultyLevel } from '@/lib/educator-api';

interface AdminCourseCreateProps {
  courseType: 'educator' | 'system';
}

export default function AdminCourseCreate({ courseType }: AdminCourseCreateProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isSystem = courseType === 'system';
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    difficulty: 'beginner' as DifficultyLevel,
    category: 'Accessibility',
    status: 'draft' as 'draft' | 'published',
    recommended_age_group: '',
    guided_learning_enabled: isSystem,
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

      let courseId: string;

      if (isSystem) {
        const course = await createSystemCourse(user.user.id, {
          title: courseData.title,
          description: courseData.description,
          status: courseData.status,
          difficulty_level: courseData.difficulty,
          category: courseData.category,
          thumbnail_url: courseData.thumbnail || undefined,
          recommended_age_group: courseData.recommended_age_group || undefined,
          guided_learning_enabled: courseData.guided_learning_enabled,
        });
        courseId = course.id;
      } else {
        const course = await createCourse(user.user.id, {
          title: courseData.title,
          description: courseData.description,
          status: courseData.status,
          difficulty_level: courseData.difficulty,
          category: courseData.category,
        });
        courseId = course.id;

        if (courseData.thumbnail && thumbnailInputRef.current?.files?.[0]) {
          try {
            const thumbnailUrl = await uploadThumbnail(thumbnailInputRef.current.files[0], course.id);
            await supabase.from('courses').update({ thumbnail_url: thumbnailUrl }).eq('id', course.id);
          } catch (err) {
            console.error('Thumbnail upload failed (non-fatal):', err);
          }
        }
      }

      toast.success(isSystem ? 'System course created successfully!' : 'Course created successfully!');
      router.push(`/admin/courses/${courseId}`);
    } catch (err) {
      toast.error(isSystem ? 'Failed to create system course' : 'Failed to create course');
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

        <div className={`bg-white rounded-xl border-2 p-8 ${isSystem ? 'border-purple-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-8">
            {isSystem ? (
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isSystem ? 'Create System Course' : 'Create New Course'}
              </h1>
              {isSystem && (
                <p className="text-sm text-purple-600 mt-1">
                  This will be an official built-in platform course managed by admins
                </p>
              )}
            </div>
          </div>

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

            {/* System course only fields */}
            {isSystem && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Recommended Age Group
                  </label>
                  <select
                    value={courseData.recommended_age_group}
                    onChange={(e) => setCourseData({ ...courseData, recommended_age_group: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">All Ages</option>
                    <option value="5-7">Ages 5-7</option>
                    <option value="8-10">Ages 8-10</option>
                    <option value="11-13">Ages 11-13</option>
                    <option value="14-17">Ages 14-17</option>
                    <option value="18+">Ages 18+</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    id="guidedLearning"
                    checked={courseData.guided_learning_enabled}
                    onChange={(e) => setCourseData({ ...courseData, guided_learning_enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="guidedLearning" className="text-sm text-gray-900">
                    <span className="font-medium">Enable Guided Learning Mode</span>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Provides enhanced progress tracking, milestones, and beginner-friendly navigation for learners
                    </p>
                  </label>
                </div>
              </>
            )}

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
              className={`px-6 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                isSystem ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                isSystem ? 'Create System Course' : 'Create Course'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
