import { useState } from 'react'
import type { FlashcardsData } from '@/lib/interactive-types'

interface FlashcardViewerProps {
  data: FlashcardsData
  accessibilitySettings?: Record<string, unknown>
}

export function FlashcardViewer({ data }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const cards = data.cards ?? []

  if (cards.length === 0) {
    return <p className="text-gray-500 italic">No flashcards in this activity.</p>
  }

  const current = cards[currentIndex]
  const total = cards.length
  const progress = completed.size

  const nextCard = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setFlipped(false)
    }
  }

  const markComplete = () => {
    setCompleted((prev) => new Set(prev).add(currentIndex))
  }

  const isCurrentComplete = completed.has(currentIndex)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Card {currentIndex + 1} of {total}</span>
        <span>{progress} / {total} completed</span>
      </div>
      <div className="flex justify-center">
        <div className="relative w-full max-w-lg min-h-[200px]" style={{ perspective: '1000px' }}>
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full min-h-[200px] cursor-pointer transition-transform duration-500"
            style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
          >
            <div className="absolute inset-0 bg-white border-2 border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: 'hidden' }}>
              {current.image_url && (
                <img src={current.image_url} alt="" className="max-h-40 mb-3 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <p className="text-lg font-medium text-gray-800">{current.front}</p>
            </div>
            <div className="absolute inset-0 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              {current.image_url && (
                <img src={current.image_url} alt="" className="max-h-40 mb-3 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <p className="text-lg text-gray-800">{current.back}</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">Click to flip</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevCard}
          disabled={currentIndex === 0}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={markComplete}
          disabled={isCurrentComplete}
          className={`px-4 py-2 text-sm rounded-lg ${isCurrentComplete ? 'bg-green-100 text-green-700 cursor-default' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {isCurrentComplete ? 'Completed' : 'Mark Complete'}
        </button>
        <button
          type="button"
          onClick={nextCard}
          disabled={currentIndex === total - 1}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
