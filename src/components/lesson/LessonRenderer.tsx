'use client';

import { FileText, Video, Play, Layout, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import { InteractiveActivityViewer } from '@/components/interactive/InteractiveActivityViewer';
import type { InteractiveActivityData, InteractiveContentType } from '@/lib/interactive-types';

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

interface LessonRendererAsset {
  id: string;
  title: string | null;
  url: string;
}

interface LessonRendererVideoQuestion {
  id: string;
  title: string;
  timestamp_seconds: number;
}

interface LessonRendererInteractiveItem {
  id: string;
  content_type: string;
  title: string;
  content_data: unknown;
  sequence_order: number;
}

type LessonRendererMode = 'educator' | 'learner';

interface LessonRendererProps {
  mode: LessonRendererMode;
  lesson: {
    video_url: string | null;
    content_html: string | null;
    transcript: string | null;
  };
  assets: LessonRendererAsset[];
  videoQuestions: LessonRendererVideoQuestion[];
  interactiveItems: LessonRendererInteractiveItem[];
  hasQuiz: boolean;
  lessonId: string;

  educatorProps?: {
    onEditLesson: () => void;
    onEditQuiz: () => void;
    onRemoveQuiz: () => void;
    onUploadPdf: (file: File) => void;
    uploadingPdfFor: string | null;
    onDeleteAsset: (assetId: string) => void;
  };

}

export function LessonRenderer({ mode, lesson, assets, videoQuestions, interactiveItems, hasQuiz, lessonId, educatorProps }: LessonRendererProps) {
  const isEducator = mode === 'educator';
  const ytId = lesson.video_url ? getYouTubeId(lesson.video_url) : null;

  return (
    <div className="space-y-5">

      {/* ── Video ── */}
      <CollapsibleCard
        icon={<Video className="w-4 h-4 text-rose-600" />}
        title="Video"
        defaultOpen={!!lesson.video_url}
        badge={`${lesson.video_url ? '1 video' : 'no video'}${videoQuestions.length > 0 ? ` · ${videoQuestions.length} q` : ''}`}
      >
        {lesson.video_url && ytId ? (
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
            {videoQuestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {videoQuestions.map((q) => (
                  <span key={q.id} className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                    ○ {q.timestamp_seconds}s — {q.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : lesson.video_url ? (
          <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm break-all underline underline-offset-2 flex items-center gap-1">
            <Play className="w-3.5 h-3.5" /> {lesson.video_url}
          </a>
        ) : (
          <div className="text-center py-6">
            <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No video URL set</p>
            {isEducator && educatorProps && (
              <Button variant="outline" size="sm" onClick={educatorProps.onEditLesson} className="mt-3 text-xs">
                Add Video
              </Button>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* ── Lesson Content ── */}
      <CollapsibleCard
        icon={<FileText className="w-4 h-4 text-gray-600" />}
        title="Lesson Content"
        defaultOpen={!!lesson.content_html}
        badge={lesson.content_html ? 'ready' : undefined}
      >
        {lesson.content_html ? (
          <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: lesson.content_html }} />
        ) : (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No content written yet</p>
            {isEducator && educatorProps && (
              <Button variant="outline" size="sm" onClick={educatorProps.onEditLesson} className="mt-3 text-xs">
                Write Content
              </Button>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* ── Resources / PDFs ── */}
      <CollapsibleCard
        icon={<FileText className="w-4 h-4 text-orange-600" />}
        title={`Resources ${assets.length > 0 ? `(${assets.length})` : ''}`}
        defaultOpen={assets.length > 0}
        badge={assets.length > 0 ? `${assets.length} file${assets.length > 1 ? 's' : ''}` : undefined}
        action={isEducator && educatorProps ? (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) educatorProps.onUploadPdf(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" className="text-xs" disabled={educatorProps.uploadingPdfFor === lessonId}>
              {educatorProps.uploadingPdfFor === lessonId ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </label>
        ) : undefined}
      >
        {assets.length > 0 ? (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg group/resource hover:bg-orange-100/50 transition-colors">
                <div className="w-10 h-12 bg-orange-200 rounded flex items-center justify-center shrink-0 overflow-hidden">
                  <FileText className="w-5 h-5 text-orange-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orange-900 truncate">{asset.title || 'Untitled PDF'}</p>
                  <p className="text-xs text-orange-600">PDF document</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/resource:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => window.open(asset.url, '_blank')} className="h-7 text-xs">
                    Open
                  </Button>
                  {isEducator && educatorProps && (
                    <Button variant="ghost" size="sm" onClick={() => educatorProps.onDeleteAsset(asset.id)} className="h-7 text-xs text-red-600">
                      &times;
                    </Button>
                  )}
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

      {/* ── Transcript ── */}
      {lesson.transcript ? (
        <CollapsibleCard
          icon={<FileText className="w-4 h-4 text-purple-600" />}
          title="Transcript"
          defaultOpen={false}
          badge="available"
        >
          <div className="text-sm text-gray-700 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-line">
            {lesson.transcript}
          </div>
        </CollapsibleCard>
      ) : null}

      {/* ── Native Interactive Activities ── */}
      {(isEducator || interactiveItems.length > 0) ? (
        <CollapsibleCard
          icon={<Layout className="w-4 h-4 text-indigo-500" />}
          title="Interactive Activities (Native)"
          defaultOpen={interactiveItems.length > 0}
          badge={interactiveItems.length > 0 ? `${interactiveItems.length} activity${interactiveItems.length > 1 ? 'ies' : 'y'}` : undefined}
        >
          {interactiveItems.length > 0 ? (
            <div className="space-y-4">
              {interactiveItems
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((item) => (
                  <InteractiveActivityViewer
                    key={item.id}
                    contentType={item.content_type as InteractiveContentType}
                    title={item.title}
                    data={item.content_data as InteractiveActivityData}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Layout className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No interactive activities yet</p>
              {isEducator && educatorProps && (
                <Button variant="outline" size="sm" onClick={educatorProps.onEditLesson} className="mt-3 text-xs">
                  Add Activity
                </Button>
              )}
            </div>
          )}
        </CollapsibleCard>
      ) : null}

      {/* ── Quiz ── */}
      <CollapsibleCard
        icon={<CheckCircle className="w-4 h-4 text-blue-600" />}
        title="Quiz"
        defaultOpen={true}
        badge={hasQuiz ? 'attached' : undefined}
      >
        {hasQuiz ? (
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 text-blue-800">Quiz attached</Badge>
            {isEducator && educatorProps && (
              <>
                <Button variant="outline" size="sm" onClick={educatorProps.onEditQuiz}>Edit Quiz</Button>
                <Button variant="outline" size="sm" onClick={educatorProps.onRemoveQuiz} className="text-red-600 border-red-200">Remove Quiz</Button>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No quiz attached to this lesson</p>
            {isEducator && educatorProps && (
              <Button variant="outline" size="sm" onClick={educatorProps.onEditQuiz}>
                Add Quiz
              </Button>
            )}
          </div>
        )}
      </CollapsibleCard>

    </div>
  );
}
