'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  ArrowLeft, BookOpen, FileText, Users, Settings, Plus, Loader2,
  Globe, EyeOff, Eye, ChevronUp, ChevronDown,
  Edit, Trash2, Upload, X,
  CheckCircle, FileType, GripVertical, Copy, AlertTriangle, Award, Shield, Image as ImageIcon, Accessibility,
  ChevronRight, BarChart3, Info, HelpCircle,
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
  fetchCourseAccessibilityCategories,
  updateCourse,
  fetchLessonInteractiveContent,
  fetchVideoQuestions,
  fetchLessonH5PContent,
  calculateAccessibilityCompliance,
} from '@/lib/educator-api';
import type { LessonWithQuiz, LessonAsset, CourseStatus, CourseFields, LessonFields, InteractiveContent, VideoQuestion, H5PContent, AccessibilityAuditReport } from '@/lib/educator-api';
import { uploadContentImage } from '@/lib/educator-api';
import { LessonRenderer } from '@/components/lesson/LessonRenderer';
import { LessonEditor } from '@/components/educator/LessonEditor';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import CourseAssets from './CourseAssets';
import PublishValidationModal from './PublishValidationModal';
import StudentProgressView from './StudentProgressView';
import CertificateSettingsPanel from './CertificateSettingsPanel';
import { AccessibilitySettingsModal } from '../learner/AccessibilitySettingsModal';
import { CurriculumManager } from '../courses/CurriculumManager';
import AdminCourseSettingsTab from '../admin/AdminCourseSettingsTab';
import AdminCoursePerformanceTab from '../admin/AdminCoursePerformanceTab';
import AchievementBuilder from './AchievementBuilder';
import { AccessibilityGuideModal } from './AccessibilityGuideModal';

interface CourseWorkspaceProps {
  courseId: string;
  onBack: () => void;
  mode?: 'educator' | 'admin';
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
  certificate_enabled?: boolean;
  certificate_settings?: Record<string, unknown>;
  certification_locked?: boolean;
  created_by?: string;
}

interface QuizQuestionForm {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  optionImages: string[];
}

interface QuizOptionData {
  id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
  image_url?: string | null;
}

interface QuizQuestionData {
  id: string;
  question_text: string;
  question_type: string;
  sequence_order: number;
  image_url?: string | null;
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
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="text-xs px-3 py-1 h-7">
        {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
        Upload PDF
      </Button>
    </>
  );
}

function LessonCard({ lesson, assets, onEdit, onDelete, onMoveUp, onMoveDown, onPdfUpload, onQuizEdit, onQuizAdd, uploadingPdfFor, isFirst, isLast }: {
  lesson: LessonWithQuiz;
  assets: LessonAsset[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPdfUpload: (file: File) => void;
  onQuizEdit: () => void;
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

export default function CourseWorkspace({ courseId, onBack, mode = 'educator' }: CourseWorkspaceProps) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const searchParams = useSearchParams();
  const initialTab = searchParams ? searchParams.get('tab') : null;
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'assets' | 'students' | 'certificates' | 'achievements' | 'settings' | 'performance' | 'admin'>(
    (initialTab && ['overview', 'lessons', 'assets', 'students', 'certificates', 'achievements', 'settings', 'performance', 'admin'].includes(initialTab))
      ? (initialTab as any)
      : 'lessons'
  );

  // Lesson editor modal
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [lessonEditorLessonId, setLessonEditorLessonId] = useState<string | null>(null);
  const [lessonEditorInitialTab, setLessonEditorInitialTab] = useState<'basics' | 'accessibility'>('basics');

  // Course-level accessibility categories
  const [primaryDisabilityFocus, setPrimaryDisabilityFocus] = useState<string | null>(null);
  const [savingPrimaryFocus, setSavingPrimaryFocus] = useState(false);

  // Lesson detail view
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedLessonData, setSelectedLessonData] = useState<{
    id: string; title: string; content_html: string | null;
    video_url: string | null; transcript: string | null;
    sequence_order: number; status: string; course_id: string;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [lessonInteractiveItems, setLessonInteractiveItems] = useState<InteractiveContent[]>([]);
  const [lessonVideoQuestions, setLessonVideoQuestions] = useState<VideoQuestion[]>([]);
  const [lessonH5PContents, setLessonH5PContents] = useState<H5PContent[]>([]);
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

  // Loading states
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);
  const [duplicatingLesson, setDuplicatingLesson] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState(false);


  // Quiz modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionForm[]>([]);
  const [quizSaving, setQuizSaving] = useState(false);
  const [uploadingQuizImage, setUploadingQuizImage] = useState<{ questionId: string; optionIndex?: number } | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [auditReport, setAuditReport] = useState<AccessibilityAuditReport | null>(null);
  // Collapsed by default — the score in the header is the at-a-glance answer,
  // and the full checklist is long enough to bury the rest of the settings tab.
  const [auditOpen, setAuditOpen] = useState(false);
  const [standardsFilter, setStandardsFilter] = useState<'unmet' | 'all' | 'met'>('unmet');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);

  const loadAuditReport = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const report = await calculateAccessibilityCompliance(courseId);
      setAuditReport(report);
    } catch (err) {
      console.error('Failed to load accessibility audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [courseId]);
  // Overview editing
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewDesc, setOverviewDesc] = useState('');
  const [savingOverview, setSavingOverview] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const load = useCallback(async () => {
    try {
      let c, l;
      if (mode === 'admin') {
        const res = await fetch(`/api/admin/courses?id=${courseId}`);
        if (!res.ok) throw new Error('Failed to fetch admin course');
        const data = await res.json();
        c = data.course;
        l = data.lessons;
      } else {
        const results = await Promise.all([
          fetchCourseById(courseId),
          fetchLessonsWithQuizzes(courseId)
        ]);
        c = results[0];
        l = results[1];
      }
      if (!c) throw new Error('Course not found');

      // The "All Courses" catalog links every course (including other
      // educators' and system courses, visible there because published
      // courses are publicly readable) into this same management route.
      // Without this check, a non-owner would land in the full edit
      // workspace — publish/lesson/settings controls and all — and only
      // discover it doesn't work when each mutation silently fails RLS,
      // with tabs like Students rendering a misleading "0 enrolled"
      // instead of an actual permission message.
      if (mode === 'educator') {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user && c.created_by && c.created_by !== authData.user.id) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
      }

      setCourse(c);
      setLessons(l);
      setOverviewTitle(c.title);
      setOverviewDesc(c.description);
      setPrimaryDisabilityFocus(c.primary_disability_focus || null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load() }, [load]);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadAuditReport();
    }
  }, [activeTab, loadAuditReport, lessons]);

  useEffect(() => {
    if (!selectedLessonId) {
      setSelectedLessonData(null);
      setLessonInteractiveItems([]);
      setLessonVideoQuestions([]);
      setLessonH5PContents([]);
      return;
    }
    setLoadingDetail(true);
    Promise.all([
      fetchLessonById(selectedLessonId),
      fetchLessonInteractiveContent(selectedLessonId).catch(() => [] as InteractiveContent[]),
      fetchVideoQuestions(selectedLessonId).catch(() => [] as VideoQuestion[]),
      fetchLessonH5PContent(selectedLessonId).catch(() => [] as H5PContent[]),
    ])
      .then(([lessonData, items, vqs, h5ps]) => {
        setSelectedLessonData(lessonData);
        setLessonInteractiveItems(items);
        setLessonVideoQuestions(vqs);
        setLessonH5PContents(h5ps);
      })
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
    setLessonEditorLessonId(null);
    setLessonEditorInitialTab('basics');
    setLessonEditorOpen(true);
  };

  const openEditLesson = (lessonId: string) => {
    setLessonEditorLessonId(lessonId);
    setLessonEditorInitialTab('basics');
    setLessonEditorOpen(true);
  };

  /** Opens a lesson straight onto its accessibility checklist. */
  const openLessonAccessibility = (lessonId: string) => {
    setLessonEditorLessonId(lessonId);
    setLessonEditorInitialTab('accessibility');
    setLessonEditorOpen(true);
  };

  /**
   * Course-level settings the audit can switch on in one click. Each entry is
   * the course column to set, plus the lesson column to bring in line where the
   * setting has a per-lesson counterpart.
   */
  const COURSE_QUICK_FIXES: Record<string, { label: string; course: Partial<CourseFields>; lessonColumn?: string; toast: string }> = {
    tts: { label: 'Enable TTS', course: { supports_tts: true }, toast: 'Text-to-speech enabled' },
    focus_mode: { label: 'Enable Focus Mode', course: { supports_focus_mode: true }, lessonColumn: 'focus_mode_enabled', toast: 'Focus mode enabled across all lessons' },
    chunked_content: { label: 'Enable Chunking', course: { supports_chunked_learning: true }, lessonColumn: 'chunked_content_enabled', toast: 'Chunked learning enabled across all lessons' },
    gamification: { label: 'Enable Streaks', course: { learning_streaks_enabled: true }, toast: 'Learning streaks enabled' },
    hierarchy: { label: 'Enable Chapters', course: { chapter_organization_enabled: true }, toast: 'Chapter organisation enabled' },
  };

  const applyCourseQuickFix = async (checkId: string) => {
    const fix = COURSE_QUICK_FIXES[checkId];
    if (!fix || applyingFixId) return;
    setApplyingFixId(checkId);
    try {
      await updateCourse(courseId, fix.course);
      if (fix.lessonColumn) {
        const { error } = await supabase
          .from('lessons')
          .update({ [fix.lessonColumn]: true })
          .eq('course_id', courseId);
        if (error) throw error;
      }
      toast.success(fix.toast);
      await Promise.all([loadAuditReport(), load()]);
    } catch {
      toast.error('Failed to apply the fix');
    } finally {
      setApplyingFixId(null);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (deletingLesson) return;
    setDeletingLesson(true);
    try {
      await deleteLesson(lessonId);
      toast.success('Lesson deleted');
      setConfirmDeleteLessonId(null);
      load();
    } catch { toast.error('Failed to delete lesson') }
    finally { setDeletingLesson(false) }
  };

  const handleAssetUpload = async (lessonId: string, file: File) => {
    setUploadingPdfFor(lessonId);
    try {
      const url = await uploadCourseFile(file, courseId, lessonId);
      
      let kind = 'file';
      if (file.type.startsWith('image/')) kind = 'image';
      else if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type === 'application/pdf') kind = 'pdf';
      else if (file.type.includes('word') || file.type.includes('document')) kind = 'document';

      await createLessonAsset(lessonId, kind, file.name, url);
      toast.success('Asset uploaded successfully');
      loadAssets(lessonId);
    } catch { toast.error('Failed to upload asset') }
    finally { setUploadingPdfFor(null) }
  };

  const handleAddLinkAsset = async (lessonId: string, url: string, title: string) => {
    try {
      await createLessonAsset(lessonId, 'link', title, url);
      toast.success('Link added successfully');
      loadAssets(lessonId);
    } catch { toast.error('Failed to add link') }
  };

  const handleDeleteAsset = async (assetId: string, lessonId: string) => {
    if (deletingAsset) return;
    setDeletingAsset(assetId);
    try {
      await deleteLessonAsset(assetId);
      loadAssets(lessonId);
      toast.success('Asset removed');
    } catch { toast.error('Failed to delete asset') }
    finally { setDeletingAsset(null) }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    if (duplicatingLesson) return;
    setDuplicatingLesson(true);
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
    } finally {
      setDuplicatingLesson(false);
    }
  };

  // ─── Quiz handlers ────────────────────────────────────────────────────

  const openNewQuiz = (lessonId: string) => {
    setQuizId(null);
    setQuizLessonId(lessonId);
    setQuizTitle(`Quiz for ${lessons.find((l) => l.id === lessonId)?.title || 'Lesson'}`);
    setQuizQuestions([{ id: '1', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', imageUrl: '', optionImages: ['', '', '', ''] }]);
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
      setQuizQuestions((quiz.quiz_questions || []).sort((a, b) => a.sequence_order - b.sequence_order).map((question) => {
        const sortedOptions = [...(question.quiz_options || [])].sort((a, b) => a.sequence_order - b.sequence_order);
        const correctIdx = sortedOptions.findIndex((opt) => opt.is_correct);
        return {
          id: question.id, 
          question: question.question_text,
          options: [...sortedOptions.map((opt) => opt.option_text), '', '', '', ''].slice(0, 4),
          correctAnswer: correctIdx !== -1 ? correctIdx : 0,
          explanation: '',
          imageUrl: question.image_url || '',
          optionImages: [...sortedOptions.map((opt) => opt.image_url || ''), '', '', '', ''].slice(0, 4),
        };
      }));
      setQuizModalOpen(true);
    } catch (error) { 
      console.error('Failed to open edit quiz:', error);
      openNewQuiz(lessonId); 
    }
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
        image_url: q.imageUrl || null,
        options: q.options.filter((o: string) => o.trim()).map((opt: string, oi: number) => ({
          option_text: opt, is_correct: oi === q.correctAnswer, sequence_order: oi + 1,
          image_url: q.optionImages?.[oi] || null,
        })),
      })));
      toast.success('Quiz saved!');
      setQuizModalOpen(false);
      setQuizId(null);
      load();
    } catch { toast.error('Failed to save quiz') }
    finally { setQuizSaving(false) }
  };

  const handleDeleteQuiz = async (lessonId: string) => {
    if (deletingQuiz) return;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson?.quiz_id) return;
    setDeletingQuiz(true);
    try { await deleteQuiz(lesson.quiz_id); toast.success('Quiz deleted'); setConfirmDeleteQuizLessonId(null); load() }
    catch { toast.error('Failed to delete quiz') }
    finally { setDeletingQuiz(false) }
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
    if (!course || publishing) return;
    setPublishing(true);
    
    let newStatus: CourseStatus = 'pending_review';
    if (course.status === 'published') {
      newStatus = 'draft';
    } else {
      newStatus = mode === 'admin' ? 'published' : 'pending_review';
    }
    
    try {
      await updateCourseStatus(courseId, newStatus);
      toast.success(
        newStatus === 'pending_review' ? 'Approval request sent to Admin!' : 
        newStatus === 'published' ? 'Course published successfully' : 
        'Course unpublished'
      );
      load();
    } catch { toast.error('Failed to update status') }
    finally { setPublishing(false) }
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

  if (unauthorized) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-16">
        <Shield className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <p className="text-xl font-semibold mb-2">You don&apos;t manage this course</p>
        <p className="text-gray-500 mb-6">This course belongs to another educator, so you can&apos;t edit its content, students, or settings here. Browse it from All Courses instead.</p>
        <Button onClick={onBack}>Back to Courses</Button>
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-center"><p className="text-xl mb-4">Course not found</p><Button onClick={onBack}>Back to Courses</Button></div>;
  }

  const tabs: { id: 'overview' | 'lessons' | 'assets' | 'students' | 'certificates' | 'achievements' | 'settings' | 'performance' | 'admin'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'lessons', label: 'Lessons', icon: FileText },
    { id: 'assets', label: 'Assets', icon: FileType },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (mode === 'admin') {
    // Admins see everything an educator sees, plus reach and outcomes.
    tabs.push({ id: 'performance', label: 'Performance', icon: BarChart3 });
    tabs.push({ id: 'admin', label: 'Admin Controls', icon: Shield });
  }

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
            <Button onClick={() => router.push(`/educator/preview/course/${courseId}${mode === 'admin' ? `?returnTo=${encodeURIComponent(`/admin/courses/${courseId}`)}` : ''}`)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Eye className="w-4 h-4 mr-2" /> Preview as Learner
            </Button>
            {isPublished ? (
              <Button onClick={togglePublish} disabled={publishing} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <EyeOff className="w-4 h-4 mr-2" />}
                Unpublish
              </Button>
            ) : (
              <Button onClick={() => setShowPublishModal(true)} disabled={publishing} className="bg-green-600 hover:bg-green-700 text-white">
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <Badge className={isPublished ? 'bg-green-100 text-green-700' : course.status === 'pending_review' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
            {isPublished ? 'Published' : course.status === 'pending_review' ? 'Pending Approval' : 'Draft'}
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
          <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Course Overview</h2>
            {course.certification_locked && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">Course structure is locked</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This course includes certification. Major course structure changes are locked to preserve certificate integrity.
                    You can still edit the description and thumbnail.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Title</label>
                <Input value={overviewTitle} onChange={(e) => setOverviewTitle(e.target.value)} disabled={course.certification_locked} className="text-lg py-6" />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <div className="w-[96%] max-w-[1500px] mx-auto">
            {selectedLessonId ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedLessonId(null)}
                  className="mb-2 text-gray-500 hover:text-gray-900 px-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Curriculum
                </Button>
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : selectedLessonData ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* Header with sticky actions */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-5 flex items-start justify-between">
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
                        <h3 className="text-xl font-bold text-gray-900">{selectedLessonData.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleDuplicateLesson(selectedLessonId)} disabled={duplicatingLesson} className="h-9 px-3">
                          {duplicatingLesson ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                          Duplicate
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditLesson(selectedLessonId)} className="h-9 px-3">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteLessonId(selectedLessonId)} className="h-9 w-9 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="px-8 py-6 space-y-5">
                      <LessonRenderer
                        mode="educator"
                        lesson={selectedLessonData}
                        assets={assets[selectedLessonId] || []}
                        videoQuestions={lessonVideoQuestions}
                        interactiveItems={lessonInteractiveItems}
                        h5pContents={lessonH5PContents}
                        hasQuiz={!!lessons.find(l => l.id === selectedLessonId)?.has_quiz}
                        lessonId={selectedLessonId}
                        educatorProps={{
                          onEditLesson: () => openEditLesson(selectedLessonId),
                          onEditQuiz: () => {
                            const lesson = lessons.find(l => l.id === selectedLessonId);
                            if (lesson?.has_quiz) {
                              openEditQuiz(selectedLessonId);
                            } else {
                              openNewQuiz(selectedLessonId);
                            }
                          },
                          onRemoveQuiz: () => setConfirmDeleteQuizLessonId(selectedLessonId),
                          onUploadAsset: (file) => handleAssetUpload(selectedLessonId, file),
                          onAddLinkAsset: (url, title) => handleAddLinkAsset(selectedLessonId, url, title),
                          uploadingAssetFor: uploadingPdfFor,
                          onDeleteAsset: (assetId) => handleDeleteAsset(assetId, selectedLessonId),
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">Failed to load lesson details</div>
                )}
              </div>
            ) : (
              <CurriculumManager
                lessons={lessons}
                onReorderLessons={(newOrderIds) => {
                  const newOrderLessons = newOrderIds.map(id => lessons.find(l => l.id === id)!).filter(Boolean);
                  setLessons(newOrderLessons);
                  const promises = newOrderLessons.map((l, i) =>
                    updateLesson(l.id, { sequence_order: i + 1 } as Partial<LessonFields>).catch(() => {})
                  );
                  Promise.all(promises).then(() => toast.success('Lesson order updated'));
                }}
                onSelectLesson={setSelectedLessonId}
                onAddLesson={openNewLesson}
                onEditLesson={openEditLesson}
                onDuplicateLesson={handleDuplicateLesson}
                onDeleteLesson={setConfirmDeleteLessonId}
                onEditQuiz={(lessonId, hasQuiz) => {
                  if (hasQuiz) openEditQuiz(lessonId);
                  else openNewQuiz(lessonId);
                }}
              />
            )}
          </div>
        )}

        {/* ─── Assets Tab ──────────────────────────────────────────── */}
        {activeTab === 'assets' && <CourseAssets courseId={courseId} />}

        {/* ─── Students Tab ─────────────────────────────────────────── */}
        {activeTab === 'students' && (
          <StudentProgressView courseId={courseId} courseTitle={course.title} mode={mode} />
        )}

        {/* ─── Certificates Tab ────────────────────────────────────── */}
        {activeTab === 'certificates' && (
          <CertificateSettingsPanel
            courseId={courseId}
            courseTitle={course.title}
            isPublished={isPublished}
            hasEnrollments={false} // simplified; could check dynamically
            onCertChange={load}
          />
        )}

        {/* ─── Achievements Tab ────────────────────────────────────── */}
        {activeTab === 'achievements' && (
          <AchievementBuilder courseId={courseId} />
        )}

        {/* ─── Settings Tab ─────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="w-[96%] max-w-[1500px] mx-auto bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Course Settings</h2>
            <div className="space-y-6">
              {/* ── Primary Accessibility Focus ── */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Accessibility className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Primary Accessibility Focus</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Select the primary accessibility focus for this course to tailor educator lesson guides.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: 'adhd', label: 'ADHD' },
                    { value: 'autism', label: 'Autism' },
                    { value: 'dyslexia', label: 'Dyslexia' },
                  ].map((cat) => {
                    const selected = primaryDisabilityFocus === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setPrimaryDisabilityFocus(selected ? null : cat.value);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  disabled={savingPrimaryFocus}
                  onClick={async () => {
                    setSavingPrimaryFocus(true);
                    try {
                      await updateCourse(courseId, { primary_disability_focus: primaryDisabilityFocus || undefined });
                      toast.success('Primary focus updated');
                      loadAuditReport();
                    } catch {
                      toast.error('Failed to save primary focus');
                    } finally {
                      setSavingPrimaryFocus(false);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {savingPrimaryFocus ? 'Saving...' : 'Save Focus'}
                </Button>
              </div>

              {/* ── Accessibility Compliance Audit ── */}
              {loadingAudit ? (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <p className="text-sm text-gray-500 font-medium">Running accessibility audit...</p>
                </div>
              ) : auditReport && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-6 shadow-sm">
                  {/* The header doubles as the collapse toggle; the score stays
                      visible when collapsed so it is still a glanceable status. */}
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${auditOpen ? 'border-b border-gray-100 pb-4' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setAuditOpen((open) => !open)}
                      aria-expanded={auditOpen}
                      aria-controls="course-accessibility-audit"
                      className="flex items-start gap-2 text-left group rounded-lg -m-1 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform group-hover:text-purple-600 ${auditOpen ? 'rotate-90' : ''}`}
                      />
                      <span>
                        <span className="text-lg font-bold text-gray-950 flex items-center gap-2">
                          <Accessibility className="w-5 h-5 text-purple-600" />
                          Accessibility Compliance Audit
                        </span>
                        <span className="block text-sm text-gray-500 mt-1">
                          {auditOpen ? (
                            <>
                              Course settings plus every lesson, checked against the{' '}
                              <span className="font-semibold text-purple-700 capitalize">
                                {auditReport.focus}
                              </span>{' '}
                              profile.
                            </>
                          ) : (
                            `${auditReport.passedCount} of ${auditReport.totalCount} standards met — show details`
                          )}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGuideModal(true);
                        }}
                        className="h-9 px-3 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300 gap-1.5 shadow-2xs bg-white"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                        Guidelines
                      </Button>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-purple-50 px-4 py-3 rounded-2xl border border-purple-100 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium">Compliance Score</p>
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-2xl font-black text-purple-700 tabular-nums">{auditReport.score}%</span>
                            <span className="text-xs font-semibold text-purple-600">({auditReport.passedCount}/{auditReport.totalCount} standards)</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 justify-end">
                            <span className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-800 font-semibold">
                              Course: {auditReport.courseChecks.filter(c => c.passed).length}/{auditReport.courseChecks.length}
                            </span>
                            <span className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-800 font-semibold">
                              Lessons: {auditReport.lessonChecks.filter(c => c.passed).length}/{auditReport.lessonChecks.length}
                            </span>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 flex items-center justify-center font-bold text-purple-700 text-sm tabular-nums shrink-0">
                          {auditReport.passedCount}/{auditReport.totalCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {auditOpen && (
                  <div id="course-accessibility-audit" className="space-y-6">

                  {/* ── Simple 1st-Time User Explainer ── */}
                  <div className="p-4 bg-blue-50/90 border border-blue-200/70 rounded-xl space-y-2 text-xs text-blue-950 shadow-xs">
                    <div className="flex items-center justify-between gap-2 font-bold text-blue-900 text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        How the 14 Standards are Tested:
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGuideModal(true)}
                        className="text-xs text-purple-700 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Open Guide
                      </button>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-blue-900/90">
                      <li className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-700">1. Course Level (4 rules):</span> Checks global settings (e.g. Focus Mode & Chunking enabled for ADHD).
                      </li>
                      <li className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-700">2. Lesson Content (10 rules):</span> Checks lesson text, headings, and video transcripts.
                      </li>
                    </ul>
                    <p className="text-[11px] text-blue-800/80 italic pt-0.5">
                      💡 <strong>Note on skipped rules:</strong> If a lesson has no video, the &ldquo;Video Transcript&rdquo; rule is automatically skipped so you are not penalized unfairly.
                    </p>
                  </div>

                  {/* ── Action Items to Reach 100% ── */}
                  {([...auditReport.courseChecks, ...auditReport.lessonChecks].filter(c => !c.passed && c.severity === 'required')).length > 0 && (
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <h4 className="text-sm font-bold text-rose-950">
                            {([...auditReport.courseChecks, ...auditReport.lessonChecks].filter(c => !c.passed && c.severity === 'required')).length} Required Action{([...auditReport.courseChecks, ...auditReport.lessonChecks].filter(c => !c.passed && c.severity === 'required')).length === 1 ? '' : 's'} to Reach 100%
                          </h4>
                        </div>
                        <span className="text-[11px] font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          Click any item to fix
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {([...auditReport.courseChecks, ...auditReport.lessonChecks].filter(c => !c.passed && c.severity === 'required')).slice(0, 5).map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/90 p-2.5 rounded-lg border border-rose-100">
                            <span className="font-medium text-gray-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <strong className="text-gray-900">{item.title}:</strong>
                              {item.affected.length > 0 ? (
                                <span className="text-purple-700 font-semibold">
                                  {item.affected.map(a => a.title).join(', ')}
                                </span>
                              ) : (
                                <span className="text-gray-600">Course setting</span>
                              )}
                            </span>
                            {item.scope === 'course' && COURSE_QUICK_FIXES[item.id] ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => applyCourseQuickFix(item.id)}
                              >
                                Quick Fix
                              </Button>
                            ) : item.affected.length > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] px-2.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => openLessonAccessibility(item.affected[0].id)}
                              >
                                Edit Lesson
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {auditReport.empty && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 leading-relaxed">
                        This course has no lessons yet, so only the course-level settings are being
                        scored. Add lessons to see the full picture.
                      </p>
                    </div>
                  )}

                  {/* ── Per-lesson breakdown ── */}
                  {auditReport.perLesson.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                          Lesson scores
                        </h4>
                        <span className="text-xs text-gray-400">Click any card to edit that lesson</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {auditReport.perLesson.map((lesson) => {
                          const tone = lesson.score >= 80
                            ? 'border-green-200 bg-green-50/40 text-green-700 hover:bg-green-50'
                            : lesson.score >= 50
                              ? 'border-amber-200 bg-amber-50/40 text-amber-700 hover:bg-amber-50'
                              : 'border-rose-200 bg-rose-50/40 text-rose-700 hover:bg-rose-50';
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => openLessonAccessibility(lesson.id)}
                              title="Open this lesson's accessibility checklist"
                              className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all hover:shadow-sm group ${tone}`}
                            >
                              <span className="font-black text-sm tabular-nums w-11 shrink-0">{lesson.score}%</span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors">{lesson.title}</span>
                                <span className="block text-xs text-gray-600">
                                  {lesson.passed}/{lesson.applicable} standards
                                  {lesson.applicable < auditReport.lessonChecks.length && (
                                    <span className="text-gray-400 ml-1">
                                      ({auditReport.lessonChecks.length - lesson.applicable} skipped: no video)
                                    </span>
                                  )}
                                  {lesson.requiredFailures > 0 && ` · ${lesson.requiredFailures} required unmet`}
                                  {lesson.status !== 'published' && ' · draft'}
                                </span>
                              </span>
                              <span className="text-[11px] font-medium text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Edit
                              </span>
                              <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-purple-600 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Filter Tabs to reduce long scroll ── */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-gray-100 py-3 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Standards Checklist:</span>
                    </div>
                    <div className="inline-flex rounded-lg bg-gray-100 p-1">
                      <button
                        type="button"
                        onClick={() => setStandardsFilter('unmet')}
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                          standardsFilter === 'unmet'
                            ? 'bg-white text-rose-700 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Needs Fixes ({[...auditReport.courseChecks, ...auditReport.lessonChecks].filter(c => !c.passed).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStandardsFilter('met')}
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                          standardsFilter === 'met'
                            ? 'bg-white text-green-700 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Passed ({auditReport.passedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStandardsFilter('all')}
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                          standardsFilter === 'all'
                            ? 'bg-white text-purple-700 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        All ({auditReport.totalCount})
                      </button>
                    </div>
                  </div>

                  {/* ── Course settings and rolled-up lesson standards (Filtered) ── */}
                  {([
                    { key: 'course', label: 'Course settings', items: auditReport.courseChecks },
                    { key: 'lessons', label: 'Lesson standards', items: auditReport.lessonChecks },
                  ] as const).map((group) => {
                    const filteredItems = group.items.filter((check) => {
                      if (standardsFilter === 'unmet') return !check.passed;
                      if (standardsFilter === 'met') return check.passed;
                      return true;
                    });

                    if (filteredItems.length === 0 && standardsFilter === 'unmet') {
                      return (
                        <div key={group.key} className="p-3 bg-green-50/50 border border-green-100 rounded-xl text-xs text-green-800 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span>All <strong>{group.label.toLowerCase()}</strong> have been satisfied!</span>
                        </div>
                      );
                    }

                    return filteredItems.length > 0 && (
                    <div key={group.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{group.label} ({filteredItems.length})</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {filteredItems.map((check) => {
                          const Icon = check.passed ? CheckCircle : AlertTriangle;
                          return (
                            <div
                              key={check.id}
                              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                                check.passed
                                  ? 'bg-green-50/30 border-green-100'
                                  : 'bg-amber-50/30 border-amber-100'
                              }`}
                            >
                              <div className="flex gap-3 min-w-0">
                                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${check.passed ? 'text-green-600' : 'text-amber-600'}`} />
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-950 text-sm flex flex-wrap items-center gap-2">
                                    {check.title}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                                      check.passed
                                        ? 'bg-green-100 text-green-700'
                                        : check.severity === 'required'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {check.passed ? 'Met' : check.severity}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{check.description}</p>
                                  {!check.passed && check.affected.length > 0 && (
                                    <ul className="mt-2 space-y-1.5">
                                      {check.affected.slice(0, 4).map((entry) => (
                                        <li key={entry.id} className="text-xs text-gray-600">
                                          <button
                                            type="button"
                                            onClick={() => openLessonAccessibility(entry.id)}
                                            className="font-semibold text-purple-700 hover:underline"
                                          >
                                            {entry.title}
                                          </button>
                                          <span className="text-gray-500"> — {entry.detail}</span>
                                        </li>
                                      ))}
                                      {check.affected.length > 4 && (
                                        <li className="text-xs text-gray-400">
                                          and {check.affected.length - 4} more lesson{check.affected.length - 4 === 1 ? '' : 's'}
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                  <p className="text-[10px] text-gray-400 mt-2">{check.source}</p>
                                </div>
                              </div>

                              {/* 1-click fixes for course-level settings only. */}
                              {!check.passed && check.scope === 'course' && COURSE_QUICK_FIXES[check.id] && (
                                <div className="shrink-0 flex justify-end">
                                  <Button
                                    size="sm"
                                    disabled={applyingFixId === check.id}
                                    className="h-8 text-xs font-semibold px-3 bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                                    onClick={() => applyCourseQuickFix(check.id)}
                                  >
                                    {applyingFixId === check.id && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                                    {COURSE_QUICK_FIXES[check.id].label}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  </div>
                  )}
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Course Status</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${isPublished ? 'bg-green-100 text-green-700' : course.status === 'pending_review' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isPublished ? 'Published' : course.status === 'pending_review' ? 'Pending Approval' : 'Draft'}
                  </span>
                  <Button onClick={togglePublish} disabled={publishing} variant="outline" size="sm">
                    {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {publishing ? (isPublished ? 'Unpublishing...' : course.status === 'pending_review' ? 'Cancelling...' : 'Publishing...') : (isPublished ? 'Unpublish' : course.status === 'pending_review' ? 'Cancel Request' : 'Publish')}
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

        {/* ─── Performance Tab (admin only) ─────────────────────────── */}
        {activeTab === 'performance' && mode === 'admin' && (
          <AdminCoursePerformanceTab key={courseId} courseId={courseId} />
        )}

        {/* ─── Admin Tab ────────────────────────────────────────────── */}
        {activeTab === 'admin' && mode === 'admin' && (
          <AdminCourseSettingsTab courseId={courseId} initialCourse={course} onUpdate={load} />
        )}
      </div>

      {/* ─── Lesson Editor Modal ──────────────────────────────────────── */}
      <LessonEditor
        open={lessonEditorOpen}
        onClose={() => setLessonEditorOpen(false)}
        courseId={courseId}
        lessonId={lessonEditorLessonId}
        initialTab={lessonEditorInitialTab}
        onSaved={load}
        onManageQuiz={() => {
          setLessonEditorOpen(false);
          const lesson = lessons.find(l => l.id === lessonEditorLessonId);
          if (lesson?.has_quiz) {
            openEditQuiz(lessonEditorLessonId!);
          } else {
            openNewQuiz(lessonEditorLessonId!);
          }
        }}
      />

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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Question Text</label>
                    <Textarea value={q.question} onChange={(e) => { const n = [...quizQuestions]; n[qi] = { ...n[qi], question: e.target.value }; setQuizQuestions(n) }}
                      placeholder="Enter your question here..." rows={2} className="border-gray-300" />
                  </div>

                  {/* Question image */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Question Image (optional)</label>
                    {q.imageUrl ? (
                      <div className="relative inline-block rounded-lg overflow-hidden border border-gray-300">
                        <img src={q.imageUrl} alt="" className="max-h-24 object-contain" />
                        <button type="button" onClick={() => { const n = [...quizQuestions]; n[qi] = { ...n[qi], imageUrl: '' }; setQuizQuestions(n) }}
                          className="absolute top-1 right-1 p-0.5 bg-white/90 rounded-full hover:bg-white shadow-sm">
                          <X className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" disabled={uploadingQuizImage?.questionId === q.id && uploadingQuizImage?.optionIndex === undefined}
                        onClick={async () => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/png,image/jpeg,image/gif,image/webp';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            setUploadingQuizImage({ questionId: q.id });
                            try {
                              const url = await uploadContentImage(file, `${courseId}/quiz`);
                              const n = [...quizQuestions]; n[qi] = { ...n[qi], imageUrl: url }; setQuizQuestions(n);
                            } finally { setUploadingQuizImage(null); }
                          };
                          input.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        {uploadingQuizImage?.questionId === q.id && uploadingQuizImage?.optionIndex === undefined ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : <ImageIcon className="w-3.5 h-3.5" />}
                        Add Image
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Answer Options</label>
                    <div className="space-y-2">
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`q-${q.id}`} checked={q.correctAnswer === oi}
                            onChange={() => { const n = [...quizQuestions]; n[qi] = { ...n[qi], correctAnswer: oi }; setQuizQuestions(n) }}
                            className="w-5 h-5 text-green-600 focus:ring-green-500 shrink-0" />
                          <Input value={opt} onChange={(e) => { const n = [...quizQuestions]; const opts = [...n[qi].options]; opts[oi] = e.target.value; n[qi] = { ...n[qi], options: opts }; setQuizQuestions(n) }}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="flex-1" />
                          {q.correctAnswer === oi && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}

                          {/* Option image */}
                          {q.optionImages?.[oi] ? (
                            <div className="relative shrink-0">
                              <img src={q.optionImages[oi]} alt="" className="w-8 h-8 rounded object-cover border border-gray-300" />
                              <button type="button" onClick={() => { const n = [...quizQuestions]; const imgs = [...n[qi].optionImages]; imgs[oi] = ''; n[qi] = { ...n[qi], optionImages: imgs }; setQuizQuestions(n) }}
                                className="absolute -top-1 -right-1 p-0.5 bg-white/90 rounded-full shadow-sm">
                                <X className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" disabled={uploadingQuizImage?.questionId === q.id && uploadingQuizImage?.optionIndex === oi}
                              onClick={async () => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/png,image/jpeg,image/gif,image/webp';
                                input.onchange = async (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (!file) return;
                                  setUploadingQuizImage({ questionId: q.id, optionIndex: oi });
                                  try {
                                    const url = await uploadContentImage(file, `${courseId}/quiz`);
                                    const n = [...quizQuestions]; const imgs = [...(n[qi].optionImages || ['', '', '', ''])]; imgs[oi] = url; n[qi] = { ...n[qi], optionImages: imgs }; setQuizQuestions(n);
                                  } finally { setUploadingQuizImage(null); }
                                };
                                input.click();
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                              title="Add option image"
                            >
                              {uploadingQuizImage?.questionId === q.id && uploadingQuizImage?.optionIndex === oi
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <ImageIcon className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setQuizQuestions([...quizQuestions, { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', imageUrl: '', optionImages: ['', '', '', ''] }])}
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
        isAdmin={mode === 'admin'}
        onPublish={async () => {
          // If certificate is enabled, lock the course
          if (course.certificate_enabled) {
            await supabase.from('courses').update({ certification_locked: true }).eq('id', courseId)
          }
          const publishStatus = mode === 'admin' ? 'published' : 'pending_review';
          await updateCourseStatus(courseId, publishStatus);
          toast.success(mode === 'admin' ? 'Course published successfully!' : 'Approval request sent to Admin!');
          setShowPublishModal(false);
          load();
        }}
        checks={[
          { id: 'title', label: 'Course Title', status: course.title?.trim() ? 'pass' : 'fail', message: course.title?.trim() ? `Course title set: "${course.title}"` : 'Course title is required' },

          { id: 'description', label: 'Course Description', status: course.description?.trim() ? 'pass' : 'warning', message: course.description?.trim() ? 'Course description provided' : 'Consider adding a course description' },
          { id: 'lessons', label: 'Lessons', status: lessons.length > 0 ? 'pass' : 'fail', message: lessons.length > 0 ? `${lessons.length} lesson(s) created` : 'At least one lesson is required' },
          { id: 'published_lessons', label: 'Published Lessons', status: lessons.every(l => l.status === 'published') ? 'pass' : lessons.some(l => l.status === 'published') ? 'warning' : 'fail', message: lessons.every(l => l.status === 'published') ? `All ${lessons.length} lessons published` : lessons.some(l => l.status === 'published') ? `${lessons.filter(l => l.status === 'published').length} of ${lessons.length} lessons published` : 'No lessons published yet' },
          ...(course.certificate_enabled ? [{
            id: 'cert_settings' as const,
            label: 'Certificate Settings',
            status: (course.certificate_settings as Record<string, unknown>)?.educator_name ? 'pass' as const : 'warning' as const,
            message: (course.certificate_settings as Record<string, unknown>)?.educator_name ? 'Educator name is set' : 'Consider setting the educator name in Certificate Settings',
          }] : []),
        ]}
      />

      {/* Confirm Delete Lesson */}
      <ConfirmAction
        title="Delete Lesson"
        description="Delete this lesson and all its quizzes? This cannot be undone."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        loading={deletingLesson}
        loadingText="Deleting..."
        onConfirm={() => { if (confirmDeleteLessonId) { handleDeleteLesson(confirmDeleteLessonId); } }}
        open={!!confirmDeleteLessonId}
        onOpenChange={(o) => { if (!o && !deletingLesson) setConfirmDeleteLessonId(null); }}
      />

      {/* Confirm Delete Quiz */}
      <ConfirmAction
        title="Delete Quiz"
        description="Delete this quiz? This action cannot be undone."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        loading={deletingQuiz}
        loadingText="Deleting..."
        onConfirm={() => { if (confirmDeleteQuizLessonId) { handleDeleteQuiz(confirmDeleteQuizLessonId); } }}
        open={!!confirmDeleteQuizLessonId}
        onOpenChange={(o) => { if (!o && !deletingQuiz) setConfirmDeleteQuizLessonId(null); }}
      />

      {/* Accessibility Engine Guidelines Modal */}
      <AccessibilityGuideModal
        open={showGuideModal}
        onOpenChange={setShowGuideModal}
        currentFocus={auditReport?.focus ?? 'adhd'}
      />
    </div>
  );
}
