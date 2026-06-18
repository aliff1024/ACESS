import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Settings2, Move } from 'lucide-react'
import { AssetSelector } from '@/components/ui/AssetSelector'
import type { DragDropData, DragDropItem, DragDropMode, DragDropZone } from '@/lib/interactive-types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DragDropBuilderProps {
  data: DragDropData
  onChange: (data: DragDropData) => void
  courseId?: string
}

function DiagramZoneEditor({ 
  imageUrl, 
  items, 
  zones = [], 
  onChange 
}: { 
  imageUrl: string, 
  items: DragDropItem[], 
  zones?: DragDropZone[], 
  onChange: (zones: DragDropZone[]) => void 
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggingId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleResizePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    setResizingId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let px = ((e.clientX - rect.left) / rect.width) * 100
    let py = ((e.clientY - rect.top) / rect.height) * 100
    px = Math.max(0, Math.min(px, 100))
    py = Math.max(0, Math.min(py, 100))

    if (draggingId) {
      onChange(zones.map(z => z.id === draggingId ? { ...z, x: px, y: py } : z))
    } else if (resizingId) {
      onChange(zones.map(z => {
        if (z.id !== resizingId) return z
        const currentWidth = z.width || 15
        const currentHeight = z.height || 10
        // Top left corner stays fixed
        const tlX = z.x - currentWidth / 2
        const tlY = z.y - currentHeight / 2
        
        let newWidth = px - tlX
        let newHeight = py - tlY
        
        // Minimum size
        newWidth = Math.max(10, newWidth)
        newHeight = Math.max(5, newHeight)

        const newX = tlX + newWidth / 2
        const newY = tlY + newHeight / 2

        return { ...z, x: newX, y: newY, width: newWidth, height: newHeight }
      }))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null)
    setResizingId(null)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Ensure all items have a zone
  const ensureZones = () => {
    const newZones = [...zones]
    let changed = false
    items.forEach((item, idx) => {
      if (!newZones.find(z => z.id === item.id)) {
        newZones.push({ id: item.id, label: item.text, x: 10 + (idx * 5) % 80, y: 10 + (idx * 5) % 80, width: 15, height: 10 })
        changed = true
      }
    })
    // Remove zones for deleted items
    const filteredZones = newZones.filter(z => items.find(i => i.id === z.id))
    if (changed || filteredZones.length !== newZones.length) {
      onChange(filteredZones)
    }
  }

  // Call once on render if needed
  if (items.length !== zones.length || items.some(i => !zones.find(z => z.id === i.id))) {
    setTimeout(ensureZones, 0)
  }

  return (
    <div className="mt-4 space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <Label className="text-sm font-semibold">Place Drop Zones</Label>
      <p className="text-xs text-gray-500 mb-2">Drag the boxes to position them, and drag the bottom-right corner to resize.</p>
      <div 
        ref={containerRef}
        className="relative w-full border border-gray-300 rounded overflow-hidden bg-white select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img src={imageUrl} alt="Diagram" className="w-full h-auto max-h-[500px] object-contain pointer-events-none" />
        
        {zones.map((zone) => {
          const item = items.find(i => i.id === zone.id)
          if (!item) return null
          
          const isDragging = draggingId === zone.id || resizingId === zone.id
          
          return (
            <div
              key={zone.id}
              onPointerDown={(e) => handlePointerDown(e, zone.id)}
              className={`absolute cursor-move flex items-center justify-center p-2 rounded border-2 shadow-sm touch-none
                ${isDragging ? 'bg-blue-100/90 border-blue-500 z-50' : 'bg-white/80 border-blue-300 z-10 hover:border-blue-500 hover:bg-white'}
              `}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: zone.width ? `${zone.width}%` : '15%',
                height: zone.height ? `${zone.height}%` : '10%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Move className="w-3 h-3 absolute -top-1.5 -left-1.5 text-blue-500 bg-white rounded-full pointer-events-none" />
              <span className="text-xs font-semibold text-center leading-tight truncate px-1 pointer-events-none">{item.text || 'Empty'}</span>
              
              {/* Resize Handle */}
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize shadow-sm hover:scale-110 transition-transform"
                onPointerDown={(e) => handleResizePointerDown(e, zone.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DragDropBuilder({ data, onChange, courseId }: DragDropBuilderProps) {
  const items = data.items ?? []
  const categories = data.categories ?? []
  const mode = data.mode ?? 'categories'

  const updateMode = (newMode: DragDropMode) => {
    onChange({ ...data, mode: newMode })
  }

  const addItem = () => {
    const newItem: DragDropItem = { id: crypto.randomUUID(), text: '', category: categories[0] || '' }
    onChange({ ...data, items: [...items, newItem], categories })
  }

  const removeItem = (id: string) => {
    onChange({ ...data, items: items.filter((i) => i.id !== id), categories })
  }

  const updateItem = (id: string, field: 'text' | 'category' | 'image_url', value: string) => {
    onChange({
      ...data,
      items: items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
      categories,
    })
  }

  const addCategory = () => {
    onChange({ ...data, items, categories: [...categories, `Category ${categories.length + 1}`] })
  }

  const updateCategory = (idx: number, value: string) => {
    const next = [...categories]
    next[idx] = value
    onChange({ ...data, items, categories: next })
  }

  const removeCategory = (idx: number) => {
    const removed = categories[idx]
    onChange({
      ...data,
      items: items.filter((i) => i.category !== removed),
      categories: categories.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Activity Mode</h4>
          <p className="text-sm text-gray-500">Choose how students will interact</p>
        </div>
        <div className="w-56">
          <Select value={mode} onValueChange={(val) => updateMode(val as DragDropMode)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="categories">Sort into Categories</SelectItem>
              <SelectItem value="diagram">Diagram Labeling</SelectItem>
              <SelectItem value="matching">Image Matching</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(mode === 'diagram' || mode === 'matching') && (
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <Label className="text-sm font-semibold text-gray-900 block mb-3">
            {mode === 'diagram' ? 'Diagram Image' : 'Background Image (Optional)'}
          </Label>
          <AssetSelector
            courseId={courseId}
            value={data.background_image ?? ''}
            onChange={(url) => onChange({ ...data, background_image: url })}
            label={mode === 'diagram' ? 'Upload the diagram to be labeled' : 'Upload a background image'}
            size="full"
            typeFilter="image"
          />
        </div>
      )}

      {mode === 'categories' && (
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Categories ({categories.length})</Label>
            <Button type="button" variant="outline" size="sm" onClick={addCategory}>
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Input value={cat} onChange={(e) => updateCategory(idx, e.target.value)} placeholder={`Category ${idx + 1}`} className="bg-white" />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeCategory(idx)} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            {mode === 'diagram' ? 'Labels to Place' : 'Items to Sort'} ({items.length})
          </Label>
          <Button type="button" variant="default" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Add {mode === 'diagram' ? 'Label' : 'Item'}
          </Button>
        </div>
        
        {items.length === 0 && <p className="text-sm text-gray-500 italic text-center py-6 bg-gray-50 rounded-lg border border-dashed">No items yet. Add your first item.</p>}
        
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-start border border-gray-100 rounded-lg p-4 bg-gray-50/50">
              <div className="flex-1 space-y-3">
                <Input value={item.text} onChange={(e) => updateItem(item.id, 'text', e.target.value)} placeholder="Text label" />
                {mode !== 'diagram' && (
                  <AssetSelector 
                    courseId={courseId} 
                    value={item.image_url ?? ''} 
                    onChange={(url) => updateItem(item.id, 'image_url', url)} 
                    label="Item Image (optional)" 
                    size="md" 
                    typeFilter="image" 
                  />
                )}
              </div>
              
              {mode === 'categories' ? (
                <div className="w-48">
                  <Select value={item.category} onValueChange={(val) => updateItem(item.id, 'category', val)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat, idx) => (
                        <SelectItem key={idx} value={cat}>{cat || `Category ${idx + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : mode === 'diagram' ? (
                <div className="w-48 text-xs text-gray-500 px-2 py-1 bg-white border border-gray-200 rounded flex items-center justify-center">
                  Use the visual editor below
                </div>
              ) : null}

              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:bg-red-50 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      {mode === 'diagram' && data.background_image && (
        <DiagramZoneEditor 
          imageUrl={data.background_image}
          items={items}
          zones={data.diagram_zones}
          onChange={(zones) => onChange({ ...data, diagram_zones: zones })}
        />
      )}
    </div>
  )
}
