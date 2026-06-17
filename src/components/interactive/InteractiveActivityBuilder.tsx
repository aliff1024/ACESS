import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FlashcardBuilder } from './FlashcardBuilder'
import { DragDropBuilder } from './DragDropBuilder'
import { FillBlanksBuilder } from './FillBlanksBuilder'
import { MemoryGameBuilder } from './MemoryGameBuilder'
import { TimelineBuilder } from './TimelineBuilder'
import type { InteractiveContentType, InteractiveActivityConfig, InteractiveActivityData } from '@/lib/interactive-types'
import type {
  FlashcardsData,
  DragDropData,
  FillBlanksData,
  MemoryGameData,
  TimelineData,
} from '@/lib/interactive-types'
import { templatesByType } from '@/lib/activity-templates'

const CONTENT_TYPES: { value: InteractiveContentType; label: string; icon: string }[] = [
  { value: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { value: 'drag_drop', label: 'Drag & Drop', icon: '📦' },
  { value: 'fill_blanks', label: 'Fill in the Blanks', icon: '✏️' },
  { value: 'memory_game', label: 'Memory Game', icon: '🧠' },
  { value: 'timeline', label: 'Timeline', icon: '📅' },
]

function defaultData(contentType: InteractiveContentType): InteractiveActivityData {
  switch (contentType) {
    case 'flashcards':
      return { cards: [] } as FlashcardsData
    case 'drag_drop':
      return { items: [], categories: ['Category 1', 'Category 2'] } as DragDropData
    case 'fill_blanks':
      return { segments: [] } as FillBlanksData
    case 'memory_game':
      return { cards: [] } as MemoryGameData
    case 'timeline':
      return { events: [] } as TimelineData
  }
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

interface InteractiveActivityBuilderProps {
  config: InteractiveActivityConfig
  onChange: (config: InteractiveActivityConfig) => void
}

export function InteractiveActivityBuilder({ config, onChange }: InteractiveActivityBuilderProps) {
  const [selectedType, setSelectedType] = useState<InteractiveContentType>(config.contentType)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  const handleTypeChange = (type: InteractiveContentType) => {
    setSelectedType(type)
    onChange({
      ...config,
      contentType: type,
      data: defaultData(type),
    })
    setShowTemplatePicker(true)
  }

  const handleSelectTemplate = (templateId: string) => {
    const templates = templatesByType[selectedType]
    if (!templates) return
    const tmpl = templates.find((t) => t.id === templateId)
    if (!tmpl) return
    onChange({
      ...config,
      contentType: selectedType,
      data: cloneData(tmpl.data) as InteractiveActivityData,
    })
    setShowTemplatePicker(false)
  }

  const handleSkipTemplate = () => {
    setShowTemplatePicker(false)
  }

  const handleDataChange = (data: InteractiveActivityData) => {
    onChange({ ...config, data })
  }

  const renderBuilder = () => {
    switch (selectedType) {
      case 'flashcards':
        return <FlashcardBuilder data={config.data as FlashcardsData} onChange={handleDataChange} courseId={config.courseId} />
      case 'drag_drop':
        return <DragDropBuilder data={config.data as DragDropData} onChange={handleDataChange} courseId={config.courseId} />
      case 'fill_blanks':
        return <FillBlanksBuilder data={config.data as FillBlanksData} onChange={handleDataChange} />
      case 'memory_game':
        return <MemoryGameBuilder data={config.data as MemoryGameData} onChange={handleDataChange} courseId={config.courseId} />
      case 'timeline':
        return <TimelineBuilder data={config.data as TimelineData} onChange={handleDataChange} courseId={config.courseId} />
    }
  }

  const templates = templatesByType[selectedType] || []

  return (
    <div className="space-y-6">
      <div>
        <Label>Activity Title</Label>
        <Input
          value={config.title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="e.g., Accessibility Principles Flashcards"
        />
      </div>
      <div>
        <Label>Activity Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-1">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors text-sm ${
                selectedType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template picker */}
      {showTemplatePicker && templates.length > 0 && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-blue-800">Choose a template to start with:</Label>
            <Button type="button" variant="ghost" size="sm" onClick={handleSkipTemplate} className="text-blue-700">
              Start from scratch
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl.id)}
                className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all text-left"
              >
                <span className="text-xl shrink-0 mt-0.5">{tmpl.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tmpl.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {renderBuilder()}
    </div>
  )
}
