'use client';

import { BookOpen, X } from 'lucide-react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useTranslation } from '@/lib/useTranslation';

export function EasyReadIndicator({ dismissible = false }: { dismissible?: boolean }) {
  const { settings, updateSettings } = useAccessibility();
  const { t } = useTranslation();

  if (!settings.simplified_ui) return null;

  const handleExit = async () => {
    await updateSettings({ ...settings, simplified_ui: false });
  };

  return (
    <div
      className="easy-read-indicator flex items-center justify-between gap-3 px-4 py-2 bg-yellow-100 border-b border-yellow-300 text-yellow-900"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        <BookOpen className="w-4 h-4 shrink-0 text-yellow-700" aria-hidden />
        <span className="text-sm font-medium truncate">
          {t('accessibility.easyReadActive') || 'Simplified View — Easy Read Mode is on'}
        </span>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleExit}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-yellow-800 hover:text-yellow-950 px-2 py-1 rounded-md hover:bg-yellow-200 transition-colors"
          aria-label="Turn off Easy Read Mode"
        >
          <X className="w-3.5 h-3.5" />
          Exit
        </button>
      )}
    </div>
  );
}
