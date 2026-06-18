'use client';

import { Check, Palette } from 'lucide-react';

interface TintPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const TINT_OPTIONS = [
  { id: 'white', label: 'White', color: 'bg-white', border: 'border-gray-300' },
  { id: 'cream', label: 'Cream', color: 'bg-[#FDF6E2]', border: 'border-[#E8DCC0]' },
  { id: 'pale_blue', label: 'Pale Blue', color: 'bg-[#EBF4FA]', border: 'border-[#C5DAE8]' },
  { id: 'soft_green', label: 'Soft Green', color: 'bg-[#F0F7F0]', border: 'border-[#C5DCC5]' },
  { id: 'grey', label: 'Grey', color: 'bg-[#F0F0F0]', border: 'border-[#D0D0D0]' },
] as const;

export function TintPicker({ value, onChange }: TintPickerProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden>
          <Palette className="w-5 h-5" />
        </span>
        <div>
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            Background Tint
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Choose a background colour to reduce visual stress
          </span>
        </div>
      </div>

      {/* Swatches */}
      <div className="flex items-start justify-center gap-4 flex-wrap" role="radiogroup" aria-label="Background tint colour">
        {TINT_OPTIONS.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              onClick={() => onChange(option.id)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <span
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full border-2
                  transition-all duration-150
                  ${option.color} ${option.border}
                  ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                      : 'group-hover:ring-2 group-hover:ring-blue-300 group-hover:ring-offset-1 dark:group-hover:ring-offset-gray-900'
                  }
                `}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden />
                )}
              </span>
              <span
                className={`text-xs ${
                  isSelected
                    ? 'font-semibold text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
