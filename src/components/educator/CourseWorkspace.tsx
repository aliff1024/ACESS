'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, BookOpen, FileText, Users, Settings, Plus, Loader2,
  Globe, EyeOff, Eye, ChevronUp, ChevronDown,
  Edit, Trash2, Upload, FileText as FileIcon, X, Download,
  CheckCircle, FileType,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchCourseById,
  fetchLessonsWithQuizzes,
  createLesson,
  updateLesson,
  deleteLesson,
  createLessonAsset,
  deleteLessonAsset,
  uploadCourseFile,
  uploadThumbnail,
  fetchLessonAssets,
  fetchQuizWithQuestions,
  deleteQuiz,
  createFullQuiz,
  updateCourseStatus,
  getNextSequenceOrder,
  fetchLessonById,
} from '@/lib/educator-api';
import type { LessonWithQuiz, LessonAsset, CourseStatus, LessonFields } from '@/lib/educator-api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import CourseAssets from './CourseAssets';
import PublishValidationModal from './PublishValidationModal';
import StudentProgressView from './StudentProgressView';

interface CourseWorkspaceProps {
  courseId: string;
  onBack: () => void;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  difficulty_level: string;
  category: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

interface QuizQuestionForm {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizOptionData {
  id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
}

interface QuizQuestionData {
  id: string;
  question_text: string;
  question_type: string;
  sequence_order: number;
  quiz_options: QuizOptionData[];
}

// ─── Sub-components ──────────────────────────────────────────────────────

function PdfUploadButton({ lessonId, uploadingPdfFor, onUpload }: {
  lessonId: string;
  uploadingPdfFor: string | null;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingPdfFor === lessonId;
  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      <Button variant="outline" size="sm" disabled={isUploading}
        onClick={() => inputRef.current?.click()} className="text-xs px-3 py-1 h-7">
        {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
        Upload PDF
      </Button>
    </>
  );
}

function LessonCard({ lesson, assets, onEdit, onDelete, onMoveUp, onMoveDown, onPdfUpload, onAssetDelete, onQuizEdit, onQuizDelete, onQuizAdd, uploadingPdfFor, isFirst, isLast }: {
  lesson: LessonWithQuiz;
  assets: LessonAsset[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPdfUpload: (file: File) => void;
  onAssetDelete: (assetId: string) => void;
  onQuizEdit: () => void;
  onQuizDelete: () => void;
  onQuizAdd: () => void;
  uploadingPdfFor: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [showPdfPreview, setShowPdfPreview] = useState<string | null>(null);
  return (
    <Card className="p-6 border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
            {lesson.sequence_order}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{lesson.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={lesson.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {lesson.status}
              </Badge>
              {lesson.has_quiz && <Badge className="bg-blue-100 text-blue-800">Quiz</Badge>}
              {assets.length > 0 && <Badge className="bg-orange-100 text-orange-800">{assets.length} file{assets.length > 1 ? 's' : ''}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst} className="h-8 w-8 p-0"><ChevronUp className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast} className="h-8 w-8 p-0"><ChevronDown className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">PDF Files</h4>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileIcon className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span className="text-sm text-orange-800 truncate">{asset.title || 'Untitled PDF'}</span>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowPdfPreview(showPdfPreview === asset.id ? null : asset.id)} className="h-6 w-6 p-0"><Eye className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(asset.url, '_blank')} className="h-6 w-6 p-0"><Download className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onAssetDelete(asset.id)} className="h-6 w-6 p-0 text-red-600"><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          {showPdfPreview && (
            <Dialog open={!!showPdfPreview} onOpenChange={() => setShowPdfPreview(null)}>
              <DialogContent className="sm:max-w-4xl max-h-[90vh]">
                <DialogHeader><DialogTitle>PDF Preview: {assets.find(a => a.id === showPdfPreview)?.title || 'Untitled PDF'}</DialogTitle></DialogHeader>
                <div className="w-full h-[70vh]">
                  <iframe src={assets.find(a => a.id === showPdfPreview)?.url} className="w-full h-full border rounded-lg" title="PDF Preview" />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <PdfUploadButton lessonId={lesson.id} uploadingPdfFor={uploadingPdfFor} onUpload={onPdfUpload} />
        {lesson.has_quiz ? (
          <>
            <Button variant="outline" size="sm" onClick={onQuizEdit} className="text-xs px-3 py-1 h-7">Edit Quiz</Button>
            <Button variant="outline" size="sm" onClick={onQuizDelete} className="text-xs px-3 py-1 h-7 text-red-600 border-red-200">Remove Quiz</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onQuizAdd} className="text-xs px-3 py-1 h-7">Add Quiz</Button>
        )}
      </div>
    </Card>
  );
}

export default function CourseWorkspace({ courseId, onBack }: CourseWorkspaceProps) {
  const router = useRouter();
  const { enterPreview } = useAuth();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'assets' | 'students' | 'settings'>('lessons');

  // Lesson modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');

  // PDF upload
  const [uploadingPdfFor, setUploadingPdfFor] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, LessonAsset[]>>({});

  // Quiz modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionForm[]>([]);
  const [quizSaving, setQuizSaving] = useState(false);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Overview editing
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewDesc, setOverviewDesc] = useState('');
  const [savingOverview, setSavingOverview] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        fetchCourseById(courseId),
        fetchLessonsWithQuizzes(courseId),
      ]);
      setCourse(c);
      setLessons(l);
      setOverviewTitle(c.title);
      setOverviewDesc(c.description);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load() }, [load]);

  const loadAssets = async (lessonId: string) => {
    try {
      const a = await fetchLessonAssets(lessonId);
      setAssets((prev) => ({ ...prev, [lessonId]: a }));
    } catch {}
  };

  useEffect(() => {
    for (const l of lessons) { loadAssets(l.id) }
  }, [lessons]);

  // ─── Lesson handlers ──────────────────────────────────────────────────

  const openNewLesson = () => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonContent('');
    setLessonModalOpen(true);
  };

  const openEditLesson = async (lessonId: string) => {
    try {
      const lesson = await fetchLessonById(lessonId);
      setEditingLessonId(lessonId);
      setLessonTitle(lesson.title);
      setLessonContent(lesson.content_html || '');
      setLessonModalOpen(true);
    } catch {
      toast.error('Failed to load lesson');
    }
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim()) { toast.error('Lesson title is required'); return }
    setLessonSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      if (editingLessonId) {
        await updateLesson(editingLessonId, { title: lessonTitle, content_html: lessonContent } as Partial<LessonFields>);
        toast.success('Lesson updated');
      } else {
        const seq = await getNextSequenceOrder(courseId);
        await createLesson(user.user.id, { course_id: courseId, title: lessonTitle, content_html: lessonContent, sequence_order: seq, status: 'published' });
        toast.success('Lesson added');
      }
      setLessonModalOpen(false);
      load();
    } catch {
      toast.error('Failed to save lesson');
    } finally {
      setLessonSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson and all its quizzes? This cannot be undone.')) return;
    try {
      await deleteLesson(lessonId);
      toast.success('Lesson deleted');
      load();
    } catch { toast.error('Failed to delete lesson') }
  };

  const handlePdfUpload = async (lessonId: string, file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return }
    setUploadingPdfFor(lessonId);
    try {
      const url = await uploadCourseFile(file, courseId, lessonId);
      await createLessonAsset(lessonId, 'pdf', file.name, url);
      toast.success('PDF uploaded');
      loadAssets(lessonId);
    } catch { toast.error('Failed to upload PDF') }
    finally { setUploadingPdfFor(null) }
  };

  const handleDeleteAsset = async (assetId: string, lessonId: string) => {
    try {
      await deleteLessonAsset(assetId);
      loadAssets(lessonId);
      toast.success('Asset removed');
    } catch { toast.error('Failed to delete asset') }
  };

  // ─── Quiz handlers ────────────────────────────────────────────────────

  const openNewQuiz = (lessonId: string) => {
    setQuizId(null);
    setQuizLessonId(lessonId);
    setQuizTitle(`Quiz for ${lessons.find((l) => l.id === lessonId)?.title || 'Lesson'}`);
    setQuizQuestions([{ id: '1', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]);
    setQuizModalOpen(true);
  };

  const openEditQuiz = async (lessonId: string) => {
    try {
      const data = await fetchQuizWithQuestions(lessonId);
      const quiz = data as unknown as { id: string; title: string; quiz_questions: QuizQuestionData[] } | null;
      if (!quiz) { openNewQuiz(lessonId); return }
      setQuizId(quiz.id);
      setQuizLessonId(lessonId);
      setQuizTitle(quiz.title || `Quiz for ${lessons.find((l) => l.id === lessonId)?.title || 'Lesson'}`);
      setQuizQuestions((quiz.quiz_questions || []).sort((a, b) => a.sequence_order - b.sequence_order).map((question) => ({
        id: question.id, question: question.question_text,
        options: [...question.quiz_options.sort((a, b) => a.sequence_order - b.sequence_order).map((opt) => opt.option_text), '', '', '', ''].slice(0, 4),
        correctAnswer: question.quiz_options.findIndex((opt) => opt.is_correct) ?? 0,
        explanation: '',
      })));
      setQuizModalOpen(true);
    } catch { openNewQuiz(lessonId) }
  };

  const saveQuiz = async () => {
    if (!quizLessonId) { toast.error('No lesson selected'); return }
    if (!quizTitle.trim()) { toast.error('Quiz title is required'); return }
    const validQuestions = quizQuestions.filter((q) => q.question.trim() && q.options.filter((opt: string) => opt.trim()).length >= 2);
    if (validQuestions.length === 0) { toast.error('At least one complete question is required'); return }
    for (const q of validQuestions) {
      const filled = q.options.filter((opt: string) => opt.trim());
      if (q.correctAnswer >= filled.length) { toast.error('Each question must have a correct answer selected'); return }
    }
    setQuizSaving(true);
    try {
      const existingQuizId = quizId || lessons.find((l) => l.id === quizLessonId)?.quiz_id;
      if (existingQuizId) await deleteQuiz(existingQuizId);
      await createFullQuiz({ lesson_id: quizLessonId, title: quizTitle }, validQuestions.map((q: QuizQuestionForm, i: number) => ({
        question_text: q.question, question_type: 'multiple_choice', sequence_order: i + 1,
        options: q.options.filter((o: string) => o.trim()).map((opt: string, oi: number) => ({ option_text: opt, is_correct: oi === q.correctAnswer, sequence_order: oi + 1 })),
      })));
      toast.success('Quiz saved!');
      setQuizModalOpen(false);
      setQuizId(null);
      load();
    } catch { toast.error('Failed to save quiz') }
    finally { setQuizSaving(false) }
  };

  const handleDeleteQuiz = async (lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson?.quiz_id) return;
    if (!confirm('Delete this quiz?')) return;
    try { await deleteQuiz(lesson.quiz_id); toast.success('Quiz deleted'); load() }
    catch { toast.error('Failed to delete quiz') }
  };

  // ─── Reordering ──────────────────────────────────────────────────────

  const moveLesson = async (lessonId: string, direction: 'up' | 'down') => {
    const idx = lessons.findIndex(l => l.id === lessonId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= lessons.length) return;
    try {
      await updateLesson(lessonId, { sequence_order: lessons[newIdx].sequence_order } as Partial<LessonFields>);
      await updateLesson(lessons[newIdx].id, { sequence_order: lessons[idx].sequence_order } as Partial<LessonFields>);
      toast.success('Lesson order updated');
      load();
    } catch { toast.error('Failed to reorder') }
  };

  // ─── Publish ─────────────────────────────────────────────────────────

  const togglePublish = async () => {
    if (!course) return;
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await updateCourseStatus(courseId, newStatus);
      toast.success(newStatus === 'published' ? 'Course published!' : 'Course unpublished');
      load();
    } catch { toast.error('Failed to update status') }
  };

  // ─── Overview Save ────────────────────────────────────────────────────

  const saveOverview = async () => {
    setSavingOverview(true);
    try {
      await updateCourseStatus(courseId, course.status);
      await supabase.from('courses').update({ title: overviewTitle, description: overviewDesc }).eq('id', courseId);
      toast.success('Course updated');
      load();
    } catch { toast.error('Failed to save') }
    finally { setSavingOverview(false) }
  };

  // ─── Thumbnail Upload ──────────────────────────────────────────────────

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    setUploadingThumbnail(true);
    try {
      const url = await uploadThumbnail(file, courseId);
      await supabase.from('courses').update({ thumbnail_url: url }).eq('id', courseId);
      setCourse((prev) => prev ? { ...prev, thumbnail_url: url } : prev);
      toast.success('Thumbnail updated');
    } catch (err) {
      toast.error('Failed to upload thumbnail');
      console.error(err);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!course) {
    return <div className="p-8 text-center"><p className="text-xl mb-4">Course not found</p><Button onClick={onBack}>Back to Courses</Button></div>;
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BookOpen },
    { id: 'lessons' as const, label: 'Lessons', icon: FileText },
    { id: 'assets' as const, label: 'Assets', icon: FileType },
    { id: 'students' as const, label: 'Students', icon: Users },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const isPublished = course.status === 'published';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Courses
          </button>
          <div className="flex items-center gap-3">
            <Button onClick={() => { enterPreview('learner'); router.push(`/learner/courses/${courseId}`); }} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Eye className="w-4 h-4 mr-2" /> Preview as Learner
            </Button>
            {isPublished ? (
              <Button onClick={togglePublish} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <EyeOff className="w-4 h-4 mr-2" /> Unpublish
              </Button>
            ) : (
              <Button onClick={() => setShowPublishModal(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <Globe className="w-4 h-4 mr-2" /> Publish
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <Badge className={isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}>
                <Icon className="w-5 h-5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* ─── Overview Tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Course Overview</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Title</label>
                <Input value={overviewTitle} onChange={(e) => setOverviewTitle(e.target.value)} className="text-lg py-6" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                <Textarea value={overviewDesc} onChange={(e) => setOverviewDesc(e.target.value)} rows={4} />
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
                    e.target.value = '';
                  }}
                />
                {course.thumbnail_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 mb-2">
                    <img src={course.thumbnail_url} alt="Thumbnail" className="w-full h-48 object-cover" />
                    <button
                      onClick={async () => {
                        await supabase.from('courses').update({ thumbnail_url: null }).eq('id', courseId);
                        setCourse((prev) => prev ? { ...prev, thumbnail_url: null } : prev);
                        toast.success('Thumbnail removed');
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white shadow"
                    >
                      <X className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    {uploadingThumbnail ? (
                      <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-2 animate-spin" />
                    ) : (
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-gray-600">Click to upload thumbnail</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                )}
              </div>
              <Button onClick={saveOverview} disabled={savingOverview} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingOverview ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Lessons Tab ──────────────────────────────────────────── */}
        {activeTab === 'lessons' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Course Lessons</h2>
                <p className="text-sm text-gray-600">Manage and organize lesson content</p>
              </div>
              <Button onClick={openNewLesson} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Lesson
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4 border border-gray-200">
                <p className="text-sm text-gray-600">Total Lessons</p>
                <p className="text-3xl font-bold text-gray-900">{lessons.length}</p>
              </Card>
              <Card className="p-4 border border-gray-200">
                <p className="text-sm text-gray-600">With Quizzes</p>
                <p className="text-3xl font-bold text-gray-900">{lessons.filter((l) => l.has_quiz).length}</p>
              </Card>
              <Card className="p-4 border border-gray-200">
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-3xl font-bold text-gray-900">{lessons.filter((l) => l.status === 'published').length}</p>
              </Card>
            </div>

            {/* Lessons Grid */}
            {lessons.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} assets={assets[lesson.id] || []}
                    onEdit={() => openEditLesson(lesson.id)} onDelete={() => handleDeleteLesson(lesson.id)}
                    onMoveUp={() => moveLesson(lesson.id, 'up')} onMoveDown={() => moveLesson(lesson.id, 'down')}
                    onPdfUpload={(file) => handlePdfUpload(lesson.id, file)}
                    onAssetDelete={(assetId) => handleDeleteAsset(assetId, lesson.id)}
                    onQuizEdit={() => openEditQuiz(lesson.id)} onQuizDelete={() => handleDeleteQuiz(lesson.id)}
                    onQuizAdd={() => openNewQuiz(lesson.id)} uploadingPdfFor={uploadingPdfFor}
                    isFirst={lesson.sequence_order === 1} isLast={lesson.sequence_order === lessons.length} />
                ))}
              </div>
            ) : (
              <Card className="p-12 border-2 border-dashed border-gray-300 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No lessons yet</h3>
                <p className="text-gray-500 mb-4">Start building your course by adding lessons</p>
                <Button onClick={openNewLesson} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Lesson
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ─── Assets Tab ──────────────────────────────────────────── */}
        {activeTab === 'assets' && <CourseAssets courseId={courseId} />}

        {/* ─── Students Tab ─────────────────────────────────────────── */}
        {activeTab === 'students' && (
          <StudentProgressView courseId={courseId} courseTitle={course.title} />
        )}

        {/* ─── Settings Tab ─────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Course Settings</h2>
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Course Status</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPublished ? 'Published' : 'Draft'}
                  </span>
                  <Button onClick={togglePublish} variant="outline" size="sm">
                    {isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Course ID</h3>
                <p className="text-sm text-gray-600 font-mono">{course.id}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Danger Zone</h3>
                <p className="text-sm text-amber-800 mb-3">Archiving this course will remove access for all enrolled students.</p>
                <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    if (!confirm('Archive this course? Students will lose access.')) return;
                    try { await updateCourseStatus(courseId, 'archived'); toast.success('Course archived'); onBack() }
                    catch { toast.error('Failed to archive') }
                  }}>
                  Archive Course
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Lesson Modal ─────────────────────────────────────────────── */}
      <Dialog open={lessonModalOpen} onOpenChange={setLessonModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
            <DialogDescription>Create educational content for your course</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Title *</label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g., What is Web Accessibility?" className="text-lg py-6" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Content</label>
              <Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)}
                placeholder="Write your lesson content here. You can use basic HTML formatting like <strong>bold</strong>, <em>italic</em>, and <br> for line breaks."
                rows={15} className="text-base font-mono" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => setLessonModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={saveLesson} disabled={lessonSaving || !lessonTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
              {lessonSaving ? 'Saving...' : editingLessonId ? 'Update Lesson' : 'Save Lesson'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Quiz Modal ───────────────────────────────────────────────── */}
      <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{quizId ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
            <DialogDescription>Add questions to test learner understanding</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Quiz Title *</label>
              <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g., Lesson 1 Quiz" className="text-lg py-6" />
            </div>
            {quizQuestions.map((q: QuizQuestionForm, qi: number) => (
              <div key={q.id} className="p-6 bg-gray-50 border-2 border-gray-200 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900">Question {qi + 1}</h4>
                  {quizQuestions.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qi))} className="text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Question</label>
                    <Textarea value={q.question} onChange={(e) => { const n = [...quizQuestions]; n[qi] = { ...n[qi], question: e.target.value }; setQuizQuestions(n) }}
                      placeholder="Enter your question here..." rows={2} className="border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Answer Options</label>
                    <div className="space-y-2">
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-3">
                          <input type="radio" name={`q-${q.id}`} checked={q.correctAnswer === oi}
                            onChange={() => { const n = [...quizQuestions]; n[qi] = { ...n[qi], correctAnswer: oi }; setQuizQuestions(n) }}
                            className="w-5 h-5 text-green-600 focus:ring-green-500" />
                          <Input value={opt} onChange={(e) => { const n = [...quizQuestions]; const opts = [...n[qi].options]; opts[oi] = e.target.value; n[qi] = { ...n[qi], options: opts }; setQuizQuestions(n) }}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="flex-1" />
                          {q.correctAnswer === oi && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setQuizQuestions([...quizQuestions, { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }])}
              className="w-full border-dashed border-blue-600 text-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => setQuizModalOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={saveQuiz} disabled={quizSaving || !quizTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
              {quizSaving ? 'Saving...' : 'Save Quiz'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Publish Validation Modal ──────────────────────────────── */}
      <PublishValidationModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={async () => {
          await updateCourseStatus(courseId, 'published');
          toast.success('Course published!');
          setShowPublishModal(false);
          load();
        }}
        checks={[
          { id: 'title', label: 'Course Title', status: course.title?.trim() ? 'pass' : 'fail', message: course.title?.trim() ? `Course title set: "${course.title}"` : 'Course title is required' },
          { id: 'description', label: 'Course Description', status: course.description?.trim() ? 'pass' : 'warning', message: course.description?.trim() ? 'Course description provided' : 'Consider adding a course description' },
          { id: 'lessons', label: 'Lessons', status: lessons.length > 0 ? 'pass' : 'fail', message: lessons.length > 0 ? `${lessons.length} lesson(s) created` : 'At least one lesson is required' },
          { id: 'published_lessons', label: 'Published Lessons', status: lessons.every(l => l.status === 'published') ? 'pass' : lessons.some(l => l.status === 'published') ? 'warning' : 'fail', message: lessons.every(l => l.status === 'published') ? `All ${lessons.length} lessons published` : lessons.some(l => l.status === 'published') ? `${lessons.filter(l => l.status === 'published').length} of ${lessons.length} lessons published` : 'No lessons published yet' },
        ]}
      />
    </div>
  );
}
