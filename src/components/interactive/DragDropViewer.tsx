import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import type { DragDropData, DragDropItem, DragDropMode } from '@/lib/interactive-types'
import { RotateCcw, CheckCircle2 } from 'lucide-react'

interface DragDropViewerProps {
  data: DragDropData
  accessibilitySettings?: Record<string, unknown>
  onComplete?: () => void
}

// Draggable Item Component
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
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {item.image_url && (
        <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />
      )}
      {item.text}
    </div>
  )
}

// Droppable Category Zone
function DroppableCategory({ category, items, revealed, onItemClick }: {
  category: string
  items: DragDropItem[]
  revealed: boolean
  onItemClick: (item: DragDropItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${category}` })

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-xl p-4 min-h-[140px] transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50/90 shadow-md' : 'border-dashed border-gray-300 bg-white/80 backdrop-blur-sm shadow-sm hover:border-gray-400'
      }`}
    >
      <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">{category}</h4>
      <div className="flex flex-wrap gap-2 justify-center">
        {items.map((item) => {
          const isCorrect = item.category === category
          return (
            <div
              key={item.id}
              onClick={() => !revealed && onItemClick(item)}
              className={`px-3 py-1.5 rounded-lg text-sm ${!revealed ? 'cursor-pointer hover:bg-gray-50' : ''} border flex items-center gap-2 ${
                revealed 
                  ? (isCorrect ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800')
                  : 'bg-white border-gray-200'
              }`}
            >
              {item.image_url && <img src={item.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
              {item.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Droppable Diagram Zone
function DroppableDiagramZone({ item, zoneId, revealed, isCorrect, currentItem, onRemove }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:${zoneId}` })
  
  return (
    <div
      ref={setNodeRef}
      className={`relative w-full h-full min-h-[40px] min-w-[10px] border-2 border-dashed rounded-md flex items-center justify-center p-2 transition-colors
        ${isOver ? 'bg-blue-100/80 border-blue-500' : 'bg-white/60 border-gray-400'}
        ${currentItem ? 'border-solid border-gray-300 bg-white shadow-sm' : ''}
        ${revealed && currentItem ? (isCorrect ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800') : ''}
      `}
    >
      {currentItem ? (
        <div onClick={() => !revealed && onRemove(currentItem)} className={`text-sm font-medium ${!revealed ? 'cursor-pointer' : ''}`}>
          {currentItem.text}
        </div>
      ) : (
        <span className="text-xs text-gray-500 font-medium">Drop here</span>
      )}
    </div>
  )
}

// Main Component
export function DragDropViewer({ data, onComplete }: DragDropViewerProps) {
  const mode: DragDropMode = data.mode ?? 'categories'
  const items = data.items ?? []
  const categories = data.categories ?? []
  
  const [unplaced, setUnplaced] = useState<DragDropItem[]>(items)
  const [droppedCategories, setDroppedCategories] = useState<Record<string, DragDropItem[]>>({})
  const [droppedZones, setDroppedZones] = useState<Record<string, DragDropItem>>({})
  
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState<{correct: number, total: number} | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Reset when data changes
  useEffect(() => {
    setUnplaced(items)
    setDroppedCategories({})
    setDroppedZones({})
    setRevealed(false)
    setScore(null)
  }, [data])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeItem = useMemo(() => {
    if (!activeId) return null
    return items.find(i => i.id === activeId)
  }, [activeId, items])

  const handleDragStart = (event: DragStartEvent) => {
    if (revealed) return
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (revealed) return
    
    const { active, over } = event
    if (!over) return

    const itemId = active.id as string
    const targetId = over.id as string
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    // Find where it came from
    const isFromUnplaced = unplaced.some(i => i.id === itemId)
    
    let fromCategory: string | null = null
    for (const [cat, catItems] of Object.entries(droppedCategories)) {
      if (catItems.some(i => i.id === itemId)) fromCategory = cat
    }
    
    let fromZone: string | null = null
    for (const [zoneId, zItem] of Object.entries(droppedZones)) {
      if (zItem.id === itemId) fromZone = zoneId
    }

    // Remove from source
    if (isFromUnplaced) {
      setUnplaced(prev => prev.filter(i => i.id !== itemId))
    } else if (fromCategory) {
      setDroppedCategories(prev => ({...prev, [fromCategory!]: prev[fromCategory!].filter(i => i.id !== itemId)}))
    } else if (fromZone) {
      const nextZones = {...droppedZones}
      delete nextZones[fromZone]
      setDroppedZones(nextZones)
    }

    // Add to target
    if (targetId === 'unplaced') {
      setUnplaced(prev => [...prev, item])
    } else if (targetId.startsWith('cat:')) {
      const cat = targetId.slice(4)
      setDroppedCategories(prev => ({...prev, [cat]: [...(prev[cat] || []), item]}))
    } else if (targetId.startsWith('zone:')) {
      const zoneId = targetId.slice(5)
      // If zone already has an item, send it back to unplaced
      if (droppedZones[zoneId]) {
        setUnplaced(prev => [...prev, droppedZones[zoneId]])
      }
      setDroppedZones(prev => ({...prev, [zoneId]: item}))
    }
  }

  const checkAnswers = () => {
    let correct = 0
    let total = items.length

    if (mode === 'categories') {
      for (const [cat, catItems] of Object.entries(droppedCategories)) {
        for (const item of catItems) {
          if (item.category === cat) correct++
        }
      }
    } else if (mode === 'diagram' || mode === 'matching') {
      for (const [zoneId, item] of Object.entries(droppedZones)) {
        if (item.id === zoneId) correct++ // Assuming diagram zone ID matches item ID
      }
    }

    setScore({ correct, total })
    setRevealed(true)
    if (correct === total) {
      onComplete?.()
    } else {
      // If we just want to mark it complete when they attempt it:
      onComplete?.()
    }
  }

  const resetActivity = () => {
    setUnplaced(items)
    setDroppedCategories({})
    setDroppedZones({})
    setRevealed(false)
    setScore(null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-8 max-w-4xl mx-auto">
        
        {/* Score Display */}
        {revealed && score && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <h3 className="text-xl font-bold mb-2">Activity Complete!</h3>
            <div className="flex items-center justify-center gap-4 text-2xl">
              <span className={score.correct === score.total ? 'text-green-600' : 'text-blue-600'}>
                {score.correct} / {score.total} Correct
              </span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-700">{Math.round((score.correct / score.total) * 100)}%</span>
            </div>
            <Button onClick={resetActivity} className="mt-6" variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Activity
            </Button>
          </div>
        )}

        {/* Categories Mode */}
        {mode === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <DroppableCategory
                key={cat}
                category={cat}
                items={droppedCategories[cat] || []}
                revealed={revealed}
                onItemClick={(item) => {
                  setDroppedCategories(prev => ({...prev, [cat]: prev[cat].filter(i => i.id !== item.id)}))
                  setUnplaced(prev => [...prev, item])
                }}
              />
            ))}
          </div>
        )}

        {/* Diagram / Matching Mode */}
        {(mode === 'diagram' || mode === 'matching') && (
          <div className="bg-gray-100 rounded-xl p-8 border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
            {data.background_image ? (
              <img src={data.background_image} alt="Diagram" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm" />
            ) : (
              <div className="h-64 w-full flex items-center justify-center text-gray-400 italic">No diagram image provided</div>
            )}
            
            {/* Overlay Zones */}
            <div className="absolute inset-0 pointer-events-none">
               {(data.diagram_zones || []).map((zone) => {
                 const item = items.find(i => i.id === zone.id)
                 if (!item) return null
                 return (
                     <div 
                       key={zone.id} 
                       className="absolute pointer-events-auto"
                       style={{
                         left: `${zone.x}%`,
                         top: `${zone.y}%`,
                         width: zone.width ? `${zone.width}%` : '15%',
                         height: zone.height ? `${zone.height}%` : '10%',
                         transform: 'translate(-50%, -50%)'
                       }}
                     >
                       <DroppableDiagramZone 
                         zoneId={zone.id}
                         revealed={revealed}
                         isCorrect={droppedZones[zone.id]?.id === zone.id}
                         currentItem={droppedZones[zone.id]}
                         onRemove={(i: DragDropItem) => {
                           const nextZones = {...droppedZones}
                           delete nextZones[zone.id]
                           setDroppedZones(nextZones)
                           setUnplaced(prev => [...prev, i])
                         }}
                       />
                     </div>
                 )
               })}
            </div>
          </div>
        )}

        {/* Draggable Bank */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-700">Drag items from here</h4>
            {unplaced.length === 0 && <span className="text-sm text-green-600 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> All items placed</span>}
          </div>
          
          <div className="flex flex-wrap gap-3 min-h-[60px]">
            {unplaced.map((item) => (
              <DraggableItem key={item.id} item={item} disabled={revealed} />
            ))}
          </div>
        </div>

        {/* Actions */}
        {!revealed && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetActivity}>Reset</Button>
            <Button variant="default" onClick={checkAnswers} disabled={unplaced.length === items.length}>
              Check Answers
            </Button>
          </div>
        )}

      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow-lg border-2 border-blue-400 bg-blue-50">
            {activeItem.image_url && <img src={activeItem.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
            {activeItem.text}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
