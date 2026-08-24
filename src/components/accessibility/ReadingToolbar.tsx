'use client';

import { useState } from 'react';
import { Minus, Plus, MoveHorizontal, Palette, Target, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAccessibility } from '@/providers/AccessibilityProvider';
import { TintPicker } from './TintPicker';
import { TTS_SPEED_OPTIONS } from '@/lib/accessibility-utils';

interface ReadingToolbarProps {
  /** TTS playback is owned by the lesson page (it already tracks which
   *  chunk is speaking, autosave state, etc.) — this toolbar is a
   *  *surface* for it, not a second, independent speech system. Wiring it
   *  through props here keeps there being exactly one TTS state machine
   *  on the page instead of two that could talk over each other. */
  ttsPlaying: boolean;
  onToggleListen: () => void;
  ttsRate: number;
  onRateChange: (rate: number) => void;
}

const WORD_SPACING_STEPS = [
  { pct: 0, label: 'Normal' },
  { pct: 20, label: 'Wide' },
  { pct: 40, label: 'Widest' }, // 40% × the 0.4em scale = 0.16em, the WCAG 1.4.12 floor
] as const;

/**
 * The Dyslexia preset's "Zone A" (docs/accessibility/03 §4.1,
 * docs/accessibility/04 §3.2): reading controls live next to the text
 * they change, not three taps into a settings dialog. Every control here
 * already exists in the full settings panel — this doesn't add new
 * capability, it moves the few a dyslexic learner adjusts mid-read out
 * from behind a modal.
 *
 * Not yet sticky (docs/accessibility/03 §4.1 specifies sticky positioning)
 * — the page header above it changes height when scrolled
 * (LessonViewPage's `isScrolled` state), and pinning this at a fixed
 * offset without being able to verify the collapsed/expanded header
 * height live risked overlapping it. Renders in normal document flow
 * instead; upgrading to sticky is a follow-up once that can be checked
 * in a browser.
 */
export function ReadingToolbar({ ttsPlaying, onToggleListen, ttsRate, onRateChange }: ReadingToolbarProps) {
  const { settings, updateSettings } = useAccessibility();
  const [rateMenuOpen, setRateMenuOpen] = useState(false);

  const fontSizePx = settings.font_size_px ?? 16;
  const wordSpacingPct = settings.word_spacing_pct ?? 0;
  const currentSpacingIndex = WORD_SPACING_STEPS.findIndex((s) => s.pct === wordSpacingPct);
  const spacingLabel = currentSpacingIndex >= 0 ? WORD_SPACING_STEPS[currentSpacingIndex].label : 'Custom';

  const setFontSize = (delta: number) => {
    const next = Math.min(24, Math.max(12, fontSizePx + delta));
    if (next !== fontSizePx) updateSettings({ ...settings, font_size_px: next, preferred_font_size: next <= 14 ? 'small' : next <= 16 ? 'medium' : next <= 18 ? 'large' : 'xlarge' });
  };

  const cycleWordSpacing = () => {
    const nextIndex = ((currentSpacingIndex === -1 ? 0 : currentSpacingIndex) + 1) % WORD_SPACING_STEPS.length;
    updateSettings({ ...settings, word_spacing_pct: WORD_SPACING_STEPS[nextIndex].pct });
  };

  const setTint = (tint: string) => {
    updateSettings({ ...settings, background_tint: tint });
  };

  const toggleSpotlight = () => {
    updateSettings({ ...settings, reading_spotlight: !settings.reading_spotlight });
  };

  return (
    <div
      role="toolbar"
      aria-label="Reading controls"
      className="bg-card/95 backdrop-blur-sm border-b border-border"
    >
      <div className="content-column mx-auto px-4 py-2 flex items-center flex-wrap gap-2">
        {/* Listen */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={ttsPlaying ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleListen}
            aria-pressed={ttsPlaying}
            className="h-8 gap-1.5"
          >
            {ttsPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {ttsPlaying ? 'Stop' : 'Listen'}
          </Button>
          <Popover open={rateMenuOpen} onOpenChange={setRateMenuOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs">
                {ttsRate}×
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="start">
              {TTS_SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onRateChange(opt.value); setRateMenuOpen(false); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded ${ttsRate === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-px h-5 bg-border mx-1" aria-hidden />

        {/* Text size */}
        <div className="flex items-center gap-1" role="group" aria-label="Text size">
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFontSize(-1)} disabled={fontSizePx <= 12} aria-label="Decrease text size">
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">{fontSizePx}px</span>
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFontSize(1)} disabled={fontSizePx >= 24} aria-label="Increase text size">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1" aria-hidden />

        {/* Word spacing cycle */}
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={cycleWordSpacing}>
          <MoveHorizontal className="w-3.5 h-3.5" />
          {spacingLabel}
        </Button>

        {/* Background tint */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Background colour">
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <TintPicker value={settings.background_tint || 'cream'} onChange={setTint} />
          </PopoverContent>
        </Popover>

        {/* Reading spotlight */}
        <Button
          type="button"
          variant={settings.reading_spotlight ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={toggleSpotlight}
          aria-pressed={!!settings.reading_spotlight}
        >
          <Target className="w-3.5 h-3.5" />
          Spotlight
        </Button>
      </div>
    </div>
  );
}
