'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Upload, Plus, ArrowLeft, Loader2, X, ChevronDown, ChevronUp, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createCourse, createLesson, uploadThumbnail } from '@/lib/educator-api';
import type { DifficultyLevel } from '@/lib/educator-api';

interface LessonDraft {
  id: string;
  title: string;
  sequence_order: number;
  status: 'draft' | 'published';
  content_html: string;
  video_url: string;
  transcript: string;
  expanded: boolean;
}

function emptyLesson(sequence_order: number): LessonDraft {
  return {
    id: `lesson-${Date.now()}-${sequence_order}`,
    title: `Lesson ${sequence_order}`,
    sequence_order,
    status: 'draft',
    content_html: '',
    video_url: '',
    transcript: '',
    expanded: true,
  };
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [courseData, setCourseData] = useState({
    title: '',
    slug: '',
    description: '',
    thumbnail: '',
    difficulty: 'beginner' as DifficultyLevel,
    category: 'Accessibility',
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published',
  });
  const [tagInput, setTagInput] = useState('');
  const [lessons, setLessons] = useState<LessonDraft[]>([]);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const steps = [
    { number: 1, title: 'Course Information' },
    { number: 2, title: 'Tags & Difficulty' },
    { number: 3, title: 'Lessons' },
    { number: 4, title: 'Publish Settings' },
  ];

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setCourseData({ ...courseData, title, slug: generateSlug(title) });
  };

  const addTag = () => {
    if (tagInput.trim() && !courseData.tags.includes(tagInput.trim())) {
      setCourseData({ ...courseData, tags: [...courseData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setCourseData({ ...courseData, tags: courseData.tags.filter(t => t !== tag) });
  };

  const addLesson = () => {
    setLessons([...lessons, emptyLesson(lessons.length + 1)]);
  };

  const removeLesson = (id: string) => {
    setLessons(lessons.filter(l => l.id !== id).map((l, idx) => ({ ...l, sequence_order: idx + 1 })));
  };

  const toggleLesson = (id: string) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l));
  };

  const updateLesson = (id: string, fields: Partial<LessonDraft>) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, ...fields } : l));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return courseData.title.trim() && courseData.description.trim();
      case 2: return courseData.tags.length > 0;
      case 3: return lessons.length > 0 && lessons.every(l => l.title.trim());
      default: return true;
    }
  };

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

      // Upload thumbnail with real course ID if one was selected
      if (courseData.thumbnail && thumbnailInputRef.current?.files?.[0]) {
        try {
          const thumbnailUrl = await uploadThumbnail(thumbnailInputRef.current.files[0], course.id);
          await supabase.from('courses').update({ thumbnail_url: thumbnailUrl }).eq('id', course.id);
        } catch (err) {
          console.error('Thumbnail upload failed (non-fatal):', err);
        }
      }

      // Persist lessons
      for (const lesson of lessons) {
        try {
          await createLesson(user.user.id, {
            course_id: course.id,
            title: lesson.title,
            content_html: lesson.content_html || '',
            video_url: lesson.video_url || undefined,
            transcript: lesson.transcript || undefined,
            sequence_order: lesson.sequence_order,
            status: lesson.status,
          });
        } catch (err) {
          console.error(`Failed to create lesson "${lesson.title}":`, err);
          toast.error(`Failed to create lesson "${lesson.title}"`);
        }
      }

      toast.success('Course created with lessons!');
      router.push(`/educator/courses/${course.id}`);
    } catch (err) {
      toast.error('Failed to create course');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/educator/courses')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Course</h1>
          <p className="text-gray-600">Follow the steps to set up your course</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep > step.number
                      ? 'bg-green-500 text-white'
                      : currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>{step.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                    <div className={`h-full transition-all ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ width: currentStep > step.number ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 p-8">
          {/* Step 1: Course Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Course Title *</label>
                <input
                  type="text"
                  value={courseData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
            </div>
          )}

          {/* Step 2: Tags & Difficulty */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Course Tags *</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag and press Enter"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addTag} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {courseData.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-blue-900">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">Difficulty Level</label>
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
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">{courseData.title || 'Course Title'}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {courseData.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                    {courseData.difficulty}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Lessons */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Course Lessons</h3>
                  <p className="text-sm text-gray-600">Add lessons with content, video, and transcripts</p>
                </div>
                <button onClick={addLesson} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Lesson
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No lessons added yet</p>
                  <button onClick={addLesson} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Add Your First Lesson
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div
                        onClick={() => toggleLesson(lesson.id)}
                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm shrink-0">
                          {lesson.sequence_order}
                        </div>
                        <input
                          type="text"
                          value={lesson.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                          placeholder="Lesson title"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium shrink-0">Draft</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleLesson(lesson.id); }} className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0">
                          {lesson.expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeLesson(lesson.id); }} className="p-1 hover:bg-red-100 rounded transition-colors shrink-0">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      {/* Expanded body */}
                      {lesson.expanded && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Content</label>
                            <textarea
                              value={lesson.content_html}
                              onChange={(e) => updateLesson(lesson.id, { content_html: e.target.value })}
                              placeholder="Write the lesson content here. Supports HTML formatting (e.g., &lt;strong&gt;bold&lt;/strong&gt;, &lt;em&gt;italic&lt;/em&gt;)."
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Video className="w-3.5 h-3.5 inline mr-1" /> Video URL
                              </label>
                              <input
                                type="url"
                                value={lesson.video_url}
                                onChange={(e) => updateLesson(lesson.id, { video_url: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FileText className="w-3.5 h-3.5 inline mr-1" /> Transcript
                              </label>
                              <input
                                type="url"
                                value={lesson.transcript}
                                onChange={(e) => updateLesson(lesson.id, { transcript: e.target.value })}
                                placeholder="URL to transcript file (optional)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {lessons.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>{lessons.filter(l => l.content_html.trim()).length}/{lessons.length}</strong> lessons have content,{' '}
                    <strong>{lessons.filter(l => l.video_url.trim()).length}</strong> have a video URL,{' '}
                    <strong>{lessons.filter(l => l.transcript.trim()).length}</strong> have a transcript
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Publish Settings */}
          {currentStep === 4 && (
            <div className="space-y-6">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">Course Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Title:</span>
                    <span className="text-blue-900 font-medium">{courseData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Lessons:</span>
                    <span className="text-blue-900 font-medium">{lessons.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Tags:</span>
                    <span className="text-blue-900 font-medium">{courseData.tags.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Difficulty:</span>
                    <span className="text-blue-900 font-medium capitalize">{courseData.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Category:</span>
                    <span className="text-blue-900 font-medium">{courseData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">With Video:</span>
                    <span className="text-blue-900 font-medium">{lessons.filter(l => l.video_url.trim()).length} of {lessons.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">With Transcript:</span>
                    <span className="text-blue-900 font-medium">{lessons.filter(l => l.transcript.trim()).length} of {lessons.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => currentStep === 1 ? router.push('/educator/courses') : setCurrentStep(currentStep - 1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={() => currentStep === 4 ? handleCreate() : setCurrentStep(currentStep + 1)}
              disabled={currentStep < 4 ? !canProceed() : saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : currentStep === 4 ? (
                'Create Course'
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
