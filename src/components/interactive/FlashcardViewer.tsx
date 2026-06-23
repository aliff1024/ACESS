import { useState } from 'react'
import type { FlashcardsData, FlashcardLayout } from '@/lib/interactive-types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

interface FlashcardViewerProps {
  data: FlashcardsData
  accessibilitySettings?: Record<string, unknown>
  onComplete?: () => void
}

export function FlashcardViewer({ data, accessibilitySettings, onComplete }: FlashcardViewerProps) {
  const cards = data.cards ?? []
  const mode = data.mode ?? 'study'
  
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  if (cards.length === 0) {
    return <p className="text-gray-500 italic p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">No flashcards in this activity.</p>
  }

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }))
    
    if (!(id in flippedCards)) {
      const newCount = Object.keys(flippedCards).length + 1
      if (newCount >= Math.min(cards.length, 3)) {
        // Use a small timeout to ensure we don't call onComplete synchronously during the current event cycle
        // if it triggers a parent state update that conflicts, though moving it out of setState updater is usually enough.
        setTimeout(() => onComplete?.(), 0)
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) setCurrentIndex(prev => prev + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
  }

  const scrollContainer = (dir: 'left' | 'right') => {
    const el = document.getElementById('flashcard-slider')
    if (el) {
      const scrollAmount = el.clientWidth * 0.8
      el.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }

  const renderCardContent = (content: string, imageUrl?: string, layout: FlashcardLayout = 'text') => {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        {(layout === 'image' || layout === 'both') && imageUrl && (
          <div className={`w-full ${layout === 'image' ? 'flex-1 min-h-[200px]' : 'h-48'} mb-4 rounded-lg overflow-hidden shrink-0 bg-white/50 flex items-center justify-center`}>
            <img src={imageUrl} alt="" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
        )}
        {(layout === 'text' || layout === 'both') && (
          <div className="flex-1 flex items-center justify-center overflow-y-auto w-full px-4">
            <p className={`${layout === 'both' ? 'text-lg' : 'text-xl md:text-2xl'} font-semibold text-gray-800 whitespace-pre-wrap leading-relaxed`}>
              {content}
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderCard = (card: typeof cards[0]) => {
    const isFlipped = !!flippedCards[card.id]
    return (
      <div className="relative w-full h-[400px]" style={{ perspective: '1200px' }}>
        <button
          onClick={() => toggleFlip(card.id)}
          className="relative w-full h-full cursor-pointer transition-transform duration-700 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500 rounded-2xl"
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
          aria-label={isFlipped ? "Show front of card" : "Show back of card"}
          aria-live="polite"
        >
          {/* Front of Card */}
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow" style={{ backfaceVisibility: 'hidden' }}>
            {renderCardContent(card.front, card.front_image ?? card.image_url, card.front_layout)}
            <div className="absolute bottom-3 right-4 text-gray-400 opacity-60">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          
          {/* Back of Card */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-md rounded-2xl overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            {renderCardContent(card.back, card.back_image, card.back_layout)}
            <div className="absolute bottom-3 right-4 text-blue-400 opacity-60">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    )
  }

  if (mode === 'study') {
    const card = cards[currentIndex]
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-4">
        {renderCard(card)}
        
        <div className="flex items-center justify-between px-2">
          <Button variant="outline" size="lg" onClick={handlePrev} disabled={currentIndex === 0} className="w-28 shadow-sm">
            <ChevronLeft className="w-5 h-5 mr-1" /> Prev
          </Button>
          <div className="text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
            {currentIndex + 1} / {cards.length}
          </div>
          <Button variant="default" size="lg" onClick={handleNext} disabled={currentIndex === cards.length - 1} className="w-28 shadow-sm">
            Next <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
        {cards.map((card) => (
          <div key={card.id}>
            {renderCard(card)}
          </div>
        ))}
      </div>
    )
  }

  // Carousel mode (Default behavior from old implementation but styled better)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 px-2">
        <span className="font-medium bg-gray-100 px-3 py-1 rounded-full">{cards.length} cards in this set</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollContainer('left')}
            className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollContainer('right')}
            className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        id="flashcard-slider"
        className="flex overflow-x-auto gap-6 pb-8 pt-2 px-2 snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card, idx) => (
          <div key={card.id} className="snap-center shrink-0 w-[85vw] sm:w-[320px] md:w-[400px]">
            {renderCard(card)}
            <div className="text-center mt-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Card {idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; }`}} />
    </div>
  )
}
