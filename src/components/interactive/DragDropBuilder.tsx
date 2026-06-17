import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { DragDropData, DragDropItem } from '@/lib/interactive-types'

interface DragDropBuilderProps {
  data: DragDropData
  onChange: (data: DragDropData) => void
  courseId?: string
}

export function DragDropBuilder({ data, onChange, courseId }: DragDropBuilderProps) {
  const items = data.items ?? []
  const categories = data.categories ?? []

  const addItem = () => {
    const newItem: DragDropItem = { id: crypto.randomUUID(), text: '', category: categories[0] || '' }
    onChange({ items: [...items, newItem], categories })
  }

  const removeItem = (id: string) => {
    onChange({ items: items.filter((i) => i.id !== id), categories })
  }

  const updateItem = (id: string, field: 'text' | 'category' | 'image_url', value: string) => {
    onChange({
      items: items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
      categories,
    })
  }

  const addCategory = () => {
    onChange({ items, categories: [...categories, ''] })
  }

  const updateCategory = (idx: number, value: string) => {
    const next = [...categories]
    next[idx] = value
    onChange({ items, categories: next })
  }

  const removeCategory = (idx: number) => {
    const removed = categories[idx]
    onChange({
      items: items.filter((i) => i.category !== removed),
      categories: categories.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Categories</Label>
        <div className="space-y-2 mt-1">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input value={cat} onChange={(e) => updateCategory(idx, e.target.value)} placeholder={`Category ${idx + 1}`} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(idx)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addCategory}>
            <Plus className="w-4 h-4 mr-1" /> Add Category
          </Button>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Items to Sort ({items.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
        {items.length === 0 && <p className="text-sm text-gray-500 italic">No items yet.</p>}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-start border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex-1 space-y-1">
                <Input value={item.text} onChange={(e) => updateItem(item.id, 'text', e.target.value)} placeholder="Item text" />
                <ImageUpload courseId={courseId} value={item.image_url ?? ''} onChange={(url) => updateItem(item.id, 'image_url', url)} label="Image (optional)" size="lg" />
              </div>
              <select
                value={item.category}
                onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat || `Category ${idx + 1}`}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
