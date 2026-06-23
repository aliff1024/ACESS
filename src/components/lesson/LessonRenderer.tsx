'use client';

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { FileText, Video, Play, Layout, CheckCircle, Upload, Layers, Image, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import { InteractiveActivityViewer } from '@/components/interactive/InteractiveActivityViewer';
import type { InteractiveActivityData, InteractiveContentType } from '@/lib/interactive-types';
import { H5PViewer } from '@/components/h5p/H5PViewer';

function InteractiveActivityList({ interactiveItems }: { interactiveItems: LessonRendererInteractiveItem[] }) {
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

  const [activeType, setActiveType] = useState<string>(Object.keys(grouped)[0] || '');
  const [activeItemIds, setActiveItemIds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(grouped).forEach(k => initial[k] = grouped[k][0].id);
    return initial;
  });

  const activeItem = grouped[activeType]?.find(i => i.id === activeItemIds[activeType]) || grouped[activeType]?.[0];

  if (!activeType) return null;

  return (
    <div className="space-y-6">
      {Object.keys(grouped).length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
          {Object.entries(grouped).map(([type, items]) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                activeType === type 
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {TYPE_LABELS[type] || type} ({items.length})
            </button>
          ))}
        </div>
      )}

      {grouped[activeType] && grouped[activeType].length > 1 && (
        <div className="flex flex-wrap gap-2 px-2">
          {grouped[activeType].map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveItemIds(prev => ({...prev, [activeType]: item.id}))}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeItem?.id === item.id
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
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden p-0 sm:p-6 shadow-sm">
          {grouped[activeType].length === 1 && (
            <h4 className="font-bold text-gray-800 mb-4 px-4 sm:px-0">{activeItem.title}</h4>
          )}
          <InteractiveActivityViewer
            key={activeItem.id}
            contentType={activeItem.content_type as InteractiveContentType}
            title={activeItem.title}
            data={activeItem.content_data as InteractiveActivityData}
          />
        </div>
      )}
    </div>
  );
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

interface LessonRendererAsset {
  id: string;
  title: string | null;
  url: string;
  kind?: string;
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

interface LessonRendererH5PItem {
  id: string;
  title: string;
  embed_url: string;
  width?: string;
  height?: string;
  h5p_mode: 'external' | 'self_hosted';
  library_name?: string | null;
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
  h5pContents?: LessonRendererH5PItem[];
  hasQuiz: boolean;
  lessonId: string;

  educatorProps?: {
    onEditLesson: () => void;
    onEditQuiz: () => void;
    onRemoveQuiz: () => void;
    onUploadAsset: (file: File) => void;
    onAddLinkAsset: (url: string, title: string) => void;
    uploadingAssetFor: string | null;
    onDeleteAsset: (assetId: string) => void;
  };

}

export function LessonRenderer({ mode, lesson, assets, videoQuestions, interactiveItems, h5pContents = [], hasQuiz, lessonId, educatorProps }: LessonRendererProps) {
  const isEducator = mode === 'educator';
  const ytId = lesson.video_url ? getYouTubeId(lesson.video_url) : null;
  const [viewingAsset, setViewingAsset] = useState<string | null>(null);

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
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content_html) }} />
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

      {/* ── Resources & Materials ── */}
      <CollapsibleCard
        icon={<FileText className="w-4 h-4 text-orange-600" />}
        title={`Resources & Materials ${assets.length > 0 ? `(${assets.length})` : ''}`}
        defaultOpen={assets.length > 0}
        badge={assets.length > 0 ? `${assets.length} file${assets.length > 1 ? 's' : ''}` : undefined}
        action={isEducator && educatorProps ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const url = window.prompt("Enter the link URL (e.g., https://example.com):");
                if (!url) return;
                const title = window.prompt("Enter a title for this link:");
                if (!title) return;
                educatorProps.onAddLinkAsset(url, title);
              }}
            >
              <Link className="w-3 h-3 mr-1" /> Add Link
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) educatorProps.onUploadAsset(file);
                  e.target.value = '';
                }}
              />
              <Button variant="outline" size="sm" className="text-xs" disabled={educatorProps.uploadingAssetFor === lessonId}>
                {educatorProps.uploadingAssetFor === lessonId ? 'Uploading...' : 'Upload File'}
              </Button>
            </label>
          </div>
        ) : undefined}
      >
        {assets.length > 0 ? (
          <div className="space-y-2">
            {assets.map((asset) => {
              let Icon = FileText;
              let bg = "bg-orange-200";
              let text = "text-orange-700";
              let cardBg = "bg-orange-50 border-orange-200 hover:bg-orange-100/50";
              let desc = "Document";

              if (asset.kind === 'image') {
                Icon = Image;
                bg = "bg-blue-200";
                text = "text-blue-700";
                cardBg = "bg-blue-50 border-blue-200 hover:bg-blue-100/50";
                desc = "Image file";
              } else if (asset.kind === 'video') {
                Icon = Video;
                bg = "bg-rose-200";
                text = "text-rose-700";
                cardBg = "bg-rose-50 border-rose-200 hover:bg-rose-100/50";
                desc = "Video file";
              } else if (asset.kind === 'link') {
                Icon = Link;
                bg = "bg-emerald-200";
                text = "text-emerald-700";
                cardBg = "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50";
                desc = "External link";
              } else if (asset.kind === 'pdf') {
                desc = "PDF document";
              }

              const isPdf = asset.kind === 'pdf' || asset.url.toLowerCase().endsWith('.pdf');
              const isPptx = asset.url.toLowerCase().endsWith('.pptx');

              return (
                <div key={asset.id} className="flex flex-col gap-2">
                  <div className={`flex items-center gap-3 p-3 border rounded-lg group/resource transition-colors ${cardBg}`}>
                    <div className={`w-10 h-12 rounded flex items-center justify-center shrink-0 overflow-hidden ${bg}`}>
                      <Icon className={`w-5 h-5 ${text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${text.replace('text-', 'text-').replace('700', '900')}`}>
                        {asset.title || 'Untitled Asset'}
                      </p>
                      <p className={`text-xs ${text.replace('700', '600')}`}>{desc}</p>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/resource:opacity-100 transition-opacity">
                      {(isPdf || isPptx) ? (
                        <Button variant="ghost" size="sm" onClick={() => setViewingAsset(viewingAsset === asset.id ? null : asset.id)} className="h-7 text-xs">
                          {viewingAsset === asset.id ? 'Close' : 'View'}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => window.open(asset.url, '_blank')} className="h-7 text-xs">
                          Open
                        </Button>
                      )}
                      {isEducator && educatorProps && (
                        <Button variant="ghost" size="sm" onClick={() => educatorProps.onDeleteAsset(asset.id)} className="h-7 text-xs text-red-600">
                          &times;
                        </Button>
                      )}
                    </div>
                  </div>
                  {viewingAsset === asset.id && (
                    <div className="w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative mt-2 shadow-inner">
                      <Button variant="secondary" size="sm" className="absolute top-2 right-6 z-10 text-xs shadow-md" onClick={() => setViewingAsset(null)}>Close</Button>
                      <Button variant="secondary" size="sm" className="absolute top-2 right-20 z-10 text-xs shadow-md" onClick={() => window.open(asset.url, '_blank')}>Open in New Tab</Button>
                      {isPdf ? (
                        <object data={asset.url} type="application/pdf" className="w-full h-full">
                          <iframe src={asset.url} className="w-full h-full border-0">
                            This browser does not support PDFs. Please download the PDF to view it.
                          </iframe>
                        </object>
                      ) : (
                        <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(asset.url)}`} className="w-full h-full border-0" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No files uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload images, PDFs, or other resources for your learners</p>
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
          title="Practice Activities"
          defaultOpen={interactiveItems.length > 0}
          badge={interactiveItems.length > 0 ? `${interactiveItems.length} activity${interactiveItems.length > 1 ? 'ies' : 'y'}` : undefined}
          action={isEducator && educatorProps ? (
            <Button variant="outline" size="sm" onClick={educatorProps.onEditLesson} className="h-7 text-xs">
              Manage Activities
            </Button>
          ) : undefined}
        >
          {interactiveItems.length > 0 ? (
            <InteractiveActivityList interactiveItems={interactiveItems} />
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Layout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">No interactive activities yet</p>
              <p className="text-xs text-gray-400 mb-4">Add flashcards, matching games, and quizzes to test learner knowledge</p>
              {isEducator && educatorProps && (
                <Button variant="default" size="sm" onClick={educatorProps.onEditLesson}>
                  Add First Activity
                </Button>
              )}
            </div>
          )}
        </CollapsibleCard>
      ) : null}

      {/* ── H5P Interactive Activities ── */}
      {h5pContents.length > 0 && (
        <CollapsibleCard
          icon={<Layers className="w-4 h-4 text-indigo-500" />}
          title="Interactive Activities (H5P)"
          defaultOpen={true}
          badge={`${h5pContents.length} activity${h5pContents.length > 1 ? 'ies' : 'y'}`}
        >
          <div className="space-y-4">
            {h5pContents.map((item) => (
              <H5PViewer key={item.id} content={item} />
            ))}
          </div>
        </CollapsibleCard>
      )}

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
