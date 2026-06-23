import { useState, useEffect } from 'react'
import type { MemoryGameData, MemoryGameMode } from '@/lib/interactive-types'
import { Button } from '@/components/ui/button'
import { RotateCcw, Trophy, Timer } from 'lucide-react'

interface MemoryGameViewerProps {
  data: MemoryGameData
  accessibilitySettings?: Record<string, unknown>
  onComplete?: () => void
}

export function MemoryGameViewer({ data, onComplete }: MemoryGameViewerProps) {
  const mode: MemoryGameMode = data.mode ?? 'concept_match'
  const [cards, setCards] = useState<{ id: string; pairId: string; text: string; image_url?: string; flipped: boolean; matched: boolean }[]>([])
  
  const [selected, setSelected] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  
  // Timer state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const reset = () => {
    const shuffled = [...(data.cards ?? [])]
      .sort(() => Math.random() - 0.5)
      .map((c) => ({ ...c, flipped: false, matched: false }))
    setCards(shuffled)
    setSelected([])
    setMoves(0)
    setLocked(false)
    setStartTime(null)
    setElapsedSeconds(0)
    setIsTimerRunning(false)
  }

  // Initialize
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - (startTime ?? Date.now())) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, startTime])

  const handleClick = (id: string) => {
    if (locked) return
    const card = cards.find((c) => c.id === id)
    if (!card || card.flipped || card.matched) return

    if (!isTimerRunning) {
      setStartTime(Date.now())
      setIsTimerRunning(true)
    }

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
          setCards((prev) => {
            const nextCards = prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c))
            // Check for game completion
            if (nextCards.every(c => c.matched)) {
              setIsTimerRunning(false)
              onComplete?.()
            }
            return nextCards
          })
          setSelected([])
        }, 500)
      } else {
        setLocked(true)
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c)))
          setSelected([])
          setLocked(false)
        }, 1200)
      }
    }
  }

  const allMatched = cards.length > 0 && cards.every((c) => c.matched)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (!data.cards?.length) {
    return <p className="text-gray-500 italic text-center p-8 bg-gray-50 border-2 border-dashed rounded-xl">No cards in this memory game.</p>
  }

  if (allMatched) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 px-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h3>
          <p className="text-gray-500">You successfully matched all pairs.</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 py-6 border-y border-gray-100">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-gray-900">{moves}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Moves</span>
          </div>
          <div className="flex flex-col items-center border-x border-gray-100">
            <span className="text-3xl font-bold text-gray-900">{formatTime(elapsedSeconds)}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Time</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-gray-900">{cards.length / 2}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Pairs</span>
          </div>
        </div>
        
        <Button onClick={reset} className="w-full h-12 text-base">
          <RotateCcw className="w-5 h-5 mr-2" /> Play Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Moves</span>
            <span className="text-lg font-bold text-gray-900">{moves}</span>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Timer className="w-3 h-3" /> Time</span>
            <span className="text-lg font-bold text-gray-900 w-16">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
        <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          {cards.filter(c => c.matched).length / 2} / {cards.length / 2} Pairs Matched
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto" style={{ perspective: '1000px' }}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleClick(card.id)}
            disabled={locked || card.flipped || card.matched}
            className="relative aspect-[3/4] sm:aspect-square w-full cursor-pointer transition-transform duration-500 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500 rounded-xl"
            style={{
              transformStyle: 'preserve-3d',
              transform: card.flipped || card.matched ? 'rotateY(180deg)' : 'none',
              opacity: card.matched ? 0.4 : 1,
            }}
            aria-label={card.flipped || card.matched ? card.text : "Hidden card"}
          >
            {/* Back of Card (Hidden when flipped) */}
            <div
              className="absolute inset-0 rounded-xl border-2 text-4xl font-bold flex items-center justify-center transition-all bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-600 border-indigo-700 text-indigo-200 shadow-md hover:shadow-lg hover:-translate-y-1"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="w-12 h-12 rounded-full border-4 border-indigo-400 flex items-center justify-center bg-indigo-700/50 backdrop-blur-sm">?</div>
            </div>

            {/* Front of Card (Visible when flipped) */}
            <div
              className={`absolute inset-0 rounded-xl border-2 p-3 flex flex-col items-center justify-center overflow-hidden shadow-md transition-colors ${
                card.matched ? 'bg-green-50 border-green-400' : 'bg-white border-blue-300'
              }`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {card.image_url && (
                <div className="flex-[2] w-full flex items-center justify-center mb-2 overflow-hidden rounded-md bg-transparent">
                  <img src={card.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
              )}
              {card.text && (
                <span className={`text-center font-medium text-gray-800 break-words ${card.image_url ? 'text-xs md:text-sm' : 'text-base md:text-lg'}`}>
                  {card.text}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
