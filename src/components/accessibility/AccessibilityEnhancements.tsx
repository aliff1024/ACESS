'use client';

import { useAccessibility } from '@/providers/AccessibilityProvider';
import { useEffect } from 'react';
import { TextToSpeechEngine } from './TextToSpeechEngine';

export function AccessibilityEnhancements() {
  const { settings, userAgeGroup } = useAccessibility();
  const showSkip =
    !!settings.screen_reader_optimized || !!settings.keyboard_navigation_enabled;

  useEffect(() => {
    // Inject the age group to the document element for global CSS overrides
    document.documentElement.setAttribute('data-age-group', userAgeGroup);
  }, [userAgeGroup]);

  return (
    <>
      <TextToSpeechEngine />
      {showSkip && (
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
      )}
      {/* Global CSS Overrides for Age Groups */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root[data-age-group="6-12"] {
          --radius-btn: 9999px; /* Fully rounded pills for kids */
          --btn-shadow: 0 4px 0px rgba(0,0,0,0.2); /* Fun chunky shadow */
          --heading-font-weight: 800; /* Extra bold */
        }
        :root[data-age-group="6-12"] button {
          border-radius: var(--radius-btn);
          font-weight: bold;
        }
        :root[data-age-group="6-12"] button:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        :root[data-age-group="18+"] {
          --radius-btn: 0.375rem; /* Professional slightly rounded */
          --heading-font-weight: 500;
        }
        :root[data-age-group="18+"] button {
          border-radius: var(--radius-btn);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.875rem;
        }
      `}} />
    </>
  );
}
