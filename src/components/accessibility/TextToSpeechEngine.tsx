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
      // We will read it if it's a valid tag, or if it's a small leaf node DIV.
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
      
      if (settings.tts_voice_uri) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.voiceURI === settings.tts_voice_uri);
        if (voice) {
          utterance.voice = voice;
        }
      }

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
  }, [settings.tts_enabled, settings.tts_rate, settings.tts_voice_uri]);

  return null; // This is a headless component
}
