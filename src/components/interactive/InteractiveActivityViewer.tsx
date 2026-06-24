import { FlashcardViewer } from './FlashcardViewer'
import { DragDropViewer } from './DragDropViewer'
import { FillBlanksViewer } from './FillBlanksViewer'
import { MemoryGameViewer } from './MemoryGameViewer'
import { TimelineViewer } from './TimelineViewer'
import type { InteractiveContentType, InteractiveActivityData, FlashcardsData, DragDropData, FillBlanksData, MemoryGameData, TimelineData } from '@/lib/interactive-types'

import { useAccessibility } from '@/providers/AccessibilityProvider'
import { Info, Target } from 'lucide-react'

interface InteractiveActivityViewerProps {
  contentType: InteractiveContentType
  title: string
  data: InteractiveActivityData
  onComplete?: () => void
}

export function InteractiveActivityViewer({
  contentType,
  title,
  data,
  onComplete,
}: InteractiveActivityViewerProps) {
  const { settings } = useAccessibility();
  const renderActivity = () => {
    switch (contentType) {
      case 'flashcards':
        return <FlashcardViewer data={data as FlashcardsData} onComplete={onComplete} />
      case 'drag_drop':
        return <DragDropViewer data={data as DragDropData} onComplete={onComplete} />
      case 'fill_blanks':
        return <FillBlanksViewer data={data as FillBlanksData} onComplete={onComplete} />
      case 'memory_game':
        return <MemoryGameViewer data={data as MemoryGameData} onComplete={onComplete} />
      case 'timeline':
        return <TimelineViewer data={data as TimelineData} onComplete={onComplete} />
    }
  }

  const instructionsMap: Record<string, string> = {
    flashcards: 'Review each card. Click to flip and see the answer.',
    drag_drop: 'Drag the items to their matching drop zones.',
    fill_blanks: 'Type the missing words in the blanks.',
    memory_game: 'Click tiles to find matching pairs.',
    timeline: 'Review events in chronological order.',
  };

  return (
    <div className={`border border-gray-200 rounded-xl bg-white p-6 ${settings.reading_spotlight ? 'ring-4 ring-blue-400 ring-offset-4 shadow-xl' : ''}`}>
      <div className="flex items-start gap-3 mb-4">
        {settings.reading_spotlight && <Target className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />}
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {settings.structure_mode === 'checklist' && (
            <div className="flex items-center gap-2 mt-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-sm border border-blue-100">
              <Info className="w-4 h-4" />
              <span><strong>Instruction:</strong> {instructionsMap[contentType] || 'Complete this activity.'}</span>
            </div>
          )}
        </div>
      </div>
      {renderActivity()}
    </div>
  )
}
