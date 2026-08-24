'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, Volume2, VolumeX, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import {
  fetchCachedLessonSummary,
  generateLessonSummary,
  askLessonAssistant,
  type AiChatMessage,
} from '@/lib/ai-assistant-api';

interface LessonAIAssistantProps {
  lessonId: string;
  lessonTitle: string;
}

export function LessonAIAssistant({ lessonId }: LessonAIAssistantProps) {
  const { settings, userAgeGroup } = useAccessibility();
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const accessibility = {
    readingLevel: settings.preferred_reading_level,
    ageGroup: userAgeGroup,
    simplifiedUi: settings.simplified_ui,
  };
  const reducedMotion = settings.animation_level === 'reduced' || settings.animation_level === 'none';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const cached = await fetchCachedLessonSummary(lessonId);
        if (cancelled) return;
        if (cached.summary) {
          setSummary(cached.summary);
          setSuggestedQuestions(cached.suggestedQuestions);
          setSummaryLoading(false);
          return;
        }
        const generated = await generateLessonSummary(lessonId, accessibility);
        if (cancelled) return;
        setSummary(generated.summary);
        setSuggestedQuestions(generated.suggestedQuestions);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setSummaryError(err instanceof Error ? err.message : 'Failed to load lesson summary');
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, chatLoading, reducedMotion]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;

    const nextMessages: AiChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setChatLoading(true);
    try {
      const { reply } = await askLessonAssistant(lessonId, trimmed, nextMessages.slice(-10), accessibility);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to get a response');
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!summary) return;
    const utterance = new SpeechSynthesisUtterance(summary);
    if (settings.tts_rate) utterance.rate = settings.tts_rate;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const Bubble = reducedMotion ? 'div' : motion.div;
  const bubbleAnimProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Lesson Summary
          </h3>
          {settings.tts_enabled && summary && !summaryLoading && (
            <button
              onClick={toggleSpeak}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
              title={speaking ? 'Stop reading' : 'Read summary aloud'}
            >
              {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {summaryLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-6 justify-center bg-gray-50 rounded-xl border border-gray-100">
            <Loader2 className="w-5 h-5 animate-spin" /> Generating summary...
          </div>
        ) : summaryError ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">{summaryError}</div>
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            {summary}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ask a question</h3>

        <div ref={scrollRef} className="space-y-3 max-h-80 overflow-y-auto mb-3 pr-1">
          {messages.map((m, i) => (
            <Bubble
              key={i}
              {...bubbleAnimProps}
              className={`flex gap-2 items-start ${m.role === 'user' ? 'justify-end' : ''}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
              )}
              <div
                className={`text-sm rounded-xl px-3 py-2 max-w-[80%] whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </Bubble>
          ))}
          {chatLoading && (
            <div className="flex gap-2 items-center text-gray-400 text-sm">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <Loader2 className="w-4 h-4 animate-spin" /> AI is thinking...
            </div>
          )}
        </div>

        {suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(q)}
                disabled={chatLoading}
                className="text-xs font-normal border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                {q}
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about this lesson..."
            className="min-h-[44px] max-h-[120px] text-sm resize-none"
            disabled={summaryLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={chatLoading || !input.trim() || summaryLoading}
            className="self-end bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
