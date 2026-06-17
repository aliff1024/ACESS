'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, BookOpen, User, Shield, FileText, HelpCircle, Loader2,
  Settings, CheckCircle, Users, TrendingUp, Target, Archive, Plus, Copy, Trash2,
  ListChecks, Eye, EyeOff, ChevronUp, ChevronDown, Globe, Lock,
  Calendar, Layers, Zap, Trophy, Sparkles, Save, Video, FileQuestion,
  BookMarked, GraduationCap, BrainCircuit, Edit, Pencil, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ConfirmAction } from '../ui/ConfirmAction';
import { RichTextEditor } from '../ui/RichTextEditor';
import { ThumbnailPicker } from './ThumbnailPicker';
import { LessonEditor } from '../educator/LessonEditor';
import { QuizBuilderModal } from '../educator/QuizBuilderModal';
import { uploadContentImage, uploadThumbnail } from '@/lib/educator-api';
import { COURSE_CATEGORIES } from '@/lib/course-thumbnails';
import { COURSE_TEMPLATES, applyCourseTemplate } from '@/lib/course-templates';
import {
  archiveSystemCourse, updateSystemCourse,
  fetchChapters, createChapter, deleteChapter, reorderChapters,
  fetchLessonTemplates, createLessonTemplate,
  fetchCourseMilestones, createCourseMilestone, deleteCourseMilestone,
} from '@/lib/admin-api';
import type { ChapterItem, LessonTemplate, CourseMilestone } from '@/lib/admin-api';
import { toast } from 'sonner';

interface LessonItem {
  id: string;
  title: string;
  sequence_order: number;
  status: string;
  lesson_type: string;
  estimated_duration: number | null;
  visibility_status: string;
  prerequisite_lesson_id: string | null;
  chapter_id: string | null;
  scheduled_release_at: string | null;
  learning_objectives: string | null;
  quiz_id?: string | null;
  quiz_title?: string | null;
  quiz_question_count?: number;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  difficulty_level: string | null;
  category: string | null;
  created_at: string;
  published_at: string | null;
  thumbnail_url: string | null;
  creator_name: string;
  creator_email: string;
  tags: string[];
  lessons: LessonItem[];
  quizCount: number;
  course_type: string;
  system_course: boolean;
  built_in_course: boolean;
  created_by_role: string;
  guided_learning_enabled: boolean;
  recommended_age_group: string | null;
  managed_by_admin: boolean;
  total_enrollments: number;
  course_layout_type: string;
  chapter_organization_enabled: boolean;
  learning_streaks_enabled: boolean;
  milestone_tracking_enabled: boolean;
}

interface AdminCourseDetailProps {
  courseId: string;
  onBack: () => void;
}

type TabId = 'overview' | 'content' | 'engagement' | 'admin';

const VALID_TABS: TabId[] = ['overview', 'content', 'engagement', 'admin'];

export default function AdminCourseDetail({ courseId, onBack }: AdminCourseDetailProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [milestones, setMilestones] = useState<CourseMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Lesson content editor
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // Quiz editor
  const [quizEditorLessonId, setQuizEditorLessonId] = useState<string | null>(null);

  // Inline overview editing
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    thumbnail: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [savingOverview, setSavingOverview] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [applyingCourseTemplate, setApplyingCourseTemplate] = useState(false);
  const contentScopeId = useMemo(() => courseId, [courseId]);

  // Confirm dialogs
  const [confirmDeleteLessonId, setConfirmDeleteLessonId] = useState<string | null>(null);
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Add lesson form
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState('standard');
  const [newLessonChapter, setNewLessonChapter] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('');
  const [newLessonPrereq, setNewLessonPrereq] = useState('');
  const [newLessonObjectives, setNewLessonObjectives] = useState('');
  const [newLessonLayout, setNewLessonLayout] = useState('standard');
  const [newLessonVisibility, setNewLessonVisibility] = useState('visible');
  const [savingLesson, setSavingLesson] = useState(false);

  // Chapter form
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDesc, setNewChapterDesc] = useState('');


  // Milestones
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestonePct, setNewMilestonePct] = useState('100');
  const [newMilestoneIcon, setNewMilestoneIcon] = useState('Trophy');

  // Templates
  const [showSaveTemplate, setShowSaveTemplate] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');

  useEffect(() => {
    if (initialTab && VALID_TABS.includes(initialTab as TabId)) {
      setActiveTab(initialTab as TabId);
    }
  }, [initialTab]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: courseData, error: cError } = await supabase
          .from('courses')
          .select('id, title, description, status, difficulty_level, category, created_at, published_at, thumbnail_url, created_by, course_type, system_course, built_in_course, created_by_role, guided_learning_enabled, recommended_age_group, managed_by_admin, course_layout_type, chapter_organization_enabled, learning_streaks_enabled, milestone_tracking_enabled, course_tags(tag), lessons(id, title, sequence_order, status, lesson_type, estimated_duration, visibility_status, prerequisite_lesson_id, chapter_id, scheduled_release_at, learning_objectives)')
          .eq('id', courseId)
          .single();

        if (cError) throw cError;

        const { data: usersData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', courseData.created_by)
          .single();

        const { count: quizCount } = await supabase
          .from('quizzes')
          .select('id', { count: 'exact', head: true })
          .in('lesson_id', (courseData.lessons || []).map((l: { id: string }) => l.id));

        const { count: totalEnrollments } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .neq('status', 'dropped');

        const sortedLessons = (courseData.lessons || []).sort((a: LessonItem, b: LessonItem) => a.sequence_order - b.sequence_order);
        const lessonsWithQuizzes = await attachQuizIds(sortedLessons);
        setCourse({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description || '',
          status: courseData.status,
          difficulty_level: courseData.difficulty_level,
          category: courseData.category,
          created_at: courseData.created_at,
          published_at: courseData.published_at,
          thumbnail_url: courseData.thumbnail_url,
          creator_name: usersData?.full_name || 'Unknown',
          creator_email: usersData?.email || '',
          tags: (courseData.course_tags || []).map((t: { tag: string }) => t.tag),
          lessons: lessonsWithQuizzes,
          quizCount: quizCount ?? 0,
          course_type: courseData.course_type || 'educator',
          system_course: courseData.system_course || false,
          built_in_course: courseData.built_in_course || false,
          created_by_role: courseData.created_by_role || 'educator',
          guided_learning_enabled: courseData.guided_learning_enabled || false,
          recommended_age_group: courseData.recommended_age_group || null,
          managed_by_admin: courseData.managed_by_admin || false,
          total_enrollments: totalEnrollments ?? 0,
          course_layout_type: courseData.course_layout_type || 'standard',
          chapter_organization_enabled: courseData.chapter_organization_enabled || false,
          learning_streaks_enabled: courseData.learning_streaks_enabled || false,
          milestone_tracking_enabled: courseData.milestone_tracking_enabled || false,
        });
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  useEffect(() => {
    if (course?.system_course) {
      fetchChapters(courseId).then(setChapters).catch(() => {});
      fetchLessonTemplates().then(setTemplates).catch(() => {});
      fetchCourseMilestones(courseId).then(setMilestones).catch(() => {});
    }
  }, [courseId, course?.system_course]);

  const isSystem = course?.course_type === 'system';

  const attachQuizIds = async (lessons: LessonItem[]): Promise<LessonItem[]> => {
    if (lessons.length === 0) return lessons;
    const lessonIds = lessons.map(l => l.id);
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, lesson_id, title')
      .in('lesson_id', lessonIds);
    const quizMap = new Map<string, { id: string; title: string | null; question_count: number }>();
    for (const q of quizzes || []) {
      const { count } = await supabase
        .from('quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', q.id);
      quizMap.set(q.lesson_id, { id: q.id, title: q.title, question_count: count ?? 0 });
    }
    return lessons.map(l => {
      const quiz = quizMap.get(l.id);
      return {
        ...l,
        quiz_id: quiz?.id || null,
        quiz_title: quiz?.title || null,
        quiz_question_count: quiz?.question_count || 0,
      };
    });
  };

  const reloadLessons = async () => {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, title, sequence_order, status, lesson_type, estimated_duration, visibility_status, prerequisite_lesson_id, chapter_id, scheduled_release_at, learning_objectives')
      .eq('course_id', courseId)
      .order('sequence_order', { ascending: true });
    if (lessonsData && course) {
      const withQuizzes = await attachQuizIds(lessonsData as LessonItem[]);
      setCourse({ ...course, lessons: withQuizzes });
    }
  };

  const handleAddLesson = async () => {
    if (!newLessonTitle.trim() || !course) return;
    setSavingLesson(true);
    try {
      const maxOrder = course.lessons.length > 0
        ? Math.max(...course.lessons.map(l => l.sequence_order))
        : 0;
      const { error } = await supabase.from('lessons').insert({
        course_id: courseId,
        title: newLessonTitle.trim(),
        sequence_order: maxOrder + 1,
        status: 'draft',
        lesson_type: newLessonType,
        content_html: '',
        estimated_duration: newLessonDuration ? parseInt(newLessonDuration) : null,
        chapter_id: newLessonChapter || null,
        prerequisite_lesson_id: newLessonPrereq || null,
        learning_objectives: newLessonObjectives || null,
        visibility_status: newLessonVisibility,
        lesson_layout: newLessonLayout,
      });
      if (error) throw error;
      toast.success('Lesson added');
      setNewLessonTitle('');
      setNewLessonType('standard');
      setNewLessonLayout('standard');
      setNewLessonChapter('');
      setNewLessonDuration('');
      setNewLessonPrereq('');
      setNewLessonObjectives('');
      setNewLessonVisibility('visible');
      setShowAddLesson(false);
      await reloadLessons();
    } catch {
      toast.error('Failed to add lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleMoveLesson = async (lessonId: string, direction: 'up' | 'down') => {
    if (!course) return;
    const idx = course.lessons.findIndex(l => l.id === lessonId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= course.lessons.length) return;

    const lessons = [...course.lessons];
    const temp = lessons[idx].sequence_order;
    const updated = lessons.map((l, i) => {
      if (i === idx) return { ...l, sequence_order: lessons[swapIdx].sequence_order };
      if (i === swapIdx) return { ...l, sequence_order: temp };
      return l;
    }).sort((a, b) => a.sequence_order - b.sequence_order);

    try {
      for (const l of lessons) {
        const newOrder = l.id === lessonId ? lessons[swapIdx].sequence_order
          : l.id === lessons[swapIdx].id ? temp
          : l.sequence_order;
        await supabase.from('lessons').update({ sequence_order: newOrder }).eq('id', l.id);
      }
      setCourse({ ...course, lessons: updated });
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    if (!course) return;
    try {
      const { data: original } = await supabase
        .from('lessons')
        .select('title, content_html, video_url, transcript, lesson_type, estimated_duration, chapter_id, prerequisite_lesson_id, learning_objectives, visibility_status')
        .eq('id', lessonId)
        .single();

      if (!original) throw new Error('Lesson not found');

      const maxOrder = Math.max(...course.lessons.map(l => l.sequence_order));
      const { error } = await supabase.from('lessons').insert({
        course_id: courseId,
        title: `${original.title} (Copy)`,
        content_html: original.content_html || '',
        video_url: original.video_url,
        transcript: original.transcript,
        lesson_type: original.lesson_type || 'standard',
        estimated_duration: original.estimated_duration,
        chapter_id: original.chapter_id,
        prerequisite_lesson_id: original.prerequisite_lesson_id,
        learning_objectives: original.learning_objectives,
        visibility_status: original.visibility_status || 'visible',
        sequence_order: maxOrder + 1,
        status: 'draft',
      });
      if (error) throw error;
      toast.success('Lesson duplicated');
      await reloadLessons();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      toast.success('Lesson deleted');
      await reloadLessons();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleVisibility = async (lessonId: string, current: string) => {
    const newStatus = current === 'visible' ? 'hidden' : 'visible';
    try {
      await supabase.from('lessons').update({ visibility_status: newStatus }).eq('id', lessonId);
      await reloadLessons();
      toast.success(newStatus === 'visible' ? 'Lesson visible' : 'Lesson hidden');
    } catch {
      toast.error('Failed to update');
    }
  };

  // ─── Chapter Handlers ───────────────────────────────────────────────

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      await createChapter(courseId, newChapterTitle.trim(), newChapterDesc.trim() || undefined);
      toast.success('Chapter added');
      setNewChapterTitle('');
      setNewChapterDesc('');
      setShowAddChapter(false);
      fetchChapters(courseId).then(setChapters).catch(() => {});
    } catch {
      toast.error('Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteChapter(chapterId);
      toast.success('Chapter deleted');
      fetchChapters(courseId).then(setChapters).catch(() => {});
      reloadLessons();
    } catch {
      toast.error('Failed to delete chapter');
    }
  };

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const idx = chapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= chapters.length) return;
    const ordered = chapters.map(c => c.id);
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    try {
      await reorderChapters(courseId, ordered);
      fetchChapters(courseId).then(setChapters).catch(() => {});
    } catch {
      toast.error('Failed to reorder');
    }
  };

  // ─── Milestone Handlers ─────────────────────────────────────────────

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    try {
      await createCourseMilestone(courseId, {
        title: newMilestoneTitle.trim(),
        required_completion_pct: parseInt(newMilestonePct) || 100,
        icon: newMilestoneIcon,
      });
      toast.success('Milestone added');
      setNewMilestoneTitle('');
      setNewMilestonePct('100');
      setNewMilestoneIcon('Trophy');
      setShowAddMilestone(false);
      fetchCourseMilestones(courseId).then(setMilestones).catch(() => {});
    } catch {
      toast.error('Failed to add milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteCourseMilestone(milestoneId);
      toast.success('Milestone deleted');
      fetchCourseMilestones(courseId).then(setMilestones).catch(() => {});
    } catch {
      toast.error('Failed to delete milestone');
    }
  };

  // ─── Template Handlers ──────────────────────────────────────────────

  const handleSaveAsTemplate = async (lessonId: string) => {
    if (!templateTitle.trim()) return;
    try {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('title, content_html, lesson_type, estimated_duration')
        .eq('id', lessonId)
        .single();
      if (!lesson) throw new Error('Lesson not found');
      await createLessonTemplate({
        title: templateTitle.trim(),
        description: `Template from: ${lesson.title}`,
        lesson_type: lesson.lesson_type,
        content_html: lesson.content_html,
        estimated_duration: lesson.estimated_duration,
        is_public: false,
      });
      toast.success('Template saved');
      setTemplateTitle('');
      setShowSaveTemplate(null);
      fetchLessonTemplates().then(setTemplates).catch(() => {});
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleApplyTemplate = async (template: LessonTemplate) => {
    if (!course) return;
    try {
      const maxOrder = Math.max(...course.lessons.map(l => l.sequence_order), 0);
      const { error } = await supabase.from('lessons').insert({
        course_id: courseId,
        title: template.title,
        content_html: template.content_html || '',
        lesson_type: template.lesson_type,
        estimated_duration: template.estimated_duration,
        sequence_order: maxOrder + 1,
        status: 'draft',
      });
      if (error) throw error;
      toast.success('Template applied');
      await reloadLessons();
    } catch {
      toast.error('Failed to apply template');
    }
  };

  const handleApplyCourseTemplate = async (templateId: string) => {
    if (!course || templateId === 'blank') return;
    setApplyingCourseTemplate(true);
    try {
      await applyCourseTemplate(courseId, templateId);
      toast.success('Course template applied');
      await reloadLessons();
      if (course.chapter_organization_enabled === false) {
        const tpl = COURSE_TEMPLATES.find((t) => t.id === templateId);
        if (tpl?.chapter_organization_enabled) {
          await updateSystemCourse(courseId, { chapter_organization_enabled: true } as Record<string, unknown>);
          setCourse({ ...course, chapter_organization_enabled: true });
          fetchChapters(courseId).then(setChapters).catch(() => {});
        }
      } else {
        fetchChapters(courseId).then(setChapters).catch(() => {});
      }
    } catch {
      toast.error('Failed to apply course template');
    } finally {
      setApplyingCourseTemplate(false);
    }
  };

  const startOverviewEdit = () => {
    if (!course) return;
    setOverviewDraft({
      title: course.title,
      description: course.description,
      category: course.category || 'Accessibility',
      difficulty: course.difficulty_level || 'beginner',
      thumbnail: course.thumbnail_url || '',
      tags: [...course.tags],
    });
    setEditingOverview(true);
  };

  const saveOverviewEdit = async () => {
    if (!course) return;
    setSavingOverview(true);
    try {
      await updateSystemCourse(courseId, {
        title: overviewDraft.title,
        description: overviewDraft.description,
        category: overviewDraft.category,
        difficulty_level: overviewDraft.difficulty,
        thumbnail_url: overviewDraft.thumbnail || undefined,
      });
      await supabase.from('course_tags').delete().eq('course_id', courseId);
      if (overviewDraft.tags.length > 0) {
        await supabase.from('course_tags').insert(
          overviewDraft.tags.map((tag) => ({ course_id: courseId, tag })),
        );
      }
      setCourse({
        ...course,
        title: overviewDraft.title,
        description: overviewDraft.description,
        category: overviewDraft.category,
        difficulty_level: overviewDraft.difficulty,
        thumbnail_url: overviewDraft.thumbnail || null,
        tags: overviewDraft.tags,
      });
      setEditingOverview(false);
      toast.success('Course details updated');
    } catch {
      toast.error('Failed to update course');
    } finally {
      setSavingOverview(false);
    }
  };

  const openLessonEditor = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setLessonEditorOpen(true);
  };

  // ─── Settings Handlers ──────────────────────────────────────────────

  const handleToggleField = async (field: string, value: boolean) => {
    if (!course) return;
    try {
      await updateSystemCourse(course.id, { [field]: value } as Record<string, unknown>);
      setCourse({ ...course, [field]: value });
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleUpdateField = async (field: string, value: string) => {
    if (!course) return;
    try {
      await updateSystemCourse(course.id, { [field]: value } as Record<string, unknown>);
      setCourse({ ...course, [field]: value });
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const toggleToggle = (field: keyof CourseDetail) => {
    if (!course) return;
    handleToggleField(field, !course[field]);
  };

  // ─── Template Save Modal ───────────────────────────────────────────

  const TemplateSaveModal = showSaveTemplate ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="font-bold text-gray-900 mb-3">Save as Template</h3>
        <p className="text-sm text-gray-600 mb-4">Save this lesson as a reusable template for future courses.</p>
        <label className="block text-xs font-medium text-gray-700 mb-1">Template Name</label>
        <input
          type="text"
          value={templateTitle}
          onChange={(e) => setTemplateTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
          placeholder="My Template"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsTemplate(showSaveTemplate!); }}
        />
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setShowSaveTemplate(null); setTemplateTitle(''); }} variant="outline">Cancel</Button>
          <Button onClick={() => handleSaveAsTemplate(showSaveTemplate!)} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="w-4 h-4 mr-1" /> Save Template
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  // ─── Helpers ────────────────────────────────────────────────────────

  const getChapterLessons = (chapterId: string) =>
    course?.lessons.filter(l => l.chapter_id === chapterId) || [];

  const getUngroupedLessons = () =>
    course?.lessons.filter(l => !l.chapter_id) || [];

  const getPrerequisiteTitle = (lessonId: string | null) => {
    if (!lessonId || !course) return '';
    return course.lessons.find(l => l.id === lessonId)?.title || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Course not found</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'pending_review': return 'bg-amber-100 text-amber-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'archived': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const lessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-rose-500" />;
      case 'quiz': return <FileQuestion className="w-4 h-4 text-amber-500" />;
      case 'practice': return <BrainCircuit className="w-4 h-4 text-green-500" />;
      case 'reading': return <BookMarked className="w-4 h-4 text-blue-500" />;
      case 'assessment': return <GraduationCap className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const milestoneIcons: Record<string, React.ReactNode> = {
    Trophy: <Trophy className="w-5 h-5" />,
    Target: <Target className="w-5 h-5" />,
    Zap: <Zap className="w-5 h-5" />,
    Star: <Sparkles className="w-5 h-5" />,
    Check: <CheckCircle className="w-5 h-5" />,
  };

  // ─── Tabs ───────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    ...(isSystem ? [
      { id: 'content' as const, label: 'Content', icon: ListChecks, count: course.lessons.length },
      { id: 'engagement' as const, label: 'Engagement', icon: Trophy, count: milestones.length },
      { id: 'admin' as const, label: 'Admin', icon: Settings },
    ] : []),
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Course Management
        </button>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const activeColor = isSystem ? 'text-purple-600 border-purple-600' : 'text-blue-600 border-blue-600';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? `${activeColor} border-b-2`
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(editingOverview ? overviewDraft.thumbnail : course.thumbnail_url) && (
              <div className="h-48 bg-blue-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editingOverview ? overviewDraft.thumbnail : course.thumbnail_url!}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-8">
              {editingOverview && isSystem ? (
                <div className="space-y-5 mb-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-purple-600" /> Edit Course Details
                    </h2>
                    <button type="button" onClick={() => setEditingOverview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Title</label>
                    <input
                      type="text"
                      value={overviewDraft.title}
                      onChange={(e) => setOverviewDraft({ ...overviewDraft, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <RichTextEditor
                      content={overviewDraft.description}
                      onChange={(html) => setOverviewDraft({ ...overviewDraft, description: html })}
                      minHeight="180px"
                      onImageUpload={(file) => uploadContentImage(file, contentScopeId)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                      <select
                        value={overviewDraft.category}
                        onChange={(e) => setOverviewDraft({ ...overviewDraft, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        {COURSE_CATEGORIES.map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Difficulty</label>
                      <select
                        value={overviewDraft.difficulty}
                        onChange={(e) => setOverviewDraft({ ...overviewDraft, difficulty: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Thumbnail</label>
                    <ThumbnailPicker
                      value={overviewDraft.thumbnail}
                      onChange={(url) => setOverviewDraft({ ...overviewDraft, thumbnail: url })}
                      onFileSelect={async (file) => {
                        setUploadingThumbnail(true);
                        try {
                          const url = await uploadThumbnail(file, courseId);
                          setOverviewDraft({ ...overviewDraft, thumbnail: url });
                        } finally {
                          setUploadingThumbnail(false);
                        }
                      }}
                      uploading={uploadingThumbnail}
                      accent="purple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const tag = tagInput.trim();
                            if (tag && !overviewDraft.tags.includes(tag)) {
                              setOverviewDraft({ ...overviewDraft, tags: [...overviewDraft.tags, tag] });
                              setTagInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Add tag"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {overviewDraft.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => setOverviewDraft({ ...overviewDraft, tags: overviewDraft.tags.filter((t) => t !== tag) })}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveOverviewEdit} disabled={savingOverview} className="bg-purple-700 hover:bg-purple-800 text-white">
                      {savingOverview ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingOverview(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                    <Badge className={`${isSystem ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                      {isSystem ? 'System Course' : 'Educator Course'}
                    </Badge>
                  </div>
                  <div
                    className="text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: course.description || '<p>No description</p>' }}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {course.recommended_age_group && (
                      <Badge variant="outline" className="text-gray-600 border-gray-300">
                        Ages {course.recommended_age_group}
                      </Badge>
                    )}
                    {course.guided_learning_enabled && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Guided Learning</Badge>
                    )}
                    {course.chapter_organization_enabled && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">Chapters</Badge>
                    )}
                    {course.milestone_tracking_enabled && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Milestones</Badge>
                    )}
                    {course.learning_streaks_enabled && (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200">Streaks</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSystem && !editingOverview && (
                    <Button variant="outline" size="sm" onClick={startOverviewEdit} className="border-purple-300 text-purple-700">
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  )}
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusBadge(course.status)}`}>
                    {course.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  {isSystem ? <Shield className="w-5 h-5 text-purple-500" /> : <User className="w-5 h-5 text-gray-500" />}
                  <div>
                    <p className="text-sm text-gray-600">Creator</p>
                    <p className="font-medium text-gray-900 truncate">{course.creator_name}</p>
                    <p className="text-xs text-gray-500">{course.created_by_role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Lessons</p>
                    <p className="font-medium text-gray-900">{course.lessons.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Quizzes</p>
                    <p className="font-medium text-gray-900">{course.quizCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Enrollments</p>
                    <p className="font-medium text-gray-900">{course.total_enrollments}</p>
                  </div>
                </div>
              </div>

              {course.chapter_organization_enabled && chapters.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" /> Chapters
                  </h3>
                  <div className="space-y-3">
                    {chapters.map((ch) => (
                      <div key={ch.id} className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <Layers className="w-5 h-5 text-purple-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ch.title}</p>
                          {ch.description && <p className="text-sm text-gray-500">{ch.description}</p>}
                        </div>
                        <span className="text-sm text-gray-500">{getChapterLessons(ch.id).length} lessons</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {course.milestone_tracking_enabled && milestones.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> Milestones
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                        {milestoneIcons[m.icon || 'Trophy'] || <Trophy className="w-5 h-5 text-amber-500" />}
                        <span className="font-medium text-gray-900 text-sm">{m.title}</span>
                        <span className="text-xs text-gray-500">{m.required_completion_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {course.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lessons Tab ── */}
        {activeTab === 'content' && isSystem && (
          <div className="space-y-6">
            {/* ── Course Templates ── */}
            <div className="bg-white rounded-xl border-2 border-indigo-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Course Templates
              </h3>
              <p className="text-sm text-gray-500 mb-4">Quickly add a pre-built lesson structure to this course.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {COURSE_TEMPLATES.filter((t) => t.id !== 'blank').map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={applyingCourseTemplate}
                    onClick={() => handleApplyCourseTemplate(template.id)}
                    className="p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 text-left transition-all disabled:opacity-50"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{template.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Chapter Management ── */}
            <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Chapters / Modules
                </h3>
                <Button
                  onClick={() => setShowAddChapter(!showAddChapter)}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {showAddChapter ? 'Cancel' : 'Add Chapter'}
                </Button>
              </div>

              {showAddChapter && (
                <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chapter Title</label>
                      <input
                        type="text"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="e.g. Getting Started"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddChapter(); }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                      <input
                        type="text"
                        value={newChapterDesc}
                        onChange={(e) => setNewChapterDesc(e.target.value)}
                        placeholder="Brief description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <Button onClick={handleAddChapter} className="bg-purple-700 hover:bg-purple-800 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              )}

              {chapters.length > 0 ? (
                <div className="space-y-2">
                  {chapters.map((ch, i) => (
                    <div key={ch.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleMoveChapter(ch.id, 'up')} disabled={i === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronUp className="w-3 h-3 text-gray-500" /></button>
                        <button onClick={() => handleMoveChapter(ch.id, 'down')} disabled={i === chapters.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown className="w-3 h-3 text-gray-500" /></button>
                      </div>
                      <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 text-sm">{ch.title}</span>
                        {ch.description && <span className="text-xs text-gray-500 ml-2">{ch.description}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{ch.lesson_count} lessons</span>
                      <button onClick={() => setConfirmDeleteChapterId(ch.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No chapters yet. Chapters help organize lessons into modules.</p>
              )}
            </div>

            {/* ── Lesson Management ── */}
            <div className="bg-white rounded-xl border-2 border-purple-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-purple-600" />
                  Lessons
                  <span className="text-sm font-normal text-gray-500">({course.lessons.length})</span>
                </h3>
                <div className="flex gap-2">
                  {!showAddLesson && (
                    <Button onClick={() => setShowAddLesson(true)} className="bg-purple-700 hover:bg-purple-800 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add Lesson
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Add Lesson Form ── */}
              {showAddLesson && (
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Title *</label>
                      <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Enter lesson title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Type</label>
                      <select
                        value={newLessonType}
                        onChange={(e) => setNewLessonType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="standard">Standard</option>
                        <option value="video">Video</option>
                        <option value="reading">Reading</option>
                        <option value="practice">Practice</option>
                        <option value="quiz">Quiz</option>
                        <option value="assessment">Assessment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chapter (optional)</label>
                      <select
                        value={newLessonChapter}
                        onChange={(e) => setNewLessonChapter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="">No chapter</option>
                        {chapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>{ch.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Layout</label>
                      <select
                        value={newLessonLayout}
                        onChange={(e) => setNewLessonLayout(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="standard">Standard</option>
                        <option value="focus">Focus</option>
                        <option value="two_column">Two Column</option>
                        <option value="wide">Wide</option>
                        <option value="slideshow">Slideshow</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Duration (min)</label>
                      <input
                        type="number"
                        value={newLessonDuration}
                        onChange={(e) => setNewLessonDuration(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Prerequisite Lesson</label>
                      <select
                        value={newLessonPrereq}
                        onChange={(e) => setNewLessonPrereq(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="">None</option>
                        {course.lessons.map((l) => (
                          <option key={l.id} value={l.id}>{l.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                      <select
                        value={newLessonVisibility}
                        onChange={(e) => setNewLessonVisibility(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Learning Objectives (optional)</label>
                    <textarea
                      value={newLessonObjectives}
                      onChange={(e) => setNewLessonObjectives(e.target.value)}
                      placeholder="What will learners achieve in this lesson?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddLesson} disabled={savingLesson || !newLessonTitle.trim()} className="bg-purple-700 hover:bg-purple-800 text-white">
                      {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      Add Lesson
                    </Button>
                    <Button onClick={() => { setShowAddLesson(false); setNewLessonTitle(''); }} variant="outline">Cancel</Button>
                  </div>
                </div>
              )}

              {/* ── Lessons By Chapter ── */}
              {course.chapter_organization_enabled && chapters.map((ch) => {
                const chLessons = getChapterLessons(ch.id);
                if (chLessons.length === 0) return null;
                return (
                  <div key={ch.id} className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                      <Layers className="w-4 h-4 text-purple-500" />
                      {ch.title}
                      <span className="text-xs text-gray-500 font-normal">({chLessons.length} lessons)</span>
                    </h4>
                    <div className="space-y-2">
                      {chLessons.map((lesson, i) => renderLessonRow(lesson, i))}
                    </div>
                  </div>
                );
              })}

              {/* ── Ungrouped Lessons ── */}
              {getUngroupedLessons().length > 0 && (
                <div>
                  {course.chapter_organization_enabled && (
                    <h4 className="font-semibold text-gray-800 mb-2 text-sm">Other Lessons</h4>
                  )}
                  <div className="space-y-2">
                    {getUngroupedLessons().map((lesson, i) => renderLessonRow(lesson, i))}
                  </div>
                </div>
              )}

              {course.lessons.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-700 mb-1">No lessons yet</p>
                  <p className="text-gray-500 mb-4">Start building by adding a lesson or applying a template</p>
                  <Button onClick={() => setShowAddLesson(true)} className="bg-purple-700 hover:bg-purple-800 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add First Lesson
                  </Button>
                  {templates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-2">Or use a template:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {templates.slice(0, 3).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleApplyTemplate(t)}
                            className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200"
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Milestones Tab ── */}
        {activeTab === 'engagement' && isSystem && (
          <div className="bg-white rounded-xl border-2 border-amber-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Course Milestones
              </h2>
              <Button
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Milestone
              </Button>
            </div>

            {showAddMilestone && (
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Milestone Title</label>
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="e.g. First Lesson Completed"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Completion % Required</label>
                    <input
                      type="number"
                      value={newMilestonePct}
                      onChange={(e) => setNewMilestonePct(e.target.value)}
                      min={0} max={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Icon</label>
                    <select
                      value={newMilestoneIcon}
                      onChange={(e) => setNewMilestoneIcon(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="Trophy">Trophy</option>
                      <option value="Target">Target</option>
                      <option value="Zap">Zap</option>
                      <option value="Star">Star</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handleAddMilestone} disabled={!newMilestoneTitle.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Create Milestone
                </Button>
              </div>
            )}

            {milestones.length > 0 ? (
              <div className="space-y-3">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      {milestoneIcons[m.icon || 'Trophy'] || <Trophy className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{m.title}</p>
                      {m.description && <p className="text-sm text-gray-500">{m.description}</p>}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-amber-700">{m.required_completion_pct}%</p>
                      <p className="text-xs text-gray-500">completion</p>
                    </div>
                    <button onClick={() => handleDeleteMilestone(m.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No milestones yet. Milestones help track learner progress through the course.</p>
            )}
          </div>
        )}

        {activeTab === 'admin' && isSystem && (
          <div className="space-y-6">
            {/* ── Lesson Templates ── */}
            <div className="bg-white rounded-xl border-2 border-blue-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-blue-500" />
                Saved Lesson Templates
              </h2>
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((t) => (
                    <div key={t.id} className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{t.title}</h3>
                          {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                        </div>
                        <Badge variant="secondary" className="text-xs">{t.lesson_type}</Badge>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setActiveTab('content'); handleApplyTemplate(t); }} className="text-blue-700 border-blue-300">
                        <Plus className="w-3 h-3 mr-1" /> Apply to Course
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Save lessons as templates from the Content tab to reuse them later.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border-2 border-purple-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Settings className="w-6 h-6 text-purple-600" />
              System Course Settings
            </h2>

            <div className="space-y-6 max-w-2xl">
              {/* Layout Type */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Course Layout</h3>
                <select
                  value={course.course_layout_type}
                  onChange={(e) => handleUpdateField('course_layout_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="standard">Standard</option>
                  <option value="guided">Guided</option>
                  <option value="simplified">Simplified</option>
                  <option value="focused">Focused</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Determines how learners experience this course layout</p>
              </div>

              {/* Chapter Organization */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Chapter Organization</h3>
                  <p className="text-sm text-gray-600 mt-1">Group lessons into chapters/modules</p>
                </div>
                <button
                  onClick={() => toggleToggle('chapter_organization_enabled')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.chapter_organization_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.chapter_organization_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Guided Learning */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Guided Learning Mode</h3>
                  <p className="text-sm text-gray-600 mt-1">Enhanced progress tracking, milestones, and beginner-friendly navigation</p>
                </div>
                <button
                  onClick={() => toggleToggle('guided_learning_enabled')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.guided_learning_enabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.guided_learning_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Milestone Tracking */}
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Milestone Tracking</h3>
                  <p className="text-sm text-gray-600 mt-1">Track learner progress with achievement milestones</p>
                </div>
                <button
                  onClick={() => toggleToggle('milestone_tracking_enabled')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.milestone_tracking_enabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.milestone_tracking_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Learning Streaks */}
              <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Learning Streaks</h3>
                  <p className="text-sm text-gray-600 mt-1">Encourage daily learning with streak tracking</p>
                </div>
                <button
                  onClick={() => toggleToggle('learning_streaks_enabled')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${course.learning_streaks_enabled ? 'bg-rose-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${course.learning_streaks_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Age Group */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Recommended Age Group</h3>
                <input
                  type="text"
                  value={course.recommended_age_group || ''}
                  onChange={(e) => handleUpdateField('recommended_age_group', e.target.value)}
                  placeholder="e.g. 8-12, 13-18, Adult"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Status Management */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Course Status</h3>
                <div className="flex gap-3">
                  {course.status !== 'published' && (
                    <Button onClick={async () => {
                      await supabase.from('courses').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', course.id);
                      await supabase.from('lessons').update({ status: 'published' }).eq('course_id', course.id).eq('status', 'draft');
                      setCourse({ ...course, status: 'published' });
                      await reloadLessons();
                      toast.success('Course and lessons published');
                    }} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-1" /> Publish
                    </Button>
                  )}
                  {course.status !== 'archived' && (
                    <Button onClick={() => setConfirmArchive(true)} className="bg-red-600 hover:bg-red-700 text-white">
                      <Archive className="w-4 h-4 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Course Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Enrollments</p>
                    <p className="text-2xl font-bold text-gray-900">{course.total_enrollments}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lessons</p>
                    <p className="text-2xl font-bold text-gray-900">{course.lessons.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quizzes</p>
                    <p className="text-2xl font-bold text-gray-900">{course.quizCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
      {TemplateSaveModal}

      <LessonEditor
        open={lessonEditorOpen}
        onClose={() => setLessonEditorOpen(false)}
        courseId={courseId}
        lessonId={editingLessonId}
        onSaved={() => { reloadLessons(); setLessonEditorOpen(false); }}
      />

      <QuizBuilderModal
        isOpen={quizEditorLessonId !== null}
        onClose={() => setQuizEditorLessonId(null)}
        onSave={() => { setQuizEditorLessonId(null); reloadLessons(); }}
        lessonId={quizEditorLessonId || undefined}
        courseId={courseId}
      />

      {/* Confirm Delete Lesson */}
      <ConfirmAction
        title="Delete Lesson"
        description="Delete this lesson? This action cannot be undone."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        onConfirm={() => { if (confirmDeleteLessonId) { handleDeleteLesson(confirmDeleteLessonId); setConfirmDeleteLessonId(null); } }}
        open={!!confirmDeleteLessonId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteLessonId(null); }}
      />

      {/* Confirm Delete Chapter */}
      <ConfirmAction
        title="Delete Chapter"
        description="Delete this chapter? Lessons will be unassigned."
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<Trash2 className="w-5 h-5 text-red-600" />}
        onConfirm={() => { if (confirmDeleteChapterId) { handleDeleteChapter(confirmDeleteChapterId); setConfirmDeleteChapterId(null); } }}
        open={!!confirmDeleteChapterId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteChapterId(null); }}
      />

      {/* Confirm Archive Course */}
      <ConfirmAction
        title="Archive Course"
        description="Archive this course? Learners will no longer see it."
        confirmText="Archive"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        icon={<Archive className="w-5 h-5 text-red-600" />}
        onConfirm={async () => { setConfirmArchive(false); await archiveSystemCourse(course!.id); setCourse({ ...course!, status: 'archived' }); toast.success('Course archived'); }}
        open={confirmArchive}
        onOpenChange={(o) => { if (!o) setConfirmArchive(false); }}
      />
    </div>
  );

  // ─── Lesson Row Renderer ──────────────────────────────────────────────

  function renderLessonRow(lesson: LessonItem, displayIndex: number) {
    const allLessonIds = course?.lessons.map(l => l.id) || [];
    const idx = allLessonIds.indexOf(lesson.id);
    const isLocked = lesson.prerequisite_lesson_id && course?.lessons.find(l => l.id === lesson.prerequisite_lesson_id)?.status !== 'published';
    if (isLocked) {}

    return (
      <div
        key={lesson.id}
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
      >
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => handleMoveLesson(lesson.id, 'up')}
            disabled={idx === 0}
            className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <ChevronUp className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={() => handleMoveLesson(lesson.id, 'down')}
            disabled={idx === course!.lessons.length - 1}
            className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
        </div>
        <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
          {displayIndex + 1}
        </span>
        {lessonTypeIcon(lesson.lesson_type || 'standard')}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm truncate">{lesson.title}</p>
            {lesson.visibility_status === 'hidden' && (
              <Badge className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0">Hidden</Badge>
            )}
            {lesson.visibility_status === 'scheduled' && (
              <Badge className="bg-blue-100 text-blue-600 text-xs px-1.5 py-0 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> Scheduled
              </Badge>
            )}
            {lesson.prerequisite_lesson_id && (
              <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Prerequisite
              </Badge>
            )}
            {lesson.quiz_id && (
              <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0 flex items-center gap-1">
                <HelpCircle className="w-2.5 h-2.5" /> Quiz: {lesson.quiz_title || 'Untitled'} ({lesson.quiz_question_count || 0} q)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{lesson.lesson_type || 'standard'}</span>
            {lesson.estimated_duration && <span>{lesson.estimated_duration} min</span>}
            {lesson.prerequisite_lesson_id && (
              <span className="text-amber-600">
                Requires: {getPrerequisiteTitle(lesson.prerequisite_lesson_id)}
              </span>
            )}
            {lesson.learning_objectives && <span className="truncate max-w-[200px]">{lesson.learning_objectives}</span>}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          lesson.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {lesson.status}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => openLessonEditor(lesson.id)}
            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Edit content"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setQuizEditorLessonId(lesson.id)}
            className={`p-1.5 rounded transition-colors ${
              lesson.quiz_id ? 'text-blue-600 hover:bg-blue-50' : 'text-amber-600 hover:bg-amber-50'
            }`}
            title={lesson.quiz_id ? 'Edit quiz' : 'Add quiz'}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleVisibility(lesson.id, lesson.visibility_status || 'visible')}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title={lesson.visibility_status === 'hidden' ? 'Show' : 'Hide'}
          >
            {lesson.visibility_status === 'hidden' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleDuplicateLesson(lesson.id)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowSaveTemplate(lesson.id); setTemplateTitle(lesson.title + ' Template'); }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Save as Template"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDeleteLessonId(lesson.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
}
