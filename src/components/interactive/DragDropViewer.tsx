import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import type { DragDropData, DragDropItem } from '@/lib/interactive-types'

interface DragDropViewerProps {
  data: DragDropData
  accessibilitySettings?: Record<string, unknown>
}

function DraggableItem({ item, disabled }: { item: DragDropItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
    disabled,
  })

  const style: React.CSSProperties = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : undefined,
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-sm border cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'border-blue-400 bg-blue-50' : 'bg-white border-gray-200 hover:border-blue-300'
      }`}
    >
      {item.image_url && (
        <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      )}
      {item.text}
    </div>
  )
}

function DroppableCategory({ category, items, revealed, onItemClick }: {
  category: string
  items: DragDropItem[]
  revealed: boolean
  onItemClick: (item: DragDropItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${category}` })

  const getResult = (item: DragDropItem) => {
    return item.category === category ? 'correct' : 'incorrect'
  }

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-xl p-4 min-h-[120px] transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200 bg-gray-50'
      }`}
    >
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
      <div className="space-y-1">
        {items.map((item) => {
          const result = revealed ? getResult(item) : null
          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`px-3 py-2 rounded-lg text-sm cursor-pointer border flex items-center gap-2 ${
                result === 'correct' ? 'bg-green-50 border-green-300 text-green-800' :
                result === 'incorrect' ? 'bg-red-50 border-red-300 text-red-800' :
                'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              {item.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DroppableUnplaced({ items }: { items: DragDropItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unplaced' })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] flex flex-wrap gap-2 p-3 rounded-xl border-2 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200 bg-gray-50/50'
      }`}
    >
      {items.length === 0 && (
        <span className="text-xs text-gray-400 italic">All items placed</span>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-sm border bg-white border-gray-200"
        >
          {item.image_url && (
            <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          {item.text}
        </div>
      ))}
    </div>
  )
}

export function DragDropViewer({ data }: DragDropViewerProps) {
  const [unplaced, setUnplaced] = useState<DragDropItem[]>(data.items ?? [])
  const [dropped, setDropped] = useState<Record<string, DragDropItem[]>>({})
  const [revealed, setRevealed] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const categories = data.categories ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeItem = useMemo(
    () => activeId ? [...unplaced, ...Object.values(dropped).flat()].find((i) => i.id === activeId) : null,
    [activeId, unplaced, dropped]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const itemId = active.id as string
    const targetId = over.id as string

    // Find the item
    const item = [...unplaced, ...Object.values(dropped).flat()].find((i) => i.id === itemId)
    if (!item) return

    // Determine source
    const fromUnplaced = unplaced.some((i) => i.id === itemId)
    let fromCategory: string | null = null
    if (!fromUnplaced) {
      for (const [cat, items] of Object.entries(dropped)) {
        if (items.some((i) => i.id === itemId)) {
          fromCategory = cat
          break
        }
      }
    }

    // Determine target
    if (targetId === 'unplaced') {
      // Move back to unplaced
      if (fromCategory) {
        setDropped((prev) => ({
          ...prev,
          [fromCategory!]: prev[fromCategory!].filter((i) => i.id !== itemId),
        }))
      }
      if (!fromUnplaced) {
        setUnplaced((prev) => [...prev, item])
      }
    } else if (targetId.startsWith('cat:')) {
      const targetCategory = targetId.slice(4)
      // Remove from source
      if (fromUnplaced) {
        setUnplaced((prev) => prev.filter((i) => i.id !== itemId))
      } else if (fromCategory) {
        setDropped((prev) => ({
          ...prev,
          [fromCategory!]: prev[fromCategory!].filter((i) => i.id !== itemId),
        }))
      }
      // Add to target
      setDropped((prev) => ({
        ...prev,
        [targetCategory]: [...(prev[targetCategory] || []), item],
      }))
    }
  }

  if (!categories.length) {
    return <p className="text-gray-500 italic">No categories defined for this activity.</p>
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Unplaced items area */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Items to sort ({unplaced.length})</p>
          <DroppableUnplaced items={unplaced} />
        </div>

        {/* Category drop zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <DroppableCategory
              key={cat}
              category={cat}
              items={dropped[cat] || []}
              revealed={revealed}
              onItemClick={(item) => {
                // Click to move back to unplaced
                setDropped((prev) => ({
                  ...prev,
                  [cat]: (prev[cat] || []).filter((i) => i.id !== item.id),
                }))
                setUnplaced((prev) => [...prev, item])
              }}
            />
          ))}
        </div>

        {/* Draggable unplaced items */}
        {unplaced.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {unplaced.map((item) => (
              <DraggableItem key={item.id} item={item} disabled={revealed} />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant={revealed ? 'outline' : 'default'} onClick={() => setRevealed(!revealed)}>
            {revealed ? 'Hide Results' : 'Check Answers'}
          </Button>
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-lg border-2 border-blue-400 bg-blue-50">
            {activeItem.image_url && (
              <img src={activeItem.image_url} alt="" className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
            {activeItem.text}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
