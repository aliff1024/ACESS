'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Save, RotateCcw, Trash2, Loader2, Clock } from 'lucide-react';
import { fetchLessonVersions, saveLessonVersion, deleteLessonVersion, LessonVersion } from '@/lib/educator-api';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from 'sonner';

interface LessonVersionHistoryProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  currentContentHtml: string;
  onRestore: (html: string) => void;
}

export function LessonVersionHistory({ open, onClose, lessonId, currentContentHtml, onRestore }: LessonVersionHistoryProps) {
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadVersions = async () => {
    try {
      const data = await fetchLessonVersions(lessonId);
      setVersions(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
      setNewVersionName('');
      setPreviewVersionId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lessonId]);

  const handleSaveVersion = async () => {
    if (!newVersionName.trim()) return;
    setSaving(true);
    try {
      await saveLessonVersion(lessonId, currentContentHtml, newVersionName.trim());
      toast.success('Version saved successfully');
      setNewVersionName('');
      await loadVersions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version?')) return;
    if (deleting) return;
    setDeleting(versionId);
    try {
      await deleteLessonVersion(versionId);
      toast.success('Version deleted');
      await loadVersions();
      if (previewVersionId === versionId) setPreviewVersionId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete version');
    } finally {
      setDeleting(null);
    }
  };

  const handleRestore = (version: LessonVersion) => {
    if (!confirm(`Are you sure you want to restore to "${version.version_name}"? This will overwrite your current unsaved changes.`)) return;
    onRestore(version.content_html);
    toast.success('Version restored');
    onClose();
  };

  const previewContent = previewVersionId ? versions.find(v => v.id === previewVersionId)?.content_html : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-gray-50">
        <DialogHeader className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-900">
            <History className="w-5 h-5 text-purple-600" />
            <DialogTitle className="text-xl font-bold">Version History</DialogTitle>
          </div>
          <DialogDescription>
            Save snapshots of your lesson content or roll back to a previous version.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Versions List */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wider">Save Current State</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., Before rewrite" 
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleSaveVersion} 
                  disabled={saving || !newVersionName.trim()}
                  className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 px-4 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No versions saved yet.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {versions.map(version => (
                    <div 
                      key={version.id}
                      onClick={() => setPreviewVersionId(version.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        previewVersionId === version.id 
                          ? 'bg-purple-50 border-purple-200 shadow-sm' 
                          : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-sm text-gray-900 truncate" title={version.version_name}>
                            {version.version_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(version.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {previewVersionId === version.id && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-100">
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-7 text-xs flex-1"
                            onClick={(e) => { e.stopPropagation(); handleDelete(version.id); }}
                            disabled={deleting === version.id}
                          >
                            {deleting === version.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />} Delete
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs flex-1 bg-purple-600 hover:bg-purple-700"
                            onClick={(e) => { e.stopPropagation(); handleRestore(version); }}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Restore
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Preview Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {previewVersionId ? (
              <>
                <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                  <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" /> Previewing Version
                  </h4>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => handleRestore(versions.find(v => v.id === previewVersionId)!)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Restore This Version
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-full">
                    <div className="prose prose-purple max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent || '') }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select a version from the sidebar to preview its content.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
