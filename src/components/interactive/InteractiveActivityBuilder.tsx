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
import { ACTIVITY_ACCESSIBILITY } from '@/lib/accessibility-utils'
import { AlertTriangle, ThumbsUp } from 'lucide-react'
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
  primaryFocus?: string | null
}

export function InteractiveActivityBuilder({ config, onChange, primaryFocus }: InteractiveActivityBuilderProps) {
  const isNewActivity = !config.title && (!config.data || Object.keys(config.data).length <= 1)
  const [selectedType, setSelectedType] = useState<InteractiveContentType | null>(isNewActivity ? null : config.contentType)
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
          {CONTENT_TYPES.map((type) => {
            const rules = ACTIVITY_ACCESSIBILITY[type.value]
            const isRecommended = primaryFocus && rules?.recommendedFor?.includes(primaryFocus)
            const isCaution = primaryFocus && rules?.cautionFor?.includes(primaryFocus)
            
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors text-sm relative ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : isCaution ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-sm" title="Highly Recommended for target audience">
                    <ThumbsUp className="w-3 h-3" />
                  </div>
                )}
                {isCaution && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm" title="Use with caution for target audience">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                <span className="text-xl">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {mode === 'intro' && selectedType && (
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

      {mode !== 'intro' && selectedType && (
        <>
          {/* Accessibility Warning inside Edit mode */}
          {primaryFocus && ACTIVITY_ACCESSIBILITY[selectedType]?.cautionFor?.includes(primaryFocus) && (
            <div className="max-w-3xl bg-amber-50 text-amber-900 p-4 rounded-lg text-sm flex gap-3 text-left items-start border border-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="text-amber-800">Caution for {primaryFocus.replace('_', ' ').toUpperCase()}:</strong> {ACTIVITY_ACCESSIBILITY[selectedType].cautionReason}
                <div className="mt-1 font-medium text-amber-700">Suggestion: {ACTIVITY_ACCESSIBILITY[selectedType].alternativeSuggestion}</div>
              </div>
            </div>
          )}

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
