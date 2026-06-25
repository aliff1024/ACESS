'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';
import { CalendarDays, Clock, PlayCircle } from 'lucide-react';

interface ScheduleItem {
  id: string;
  title: string;
  duration: string;
  type: 'now' | 'next' | 'later';
}

export function VisualSchedule({ schedule }: { schedule?: ScheduleItem[] }) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();

  const items = schedule || [];

  if (!settings.visual_schedule_enabled) return null;

  return (
    <div className="bg-white border-2 border-indigo-100 rounded-xl p-5 shadow-sm my-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-100 p-1.5 rounded-lg">
          <CalendarDays className="w-5 h-5 text-indigo-700" />
        </div>
        <h3 className="font-bold text-gray-900">{t('accessibility.visualSchedule')}</h3>
      </div>

      <div className="relative border-l-2 border-indigo-100 ml-3 pl-6 space-y-6">
        {items.map((item, index) => {
          const isNow = item.type === 'now';
          return (
            <div key={item.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${isNow ? 'bg-indigo-600' : 'bg-indigo-300'}`} />
              
              <div className={`p-3 rounded-lg border ${isNow ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isNow && <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1 block">{t('accessibility.happeningNow')}</span>}
                    <h4 className={`font-medium text-sm ${isNow ? 'text-indigo-900' : 'text-gray-600'}`}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" /> {item.duration}
                    </div>
                  </div>
                  {isNow && (
                    <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
