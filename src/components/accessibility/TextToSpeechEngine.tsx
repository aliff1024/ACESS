'use client';

import { useEffect, useState } from 'react';
import { useAccessibility } from '@/providers/AccessibilityProvider';

export function TextToSpeechEngine() {
  const { settings } = useAccessibility();
  const [activeElement, setActiveElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!settings.tts_enabled) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeElement) {
        activeElement.classList.remove('tts-active-element');
        setActiveElement(null);
      }
      return;
    }

    let isSpeaking = false;
    let currentTarget: Element | null = null;
    let lastMousePosition = { x: 0, y: 0 };

    const isMalay = settings.preferred_language === 'ms';

    const getElementSpeechText = (element: Element): { text: string; speakTarget: Element } | null => {
      // 1. Check if the element itself is an image
      if (element.tagName === 'IMG') {
        const alt = element.getAttribute('alt')?.trim() || element.getAttribute('aria-label')?.trim() || element.getAttribute('title')?.trim();
        const text = alt ? (isMalay ? `Imej: ${alt}` : `Image: ${alt}`) : (isMalay ? 'Imej tanpa penerangan' : 'Image with no description');
        return { text, speakTarget: element };
      }

      // 2. Check if the element is a figure or picture wrapping an image
      if (element.tagName === 'FIGURE' || element.tagName === 'PICTURE') {
        const img = element.querySelector('img');
        const figcaption = element.querySelector('figcaption')?.textContent?.trim();
        if (img) {
          const alt = img.getAttribute('alt')?.trim() || img.getAttribute('aria-label')?.trim() || img.getAttribute('title')?.trim();
          if (alt && figcaption) {
            return {
              text: isMalay ? `Imej: ${alt}. Keterangan: ${figcaption}` : `Image: ${alt}. Caption: ${figcaption}`,
              speakTarget: element,
            };
          }
          if (alt) {
            return {
              text: isMalay ? `Imej: ${alt}` : `Image: ${alt}`,
              speakTarget: img,
            };
          }
        }
        if (figcaption) {
          return { text: figcaption, speakTarget: element };
        }
      }

      // 3. Check if the element is an anchor or container enclosing a single image
      if (element.childElementCount === 1 && element.firstElementChild?.tagName === 'IMG') {
        const img = element.firstElementChild;
        const alt = img.getAttribute('alt')?.trim() || img.getAttribute('aria-label')?.trim() || img.getAttribute('title')?.trim();
        const text = alt ? (isMalay ? `Imej: ${alt}` : `Image: ${alt}`) : (isMalay ? 'Imej tanpa penerangan' : 'Image with no description');
        return { text, speakTarget: element };
      }

      // 4. Check for interactive elements or icons with aria-label / title
      const ariaLabel = element.getAttribute('aria-label')?.trim() || element.getAttribute('title')?.trim();
      const textContent = element.textContent?.trim();

      if (!textContent && ariaLabel) {
        return { text: ariaLabel, speakTarget: element };
      }

      if (textContent && textContent.length > 0) {
        const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'BUTTON', 'LI', 'LABEL', 'STRONG', 'EM', 'BLOCKQUOTE', 'TD', 'TH', 'FIGCAPTION'];
        
        // If it's a large container (like DIV) and has multiple child elements, avoid reading the whole page
        if (!validTags.includes(element.tagName) && element.children.length > 0) {
          return null;
        }

        return { text: textContent, speakTarget: element };
      }

      return null;
    };

    const speakElement = (target: Element) => {
      const speechData = getElementSpeechText(target);
      if (!speechData) return;

      const { text, speakTarget } = speechData;
      if (speakTarget === currentTarget && isSpeaking) return;

      // Cleanup previous
      if (currentTarget) {
        currentTarget.classList.remove('tts-active-element');
      }

      currentTarget = speakTarget;
      currentTarget.classList.add('tts-active-element');

      // Start speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.tts_rate || 1;

      const voices = window.speechSynthesis.getVoices();
      const premiumMalay = voices.find(v => v.lang.includes('ms') && v.name.includes('Natural'));
      const googleMalay = voices.find(v => (v.lang.includes('ms') || v.lang.includes('id')) && v.name.includes('Google'));
      const premiumEnglish = voices.find(v => v.lang.includes('en') && v.name.includes('Natural'));
      const googleEnglish = voices.find(v => v.lang.includes('en') && v.name.includes('Google'));
      const basicMalay = voices.find(v => v.lang.includes('ms'));

      let bestVoice;
      if (isMalay) {
        bestVoice = premiumMalay || googleMalay || basicMalay || premiumEnglish || googleEnglish || voices[0];
      } else {
        bestVoice = premiumEnglish || googleEnglish || voices[0];
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      utterance.lang = isMalay ? 'ms-MY' : 'en-US';

      utterance.onend = () => {
        isSpeaking = false;
      };

      utterance.onerror = () => {
        isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
      isSpeaking = true;
      setActiveElement(currentTarget);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition = { x: e.clientX, y: e.clientY };

      if (!e.shiftKey) {
        if (isSpeaking) {
          window.speechSynthesis.cancel();
          isSpeaking = false;
          if (currentTarget) {
            currentTarget.classList.remove('tts-active-element');
            currentTarget = null;
          }
        }
        return;
      }

      // Shift is held, find element under cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;

      speakElement(target);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !e.repeat) {
        const target = document.elementFromPoint(lastMousePosition.x, lastMousePosition.y);
        if (target) {
          speakElement(target);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (currentTarget) {
          currentTarget.classList.remove('tts-active-element');
          currentTarget = null;
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.speechSynthesis.cancel();
      if (currentTarget) {
        currentTarget.classList.remove('tts-active-element');
      }
    };
  }, [settings.tts_enabled, settings.tts_rate, settings.preferred_language]);

  return null; // This is a headless component
}
