'use client';

import { useState, useEffect } from 'react';
import { Loader2, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadContentImage } from '@/lib/educator-api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface SystemLessonEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  lessonId: string | null;
  onSaved: () => void;
}

export function SystemLessonEditor({
  open,
  onOpenChange,
  courseId,
  lessonId,
  onSaved,
}: SystemLessonEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [lessonType, setLessonType] = useState('standard');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [lessonLayout, setLessonLayout] = useState('standard');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => {
    if (!open || !lessonId) return;
    setLoading(true);
    supabase
      .from('lessons')
      .select('title, content_html, video_url, transcript, lesson_type, estimated_duration, learning_objectives, status, lesson_layout')
      .eq('id', lessonId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error('Failed to load lesson');
          return;
        }
        setTitle(data.title || '');
        setContentHtml(data.content_html || '');
        setVideoUrl(data.video_url || '');
        setTranscript(data.transcript || '');
        setLessonType(data.lesson_type || 'standard');
        setEstimatedDuration(data.estimated_duration ? String(data.estimated_duration) : '');
        setLearningObjectives(data.learning_objectives || '');
        setLessonLayout(data.lesson_layout || 'standard');
        setStatus(data.status === 'published' ? 'published' : 'draft');
      })
      .finally(() => setLoading(false));
  }, [open, lessonId]);

  const handleSave = async () => {
    if (!lessonId || !title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('lessons').update({
        title: title.trim(),
        content_html: contentHtml,
        video_url: videoUrl || null,
        transcript: transcript || null,
        lesson_type: lessonType,
        estimated_duration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        learning_objectives: learningObjectives || null,
        lesson_layout: lessonLayout,
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', lessonId);
      if (error) throw error;
      toast.success('Lesson saved');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = (file: File) => uploadContentImage(file, `${courseId}/${lessonId || 'new'}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson Content</DialogTitle>
          <DialogDescription>Build rich lesson content with text, images, and video</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Type</label>
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Lesson Layout</label>
                <select
                  value={lessonLayout}
                  onChange={(e) => setLessonLayout(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="focus">Focus</option>
                  <option value="two_column">Two Column</option>
                  <option value="wide">Wide</option>
                  <option value="slideshow">Slideshow</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <Input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Lesson Content</label>
              <RichTextEditor
                content={contentHtml}
                onChange={setContentHtml}
                placeholder="Write your lesson content. Use callouts, images, and headings."
                minHeight="280px"
                onImageUpload={uploadImage}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  <Video className="w-3.5 h-3.5 inline mr-1" /> Video URL
                </label>
                <Input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  <FileText className="w-3.5 h-3.5 inline mr-1" /> Transcript
                </label>
                <RichTextEditor
                  content={transcript}
                  onChange={setTranscript}
                  placeholder="Accessible transcript for video content"
                  minHeight="120px"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Learning Objectives</label>
              <textarea
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="What will learners achieve?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
              <div className="flex gap-3">
                {(['draft', 'published'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-lg border-2 capitalize text-sm ${
                      status === s
                        ? s === 'published' ? 'border-green-500 bg-green-50 text-green-800' : 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !title.trim()}
            className="bg-purple-700 hover:bg-purple-800 text-white ml-auto"
          >
            {saving ? 'Saving...' : 'Save Lesson'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
