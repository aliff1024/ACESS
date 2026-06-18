import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { AssetSelector } from '@/components/ui/AssetSelector'
import type { MemoryGameData, MemoryCard, MemoryGameMode } from '@/lib/interactive-types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MemoryGameBuilderProps {
  data: MemoryGameData
  onChange: (data: MemoryGameData) => void
  courseId?: string
}

export function MemoryGameBuilder({ data, onChange, courseId }: MemoryGameBuilderProps) {
  const cards = data.cards ?? []
  const mode = data.mode ?? 'concept_match'

  const updateMode = (newMode: MemoryGameMode) => {
    onChange({ ...data, mode: newMode })
  }

  const addPair = () => {
    const pairId = crypto.randomUUID()
    const cardA: MemoryCard = { id: crypto.randomUUID(), pairId, text: '' }
    const cardB: MemoryCard = { id: crypto.randomUUID(), pairId, text: '' }
    onChange({ ...data, cards: [...cards, cardA, cardB] })
  }

  const removePair = (pairId: string) => {
    onChange({ ...data, cards: cards.filter((c) => c.pairId !== pairId) })
  }

  const updateCard = (id: string, field: 'text' | 'image_url', value: string) => {
    onChange({ ...data, cards: cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })
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
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Game Mode</h4>
          <p className="text-sm text-gray-500">What are students matching?</p>
        </div>
        <div className="w-56">
          <Select value={mode} onValueChange={(val) => updateMode(val as MemoryGameMode)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concept_match">Concept Matching (Text ↔ Text)</SelectItem>
              <SelectItem value="term_match">Term to Definition</SelectItem>
              <SelectItem value="image_image">Image to Image</SelectItem>
              <SelectItem value="image_label">Image to Label</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Memory Pairs ({pairs.length})</Label>
          <Button type="button" variant="default" size="sm" onClick={addPair}>
            <Plus className="w-4 h-4 mr-1" /> Add Pair
          </Button>
        </div>
        
        {pairs.length === 0 && <p className="text-sm text-gray-500 italic text-center py-6 bg-gray-50 rounded-lg border border-dashed">No pairs yet. Click &quot;Add Pair&quot; to create matching cards.</p>}
        
        <div className="space-y-4">
          {pairs.map((pair) => (
            <div key={pair.pairId} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Matching Pair</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePair(pair.pairId)} className="text-red-500 hover:bg-red-50 h-7 w-7">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                    {mode === 'term_match' ? 'Term' : mode === 'image_label' ? 'Image' : 'Card A'}
                  </Label>
                  
                  {mode !== 'image_image' && mode !== 'image_label' && (
                    <Input value={pair.cards[0].text} onChange={(e) => updateCard(pair.cards[0].id, 'text', e.target.value)} placeholder="Text" />
                  )}
                  {(mode === 'image_image' || mode === 'image_label' || mode === 'concept_match') && (
                    <AssetSelector 
                      courseId={courseId} 
                      value={pair.cards[0].image_url ?? ''} 
                      onChange={(url) => updateCard(pair.cards[0].id, 'image_url', url)} 
                      label={mode === 'image_image' || mode === 'image_label' ? 'Image' : 'Image (Optional)'} 
                      size="md" 
                      typeFilter="image" 
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-600 font-semibold uppercase tracking-wider">
                    {mode === 'term_match' ? 'Definition' : mode === 'image_label' ? 'Label' : 'Card B'}
                  </Label>
                  
                  {mode !== 'image_image' && (
                    <Input value={pair.cards[1].text} onChange={(e) => updateCard(pair.cards[1].id, 'text', e.target.value)} placeholder="Text" />
                  )}
                  {(mode === 'image_image' || mode === 'concept_match') && (
                    <AssetSelector 
                      courseId={courseId} 
                      value={pair.cards[1].image_url ?? ''} 
                      onChange={(url) => updateCard(pair.cards[1].id, 'image_url', url)} 
                      label={mode === 'image_image' ? 'Image' : 'Image (Optional)'} 
                      size="md" 
                      typeFilter="image" 
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
