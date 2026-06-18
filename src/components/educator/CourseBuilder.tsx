'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Upload, Plus, ArrowLeft, Loader2, X, FileText, Edit, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { createCourse, createLesson, uploadThumbnail, uploadContentImage } from '@/lib/educator-api'
import { createSystemCourse } from '@/lib/admin-api'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { LessonEditor } from '@/components/educator/LessonEditor'
import { COURSE_CATEGORIES } from '@/lib/course-thumbnails'
import type { DifficultyLevel } from '@/lib/educator-api'
import type { LessonFormData } from '@/components/educator/LessonEditor'

interface CourseDraft {
  title: string
  slug: string
  description: string
  thumbnail: string
  difficulty: DifficultyLevel
  category: string
  tags: string[]
  status: 'draft' | 'published'
  recommended_age_group: string
}

interface LessonDraft {
  id: string
  data: LessonFormData
}

function emptyLessonData(sequence_order: number): LessonFormData {
  return {
    title: `Lesson ${sequence_order}`,
    content_html: '',
    video_url: '',
    transcript: '',
    status: 'draft',
    has_video: true,
    has_pdf: true,
    has_quiz: true,
    has_transcript: true,
    has_summary_activity: false,
    lesson_layout: 'standard',
    simplified_summary: '',
    focus_mode_enabled: false,
    chunked_content_enabled: false,
    checkpoints_enabled: false,
    adaptive_learning_enabled: false,
    estimated_duration: 10,
    summary_source: 'entire_lesson',
    summary_word_target: 100,
    summary_key_points: [],
    summary_reflection_questions: [],
  }
}

interface CourseBuilderProps {
  role: 'educator' | 'admin'
  onComplete?: (courseId: string) => void
  onBack?: () => void
}

export function CourseBuilder({ role, onComplete, onBack }: CourseBuilderProps) {
  const router = useRouter()
  const isAdmin = role === 'admin'
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [courseData, setCourseData] = useState<CourseDraft>({
    title: '',
    slug: '',
    description: '',
    thumbnail: '',
    difficulty: 'beginner',
    category: 'Accessibility',
    tags: [],
    status: 'draft',
    recommended_age_group: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [lessons, setLessons] = useState<LessonDraft[]>([])
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false)
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null)
  const contentScopeId = useMemo(() => `temp-${Date.now()}`, [])

  const steps = [
    { number: 1, title: 'Course Information' },
    { number: 2, title: 'Tags & Difficulty' },
    { number: 3, title: 'Lessons' },
    { number: 4, title: 'Publish Settings' },
  ]

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()

  const handleTitleChange = (title: string) => {
    setCourseData((prev) => ({ ...prev, title, slug: generateSlug(title) }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !courseData.tags.includes(tag)) {
      setCourseData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setCourseData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const addLesson = () => {
    const idx = lessons.length
    const newLesson: LessonDraft = { id: `lesson-${Date.now()}-${idx}`, data: emptyLessonData(idx + 1) }
    setLessons((prev) => [...prev, newLesson])
    setEditingLessonIndex(idx)
    setLessonEditorOpen(true)
  }

  const removeLesson = (id: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  const openLessonEditor = (idx: number) => {
    setEditingLessonIndex(idx)
    setLessonEditorOpen(true)
  }

  const handleLocalSave = () => {
    setLessonEditorOpen(false)
    setEditingLessonIndex(null)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return courseData.title.trim().length > 0 && courseData.description.trim().length > 0
      case 2:
        return courseData.tags.length > 0
      case 3:
        // Lessons are optional — can proceed even with 0 lessons
        return true
      default:
        return true
    }
  }

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    setUploadingThumbnail(true)
    try {
      const url = await uploadThumbnail(file, `temp-${Date.now()}`)
      setCourseData((prev) => ({ ...prev, thumbnail: url }))
      toast.success('Thumbnail uploaded')
    } catch {
      toast.error('Failed to upload thumbnail')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const handleCreate = async () => {
    // If trying to publish with 0 lessons, auto-revert to draft
    let finalStatus = courseData.status
    if (finalStatus === 'published' && lessons.length === 0) {
      toast.warning('Add at least one lesson before publishing. Saving as draft instead.')
      finalStatus = 'draft'
    }

    setSaving(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      let courseId: string

      if (isAdmin) {
        const course = await createSystemCourse(user.user.id, {
          title: courseData.title,
          description: courseData.description,
          status: finalStatus,
          difficulty_level: courseData.difficulty,
          category: courseData.category,
          thumbnail_url: courseData.thumbnail || undefined,
          recommended_age_group: courseData.recommended_age_group || undefined,
        })
        courseId = course.id

        if (courseData.tags.length > 0) {
          await supabase.from('course_tags').insert(
            courseData.tags.map((tag) => ({ course_id: course.id, tag })),
          )
        }
      } else {
        const course = await createCourse(user.user.id, {
          title: courseData.title,
          description: courseData.description,
          status: finalStatus,
          difficulty_level: courseData.difficulty,
          category: courseData.category,
        })
        courseId = course.id

        if (courseData.thumbnail && thumbnailInputRef.current?.files?.[0]) {
          try {
            const thumbnailUrl = await uploadThumbnail(thumbnailInputRef.current.files[0], course.id)
            await supabase.from('courses').update({ thumbnail_url: thumbnailUrl }).eq('id', course.id)
          } catch (err) {
            console.error('Thumbnail upload failed (non-fatal):', err)
          }
        }
      }

      // Create lessons (if any)
      for (const lesson of lessons) {
        try {
          await createLesson(user.user.id, {
            course_id: courseId,
            title: lesson.data.title,
            content_html: lesson.data.content_html || '',
            video_url: lesson.data.video_url || undefined,
            transcript: lesson.data.transcript || undefined,
            sequence_order: lessons.indexOf(lesson) + 1,
            status: lesson.data.status,
          })
        } catch (err) {
          console.error(`Failed to create lesson "${lesson.data.title}":`, err)
          toast.error(`Failed to create lesson "${lesson.data.title}"`)
        }
      }

      toast.success(isAdmin ? 'System course created!' : 'Course created!')
      const redirect = isAdmin ? `/admin/courses/${courseId}?tab=content` : `/educator/courses/${courseId}`
      if (onComplete) {
        onComplete(courseId)
      } else {
        router.push(redirect)
      }
    } catch (err) {
      toast.error('Failed to create course')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Preview Card ──────────────────────────────────────────────────────
  const PreviewCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
      <div className="flex items-center gap-2 mb-4 text-gray-500">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">Course Preview</span>
      </div>

      {/* Thumbnail */}
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4">
        {courseData.thumbnail ? (
          <img src={courseData.thumbnail} alt="Course thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
        {courseData.title || 'Untitled Course'}
      </h3>

      {/* Category */}
      <p className="text-sm text-gray-500 mb-3">{courseData.category}</p>

      {/* Tags */}
      {courseData.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {courseData.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Difficulty + Age Group */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
          {courseData.difficulty}
        </span>
        {courseData.recommended_age_group && (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
            Ages {courseData.recommended_age_group}
          </span>
        )}
      </div>

      {/* Lesson count */}
      <div className="flex items-center gap-2 text-sm text-gray-500 pt-3 border-t border-gray-100">
        <FileText className="w-4 h-4" />
        <span>{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack || (() => router.push(isAdmin ? '/admin/courses' : '/educator/courses'))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'Create System Course' : 'Create New Course'}
          </h1>
          <p className="text-gray-600">Follow the steps to set up your course</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
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
                  <span className={`text-sm font-medium hidden sm:block ${
                    currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>{step.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                    <div className={`h-full transition-all ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`}
                      style={{ width: currentStep > step.number ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-8">
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
                    onChange={(e) => setCourseData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                    onChange={(html) => setCourseData((prev) => ({ ...prev, description: html }))}
                    placeholder="Describe what learners will gain..."
                    minHeight="200px"
                    onImageUpload={(file) => uploadContentImage(file, contentScopeId)}
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
                      const file = e.target.files?.[0]
                      if (file) handleThumbnailUpload(file)
                    }}
                  />
                  {courseData.thumbnail ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img src={courseData.thumbnail} alt="Thumbnail preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => {
                          setCourseData((prev) => ({ ...prev, thumbnail: '' }))
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
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
                      <span key={tag} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-gray-900">&times;</button>
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
                        onClick={() => setCourseData((prev) => ({ ...prev, difficulty: level }))}
                        className={`p-4 rounded-lg border-2 transition-all capitalize ${
                          courseData.difficulty === level ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{level}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Recommended Age Group</label>
                  <select
                    value={courseData.recommended_age_group}
                    onChange={(e) => setCourseData((prev) => ({ ...prev, recommended_age_group: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Ages</option>
                    <option value="5-7">Ages 5-7</option>
                    <option value="8-10">Ages 8-10</option>
                    <option value="11-13">Ages 11-13</option>
                    <option value="14-17">Ages 14-17</option>
                    <option value="18+">Ages 18+</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Lessons */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Course Lessons</h3>
                    <p className="text-sm text-gray-600">Add lessons with content, video, and interactive activities</p>
                  </div>
                  <button onClick={addLesson} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Lesson
                  </button>
                </div>

                {lessons.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No lessons added yet</p>
                    <p className="text-sm text-gray-500 mb-4">You can skip this step and add lessons later</p>
                    <button onClick={addLesson} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      Add Your First Lesson
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{lesson.data.title}</p>
                          <p className="text-xs text-gray-500">
                            {lesson.data.content_html ? 'Has content' : 'No content'} &middot;{' '}
                            {lesson.data.video_url ? 'Has video' : 'No video'}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium shrink-0">Draft</span>
                        <button onClick={() => openLessonEditor(idx)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0" title="Edit lesson">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => removeLesson(lesson.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors shrink-0" title="Remove lesson">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {lessons.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <strong>{lessons.filter((l) => l.data.content_html.trim()).length}/{lessons.length}</strong> lessons have content,{' '}
                      <strong>{lessons.filter((l) => l.data.video_url.trim()).length}</strong> have a video URL,{' '}
                      <strong>{lessons.filter((l) => l.data.transcript.trim()).length}</strong> have a transcript
                    </p>
                  </div>
                )}

                {editingLessonIndex !== null && lessons[editingLessonIndex] && (
                  <LessonEditor
                    open={lessonEditorOpen}
                    onClose={handleLocalSave}
                    courseId=""
                    localMode
                    localData={lessons[editingLessonIndex].data}
                    onLocalChange={(data) => {
                      setLessons((prev) => prev.map((l, i) => (i === editingLessonIndex ? { ...l, data } : l)))
                    }}
                    onLocalSave={handleLocalSave}
                  />
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
                      onClick={() => setCourseData((prev) => ({ ...prev, status: 'draft' }))}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${
                        courseData.status === 'draft' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Save as Draft</p>
                      <p className="text-sm text-gray-600">Work on it later before publishing</p>
                    </button>
                    <button
                      onClick={() => setCourseData((prev) => ({ ...prev, status: 'published' }))}
                      className={`p-6 rounded-lg border-2 transition-all text-left ${
                        courseData.status === 'published' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 mb-1">Publish Now</p>
                      <p className="text-sm text-gray-600">Make it available to learners immediately</p>
                    </button>
                  </div>
                  {lessons.length === 0 && (
                    <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                      <span>⚠</span> You need at least one lesson to publish. Selecting "Publish Now" will save as draft instead.
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-4">Course Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Title:</span>
                      <span className="text-blue-900 font-medium">{courseData.title || '(not set)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Category:</span>
                      <span className="text-blue-900 font-medium">{courseData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Difficulty:</span>
                      <span className="text-blue-900 font-medium capitalize">{courseData.difficulty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Age Group:</span>
                      <span className="text-blue-900 font-medium">{courseData.recommended_age_group || 'All Ages'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Tags:</span>
                      <span className="text-blue-900 font-medium">{courseData.tags.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Lessons:</span>
                      <span className="text-blue-900 font-medium">{lessons.length}</span>
                    </div>
                    {lessons.length > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-blue-700">With Video:</span>
                          <span className="text-blue-900 font-medium">{lessons.filter((l) => l.data.video_url.trim()).length} of {lessons.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">With Transcript:</span>
                          <span className="text-blue-900 font-medium">{lessons.filter((l) => l.data.transcript.trim()).length} of {lessons.length}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (currentStep === 1) {
                    if (onBack) onBack()
                    else router.push(isAdmin ? '/admin/courses' : '/educator/courses')
                  } else {
                    setCurrentStep(currentStep - 1)
                  }
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {currentStep < steps.length ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={saving || !canProceed()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    isAdmin ? 'Create System Course' : 'Create Course'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column — Preview */}
          <div className="hidden lg:block">
            <PreviewCard />
          </div>
        </div>
      </div>
    </div>
  )
}