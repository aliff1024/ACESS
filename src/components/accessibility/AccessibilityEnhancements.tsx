'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';

export function AccessibilityEnhancements() {
  const { settings } = useAccessibility();
  const showSkip =
    !!settings.screen_reader_optimized || !!settings.keyboard_navigation_enabled;

  if (!showSkip) return null;

  return (
    <a href="#main-content" className="skip-to-main">
      Skip to main content
    </a>
  );
}
