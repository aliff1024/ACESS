import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Settings2, Info } from 'lucide-react'
import type { FillBlanksData, FillBlanksSegment, FillBlanksMode } from '@/lib/interactive-types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FillBlanksBuilderProps {
  data: FillBlanksData
  onChange: (data: FillBlanksData) => void
}

export function FillBlanksBuilder({ data, onChange }: FillBlanksBuilderProps) {
  const mode = data.mode ?? 'typing'
  const rawText = data.raw_text ?? ''
  const extraWords = data.extra_words?.join(', ') ?? ''

  const updateMode = (newMode: FillBlanksMode) => {
    onChange({ ...data, mode: newMode })
  }

  const handleRawTextChange = (text: string) => {
    const segments: FillBlanksSegment[] = []
    const parts = text.split(/(\[.*?\])/g)
    for (const p of parts) {
      if (p.startsWith('[') && p.endsWith(']')) {
        const answer = p.slice(1, -1).trim()
        if (answer) {
          segments.push({ text: '___', isBlank: true, answer })
        } else {
          segments.push({ text: '[]', isBlank: false })
        }
      } else if (p.length > 0) {
        segments.push({ text: p, isBlank: false })
      }
    }
    onChange({ ...data, raw_text: text, segments })
  }

  const handleExtraWordsChange = (val: string) => {
    const arr = val.split(',').map(s => s.trim()).filter(s => s)
    onChange({ ...data, extra_words: arr })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Activity Mode</h4>
          <p className="text-sm text-gray-500">How do students answer the blanks?</p>
        </div>
        <div className="w-56">
          <Select value={mode} onValueChange={(val) => updateMode(val as FillBlanksMode)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typing">Free Typing</SelectItem>
              <SelectItem value="word_bank">Word Bank (Drag & Drop)</SelectItem>
              <SelectItem value="mixed">Mixed (Per-blank config)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <Label className="text-base font-semibold">Content Builder</Label>
          <div className="bg-blue-50 text-blue-800 text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-blue-200 max-w-sm">
            <Info className="w-4 h-4 shrink-0" />
            <p>Type your text and put brackets around words to make them blanks. Example: <code>The cat is [under] the table.</code></p>
          </div>
        </div>
        
        <Textarea 
          value={rawText} 
          onChange={(e) => handleRawTextChange(e.target.value)} 
          placeholder="Enter your sentence or paragraph here. Enclose words in [brackets] to create blanks."
          className="min-h-[200px] text-sm leading-relaxed"
        />

        {mode === 'word_bank' && (
          <div className="mt-4 border-t pt-4 border-gray-100">
            <Label className="block text-sm font-semibold mb-1">Extra Word Bank Distractors (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">Add comma-separated words to increase difficulty. These words won't fit into any blanks.</p>
            <Input 
              value={extraWords}
              onChange={(e) => handleExtraWordsChange(e.target.value)}
              placeholder="e.g. inside, over, around"
            />
          </div>
        )}
      </div>
    </div>
  )
}
