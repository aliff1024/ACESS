'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';
import { CalendarDays, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  title: string;
  duration: string;
  type: 'now' | 'next' | 'later';
  /** Already-finished phases render checked off rather than as an
   *  upcoming now/next/later item — docs/accessibility/03 §5.1: the
   *  Itinerary must show the whole path, including what's already done,
   *  not just what's left. */
  done?: boolean;
}

export function VisualSchedule({
  schedule,
  totalMinutes,
}: {
  schedule?: ScheduleItem[];
  /** Total estimated minutes across every item in `schedule`, for the
   *  intro line ("This lesson has N parts. About M minutes in total.").
   *  Omitted (no intro line) when not provided — the pre-existing
   *  bottom-of-page usage of this component doesn't have this figure. */
  totalMinutes?: number;
}) {
  const { t } = useTranslation();
  const { settings } = useAccessibility();

  const items = schedule || [];

  if (!settings.visual_schedule_enabled) return null;
  if (items.length === 0) return null;

  return (
    <div className="bg-white border-2 border-indigo-100 rounded-xl p-5 shadow-sm my-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="bg-indigo-100 p-1.5 rounded-lg">
          <CalendarDays className="w-5 h-5 text-indigo-700" />
        </div>
        <h3 className="font-bold text-gray-900">{t('accessibility.visualSchedule')}</h3>
      </div>
      {totalMinutes !== undefined && totalMinutes > 0 && (
        <p className="text-xs text-gray-500 mb-4 ml-9">
          {t('accessibility.itineraryIntro', { count: items.length, minutes: totalMinutes })}
        </p>
      )}

      <div className="relative border-l-2 border-indigo-100 ml-3 pl-6 space-y-6 mt-4">
        {items.map((item) => {
          const isNow = item.type === 'now' && !item.done;
          const isDone = !!item.done;
          return (
            <div key={item.id} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${isDone ? 'bg-green-500' : isNow ? 'bg-indigo-600' : 'bg-indigo-300'}`} />

              <div className={`p-3 rounded-lg border ${isDone ? 'bg-green-50 border-green-100' : isNow ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isNow && <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1 block">{t('accessibility.happeningNow')}</span>}
                    <h4 className={`font-medium text-sm ${isDone ? 'text-green-700 line-through decoration-green-300' : isNow ? 'text-indigo-900' : 'text-gray-600'}`}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" /> {isDone ? t('accessibility.done') : item.duration}
                    </div>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  ) : isNow ? (
                    <PlayCircle className="w-6 h-6 text-indigo-600 shrink-0" />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
