'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, Plus, Trash2 } from 'lucide-react'

interface SummarySettingsProps {
  enabled: boolean
  source: string
  wordTarget: number
  keyPoints: string[]
  reflectionQuestions: string[]
  onChange: (field: string, value: unknown) => void
}

const sources = [
  { value: 'video', label: 'Video Content', desc: 'Base summary on the lesson video' },
  { value: 'pdf', label: 'PDF Resources', desc: 'Base summary on uploaded PDFs' },
  { value: 'lesson_text', label: 'Lesson Text', desc: 'Base summary on the lesson content' },
  { value: 'entire_lesson', label: 'Entire Lesson', desc: 'Combine all materials' },
]

export function LessonSummarySettings({
  enabled, source, wordTarget, keyPoints, reflectionQuestions, onChange,
}: SummarySettingsProps) {
  const [newPoint, setNewPoint] = useState('')
  const [newQuestion, setNewQuestion] = useState('')

  const addKeyPoint = () => {
    if (!newPoint.trim()) return
    onChange('summary_key_points', [...keyPoints, newPoint.trim()])
    setNewPoint('')
  }

  const removeKeyPoint = (index: number) => {
    onChange('summary_key_points', keyPoints.filter((_, i) => i !== index))
  }

  const addQuestion = () => {
    if (!newQuestion.trim()) return
    onChange('summary_reflection_questions', [...reflectionQuestions, newQuestion.trim()])
    setNewQuestion('')
  }

  const removeQuestion = (index: number) => {
    onChange('summary_reflection_questions', reflectionQuestions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Student Summary Activity</h4>
            <p className="text-xs text-gray-500">Students write a summary based on lesson materials</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => onChange('hasSummaryActivity', v)} />
      </div>

      {enabled && (
        <div className="space-y-4 pl-7 border-l-2 border-blue-200">
          <div>
            <Label className="text-sm font-medium">Summary Source</Label>
            <p className="text-xs text-gray-500 mb-2">What should students base their summary on?</p>
            <Select value={source} onValueChange={(v) => onChange('summary_source', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map(({ value, label, desc }) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Word Count Target</Label>
            <p className="text-xs text-gray-500 mb-2">Minimum word count for the summary</p>
            <Input
              type="number"
              min={10}
              max={2000}
              value={wordTarget}
              onChange={(e) => onChange('summary_word_target', parseInt(e.target.value) || 100)}
              className="w-32"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Key Points to Cover</Label>
            <p className="text-xs text-gray-500 mb-2">Specific concepts students should include</p>
            <div className="flex gap-2 mb-2">
              <Input
                value={newPoint}
                onChange={(e) => setNewPoint(e.target.value)}
                placeholder="Add a key point..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyPoint() } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addKeyPoint}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {keyPoints.length > 0 && (
              <div className="space-y-1">
                {keyPoints.map((point, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg text-sm">
                    <span>{point}</span>
                    <button type="button" onClick={() => removeKeyPoint(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Reflection Questions</Label>
            <p className="text-xs text-gray-500 mb-2">Questions to guide student thinking</p>
            <div className="flex gap-2 mb-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add a reflection question..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuestion() } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addQuestion}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {reflectionQuestions.length > 0 && (
              <div className="space-y-1">
                {reflectionQuestions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg text-sm">
                    <span>{q}</span>
                    <button type="button" onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
