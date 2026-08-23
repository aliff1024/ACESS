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

    const handleMouseMove = (e: MouseEvent) => {
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
      
      // Ignore if it's the same target or not a valid text node container
      if (!target || target === currentTarget) return;
      
      // Simple check to see if it has text content that's not just whitespace
      const textContent = target.textContent?.trim();
      if (!textContent || textContent.length === 0) return;

      // Ensure we don't read the whole body or main container, try to get specific elements like p, h1, span, a, button
      const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'BUTTON', 'LI', 'LABEL', 'STRONG', 'EM'];
      
      // If it's a huge container (like DIV) and has a lot of children, it might read the whole page. 
      if (!validTags.includes(target.tagName) && target.children.length > 0) {
        return; 
      }

      // Cleanup previous
      if (currentTarget) {
        currentTarget.classList.remove('tts-active-element');
      }

      currentTarget = target;
      currentTarget.classList.add('tts-active-element');

      // Start speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textContent);
      utterance.rate = settings.tts_rate || 1;
      
      const voices = window.speechSynthesis.getVoices();
      const isMalay = settings.preferred_language === 'ms';
      
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

      window.speechSynthesis.speak(utterance);
      isSpeaking = true;
      setActiveElement(currentTarget);
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
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keyup', handleKeyUp);
      window.speechSynthesis.cancel();
      if (currentTarget) {
        currentTarget.classList.remove('tts-active-element');
      }
    };
  }, [settings.tts_enabled, settings.tts_rate, settings.preferred_language]);

  return null; // This is a headless component
}
