import { useState } from 'react'
import type { TimelineData } from '@/lib/interactive-types'

interface TimelineViewerProps {
  data: TimelineData
  accessibilitySettings?: Record<string, unknown>
}

export function TimelineViewer({ data }: TimelineViewerProps) {
  const events = data.events ?? []
  const [expanded, setExpanded] = useState<string | null>(null)

  if (events.length === 0) {
    return <p className="text-gray-500 italic">No events in this timeline.</p>
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200" />
        <div className="space-y-6">
          {sorted.map((event) => (
            <div key={event.id} className="relative pl-10">
              <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow" />
              <div className="flex items-start gap-4">
                <span className="text-sm font-bold text-blue-600 whitespace-nowrap min-w-[80px]">{event.date}</span>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    className="text-left w-full"
                  >
                    <h4 className="text-base font-semibold text-gray-800">{event.title}</h4>
                    {expanded === event.id && (
                      <div className="mt-1">
                        {event.image_url && (
                          <img src={event.image_url} alt={event.title} className="max-h-48 rounded-lg object-cover mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
