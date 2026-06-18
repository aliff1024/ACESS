import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { AssetSelector } from '@/components/ui/AssetSelector'
import type { TimelineData, TimelineEvent, TimelineMode } from '@/lib/interactive-types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TimelineBuilderProps {
  data: TimelineData
  onChange: (data: TimelineData) => void
  courseId?: string
}

export function TimelineBuilder({ data, onChange, courseId }: TimelineBuilderProps) {
  const events = data.events ?? []
  const mode = data.mode ?? 'historical'

  const updateMode = (newMode: TimelineMode) => {
    onChange({ ...data, mode: newMode })
  }

  const addEvent = () => {
    const ev: TimelineEvent = { id: crypto.randomUUID(), date: '', title: '', description: '' }
    onChange({ ...data, events: [...events, ev] })
  }

  const removeEvent = (id: string) => {
    onChange({ ...data, events: events.filter((e) => e.id !== id) })
  }

  const updateEvent = (id: string, field: keyof TimelineEvent, value: string) => {
    onChange({
      ...data,
      events: events.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Timeline Mode</h4>
          <p className="text-sm text-gray-500">Choose how students interact with the timeline</p>
        </div>
        <div className="w-56">
          <Select value={mode} onValueChange={(val) => updateMode(val as TimelineMode)}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="historical">Historical (Visual Only)</SelectItem>
              <SelectItem value="sorting">Interactive Sorting</SelectItem>
              <SelectItem value="process">Process/Steps Sorting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Events / Steps ({events.length})</Label>
          <Button type="button" variant="default" size="sm" onClick={addEvent}>
            <Plus className="w-4 h-4 mr-1" /> Add {mode === 'process' ? 'Step' : 'Event'}
          </Button>
        </div>
        
        {events.length === 0 && <p className="text-sm text-gray-500 italic text-center py-6 bg-gray-50 rounded-lg border border-dashed">No events yet. Click &quot;Add {mode === 'process' ? 'Step' : 'Event'}&quot; to build your timeline.</p>}
        
        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={event.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{mode === 'process' ? 'Step' : 'Event'} {i + 1}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(event.id)} className="text-red-500 hover:bg-red-50 h-7 w-7">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 font-semibold">{mode === 'process' ? 'Step Number / Label' : 'Date / Time'}</Label>
                      <Input value={event.date} onChange={(e) => updateEvent(event.id, 'date', e.target.value)} placeholder={mode === 'process' ? "e.g., Step 1" : "e.g., 1998"} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 font-semibold">Title</Label>
                      <Input value={event.title} onChange={(e) => updateEvent(event.id, 'title', e.target.value)} placeholder="Title" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 font-semibold">Description</Label>
                    <Input value={event.description} onChange={(e) => updateEvent(event.id, 'description', e.target.value)} placeholder="Brief description" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-semibold">Image (Optional)</Label>
                  <AssetSelector 
                    courseId={courseId} 
                    value={event.image_url ?? ''} 
                    onChange={(url) => updateEvent(event.id, 'image_url', url)} 
                    label="" 
                    size="md" 
                    typeFilter="image" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
