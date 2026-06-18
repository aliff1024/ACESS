'use client';

import { Eye } from 'lucide-react';

interface SettingsPreviewProps {
  fontFamily: string;
  fontSizePx: number;
  lineSpacingMultiplier: number;
  wordSpacingPct: number;
  backgroundTint: string;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  arial: 'Arial, sans-serif',
  verdana: 'Verdana, sans-serif',
  calibri: 'Calibri, sans-serif',
  atkinson_hyperlegible: "'Atkinson Hyperlegible', sans-serif",
  opendyslexic: "'OpenDyslexic', sans-serif",
};

const TINT_COLOR_MAP: Record<string, string> = {
  white: '#FFFFFF',
  cream: '#FDF6E2',
  pale_blue: '#EBF4FA',
  soft_green: '#F0F7F0',
  grey: '#F0F0F0',
};

const SAMPLE_TEXT = [
  'The quick brown fox jumps over the lazy dog.',
  'Learning is a journey, not a destination. Every step forward brings new understanding.',
  'Mathematics helps us solve real-world problems.',
];

export function SettingsPreview({
  fontFamily,
  fontSizePx,
  lineSpacingMultiplier,
  wordSpacingPct,
  backgroundTint,
}: SettingsPreviewProps) {
  const resolvedFont = FONT_FAMILY_MAP[fontFamily] ?? FONT_FAMILY_MAP.arial;
  const resolvedBg = TINT_COLOR_MAP[backgroundTint] ?? TINT_COLOR_MAP.white;
  const wordSpacingEm = wordSpacingPct / 100;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Preview
        </span>
      </div>

      {/* Preview area */}
      <div
        className="p-5 rounded-b-xl"
        style={{
          fontFamily: resolvedFont,
          fontSize: `${fontSizePx}px`,
          lineHeight: lineSpacingMultiplier,
          wordSpacing: `${wordSpacingEm}em`,
          backgroundColor: resolvedBg,
          transition: 'all 0.3s ease',
        }}
        aria-label="Live preview of accessibility settings"
        role="region"
      >
        {SAMPLE_TEXT.map((text, index) => (
          <p
            key={index}
            className={index < SAMPLE_TEXT.length - 1 ? 'mb-3' : ''}
            style={{ color: '#374151' }}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
