import { useState, useEffect } from 'react'
import type { TimelineData, TimelineEvent, TimelineMode } from '@/lib/interactive-types'
import { Button } from '@/components/ui/button'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RotateCcw, CheckCircle2, GripVertical, AlertCircle } from 'lucide-react'

interface TimelineViewerProps {
  data: TimelineData
  accessibilitySettings?: Record<string, unknown>
  onComplete?: () => void
}

// Sortable Item Component for Interactive Modes
function SortableTimelineItem({ id, event, isEven, revealed, isCorrect, mode }: { id: string, event: TimelineEvent, isEven: boolean, revealed: boolean, isCorrect: boolean, mode: TimelineMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: revealed })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`relative flex flex-col sm:flex-row items-center sm:items-start group my-4 ${revealed ? '' : 'cursor-grab active:cursor-grabbing'}`} {...attributes} {...listeners}>
      {/* Center Node */}
      <div className={`absolute left-8 sm:left-1/2 w-4 h-4 rounded-full -translate-x-1/2 mt-6 sm:mt-1.5 shadow-sm transition-colors z-10 ${
        revealed ? (isCorrect ? 'bg-green-500 border-green-200' : 'bg-red-500 border-red-200') : 'bg-white border-blue-500 group-hover:scale-125'
      } border-4`} />
      
      {/* Content Side */}
      <div className={`w-full sm:w-1/2 pl-20 sm:pl-0 pr-4 sm:pr-8 ${isEven ? 'sm:text-right' : 'sm:order-2 sm:pl-8 sm:pr-0'}`}>
        <div className={`w-full text-left bg-white border rounded-2xl p-5 shadow-sm transition-all ${
          revealed ? (isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        } ${isDragging ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}>
          
          <div className={`flex flex-col gap-2 ${isEven ? 'sm:items-end' : 'sm:items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
              {!revealed && <GripVertical className="w-4 h-4 text-gray-400" />}
              {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              {revealed && !isCorrect && <AlertCircle className="w-4 h-4 text-red-600" />}
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                revealed ? (isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') : 'bg-gray-100 text-gray-700'
              }`}>
                {mode === 'process' ? 'Step' : 'Date hidden'}
              </span>
            </div>
            
            <h4 className="text-lg font-bold text-gray-800">{event.title}</h4>
            
            {event.image_url && (
              <div className="w-full my-3 rounded-xl overflow-hidden bg-white/50 flex justify-center mix-blend-multiply">
                <img src={event.image_url} alt={event.title} className="max-w-full h-32 object-contain" />
              </div>
            )}
            
            <p className={`text-sm text-gray-600 leading-relaxed ${isEven ? 'sm:text-right' : 'sm:text-left'}`}>
              {event.description}
            </p>

            {revealed && isCorrect && event.date && mode !== 'process' && (
              <div className="mt-2 text-sm font-bold text-green-700 bg-green-100/50 px-2 py-1 rounded inline-block">
                Correct Date: {event.date}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


export function TimelineViewer({ data, onComplete }: TimelineViewerProps) {
  const mode: TimelineMode = data.mode ?? 'historical'
  const originalEvents = data.events ?? []
  
  const [expanded, setExpanded] = useState<string | null>(null)
  
  // Sorting state
  const [items, setItems] = useState<TimelineEvent[]>([])
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState<{correct: number, total: number} | null>(null)

  // Initialize
  useEffect(() => {
    if (mode === 'historical') {
      setItems([...originalEvents].sort((a, b) => a.date.localeCompare(b.date)))
    } else {
      // Shuffle for interactive modes
      setItems([...originalEvents].sort(() => Math.random() - 0.5))
      setRevealed(false)
      setScore(null)
    }
  }, [data, mode, originalEvents])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const checkAnswers = () => {
    const correctOrder = [...originalEvents].sort((a, b) => a.date.localeCompare(b.date))
    let correctCount = 0
    
    items.forEach((item, index) => {
      if (item.id === correctOrder[index].id) correctCount++
    })
    
    setScore({ correct: correctCount, total: items.length })
    setRevealed(true)
    onComplete?.()
  }

  const resetActivity = () => {
    setItems([...originalEvents].sort(() => Math.random() - 0.5))
    setRevealed(false)
    setScore(null)
  }

  if (items.length === 0) {
    return <p className="text-gray-500 italic text-center p-8 bg-gray-50 border-2 border-dashed rounded-xl">No events in this timeline.</p>
  }

  if (mode === 'historical') {
    return (
      <div className="py-6 max-w-4xl mx-auto">
        <div className="relative">
          {/* Timeline Track */}
          <div className="absolute left-8 sm:left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-100 via-blue-300 to-blue-100 -translate-x-1/2 rounded-full" />
          
          <div className="space-y-12">
            {items.map((event, index) => {
              const isEven = index % 2 === 0
              const isExpanded = expanded === event.id
              return (
                <div key={event.id} className="relative flex flex-col sm:flex-row items-center sm:items-start group">
                  <div className="absolute left-8 sm:left-1/2 w-4 h-4 bg-white border-4 border-blue-500 rounded-full -translate-x-1/2 mt-6 sm:mt-1.5 shadow-sm group-hover:scale-125 transition-transform z-10" />
                  
                  <div className={`w-full sm:w-1/2 pl-20 sm:pl-0 pr-4 sm:pr-8 ${isEven ? 'sm:text-right' : 'sm:order-2 sm:pl-8 sm:pr-0'}`}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : event.id)}
                      className={`w-full text-left bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 ${isExpanded ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}
                    >
                      <div className={`flex flex-col gap-2 ${isEven ? 'sm:items-end' : 'sm:items-start'}`}>
                        <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-full mb-2 tracking-wide">
                          {event.date}
                        </span>
                        <h4 className="text-xl font-bold text-gray-900">{event.title}</h4>
                        
                        <div className={`mt-3 w-full overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          {event.image_url && (
                            <div className="w-full mb-4 rounded-xl overflow-hidden bg-gray-50 flex justify-center py-4">
                              <img src={event.image_url} alt={event.title} className="max-w-full max-h-64 object-contain mix-blend-multiply" />
                            </div>
                          )}
                          <p className={`text-base text-gray-600 leading-relaxed ${isEven ? 'sm:text-right' : 'sm:text-left'}`}>
                            {event.description}
                          </p>
                        </div>
                        
                        {!isExpanded && (
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-2 group-hover:underline">Read more</span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Interactive Modes (sorting / process)
  const correctOrder = [...originalEvents].sort((a, b) => a.date.localeCompare(b.date))
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Instructions / Score */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
        {!revealed ? (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {mode === 'process' ? 'Put the steps in the correct order' : 'Sort events chronologically'}
            </h3>
            <p className="text-gray-500 text-sm">Drag and drop the items below to reorder them.</p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Results</h3>
            <div className="flex justify-center items-center gap-4 text-xl mb-4">
              <span className={score?.correct === score?.total ? 'text-green-600 font-bold' : 'text-blue-600 font-bold'}>
                {score?.correct} / {score?.total} Correct
              </span>
            </div>
            <Button onClick={resetActivity} variant="outline"><RotateCcw className="w-4 h-4 mr-2" /> Try Again</Button>
          </>
        )}
      </div>

      <div className="relative py-4">
        {/* Track */}
        <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-1 bg-gray-200 -translate-x-1/2 rounded-full" />
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col space-y-4">
              {items.map((event, index) => {
                const isEven = index % 2 === 0
                const isCorrect = revealed ? event.id === correctOrder[index].id : false
                
                return (
                  <SortableTimelineItem 
                    key={event.id} 
                    id={event.id} 
                    event={event} 
                    isEven={isEven} 
                    revealed={revealed} 
                    isCorrect={isCorrect}
                    mode={mode}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {!revealed && (
        <div className="flex justify-end sticky bottom-6 z-20">
          <Button onClick={checkAnswers} size="lg" className="shadow-lg hover:shadow-xl transition-shadow text-base px-8 h-14 rounded-full">
            Check Order
          </Button>
        </div>
      )}
    </div>
  )
}
