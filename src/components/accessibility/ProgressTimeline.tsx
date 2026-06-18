'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { CheckCircle2, Circle, Map } from 'lucide-react';

interface TimelineNode {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

export function ProgressTimeline({ nodes }: { nodes?: TimelineNode[] }) {
  const { settings } = useAccessibility();

  const items = nodes || [
    { id: '1', title: 'Module 1: Basics', status: 'completed' as const },
    { id: '2', title: 'Module 2: Intermediate', status: 'current' as const },
    { id: '3', title: 'Module 3: Advanced', status: 'upcoming' as const },
  ];

  if (!settings.progress_timeline_enabled) return null;

  return (
    <div className="bg-white border-2 border-emerald-100 rounded-xl p-5 shadow-sm my-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-100 p-1.5 rounded-lg">
          <Map className="w-5 h-5 text-emerald-700" />
        </div>
        <h3 className="font-bold text-gray-900">Your Journey</h3>
      </div>

      <div className="relative pl-3">
        {/* Continuous line behind nodes */}
        <div className="absolute top-2 bottom-4 left-[19px] w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {items.map((node, index) => {
            const isLast = index === items.length - 1;
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
    </div>
  );
}
