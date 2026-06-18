'use client';

import { useState, useEffect } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSavedAt?: Date | null;
  saving?: boolean;
  error?: boolean;
}

export function AutoSaveIndicator({ lastSavedAt, saving = false, error = false }: AutoSaveIndicatorProps) {
  const { settings } = useAccessibility();
  const [timeAgo, setTimeAgo] = useState('Just now');

  useEffect(() => {
    if (!lastSavedAt) return;
    
    const updateTimeAgo = () => {
      const seconds = Math.floor((new Date().getTime() - lastSavedAt.getTime()) / 1000);
      if (seconds < 10) setTimeAgo('Just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      else setTimeAgo('A while ago');
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  if (!settings.auto_save_enabled) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
      {error ? (
        <>
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-600">Save failed</span>
        </>
      ) : saving ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          <span className="text-blue-600">Saving...</span>
        </>
      ) : (
        <>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span>Saved {lastSavedAt ? timeAgo : 'locally'}</span>
        </>
      )}
    </div>
  );
}
