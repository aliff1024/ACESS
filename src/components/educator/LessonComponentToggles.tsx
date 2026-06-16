'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, FileText, ClipboardList, Subtitles, BookOpen, Layout } from 'lucide-react'

interface ComponentTogglesProps {
  hasVideo: boolean
  hasPdf: boolean
  hasQuiz: boolean
  hasTranscript: boolean
  hasSummaryActivity: boolean
  lessonLayout: string
  onChange: (field: string, value: boolean | string) => void
}

const components = [
  { key: 'hasVideo', label: 'Video', icon: Video, desc: 'Embed video content' },
  { key: 'hasPdf', label: 'PDF / Resources', icon: FileText, desc: 'Attach PDF files and resources' },
  { key: 'hasQuiz', label: 'Quiz', icon: ClipboardList, desc: 'Add a quiz for this lesson' },
  { key: 'hasTranscript', label: 'Transcript', icon: Subtitles, desc: 'Show video transcript' },
  { key: 'hasSummaryActivity', label: 'Student Summary', icon: BookOpen, desc: 'Students write a summary of the lesson' },
]

const layouts = [
  { value: 'standard', label: 'Standard', desc: 'Content stacked vertically' },
  { value: 'focus', label: 'Focus', desc: 'Full-width content, minimal distractions' },
  { value: 'two_column', label: 'Two Column', desc: 'Content + sidebar for video/transcript' },
  { value: 'wide', label: 'Wide', desc: 'Expanded content area' },
  { value: 'slideshow', label: 'Slideshow', desc: 'One slide at a time, split by horizontal rules' },
]

export function LessonComponentToggles({ hasVideo, hasPdf, hasQuiz, hasTranscript, hasSummaryActivity, lessonLayout, onChange }: ComponentTogglesProps) {
  const boolMap: Record<string, boolean> = { hasVideo, hasPdf, hasQuiz, hasTranscript, hasSummaryActivity }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Lesson Components</h4>
        <p className="text-xs text-gray-500 mb-3">Toggle which sections appear in this lesson</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {components.map(({ key, label, icon: Icon, desc }) => (
            <div key={key} className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
              <Icon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={key} className="text-sm font-medium text-gray-900">{label}</Label>
                  <Switch id={key} checked={boolMap[key]} onCheckedChange={(v) => onChange(key, v)} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Lesson Layout</h4>
        <p className="text-xs text-gray-500 mb-3">Choose how the lesson content is arranged</p>
        <Select value={lessonLayout} onValueChange={(v) => onChange('lessonLayout', v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            {layouts.map(({ value, label, desc }) => (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
