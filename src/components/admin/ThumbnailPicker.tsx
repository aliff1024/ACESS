'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { STOCK_COURSE_THUMBNAILS } from '@/lib/course-thumbnails';

interface ThumbnailPickerProps {
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File) => Promise<void>;
  uploading?: boolean;
  accent?: 'purple' | 'blue';
}

export function ThumbnailPicker({
  value,
  onChange,
  onFileSelect,
  uploading = false,
  accent = 'purple',
}: ThumbnailPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const accentRing = accent === 'purple' ? 'focus:ring-purple-500 hover:border-purple-400' : 'focus:ring-blue-500 hover:border-blue-400';
  const accentSelected = accent === 'purple' ? 'ring-purple-600' : 'ring-blue-600';

  const handleFile = useCallback(async (file: File) => {
    if (onFileSelect) {
      await onFileSelect(file);
    }
  }, [onFileSelect]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      await handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Course thumbnail" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => {
              onChange('');
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white shadow"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? accent === 'purple'
                ? 'border-purple-500 bg-purple-50'
                : 'border-blue-500 bg-blue-50'
              : `border-gray-300 ${accentRing}`
          }`}
        >
          {uploading ? (
            <Loader2 className={`w-12 h-12 mx-auto mb-3 animate-spin ${accent === 'purple' ? 'text-purple-500' : 'text-blue-500'}`} />
          ) : (
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          )}
          <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WebP up to 2MB · 16:9 recommended</p>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowGallery(!showGallery)}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          {showGallery ? 'Hide gallery' : 'Choose from gallery'}
        </button>
        {showGallery && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {STOCK_COURSE_THUMBNAILS.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => onChange(url)}
                className={`relative rounded-lg overflow-hidden aspect-video border-2 transition-all hover:scale-[1.02] ${
                  value === url ? `border-transparent ring-2 ${accentSelected}` : 'border-gray-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
