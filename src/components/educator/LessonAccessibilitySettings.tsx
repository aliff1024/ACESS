'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Accessibility, Focus, LayoutList, Clock, BookOpen, HelpCircle, Sparkles } from 'lucide-react'
import { LessonCheckpointBuilder } from '@/components/educator/LessonCheckpointBuilder'

interface AccessibilitySettingsProps {
  lessonId: string | null
  simplifiedSummary: string
  focusModeEnabled: boolean
  chunkedContentEnabled: boolean
  checkpointsEnabled: boolean
  adaptiveLearningEnabled: boolean
  estimatedDuration: number
  onChange: (field: string, value: unknown) => void
}

export function LessonAccessibilitySettings({
  lessonId,
  simplifiedSummary, focusModeEnabled, chunkedContentEnabled, checkpointsEnabled,
  adaptiveLearningEnabled, estimatedDuration, onChange,
}: AccessibilitySettingsProps) {
  return (
    <div className="space-y-4 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Accessibility className="w-5 h-5 text-purple-600" />
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Accessibility & Learning Support</h4>
          <p className="text-xs text-gray-500">Cognitive support features for diverse learners</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
          <Focus className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="focusMode" className="text-sm font-medium text-gray-900">Focus Mode</Label>
              <Switch id="focusMode" checked={focusModeEnabled} onCheckedChange={(v) => onChange('focusModeEnabled', v)} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Minimal distractions, full-width content, reduced UI</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
          <LayoutList className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="chunkedContent" className="text-sm font-medium text-gray-900">Chunked Sections</Label>
              <Switch id="chunkedContent" checked={chunkedContentEnabled} onCheckedChange={(v) => onChange('chunkedContentEnabled', v)} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Break content into navigable sections</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
          <HelpCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="checkpoints" className="text-sm font-medium text-gray-900">Check-in Points</Label>
              <Switch id="checkpoints" checked={checkpointsEnabled} onCheckedChange={(v) => onChange('checkpointsEnabled', v)} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Pause during lesson to ask &ldquo;Did you understand?&rdquo;</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
          <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="adaptiveLearning" className="text-sm font-medium text-gray-900">Adaptive Learning</Label>
              <Switch id="adaptiveLearning" checked={adaptiveLearningEnabled} onCheckedChange={(v) => onChange('adaptiveLearningEnabled', v)} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Suggest re-reading sections when learners struggle</p>
          </div>
        </div>
      </div>

      <LessonCheckpointBuilder lessonId={lessonId} enabled={checkpointsEnabled} />

      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">Simplified Summary</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">A plain-language version of this lesson for learners who need simpler text</p>
        <Textarea
          value={simplifiedSummary}
          onChange={(e) => onChange('simplified_summary', e.target.value)}
          placeholder="Write a simplified version of the lesson content..."
          rows={4}
          className="text-sm"
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Estimated Duration</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">How long this lesson takes (helps learners plan)</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={999}
            value={estimatedDuration}
            onChange={(e) => onChange('estimated_duration', parseInt(e.target.value) || 10)}
            className="w-20"
          />
          <span className="text-sm text-gray-500">minutes</span>
        </div>
      </div>
    </div>
  )
}
