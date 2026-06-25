'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Loader2, Video, FileText, Plus, Trash2, GripVertical, Layout, FileEdit, Play, Shield, ChevronDown, Clock, Layers, Upload, Image, Link, History, LayoutTemplate, StickyNote, Save, MousePointerClick, Settings, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createLesson, updateLesson, fetchLessonById, getNextSequenceOrder, fetchLessonInteractiveContent, createInteractiveContent, updateInteractiveContent, deleteInteractiveContent, fetchVideoQuestions, createVideoQuestion, deleteVideoQuestion, fetchLessonAssets, createLessonAsset, deleteLessonAsset, uploadCourseFile, saveLessonVersion, fetchLessonSummaries, StudentSummarySubmission } from '@/lib/educator-api';
import DOMPurify from 'isomorphic-dompurify';
import type { LessonAsset } from '@/lib/educator-api';
import { LessonSummarySettings } from '@/components/educator/LessonSummarySettings';
import { fetchLessonCommentCount } from '@/lib/community-api';
import { LessonDiscussion } from '@/components/community/LessonDiscussion';

import type { InteractiveActivityData } from '@/lib/interactive-types';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ContentBlockEditor } from '@/components/content-blocks/ContentBlockEditor';
import { InteractiveActivityBuilder } from '@/components/interactive/InteractiveActivityBuilder';
import { InteractiveActivityViewer } from '@/components/interactive/InteractiveActivityViewer';
import { MediaPickerModal } from '@/components/educator/MediaPickerModal';
import { LessonVersionHistory } from '@/components/educator/LessonVersionHistory';
import { blocksToHtml, htmlToBlocks } from '@/lib/content-blocks';
import type { ContentBlock } from '@/lib/content-blocks';
import type { LessonFields, AccessibilityTemplate, InteractiveContent, InteractiveContentType, InteractiveContentFields } from '@/lib/educator-api';

export type LessonFormData = {
  title: string;
  content_html: string;
  video_url: string;
  transcript: string;
  status: 'draft' | 'published';
  has_video: boolean;
  has_pdf: boolean;
  has_quiz: boolean;
  has_transcript: boolean;
  has_summary_activity: boolean;
  lesson_layout: string;
  simplified_summary: string;
  focus_mode_enabled: boolean;
  chunked_content_enabled: boolean;
  checkpoints_enabled: boolean;
  adaptive_learning_enabled: boolean;
  estimated_duration: number;
  summary_source: string;
  summary_word_target: number;
  summary_key_points: string[];
  summary_reflection_questions: string[];
  allow_discussions?: boolean;
  allow_download?: boolean;
};

const defaultFormData: LessonFormData = {
  title: '',
  content_html: '',
  video_url: '',
  transcript: '',
  status: 'published',
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
  allow_discussions: false,
  allow_download: false,
};

interface LessonEditorProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  lessonId?: string | null;
  onSaved?: () => void;
  /** When true, uses local state without DB calls (for CourseBuilder wizard) */
  localMode?: boolean;
  /** In localMode, initial data and change callback */
  localData?: Partial<LessonFormData>;
  onLocalChange?: (data: LessonFormData) => void;
  /** In localMode, called instead of saveToDB */
  onLocalSave?: (data: LessonFormData) => void;
  /** Optional callback to open quiz editor from within lesson editor */
  onManageQuiz?: () => void;
}

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

function templateToHtml(tmpl: AccessibilityTemplate): string {
  return tmpl.content_structure
    .map((section) => {
      return `<section>\n  <h2>${section.label}</h2>\n  <p>[Add your ${section.label.toLowerCase()} content here]</p>\n</section>`;
    })
    .join('\n\n<hr class="section-divider" />\n\n');
}

export function LessonEditor({
  open, onClose, courseId, lessonId, onSaved,
  localMode, localData, onLocalChange, onLocalSave,
  onManageQuiz,
}: LessonEditorProps) {
  const [form, setForm] = useState<LessonFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState<'basics' | 'content' | 'media' | 'activities' | 'quiz' | 'assets' | 'settings' | 'discussions' | 'submissions'>('basics');
  const [studentSubmissions, setStudentSubmissions] = useState<StudentSummarySubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [discussionCount, setDiscussionCount] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interactiveItems, setInteractiveItems] = useState<InteractiveContent[]>([]);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [editingInteractiveId, setEditingInteractiveId] = useState<string | null>(null);
  const [selectedActivityTab, setSelectedActivityTab] = useState<string | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [videoQuestions, setVideoQuestions] = useState<import('@/lib/educator-api').VideoQuestion[]>([]);
  const [showVideoQuestionForm, setShowVideoQuestionForm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [vqTitle, setVqTitle] = useState('');
  const [vqTimestamp, setVqTimestamp] = useState('');
  const [vqQuestion, setVqQuestion] = useState('');
  const [vqOptions, setVqOptions] = useState<string[]>(['', '']);
  const [vqCorrectIndex, setVqCorrectIndex] = useState(0);
  const [lessonAssets, setLessonAssets] = useState<LessonAsset[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerAccept, setMediaPickerAccept] = useState<string | undefined>(undefined);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string, kind: string, title?: string) => void) | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [coursePrimaryFocus, setCoursePrimaryFocus] = useState<string | null>(null);
  const [educatorCustomGuide, setEducatorCustomGuide] = useState<string>('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [savingGuide, setSavingGuide] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [deletingVideoQuestion, setDeletingVideoQuestion] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  // Track the current lesson ID including newly-created ones before dialog closes
  const currentLessonIdRef = useRef<string | null>(lessonId ?? null);

  const isEditing = !!lessonId;
  const dbItemIdsRef = useRef<Set<string>>(new Set());

  // Keep currentLessonIdRef in sync with prop
  useEffect(() => { currentLessonIdRef.current = lessonId ?? null; }, [lessonId]);

  useEffect(() => {
    if (activeTab === 'submissions' && lessonId) {
      setSubmissionsLoading(true);
      fetchLessonSummaries(lessonId, courseId)
        .then(setStudentSubmissions)
        .catch(() => toast.error('Failed to load student summaries'))
        .finally(() => setSubmissionsLoading(false));
    }
  }, [activeTab, lessonId, courseId]);

  useEffect(() => {
    if (!open || !courseId) return;
    import('@/lib/educator-api').then(({ fetchCourseById }) => {
      fetchCourseById(courseId).then(c => {
        setCoursePrimaryFocus(c?.primary_disability_focus || null);
        setEducatorCustomGuide(c?.educator_custom_guide || '');
      }).catch(() => {});
    });
  }, [open, courseId]);

  useEffect(() => {
    if (!form.video_url || !getYouTubeId(form.video_url)) {
      setVideoDuration(null);
      return;
    }
    const ytid = getYouTubeId(form.video_url);
    const initPlayer = () => {
      if (!document.getElementById('yt-hidden-player')) return;
      try {
        new (window as any).YT.Player('yt-hidden-player', {
          videoId: ytid,
          events: {
            onReady: (event: any) => {
              const dur = event.target.getDuration();
              if (dur && dur > 0) setVideoDuration(dur);
            }
          }
        });
      } catch (err) {}
    };
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    }
  }, [form.video_url, activeTab]);

  useEffect(() => {
    if (!open) return;
    if (localMode && localData) {
      setForm({ ...defaultFormData, ...localData });
      return;
    }
    if (!lessonId) {
      setForm(defaultFormData);
      setLessonAssets([]);
      return;
    }
    setLoading(true);
    fetchLessonById(lessonId)
      .then((lesson) => {
        setForm({
          title: lesson.title,
          content_html: lesson.content_html || '',
          video_url: lesson.video_url || '',
          transcript: lesson.transcript || '',
          status: lesson.status || 'draft',
          has_video: lesson.has_video ?? true,
          has_pdf: lesson.has_pdf ?? true,
          has_quiz: lesson.has_quiz ?? true,
          has_transcript: lesson.has_transcript ?? true,
          has_summary_activity: lesson.has_summary_activity ?? false,
          lesson_layout: lesson.lesson_layout || 'standard',
          simplified_summary: lesson.simplified_summary || '',
          focus_mode_enabled: lesson.focus_mode_enabled ?? false,
          chunked_content_enabled: lesson.chunked_content_enabled ?? false,
          checkpoints_enabled: lesson.checkpoints_enabled ?? false,
          adaptive_learning_enabled: lesson.adaptive_learning_enabled ?? false,
          allow_discussions: lesson.allow_discussions ?? false,
          estimated_duration: lesson.estimated_duration ?? 10,
          summary_source: lesson.summary_source || 'entire_lesson',
          summary_word_target: lesson.summary_word_target ?? 100,
          summary_key_points: Array.isArray(lesson.summary_key_points) ? lesson.summary_key_points : [],
          summary_reflection_questions: Array.isArray(lesson.summary_reflection_questions) ? lesson.summary_reflection_questions : [],
        });
      })
      .catch(() => toast.error('Failed to load lesson'))
      .finally(() => setLoading(false));
    fetchLessonInteractiveContent(lessonId)
      .then((items) => {
        setInteractiveItems(items);
        dbItemIdsRef.current = new Set(items.map((i: InteractiveContent) => i.id));
      })
      .catch(() => {});
    fetchVideoQuestions(lessonId)
      .then(setVideoQuestions)
      .catch(() => {});
    fetchLessonAssets(lessonId)
      .then(setLessonAssets)
      .catch(() => {});
    fetchLessonCommentCount(lessonId)
      .then(setDiscussionCount)
      .catch(() => {});
  }, [open, lessonId, localMode, localData]);

  useEffect(() => {
    if (typeof document !== 'undefined' && form.content_html && contentBlocks.length === 0) {
      try {
        setContentBlocks(htmlToBlocks(form.content_html));
      } catch { /* keep empty */ }
    }
  }, [form.content_html]);

  const update = useCallback((field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (localMode && onLocalChange) onLocalChange(next);
      return next;
    });
    setIsDirty(true);
  }, [localMode, onLocalChange]);

  const handleApplyTemplate = useCallback((tmpl: AccessibilityTemplate) => {
    update('title', `${tmpl.name} - ${tmpl.target_disability.replace(/_/g, ' ')}`);
    update('content_html', templateToHtml(tmpl));
    switch (tmpl.target_disability) {
      case 'cognitive_impairment':
      case 'dyslexia':
        update('lesson_layout', 'focus');
        update('focus_mode_enabled', true);
        update('chunked_content_enabled', true);
        break;
      case 'adhd':
        update('lesson_layout', 'slideshow');
        update('chunked_content_enabled', true);
        update('checkpoints_enabled', true);
        break;
      case 'asd':
        update('lesson_layout', 'standard');
        update('checkpoints_enabled', true);
        break;
      case 'visual_impairment':
        update('lesson_layout', 'wide');
        update('has_video', false);
        update('focus_mode_enabled', true);
        break;
    }
  }, [update]);

  const handleAddVideoQuestion = async () => {
    if (!lessonId || !vqTitle.trim() || !vqQuestion.trim() || vqOptions.some(o => !o.trim())) {
      toast.error('Please fill in all fields');
      return;
    }
    const ts = parseFloat(vqTimestamp);
    if (isNaN(ts) || ts < 0) {
      toast.error('Please enter a valid timestamp in seconds');
      return;
    }
    try {
      const created = await createVideoQuestion(lessonId, {
        title: vqTitle.trim(),
        timestamp_seconds: ts,
        question_text: vqQuestion.trim(),
        options: vqOptions.map(o => o.trim()),
        correct_option_index: vqCorrectIndex,
      });
      setVideoQuestions((prev) => [...prev, created]);
      setVqTitle('');
      setVqTimestamp('');
      setVqQuestion('');
      setVqOptions(['', '']);
      setVqCorrectIndex(0);
      setShowVideoQuestionForm(false);
      toast.success('Video question added');
    } catch {
      toast.error('Failed to add video question');
    }
  };

  const handleDeleteVideoQuestion = async (id: string) => {
    if (deletingVideoQuestion) return;
    setDeletingVideoQuestion(id);
    try {
      await deleteVideoQuestion(id);
      setVideoQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Video question removed');
    } catch {
      toast.error('Failed to remove video question');
    } finally {
      setDeletingVideoQuestion(null);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Lesson title is required'); return null; }

    if (localMode && onLocalSave) {
      onLocalSave(form);
      setIsDirty(false);
      return 'local';
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fields: Partial<LessonFields> = {
        title: form.title,
        content_html: form.content_html,
        video_url: form.video_url || null,
        transcript: form.transcript || null,
        status: form.status,
        has_video: form.has_video,
        has_pdf: form.has_pdf,
        has_quiz: form.has_quiz,
        has_transcript: form.has_transcript,
        has_summary_activity: form.has_summary_activity,
        lesson_layout: form.lesson_layout as LessonFields['lesson_layout'],
        simplified_summary: form.simplified_summary || null,
        focus_mode_enabled: form.focus_mode_enabled,
        chunked_content_enabled: form.chunked_content_enabled,
        checkpoints_enabled: form.checkpoints_enabled,
        adaptive_learning_enabled: form.adaptive_learning_enabled,
        allow_discussions: form.allow_discussions,
        estimated_duration: form.estimated_duration,
      };

      if (form.has_summary_activity) {
        fields.summary_source = form.summary_source as 'video' | 'pdf' | 'lesson_text' | 'entire_lesson';
        fields.summary_word_target = form.summary_word_target;
        fields.summary_key_points = form.summary_key_points;
        fields.summary_reflection_questions = form.summary_reflection_questions;
      }

      let savedLessonId = lessonId;
      if (isEditing && lessonId) {
        await updateLesson(lessonId, fields);
        toast.success('Lesson updated');
      } else {
        const seq = await getNextSequenceOrder(courseId);
        const created = await createLesson(user.user.id, {
          ...fields,
          course_id: courseId,
          sequence_order: seq,
        } as LessonFields);
        savedLessonId = created.id;
        toast.success('Lesson added');
      }
      // Persist interactive items
      if (savedLessonId) {
        for (const item of interactiveItems) {
          let hasContent = false;
          const d = item.content_data as any;
          if (item.content_type === 'flashcards' && d?.cards?.length > 0) hasContent = true;
          else if (item.content_type === 'drag_drop' && d?.items?.length > 0) hasContent = true;
          else if (item.content_type === 'fill_blanks' && d?.segments?.length > 0) hasContent = true;
          else if (item.content_type === 'memory_game' && d?.cards?.length > 0) hasContent = true;
          else if (item.content_type === 'timeline' && d?.events?.length > 0) hasContent = true;

          const isDraft = (item as any).is_draft || !hasContent;

          if (dbItemIdsRef.current.has(item.id)) {
            await updateInteractiveContent(item.id, {
              content_type: item.content_type,
              title: item.title,
              content_data: item.content_data as Record<string, unknown>,
              accessibility_settings: item.accessibility_settings,
              is_draft: isDraft,
            });
          } else {
            await createInteractiveContent(savedLessonId, {
              content_type: item.content_type,
              title: item.title,
              content_data: item.content_data as Record<string, unknown>,
              accessibility_settings: item.accessibility_settings,
              sequence_order: item.sequence_order,
              is_draft: isDraft,
            });
          }
        }
      }

      if (savedLessonId && form.content_html.trim()) {
        try {
          await saveLessonVersion(savedLessonId, form.content_html, `Auto-save ${new Date().toLocaleTimeString()}`);
        } catch (e) {
          console.error('Failed to auto-save version', e);
        }
      }

      setIsDirty(false);
      onSaved?.();
      return savedLessonId;
    } catch {
      toast.error('Failed to save lesson');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    const savedId = await handleSave();
    if (savedId) {
      setIsDirty(false);
      onClose();
    }
  };

  const attemptClose = useCallback(() => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them and close?')) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  /** Auto-saves the lesson to DB if not yet saved, returning the lesson ID */
  const ensureLessonSaved = async (): Promise<string | null> => {
    if (currentLessonIdRef.current) return currentLessonIdRef.current;
    if (!form.title.trim()) {
      toast.error('Please enter a lesson title first');
      setActiveTab('basics');
      return null;
    }
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const fields: Partial<LessonFields> = {
        title: form.title,
        content_html: form.content_html,
        video_url: form.video_url || null,
        transcript: form.transcript || null,
        status: form.status,
        has_video: form.has_video,
        has_pdf: form.has_pdf,
        has_quiz: form.has_quiz,
        has_transcript: form.has_transcript,
        has_summary_activity: form.has_summary_activity,
        lesson_layout: form.lesson_layout as LessonFields['lesson_layout'],
        simplified_summary: form.simplified_summary || null,
        focus_mode_enabled: form.focus_mode_enabled,
        chunked_content_enabled: form.chunked_content_enabled,
        checkpoints_enabled: form.checkpoints_enabled,
        adaptive_learning_enabled: form.adaptive_learning_enabled,
        estimated_duration: form.estimated_duration,
      };
      const seq = await getNextSequenceOrder(courseId);
      const created = await createLesson(user.user.id, { ...fields, course_id: courseId, sequence_order: seq } as LessonFields);
      currentLessonIdRef.current = created.id;
      setIsDirty(false);
      toast.success('Lesson auto-saved — now uploading asset…');
      return created.id;
    } catch {
      toast.error('Failed to auto-save lesson');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (file: File) => {
    // Only allow PDF and PPTX
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.pptx') && file.type !== 'application/pdf' && file.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      toast.error('Only PDF and PPTX files are allowed for resources');
      return;
    }

    const lid = await ensureLessonSaved();
    if (!lid) return;
    setUploadingAsset(true);
    const loadingToastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const url = await uploadCourseFile(file, courseId, lid);
      const kind = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document';
      await createLessonAsset(lid, kind, file.name, url);
      const updated = await fetchLessonAssets(lid);
      setLessonAssets(updated);
      toast.success('Resource uploaded successfully', { id: loadingToastId });
      setIsDirty(true);
    } catch (err: unknown) { 
      toast.error((err instanceof Error ? err.message : null) || 'Upload failed', { id: loadingToastId }); 
    }
    finally { setUploadingAsset(false); }
  };

  const handleAddLinkAsset = async () => {
    const lid = await ensureLessonSaved();
    if (!lid) return;
    const url = window.prompt('Enter the URL (e.g., https://example.com):');
    if (!url) return;
    const title = window.prompt('Enter a title for this link:');
    if (!title) return;
    try {
      await createLessonAsset(lid, 'link', title, url);
      const updated = await fetchLessonAssets(lid);
      setLessonAssets(updated);
      toast.success('Link added');
    } catch { toast.error('Failed to add link'); }
  };

  const handleDeleteInteractiveActivity = async (id: string) => {
    if (deletingActivity) return;
    setDeletingActivity(true);
    try {
      await deleteInteractiveContent(id);
      setInteractiveItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Activity removed');
    } catch {
      toast.error('Failed to remove activity');
    } finally {
      setDeletingActivity(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (deletingAssetId) return;
    setDeletingAssetId(id);
    try {
      await deleteLessonAsset(id);
      setLessonAssets(prev => prev.filter(a => a.id !== id));
      toast.success('Asset removed');
    } catch { toast.error('Failed to remove asset'); }
    finally { setDeletingAssetId(null); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) attemptClose(); }}>
        <DialogContent className="sm:max-w-7xl w-[98vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>{isEditing ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
              <DialogDescription>Create educational content for your course</DialogDescription>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row pb-20 min-h-[60vh]">
              {/* Left Sidebar Tabs */}
              <div className="lg:w-56 shrink-0 border-r border-gray-100 pr-4 space-y-1 pt-2">
                <button type="button" onClick={() => setActiveTab('basics')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'basics' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><BookOpen className="w-4 h-4" /> Basics</button>
                <button type="button" onClick={() => setActiveTab('content')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'content' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}><FileText className="w-4 h-4" /> Content</button>
                <button type="button" onClick={() => setActiveTab('media')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'media' ? 'bg-rose-50 text-rose-700' : 'text-gray-600 hover:bg-gray-50'}`}><Video className="w-4 h-4" /> Media</button>
                <button type="button" onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'activities' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Play className="w-4 h-4" /> Activities</button>
                <button type="button" onClick={() => setActiveTab('quiz')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'quiz' ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-50'}`}><FileEdit className="w-4 h-4" /> Quiz</button>
                <button type="button" onClick={() => setActiveTab('assets')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'assets' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><FileText className="w-4 h-4" /> Resources {lessonAssets.length > 0 && <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">{lessonAssets.length}</span>}</button>
                <button type="button" onClick={() => setActiveTab('discussions')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'discussions' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare className="w-4 h-4" /> Discussions {discussionCount > 0 && <span className="ml-auto text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{discussionCount}</span>}</button>
                <button type="button" onClick={() => setActiveTab('submissions')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'submissions' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}><BookOpen className="w-4 h-4" /> Submissions</button>
                <button type="button" onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-slate-100 text-slate-800' : 'text-gray-600 hover:bg-gray-50'}`}><Settings className="w-4 h-4" /> Settings</button>
              </div>

              {/* Main Content Pane */}
              <div className="flex-1 min-w-0 px-0 lg:px-6 pt-4 lg:pt-0">
                {/* ── BASICS TAB ── */}
                {activeTab === 'basics' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson Basics</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Title *</label>
                          <div className="flex gap-2">
                            <Input
                              value={form.title}
                              onChange={(e) => update('title', e.target.value)}
                              placeholder="e.g., What is Web Accessibility?"
                              className="text-lg py-6 flex-1"
                            />
                            {isEditing && (
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setVersionHistoryOpen(true)} className="gap-2" title="Version History">
                                  <History className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => update('status', 'draft')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${form.status === 'draft' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              <div className={`w-3 h-3 rounded-full ${form.status === 'draft' ? 'bg-amber-500' : 'bg-gray-300'}`} /> Draft
                            </button>
                            <button type="button" onClick={() => update('status', 'published')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${form.status === 'published' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              <div className={`w-3 h-3 rounded-full ${form.status === 'published' ? 'bg-green-500' : 'bg-gray-300'}`} /> Published
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CONTENT TAB ── */}
                {activeTab === 'content' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Lesson Content</h3>
                    </div>
                    {(() => {
                      const handleDirectImageUpload = async (file: File) => {
                        let targetLessonId = currentLessonIdRef.current;
                        if (!targetLessonId) {
                          targetLessonId = await ensureLessonSaved();
                          if (!targetLessonId) {
                            toast.error('You must save the lesson or enter a title before uploading new media.');
                            throw new Error('Lesson not saved');
                          }
                        }
                        const loadingToastId = toast.loading('Uploading image...');
                        try {
                          const url = await uploadCourseFile(file, courseId, lessonId);
                          await createLessonAsset(lessonId, 'image', file.name, url);
                          toast.success('Image uploaded successfully', { id: loadingToastId });
                          return url;
                        } catch (err) {
                          console.error(err);
                          toast.error('Failed to upload image', { id: loadingToastId });
                          throw err;
                        }
                      };
                      
                      return (
                        <RichTextEditor  
                          content={form.content_html} 
                          onChange={(html) => update('content_html', html)} 
                          placeholder="Start building your lesson content here..." 
                          minHeight="300px" 
                          onOpenMediaPicker={async (onSelect, accept) => {
                            let targetLessonId = currentLessonIdRef.current;
                            if (!targetLessonId) {
                              targetLessonId = await ensureLessonSaved();
                              if (!targetLessonId) {
                                toast.error('You must enter a title to open media library.');
                                return;
                              }
                            }
                            setMediaPickerCallback(() => onSelect);
                            setMediaPickerAccept(accept);
                            setMediaPickerOpen(true);
                          }}
                          onImageUpload={handleDirectImageUpload}
                        />
                      );
                    })()}
                    {form.lesson_layout === 'slideshow' && (() => {
                      const slides = form.content_html.split(/<hr\s*\/?>/i).filter(s => s.trim());
                      return (
                        <div className="mt-4">
                          <label className="block text-xs font-medium text-gray-500 mb-2">Slide Preview &mdash; use <code className="text-purple-600 bg-purple-50 px-1 rounded">{'<hr>'}</code> to separate slides</label>
                          {slides.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {slides.map((slide, i) => (
                                <div key={i} className="flex-shrink-0 w-48 border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-gray-400">Slide {i + 1}/{slides.length}</span></div>
                                  <div className="text-xs text-gray-700 leading-relaxed line-clamp-6 [&_img]:max-h-12 [&_img]:rounded [&_img]:mx-auto [&_img]:block" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(slide) }} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center"><p className="text-xs text-gray-500">Add horizontal rules ({'<hr>'}) to create slides</p></div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── MEDIA TAB ── */}
                {activeTab === 'media' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">Media & Video</h3>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Video URL (YouTube)</label>
                      <Input type="url" value={form.video_url} onChange={(e) => update('video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                    {form.video_url && getYouTubeId(form.video_url) && (
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-sm relative">
                        <iframe id="yt-hidden-player" src={`https://www.youtube.com/embed/${getYouTubeId(form.video_url)}?enablejsapi=1`} title="Video Preview" className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    )}
                    {form.video_url && getYouTubeId(form.video_url) && (
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-rose-500" />
                            <span className="text-sm font-semibold text-gray-900">Video Questions</span>
                            <span className="text-xs text-gray-400">({videoQuestions.length})</span>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowVideoQuestionForm(!showVideoQuestionForm)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> {showVideoQuestionForm ? 'Cancel' : 'Add Question'}
                          </Button>
                        </div>
                        {showVideoQuestionForm && (
                          <div className="space-y-3 p-4 border border-dashed border-gray-300 rounded-lg mb-3 bg-gray-50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div><label className="block text-xs font-medium text-gray-700 mb-1">Title</label><Input value={vqTitle} onChange={(e) => setVqTitle(e.target.value)} placeholder="e.g., Check-in question" className="text-sm" /></div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Timestamp (seconds) {videoDuration && <span className="text-gray-400 font-normal ml-1">(max {Math.floor(videoDuration)})</span>}</label>
                                <Input type="number" min="0" step="0.1" max={videoDuration || undefined} value={vqTimestamp} onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (videoDuration && val > videoDuration) setVqTimestamp(videoDuration.toString());
                                  else setVqTimestamp(e.target.value);
                                }} placeholder="e.g., 45" className="text-sm" />
                                {videoDuration && parseFloat(vqTimestamp) > videoDuration && <p className="text-xs text-red-500 mt-1">Cannot exceed video duration.</p>}
                              </div>
                            </div>
                            <div><label className="block text-xs font-medium text-gray-700 mb-1">Question</label><Input value={vqQuestion} onChange={(e) => setVqQuestion(e.target.value)} placeholder="What is the main concept being discussed?" className="text-sm" /></div>
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-gray-700">Options</label>
                              {vqOptions.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <input type="radio" name="vq_correct" checked={vqCorrectIndex === i} onChange={() => setVqCorrectIndex(i)} className="shrink-0" />
                                  <Input value={opt} onChange={(e) => { const next = [...vqOptions]; next[i] = e.target.value; setVqOptions(next); }} placeholder={`Option ${i + 1}`} className="text-sm" />
                                  <span className="text-[10px] text-gray-400 w-10 shrink-0">{i === vqCorrectIndex ? 'Correct' : ''}</span>
                                  {vqOptions.length > 2 && <button type="button" onClick={() => { const next = vqOptions.filter((_, j) => j !== i); setVqOptions(next); if (vqCorrectIndex >= next.length) setVqCorrectIndex(next.length - 1); }} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                                </div>
                              ))}
                              <button type="button" onClick={() => setVqOptions([...vqOptions, ''])} className="text-xs text-blue-600 hover:text-blue-700">+ Add option</button>
                            </div>
                            <div className="flex justify-end">
                              <Button type="button" size="sm" onClick={handleAddVideoQuestion} disabled={!vqTitle.trim() || !vqQuestion.trim() || vqOptions.some(o => !o.trim())}><Plus className="w-3.5 h-3.5 mr-1" /> Save Question</Button>
                            </div>
                          </div>
                        )}
                        {videoQuestions.length > 0 && (
                          <div className="space-y-2">
                            {videoQuestions.map((q, i) => (
                              <div key={q.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-semibold text-gray-500">#{i + 1}</span><span className="text-sm font-medium text-gray-900 truncate">{q.title}</span><span className="text-[10px] font-mono bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">{q.timestamp_seconds}s</span></div>
                                  <p className="text-sm text-gray-700 mt-0.5">{q.question_text}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-1">{q.options.map((opt, j) => <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full border ${j === q.correct_option_index ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{j === q.correct_option_index ? '✓ ' : ''}{opt}</span>)}</div>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteVideoQuestion(q.id)} disabled={deletingVideoQuestion === q.id} className="text-red-500 hover:text-red-700 shrink-0">{deletingVideoQuestion === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACTIVITIES TAB ── */}
                {activeTab === 'activities' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Interactive Activities</h3><Button type="button" size="sm" onClick={() => { setEditingInteractiveId(null); setShowInteractiveBuilder(true); }}><Plus className="w-4 h-4 mr-1" /> Add Activity</Button></div>
                    <p className="text-sm text-gray-500">Add flashcards, drag & drop, fill-in-the-blanks, memory games, and timeline interactive components.</p>
                    {interactiveItems.length === 0 ? <p className="text-sm text-gray-500 italic border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">No interactive activities yet.</p> : (() => {
                      const sorted = [...interactiveItems].sort((a, b) => a.sequence_order - b.sequence_order);
                      
                      const grouped = sorted.reduce((acc, item) => {
                        const type = item.content_type;
                        if (!acc[type]) acc[type] = [];
                        acc[type].push(item);
                        return acc;
                      }, {} as Record<string, typeof sorted>);

                      const TYPE_LABELS: Record<string, string> = {
                        'flashcards': 'Flashcards',
                        'drag_drop': 'Drag & Drop',
                        'fill_blanks': 'Fill in the Blanks',
                        'memory_game': 'Memory Game',
                        'timeline': 'Timeline'
                      };

                      const activeTypeFallback = Object.keys(grouped)[0] || '';
                      
                      const activeItemFallback = grouped[activeTypeFallback]?.[0];
                      const activeId = selectedActivityTab && sorted.some(i => i.id === selectedActivityTab) ? selectedActivityTab : (activeItemFallback?.id || '');
                      
                      const activeItem = sorted.find(i => i.id === activeId);
                      const currentType = activeItem ? activeItem.content_type : activeTypeFallback;

                      return (
                        <div className="space-y-4">
                          {Object.keys(grouped).length > 1 && (
                            <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
                              {Object.entries(grouped).map(([type, items]) => (
                                <button
                                  key={type}
                                  onClick={() => setSelectedActivityTab(items[0].id)}
                                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                                    currentType === type 
                                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {TYPE_LABELS[type] || type} ({items.length})
                                </button>
                              ))}
                            </div>
                          )}

                          {grouped[currentType] && grouped[currentType].length > 1 && (
                            <div className="flex flex-wrap gap-2 px-2">
                              {grouped[currentType].map((item, idx) => (
                                <button
                                  key={item.id}
                                  onClick={() => setSelectedActivityTab(item.id)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    activeId === item.id
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                                  }`}
                                >
                                  Set {idx + 1}: {item.title || 'Untitled'}
                                </button>
                              ))}
                            </div>
                          )}

                          {activeItem && (
                            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <h4 className="font-bold text-gray-800 text-sm">{activeItem.title}</h4>
                                <div className="flex items-center gap-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditingInteractiveId(activeItem.id); setShowInteractiveBuilder(true); }} className="text-xs h-7">Edit</Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => activeItem && handleDeleteInteractiveActivity(activeItem.id)} disabled={deletingActivity} className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50">{deletingActivity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}</Button>
                                </div>
                              </div>
                              <div className="p-0 sm:p-4">
                                <InteractiveActivityViewer contentType={activeItem.content_type as any} title={activeItem.title} data={activeItem.content_data as any} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── QUIZ TAB ── */}
                {activeTab === 'quiz' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">End-of-Lesson Quiz</h3>
                    <p className="text-sm text-gray-500 mb-6">Manage the primary quiz associated with this lesson.</p>
                    
                    <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-2">
                        <FileEdit className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Quiz Management</h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                          {isEditing 
                            ? 'Manage questions, options, and explanations for this lesson\'s quiz.' 
                            : 'Save this lesson first to start adding quiz questions.'}
                        </p>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          type="button" 
                          onClick={() => {
                            if (!isEditing) {
                              toast.info('Please save the new lesson first before creating a quiz.');
                              return;
                            }
                            if (onManageQuiz) {
                              handleSave();
                              onManageQuiz();
                            } else {
                              toast.error('Quiz manager not available in this context');
                            }
                          }}
                          className="bg-sky-600 hover:bg-sky-700 text-white"
                        >
                          <FileEdit className="w-4 h-4 mr-2" />
                          {isEditing ? 'Manage Quiz' : 'Save Lesson & Create Quiz'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================= RESOURCE MATERIALS TAB ======================= */}
                {activeTab === 'assets' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Resource Materials</h3>
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAssetUpload(f); e.target.value = ''; }} />
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${uploadingAsset ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {uploadingAsset ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload File</>}
                          </div>
                        </label>
                      </div>
                    </div>
                    {lessonAssets.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No resource materials yet</p>
                        <p className="text-xs text-gray-400 mt-1">Upload PDF or PPTX files for your students</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lessonAssets.map((asset) => {
                          const Icon = FileText;
                          let bg = 'bg-orange-100 text-orange-700';
                          let desc = 'Document';
                          if (asset.kind === 'pdf') { desc = 'PDF Document'; bg = 'bg-red-100 text-red-700'; }
                          else if (asset.title.toLowerCase().endsWith('.pptx')) { desc = 'PowerPoint'; bg = 'bg-orange-100 text-orange-700'; }
                          return (
                            <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white group">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{asset.title}</p>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(asset.url, '_blank')}>Open</Button>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteAsset(asset.id)} disabled={deletingAssetId === asset.id}>{deletingAssetId === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ======================= SETTINGS TAB ======================= */}
                {activeTab === 'settings' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">Lesson Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Estimated Time */}
                      <div className="p-4 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-900">Estimated Completion Time</label>
                        </div>
                        <p className="text-xs text-gray-500">How long should this lesson take to complete?</p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="1"
                            value={form.estimated_duration || ''} 
                            onChange={(e) => update('estimated_duration', parseInt(e.target.value) || 0)}
                            placeholder="e.g. 15" 
                            className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                          />
                          <span className="text-sm text-gray-500">minutes</span>
                        </div>
                      </div>

                      <div className="p-4 border border-gray-200 rounded-xl space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 block mb-1">Student Discussions</label>
                            <p className="text-xs text-gray-500">Allow students to ask questions and discuss this lesson on a dedicated tab.</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => update('allow_discussions', !form.allow_discussions)}
                            className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${form.allow_discussions ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${form.allow_discussions ? 'translate-x-4' : ''}`} />
                          </button>
                        </div>
                      </div>

                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Student Summary Activity</h4>
                      <LessonSummarySettings enabled={form.has_summary_activity || false} source={form.summary_source || 'entire_lesson'} wordTarget={form.summary_word_target || 100} keyPoints={form.summary_key_points || []} reflectionQuestions={form.summary_reflection_questions || []} onChange={(field, value) => update(field, value)} />
                    </div>
                  </div>
                )}

                {/* ======================= DISCUSSIONS TAB ======================= */}
                {activeTab === 'discussions' && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Lesson Discussions</h3>
                          <p className="text-sm text-gray-500">Manage and reply to student discussions on this lesson.</p>
                        </div>
                      </div>

                      {lessonId ? (
                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <LessonDiscussion lessonId={lessonId} />
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-6">
                          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">Save the lesson first to view discussions.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ======================= SUBMISSIONS TAB ======================= */}
                {activeTab === 'submissions' && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Student Summaries</h3>
                          <p className="text-sm text-gray-500">Review summaries submitted by students for this lesson.</p>
                        </div>
                      </div>

                      {!lessonId ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-6">
                          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">Save the lesson first to view submissions.</p>
                        </div>
                      ) : submissionsLoading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                      ) : studentSubmissions.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-6">
                          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No summaries submitted yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {studentSubmissions.map(sub => (
                            <div key={sub.id} className="p-5 border rounded-xl bg-white shadow-sm space-y-4 transition-all hover:shadow-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-base">
                                    {sub.enrollments?.users?.full_name?.[0] || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{sub.enrollments?.users?.full_name || 'Unknown Student'}</p>
                                    <p className="text-xs text-gray-500">{sub.enrollments?.users?.email}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</p>
                                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-100">
                                    <BookOpen className="w-3 h-3" />
                                    {sub.response_data.wordCount} words
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 leading-relaxed">
                                {sub.response_data.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <Button onClick={attemptClose} variant="outline">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
              {saving ? 'Saving...' : isEditing ? 'Update Lesson' : 'Save Lesson'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInteractiveBuilder} onOpenChange={(v) => { if (!v) setShowInteractiveBuilder(false); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInteractiveId ? 'Edit Activity' : 'Add Interactive Activity'}</DialogTitle>
            <DialogDescription>Create an interactive activity for your lesson</DialogDescription>
          </DialogHeader>
          {(() => {
            const editingItem = editingInteractiveId
              ? interactiveItems.find((i) => i.id === editingInteractiveId)
              : null;
            return (
              <InteractiveActivityBuilder
                primaryFocus={coursePrimaryFocus}
                config={{
                  id: editingItem?.id,
                  lessonId: lessonId || undefined,
                  courseId,
                  contentType: (editingItem?.content_type || 'flashcards') as InteractiveContentType,
                  title: editingItem?.title || '',
                  data: (editingItem?.content_data ?? { cards: [] }) as unknown as InteractiveActivityData,
                  accessibilitySettings: editingItem?.accessibility_settings || {},
                  sequenceOrder: editingItem?.sequence_order ?? interactiveItems.length,
                  is_draft: editingItem?.is_draft ?? false,
                }}
                onChange={(config) => {
                  if (editingItem) {
                    setInteractiveItems((prev) =>
                      prev.map((i) =>
                        i.id === editingItem.id
                          ? { ...i, content_type: config.contentType as InteractiveContentType, title: config.title, content_data: config.data as unknown as Record<string, unknown>, accessibility_settings: config.accessibilitySettings || {}, is_draft: config.is_draft ?? false }
                          : i
                      )
                    );
                  } else {
                    const newId = config.id || crypto.randomUUID();
                    setInteractiveItems((prev) => [
                      ...prev,
                      {
                        id: newId,
                        lesson_id: lessonId || '',
                        content_type: config.contentType as InteractiveContentType,
                        title: config.title,
                        content_data: config.data as unknown as Record<string, unknown>,
                        accessibility_settings: config.accessibilitySettings || {},
                        sequence_order: config.sequenceOrder ?? prev.length,
                        is_draft: config.is_draft ?? false,
                        created_by: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                    ]);
                    setEditingInteractiveId(newId);
                  }
                }}
              />
            );
          })()}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xs text-gray-500">Changes are saved automatically to your lesson draft when you click Save.</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowInteractiveBuilder(false)}
              >
                Close
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Mark current as published if it has content
                  const editingItem = editingInteractiveId ? interactiveItems.find(i => i.id === editingInteractiveId) : interactiveItems[interactiveItems.length - 1];
                  if (editingItem) {
                     let hasContent = false;
                     const d = editingItem.content_data as any;
                     if (editingItem.content_type === 'flashcards' && d?.cards?.length > 0) hasContent = true;
                     else if (editingItem.content_type === 'drag_drop' && d?.items?.length > 0) hasContent = true;
                     else if (editingItem.content_type === 'fill_blanks' && d?.segments?.length > 0) hasContent = true;
                     else if (editingItem.content_type === 'memory_game' && d?.cards?.length > 0) hasContent = true;
                     else if (editingItem.content_type === 'timeline' && d?.events?.length > 0) hasContent = true;

                     setInteractiveItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, is_draft: !hasContent } : i));
                     if (hasContent) {
                       toast.success('Activity ready');
                     } else {
                       toast.info('Activity saved as draft (needs content)');
                     }
                  }
                  setShowInteractiveBuilder(false);
                }}
              >
                Save Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accessibility Guide Sheet */}
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2 text-purple-700">
              <Shield className="w-5 h-5" />
              Accessibility Guide
            </SheetTitle>
            <SheetDescription>
              Tailored suggestions for your course&apos;s primary focus: <strong className="capitalize text-gray-900">{coursePrimaryFocus}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {coursePrimaryFocus === 'adhd' && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/80 to-white shadow-sm p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <h4 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-600" />
                  </div>
                  ADHD Guide
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-amber-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-amber-900">Chunk content:</strong> Keep text paragraphs very short (1-3 sentences) to sustain focus.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-amber-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-amber-900">Action-oriented formatting:</strong> Use <strong>bold text</strong> for key terms to make skimming easier.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-amber-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-amber-900">Interactive Checkpoints:</strong> Add frequent, low-stakes activities (like short quizzes) between text blocks.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-amber-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-amber-900">Clear structure:</strong> Start with a brief summary and use clear headers to divide sections logically.</span>
                  </li>
                </ul>
              </div>
            )}
            
            {coursePrimaryFocus === 'autism' && (
              <div className="relative overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-b from-sky-50/80 to-white shadow-sm p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <h4 className="font-bold text-sky-900 text-lg flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-sky-600" />
                  </div>
                  Autism Guide
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-sky-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span><strong className="text-sky-900">Clear & Literal Language:</strong> Use direct, literal phrasing. Avoid idioms or abstract metaphors.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-sky-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span><strong className="text-sky-900">Logical Flow:</strong> Write instructions step-by-step with clear expectations for activities.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-sky-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span><strong className="text-sky-900">Consistent formatting:</strong> Use consistent heading structures and bullet point styles throughout.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-sky-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span><strong className="text-sky-900">Explicit Context:</strong> Clearly state why a topic is important or how it connects to previous lessons.</span>
                  </li>
                </ul>
              </div>
            )}

            {coursePrimaryFocus === 'dyslexia' && (
              <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50/80 to-white shadow-sm p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <h4 className="font-bold text-indigo-900 text-lg flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                  Dyslexia Guide
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-indigo-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span><strong className="text-indigo-900">Avoid walls of text:</strong> Break down complex explanations into bulleted or numbered lists.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span><strong className="text-indigo-900">Provide visual alternatives:</strong> Accompany complex concepts with relevant images or diagrams.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span><strong className="text-indigo-900">Left-aligned text:</strong> Don&apos;t center-align or justify long blocks of text to avoid uneven spacing.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-indigo-900/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span><strong className="text-indigo-900">Simple Vocabulary:</strong> Use plain English and define complex terminology immediately.</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="relative mt-8 mb-4 group">
              {/* Decorative tape effect */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-amber-200/50 shadow-sm rotate-[-3deg] z-10 backdrop-blur-sm border border-amber-200/30" />
              
              <div className="bg-[#fcfbf9] shadow-lg border border-gray-200/80 rounded-sm relative overflow-hidden transition-all duration-300 hover:shadow-xl">
                {/* Ruled paper lines background effect */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-40" 
                  style={{ 
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #93c5fd 31px, #93c5fd 32px)', 
                    backgroundPositionY: '3.5rem' 
                  }} 
                />
                
                <div className="relative z-10 p-6 pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <StickyNote className="w-3.5 h-3.5" />
                        Course Notebook
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">Tap anywhere to edit</p>
                    </div>
                    {!isEditingNotes && (
                      <Button variant="ghost" size="icon" onClick={() => setIsEditingNotes(true)} className="h-8 w-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileEdit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isEditingNotes ? (
                    <div className="mt-4 space-y-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-100">
                      <Textarea 
                        value={educatorCustomGuide}
                        onChange={(e) => setEducatorCustomGuide(e.target.value)}
                        placeholder="Start typing your course-wide reminders here..."
                        className="min-h-[200px] resize-y bg-transparent border-none shadow-none focus-visible:ring-0 px-0 text-gray-800 text-base leading-[32px] placeholder:text-gray-300"
                        autoFocus
                      />
                      <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <Button 
                          variant="ghost"
                          onClick={() => setIsEditingNotes(false)}
                          disabled={savingGuide}
                          className="flex-1 text-gray-500 hover:bg-gray-100"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={async () => {
                            setSavingGuide(true);
                            try {
                              const { updateCourse } = await import('@/lib/educator-api');
                              await updateCourse(courseId, { educator_custom_guide: educatorCustomGuide });
                              toast.success('Notebook updated');
                              setIsEditingNotes(false);
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to save notebook');
                            } finally {
                              setSavingGuide(false);
                            }
                          }}
                          disabled={savingGuide}
                          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white shadow-md transition-all"
                        >
                          {savingGuide ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="min-h-[160px] mt-4 text-gray-800 whitespace-pre-wrap cursor-text text-base leading-[32px]"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      {educatorCustomGuide ? (
                        <div className="font-medium text-gray-700">{educatorCustomGuide}</div>
                      ) : (
                        <span className="text-gray-300 italic font-medium">No custom notes added yet. Keep course-wide reminders here...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        courseId={courseId}
        lessonId={currentLessonIdRef.current || lessonId || null}
        accept={mediaPickerAccept}
        onSelect={(url, kind, title) => {
          if (mediaPickerCallback) mediaPickerCallback(url, kind, title);
          setMediaPickerOpen(false);
        }}
      />
    </>
  );
}
