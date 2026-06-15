'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Shield, Check, ChevronRight, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadThumbnail, uploadContentImage } from '@/lib/educator-api';
import { createSystemCourse } from '@/lib/admin-api';
import type { DifficultyLevel } from '@/lib/educator-api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ThumbnailPicker } from '@/components/admin/ThumbnailPicker';
import { CourseCardPreview } from '@/components/admin/CourseCardPreview';
import { COURSE_CATEGORIES } from '@/lib/course-thumbnails';
import { COURSE_TEMPLATES, applyCourseTemplate } from '@/lib/course-templates';

const STEPS = [
  { number: 1, title: 'Basics' },
  { number: 2, title: 'Look & Feel' },
  { number: 3, title: 'Publish' },
] as const;

export default function AdminCourseCreate() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const thumbnailFileRef = useRef<File | null>(null);
  const contentScopeId = useMemo(() => `temp-${Date.now()}`, []);

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    difficulty: 'beginner' as DifficultyLevel,
    category: 'Accessibility',
    status: 'draft' as 'draft' | 'published',
    recommended_age_group: '',
    guided_learning_enabled: true,
    tags: [] as string[],
    templateId: 'blank',
  });
  const [tagInput, setTagInput] = useState('');

  const selectedTemplate = COURSE_TEMPLATES.find((t) => t.id === courseData.templateId);

  const handleThumbnailFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploadingThumbnail(true);
    thumbnailFileRef.current = file;
    try {
      const isStock = courseData.thumbnail.startsWith('https://images.unsplash.com');
      if (isStock || !courseData.thumbnail) {
        const url = await uploadThumbnail(file, contentScopeId);
        setCourseData((prev) => ({ ...prev, thumbnail: url }));
      } else {
        const url = await uploadThumbnail(file, contentScopeId);
        setCourseData((prev) => ({ ...prev, thumbnail: url }));
      }
      toast.success('Thumbnail uploaded');
    } catch (err) {
      toast.error('Failed to upload thumbnail');
      console.error(err);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !courseData.tags.includes(tag)) {
      setCourseData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setCourseData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return courseData.title.trim().length > 0 && stripText(courseData.description).length > 0;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const template = COURSE_TEMPLATES.find((t) => t.id === courseData.templateId);
      const thumbnailUrl = courseData.thumbnail || undefined;

      const course = await createSystemCourse(user.user.id, {
        title: courseData.title,
        description: courseData.description,
        status: courseData.status,
        difficulty_level: courseData.difficulty,
        category: courseData.category,
        thumbnail_url: thumbnailUrl,
        recommended_age_group: courseData.recommended_age_group || template?.recommended_age_group || undefined,
        guided_learning_enabled: courseData.guided_learning_enabled,
      });

      if (thumbnailFileRef.current) {
        try {
          const uploaded = await uploadThumbnail(thumbnailFileRef.current, course.id);
          await supabase.from('courses').update({ thumbnail_url: uploaded }).eq('id', course.id);
        } catch (err) {
          console.error('Thumbnail re-upload failed (non-fatal):', err);
        }
      }

      if (courseData.tags.length > 0) {
        await supabase.from('course_tags').insert(
          courseData.tags.map((tag) => ({ course_id: course.id, tag })),
        );
      }

      if (template && template.id !== 'blank') {
        if (template.chapter_organization_enabled) {
          await supabase.from('courses').update({
            chapter_organization_enabled: true,
            category: template.category,
            difficulty_level: template.difficulty,
          }).eq('id', course.id);
        }
        await applyCourseTemplate(course.id, template.id);
      }

      toast.success('System course created! Add content in the course workspace.');
      router.push(`/admin/courses/${course.id}?tab=content`);
    } catch (err) {
      toast.error('Failed to create system course');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/admin/courses')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create System Course</h1>
              <p className="text-sm text-purple-600">Official platform course — step {currentStep} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep > step.number ? 'bg-green-500 text-white'
                    : currentStep === step.number ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                  <div className={`h-full bg-green-500 transition-all ${currentStep > step.number ? 'w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl border-2 border-purple-100 p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={courseData.title}
                    onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                    placeholder="e.g., Introduction to Web Accessibility"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                  <select
                    value={courseData.category}
                    onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {COURSE_CATEGORIES.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Description *</label>
                  <RichTextEditor
                    content={courseData.description}
                    onChange={(html) => setCourseData({ ...courseData, description: html })}
                    placeholder="Describe what learners will gain. Use headings, lists, and images to make it engaging."
                    minHeight="200px"
                    onImageUpload={(file) => uploadContentImage(file, contentScopeId)}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Course Thumbnail</label>
                  <ThumbnailPicker
                    value={courseData.thumbnail}
                    onChange={(url) => {
                      thumbnailFileRef.current = null;
                      setCourseData({ ...courseData, thumbnail: url });
                    }}
                    onFileSelect={handleThumbnailFile}
                    uploading={uploadingThumbnail}
                    accent="purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCourseData({ ...courseData, difficulty: level })}
                        className={`p-4 rounded-lg border-2 transition-all capitalize ${
                          courseData.difficulty === level ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{level}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Tags (optional)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag and press Enter"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button type="button" onClick={addTag} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courseData.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-purple-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-purple-600" />
                    Start from a template (optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COURSE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setCourseData({
                          ...courseData,
                          templateId: template.id,
                          category: template.id === 'blank' ? courseData.category : template.category,
                          difficulty: template.difficulty,
                          guided_learning_enabled: template.guided_learning_enabled ?? courseData.guided_learning_enabled,
                          recommended_age_group: template.recommended_age_group || courseData.recommended_age_group,
                        })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          courseData.templateId === template.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 text-sm">{template.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      </button>
                    ))}
                  </div>
                  {selectedTemplate && selectedTemplate.id !== 'blank' && (
                    <p className="text-xs text-purple-600 mt-2">
                      Template will add {selectedTemplate.chapters?.reduce((n, ch) => n + ch.lessons.length, 0) || selectedTemplate.lessons.length} draft lessons after creation.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Recommended Age Group</label>
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

                <label className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courseData.guided_learning_enabled}
                    onChange={(e) => setCourseData({ ...courseData, guided_learning_enabled: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-900">
                    <span className="font-medium">Enable Guided Learning Mode</span>
                    <p className="text-gray-500 text-xs mt-0.5">Enhanced progress tracking and beginner-friendly navigation</p>
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Course Status</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setCourseData({ ...courseData, status: 'draft' })}
                      className={`p-5 rounded-lg border-2 transition-all text-left ${
                        courseData.status === 'draft' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Save as Draft</p>
                      <p className="text-sm text-gray-600">Build content before going live</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseData({ ...courseData, status: 'published' })}
                      className={`p-5 rounded-lg border-2 transition-all text-left ${
                        courseData.status === 'published' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Publish Now</p>
                      <p className="text-sm text-gray-600">Visible to learners immediately</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/admin/courses')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !canProceed()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create System Course'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <CourseCardPreview
              title={courseData.title}
              description={courseData.description}
              thumbnail={courseData.thumbnail}
              category={courseData.category}
              difficulty={courseData.difficulty}
              guidedLearning={courseData.guided_learning_enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function stripText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
