'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  ArrowLeft, BookOpen, FileText, Users, Settings, Plus, Loader2,
  Globe, EyeOff, Eye, ChevronUp, ChevronDown,
  Edit, Trash2, Upload, FileText as FileIcon, X, Download,
  CheckCircle, FileType, Video, GripVertical, Clock, Copy, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
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

// ─── Utils ────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────

function CollapsibleCard({ icon, title, defaultOpen, badge, action, children }: {
  icon: React.ReactNode;
  title: string;
  defaultOpen: boolean;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left hover:bg-gray-50 transition-colors rounded-lg py-1 -ml-1 px-1"
        >
          <span className="shrink-0">{icon}</span>
          <span className="flex-1 font-semibold text-sm text-gray-900">{title}</span>
          {badge && <Badge variant="secondary" className="shrink-0 text-xs">{badge}</Badge>}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {action && <span className="shrink-0">{action}</span>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="text-xs px-3 py-1 h-7">
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
  return (
    <Card className="group p-5 border border-gray-200 hover:border-blue-400 hover:shadow-lg hover:bg-blue-50/20 cursor-pointer transition-all duration-200 ease-out h-44 flex flex-col hover:scale-[1.02]">
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold shrink-0 group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-200">
            {lesson.sequence_order}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200">{lesson.title}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge className={`text-[10px] px-1.5 py-0 ${lesson.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {lesson.status}
              </Badge>
              {lesson.has_content && <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">C</Badge>}
              {lesson.video_url && <Badge className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0">V</Badge>}
              {lesson.has_quiz && <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Q</Badge>}
              {assets.length > 0 && <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0">{assets.length}P</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 flex flex-wrap gap-1.5 items-center border-t border-gray-100 group-hover:border-blue-100 transition-colors duration-200">
        <div className="flex gap-0.5 mr-auto">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><ChevronUp className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><ChevronDown className="w-3.5 h-3.5" /></Button>
        </div>
        <PdfUploadButton lessonId={lesson.id} uploadingPdfFor={uploadingPdfFor} onUpload={onPdfUpload} />
        {lesson.has_quiz ? (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onQuizEdit(); }} className="text-xs h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><Edit className="w-3 h-3" /></Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onQuizAdd(); }} className="text-xs h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><Plus className="w-3 h-3" /></Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><Edit className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-7 w-7 p-0 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </Card>
  );
}

export default function CourseWorkspace({ courseId, onBack }: CourseWorkspaceProps) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'assets' | 'students' | 'settings'>('lessons');

  // Lesson modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonTranscript, setLessonTranscript] = useState('');
  const [lessonStatus, setLessonStatus] = useState<'draft' | 'published'>('published');

  // Lesson detail view
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedLessonData, setSelectedLessonData] = useState<{
    id: string; title: string; content_html: string | null;
    video_url: string | null; transcript: string | null;
    sequence_order: number; status: string; course_id: string;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedLessonId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideDetail = detailRef.current && !detailRef.current.contains(target);
      const isInsideSidebar = sidebarRef.current && sidebarRef.current.contains(target);
      if (isOutsideDetail && !isInsideSidebar) {
        setSelectedLessonId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLessonId]);

  // PDF upload
  const [uploadingPdfFor, setUploadingPdfFor] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, LessonAsset[]>>({});

  // Confirm dialogs
  const [confirmDeleteLessonId, setConfirmDeleteLessonId] = useState<string | null>(null);
  const [confirmDeleteQuizLessonId, setConfirmDeleteQuizLessonId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

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

  useEffect(() => {
    if (!selectedLessonId) { setSelectedLessonData(null); return; }
    setLoadingDetail(true);
    fetchLessonById(selectedLessonId)
      .then((data) => setSelectedLessonData(data))
      .catch(() => toast.error('Failed to load lesson details'))
      .finally(() => setLoadingDetail(false));
  }, [selectedLessonId]);

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
    setLessonVideoUrl('');
    setLessonTranscript('');
    setLessonStatus('published');
    setLessonModalOpen(true);
  };

  const openEditLesson = async (lessonId: string) => {
    try {
      const lesson = await fetchLessonById(lessonId);
      setEditingLessonId(lessonId);
      setLessonTitle(lesson.title);
      setLessonContent(lesson.content_html || '');
      setLessonVideoUrl(lesson.video_url || '');
      setLessonTranscript(lesson.transcript || '');
      setLessonStatus(lesson.status || 'draft');
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
        await updateLesson(editingLessonId, {
          title: lessonTitle,
          content_html: lessonContent,
          video_url: lessonVideoUrl || null,
          transcript: lessonTranscript || null,
          status: lessonStatus,
        } as Partial<LessonFields>);
        toast.success('Lesson updated');
      } else {
        const seq = await getNextSequenceOrder(courseId);
        await createLesson(user.user.id, {
          course_id: courseId,
          title: lessonTitle,
          content_html: lessonContent,
          video_url: lessonVideoUrl || null,
          transcript: lessonTranscript || null,
          sequence_order: seq,
          status: lessonStatus,
        });
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

  const handleDuplicateLesson = async (lessonId: string) => {
    try {
      const lesson = await fetchLessonById(lessonId);
      const seq = await getNextSequenceOrder(courseId);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      await createLesson(user.user.id, {
        course_id: courseId,
        title: `${lesson.title} (Copy)`,
        content_html: lesson.content_html,
        video_url: lesson.video_url,
        transcript: lesson.transcript,
        sequence_order: seq,
        status: 'draft',
      });
      toast.success('Lesson duplicated');
      load();
    } catch {
      toast.error('Failed to duplicate lesson');
    }
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
            <Button onClick={() => router.push(`/educator/courses/${courseId}/preview`)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Course Lessons</h2>
                <p className="text-sm text-gray-600">
                  {selectedLessonId
                    ? `Lesson ${selectedLessonData?.sequence_order || ''} — ${selectedLessonData?.title || ''}`
                    : `${lessons.length} lesson${lessons.length !== 1 ? 's' : ''} in this course`}
                </p>
              </div>
              <Button onClick={openNewLesson} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Lesson
              </Button>
            </div>

            <div className="flex gap-6">
              {/* ── Left: Lesson Navigation Sidebar (drag-and-drop) ── */}
              <div ref={sidebarRef} className="w-64 shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Lessons</p>
                    <span className="text-xs text-gray-500">{lessons.length}</span>
                  </div>
                  <div className="max-h-[75vh] overflow-y-auto">
                    <Reorder.Group axis="y" values={lessons} onReorder={(reordered) => {
                      setLessons(reordered);
                      const promises = reordered.map((l, i) =>
                        updateLesson(l.id, { sequence_order: i + 1 } as Partial<LessonFields>).catch(() => {})
                      );
                      Promise.all(promises).then(() => toast.success('Lesson order updated'));
                    }}>
                      <AnimatePresence initial={false}>
                        {lessons.map((lesson) => {
                          const selected = selectedLessonId === lesson.id;
                          return (
                            <Reorder.Item
                              key={lesson.id}
                              value={lesson}
                              className={`border-b border-gray-100 last:border-b-0 ${
                                selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              } transition-colors duration-150`}
                              style={{ listStyle: 'none' }}
                            >
                              <motion.button
                                layout
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                onClick={() => setSelectedLessonId(lesson.id)}
                                className={`w-full text-left px-2 py-2.5 flex items-center gap-1 ${
                                  selected ? 'border-l-[3px] border-blue-600' : 'border-l-[3px] border-transparent'
                                }`}
                              >
                                <span className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
                                  onPointerDown={(e) => e.stopPropagation()}>
                                  <GripVertical className="w-4 h-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                      selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                      {lesson.sequence_order}
                                    </span>
                                    <span className={`text-sm truncate ${selected ? 'text-blue-900 font-medium' : 'text-gray-800'}`}>
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 ml-6.5 mt-0.5">
                                    <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                                      lesson.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {lesson.status}
                                    </span>
                                    {lesson.has_quiz && <span className="text-[10px] text-blue-600 font-semibold">Q</span>}
                                    {lesson.video_url && <span className="text-[10px] text-rose-600 font-semibold">V</span>}
                                    {(assets[lesson.id] || []).length > 0 && (
                                      <span className="text-[10px] text-orange-600 font-semibold">{(assets[lesson.id] || []).length}P</span>
                                    )}
                                  </div>
                                </div>
                              </motion.button>
                            </Reorder.Item>
                          );
                        })}
                      </AnimatePresence>
                    </Reorder.Group>
                  </div>
                </div>
              </div>

              {/* ── Right: Content Area ── */}
              <AnimatePresence mode="wait">
                {selectedLessonId ? (
                  /* ── Detail View ── */
                  <motion.div
                    key="detail"
                    ref={detailRef}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex-1 min-w-0"
                  >
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    ) : selectedLessonData ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Header with sticky actions */}
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                  Lesson {selectedLessonData.sequence_order}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  selectedLessonData.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {selectedLessonData.status}
                                </span>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900">{selectedLessonData.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleDuplicateLesson(selectedLessonId)} className="h-8 text-xs px-2">
                                <Copy className="w-3 h-3 mr-1" /> Duplicate
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditLesson(selectedLessonId)} className="h-8 text-xs px-2">
                                <Edit className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteLessonId(selectedLessonId)} className="h-8 w-8 p-0 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="px-8 py-6 space-y-5">
                          {/* ── 1. Video (with YouTube embed) ── */}
                          <CollapsibleCard
                            icon={<Video className="w-4 h-4 text-rose-600" />}
                            title="Video"
                            defaultOpen={!!selectedLessonData.video_url}
                            badge={selectedLessonData.video_url ? '1 video' : undefined}
                          >
                            {selectedLessonData.video_url ? (() => {
                              const ytId = getYouTubeId(selectedLessonData.video_url);
                              return ytId ? (
                                <div>
                                  <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ paddingBottom: '56.25%' }}>
                                    <iframe
                                      src={`https://www.youtube.com/embed/${ytId}`}
                                      title="Lesson video"
                                      className="absolute inset-0 w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                  <a href={selectedLessonData.video_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                                    <ExternalLink className="w-3 h-3" /> Open in YouTube
                                  </a>
                                </div>
                              ) : (
                                <div>
                                  <a href={selectedLessonData.video_url} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm break-all underline underline-offset-2 flex items-center gap-1">
                                    <ExternalLink className="w-3.5 h-3.5" /> {selectedLessonData.video_url}
                                  </a>
                                </div>
                              );
                            })() : (
                              <div className="text-center py-6">
                                <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No video URL set</p>
                                <Button variant="outline" size="sm" onClick={() => openEditLesson(selectedLessonId)} className="mt-3 text-xs">
                                  <Plus className="w-3 h-3 mr-1" /> Add Video
                                </Button>
                              </div>
                            )}
                          </CollapsibleCard>

                          {/* ── 2. Lesson Content ── */}
                          <CollapsibleCard
                            icon={<FileText className="w-4 h-4 text-gray-600" />}
                            title="Lesson Content"
                            defaultOpen={!!selectedLessonData.content_html}
                            badge={selectedLessonData.content_html ? 'ready' : undefined}
                          >
                            {selectedLessonData.content_html ? (
                              <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: selectedLessonData.content_html }} />
                            ) : (
                              <div className="text-center py-6">
                                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No content written yet</p>
                                <Button variant="outline" size="sm" onClick={() => openEditLesson(selectedLessonId)} className="mt-3 text-xs">
                                  <Plus className="w-3 h-3 mr-1" /> Write Content
                                </Button>
                              </div>
                            )}
                          </CollapsibleCard>

                          {/* ── 3. Resources / PDFs ── */}
                          <CollapsibleCard
                            icon={<FileIcon className="w-4 h-4 text-orange-600" />}
                            title={`Resources ${(assets[selectedLessonId] || []).length > 0 ? `(${(assets[selectedLessonId] || []).length})` : ''}`}
                            defaultOpen={(assets[selectedLessonId] || []).length > 0}
                            badge={(assets[selectedLessonId] || []).length > 0 ? `${(assets[selectedLessonId] || []).length} file${(assets[selectedLessonId] || []).length > 1 ? 's' : ''}` : undefined}
                            action={<PdfUploadButton lessonId={selectedLessonId} uploadingPdfFor={uploadingPdfFor} onUpload={(file) => handlePdfUpload(selectedLessonId, file)} />}
                          >
                            {(assets[selectedLessonId] || []).length > 0 ? (
                              <div className="space-y-2">
                                {(assets[selectedLessonId] || []).map((asset) => (
                                  <div key={asset.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg group/resource hover:bg-orange-100/50 transition-colors">
                                    <div className="w-10 h-12 bg-orange-200 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                      <FileIcon className="w-5 h-5 text-orange-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-orange-900 truncate">{asset.title || 'Untitled PDF'}</p>
                                      <p className="text-xs text-orange-600">PDF document</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover/resource:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="sm" onClick={() => window.open(asset.url, '_blank')} className="h-7 text-xs">
                                        <ExternalLink className="w-3 h-3 mr-1" /> Open
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id, selectedLessonId)} className="h-7 text-xs text-red-600">
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No files uploaded yet</p>
                                <p className="text-xs text-gray-400 mt-1">Upload PDF resources for your learners</p>
                              </div>
                            )}
                          </CollapsibleCard>

                          {/* ── 4. Transcript ── */}
                          {selectedLessonData.transcript ? (
                            <CollapsibleCard
                              icon={<FileText className="w-4 h-4 text-purple-600" />}
                              title="Transcript"
                              defaultOpen={false}
                              badge="available"
                            >
                              <div className="text-sm text-gray-700 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-line">
                                {selectedLessonData.transcript}
                              </div>
                            </CollapsibleCard>
                          ) : null}

                          {/* ── 5. Quiz ── */}
                          <CollapsibleCard
                            icon={<CheckCircle className="w-4 h-4 text-blue-600" />}
                            title="Quiz"
                            defaultOpen={true}
                            badge={lessons.find(l => l.id === selectedLessonId)?.has_quiz ? 'attached' : undefined}
                          >
                            {lessons.find(l => l.id === selectedLessonId)?.has_quiz ? (
                              <div className="flex items-center gap-3">
                                <Badge className="bg-blue-100 text-blue-800">Quiz attached</Badge>
                                <Button variant="outline" size="sm" onClick={() => openEditQuiz(selectedLessonId)}>Edit Quiz</Button>
                                <Button variant="outline" size="sm" onClick={() => setConfirmDeleteQuizLessonId(selectedLessonId)} className="text-red-600 border-red-200">Remove Quiz</Button>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 mb-3">No quiz attached to this lesson</p>
                                <Button variant="outline" size="sm" onClick={() => openNewQuiz(selectedLessonId)}>
                                  <Plus className="w-4 h-4 mr-1" /> Add Quiz
                                </Button>
                              </div>
                            )}
                          </CollapsibleCard>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-gray-500">Failed to load lesson details</div>
                    )}
                  </motion.div>
                ) : (
                  /* ── Grid View ── */
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 min-w-0"
                  >
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {lessons.map((lesson) => (
                          <motion.div
                            key={lesson.id}
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className="cursor-pointer"
                          >
                            <LessonCard lesson={lesson} assets={assets[lesson.id] || []}
                              onEdit={() => openEditLesson(lesson.id)}
                              onDelete={() => setConfirmDeleteLessonId(lesson.id)}
                              onMoveUp={() => moveLesson(lesson.id, 'up')} onMoveDown={() => moveLesson(lesson.id, 'down')}
                              onPdfUpload={(file) => handlePdfUpload(lesson.id, file)}
                              onAssetDelete={(assetId) => handleDeleteAsset(assetId, lesson.id)}
                              onQuizEdit={() => openEditQuiz(lesson.id)} onQuizDelete={() => setConfirmDeleteQuizLessonId(lesson.id)}
                              onQuizAdd={() => openNewQuiz(lesson.id)} uploadingPdfFor={uploadingPdfFor}
                              isFirst={lesson.sequence_order === 1} isLast={lesson.sequence_order === lessons.length} />
                          </motion.div>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                <ConfirmAction
                  title="Archive Course"
                  description="Archive this course? Students will lose access."
                  confirmText="Archive"
                  confirmClassName="bg-red-600 hover:bg-red-700 text-white"
                  icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                  onConfirm={async () => { try { await updateCourseStatus(courseId, 'archived'); toast.success('Course archived'); onBack() } catch { toast.error('Failed to archive') } }}
                >
                  <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                    Archive Course
                  </Button>
                </ConfirmAction>
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
                rows={12} className="text-base font-mono" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  <Video className="w-3.5 h-3.5 inline mr-1" /> Video URL
                </label>
                <Input
                  type="url"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  <FileText className="w-3.5 h-3.5 inline mr-1" /> Transcript
                </label>
                <Textarea
                  value={lessonTranscript}
                  onChange={(e) => setLessonTranscript(e.target.value)}
                  placeholder="Paste or write the text transcript of your video content here for accessibility..."
                  rows={4}
                  className="text-base" />
                <p className="text-sm text-gray-500 mt-1">
                  Use double line breaks between paragraphs. Transcripts help learners who prefer reading or use screen readers.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLessonStatus('draft')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    lessonStatus === 'draft'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${lessonStatus === 'draft' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setLessonStatus('published')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    lessonStatus === 'published'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${lessonStatus === 'published' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Published
                </button>
              </div>
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

      {/* Confirm Delete Lesson */}
      <ConfirmAction
        title="Delete Lesson"
        description="Delete this lesson and all its quizzes? This cannot be undone."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        onConfirm={() => { if (confirmDeleteLessonId) { handleDeleteLesson(confirmDeleteLessonId); setConfirmDeleteLessonId(null); } }}
        open={!!confirmDeleteLessonId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteLessonId(null); }}
      />

      {/* Confirm Delete Quiz */}
      <ConfirmAction
        title="Delete Quiz"
        description="Delete this quiz? This action cannot be undone."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        onConfirm={() => { if (confirmDeleteQuizLessonId) { handleDeleteQuiz(confirmDeleteQuizLessonId); setConfirmDeleteQuizLessonId(null); } }}
        open={!!confirmDeleteQuizLessonId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteQuizLessonId(null); }}
      />
    </div>
  );
}
