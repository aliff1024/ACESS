'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchLessonH5PContent,
  createH5PContent,
  updateH5PContent,
  deleteH5PContent,
  H5PContent
} from '@/lib/educator-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Plus, Trash2, Edit2, Upload, Link2, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface H5PEmbedManagerProps {
  lessonId: string;
}

// Simple MIME type resolver
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'application/javascript';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'ttf': return 'font/ttf';
    default: return 'application/octet-stream';
  }
}

export function H5PEmbedManager({ lessonId }: H5PEmbedManagerProps) {
  const [items, setItems] = useState<H5PContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('500px');
  const [h5pMode, setH5pMode] = useState<'external' | 'self_hosted'>('external');
  const [embedUrl, setEmbedUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadH5PContents();
  }, [lessonId]);

  async function loadH5PContents() {
    try {
      setLoading(true);
      const data = await fetchLessonH5PContent(lessonId);
      setItems(data);
    } catch (err: any) {
      toast.error('Failed to load H5P activities');
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-populate title if empty
      if (!title) {
        setTitle(file.name.replace(/\.h5p$/i, ''));
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setWidth('100%');
    setHeight('500px');
    setH5pMode('external');
    setEmbedUrl('');
    setSelectedFile(null);
    setEditingId(null);
  };

  const handleEditClick = (item: H5PContent) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || '');
    setWidth(item.width || '100%');
    setHeight(item.height || '500px');
    setH5pMode(item.h5p_mode);
    setEmbedUrl(item.embed_url);
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please specify a title');
      return;
    }

    if (h5pMode === 'external' && !embedUrl) {
      toast.error('Please specify an embed URL');
      return;
    }

    if (h5pMode === 'self_hosted' && !editingId && !selectedFile) {
      toast.error('Please upload a .h5p package file');
      return;
    }

    try {
      setSaving(true);
      let folderPath = '';
      let libraryName = '';
      let contentJson: Record<string, any> | null = null;
      let finalEmbedUrl = embedUrl;

      if (h5pMode === 'self_hosted' && selectedFile) {
        toast.info('Extracting and uploading H5P package...');

        // 1. Load ZIP file with JSZip
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(selectedFile);

        // 2. Generate a unique folder path in bucket
        const uploadId = crypto.randomUUID();
        folderPath = `content/${uploadId}`;

        // 3. Extract h5p.json and content/content.json for metadata
        const h5pFile = loadedZip.file('h5p.json');
        if (h5pFile) {
          const text = await h5pFile.async('text');
          const h5pJson = JSON.parse(text);
          libraryName = h5pJson.mainLibrary || h5pJson.preloadedDependencies?.[0]?.machineName || 'H5P.Activity';
        }

        const contentFile = loadedZip.file('content/content.json');
        if (contentFile) {
          const text = await contentFile.async('text');
          contentJson = JSON.parse(text);
        }

        // 4. Upload all files to Supabase Storage
        const fileNames = Object.keys(loadedZip.files);
        let uploadCount = 0;

        for (const name of fileNames) {
          const fileEntry = loadedZip.files[name];
          if (fileEntry.dir) continue; // skip directories

          const blob = await fileEntry.async('blob');
          const destination = `${folderPath}/${name}`;

          const { error } = await supabase.storage
            .from('h5p')
            .upload(destination, blob, {
              contentType: getMimeType(name),
              upsert: true
            });

          if (error) {
            console.error('Storage Upload Error:', error);
            throw new Error(`Failed to upload ${name}: ${error.message}`);
          }
          uploadCount++;
        }

        // Host page URL (self-hosted iframe points to this page route)
        finalEmbedUrl = `/h5p/play/${uploadId}`;
      }

      if (editingId) {
        const updateFields: any = {
          title,
          description,
          width,
          height,
          h5p_mode: h5pMode,
          embed_url: finalEmbedUrl,
        };
        if (h5pMode === 'self_hosted' && selectedFile) {
          updateFields.folder_path = folderPath;
          updateFields.library_name = libraryName;
          updateFields.content_json = contentJson;
        }

        await updateH5PContent(editingId, updateFields);
        toast.success('H5P Activity updated successfully');
      } else {
        await createH5PContent(lessonId, {
          title,
          description,
          width,
          height,
          h5p_mode: h5pMode,
          embed_url: finalEmbedUrl,
          folder_path: h5pMode === 'self_hosted' ? folderPath : null,
          library_name: h5pMode === 'self_hosted' ? libraryName : null,
          content_json: h5pMode === 'self_hosted' ? contentJson : null,
          sequence_order: items.length
        });
        toast.success('H5P Activity created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadH5PContents();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    if (deleting) return;
    setDeleting(id);
    try {
      await deleteH5PContent(id);
      toast.success('Activity deleted successfully');
      loadH5PContents();
    } catch (err) {
      toast.error('Failed to delete activity');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">H5P Lesson Activities</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add H5P Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-800 text-base">
                {editingId ? 'Edit H5P Activity' : 'Add H5P Activity'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Interactive Cell Structure" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter brief instructions or details..." rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Width</label>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="e.g. 100%" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Height</label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 500px" />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Integration Mode</label>
                  <Tabs value={h5pMode} onValueChange={(v) => setH5pMode(v as any)} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full bg-slate-100 p-0.5 rounded-lg">
                      <TabsTrigger value="external" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                        <Link2 className="w-3 h-3 mr-1" /> External Embed
                      </TabsTrigger>
                      <TabsTrigger value="self_hosted" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600">
                        <Upload className="w-3 h-3 mr-1" /> Self-Hosted (.h5p)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="external" className="space-y-2 mt-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Embed URL / Iframe Link</label>
                        <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://h5p.org/h5p/embed/..." />
                      </div>
                    </TabsContent>

                    <TabsContent value="self_hosted" className="space-y-2 mt-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Upload H5P Package</label>
                        <Input type="file" accept=".h5p" onChange={handleFileChange} className="cursor-pointer file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md file:text-xs" />
                        <p className="text-[10px] text-slate-400 mt-1">Select a compiled .h5p package exported from Lumi or h5p.org.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {editingId && h5pMode === 'external' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Embed URL</label>
                  <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://h5p.org/h5p/embed/..." required />
                </div>
              )}

              {editingId && h5pMode === 'self_hosted' && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
                  <span className="text-xs font-medium text-indigo-700 block mb-1">Self-Hosted Package Locked</span>
                  <span className="text-[10px] text-slate-500">To replace the self-hosted package, delete this activity and create a new one.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Activity'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No H5P activities configured for this lesson yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">{item.title}</span>
                  <Badge variant={item.h5p_mode === 'self_hosted' ? 'default' : 'secondary'} className="text-[9px] scale-90 origin-left">
                    {item.h5p_mode === 'self_hosted' ? 'Self-Hosted' : 'External'}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-[10px] text-slate-500 truncate max-w-sm">{item.description}</p>
                )}
                {item.library_name && (
                  <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium">
                    {item.library_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)} className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600">
                  {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
