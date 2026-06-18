'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchMediaAssets, uploadMediaImage, uploadContentImage, createExternalMediaAsset, deleteMediaAsset } from '@/lib/educator-api';
import type { MediaAsset } from '@/lib/educator-api';
import { Button } from './button';
import { Input } from './input';
import { Loader2, Upload, Image as ImageIcon, FileText, Video, Link as LinkIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssetSelectorProps {
  courseId?: string;
  scopeId?: string; // fallback if courseId not available
  value: string;
  onChange: (url: string) => void;
  typeFilter?: 'image' | 'pdf' | 'video' | 'all';
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeMap = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32', full: 'w-full aspect-video' };

export function AssetSelector({ courseId, scopeId, value, onChange, typeFilter = 'image', label, size = 'sm' }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'upload' | 'url'>('existing');
  
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [externalUrl, setExternalUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await fetchMediaAssets(typeFilter === 'all' ? undefined : typeFilter);
      setAssets(data);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'existing') {
      loadAssets();
    }
  }, [isOpen, activeTab, typeFilter]);

  const handleSelect = (url: string) => {
    onChange(url);
    setIsOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeFilter === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (typeFilter === 'pdf' && file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (typeFilter === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    try {
      let url = '';
      if (courseId) {
        url = await uploadMediaImage(courseId, file);
      } else if (scopeId) {
        url = await uploadContentImage(file, scopeId);
      } else {
        toast.error('Missing course ID or scope ID for upload');
        return;
      }
      onChange(url);
      setIsOpen(false);
      toast.success('Asset uploaded and selected');
    } catch {
      toast.error('Failed to upload asset');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async () => {
    if (!externalUrl.trim()) return;
    try {
      await createExternalMediaAsset('External Link', externalUrl, typeFilter === 'all' ? 'other' : typeFilter);
      onChange(externalUrl);
      setIsOpen(false);
      setExternalUrl('');
    } catch {
      toast.error('Failed to save external link');
    }
  };

  const handleDeleteAsset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteMediaAsset(id);
      setAssets(prev => prev.filter(a => a.id !== id));
      toast.success('Asset removed');
    } catch {
      toast.error('Failed to remove asset');
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      
      {!value ? (
        <div 
          onClick={() => setIsOpen(true)}
          className={`border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${sizeMap[size] || 'w-full h-32'}`}
        >
          {typeFilter === 'image' ? <ImageIcon className="w-6 h-6 text-gray-400 mb-2" /> : 
           typeFilter === 'video' ? <Video className="w-6 h-6 text-gray-400 mb-2" /> :
           typeFilter === 'pdf' ? <FileText className="w-6 h-6 text-gray-400 mb-2" /> :
           <Upload className="w-6 h-6 text-gray-400 mb-2" />}
          <span className="text-xs text-gray-500 font-medium">Select {typeFilter}</span>
        </div>
      ) : (
        <div className="relative group inline-block">
          {typeFilter === 'image' || value.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
            <div className={`rounded-lg overflow-hidden border border-gray-200 bg-gray-50 ${sizeMap[size] || 'w-full h-32'}`}>
              <img src={value} alt="Selected asset" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center p-4 ${sizeMap[size] || 'w-full h-32'}`}>
              <div className="text-center truncate w-full">
                {typeFilter === 'video' ? <Video className="w-8 h-8 mx-auto text-blue-500 mb-2" /> :
                 typeFilter === 'pdf' ? <FileText className="w-8 h-8 mx-auto text-red-500 mb-2" /> :
                 <LinkIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />}
                <p className="text-xs text-gray-600 truncate px-2">{value.split('/').pop() || value}</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg backdrop-blur-[1px]">
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setIsOpen(true)}>Change</Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onChange('')}>Remove</Button>
          </div>
        </div>
      )}

      {/* Asset Manager Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Asset Library</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="flex border-b border-gray-100 px-4">
              <button onClick={() => setActiveTab('existing')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'existing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>My Assets</button>
              <button onClick={() => setActiveTab('upload')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Upload New</button>
              <button onClick={() => setActiveTab('url')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'url' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>External URL</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
              {activeTab === 'existing' && (
                loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No {typeFilter !== 'all' ? typeFilter : ''} assets found in your library.</p>
                    <Button type="button" onClick={() => setActiveTab('upload')} variant="outline">
                      Upload New Asset
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {assets.map(asset => (
                      <div 
                        key={asset.id} 
                        onClick={() => handleSelect(asset.url)}
                        className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors aspect-square flex flex-col"
                      >
                        {asset.file_type === 'image' ? (
                          <div className="flex-1 bg-gray-100 overflow-hidden relative">
                            <img src={asset.url} alt={asset.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            {value === asset.url && (
                              <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                <div className="bg-blue-600 rounded-full p-1"><CheckCircle2 className="w-6 h-6 text-white" /></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 bg-gray-50 flex items-center justify-center p-4">
                            {asset.file_type === 'video' ? <Video className="w-8 h-8 text-rose-400" /> : <FileText className="w-8 h-8 text-orange-400" />}
                          </div>
                        )}
                        <div className="p-2 border-t border-gray-100 bg-white flex items-center justify-between">
                          <p className="text-[10px] font-medium text-gray-700 truncate" title={asset.file_name}>{asset.file_name}</p>
                          <button onClick={(e) => handleDeleteAsset(e, asset.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'upload' && (
                <div className="py-8">
                  <div className="max-w-md mx-auto border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white">
                    {typeFilter === 'image' ? <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" /> : <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />}
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Upload a file</h4>
                    <p className="text-xs text-gray-500 mb-6">Supports {typeFilter === 'image' ? 'JPG, PNG, GIF, WEBP' : typeFilter === 'pdf' ? 'PDF' : typeFilter === 'video' ? 'MP4, WEBM' : 'various file types'}</p>
                    
                    <input type="file" ref={fileInputRef} className="hidden" accept={typeFilter === 'image' ? 'image/*' : typeFilter === 'video' ? 'video/*' : typeFilter === 'pdf' ? '.pdf' : '*/*'} onChange={handleFileUpload} />
                    
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
                      {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Select File from Computer'}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'url' && (
                <div className="py-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direct URL</label>
                      <Input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                    </div>
                    <Button onClick={handleUrlSubmit} disabled={!externalUrl.trim()} className="w-full">Use this URL</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
