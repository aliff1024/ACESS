'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, FileType, Trash2, Download, Loader2, Image, Video, Link, Layers, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchLessonAssets, deleteLessonAsset, fetchLessonsWithQuizzes, fetchLessonInteractiveContent } from '@/lib/educator-api';
import type { LessonAsset, LessonWithQuiz, InteractiveContent } from '@/lib/educator-api';

interface CourseAssetsProps {
  courseId: string;
}

type AssetTab = 'all' | 'image' | 'pdf' | 'video' | 'link' | 'other';

interface UnifiedAsset {
  id: string;
  kind: string;
  title: string;
  url: string;
  lessonTitle: string;
  lessonOrder: number;
  source: 'uploaded' | 'activity' | 'media'; // where this asset came from
  deletable: boolean; // only uploaded assets can be deleted
}

/** Extract all image URLs embedded inside interactive activity content_data */
function extractActivityImages(
  items: InteractiveContent[],
  lessonTitle: string,
  lessonOrder: number
): UnifiedAsset[] {
  const assets: UnifiedAsset[] = [];
  for (const item of items) {
    const data = item.content_data as any;
    if (item.content_type === 'flashcards') {
      for (const card of (data.cards || [])) {
        if (card.front_image) {
          assets.push({ id: `${item.id}-front-${card.id}`, kind: 'image', title: `${item.title} – Card front (${card.front || 'image'})`, url: card.front_image as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
        if (card.back_image) {
          assets.push({ id: `${item.id}-back-${card.id}`, kind: 'image', title: `${item.title} – Card back (${card.back || 'image'})`, url: card.back_image as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
        if (card.image_url && !card.front_image) {
          assets.push({ id: `${item.id}-img-${card.id}`, kind: 'image', title: `${item.title} – Card image`, url: card.image_url as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
      }
    } else if (item.content_type === 'drag_drop') {
      if (data.background_image) {
        assets.push({ id: `${item.id}-bg`, kind: 'image', title: `${item.title} – Background`, url: data.background_image as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
      }
      for (const di of (data.items || [])) {
        if (di.image_url) {
          assets.push({ id: `${item.id}-item-${di.id}`, kind: 'image', title: `${item.title} – "${di.text}"`, url: di.image_url as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
      }
    } else if (item.content_type === 'memory_game') {
      for (const card of (data.cards || [])) {
        if (card.image_url) {
          assets.push({ id: `${item.id}-card-${card.id}`, kind: 'image', title: `${item.title} – "${card.text}"`, url: card.image_url as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
      }
    } else if (item.content_type === 'timeline') {
      for (const ev of (data.events || [])) {
        if (ev.image_url) {
          assets.push({ id: `${item.id}-ev-${ev.id}`, kind: 'image', title: `${item.title} – "${ev.title}"`, url: ev.image_url as string, lessonTitle, lessonOrder, source: 'activity', deletable: false });
        }
      }
    }
  }
  return assets;
}

export default function CourseAssets({ courseId }: CourseAssetsProps) {
  const [allAssets, setAllAssets] = useState<UnifiedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetTab>('all');
  const [previewAsset, setPreviewAsset] = useState<UnifiedAsset | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const lessons = await fetchLessonsWithQuizzes(courseId);
      const unified: UnifiedAsset[] = [];

      await Promise.all(lessons.map(async (lesson) => {
        // 1. Real lesson_assets (uploaded files, PDFs, added links)
        const dbAssets = await fetchLessonAssets(lesson.id).catch(() => [] as LessonAsset[]);
        for (const a of dbAssets) {
          unified.push({
            id: a.id,
            kind: a.kind,
            title: a.title || 'Untitled',
            url: a.url,
            lessonTitle: lesson.title,
            lessonOrder: lesson.sequence_order,
            source: 'uploaded',
            deletable: true,
          });
        }

        // 2. Video URL from lesson media tab
        if (lesson.video_url) {
          unified.push({
            id: `video-${lesson.id}`,
            kind: 'link',
            title: `${lesson.title} – Video`,
            url: lesson.video_url,
            lessonTitle: lesson.title,
            lessonOrder: lesson.sequence_order,
            source: 'media',
            deletable: false,
          });
        }

        // 3. Images embedded inside interactive activities
        const interactive = await fetchLessonInteractiveContent(lesson.id).catch(() => [] as InteractiveContent[]);
        const activityImages = extractActivityImages(interactive, lesson.title, lesson.sequence_order);
        unified.push(...activityImages);
      }));

      // Sort by lesson order
      unified.sort((a, b) => a.lessonOrder - b.lessonOrder || a.title.localeCompare(b.title));
      setAllAssets(unified);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (asset: UnifiedAsset) => {
    if (!asset.deletable) return;
    if (deletingAssetId) return;
    setDeletingAssetId(asset.id);
    try {
      await deleteLessonAsset(asset.id);
      toast.success('Asset removed');
      if (previewAsset?.id === asset.id) setPreviewAsset(null);
      setAllAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch { toast.error('Failed to delete asset'); }
    finally { setDeletingAssetId(null); }
  };

  const matchesTab = (asset: UnifiedAsset): boolean => {
    if (activeTab === 'all') return true;
    if (activeTab === 'image') return asset.kind === 'image';
    if (activeTab === 'pdf') return asset.kind === 'pdf';
    if (activeTab === 'video') return asset.kind === 'video';
    if (activeTab === 'link') return asset.kind === 'link';
    if (activeTab === 'other') return !['image', 'pdf', 'video', 'link'].includes(asset.kind);
    return true;
  };

  const filtered = allAssets.filter((a) =>
    matchesTab(a) &&
    (a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tabCounts = {
    all: allAssets.length,
    image: allAssets.filter(a => a.kind === 'image').length,
    pdf: allAssets.filter(a => a.kind === 'pdf').length,
    video: allAssets.filter(a => a.kind === 'video').length,
    link: allAssets.filter(a => a.kind === 'link').length,
    other: allAssets.filter(a => !['image', 'pdf', 'video', 'link'].includes(a.kind)).length,
  };

  const getAssetStyle = (kind: string) => {
    switch (kind) {
      case 'image': return { Icon: Image, bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Image' };
      case 'video': return { Icon: Video, bg: 'bg-rose-100', text: 'text-rose-700', desc: 'Video' };
      case 'link': return { Icon: Link, bg: 'bg-emerald-100', text: 'text-emerald-700', desc: 'External Link' };
      case 'pdf': return { Icon: FileText, bg: 'bg-orange-100', text: 'text-orange-700', desc: 'PDF Document' };
      default: return { Icon: FileType, bg: 'bg-gray-100', text: 'text-gray-700', desc: 'File' };
    }
  };

  const getSourceBadge = (source: UnifiedAsset['source']) => {
    if (source === 'activity') return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">Activity</span>;
    if (source === 'media') return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">Media</span>;
    return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Uploaded</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="w-[96%] max-w-[1500px] mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Assets</h2>
        <p className="text-gray-600">All media across your course — uploaded files, activity images, and media links</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <span>Assets are gathered from <strong>uploaded files</strong> (Assets tab), <strong>activity images</strong> (flashcards, drag-drop, etc.), and <strong>video links</strong> (Media tab). Only uploaded files can be removed here.</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Assets', value: allAssets.length, Icon: Layers, color: 'blue' },
          { label: 'Images', value: tabCounts.image, Icon: Image, color: 'indigo' },
          { label: 'Documents', value: tabCounts.pdf, Icon: FileText, color: 'orange' },
          { label: 'Links', value: tabCounts.link, Icon: Link, color: 'emerald' },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className="p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-8 h-8 bg-${color}-100 text-${color}-700 rounded-lg flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ml-11">{value}</p>
          </Card>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search assets by name or lesson..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
        <div className="flex gap-1 p-3 overflow-x-auto">
          {([
            { id: 'all', label: 'All' },
            { id: 'image', label: 'Images' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'video', label: 'Videos' },
            { id: 'link', label: 'Links' },
            { id: 'other', label: 'Other' },
          ] as { id: AssetTab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {tabCounts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewAsset(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">{previewAsset.title}</h3>
                <p className="text-sm text-gray-500">Lesson {previewAsset.lessonOrder}: {previewAsset.lessonTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(previewAsset.url, '_blank')}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                </Button>
                <button onClick={() => setPreviewAsset(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              {previewAsset.kind === 'image' ? (
                <img src={previewAsset.url} alt={previewAsset.title} className="max-w-full max-h-[60vh] mx-auto rounded-lg object-contain" />
              ) : previewAsset.kind === 'video' ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe src={previewAsset.url} title={previewAsset.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : previewAsset.kind === 'link' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Link className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">{previewAsset.title}</p>
                  <a href={previewAsset.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">{previewAsset.url}</a>
                  <div className="mt-6">
                    <Button onClick={() => window.open(previewAsset.url, '_blank')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <ExternalLink className="w-4 h-4 mr-2" /> Open Link
                    </Button>
                  </div>
                </div>
              ) : previewAsset.kind === 'pdf' ? (
                <iframe src={previewAsset.url} title={previewAsset.title} className="w-full h-[60vh] rounded-lg border border-gray-200" />
              ) : (
                <div className="text-center py-8">
                  <FileType className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <Button variant="outline" onClick={() => window.open(previewAsset.url, '_blank')}>
                    <Download className="w-4 h-4 mr-2" /> Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((asset) => {
            const { Icon, bg, text, desc } = getAssetStyle(asset.kind);
            const isPreviewable = ['image', 'video', 'link', 'pdf'].includes(asset.kind);
            return (
              <div key={asset.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                {/* Preview thumbnail */}
                {asset.kind === 'image' && (
                  <div className="w-full h-40 bg-gray-50 overflow-hidden cursor-pointer" onClick={() => setPreviewAsset(asset)}>
                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                  </div>
                )}
                {asset.kind === 'video' && (
                  <div className="w-full h-40 bg-gray-900 flex items-center justify-center cursor-pointer relative" onClick={() => setPreviewAsset(asset)}>
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <Video className="w-7 h-7 text-white" />
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-0.5 truncate text-sm">{asset.title}</h3>
                      <p className="text-xs text-gray-500 mb-1.5 truncate">Lesson {asset.lessonOrder}: {asset.lessonTitle}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>{desc}</span>
                        {getSourceBadge(asset.source)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {isPreviewable && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setPreviewAsset(asset)}>
                        Preview
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className={`${isPreviewable ? '' : 'flex-1'} text-xs`} onClick={() => window.open(asset.url, '_blank')}>
                      {asset.kind === 'link' ? <><ExternalLink className="w-3 h-3 mr-1" />Open</> : <><Download className="w-3 h-3 mr-1" />Download</>}
                    </Button>
                    {asset.deletable && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(asset)} disabled={deletingAssetId === asset.id} className="text-red-600 text-xs px-2">
                        {deletingAssetId === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 border-2 border-dashed border-gray-300 text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery || activeTab !== 'all' ? 'No assets found' : 'No assets yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery || activeTab !== 'all' ? 'Try adjusting your search or filter' : 'Upload files or add images to your interactive activities to see them here.'}
          </p>
        </Card>
      )}
    </div>
  );
}
