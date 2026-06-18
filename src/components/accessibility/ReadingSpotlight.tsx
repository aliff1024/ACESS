'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';

interface ReadingSpotlightProps {
  children: React.ReactNode;
  selector?: string;
}

export function ReadingSpotlight({ children, selector = 'p, li, h1, h2, h3, h4, h5, h6' }: ReadingSpotlightProps) {
  const { settings } = useAccessibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!settings.reading_spotlight) return;

    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll(selector);
    
    const handleMouseMove = (e: MouseEvent) => {
      let found = false;
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (
          e.clientY >= rect.top - 20 &&
          e.clientY <= rect.bottom + 20 &&
          e.clientX >= rect.left - 20 &&
          e.clientX <= rect.right + 20
        ) {
          if (activeIndex !== index) {
            setActiveIndex(index);
          }
          found = true;
        }
      });
      if (!found && activeIndex !== null) {
        // Optionally keep the last one active or clear it
        // setActiveIndex(null); 
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [settings.reading_spotlight, selector, activeIndex]);

  useEffect(() => {
    if (!settings.reading_spotlight) {
      const container = containerRef.current;
      if (container) {
        const elements = container.querySelectorAll(selector);
        elements.forEach(el => el.classList.remove('spotlight-active'));
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const elements = container.querySelectorAll(selector);
    
    elements.forEach((el, index) => {
      if (index === activeIndex) {
        el.classList.add('spotlight-active');
      } else {
        el.classList.remove('spotlight-active');
      }
    });
  }, [activeIndex, settings.reading_spotlight, selector]);

  return (
    <div ref={containerRef} className="reading-spotlight-container">
      {children}
    </div>
  );
}
