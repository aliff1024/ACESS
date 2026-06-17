import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { FlashcardsData, Flashcard } from '@/lib/interactive-types'

interface FlashcardBuilderProps {
  data: FlashcardsData
  onChange: (data: FlashcardsData) => void
  courseId?: string
}

export function FlashcardBuilder({ data, onChange, courseId }: FlashcardBuilderProps) {
  const cards = data.cards ?? []

  const addCard = () => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      front: '',
      back: '',
    }
    onChange({ cards: [...cards, newCard] })
  }

  const removeCard = (id: string) => {
    onChange({ cards: cards.filter((c) => c.id !== id) })
  }

  const updateCard = (id: string, field: 'front' | 'back' | 'image_url', value: string) => {
    onChange({
      cards: cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Flashcards ({cards.length})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addCard}>
          <Plus className="w-4 h-4 mr-1" /> Add Card
        </Button>
      </div>
      {cards.length === 0 && (
        <p className="text-sm text-gray-500 italic">No cards yet. Click &quot;Add Card&quot; to create one.</p>
      )}
      <div className="space-y-3">
        {cards.map((card) => (
          <div key={card.id} className="flex gap-3 items-start border border-gray-200 rounded-lg p-3 bg-white">
            <div className="mt-3 text-gray-400">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Front (question)</Label>
                <Input value={card.front} onChange={(e) => updateCard(card.id, 'front', e.target.value)} placeholder="e.g., What is accessibility?" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Back (answer)</Label>
                <Input value={card.back} onChange={(e) => updateCard(card.id, 'back', e.target.value)} placeholder="e.g., Designing for all users" />
              </div>
              <div className="col-span-2">
                <ImageUpload courseId={courseId} value={card.image_url ?? ''} onChange={(url) => updateCard(card.id, 'image_url', url)} label="Image (optional)" size="lg" />
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeCard(card.id)} className="text-red-500 hover:text-red-700 mt-2">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
