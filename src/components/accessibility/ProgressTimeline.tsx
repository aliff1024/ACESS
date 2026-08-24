'use client';

import { useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { CheckCircle2, Circle, Map, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineNode {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

export function ProgressTimeline({ nodes }: { nodes?: TimelineNode[] }) {
  const { settings } = useAccessibility();
  // Collapsed by default — live feedback: a full node-by-node course
  // roadmap rendered inline, always expanded, on every single lesson
  // page felt redundant with the lesson's own Itinerary and pushed the
  // page length out with a list only relevant a few times per course
  // (right after finishing one, or when deciding what to do next). The
  // one-line summary answers "how far through the course am I" at a
  // glance; the full roadmap is still one click away for whoever wants
  // to plan ahead.
  const [expanded, setExpanded] = useState(false);

  const items = nodes || [
    { id: '1', title: 'Module 1: Basics', status: 'completed' as const },
    { id: '2', title: 'Module 2: Intermediate', status: 'current' as const },
    { id: '3', title: 'Module 3: Advanced', status: 'upcoming' as const },
  ];

  if (!settings.progress_timeline_enabled) return null;

  const completedCount = items.filter((n) => n.status === 'completed').length;
  const currentIndex = items.findIndex((n) => n.status === 'current');
  const currentNode = currentIndex >= 0 ? items[currentIndex] : null;

  return (
    <div className="bg-white border-2 border-emerald-100 rounded-xl p-5 shadow-sm my-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="your-journey-list"
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-emerald-100 p-1.5 rounded-lg shrink-0">
            <Map className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900">Your Journey</h3>
            <p className="text-xs text-gray-500 truncate">
              {completedCount} of {items.length} lessons complete
              {currentNode ? ` · Now on "${currentNode.title}"` : ''}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div id="your-journey-list" className="relative pl-3 mt-5">
          {/* Continuous line behind nodes */}
          <div className="absolute top-2 bottom-4 left-[19px] w-0.5 bg-gray-200" />

          <div className="space-y-6">
            {items.map((node) => {
              const isCompleted = node.status === 'completed';
              const isCurrent = node.status === 'current';

              return (
                <div key={node.id} className="relative flex items-start gap-4">
                  <div className="relative z-10 bg-white">
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-white" />
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full border-4 border-emerald-500 bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 bg-white" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <h4 className={`text-sm font-medium ${isCurrent ? 'text-emerald-700 font-bold' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                      {node.title}
                    </h4>
                    {isCurrent && <p className="text-xs text-emerald-600 mt-0.5">You are here</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
