'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Image as ImageIcon, Video, FileText, Link as LinkIcon, Loader2, Upload, File } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadCourseFile, createLessonAsset } from '@/lib/educator-api';
import { toast } from 'sonner';

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  lessonId: string | null; // For uploading new assets, we need the active lesson context
  onSelect: (url: string, kind: string, title?: string) => void;
  accept?: string;
}

interface Asset {
  id: string;
  kind: string;
  title: string;
  url: string;
  lessonTitle?: string;
  created_at: string;
}

type TabType = 'all' | 'image' | 'video' | 'pdf' | 'link';

export function MediaPickerModal({ open, onClose, courseId, lessonId, onSelect, accept }: MediaPickerModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If an accept prop is passed (e.g. 'image/*'), auto-select that tab if possible
    if (open && accept) {
      if (accept.includes('image')) setActiveTab('image');
      else if (accept.includes('video')) setActiveTab('video');
      else if (accept.includes('pdf')) setActiveTab('pdf');
    }
  }, [open, accept]);

  useEffect(() => {
    if (!open) return;
    
    const loadAssets = async () => {
      setLoading(true);
      try {
        // Fetch all assets that belong to lessons in this course
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title')
          .eq('course_id', courseId);
          
        if (lessonsError) throw lessonsError;
        if (!lessons || lessons.length === 0) {
          setAssets([]);
          setLoading(false);
          return;
        }

        const lessonIds = lessons.map(l => l.id);
        const lessonMap = new Map(lessons.map(l => [l.id, l.title]));

        const { data: lessonAssets, error: assetsError } = await supabase
          .from('media_assets')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        if (assetsError) throw assetsError;

        const mappedAssets: Asset[] = (lessonAssets || []).map(a => ({
          id: a.id,
          kind: a.file_type,
          title: a.file_name || 'Untitled',
          url: a.url,
          lessonTitle: 'Course Media',
          created_at: a.created_at
        }));

        setAssets(mappedAssets);
      } catch (err) {
        console.error('Failed to load assets', err);
        toast.error('Failed to load media gallery');
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [open, courseId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!lessonId) {
      toast.error('You must save the lesson before uploading new media.');
      return;
    }

    // Determine kind
    let kind = 'other';
    if (file.type.startsWith('image/')) kind = 'image';
    else if (file.type.startsWith('video/')) kind = 'video';
    else if (file.type === 'application/pdf') kind = 'pdf';

    setUploading(true);
    try {
      // 1. Upload to storage
      const url = await uploadCourseFile(file, courseId, lessonId);
      // 2. Create asset record
      await createLessonAsset(lessonId, kind, file.name, url);

      // 3. Immediately select it
      onSelect(url, kind, file.name);
      onClose();
      toast.success('Media uploaded and inserted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesTab = activeTab === 'all' || a.kind === activeTab;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Also respect the accept constraint if they are browsing "all"
    let matchesAccept = true;
    if (accept && activeTab === 'all') {
      if (accept.includes('image') && a.kind !== 'image') matchesAccept = false;
      else if (accept.includes('video') && a.kind !== 'video') matchesAccept = false;
      else if (accept.includes('pdf') && a.kind !== 'pdf') matchesAccept = false;
    }
    
    return matchesTab && matchesSearch && matchesAccept;
  });

  const getIcon = (kind: string) => {
    if (kind === 'image') return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (kind === 'video') return <Video className="w-8 h-8 text-purple-500" />;
    if (kind === 'pdf') return <FileText className="w-8 h-8 text-red-500" />;
    if (kind === 'link') return <LinkIcon className="w-8 h-8 text-green-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-gray-50">
        <DialogHeader className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">Media Library</DialogTitle>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept={accept || "image/*,video/*,application/pdf"}
              />
              <Button 
                onClick={handleUploadClick} 
                disabled={uploading || !lessonId} 
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Upload New'}
              </Button>
            </div>
          </div>
          {!lessonId && (
            <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
              * Please save the lesson once to enable uploading new media.
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {(['all', 'image', 'video', 'pdf', 'link'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-purple-50 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}s
              </button>
            ))}
          </div>

          {/* Main Gallery */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No media found</h3>
                <p className="text-gray-500 max-w-sm">
                  {searchQuery ? 'Try adjusting your search or filters.' : 'Upload new media to start building your library.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id} 
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    onClick={() => {
                      onSelect(asset.url, asset.kind, asset.title);
                      onClose();
                    }}
                  >
                    <div className="aspect-video bg-gray-100 relative flex items-center justify-center border-b border-gray-100 overflow-hidden">
                      {asset.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        getIcon(asset.kind)
                      )}
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                          Insert
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-gray-900 truncate" title={asset.title}>{asset.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{asset.lessonTitle || 'Unknown source'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
