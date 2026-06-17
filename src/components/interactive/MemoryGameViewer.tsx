import { useState } from 'react'
import type { MemoryGameData } from '@/lib/interactive-types'

interface MemoryGameViewerProps {
  data: MemoryGameData
  accessibilitySettings?: Record<string, unknown>
}

export function MemoryGameViewer({ data }: MemoryGameViewerProps) {
  const [cards, setCards] = useState<{ id: string; pairId: string; text: string; image_url?: string; flipped: boolean; matched: boolean }[]>(() =>
    [...(data.cards ?? [])].sort(() => Math.random() - 0.5).map((c) => ({ ...c, flipped: false, matched: false }))
  )
  const [selected, setSelected] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)

  const handleClick = (id: string) => {
    if (locked) return
    const card = cards.find((c) => c.id === id)
    if (!card || card.flipped || card.matched) return

    const next = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c))
    setCards(next)
    const newSelected = [...selected, id]
    setSelected(newSelected)

    if (newSelected.length === 2) {
      setMoves((m) => m + 1)
      const [firstId, secondId] = newSelected
      const first = next.find((c) => c.id === firstId)!
      const second = next.find((c) => c.id === secondId)!

      if (first.pairId === second.pairId) {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c)))
          setSelected([])
        }, 400)
      } else {
        setLocked(true)
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c)))
          setSelected([])
          setLocked(false)
        }, 1000)
      }
    }
  }

  const allMatched = cards.length > 0 && cards.every((c) => c.matched)
  const reset = () => {
    const shuffled = [...(data.cards ?? [])]
      .sort(() => Math.random() - 0.5)
      .map((c) => ({ ...c, flipped: false, matched: false }))
    setCards(shuffled)
    setSelected([])
    setMoves(0)
    setLocked(false)
  }

  if (!data.cards?.length) {
    return <p className="text-gray-500 italic">No cards in this memory game.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Moves: {moves}</span>
        {allMatched && <span className="text-green-600 font-medium">All pairs matched in {moves} moves!</span>}
      </div>
      <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleClick(card.id)}
            disabled={card.matched || locked}
            className={`aspect-square rounded-xl border-2 text-sm font-medium transition-all duration-300 overflow-hidden ${
              card.matched ? 'bg-green-100 border-green-400 text-green-700 opacity-60' :
              card.flipped ? 'bg-blue-50 border-blue-300 text-blue-800' :
              'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {card.flipped || card.matched ? (
              card.image_url ? (
                <img src={card.image_url} alt={card.text} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : card.text
            ) : '?'}
          </button>
        ))}
      </div>
      {allMatched && (
        <div className="flex justify-center">
          <button type="button" onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
