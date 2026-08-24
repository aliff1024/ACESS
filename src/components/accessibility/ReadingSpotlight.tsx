'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';

interface ReadingSpotlightProps {
  children: React.ReactNode;
  selector?: string;
  /** Fired when a learner clicks directly on one of the tracked blocks
   *  (paragraph/heading/list item), with that block's plain text followed
   *  by every subsequent block's text, newline-joined — i.e. "read from
   *  here onward" (docs/accessibility/03 §4.2). The caller decides
   *  whether/when to act on it; ReadingSpotlight itself has no opinion on
   *  what "activating" a block should do. */
  onBlockActivate?: (fromHereText: string, index: number) => void;
  /** True while something is actively reading the content aloud — adds a
   *  pointer cursor to blocks so "click to read from here" is
   *  discoverable exactly when it does something, without suggesting an
   *  interaction that has no effect while nothing is playing. */
  readAloudActive?: boolean;
}

/**
 * Highlights the paragraph a learner is currently reading, dimming the rest.
 *
 * The primary signal is scroll position, tracking whichever element sits
 * nearest the vertical center of the viewport — this works for keyboard
 * paging, touch scrolling, and screen readers moving focus, not just a
 * mouse. Mouse movement is layered on top as a more precise, secondary
 * trigger for pointer users.
 *
 * Content here is set via dangerouslySetInnerHTML (lesson HTML) and can be
 * replaced wholesale by unrelated re-renders (e.g. a sibling component's
 * state ticking) without activeIndex changing — a plain useEffect keyed on
 * activeIndex would then leave stale DOM nodes with the class and the new
 * ones without it. A MutationObserver re-applies the current index whenever
 * the container's content actually changes, and useLayoutEffect re-applies
 * it after every render, so the highlighted element is always correct
 * regardless of why the DOM changed.
 */
export function ReadingSpotlight({ children, selector = 'p, li, h1, h2, h3, h4, h5, h6', onBlockActivate, readAloudActive }: ReadingSpotlightProps) {
  const { settings } = useAccessibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  activeIndexRef.current = activeIndex;

  // Below this many blocks, the "rest of the page" the spotlight is meant
  // to dim away is already close to the whole visible chunk — dimming it
  // doubles down on isolation a chunked/paginated view already provides
  // instead of adding anything (docs/accessibility/02 §3.2). Everything
  // gets marked active so nothing dims.
  const MIN_BLOCKS_TO_DIM = 3;

  const applyActiveClass = () => {
    const container = containerRef.current;
    if (!container) return;
    const elements = container.querySelectorAll(selector);
    if (!settings.reading_spotlight || elements.length < MIN_BLOCKS_TO_DIM) {
      elements.forEach((el) => el.classList.add('spotlight-active'));
      return;
    }
    elements.forEach((el, index) => {
      el.classList.toggle('spotlight-active', index === activeIndexRef.current);
    });
  };

  // Primary: track the element nearest viewport center as the user scrolls,
  // pages with the keyboard, or moves focus — no pointer required.
  useEffect(() => {
    if (!settings.reading_spotlight) return;
    const container = containerRef.current;
    if (!container) return;

    const pickNearestCenter = () => {
      const elements = Array.from(container.querySelectorAll(selector));
      if (elements.length === 0) return;
      const viewportCenter = window.innerHeight / 2;
      let closest = 0;
      let closestDistance = Infinity;
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;
        const elCenter = (rect.top + rect.bottom) / 2;
        const distance = Math.abs(elCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = index;
        }
      });
      setActiveIndex(closest);
    };

    // Set an initial spotlight immediately so nothing looks dimmed before
    // the first scroll callback fires.
    pickNearestCenter();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        pickNearestCenter();
        ticking = false;
      });
    };

    const scrollParent = document.getElementById('main-content') || window;
    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scrollParent.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [settings.reading_spotlight, selector]);

  // Secondary: mouse users get precise hover-follow, layered on top.
  useEffect(() => {
    if (!settings.reading_spotlight) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const elements = container.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (
          e.clientY >= rect.top - 20 &&
          e.clientY <= rect.bottom + 20 &&
          e.clientX >= rect.left - 20 &&
          e.clientX <= rect.right + 20
        ) {
          setActiveIndex((prev) => (prev === index ? prev : index));
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [settings.reading_spotlight, selector]);

  // "Read from here": clicking a tracked block reports its text plus
  // everything after it to the caller. Independent of settings.
  // reading_spotlight — this is a TTS interaction, not a visual dimming
  // one, so it works even with the spotlight highlight turned off.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onBlockActivate) return;
    const container = containerRef.current;
    if (!container) return;
    const target = (e.target as HTMLElement).closest(selector);
    if (!target || !container.contains(target)) return;
    const elements = Array.from(container.querySelectorAll(selector));
    const index = elements.indexOf(target);
    if (index === -1) return;
    const fromHereText = elements.slice(index).map((el) => el.textContent || '').join('\n');
    if (fromHereText.trim()) onBlockActivate(fromHereText, index);
  };

  // Re-apply the active class after every render, and whenever the
  // container's content mutates for reasons unrelated to activeIndex
  // (e.g. lesson content swapping in via dangerouslySetInnerHTML).
  useLayoutEffect(() => {
    applyActiveClass();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new MutationObserver(() => applyActiveClass());
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`reading-spotlight-container${readAloudActive ? ' reading-spotlight-seekable' : ''}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
