import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import type { FillBlanksData, FillBlanksSegment } from '@/lib/interactive-types'

interface FillBlanksBuilderProps {
  data: FillBlanksData
  onChange: (data: FillBlanksData) => void
}

export function FillBlanksBuilder({ data, onChange }: FillBlanksBuilderProps) {
  const segments = data.segments ?? []

  const addSegment = (type: 'text' | 'blank') => {
    const seg: FillBlanksSegment = type === 'blank'
      ? { text: '', isBlank: true, answer: '' }
      : { text: '', isBlank: false }
    onChange({ segments: [...segments, seg] })
  }

  const updateSegment = (idx: number, field: string, value: string) => {
    const next = segments.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    onChange({ segments: next })
  }

  const removeSegment = (idx: number) => {
    onChange({ segments: segments.filter((_, i) => i !== idx) })
  }

  const toggleBlank = (idx: number) => {
    const seg = segments[idx]
    const next: FillBlanksSegment = seg.isBlank
      ? { text: seg.text, isBlank: false }
      : { text: seg.text, isBlank: true, answer: '' }
    onChange({ segments: segments.map((s, i) => (i === idx ? next : s)) })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addSegment('text')}>
          <Plus className="w-4 h-4 mr-1" /> Add Text
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSegment('blank')}>
          <Plus className="w-4 h-4 mr-1" /> Add Blank
        </Button>
      </div>
      {segments.length === 0 && <p className="text-sm text-gray-500 italic">Add text segments and blanks to build your fill-in-the-blank exercise.</p>}
      <div className="space-y-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex gap-2 items-start border border-gray-200 rounded-lg p-3 bg-white">
            <div className={`flex-1 ${seg.isBlank ? 'bg-yellow-50 border border-yellow-200 rounded-lg p-2' : ''}`}>
              <Label className="text-xs text-gray-500">{seg.isBlank ? 'Blank (answer hidden from learner)' : 'Text (visible to learner)'}</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  value={seg.text}
                  onChange={(e) => updateSegment(idx, 'text', e.target.value)}
                  placeholder={seg.isBlank ? 'Placeholder / hint text' : 'Text content'}
                  className={seg.isBlank ? 'border-yellow-300' : ''}
                />
                {seg.isBlank && (
                  <Input
                    value={seg.answer ?? ''}
                    onChange={(e) => updateSegment(idx, 'answer', e.target.value)}
                    placeholder="Correct answer"
                    className="border-green-300 w-48"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-1 mt-5">
              <Button type="button" variant="ghost" size="sm" onClick={() => toggleBlank(idx)}>
                {seg.isBlank ? 'Text' : 'Blank'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeSegment(idx)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
