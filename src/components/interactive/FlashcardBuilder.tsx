import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react'
import { AssetSelector } from '@/components/ui/AssetSelector'
import type { FlashcardsData, Flashcard, FlashcardMode, FlashcardLayout } from '@/lib/interactive-types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FlashcardBuilderProps {
  data: FlashcardsData
  onChange: (data: FlashcardsData) => void
  courseId?: string
}

export function FlashcardBuilder({ data, onChange, courseId }: FlashcardBuilderProps) {
  const cards = data.cards ?? []
  const mode = data.mode ?? 'study'

  const addCard = () => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      front: '',
      back: '',
      front_layout: 'text',
      back_layout: 'text'
    }
    onChange({ ...data, cards: [...cards, newCard] })
  }

  const removeCard = (id: string) => {
    onChange({ ...data, cards: cards.filter((c) => c.id !== id) })
  }

  const updateCard = (id: string, updates: Partial<Flashcard>) => {
    onChange({
      ...data,
      cards: cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })
  }

  const updateMode = (newMode: FlashcardMode) => {
    onChange({ ...data, mode: newMode })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Display Mode</h4>
          <p className="text-sm text-gray-500">How should students view these cards?</p>
        </div>
        <div className="w-48">
          <Select value={mode} onValueChange={(val) => updateMode(val as FlashcardMode)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="study">Study Deck (1 by 1)</SelectItem>
              <SelectItem value="carousel">Carousel (Horizontal)</SelectItem>
              <SelectItem value="grid">Grid (All Visible)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Flashcards ({cards.length})</Label>
          <Button type="button" variant="default" size="sm" onClick={addCard}>
            <Plus className="w-4 h-4 mr-1" /> Add Card
          </Button>
        </div>
        {cards.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <p className="text-sm text-gray-500 italic mb-4">No cards yet. Create your first flashcard to get started.</p>
            <Button type="button" variant="outline" onClick={addCard}>
              <Plus className="w-4 h-4 mr-1" /> Add First Card
            </Button>
          </div>
        )}
        <div className="space-y-4">
          {cards.map((card, index) => (
            <div key={card.id} className="flex gap-4 items-start border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              <div className="mt-2 text-gray-400 bg-gray-50 p-2 rounded-md cursor-grab">
                <GripVertical className="w-4 h-4" />
                <div className="text-center text-xs mt-1 font-medium">{index + 1}</div>
              </div>
              <div className="flex-1 grid md:grid-cols-2 gap-4">
                {/* Front Side */}
                <div className="flex flex-col gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-blue-600 font-bold uppercase tracking-wider">Front Side</Label>
                    <Select value={card.front_layout ?? 'text'} onValueChange={(val) => updateCard(card.id, { front_layout: val as FlashcardLayout })}>
                      <SelectTrigger className="h-7 text-xs w-[110px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Only</SelectItem>
                        <SelectItem value="image">Image Only</SelectItem>
                        <SelectItem value="both">Text + Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {((card.front_layout ?? 'text') === 'text' || (card.front_layout ?? 'text') === 'both') && (
                    <Input value={card.front} onChange={(e) => updateCard(card.id, { front: e.target.value })} placeholder="Enter text (e.g., What is HTML?)" />
                  )}
                  {((card.front_layout ?? 'text') === 'image' || (card.front_layout ?? 'text') === 'both') && (
                    <AssetSelector 
                      courseId={courseId} 
                      value={card.front_image ?? card.image_url ?? ''} 
                      onChange={(url) => updateCard(card.id, { front_image: url, image_url: url })} 
                      typeFilter="image"
                      size="full"
                    />
                  )}
                </div>
                
                {/* Back Side */}
                <div className="flex flex-col gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-green-600 font-bold uppercase tracking-wider">Back Side</Label>
                    <Select value={card.back_layout ?? 'text'} onValueChange={(val) => updateCard(card.id, { back_layout: val as FlashcardLayout })}>
                      <SelectTrigger className="h-7 text-xs w-[110px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Only</SelectItem>
                        <SelectItem value="image">Image Only</SelectItem>
                        <SelectItem value="both">Text + Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {((card.back_layout ?? 'text') === 'text' || (card.back_layout ?? 'text') === 'both') && (
                    <Input value={card.back} onChange={(e) => updateCard(card.id, { back: e.target.value })} placeholder="Enter text (e.g., HyperText Markup Language)" />
                  )}
                  {((card.back_layout ?? 'text') === 'image' || (card.back_layout ?? 'text') === 'both') && (
                    <AssetSelector 
                      courseId={courseId} 
                      value={card.back_image ?? ''} 
                      onChange={(url) => updateCard(card.id, { back_image: url })} 
                      typeFilter="image"
                      size="full"
                    />
                  )}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCard(card.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 mt-1 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
