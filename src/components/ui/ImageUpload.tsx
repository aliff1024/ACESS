'use client'

import { useRef, useState } from 'react'
import { uploadMediaImage } from '@/lib/educator-api'
import { toast } from 'sonner'
import { Button } from './button'
import { Loader2, Upload, X } from 'lucide-react'

interface ImageUploadProps {
  courseId?: string
  value: string
  onChange: (url: string) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-24 h-24' }

export function ImageUpload({ courseId, value, onChange, label, size = 'sm' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!courseId) {
      toast.error('Course ID is required for image upload')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setUploading(true)
    try {
      const url = await uploadMediaImage(courseId, file)
      onChange(url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error('Failed to upload image')
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-gray-500">{label}</label>}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || !courseId} className="text-xs">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        {value && (
          <>
            <div className={`rounded overflow-hidden bg-gray-100 border shrink-0 ${sizeMap[size]}`}>
              <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} className="text-red-500 h-7 w-7 p-0">
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
