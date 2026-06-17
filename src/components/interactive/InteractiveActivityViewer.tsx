import { FlashcardViewer } from './FlashcardViewer'
import { DragDropViewer } from './DragDropViewer'
import { FillBlanksViewer } from './FillBlanksViewer'
import { MemoryGameViewer } from './MemoryGameViewer'
import { TimelineViewer } from './TimelineViewer'
import type { InteractiveContentType, InteractiveActivityData, FlashcardsData, DragDropData, FillBlanksData, MemoryGameData, TimelineData } from '@/lib/interactive-types'

interface InteractiveActivityViewerProps {
  contentType: InteractiveContentType
  title: string
  data: InteractiveActivityData
  accessibilitySettings?: Record<string, unknown>
}

export function InteractiveActivityViewer({
  contentType,
  title,
  data,
  accessibilitySettings,
}: InteractiveActivityViewerProps) {
  const renderActivity = () => {
    switch (contentType) {
      case 'flashcards':
        return <FlashcardViewer data={data as FlashcardsData} accessibilitySettings={accessibilitySettings} />
      case 'drag_drop':
        return <DragDropViewer data={data as DragDropData} accessibilitySettings={accessibilitySettings} />
      case 'fill_blanks':
        return <FillBlanksViewer data={data as FillBlanksData} accessibilitySettings={accessibilitySettings} />
      case 'memory_game':
        return <MemoryGameViewer data={data as MemoryGameData} accessibilitySettings={accessibilitySettings} />
      case 'timeline':
        return <TimelineViewer data={data as TimelineData} accessibilitySettings={accessibilitySettings} />
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {renderActivity()}
    </div>
  )
}
