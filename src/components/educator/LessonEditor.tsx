'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Loader2, Video, FileText, Plus, Trash2, GripVertical, Layout, FileEdit, Play, Shield, ChevronDown, Clock, Layers, Upload, Image, Link } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createLesson, updateLesson, fetchLessonById, getNextSequenceOrder, fetchLessonInteractiveContent, createInteractiveContent, updateInteractiveContent, deleteInteractiveContent, fetchVideoQuestions, createVideoQuestion, deleteVideoQuestion, fetchLessonAssets, createLessonAsset, deleteLessonAsset, uploadCourseFile } from '@/lib/educator-api';
import type { LessonAsset } from '@/lib/educator-api';
import { LessonSummarySettings } from '@/components/educator/LessonSummarySettings';
import { LessonAccessibilitySettings } from '@/components/educator/LessonAccessibilitySettings';
import { LessonTemplateSelector } from '@/components/educator/LessonTemplateSelector'
import type { InteractiveActivityData } from '@/lib/interactive-types';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ContentBlockEditor } from '@/components/content-blocks/ContentBlockEditor';
import { InteractiveActivityBuilder } from '@/components/interactive/InteractiveActivityBuilder';
import { InteractiveActivityViewer } from '@/components/interactive/InteractiveActivityViewer';
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
}: LessonEditorProps) {
  const [form, setForm] = useState<LessonFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState<'basics' | 'content' | 'media' | 'activities' | 'assets' | 'settings' | 'accessibility'>('basics');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [interactiveItems, setInteractiveItems] = useState<InteractiveContent[]>([]);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [editingInteractiveId, setEditingInteractiveId] = useState<string | null>(null);
  const [selectedActivityTab, setSelectedActivityTab] = useState<string | null>(null);
  const [useBlockEditor, setUseBlockEditor] = useState(false);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [videoQuestions, setVideoQuestions] = useState<import('@/lib/educator-api').VideoQuestion[]>([]);
  const [showVideoQuestionForm, setShowVideoQuestionForm] = useState(false);
  const [vqTitle, setVqTitle] = useState('');
  const [vqTimestamp, setVqTimestamp] = useState('');
  const [vqQuestion, setVqQuestion] = useState('');
  const [vqOptions, setVqOptions] = useState<string[]>(['', '']);
  const [vqCorrectIndex, setVqCorrectIndex] = useState(0);
  const [lessonAssets, setLessonAssets] = useState<LessonAsset[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  // Track the current lesson ID including newly-created ones before dialog closes
  const currentLessonIdRef = useRef<string | null>(lessonId ?? null);

  const isEditing = !!lessonId;
  const dbItemIdsRef = useRef<Set<string>>(new Set());

  // Keep currentLessonIdRef in sync with prop
  useEffect(() => { currentLessonIdRef.current = lessonId ?? null; }, [lessonId]);

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
  }, [open, lessonId, localMode, localData]);

  useEffect(() => {
    if (typeof document !== 'undefined' && form.content_html && !useBlockEditor && contentBlocks.length === 0) {
      try {
        setContentBlocks(htmlToBlocks(form.content_html));
      } catch { /* keep empty */ }
    }
  }, [form.content_html, useBlockEditor]);

  const update = useCallback((field: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (localMode && onLocalChange) onLocalChange(next);
      return next;
    });
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
    try {
      await deleteVideoQuestion(id);
      setVideoQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Video question removed');
    } catch {
      toast.error('Failed to remove video question');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Lesson title is required'); return }

    if (localMode && onLocalSave) {
      onLocalSave(form);
      return;
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
          const d: any = item.content_data;
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
      onClose();
      onSaved?.();
    } catch {
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

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
    const lid = await ensureLessonSaved();
    if (!lid) return;
    setUploadingAsset(true);
    try {
      const url = await uploadCourseFile(file, courseId, lid);
      let kind = 'file';
      if (file.type.startsWith('image/')) kind = 'image';
      else if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type === 'application/pdf') kind = 'pdf';
      await createLessonAsset(lid, kind, file.name, url);
      const updated = await fetchLessonAssets(lid);
      setLessonAssets(updated);
      toast.success('Asset uploaded');
    } catch { toast.error('Upload failed'); }
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

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteLessonAsset(id);
      setLessonAssets(prev => prev.filter(a => a.id !== id));
      toast.success('Asset removed');
    } catch { toast.error('Failed to remove asset'); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
            <DialogDescription>Create educational content for your course</DialogDescription>
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
                <button type="button" onClick={() => setActiveTab('assets')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'assets' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}><Layers className="w-4 h-4" /> Assets {lessonAssets.length > 0 && <span className="ml-auto text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{lessonAssets.length}</span>}</button>
                <button type="button" onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}><Layout className="w-4 h-4" /> Layout Settings</button>
                <button type="button" onClick={() => setActiveTab('accessibility')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'accessibility' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}><Shield className="w-4 h-4" /> Accessibility</button>
              </div>

              {/* Main Content Pane */}
              <div className="flex-1 min-w-0 pl-0 lg:pl-6 pt-4 lg:pt-0">
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
                            <Button variant="outline" onClick={() => setTemplateSelectorOpen(true)} className="shrink-0 gap-1.5 h-auto">
                              <BookOpen className="w-4 h-4" /> Template
                            </Button>
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
                      <button type="button" onClick={() => {
                        if (useBlockEditor) { update('content_html', blocksToHtml(contentBlocks)); }
                        else { try { setContentBlocks(htmlToBlocks(form.content_html)); } catch {} }
                        setUseBlockEditor(!useBlockEditor);
                      }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${useBlockEditor ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {useBlockEditor ? <FileEdit className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />}
                        {useBlockEditor ? 'Rich Text' : 'Block Editor'}
                      </button>
                    </div>
                    {useBlockEditor ? (
                      <ContentBlockEditor blocks={contentBlocks} onChange={(blocks) => { setContentBlocks(blocks); update('content_html', blocksToHtml(blocks)); }} />
                    ) : (
                      <RichTextEditor content={form.content_html} onChange={(html) => update('content_html', html)} placeholder="Start building your lesson content here..." minHeight="300px" />
                    )}
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
                                  <div className="text-xs text-gray-700 leading-relaxed line-clamp-6 [&_img]:max-h-12 [&_img]:rounded [&_img]:mx-auto [&_img]:block" dangerouslySetInnerHTML={{ __html: slide }} />
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
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteVideoQuestion(q.id)} className="text-red-500 hover:text-red-700 shrink-0"><Trash2 className="w-4 h-4" /></Button>
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

                      // Safely handle activeType state if it doesn't exist in the current grouped types
                      const activeTypeFallback = Object.keys(grouped)[0] || '';
                      
                      // Using the selectedActivityTab state to store the "active item id", but we need a type tab too
                      // For simplicity, we can determine the active type from the active item, or just use the first one
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
                                  <Button type="button" variant="outline" size="sm" onClick={async () => { try { await deleteInteractiveContent(activeItem.id); setInteractiveItems((prev) => prev.filter((i) => i.id !== activeItem.id)); toast.success('Activity removed'); } catch { toast.error('Failed to remove activity'); } }} className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50">Delete</Button>
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

                {/* ── ASSETS TAB ── */}
                {activeTab === 'assets' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Resources & Assets</h3>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleAddLinkAsset} className="gap-1.5">
                          <Link className="w-3.5 h-3.5" /> Add Link
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAssetUpload(f); e.target.value = ''; }} />
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${uploadingAsset ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {uploadingAsset ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload File</>}
                          </div>
                        </label>
                      </div>
                    </div>
                    {lessonAssets.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                        <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No assets yet</p>
                        <p className="text-xs text-gray-400 mt-1">Upload images, PDFs, videos, or add external links</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lessonAssets.map((asset) => {
                          let Icon = FileText;
                          let bg = 'bg-orange-100 text-orange-700';
                          let desc = 'Document';
                          if (asset.kind === 'image') { Icon = Image; bg = 'bg-blue-100 text-blue-700'; desc = 'Image'; }
                          else if (asset.kind === 'video') { Icon = Video; bg = 'bg-rose-100 text-rose-700'; desc = 'Video'; }
                          else if (asset.kind === 'link') { Icon = Link; bg = 'bg-emerald-100 text-emerald-700'; desc = 'External Link'; }
                          else if (asset.kind === 'pdf') { desc = 'PDF'; }
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
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── SETTINGS TAB ── */}
                {activeTab === 'settings' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">Components & Layout</h3>
                    <LessonSummarySettings enabled={form.has_summary_activity} source={form.summary_source} wordTarget={form.summary_word_target} keyPoints={form.summary_key_points} reflectionQuestions={form.summary_reflection_questions} onChange={(field, value) => update(field, value)} />
                  </div>
                )}

                {/* ── ACCESSIBILITY TAB ── */}
                {activeTab === 'accessibility' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">Accessibility Settings</h3>
                    <LessonAccessibilitySettings lessonId={lessonId || null} simplifiedSummary={form.simplified_summary} focusModeEnabled={form.focus_mode_enabled} chunkedContentEnabled={form.chunked_content_enabled} checkpointsEnabled={form.checkpoints_enabled} adaptiveLearningEnabled={form.adaptive_learning_enabled} estimatedDuration={form.estimated_duration} onChange={(field, value) => update(field, value)} />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <Button onClick={onClose} variant="outline">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
              {saving ? 'Saving...' : isEditing ? 'Update Lesson' : 'Save Lesson'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LessonTemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={handleApplyTemplate}
      />

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
                    setInteractiveItems((prev) => [
                      ...prev,
                      {
                        id: config.id || crypto.randomUUID(),
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
                onClick={() => {
                  // Mark current as draft explicitly
                  const editingItem = editingInteractiveId ? interactiveItems.find(i => i.id === editingInteractiveId) : interactiveItems[interactiveItems.length - 1];
                  if (editingItem) {
                     setInteractiveItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, is_draft: true } : i));
                     toast.success('Activity saved as draft');
                  }
                  setShowInteractiveBuilder(false);
                }}
              >
                Save as Draft
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Mark current as published if it has content
                  const editingItem = editingInteractiveId ? interactiveItems.find(i => i.id === editingInteractiveId) : interactiveItems[interactiveItems.length - 1];
                  if (editingItem) {
                     let hasContent = false;
                     const d: any = editingItem.content_data;
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
    </>
  );
}
