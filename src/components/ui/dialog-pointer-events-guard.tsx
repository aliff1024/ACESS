'use client';

import { useEffect } from 'react';

/**
 * Radix's DismissableLayer (@radix-ui/react-dismissable-layer) locks
 * `document.body.style.pointerEvents = 'none'` while a modal Dialog/
 * AlertDialog is open, and is supposed to restore it when the layer
 * unmounts. Its bookkeeping for "how many layers currently want outside
 * pointer events disabled" is a MODULE-LEVEL Set shared by every dismissable
 * layer in the app (Dialog, AlertDialog, Popover, Select, …) — Radix never
 * gets a Provider from this app, so every instance reads the same default
 * context object. With several Dialog roots mounted as siblings (as
 * LessonViewPage.tsx does — one Dialog per feature: resources, discussion,
 * AI assistant, asset preview, the completion checklist), a layer whose
 * close races another layer's open/close (its own close button, clicking
 * the overlay, or Escape — Radix treats all three the same way, so this
 * isn't specific to one dismissal path) can leave that shared Set
 * permanently non-empty, and the pointer-events lock never gets released —
 * reproduced and documented in docs/testing-report.md (2026-09-03, A11Y-04).
 *
 * Rather than patch Radix internals (fragile — this bookkeeping lives in
 * node_modules) this is a small watchdog: whenever the DOM settles and no
 * Radix dialog/alertdialog is actually open, any stray
 * `pointer-events: none` left on <body> is cleared. It only ever removes a
 * lock that has no open dialog left to justify it, so it can't interfere
 * with a dialog that's legitimately still open.
 */
function clearStrayBodyLock() {
  if (document.body.style.pointerEvents !== 'none') return;
  const openRadixLayer = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  if (!openRadixLayer) {
    document.body.style.pointerEvents = '';
  }
}

export function DialogPointerEventsGuard() {
  useEffect(() => {
    // Catches the common case immediately: a dialog's own close button,
    // an AlertDialogAction/Cancel click, etc. all trigger a React re-render
    // shortly after which this runs.
    const observer = new MutationObserver(() => clearStrayBodyLock());
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-state'],
      subtree: true,
    });

    // Also catches Escape and outside-click, which dismiss a Radix layer
    // without necessarily touching document.body's style attribute at the
    // exact moment these fire (the lock release happens in an effect
    // cleanup on the following tick) — re-check shortly after either.
    const recheckSoon = () => window.setTimeout(clearStrayBodyLock, 50);
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') recheckSoon();
    };
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('pointerdown', recheckSoon, true);

    // And a low-frequency safety net in case neither observer nor listener
    // catches a particular dismissal path.
    const interval = window.setInterval(clearStrayBodyLock, 1000);

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('pointerdown', recheckSoon, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
