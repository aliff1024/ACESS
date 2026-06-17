import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { MemoryGameData, MemoryCard } from '@/lib/interactive-types'

interface MemoryGameBuilderProps {
  data: MemoryGameData
  onChange: (data: MemoryGameData) => void
  courseId?: string
}

export function MemoryGameBuilder({ data, onChange, courseId }: MemoryGameBuilderProps) {
  const cards = data.cards ?? []

  const addPair = () => {
    const pairId = crypto.randomUUID()
    const cardA: MemoryCard = { id: crypto.randomUUID(), pairId, text: '' }
    const cardB: MemoryCard = { id: crypto.randomUUID(), pairId, text: '' }
    onChange({ cards: [...cards, cardA, cardB] })
  }

  const removePair = (pairId: string) => {
    onChange({ cards: cards.filter((c) => c.pairId !== pairId) })
  }

  const updateCard = (id: string, field: 'text' | 'image_url', value: string) => {
    onChange({ cards: cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })
  }

  const pairs: { pairId: string; cards: [MemoryCard, MemoryCard] }[] = []
  const seen = new Set<string>()
  for (const card of cards) {
    if (seen.has(card.pairId)) continue
    seen.add(card.pairId)
    const match = cards.filter((c) => c.pairId === card.pairId)
    if (match.length === 2) {
      pairs.push({ pairId: card.pairId, cards: match as [MemoryCard, MemoryCard] })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Memory Pairs ({pairs.length})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addPair}>
          <Plus className="w-4 h-4 mr-1" /> Add Pair
        </Button>
      </div>
      {pairs.length === 0 && <p className="text-sm text-gray-500 italic">No pairs yet. Click &quot;Add Pair&quot; to create matching cards.</p>}
      <div className="space-y-3">
        {pairs.map((pair) => (
          <div key={pair.pairId} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Matching Pair</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removePair(pair.pairId)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Card A</Label>
                <Input value={pair.cards[0].text} onChange={(e) => updateCard(pair.cards[0].id, 'text', e.target.value)} placeholder="e.g., HTML" />
                <ImageUpload courseId={courseId} value={pair.cards[0].image_url ?? ''} onChange={(url) => updateCard(pair.cards[0].id, 'image_url', url)} label="Image (optional)" size="lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Card B</Label>
                <Input value={pair.cards[1].text} onChange={(e) => updateCard(pair.cards[1].id, 'text', e.target.value)} placeholder="e.g., HyperText Markup Language" />
                <ImageUpload courseId={courseId} value={pair.cards[1].image_url ?? ''} onChange={(url) => updateCard(pair.cards[1].id, 'image_url', url)} label="Image (optional)" size="lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
