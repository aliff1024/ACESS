import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FlashcardBuilder } from './FlashcardBuilder'
import { DragDropBuilder } from './DragDropBuilder'
import { FillBlanksBuilder } from './FillBlanksBuilder'
import { MemoryGameBuilder } from './MemoryGameBuilder'
import { TimelineBuilder } from './TimelineBuilder'
import { InteractiveActivityViewer } from './InteractiveActivityViewer'
import type { InteractiveContentType, InteractiveActivityConfig, InteractiveActivityData } from '@/lib/interactive-types'
import type {
  FlashcardsData,
  DragDropData,
  FillBlanksData,
  MemoryGameData,
  TimelineData,
} from '@/lib/interactive-types'

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
  const isNewActivity = !config.title && (!config.data || Object.keys(config.data).length <= 1)
  const [mode, setMode] = useState<'intro' | 'edit' | 'preview'>(isNewActivity ? 'intro' : 'edit')

  const handleTypeChange = (type: InteractiveContentType) => {
    setSelectedType(type)
    onChange({
      ...config,
      contentType: type,
      data: defaultData(type),
    })
    setMode('intro')
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

      {mode === 'intro' && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-6 text-center space-y-4">
          <div className="text-4xl">{CONTENT_TYPES.find(t => t.value === selectedType)?.icon}</div>
          <h3 className="text-xl font-bold text-blue-900">
            {CONTENT_TYPES.find(t => t.value === selectedType)?.label}
          </h3>
          <p className="text-sm text-blue-700 max-w-md mx-auto">
            {selectedType === 'flashcards' && "Create interactive flashcards with terms, definitions, and images. Great for vocabulary and concepts."}
            {selectedType === 'drag_drop' && "Create a visual drag and drop activity where students match items to categories or drop labels onto diagrams."}
            {selectedType === 'fill_blanks' && "Create sentences with missing words for students to fill in or select from a word bank."}
            {selectedType === 'memory_game' && "Create a memory matching game. Students flip cards to find matching pairs of concepts, words, or images."}
            {selectedType === 'timeline' && "Create interactive timelines where students can explore events or sort them into chronological order."}
          </p>
          <div className="pt-2">
            <Button onClick={() => setMode('edit')} className="bg-blue-600 hover:bg-blue-700">
              Create {CONTENT_TYPES.find(t => t.value === selectedType)?.label}
            </Button>
          </div>
        </div>
      )}

      {mode !== 'intro' && (
        <>
          {/* Mode toggle */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'edit'
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'preview'
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Preview
            </button>
          </div>

          {mode === 'edit' ? (
            <>
              {renderBuilder()}
            </>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Student Preview</p>
              </div>
              <div className="p-4">
                <InteractiveActivityViewer
                  contentType={selectedType}
                  title={config.title || 'Untitled Activity'}
                  data={config.data}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
