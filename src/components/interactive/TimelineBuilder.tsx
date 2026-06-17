import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { TimelineData, TimelineEvent } from '@/lib/interactive-types'

interface TimelineBuilderProps {
  data: TimelineData
  onChange: (data: TimelineData) => void
  courseId?: string
}

export function TimelineBuilder({ data, onChange, courseId }: TimelineBuilderProps) {
  const events = data.events ?? []

  const addEvent = () => {
    const ev: TimelineEvent = { id: crypto.randomUUID(), date: '', title: '', description: '' }
    onChange({ events: [...events, ev] })
  }

  const removeEvent = (id: string) => {
    onChange({ events: events.filter((e) => e.id !== id) })
  }

  const updateEvent = (id: string, field: keyof TimelineEvent, value: string) => {
    onChange({
      events: events.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Timeline Events ({events.length})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addEvent}>
          <Plus className="w-4 h-4 mr-1" /> Add Event
        </Button>
      </div>
      {events.length === 0 && <p className="text-sm text-gray-500 italic">No events yet. Click &quot;Add Event&quot; to build your timeline.</p>}
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={event.id} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Event {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEvent(event.id)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <Label className="text-xs text-gray-500">Date</Label>
                <Input value={event.date} onChange={(e) => updateEvent(event.id, 'date', e.target.value)} placeholder="e.g., 1998" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Title</Label>
                <Input value={event.title} onChange={(e) => updateEvent(event.id, 'title', e.target.value)} placeholder="e.g., WCAG 1.0 Published" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <Input value={event.description} onChange={(e) => updateEvent(event.id, 'description', e.target.value)} placeholder="Brief description" />
              </div>
            </div>
            <ImageUpload courseId={courseId} value={event.image_url ?? ''} onChange={(url) => updateEvent(event.id, 'image_url', url)} label="Image (optional)" size="lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
